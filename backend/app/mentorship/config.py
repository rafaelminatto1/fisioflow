from datetime import timedelta

class MentorshipConfig:
    """Configurações específicas do módulo de mentoria"""
    
    # Configurações de paginação
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100
    
    # Configurações de competências
    DEFAULT_COMPETENCY_HOURS = 40
    MAX_PROGRESS_PERCENTAGE = 100.0
    MIN_PASSING_GRADE = 7.0
    
    # Configurações de casos clínicos
    DEFAULT_CASE_TIME_MINUTES = 60
    MAX_CASE_TIME_MINUTES = 240
    
    # Configurações de recursos educacionais
    ALLOWED_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.mp4', '.avi', '.mov']
    MAX_FILE_SIZE_MB = 100
    
    # Configurações de sessões de mentoria
    DEFAULT_SESSION_DURATION = 60  # minutos
    MIN_SESSION_DURATION = 30
    MAX_SESSION_DURATION = 180
    
    # Configurações de planos de estudo
    MIN_STUDY_PLAN_DURATION = timedelta(weeks=4)
    MAX_STUDY_PLAN_DURATION = timedelta(weeks=52)
    
    # Configurações de rating
    MIN_RATING = 1.0
    MAX_RATING = 5.0
    
    # Configurações de cache (se aplicável)
    DASHBOARD_CACHE_TIMEOUT = 300  # 5 minutos
    STATS_CACHE_TIMEOUT = 600  # 10 minutos
    
    # Configurações de notificações
    NOTIFY_COMPETENCY_COMPLETION = True
    NOTIFY_CASE_SUBMISSION = True
    NOTIFY_SESSION_REMINDER = True
    
    # Configurações de sistema freemium
    FREE_TIER_LIMITS = {
        'max_interns': 5,
        'max_cases_per_month': 10,
        'max_resources_access': 20,
        'max_mentorship_sessions': 2
    }
    
    PREMIUM_TIER_LIMITS = {
        'max_interns': 50,
        'max_cases_per_month': 100,
        'max_resources_access': -1,  # ilimitado
        'max_mentorship_sessions': 20
    }
    
    ENTERPRISE_TIER_LIMITS = {
        'max_interns': -1,  # ilimitado
        'max_cases_per_month': -1,  # ilimitado
        'max_resources_access': -1,  # ilimitado
        'max_mentorship_sessions': -1  # ilimitado
    }
    
    # Configurações de escalabilidade
    ENABLE_ASYNC_PROCESSING = True
    ENABLE_CACHING = True
    ENABLE_RATE_LIMITING = True
    
    # Rate limiting (requests por minuto)
    RATE_LIMITS = {
        'dashboard': 30,
        'interns': 60,
        'cases': 100,
        'resources': 100,
        'analysis_submission': 10
    }
    
    @classmethod
    def get_tier_limits(cls, tier='free'):
        """Retorna os limites baseados no tier do usuário"""
        tier_map = {
            'free': cls.FREE_TIER_LIMITS,
            'premium': cls.PREMIUM_TIER_LIMITS,
            'enterprise': cls.ENTERPRISE_TIER_LIMITS
        }
        return tier_map.get(tier.lower(), cls.FREE_TIER_LIMITS)
    
    @classmethod
    def validate_file_upload(cls, filename, file_size_mb):
        """Valida upload de arquivo"""
        import os
        
        # Verificar extensão
        _, ext = os.path.splitext(filename.lower())
        if ext not in cls.ALLOWED_FILE_EXTENSIONS:
            return False, f"Extensão {ext} não permitida"
        
        # Verificar tamanho
        if file_size_mb > cls.MAX_FILE_SIZE_MB:
            return False, f"Arquivo muito grande. Máximo: {cls.MAX_FILE_SIZE_MB}MB"
        
        return True, "Arquivo válido"
    
    @classmethod
    def calculate_study_plan_duration(cls, competency_count, hours_per_week=10):
        """Calcula duração sugerida para plano de estudo"""
        if competency_count <= 0 or hours_per_week <= 0:
            return cls.MIN_STUDY_PLAN_DURATION
        
        # Estimar horas totais (assumindo média de 40h por competência)
        total_hours = competency_count * cls.DEFAULT_COMPETENCY_HOURS
        weeks_needed = max(4, total_hours // hours_per_week)
        
        duration = timedelta(weeks=weeks_needed)
        
        # Aplicar limites
        if duration < cls.MIN_STUDY_PLAN_DURATION:
            return cls.MIN_STUDY_PLAN_DURATION
        elif duration > cls.MAX_STUDY_PLAN_DURATION:
            return cls.MAX_STUDY_PLAN_DURATION
        
        return duration

# Configurações específicas para iOS (se aplicável)
class iOSMentorshipConfig(MentorshipConfig):
    """Configurações otimizadas para aplicativo iOS"""
    
    # Configurações de sincronização offline
    ENABLE_OFFLINE_MODE = True
    SYNC_INTERVAL_MINUTES = 15
    MAX_OFFLINE_STORAGE_MB = 50
    
    # Configurações de notificações push
    PUSH_NOTIFICATIONS = {
        'competency_reminder': True,
        'session_reminder': True,
        'case_deadline': True,
        'mentor_feedback': True
    }
    
    # Configurações de interface
    PAGINATION_SIZE_MOBILE = 10  # Menor para mobile
    IMAGE_COMPRESSION_QUALITY = 0.8
    VIDEO_MAX_DURATION_SECONDS = 300  # 5 minutos
    
    # Configurações de performance
    LAZY_LOADING = True
    PREFETCH_NEXT_PAGE = True
    CACHE_IMAGES = True