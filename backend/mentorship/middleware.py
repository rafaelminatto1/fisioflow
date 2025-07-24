# -*- coding: utf-8 -*-
"""
Middleware para Sistema Freemium

Este módulo contém middleware para validação automática de limites freemium,
rate limiting baseado em tier e logging de uso para analytics.
"""

import time
import json
from datetime import datetime, timedelta
from functools import wraps
from typing import Dict, Any, Optional, Callable
from flask import request, jsonify, g, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
import redis

from .config import MentorshipConfig, MentorshipTier
from .freemium_service import FreemiumService
from .models import User, db


class FreemiumMiddleware:
    """Middleware para validação de limites freemium."""
    
    def __init__(self, app=None, redis_client=None):
        self.app = app
        self.redis_client = redis_client or redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        )
        self.freemium_service = FreemiumService()
        
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Inicializa o middleware com a aplicação Flask."""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Executa antes de cada requisição."""
        # Pula validação para rotas públicas
        if self._is_public_route():
            return
        
        # Verifica autenticação
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            g.current_user_id = user_id
        except Exception:
            return  # Deixa o sistema de auth lidar com isso
        
        # Carrega informações do usuário
        user = db.session.query(User).filter(User.id == user_id).first()
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        g.current_user = user
        g.current_tier = MentorshipTier(user.tier or 'free')
        
        # Aplica rate limiting baseado no tier
        rate_limit_result = self._apply_rate_limiting(user_id, user.tier or 'free')
        if not rate_limit_result['allowed']:
            return jsonify({
                'error': 'Rate limit excedido',
                'message': rate_limit_result['message'],
                'retry_after': rate_limit_result['retry_after']
            }), 429
        
        # Valida limites para ações específicas
        action_validation = self._validate_action_limits()
        if not action_validation['allowed']:
            return jsonify({
                'error': 'Limite do plano excedido',
                'message': action_validation['message'],
                'upgrade_required': True,
                'current_tier': user.tier,
                'suggested_tier': action_validation.get('suggested_tier')
            }), 403
    
    def after_request(self, response):
        """Executa após cada requisição."""
        # Registra métricas de uso
        if hasattr(g, 'current_user_id'):
            self._log_usage_metrics(response)
        
        return response
    
    def _is_public_route(self) -> bool:
        """Verifica se a rota é pública (não requer autenticação)."""
        public_routes = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/refresh',
            '/api/health',
            '/api/metrics',
            '/api/tiers/comparison'  # Comparação de tiers é pública
        ]
        
        return any(request.path.startswith(route) for route in public_routes)
    
    def _apply_rate_limiting(self, user_id: str, tier: str) -> Dict[str, Any]:
        """Aplica rate limiting baseado no tier do usuário."""
        tier_enum = MentorshipTier(tier)
        
        # Define limites por tier
        rate_limits = {
            MentorshipTier.FREE: {
                'requests_per_minute': 30,
                'requests_per_hour': 500,
                'requests_per_day': 2000
            },
            MentorshipTier.PREMIUM: {
                'requests_per_minute': 100,
                'requests_per_hour': 2000,
                'requests_per_day': 10000
            },
            MentorshipTier.ENTERPRISE: {
                'requests_per_minute': -1,  # Ilimitado
                'requests_per_hour': -1,
                'requests_per_day': -1
            }
        }
        
        limits = rate_limits[tier_enum]
        
        # Verifica cada período
        for period, limit in limits.items():
            if limit == -1:  # Ilimitado
                continue
            
            if not self._check_rate_limit(user_id, period, limit):
                return {
                    'allowed': False,
                    'message': f'Rate limit excedido para {period}',
                    'retry_after': self._get_retry_after(period)
                }
        
        return {'allowed': True}
    
    def _check_rate_limit(self, user_id: str, period: str, limit: int) -> bool:
        """Verifica se o usuário está dentro do rate limit."""
        now = datetime.now()
        
        # Define janela de tempo
        if period == 'requests_per_minute':
            window_start = now.replace(second=0, microsecond=0)
            window_key = f"rate_limit:{user_id}:minute:{window_start.strftime('%Y%m%d%H%M')}"
            ttl = 60
        elif period == 'requests_per_hour':
            window_start = now.replace(minute=0, second=0, microsecond=0)
            window_key = f"rate_limit:{user_id}:hour:{window_start.strftime('%Y%m%d%H')}"
            ttl = 3600
        elif period == 'requests_per_day':
            window_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            window_key = f"rate_limit:{user_id}:day:{window_start.strftime('%Y%m%d')}"
            ttl = 86400
        else:
            return True
        
        try:
            # Incrementa contador
            current_count = self.redis_client.incr(window_key)
            
            # Define TTL na primeira requisição
            if current_count == 1:
                self.redis_client.expire(window_key, ttl)
            
            return current_count <= limit
        
        except Exception as e:
            current_app.logger.error(f"Erro no rate limiting: {str(e)}")
            return True  # Em caso de erro, permite a requisição
    
    def _get_retry_after(self, period: str) -> int:
        """Calcula tempo para retry baseado no período."""
        if period == 'requests_per_minute':
            return 60
        elif period == 'requests_per_hour':
            return 3600
        elif period == 'requests_per_day':
            return 86400
        return 60
    
    def _validate_action_limits(self) -> Dict[str, Any]:
        """Valida limites para ações específicas baseadas na rota."""
        if not hasattr(g, 'current_user_id'):
            return {'allowed': True}
        
        user_id = g.current_user_id
        method = request.method
        path = request.path
        
        # Mapeia rotas para ações
        action_mapping = {
            ('POST', '/api/mentorship/interns'): 'create_intern',
            ('POST', '/api/mentorship/cases'): 'create_case',
            ('POST', '/api/mentorship/resources'): 'upload_resource',
            ('POST', '/api/mentorship/sessions'): 'schedule_session',
            ('POST', '/api/mentorship/competencies'): 'create_custom_competency',
            ('GET', '/api/mentorship/reports/export'): 'export_report',
            ('POST', '/api/mentorship/ai/assist'): 'use_ai'
        }
        
        action = action_mapping.get((method, path))
        if not action:
            return {'allowed': True}
        
        # Parâmetros específicos para algumas ações
        kwargs = {}
        if action == 'upload_resource' and request.files:
            file = list(request.files.values())[0]
            kwargs['file_size'] = len(file.read())
            file.seek(0)  # Reset file pointer
        
        # Verifica se a ação é permitida
        can_perform, message = self.freemium_service.can_perform_action(
            user_id, action, **kwargs
        )
        
        if not can_perform:
            # Sugere upgrade se necessário
            current_tier = g.current_tier
            suggested_tier = None
            
            if current_tier == MentorshipTier.FREE:
                suggested_tier = MentorshipTier.PREMIUM.value
            elif current_tier == MentorshipTier.PREMIUM:
                suggested_tier = MentorshipTier.ENTERPRISE.value
            
            return {
                'allowed': False,
                'message': message,
                'suggested_tier': suggested_tier
            }
        
        return {'allowed': True}
    
    def _log_usage_metrics(self, response):
        """Registra métricas de uso para analytics."""
        try:
            user_id = g.current_user_id
            tier = g.current_tier.value
            
            metrics = {
                'user_id': user_id,
                'tier': tier,
                'method': request.method,
                'path': request.path,
                'status_code': response.status_code,
                'timestamp': datetime.now().isoformat(),
                'response_time_ms': getattr(g, 'request_start_time', None),
                'user_agent': request.headers.get('User-Agent', ''),
                'ip_address': request.remote_addr
            }
            
            # Calcula tempo de resposta
            if hasattr(g, 'request_start_time'):
                metrics['response_time_ms'] = int(
                    (time.time() - g.request_start_time) * 1000
                )
            
            # Armazena métricas no Redis para processamento posterior
            metrics_key = f"usage_metrics:{datetime.now().strftime('%Y%m%d')}:{user_id}"
            
            self.redis_client.lpush(
                metrics_key,
                json.dumps(metrics)
            )
            
            # Define TTL de 30 dias
            self.redis_client.expire(metrics_key, 30 * 24 * 3600)
        
        except Exception as e:
            current_app.logger.error(f"Erro ao registrar métricas: {str(e)}")


def require_tier(min_tier: str):
    """Decorator para exigir tier mínimo."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_tier'):
                return jsonify({'error': 'Autenticação necessária'}), 401
            
            required_tier = MentorshipTier(min_tier)
            current_tier = g.current_tier
            
            # Hierarquia de tiers
            tier_hierarchy = {
                MentorshipTier.FREE: 0,
                MentorshipTier.PREMIUM: 1,
                MentorshipTier.ENTERPRISE: 2
            }
            
            if tier_hierarchy[current_tier] < tier_hierarchy[required_tier]:
                return jsonify({
                    'error': 'Tier insuficiente',
                    'message': f'Esta funcionalidade requer tier {required_tier.value} ou superior',
                    'current_tier': current_tier.value,
                    'required_tier': required_tier.value,
                    'upgrade_required': True
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def require_feature(feature_name: str):
    """Decorator para exigir funcionalidade específica."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user_id'):
                return jsonify({'error': 'Autenticação necessária'}), 401
            
            config = MentorshipConfig()
            features = config.get_feature_availability()
            
            if not features.get(feature_name, False):
                return jsonify({
                    'error': 'Funcionalidade não disponível',
                    'message': f'A funcionalidade {feature_name} não está disponível no seu plano',
                    'current_tier': g.current_tier.value,
                    'upgrade_required': True
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator


def track_usage(action: str):
    """Decorator para rastrear uso de funcionalidades."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = f(*args, **kwargs)
                
                # Registra uso bem-sucedido
                if hasattr(g, 'current_user_id'):
                    _track_action_usage(
                        g.current_user_id,
                        action,
                        'success',
                        time.time() - start_time
                    )
                
                return result
            
            except Exception as e:
                # Registra uso com erro
                if hasattr(g, 'current_user_id'):
                    _track_action_usage(
                        g.current_user_id,
                        action,
                        'error',
                        time.time() - start_time,
                        str(e)
                    )
                
                raise
        
        return decorated_function
    return decorator


def _track_action_usage(user_id: str, action: str, status: str, 
                       duration: float, error: str = None):
    """Registra uso de ação específica."""
    try:
        redis_client = redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        )
        
        usage_data = {
            'user_id': user_id,
            'action': action,
            'status': status,
            'duration_seconds': duration,
            'timestamp': datetime.now().isoformat(),
            'error': error
        }
        
        # Armazena no Redis
        key = f"action_usage:{datetime.now().strftime('%Y%m%d')}:{user_id}:{action}"
        
        redis_client.lpush(key, json.dumps(usage_data))
        redis_client.expire(key, 30 * 24 * 3600)  # 30 dias
        
        # Atualiza contadores diários
        daily_counter_key = f"daily_usage:{user_id}:{action}:{datetime.now().strftime('%Y%m%d')}"
        redis_client.incr(daily_counter_key)
        redis_client.expire(daily_counter_key, 24 * 3600)  # 24 horas
    
    except Exception as e:
        current_app.logger.error(f"Erro ao rastrear uso: {str(e)}")


def log_request_start():
    """Registra início da requisição para cálculo de tempo de resposta."""
    g.request_start_time = time.time()


# Middleware para registrar início das requisições
def init_request_timing(app):
    """Inicializa timing de requisições."""
    app.before_request(log_request_start)