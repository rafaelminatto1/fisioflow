# -*- coding: utf-8 -*-
"""
Utilitários específicos para iOS

Este módulo contém funções e classes para otimizar a experiência do usuário
no iOS, incluindo sincronização offline, compressão de mídia e push notifications.
"""

import os
import json
import hashlib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from PIL import Image
import redis
from flask import current_app

from .config import MentorshipConfig


@dataclass
class SyncData:
    """Estrutura de dados para sincronização offline."""
    entity_type: str
    entity_id: str
    data: Dict[str, Any]
    last_modified: datetime
    checksum: str
    sync_priority: int = 1  # 1=alta, 2=média, 3=baixa


@dataclass
class OfflineResource:
    """Recurso disponível offline."""
    id: str
    title: str
    type: str  # video, pdf, image, text
    file_path: str
    file_size: int
    download_url: str
    last_accessed: datetime
    priority: int


class iOSOptimizer:
    """Classe para otimizações específicas do iOS."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        )
        self.config = MentorshipConfig.get_ios_config()
    
    def compress_image(self, image_path: str, output_path: str, quality: Optional[float] = None) -> Tuple[bool, str]:
        """
        Comprime uma imagem para otimizar o uso em dispositivos iOS.
        
        Args:
            image_path: Caminho da imagem original
            output_path: Caminho da imagem comprimida
            quality: Qualidade da compressão (0.0 a 1.0)
        
        Returns:
            Tuple com (sucesso, mensagem)
        """
        try:
            quality = quality or self.config['image_quality']
            
            with Image.open(image_path) as img:
                # Converte para RGB se necessário
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Redimensiona se muito grande (otimização para iOS)
                max_size = (1920, 1080)  # Full HD
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Salva com compressão
                img.save(output_path, 'JPEG', quality=int(quality * 100), optimize=True)
            
            return True, "Imagem comprimida com sucesso"
        
        except Exception as e:
            return False, f"Erro ao comprimir imagem: {str(e)}"
    
    def generate_thumbnail(self, image_path: str, thumbnail_path: str, size: Tuple[int, int] = (300, 300)) -> bool:
        """
        Gera thumbnail otimizado para iOS.
        
        Args:
            image_path: Caminho da imagem original
            thumbnail_path: Caminho do thumbnail
            size: Tamanho do thumbnail
        
        Returns:
            True se bem-sucedido
        """
        try:
            with Image.open(image_path) as img:
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            return True
        except Exception:
            return False
    
    def calculate_checksum(self, data: Any) -> str:
        """
        Calcula checksum para verificação de integridade de dados.
        
        Args:
            data: Dados para calcular checksum
        
        Returns:
            Checksum MD5
        """
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def prepare_offline_data(self, user_id: str, entity_type: str, entities: List[Dict]) -> List[SyncData]:
        """
        Prepara dados para sincronização offline.
        
        Args:
            user_id: ID do usuário
            entity_type: Tipo de entidade (cases, resources, etc.)
            entities: Lista de entidades
        
        Returns:
            Lista de dados de sincronização
        """
        sync_data_list = []
        
        for entity in entities:
            # Calcula checksum para verificação de integridade
            checksum = self.calculate_checksum(entity)
            
            # Define prioridade baseada no tipo e uso
            priority = self._get_sync_priority(entity_type, entity)
            
            sync_data = SyncData(
                entity_type=entity_type,
                entity_id=str(entity.get('id', '')),
                data=entity,
                last_modified=datetime.now(),
                checksum=checksum,
                sync_priority=priority
            )
            
            sync_data_list.append(sync_data)
        
        return sync_data_list
    
    def _get_sync_priority(self, entity_type: str, entity: Dict) -> int:
        """
        Determina a prioridade de sincronização baseada no tipo e uso.
        
        Args:
            entity_type: Tipo de entidade
            entity: Dados da entidade
        
        Returns:
            Prioridade (1=alta, 2=média, 3=baixa)
        """
        # Prioridades por tipo
        type_priorities = {
            'cases': 1,  # Casos clínicos têm alta prioridade
            'competencies': 1,  # Competências são essenciais
            'sessions': 1,  # Sessões agendadas são críticas
            'resources': 2,  # Recursos educacionais têm prioridade média
            'analytics': 3,  # Analytics têm baixa prioridade
            'notifications': 2
        }
        
        base_priority = type_priorities.get(entity_type, 2)
        
        # Ajusta prioridade baseada em uso recente
        if entity.get('last_accessed'):
            last_accessed = datetime.fromisoformat(entity['last_accessed'].replace('Z', '+00:00'))
            days_since_access = (datetime.now() - last_accessed.replace(tzinfo=None)).days
            
            if days_since_access <= 7:
                base_priority = max(1, base_priority - 1)  # Aumenta prioridade
            elif days_since_access > 30:
                base_priority = min(3, base_priority + 1)  # Diminui prioridade
        
        return base_priority
    
    def store_offline_data(self, user_id: str, sync_data_list: List[SyncData]) -> bool:
        """
        Armazena dados para acesso offline no Redis.
        
        Args:
            user_id: ID do usuário
            sync_data_list: Lista de dados de sincronização
        
        Returns:
            True se bem-sucedido
        """
        try:
            pipe = self.redis_client.pipeline()
            
            for sync_data in sync_data_list:
                key = f"offline:{user_id}:{sync_data.entity_type}:{sync_data.entity_id}"
                
                # Armazena dados com TTL baseado na prioridade
                ttl_hours = {
                    1: 168,  # 7 dias para alta prioridade
                    2: 72,   # 3 dias para média prioridade
                    3: 24    # 1 dia para baixa prioridade
                }[sync_data.sync_priority]
                
                pipe.setex(
                    key,
                    ttl_hours * 3600,
                    json.dumps(asdict(sync_data), default=str)
                )
            
            # Atualiza índice de sincronização
            sync_index_key = f"sync_index:{user_id}"
            sync_index = {
                'last_sync': datetime.now().isoformat(),
                'entities_count': len(sync_data_list),
                'checksum': self.calculate_checksum([s.checksum for s in sync_data_list])
            }
            
            pipe.setex(
                sync_index_key,
                7 * 24 * 3600,  # 7 dias
                json.dumps(sync_index)
            )
            
            pipe.execute()
            return True
        
        except Exception as e:
            current_app.logger.error(f"Erro ao armazenar dados offline: {str(e)}")
            return False
    
    def get_offline_data(self, user_id: str, entity_type: Optional[str] = None) -> List[SyncData]:
        """
        Recupera dados offline do Redis.
        
        Args:
            user_id: ID do usuário
            entity_type: Tipo específico de entidade (opcional)
        
        Returns:
            Lista de dados de sincronização
        """
        try:
            pattern = f"offline:{user_id}:{entity_type or '*'}:*"
            keys = self.redis_client.keys(pattern)
            
            sync_data_list = []
            
            for key in keys:
                data = self.redis_client.get(key)
                if data:
                    sync_data_dict = json.loads(data)
                    sync_data_dict['last_modified'] = datetime.fromisoformat(
                        sync_data_dict['last_modified']
                    )
                    sync_data_list.append(SyncData(**sync_data_dict))
            
            # Ordena por prioridade e data de modificação
            sync_data_list.sort(
                key=lambda x: (x.sync_priority, x.last_modified),
                reverse=True
            )
            
            return sync_data_list
        
        except Exception as e:
            current_app.logger.error(f"Erro ao recuperar dados offline: {str(e)}")
            return []
    
    def cleanup_offline_data(self, user_id: str, max_age_days: int = 30) -> int:
        """
        Remove dados offline antigos para liberar espaço.
        
        Args:
            user_id: ID do usuário
            max_age_days: Idade máxima dos dados em dias
        
        Returns:
            Número de itens removidos
        """
        try:
            pattern = f"offline:{user_id}:*"
            keys = self.redis_client.keys(pattern)
            
            removed_count = 0
            cutoff_date = datetime.now() - timedelta(days=max_age_days)
            
            for key in keys:
                data = self.redis_client.get(key)
                if data:
                    sync_data_dict = json.loads(data)
                    last_modified = datetime.fromisoformat(
                        sync_data_dict['last_modified']
                    )
                    
                    if last_modified < cutoff_date:
                        self.redis_client.delete(key)
                        removed_count += 1
            
            return removed_count
        
        except Exception as e:
            current_app.logger.error(f"Erro ao limpar dados offline: {str(e)}")
            return 0
    
    def get_sync_status(self, user_id: str) -> Dict[str, Any]:
        """
        Retorna status da sincronização para o usuário.
        
        Args:
            user_id: ID do usuário
        
        Returns:
            Dicionário com status da sincronização
        """
        try:
            sync_index_key = f"sync_index:{user_id}"
            sync_index_data = self.redis_client.get(sync_index_key)
            
            if sync_index_data:
                sync_index = json.loads(sync_index_data)
                last_sync = datetime.fromisoformat(sync_index['last_sync'])
                
                return {
                    'last_sync': last_sync.isoformat(),
                    'entities_count': sync_index['entities_count'],
                    'checksum': sync_index['checksum'],
                    'sync_age_minutes': int((datetime.now() - last_sync).total_seconds() / 60),
                    'needs_sync': (datetime.now() - last_sync).total_seconds() > (self.config['sync_interval'] * 60)
                }
            else:
                return {
                    'last_sync': None,
                    'entities_count': 0,
                    'checksum': None,
                    'sync_age_minutes': None,
                    'needs_sync': True
                }
        
        except Exception as e:
            current_app.logger.error(f"Erro ao obter status de sincronização: {str(e)}")
            return {
                'last_sync': None,
                'entities_count': 0,
                'checksum': None,
                'sync_age_minutes': None,
                'needs_sync': True,
                'error': str(e)
            }


class PushNotificationManager:
    """Gerenciador de notificações push para iOS."""
    
    def __init__(self):
        self.config = MentorshipConfig.iOS
        self.templates = {
            'new_case_assigned': {
                'title': 'Novo Caso Clínico',
                'body': 'Um novo caso foi atribuído a você: {case_title}',
                'category': 'case_assignment'
            },
            'session_reminder': {
                'title': 'Lembrete de Sessão',
                'body': 'Sua sessão de mentoria começa em {minutes} minutos',
                'category': 'session_reminder'
            },
            'competency_milestone': {
                'title': 'Parabéns!',
                'body': 'Você atingiu um marco na competência: {competency_name}',
                'category': 'achievement'
            },
            'resource_available': {
                'title': 'Novo Recurso',
                'body': 'Um novo recurso educacional está disponível: {resource_title}',
                'category': 'resource_update'
            }
        }
    
    def format_notification(self, template_name: str, **kwargs) -> Dict[str, str]:
        """
        Formata uma notificação usando um template.
        
        Args:
            template_name: Nome do template
            **kwargs: Variáveis para substituição
        
        Returns:
            Dicionário com dados da notificação
        """
        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template '{template_name}' não encontrado")
        
        return {
            'title': template['title'].format(**kwargs),
            'body': template['body'].format(**kwargs),
            'category': template['category']
        }
    
    def schedule_notification(self, user_id: str, template_name: str, 
                            schedule_time: datetime, **kwargs) -> Dict[str, Any]:
        """
        Agenda uma notificação push.
        
        Args:
            user_id: ID do usuário
            template_name: Nome do template
            schedule_time: Horário para envio
            **kwargs: Variáveis para o template
        
        Returns:
            Dicionário com dados da notificação agendada
        """
        notification_data = self.format_notification(template_name, **kwargs)
        
        # Em produção, aqui seria integrado com APNs
        scheduled_notification = {
            'id': hashlib.md5(f"{user_id}{template_name}{schedule_time}".encode()).hexdigest(),
            'user_id': user_id,
            'title': notification_data['title'],
            'body': notification_data['body'],
            'category': notification_data['category'],
            'schedule_time': schedule_time.isoformat(),
            'status': 'scheduled'
        }
        
        return scheduled_notification


class OfflineResourceManager:
    """Gerenciador de recursos offline para iOS."""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis_client = redis_client or redis.from_url(
            current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
        )
        self.config = MentorshipConfig.get_ios_config()
    
    def get_offline_resources(self, user_id: str, tier: str) -> List[OfflineResource]:
        """
        Retorna recursos disponíveis para download offline baseado no tier.
        
        Args:
            user_id: ID do usuário
            tier: Tier do usuário (free, premium, enterprise)
        
        Returns:
            Lista de recursos offline
        """
        tier_limits = self.config['offline_resources']
        
        # Simula busca de recursos (em produção seria do banco de dados)
        all_resources = self._get_user_resources(user_id)
        
        # Filtra por prioridade e limites do tier
        offline_resources = []
        
        for resource_type, limit in tier_limits.items():
            type_resources = [r for r in all_resources if r.type == resource_type]
            
            # Ordena por prioridade e acesso recente
            type_resources.sort(
                key=lambda x: (x.priority, x.last_accessed),
                reverse=True
            )
            
            # Aplica limite do tier
            if limit == -1:  # Ilimitado
                offline_resources.extend(type_resources)
            else:
                offline_resources.extend(type_resources[:limit])
        
        return offline_resources
    
    def _get_user_resources(self, user_id: str) -> List[OfflineResource]:
        """
        Simula busca de recursos do usuário.
        
        Args:
            user_id: ID do usuário
        
        Returns:
            Lista de recursos
        """
        # Em produção, isso viria do banco de dados
        return [
            OfflineResource(
                id="case_1",
                title="Caso Clínico: Lombalgia",
                type="cases",
                file_path="/cases/case_1.json",
                file_size=1024000,
                download_url="/api/cases/1/download",
                last_accessed=datetime.now() - timedelta(days=1),
                priority=1
            ),
            OfflineResource(
                id="video_1",
                title="Técnicas de Mobilização",
                type="videos",
                file_path="/videos/video_1.mp4",
                file_size=50000000,
                download_url="/api/videos/1/download",
                last_accessed=datetime.now() - timedelta(days=3),
                priority=2
            )
        ]
    
    def calculate_download_size(self, resources: List[OfflineResource]) -> int:
        """
        Calcula o tamanho total de download dos recursos.
        
        Args:
            resources: Lista de recursos
        
        Returns:
            Tamanho total em bytes
        """
        return sum(resource.file_size for resource in resources)
    
    def optimize_download_queue(self, resources: List[OfflineResource], 
                              max_size_mb: int) -> List[OfflineResource]:
        """
        Otimiza a fila de download baseada no tamanho máximo.
        
        Args:
            resources: Lista de recursos
            max_size_mb: Tamanho máximo em MB
        
        Returns:
            Lista otimizada de recursos
        """
        max_size_bytes = max_size_mb * 1024 * 1024
        
        # Ordena por prioridade e tamanho
        resources.sort(key=lambda x: (x.priority, x.file_size))
        
        optimized_resources = []
        total_size = 0
        
        for resource in resources:
            if total_size + resource.file_size <= max_size_bytes:
                optimized_resources.append(resource)
                total_size += resource.file_size
            else:
                break
        
        return optimized_resources