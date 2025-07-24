from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
import re
import hashlib
import os
from typing import Dict, List, Optional, Tuple, Any

class ValidationError(Exception):
    """Exceção para erros de validação"""
    pass

class MentorshipUtils:
    """Utilitários para o módulo de mentoria"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Valida formato de email"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    @staticmethod
    def validate_phone(phone: str) -> bool:
        """Valida formato de telefone brasileiro"""
        # Remove caracteres não numéricos
        clean_phone = re.sub(r'\D', '', phone)
        
        # Verifica se tem 10 ou 11 dígitos (com DDD)
        return len(clean_phone) in [10, 11] and clean_phone.isdigit()
    
    @staticmethod
    def validate_grade(grade: float) -> bool:
        """Valida se a nota está no intervalo válido (0-10)"""
        return 0.0 <= grade <= 10.0
    
    @staticmethod
    def validate_percentage(percentage: float) -> bool:
        """Valida se a porcentagem está no intervalo válido (0-100)"""
        return 0.0 <= percentage <= 100.0
    
    @staticmethod
    def calculate_progress_percentage(completed_hours: float, required_hours: float) -> float:
        """Calcula porcentagem de progresso baseado nas horas"""
        if required_hours <= 0:
            return 0.0
        
        percentage = (completed_hours / required_hours) * 100
        return min(percentage, 100.0)  # Não pode passar de 100%
    
    @staticmethod
    def format_duration(minutes: int) -> str:
        """Formata duração em minutos para string legível"""
        if minutes < 60:
            return f"{minutes} min"
        
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if remaining_minutes == 0:
            return f"{hours}h"
        
        return f"{hours}h {remaining_minutes}min"
    
    @staticmethod
    def generate_file_hash(file_content: bytes) -> str:
        """Gera hash MD5 para conteúdo de arquivo"""
        return hashlib.md5(file_content).hexdigest()
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitiza nome de arquivo removendo caracteres perigosos"""
        # Remove caracteres especiais e espaços
        clean_name = re.sub(r'[^\w\-_\.]', '_', filename)
        
        # Remove underscores múltiplos
        clean_name = re.sub(r'_+', '_', clean_name)
        
        # Remove underscores no início e fim
        clean_name = clean_name.strip('_')
        
        return clean_name
    
    @staticmethod
    def calculate_estimated_completion(start_date: datetime, total_hours: float, hours_per_week: float = 10) -> datetime:
        """Calcula data estimada de conclusão"""
        if hours_per_week <= 0:
            hours_per_week = 10  # Default
        
        weeks_needed = total_hours / hours_per_week
        return start_date + timedelta(weeks=weeks_needed)
    
    @staticmethod
    def get_difficulty_color(difficulty: str) -> str:
        """Retorna cor associada ao nível de dificuldade"""
        colors = {
            'BEGINNER': '#4CAF50',    # Verde
            'INTERMEDIATE': '#FF9800', # Laranja
            'ADVANCED': '#F44336'      # Vermelho
        }
        return colors.get(difficulty.upper(), '#9E9E9E')  # Cinza como padrão
    
    @staticmethod
    def get_status_color(status: str) -> str:
        """Retorna cor associada ao status"""
        colors = {
            'NOT_STARTED': '#9E9E9E',  # Cinza
            'IN_PROGRESS': '#2196F3',  # Azul
            'COMPLETED': '#4CAF50'     # Verde
        }
        return colors.get(status.upper(), '#9E9E9E')
    
    @staticmethod
    def paginate_query(query, page: int = 1, per_page: int = 20, max_per_page: int = 100):
        """Aplica paginação a uma query SQLAlchemy"""
        # Validar parâmetros
        page = max(1, page)
        per_page = min(max(1, per_page), max_per_page)
        
        # Aplicar paginação
        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Calcular metadados de paginação
        total_pages = (total + per_page - 1) // per_page
        has_prev = page > 1
        has_next = page < total_pages
        
        return {
            'items': items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
                'has_prev': has_prev,
                'has_next': has_next,
                'prev_page': page - 1 if has_prev else None,
                'next_page': page + 1 if has_next else None
            }
        }
    
    @staticmethod
    def serialize_datetime(dt: Optional[datetime]) -> Optional[str]:
        """Serializa datetime para string ISO"""
        return dt.isoformat() if dt else None
    
    @staticmethod
    def parse_datetime(dt_str: str) -> Optional[datetime]:
        """Parse string ISO para datetime"""
        try:
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None
    
    @staticmethod
    def calculate_rating_average(ratings: List[float]) -> float:
        """Calcula média de avaliações"""
        if not ratings:
            return 0.0
        
        return sum(ratings) / len(ratings)
    
    @staticmethod
    def generate_slug(text: str) -> str:
        """Gera slug a partir de texto"""
        # Converter para minúsculas
        slug = text.lower()
        
        # Remover acentos (simplificado)
        replacements = {
            'á': 'a', 'à': 'a', 'ã': 'a', 'â': 'a',
            'é': 'e', 'ê': 'e',
            'í': 'i',
            'ó': 'o', 'ô': 'o', 'õ': 'o',
            'ú': 'u', 'ü': 'u',
            'ç': 'c'
        }
        
        for old, new in replacements.items():
            slug = slug.replace(old, new)
        
        # Substituir espaços e caracteres especiais por hífens
        slug = re.sub(r'[^\w\s-]', '', slug)
        slug = re.sub(r'[-\s]+', '-', slug)
        
        return slug.strip('-')

def validate_request_data(required_fields: List[str], optional_fields: List[str] = None):
    """Decorator para validar dados de requisição"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'Dados JSON são obrigatórios'}), 400
            
            # Verificar campos obrigatórios
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({
                    'error': f'Campos obrigatórios ausentes: {", ".join(missing_fields)}'
                }), 400
            
            # Filtrar apenas campos permitidos
            allowed_fields = required_fields + (optional_fields or [])
            filtered_data = {k: v for k, v in data.items() if k in allowed_fields}
            
            # Adicionar dados filtrados aos kwargs
            kwargs['validated_data'] = filtered_data
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_database_errors(f):
    """Decorator para tratar erros de banco de dados"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400
        except Exception as e:
            current_app.logger.error(f"Erro no banco de dados: {str(e)}")
            return jsonify({'error': 'Erro interno do servidor'}), 500
    return decorated_function

def require_tier(min_tier: str = 'free'):
    """Decorator para verificar tier do usuário (sistema freemium)"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Aqui você implementaria a lógica de verificação de tier
            # Por exemplo, verificando o token JWT ou sessão do usuário
            
            # Placeholder - implementar baseado no sistema de autenticação
            user_tier = request.headers.get('X-User-Tier', 'free')
            
            tier_hierarchy = {'free': 0, 'premium': 1, 'enterprise': 2}
            
            if tier_hierarchy.get(user_tier, 0) < tier_hierarchy.get(min_tier, 0):
                return jsonify({
                    'error': f'Acesso negado. Tier {min_tier} ou superior necessário.',
                    'current_tier': user_tier,
                    'required_tier': min_tier
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def rate_limit(requests_per_minute: int = 60):
    """Decorator para rate limiting"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Implementar rate limiting baseado em IP ou usuário
            # Placeholder - implementar com Redis ou cache em memória
            
            client_ip = request.remote_addr
            # Aqui você implementaria a lógica de rate limiting
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

class ResponseFormatter:
    """Formatador de respostas padronizadas"""
    
    @staticmethod
    def success(data: Any = None, message: str = 'Sucesso', status_code: int = 200):
        """Formata resposta de sucesso"""
        response = {
            'success': True,
            'message': message
        }
        
        if data is not None:
            response['data'] = data
        
        return jsonify(response), status_code
    
    @staticmethod
    def error(message: str, status_code: int = 400, details: Dict = None):
        """Formata resposta de erro"""
        response = {
            'success': False,
            'error': message
        }
        
        if details:
            response['details'] = details
        
        return jsonify(response), status_code
    
    @staticmethod
    def paginated(items: List, pagination: Dict, message: str = 'Dados recuperados com sucesso'):
        """Formata resposta paginada"""
        return jsonify({
            'success': True,
            'message': message,
            'data': items,
            'pagination': pagination
        }), 200