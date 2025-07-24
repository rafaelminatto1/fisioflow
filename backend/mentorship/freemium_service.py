# -*- coding: utf-8 -*-
"""
Serviço Freemium para Módulo de Mentoria

Este módulo gerencia o sistema freemium, incluindo validações de limites,
upgrades de tier, métricas de uso e integridade de dados.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from enum import Enum
from flask import current_app
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session

from .config import MentorshipConfig, MentorshipTier, TierLimits, TIER_PRICING
from .models import (
    Intern, Competency, EducationalCase, EducationalResource,
    MentorshipSession, StudyPlan, User, db
)


@dataclass
class UsageMetrics:
    """Métricas de uso do sistema."""
    user_id: str
    tier: str
    period_start: datetime
    period_end: datetime
    interns_count: int
    cases_count: int
    resources_count: int
    sessions_count: int
    storage_used_bytes: int
    ai_requests_count: int
    video_sessions_count: int
    custom_competencies_count: int
    last_activity: datetime


@dataclass
class TierValidationResult:
    """Resultado da validação de tier."""
    is_valid: bool
    current_usage: Dict[str, int]
    limits: Dict[str, int]
    exceeded_limits: List[str]
    recommendations: List[str]
    upgrade_required: bool


class FreemiumService:
    """Serviço para gerenciar o sistema freemium."""
    
    def __init__(self, db_session: Optional[Session] = None):
        self.db = db_session or db.session
        self.config = MentorshipConfig()
    
    def get_user_usage_metrics(self, user_id: str, period_days: int = 30) -> UsageMetrics:
        """
        Calcula métricas de uso do usuário.
        
        Args:
            user_id: ID do usuário
            period_days: Período em dias para calcular métricas
        
        Returns:
            Métricas de uso
        """
        period_start = datetime.now() - timedelta(days=period_days)
        period_end = datetime.now()
        
        # Busca dados do usuário
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"Usuário {user_id} não encontrado")
        
        # Conta estagiários
        interns_count = self.db.query(Intern).filter(
            and_(
                Intern.mentor_id == user_id,
                Intern.created_at >= period_start
            )
        ).count()
        
        # Conta casos clínicos
        cases_count = self.db.query(EducationalCase).filter(
            and_(
                EducationalCase.created_by == user_id,
                EducationalCase.created_at >= period_start
            )
        ).count()
        
        # Conta recursos educacionais
        resources_count = self.db.query(EducationalResource).filter(
            and_(
                EducationalResource.uploaded_by == user_id,
                EducationalResource.created_at >= period_start
            )
        ).count()
        
        # Conta sessões de mentoria
        sessions_count = self.db.query(MentorshipSession).filter(
            and_(
                MentorshipSession.mentor_id == user_id,
                MentorshipSession.scheduled_at >= period_start
            )
        ).count()
        
        # Calcula armazenamento usado
        storage_used = self.db.query(
            func.sum(EducationalResource.file_size)
        ).filter(
            EducationalResource.uploaded_by == user_id
        ).scalar() or 0
        
        # Conta competências customizadas
        custom_competencies_count = self.db.query(Competency).filter(
            and_(
                Competency.created_by == user_id,
                Competency.is_custom == True
            )
        ).count()
        
        # Última atividade
        last_activity = self.db.query(
            func.max(MentorshipSession.updated_at)
        ).filter(
            MentorshipSession.mentor_id == user_id
        ).scalar() or datetime.now()
        
        return UsageMetrics(
            user_id=user_id,
            tier=user.tier or 'free',
            period_start=period_start,
            period_end=period_end,
            interns_count=interns_count,
            cases_count=cases_count,
            resources_count=resources_count,
            sessions_count=sessions_count,
            storage_used_bytes=int(storage_used),
            ai_requests_count=0,  # Implementar tracking de IA
            video_sessions_count=0,  # Implementar tracking de vídeo
            custom_competencies_count=custom_competencies_count,
            last_activity=last_activity
        )
    
    def validate_tier_limits(self, user_id: str) -> TierValidationResult:
        """
        Valida se o usuário está dentro dos limites do seu tier.
        
        Args:
            user_id: ID do usuário
        
        Returns:
            Resultado da validação
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError(f"Usuário {user_id} não encontrado")
        
        current_tier = MentorshipTier(user.tier or 'free')
        limits = self.config.TIER_LIMITS[current_tier]
        metrics = self.get_user_usage_metrics(user_id)
        
        # Verifica cada limite
        current_usage = {
            'interns': metrics.interns_count,
            'cases': metrics.cases_count,
            'resources': metrics.resources_count,
            'sessions': metrics.sessions_count,
            'storage_bytes': metrics.storage_used_bytes,
            'custom_competencies': metrics.custom_competencies_count
        }
        
        tier_limits = {
            'interns': limits.interns,
            'cases': limits.cases,
            'resources': limits.resources,
            'sessions': limits.sessions,
            'storage_bytes': limits.storage_bytes,
            'custom_competencies': limits.custom_competencies
        }
        
        exceeded_limits = []
        recommendations = []
        
        for limit_name, current_value in current_usage.items():
            limit_value = tier_limits[limit_name]
            
            if limit_value != -1 and current_value >= limit_value:
                exceeded_limits.append(limit_name)
                
                # Adiciona recomendações específicas
                if limit_name == 'storage_bytes':
                    recommendations.append(
                        f"Armazenamento excedido ({current_value / 1024 / 1024:.1f}MB / {limit_value / 1024 / 1024:.1f}MB). "
                        "Considere remover recursos antigos ou fazer upgrade."
                    )
                else:
                    recommendations.append(
                        f"Limite de {limit_name} atingido ({current_value}/{limit_value}). "
                        "Faça upgrade para continuar adicionando."
                    )
        
        # Verifica se está próximo dos limites (80%)
        for limit_name, current_value in current_usage.items():
            limit_value = tier_limits[limit_name]
            
            if limit_value != -1 and current_value >= (limit_value * 0.8) and limit_name not in exceeded_limits:
                recommendations.append(
                    f"Você está próximo do limite de {limit_name} ({current_value}/{limit_value}). "
                    "Considere fazer upgrade em breve."
                )
        
        return TierValidationResult(
            is_valid=len(exceeded_limits) == 0,
            current_usage=current_usage,
            limits=tier_limits,
            exceeded_limits=exceeded_limits,
            recommendations=recommendations,
            upgrade_required=len(exceeded_limits) > 0
        )
    
    def can_perform_action(self, user_id: str, action: str, **kwargs) -> Tuple[bool, str]:
        """
        Verifica se o usuário pode realizar uma ação específica.
        
        Args:
            user_id: ID do usuário
            action: Ação a ser verificada
            **kwargs: Parâmetros adicionais
        
        Returns:
            Tuple com (pode_realizar, mensagem)
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return False, "Usuário não encontrado"
        
        current_tier = MentorshipTier(user.tier or 'free')
        limits = self.config.TIER_LIMITS[current_tier]
        
        if action == 'create_intern':
            current_count = self.db.query(Intern).filter(Intern.mentor_id == user_id).count()
            if limits.interns != -1 and current_count >= limits.interns:
                return False, f"Limite de estagiários atingido ({current_count}/{limits.interns}). Faça upgrade para adicionar mais."
        
        elif action == 'create_case':
            current_count = self.db.query(EducationalCase).filter(EducationalCase.created_by == user_id).count()
            if limits.cases != -1 and current_count >= limits.cases:
                return False, f"Limite de casos clínicos atingido ({current_count}/{limits.cases}). Faça upgrade para adicionar mais."
        
        elif action == 'upload_resource':
            file_size = kwargs.get('file_size', 0)
            current_count = self.db.query(EducationalResource).filter(EducationalResource.uploaded_by == user_id).count()
            current_storage = self.db.query(func.sum(EducationalResource.file_size)).filter(
                EducationalResource.uploaded_by == user_id
            ).scalar() or 0
            
            if limits.resources != -1 and current_count >= limits.resources:
                return False, f"Limite de recursos atingido ({current_count}/{limits.resources}). Faça upgrade para adicionar mais."
            
            if limits.storage_bytes != -1 and (current_storage + file_size) > limits.storage_bytes:
                return False, f"Limite de armazenamento excedido. Faça upgrade ou remova recursos antigos."
        
        elif action == 'schedule_session':
            # Conta sessões do mês atual
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_count = self.db.query(MentorshipSession).filter(
                and_(
                    MentorshipSession.mentor_id == user_id,
                    MentorshipSession.scheduled_at >= month_start
                )
            ).count()
            
            if limits.sessions != -1 and current_count >= limits.sessions:
                return False, f"Limite de sessões mensais atingido ({current_count}/{limits.sessions}). Faça upgrade para agendar mais."
        
        elif action == 'create_custom_competency':
            current_count = self.db.query(Competency).filter(
                and_(
                    Competency.created_by == user_id,
                    Competency.is_custom == True
                )
            ).count()
            
            if limits.custom_competencies != -1 and current_count >= limits.custom_competencies:
                return False, f"Limite de competências customizadas atingido ({current_count}/{limits.custom_competencies}). Faça upgrade para criar mais."
        
        elif action == 'export_report':
            if not limits.export_reports:
                return False, "Exportação de relatórios não disponível no seu plano. Faça upgrade para acessar esta funcionalidade."
        
        elif action == 'use_ai':
            # Implementar tracking de uso de IA
            if limits.ai_requests_per_month == 0:
                return False, "Assistência de IA não disponível no seu plano. Faça upgrade para acessar esta funcionalidade."
        
        return True, "Ação permitida"
    
    def get_upgrade_recommendations(self, user_id: str) -> Dict[str, Any]:
        """
        Gera recomendações de upgrade baseadas no uso.
        
        Args:
            user_id: ID do usuário
        
        Returns:
            Dicionário com recomendações
        """
        validation = self.validate_tier_limits(user_id)
        metrics = self.get_user_usage_metrics(user_id)
        
        current_tier = MentorshipTier(metrics.tier)
        
        recommendations = {
            'current_tier': current_tier.value,
            'needs_upgrade': validation.upgrade_required,
            'exceeded_limits': validation.exceeded_limits,
            'usage_percentage': {},
            'suggested_tier': None,
            'benefits': [],
            'pricing': {}
        }
        
        # Calcula porcentagem de uso
        for limit_name, current_value in validation.current_usage.items():
            limit_value = validation.limits[limit_name]
            if limit_value != -1:
                percentage = (current_value / limit_value) * 100
                recommendations['usage_percentage'][limit_name] = min(100, percentage)
            else:
                recommendations['usage_percentage'][limit_name] = 0
        
        # Sugere tier baseado no uso
        if current_tier == MentorshipTier.FREE:
            if validation.upgrade_required or any(p > 80 for p in recommendations['usage_percentage'].values()):
                recommendations['suggested_tier'] = MentorshipTier.PREMIUM.value
                recommendations['benefits'] = [
                    "50 estagiários (vs 5 atual)",
                    "100 casos clínicos (vs 10 atual)",
                    "Recursos ilimitados (vs 20 atual)",
                    "50 sessões mensais (vs 5 atual)",
                    "10GB de armazenamento (vs 1GB atual)",
                    "Exportação de relatórios",
                    "Suporte prioritário",
                    "Analytics avançados"
                ]
        
        elif current_tier == MentorshipTier.PREMIUM:
            if validation.upgrade_required:
                recommendations['suggested_tier'] = MentorshipTier.ENTERPRISE.value
                recommendations['benefits'] = [
                    "Estagiários ilimitados",
                    "Casos clínicos ilimitados",
                    "Recursos ilimitados",
                    "Sessões ilimitadas",
                    "Armazenamento ilimitado",
                    "White label",
                    "Competências customizadas ilimitadas",
                    "Suporte dedicado"
                ]
        
        # Adiciona informações de preço
        if recommendations['suggested_tier']:
            suggested_tier_enum = MentorshipTier(recommendations['suggested_tier'])
            recommendations['pricing'] = TIER_PRICING[suggested_tier_enum]
        
        return recommendations
    
    def simulate_tier_upgrade(self, user_id: str, target_tier: str) -> Dict[str, Any]:
        """
        Simula um upgrade de tier.
        
        Args:
            user_id: ID do usuário
            target_tier: Tier de destino
        
        Returns:
            Resultado da simulação
        """
        try:
            target_tier_enum = MentorshipTier(target_tier)
        except ValueError:
            return {'success': False, 'error': 'Tier inválido'}
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {'success': False, 'error': 'Usuário não encontrado'}
        
        current_tier = MentorshipTier(user.tier or 'free')
        current_limits = self.config.TIER_LIMITS[current_tier]
        target_limits = self.config.TIER_LIMITS[target_tier_enum]
        
        metrics = self.get_user_usage_metrics(user_id)
        
        # Calcula benefícios do upgrade
        benefits = []
        
        if target_limits.interns > current_limits.interns or target_limits.interns == -1:
            if target_limits.interns == -1:
                benefits.append("Estagiários: Ilimitados")
            else:
                benefits.append(f"Estagiários: {target_limits.interns} (vs {current_limits.interns} atual)")
        
        if target_limits.cases > current_limits.cases or target_limits.cases == -1:
            if target_limits.cases == -1:
                benefits.append("Casos clínicos: Ilimitados")
            else:
                benefits.append(f"Casos clínicos: {target_limits.cases} (vs {current_limits.cases} atual)")
        
        if target_limits.storage_bytes > current_limits.storage_bytes or target_limits.storage_bytes == -1:
            if target_limits.storage_bytes == -1:
                benefits.append("Armazenamento: Ilimitado")
            else:
                target_gb = target_limits.storage_bytes / 1024 / 1024 / 1024
                current_gb = current_limits.storage_bytes / 1024 / 1024 / 1024
                benefits.append(f"Armazenamento: {target_gb:.0f}GB (vs {current_gb:.0f}GB atual)")
        
        # Funcionalidades exclusivas
        if target_limits.export_reports and not current_limits.export_reports:
            benefits.append("Exportação de relatórios")
        
        if target_limits.priority_support and not current_limits.priority_support:
            benefits.append("Suporte prioritário")
        
        if target_limits.advanced_analytics and not current_limits.advanced_analytics:
            benefits.append("Analytics avançados")
        
        if target_limits.white_label and not current_limits.white_label:
            benefits.append("White label")
        
        return {
            'success': True,
            'current_tier': current_tier.value,
            'target_tier': target_tier,
            'benefits': benefits,
            'pricing': TIER_PRICING[target_tier_enum],
            'current_usage': asdict(metrics),
            'new_limits': asdict(target_limits)
        }
    
    def process_tier_upgrade(self, user_id: str, target_tier: str, payment_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa um upgrade de tier (simulação).
        
        Args:
            user_id: ID do usuário
            target_tier: Tier de destino
            payment_info: Informações de pagamento
        
        Returns:
            Resultado do processamento
        """
        try:
            target_tier_enum = MentorshipTier(target_tier)
        except ValueError:
            return {'success': False, 'error': 'Tier inválido'}
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return {'success': False, 'error': 'Usuário não encontrado'}
        
        # Em produção, aqui seria integrado com gateway de pagamento
        # Por enquanto, apenas simula o upgrade
        
        try:
            # Atualiza tier do usuário
            user.tier = target_tier
            user.tier_upgraded_at = datetime.now()
            
            # Registra histórico de upgrade (implementar tabela de histórico)
            upgrade_record = {
                'user_id': user_id,
                'from_tier': user.tier,
                'to_tier': target_tier,
                'upgraded_at': datetime.now(),
                'payment_info': payment_info  # Em produção, não armazenar dados sensíveis
            }
            
            self.db.commit()
            
            return {
                'success': True,
                'message': f'Upgrade para {target_tier} realizado com sucesso!',
                'new_tier': target_tier,
                'upgrade_record': upgrade_record
            }
        
        except Exception as e:
            self.db.rollback()
            current_app.logger.error(f"Erro ao processar upgrade: {str(e)}")
            return {
                'success': False,
                'error': 'Erro interno ao processar upgrade'
            }
    
    def get_tier_comparison(self) -> Dict[str, Any]:
        """
        Retorna comparação entre todos os tiers.
        
        Returns:
            Dicionário com comparação de tiers
        """
        comparison = {
            'tiers': {},
            'features': [
                'interns', 'cases', 'resources', 'sessions', 'storage_gb',
                'ai_requests', 'video_sessions', 'custom_competencies',
                'export_reports', 'priority_support', 'advanced_analytics', 'white_label'
            ]
        }
        
        for tier, limits in self.config.TIER_LIMITS.items():
            comparison['tiers'][tier.value] = {
                'name': tier.value.title(),
                'pricing': TIER_PRICING[tier],
                'limits': {
                    'interns': 'Ilimitado' if limits.interns == -1 else limits.interns,
                    'cases': 'Ilimitado' if limits.cases == -1 else limits.cases,
                    'resources': 'Ilimitado' if limits.resources == -1 else limits.resources,
                    'sessions': 'Ilimitado' if limits.sessions == -1 else limits.sessions,
                    'storage_gb': 'Ilimitado' if limits.storage_bytes == -1 else f"{limits.storage_bytes / 1024 / 1024 / 1024:.0f}GB",
                    'ai_requests': 'Ilimitado' if limits.ai_requests_per_month == -1 else limits.ai_requests_per_month,
                    'video_sessions': 'Ilimitado' if limits.video_sessions_per_month == -1 else limits.video_sessions_per_month,
                    'custom_competencies': 'Ilimitado' if limits.custom_competencies == -1 else limits.custom_competencies,
                    'export_reports': '✓' if limits.export_reports else '✗',
                    'priority_support': '✓' if limits.priority_support else '✗',
                    'advanced_analytics': '✓' if limits.advanced_analytics else '✗',
                    'white_label': '✓' if limits.white_label else '✗'
                }
            }
        
        return comparison
    
    def generate_usage_report(self, user_id: str, period_days: int = 30) -> Dict[str, Any]:
        """
        Gera relatório detalhado de uso.
        
        Args:
            user_id: ID do usuário
            period_days: Período em dias
        
        Returns:
            Relatório de uso
        """
        metrics = self.get_user_usage_metrics(user_id, period_days)
        validation = self.validate_tier_limits(user_id)
        recommendations = self.get_upgrade_recommendations(user_id)
        
        return {
            'user_id': user_id,
            'period': {
                'start': metrics.period_start.isoformat(),
                'end': metrics.period_end.isoformat(),
                'days': period_days
            },
            'current_tier': metrics.tier,
            'usage_metrics': asdict(metrics),
            'tier_validation': asdict(validation),
            'upgrade_recommendations': recommendations,
            'generated_at': datetime.now().isoformat()
        }