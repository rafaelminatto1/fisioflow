# -*- coding: utf-8 -*-
"""
Configuração do Módulo de Mentoria

Este módulo centraliza todas as configurações relacionadas ao sistema de mentoria,
incluindo tiers freemium, limites por plano e configurações específicas para iOS.
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class MentorshipTier(Enum):
    """Tiers disponíveis no sistema freemium."""
    FREE = "free"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"


@dataclass
class TierLimits:
    """Limites para cada tier do sistema freemium."""
    interns: int
    cases: int
    resources: int
    sessions: int
    storage_bytes: int
    ai_requests_per_month: int
    video_sessions_per_month: int
    custom_competencies: int
    export_reports: bool
    priority_support: bool
    advanced_analytics: bool
    white_label: bool


class MentorshipConfig:
    """Configuração centralizada do módulo de mentoria."""
    
    # Tier atual do sistema
    CURRENT_TIER = MentorshipTier(os.getenv('MENTORSHIP_TIER', 'free'))
    
    # Configurações de limites por tier
    TIER_LIMITS = {
        MentorshipTier.FREE: TierLimits(
            interns=int(os.getenv('MENTORSHIP_FREE_INTERNS_LIMIT', 5)),
            cases=int(os.getenv('MENTORSHIP_FREE_CASES_LIMIT', 10)),
            resources=int(os.getenv('MENTORSHIP_FREE_RESOURCES_LIMIT', 20)),
            sessions=int(os.getenv('MENTORSHIP_FREE_SESSIONS_LIMIT', 5)),
            storage_bytes=int(os.getenv('MENTORSHIP_FREE_STORAGE_LIMIT', 1073741824)),  # 1GB
            ai_requests_per_month=int(os.getenv('MENTORSHIP_FREE_AI_REQUESTS', 50)),
            video_sessions_per_month=int(os.getenv('MENTORSHIP_FREE_VIDEO_SESSIONS', 2)),
            custom_competencies=int(os.getenv('MENTORSHIP_FREE_CUSTOM_COMPETENCIES', 0)),
            export_reports=os.getenv('MENTORSHIP_FREE_EXPORT_REPORTS', 'false').lower() == 'true',
            priority_support=False,
            advanced_analytics=False,
            white_label=False
        ),
        MentorshipTier.PREMIUM: TierLimits(
            interns=int(os.getenv('MENTORSHIP_PREMIUM_INTERNS_LIMIT', 50)),
            cases=int(os.getenv('MENTORSHIP_PREMIUM_CASES_LIMIT', 100)),
            resources=int(os.getenv('MENTORSHIP_PREMIUM_RESOURCES_LIMIT', -1)),  # Ilimitado
            sessions=int(os.getenv('MENTORSHIP_PREMIUM_SESSIONS_LIMIT', 50)),
            storage_bytes=int(os.getenv('MENTORSHIP_PREMIUM_STORAGE_LIMIT', 10737418240)),  # 10GB
            ai_requests_per_month=int(os.getenv('MENTORSHIP_PREMIUM_AI_REQUESTS', 500)),
            video_sessions_per_month=int(os.getenv('MENTORSHIP_PREMIUM_VIDEO_SESSIONS', 20)),
            custom_competencies=int(os.getenv('MENTORSHIP_PREMIUM_CUSTOM_COMPETENCIES', 50)),
            export_reports=os.getenv('MENTORSHIP_PREMIUM_EXPORT_REPORTS', 'true').lower() == 'true',
            priority_support=True,
            advanced_analytics=True,
            white_label=False
        ),
        MentorshipTier.ENTERPRISE: TierLimits(
            interns=int(os.getenv('MENTORSHIP_ENTERPRISE_INTERNS_LIMIT', -1)),  # Ilimitado
            cases=int(os.getenv('MENTORSHIP_ENTERPRISE_CASES_LIMIT', -1)),  # Ilimitado
            resources=int(os.getenv('MENTORSHIP_ENTERPRISE_RESOURCES_LIMIT', -1)),  # Ilimitado
            sessions=int(os.getenv('MENTORSHIP_ENTERPRISE_SESSIONS_LIMIT', -1)),  # Ilimitado
            storage_bytes=int(os.getenv('MENTORSHIP_ENTERPRISE_STORAGE_LIMIT', -1)),  # Ilimitado
            ai_requests_per_month=int(os.getenv('MENTORSHIP_ENTERPRISE_AI_REQUESTS', -1)),  # Ilimitado
            video_sessions_per_month=int(os.getenv('MENTORSHIP_ENTERPRISE_VIDEO_SESSIONS', -1)),  # Ilimitado
            custom_competencies=int(os.getenv('MENTORSHIP_ENTERPRISE_CUSTOM_COMPETENCIES', -1)),  # Ilimitado
            export_reports=True,
            priority_support=True,
            advanced_analytics=True,
            white_label=True
        )
    }
    
    # Configurações específicas para iOS
    class iOS:
        """Configurações específicas para a plataforma iOS."""
        
        # Modo offline
        OFFLINE_MODE_ENABLED = os.getenv('MENTORSHIP_IOS_OFFLINE_MODE', 'true').lower() == 'true'
        SYNC_INTERVAL_MINUTES = int(os.getenv('MENTORSHIP_IOS_SYNC_INTERVAL', 15))
        
        # Push notifications
        PUSH_NOTIFICATIONS_ENABLED = os.getenv('MENTORSHIP_IOS_PUSH_NOTIFICATIONS', 'true').lower() == 'true'
        APNS_CERTIFICATE_PATH = os.getenv('MENTORSHIP_IOS_APNS_CERT_PATH')
        APNS_KEY_ID = os.getenv('MENTORSHIP_IOS_APNS_KEY_ID')
        APNS_TEAM_ID = os.getenv('MENTORSHIP_IOS_APNS_TEAM_ID')
        APNS_BUNDLE_ID = os.getenv('MENTORSHIP_IOS_APNS_BUNDLE_ID', 'com.fisioflow.mentorship')
        
        # Cache local
        LOCAL_CACHE_SIZE_MB = int(os.getenv('MENTORSHIP_IOS_CACHE_SIZE_MB', 100))
        CACHE_EXPIRY_HOURS = int(os.getenv('MENTORSHIP_IOS_CACHE_EXPIRY_HOURS', 24))
        
        # Otimizações de performance
        IMAGE_COMPRESSION_QUALITY = float(os.getenv('MENTORSHIP_IOS_IMAGE_QUALITY', 0.8))
        VIDEO_COMPRESSION_BITRATE = int(os.getenv('MENTORSHIP_IOS_VIDEO_BITRATE', 1000000))  # 1Mbps
        
        # Configurações de rede
        REQUEST_TIMEOUT_SECONDS = int(os.getenv('MENTORSHIP_IOS_REQUEST_TIMEOUT', 30))
        MAX_CONCURRENT_DOWNLOADS = int(os.getenv('MENTORSHIP_IOS_MAX_DOWNLOADS', 3))
        
        # Recursos offline por tier
        OFFLINE_RESOURCES_BY_TIER = {
            MentorshipTier.FREE: {
                'cases': 5,
                'resources': 10,
                'videos': 2
            },
            MentorshipTier.PREMIUM: {
                'cases': 25,
                'resources': 50,
                'videos': 10
            },
            MentorshipTier.ENTERPRISE: {
                'cases': -1,  # Ilimitado
                'resources': -1,  # Ilimitado
                'videos': -1  # Ilimitado
            }
        }
    
    # Configurações de IA
    class AI:
        """Configurações de inteligência artificial."""
        
        # Modelos disponíveis por tier
        AVAILABLE_MODELS_BY_TIER = {
            MentorshipTier.FREE: ['gemini-pro-basic'],
            MentorshipTier.PREMIUM: ['gemini-pro', 'gemini-pro-vision'],
            MentorshipTier.ENTERPRISE: ['gemini-pro', 'gemini-pro-vision', 'gemini-ultra']
        }
        
        # Configurações de rate limiting para IA
        AI_RATE_LIMITS = {
            MentorshipTier.FREE: {
                'requests_per_hour': 10,
                'requests_per_day': 50
            },
            MentorshipTier.PREMIUM: {
                'requests_per_hour': 100,
                'requests_per_day': 500
            },
            MentorshipTier.ENTERPRISE: {
                'requests_per_hour': -1,  # Ilimitado
                'requests_per_day': -1  # Ilimitado
            }
        }
    
    # Configurações de segurança
    class Security:
        """Configurações de segurança e compliance."""
        
        # Criptografia
        ENCRYPTION_ALGORITHM = os.getenv('MENTORSHIP_ENCRYPTION_ALGORITHM', 'AES-256-GCM')
        DATA_RETENTION_DAYS = int(os.getenv('MENTORSHIP_DATA_RETENTION_DAYS', 2555))  # 7 anos
        
        # Auditoria
        AUDIT_LOG_ENABLED = os.getenv('MENTORSHIP_AUDIT_LOG', 'true').lower() == 'true'
        AUDIT_LOG_RETENTION_DAYS = int(os.getenv('MENTORSHIP_AUDIT_RETENTION_DAYS', 2555))
        
        # LGPD/GDPR
        GDPR_COMPLIANCE = os.getenv('MENTORSHIP_GDPR_COMPLIANCE', 'true').lower() == 'true'
        DATA_ANONYMIZATION_ENABLED = os.getenv('MENTORSHIP_DATA_ANONYMIZATION', 'true').lower() == 'true'
        
        # Backup
        BACKUP_ENABLED = os.getenv('MENTORSHIP_BACKUP_ENABLED', 'true').lower() == 'true'
        BACKUP_INTERVAL_HOURS = int(os.getenv('MENTORSHIP_BACKUP_INTERVAL_HOURS', 24))
        BACKUP_RETENTION_DAYS = int(os.getenv('MENTORSHIP_BACKUP_RETENTION_DAYS', 90))
    
    @classmethod
    def get_current_limits(cls) -> TierLimits:
        """Retorna os limites do tier atual."""
        return cls.TIER_LIMITS[cls.CURRENT_TIER]
    
    @classmethod
    def can_create_intern(cls, current_count: int) -> bool:
        """Verifica se é possível criar um novo estagiário."""
        limits = cls.get_current_limits()
        return limits.interns == -1 or current_count < limits.interns
    
    @classmethod
    def can_create_case(cls, current_count: int) -> bool:
        """Verifica se é possível criar um novo caso clínico."""
        limits = cls.get_current_limits()
        return limits.cases == -1 or current_count < limits.cases
    
    @classmethod
    def can_upload_resource(cls, current_count: int, file_size: int) -> tuple[bool, str]:
        """Verifica se é possível fazer upload de um recurso."""
        limits = cls.get_current_limits()
        
        # Verifica limite de quantidade
        if limits.resources != -1 and current_count >= limits.resources:
            return False, "Limite de recursos atingido para seu plano"
        
        # Verifica limite de armazenamento
        if limits.storage_bytes != -1 and file_size > limits.storage_bytes:
            return False, "Arquivo excede o limite de armazenamento do seu plano"
        
        return True, "OK"
    
    @classmethod
    def can_schedule_session(cls, current_month_count: int) -> bool:
        """Verifica se é possível agendar uma nova sessão de mentoria."""
        limits = cls.get_current_limits()
        return limits.sessions == -1 or current_month_count < limits.sessions
    
    @classmethod
    def get_feature_availability(cls) -> Dict[str, bool]:
        """Retorna a disponibilidade de features para o tier atual."""
        limits = cls.get_current_limits()
        return {
            'export_reports': limits.export_reports,
            'priority_support': limits.priority_support,
            'advanced_analytics': limits.advanced_analytics,
            'white_label': limits.white_label,
            'custom_competencies': limits.custom_competencies > 0,
            'video_sessions': limits.video_sessions_per_month > 0,
            'ai_assistance': limits.ai_requests_per_month > 0
        }
    
    @classmethod
    def get_ios_config(cls) -> Dict[str, Any]:
        """Retorna configurações específicas para iOS."""
        return {
            'offline_mode': cls.iOS.OFFLINE_MODE_ENABLED,
            'sync_interval': cls.iOS.SYNC_INTERVAL_MINUTES,
            'push_notifications': cls.iOS.PUSH_NOTIFICATIONS_ENABLED,
            'cache_size_mb': cls.iOS.LOCAL_CACHE_SIZE_MB,
            'cache_expiry_hours': cls.iOS.CACHE_EXPIRY_HOURS,
            'image_quality': cls.iOS.IMAGE_COMPRESSION_QUALITY,
            'video_bitrate': cls.iOS.VIDEO_COMPRESSION_BITRATE,
            'request_timeout': cls.iOS.REQUEST_TIMEOUT_SECONDS,
            'max_downloads': cls.iOS.MAX_CONCURRENT_DOWNLOADS,
            'offline_resources': cls.iOS.OFFLINE_RESOURCES_BY_TIER[cls.CURRENT_TIER]
        }
    
    @classmethod
    def upgrade_tier(cls, new_tier: MentorshipTier) -> bool:
        """Simula upgrade de tier (em produção seria integrado com sistema de pagamento)."""
        if new_tier.value in [tier.value for tier in MentorshipTier]:
            cls.CURRENT_TIER = new_tier
            return True
        return False


# Configurações de preços (para referência)
TIER_PRICING = {
    MentorshipTier.FREE: {
        'monthly_price': 0,
        'yearly_price': 0,
        'currency': 'BRL'
    },
    MentorshipTier.PREMIUM: {
        'monthly_price': 99.90,
        'yearly_price': 999.00,
        'currency': 'BRL'
    },
    MentorshipTier.ENTERPRISE: {
        'monthly_price': 299.90,
        'yearly_price': 2999.00,
        'currency': 'BRL'
    }
}


# Configurações de notificações push para iOS
PUSH_NOTIFICATION_TEMPLATES = {
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