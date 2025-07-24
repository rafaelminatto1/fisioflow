# -*- coding: utf-8 -*-
"""
Testes para Sistema Freemium e Funcionalidades iOS

Este módulo contém testes abrangentes para validar o sistema freemium,
limites de tier, funcionalidades iOS e integridade de dados.
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from flask_testing import TestCase

from backend.mentorship.config import MentorshipConfig, MentorshipTier
from backend.mentorship.freemium_service import FreemiumService, UsageMetrics
from backend.mentorship.ios_utils import iOSOptimizer, PushNotificationManager
from backend.mentorship.middleware import FreemiumMiddleware, require_tier, require_feature
from backend.mentorship.models import User, Intern, EducationalCase, EducationalResource


class FreemiumSystemTestCase(TestCase):
    """Classe base para testes do sistema freemium."""
    
    def create_app(self):
        """Cria aplicação Flask para testes."""
        app = Flask(__name__)
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['REDIS_URL'] = 'redis://localhost:6379/15'  # DB de teste
        app.config['JWT_SECRET_KEY'] = 'test-secret'
        
        return app
    
    def setUp(self):
        """Configuração inicial para cada teste."""
        self.freemium_service = FreemiumService()
        self.ios_optimizer = iOSOptimizer()
        self.push_manager = PushNotificationManager()
        
        # Mock do banco de dados
        self.mock_db = Mock()
        self.mock_session = Mock()
        self.mock_db.session = self.mock_session
        
        # Usuários de teste
        self.free_user = Mock()
        self.free_user.id = 'user_free_123'
        self.free_user.tier = 'free'
        self.free_user.email = 'free@test.com'
        
        self.premium_user = Mock()
        self.premium_user.id = 'user_premium_456'
        self.premium_user.tier = 'premium'
        self.premium_user.email = 'premium@test.com'
        
        self.enterprise_user = Mock()
        self.enterprise_user.id = 'user_enterprise_789'
        self.enterprise_user.tier = 'enterprise'
        self.enterprise_user.email = 'enterprise@test.com'


class TestMentorshipConfig(FreemiumSystemTestCase):
    """Testes para configuração do módulo de mentoria."""
    
    def test_tier_limits_configuration(self):
        """Testa se os limites de tier estão configurados corretamente."""
        config = MentorshipConfig()
        
        # Testa tier FREE
        free_limits = config.TIER_LIMITS[MentorshipTier.FREE]
        self.assertEqual(free_limits.interns, 5)
        self.assertEqual(free_limits.cases, 10)
        self.assertEqual(free_limits.resources, 20)
        self.assertFalse(free_limits.export_reports)
        self.assertFalse(free_limits.priority_support)
        
        # Testa tier PREMIUM
        premium_limits = config.TIER_LIMITS[MentorshipTier.PREMIUM]
        self.assertEqual(premium_limits.interns, 50)
        self.assertEqual(premium_limits.cases, 100)
        self.assertEqual(premium_limits.resources, -1)  # Ilimitado
        self.assertTrue(premium_limits.export_reports)
        self.assertTrue(premium_limits.priority_support)
        
        # Testa tier ENTERPRISE
        enterprise_limits = config.TIER_LIMITS[MentorshipTier.ENTERPRISE]
        self.assertEqual(enterprise_limits.interns, -1)  # Ilimitado
        self.assertEqual(enterprise_limits.cases, -1)  # Ilimitado
        self.assertTrue(enterprise_limits.white_label)
    
    def test_ios_configuration(self):
        """Testa configurações específicas para iOS."""
        config = MentorshipConfig.get_ios_config()
        
        self.assertIn('offline_mode', config)
        self.assertIn('sync_interval', config)
        self.assertIn('push_notifications', config)
        self.assertIn('cache_size_mb', config)
        self.assertIn('offline_resources', config)
        
        # Verifica recursos offline por tier
        offline_resources = config['offline_resources']
        self.assertIsInstance(offline_resources, dict)
        self.assertIn('cases', offline_resources)
        self.assertIn('resources', offline_resources)
    
    def test_feature_availability(self):
        """Testa disponibilidade de features por tier."""
        config = MentorshipConfig()
        
        # Simula tier FREE
        config.CURRENT_TIER = MentorshipTier.FREE
        features = config.get_feature_availability()
        
        self.assertFalse(features['export_reports'])
        self.assertFalse(features['priority_support'])
        self.assertFalse(features['white_label'])
        
        # Simula tier PREMIUM
        config.CURRENT_TIER = MentorshipTier.PREMIUM
        features = config.get_feature_availability()
        
        self.assertTrue(features['export_reports'])
        self.assertTrue(features['priority_support'])
        self.assertFalse(features['white_label'])  # Apenas Enterprise


class TestFreemiumService(FreemiumSystemTestCase):
    """Testes para o serviço freemium."""
    
    @patch('backend.mentorship.freemium_service.db')
    def test_usage_metrics_calculation(self, mock_db):
        """Testa cálculo de métricas de uso."""
        # Mock das queries
        mock_db.session.query.return_value.filter.return_value.count.return_value = 5
        mock_db.session.query.return_value.filter.return_value.scalar.return_value = 1024000
        
        # Mock do usuário
        mock_user = Mock()
        mock_user.id = 'test_user'
        mock_user.tier = 'premium'
        mock_db.session.query.return_value.filter.return_value.first.return_value = mock_user
        
        service = FreemiumService(mock_db.session)
        metrics = service.get_user_usage_metrics('test_user')
        
        self.assertIsInstance(metrics, UsageMetrics)
        self.assertEqual(metrics.user_id, 'test_user')
        self.assertEqual(metrics.tier, 'premium')
        self.assertIsInstance(metrics.period_start, datetime)
        self.assertIsInstance(metrics.period_end, datetime)
    
    @patch('backend.mentorship.freemium_service.db')
    def test_tier_validation_free_user(self, mock_db):
        """Testa validação de limites para usuário FREE."""
        # Mock do usuário FREE
        mock_user = Mock()
        mock_user.id = 'free_user'
        mock_user.tier = 'free'
        mock_db.session.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock das contagens (excedendo limites)
        mock_db.session.query.return_value.filter.return_value.count.return_value = 10  # Excede limite de 5
        mock_db.session.query.return_value.filter.return_value.scalar.return_value = 2147483648  # 2GB, excede 1GB
        
        service = FreemiumService(mock_db.session)
        validation = service.validate_tier_limits('free_user')
        
        self.assertFalse(validation.is_valid)
        self.assertTrue(validation.upgrade_required)
        self.assertGreater(len(validation.exceeded_limits), 0)
        self.assertGreater(len(validation.recommendations), 0)
    
    @patch('backend.mentorship.freemium_service.db')
    def test_can_perform_action_validation(self, mock_db):
        """Testa validação de ações específicas."""
        # Mock do usuário FREE
        mock_user = Mock()
        mock_user.id = 'free_user'
        mock_user.tier = 'free'
        mock_db.session.query.return_value.filter.return_value.first.return_value = mock_user
        
        service = FreemiumService(mock_db.session)
        
        # Testa criação de estagiário quando já no limite
        mock_db.session.query.return_value.filter.return_value.count.return_value = 5  # Limite FREE
        can_create, message = service.can_perform_action('free_user', 'create_intern')
        
        self.assertFalse(can_create)
        self.assertIn('Limite de estagiários atingido', message)
        
        # Testa upload de arquivo muito grande
        mock_db.session.query.return_value.filter.return_value.count.return_value = 1
        mock_db.session.query.return_value.filter.return_value.scalar.return_value = 1073741824  # 1GB usado
        
        can_upload, message = service.can_perform_action(
            'free_user', 'upload_resource', file_size=1073741824  # Mais 1GB
        )
        
        self.assertFalse(can_upload)
        self.assertIn('armazenamento', message.lower())
    
    @patch('backend.mentorship.freemium_service.db')
    def test_upgrade_recommendations(self, mock_db):
        """Testa geração de recomendações de upgrade."""
        # Mock do usuário FREE próximo dos limites
        mock_user = Mock()
        mock_user.id = 'free_user'
        mock_user.tier = 'free'
        mock_db.session.query.return_value.filter.return_value.first.return_value = mock_user
        
        # Mock de uso próximo ao limite (4 de 5 estagiários)
        mock_db.session.query.return_value.filter.return_value.count.return_value = 4
        mock_db.session.query.return_value.filter.return_value.scalar.return_value = 858993459  # ~800MB de 1GB
        
        service = FreemiumService(mock_db.session)
        recommendations = service.get_upgrade_recommendations('free_user')
        
        self.assertEqual(recommendations['current_tier'], 'free')
        self.assertEqual(recommendations['suggested_tier'], 'premium')
        self.assertGreater(len(recommendations['benefits']), 0)
        self.assertIn('pricing', recommendations)
    
    @patch('backend.mentorship.freemium_service.db')
    def test_tier_upgrade_simulation(self, mock_db):
        """Testa simulação de upgrade de tier."""
        # Mock do usuário FREE
        mock_user = Mock()
        mock_user.id = 'free_user'
        mock_user.tier = 'free'
        mock_db.session.query.return_value.filter.return_value.first.return_value = mock_user
        
        service = FreemiumService(mock_db.session)
        simulation = service.simulate_tier_upgrade('free_user', 'premium')
        
        self.assertTrue(simulation['success'])
        self.assertEqual(simulation['current_tier'], 'free')
        self.assertEqual(simulation['target_tier'], 'premium')
        self.assertGreater(len(simulation['benefits']), 0)
        self.assertIn('pricing', simulation)
        self.assertIn('new_limits', simulation)


class TestiOSOptimizer(FreemiumSystemTestCase):
    """Testes para otimizações iOS."""
    
    def test_checksum_calculation(self):
        """Testa cálculo de checksum para integridade de dados."""
        optimizer = iOSOptimizer()
        
        # Testa com dicionário
        data1 = {'id': 1, 'name': 'Test', 'value': 123}
        data2 = {'value': 123, 'id': 1, 'name': 'Test'}  # Mesmos dados, ordem diferente
        
        checksum1 = optimizer.calculate_checksum(data1)
        checksum2 = optimizer.calculate_checksum(data2)
        
        self.assertEqual(checksum1, checksum2)  # Deve ser igual independente da ordem
        self.assertEqual(len(checksum1), 32)  # MD5 tem 32 caracteres
        
        # Testa com dados diferentes
        data3 = {'id': 2, 'name': 'Test', 'value': 123}
        checksum3 = optimizer.calculate_checksum(data3)
        
        self.assertNotEqual(checksum1, checksum3)
    
    @patch('redis.from_url')
    def test_offline_data_storage(self, mock_redis):
        """Testa armazenamento de dados offline."""
        mock_redis_client = Mock()
        mock_redis.return_value = mock_redis_client
        
        optimizer = iOSOptimizer(mock_redis_client)
        
        # Dados de teste
        test_entities = [
            {'id': 1, 'title': 'Caso 1', 'type': 'case'},
            {'id': 2, 'title': 'Caso 2', 'type': 'case'}
        ]
        
        sync_data_list = optimizer.prepare_offline_data('user123', 'cases', test_entities)
        
        self.assertEqual(len(sync_data_list), 2)
        self.assertEqual(sync_data_list[0].entity_type, 'cases')
        self.assertEqual(sync_data_list[0].entity_id, '1')
        self.assertIsNotNone(sync_data_list[0].checksum)
        
        # Testa armazenamento
        mock_pipe = Mock()
        mock_redis_client.pipeline.return_value = mock_pipe
        
        result = optimizer.store_offline_data('user123', sync_data_list)
        
        self.assertTrue(result)
        mock_pipe.setex.assert_called()
        mock_pipe.execute.assert_called_once()
    
    def test_sync_priority_calculation(self):
        """Testa cálculo de prioridade de sincronização."""
        optimizer = iOSOptimizer()
        
        # Caso clínico (alta prioridade)
        case_entity = {'id': 1, 'type': 'case'}
        priority = optimizer._get_sync_priority('cases', case_entity)
        self.assertEqual(priority, 1)  # Alta prioridade
        
        # Analytics (baixa prioridade)
        analytics_entity = {'id': 1, 'type': 'analytics'}
        priority = optimizer._get_sync_priority('analytics', analytics_entity)
        self.assertEqual(priority, 3)  # Baixa prioridade
        
        # Recurso acessado recentemente (aumenta prioridade)
        recent_access = (datetime.now() - timedelta(days=1)).isoformat()
        resource_entity = {
            'id': 1, 
            'type': 'resource',
            'last_accessed': recent_access
        }
        priority = optimizer._get_sync_priority('resources', resource_entity)
        self.assertEqual(priority, 1)  # Prioridade aumentada
    
    @patch('redis.from_url')
    def test_sync_status_tracking(self, mock_redis):
        """Testa rastreamento de status de sincronização."""
        mock_redis_client = Mock()
        mock_redis.return_value = mock_redis_client
        
        optimizer = iOSOptimizer(mock_redis_client)
        
        # Mock de dados de sincronização existentes
        sync_data = {
            'last_sync': datetime.now().isoformat(),
            'entities_count': 10,
            'checksum': 'abc123'
        }
        
        mock_redis_client.get.return_value = json.dumps(sync_data)
        
        status = optimizer.get_sync_status('user123')
        
        self.assertIsNotNone(status['last_sync'])
        self.assertEqual(status['entities_count'], 10)
        self.assertEqual(status['checksum'], 'abc123')
        self.assertIsInstance(status['needs_sync'], bool)
        
        # Testa quando não há dados de sincronização
        mock_redis_client.get.return_value = None
        
        status = optimizer.get_sync_status('user123')
        
        self.assertIsNone(status['last_sync'])
        self.assertEqual(status['entities_count'], 0)
        self.assertTrue(status['needs_sync'])


class TestPushNotificationManager(FreemiumSystemTestCase):
    """Testes para gerenciador de notificações push."""
    
    def test_notification_formatting(self):
        """Testa formatação de notificações."""
        manager = PushNotificationManager()
        
        # Testa notificação de novo caso
        notification = manager.format_notification(
            'new_case_assigned',
            case_title='Lombalgia Aguda'
        )
        
        self.assertEqual(notification['title'], 'Novo Caso Clínico')
        self.assertIn('Lombalgia Aguda', notification['body'])
        self.assertEqual(notification['category'], 'case_assignment')
        
        # Testa notificação de lembrete de sessão
        notification = manager.format_notification(
            'session_reminder',
            minutes=15
        )
        
        self.assertEqual(notification['title'], 'Lembrete de Sessão')
        self.assertIn('15 minutos', notification['body'])
        self.assertEqual(notification['category'], 'session_reminder')
    
    def test_notification_scheduling(self):
        """Testa agendamento de notificações."""
        manager = PushNotificationManager()
        
        schedule_time = datetime.now() + timedelta(hours=1)
        
        scheduled = manager.schedule_notification(
            'user123',
            'competency_milestone',
            schedule_time,
            competency_name='Avaliação Postural'
        )
        
        self.assertIsNotNone(scheduled['id'])
        self.assertEqual(scheduled['user_id'], 'user123')
        self.assertEqual(scheduled['status'], 'scheduled')
        self.assertIn('Avaliação Postural', scheduled['body'])
        self.assertEqual(scheduled['category'], 'achievement')
    
    def test_invalid_template(self):
        """Testa tratamento de template inválido."""
        manager = PushNotificationManager()
        
        with self.assertRaises(ValueError):
            manager.format_notification('invalid_template')


class TestFreemiumMiddleware(FreemiumSystemTestCase):
    """Testes para middleware freemium."""
    
    @patch('redis.from_url')
    def test_rate_limiting_by_tier(self, mock_redis):
        """Testa rate limiting baseado no tier."""
        mock_redis_client = Mock()
        mock_redis.return_value = mock_redis_client
        
        middleware = FreemiumMiddleware(redis_client=mock_redis_client)
        
        # Testa usuário FREE
        mock_redis_client.incr.return_value = 1
        result = middleware._apply_rate_limiting('user123', 'free')
        self.assertTrue(result['allowed'])
        
        # Testa limite excedido
        mock_redis_client.incr.return_value = 31  # Excede limite de 30/min para FREE
        result = middleware._apply_rate_limiting('user123', 'free')
        self.assertFalse(result['allowed'])
        self.assertIn('Rate limit excedido', result['message'])
        
        # Testa usuário ENTERPRISE (ilimitado)
        result = middleware._apply_rate_limiting('user123', 'enterprise')
        self.assertTrue(result['allowed'])
    
    def test_require_tier_decorator(self):
        """Testa decorator de tier mínimo."""
        @require_tier('premium')
        def premium_function():
            return 'success'
        
        # Mock do contexto Flask
        with patch('backend.mentorship.middleware.g') as mock_g:
            # Usuário FREE tentando acessar função PREMIUM
            mock_g.current_tier = MentorshipTier.FREE
            
            with patch('backend.mentorship.middleware.jsonify') as mock_jsonify:
                mock_jsonify.return_value = ({'error': 'Tier insuficiente'}, 403)
                
                result = premium_function()
                
                mock_jsonify.assert_called_once()
                self.assertEqual(result[1], 403)
            
            # Usuário PREMIUM acessando função PREMIUM
            mock_g.current_tier = MentorshipTier.PREMIUM
            
            result = premium_function()
            self.assertEqual(result, 'success')
    
    def test_require_feature_decorator(self):
        """Testa decorator de funcionalidade específica."""
        @require_feature('export_reports')
        def export_function():
            return 'exported'
        
        with patch('backend.mentorship.middleware.g') as mock_g:
            mock_g.current_user_id = 'user123'
            mock_g.current_tier = MentorshipTier.FREE
            
            with patch('backend.mentorship.middleware.MentorshipConfig') as mock_config:
                # Mock de features não disponíveis para FREE
                mock_config.return_value.get_feature_availability.return_value = {
                    'export_reports': False
                }
                
                with patch('backend.mentorship.middleware.jsonify') as mock_jsonify:
                    mock_jsonify.return_value = ({'error': 'Funcionalidade não disponível'}, 403)
                    
                    result = export_function()
                    
                    mock_jsonify.assert_called_once()
                    self.assertEqual(result[1], 403)


class TestDataIntegrity(FreemiumSystemTestCase):
    """Testes para integridade de dados."""
    
    def test_tier_consistency(self):
        """Testa consistência entre tiers e limites."""
        config = MentorshipConfig()
        
        # Verifica se todos os tiers têm limites definidos
        for tier in MentorshipTier:
            self.assertIn(tier, config.TIER_LIMITS)
            limits = config.TIER_LIMITS[tier]
            
            # Verifica se todos os campos obrigatórios estão presentes
            self.assertIsNotNone(limits.interns)
            self.assertIsNotNone(limits.cases)
            self.assertIsNotNone(limits.resources)
            self.assertIsNotNone(limits.sessions)
            self.assertIsNotNone(limits.storage_bytes)
            
            # Verifica hierarquia de limites (FREE < PREMIUM < ENTERPRISE)
            if tier == MentorshipTier.FREE:
                self.assertGreater(limits.interns, 0)
                self.assertFalse(limits.white_label)
            elif tier == MentorshipTier.PREMIUM:
                free_limits = config.TIER_LIMITS[MentorshipTier.FREE]
                if limits.interns != -1:
                    self.assertGreater(limits.interns, free_limits.interns)
                self.assertTrue(limits.export_reports)
            elif tier == MentorshipTier.ENTERPRISE:
                self.assertTrue(limits.white_label)
                self.assertTrue(limits.priority_support)
    
    def test_ios_config_completeness(self):
        """Testa completude das configurações iOS."""
        config = MentorshipConfig.get_ios_config()
        
        required_keys = [
            'offline_mode', 'sync_interval', 'push_notifications',
            'cache_size_mb', 'cache_expiry_hours', 'image_quality',
            'video_bitrate', 'request_timeout', 'max_downloads',
            'offline_resources'
        ]
        
        for key in required_keys:
            self.assertIn(key, config, f"Configuração iOS faltando: {key}")
        
        # Verifica recursos offline para todos os tiers
        offline_resources = config['offline_resources']
        for tier in MentorshipTier:
            self.assertIn(tier, offline_resources)
            tier_resources = offline_resources[tier]
            
            self.assertIn('cases', tier_resources)
            self.assertIn('resources', tier_resources)
            self.assertIn('videos', tier_resources)
    
    def test_pricing_consistency(self):
        """Testa consistência de preços entre tiers."""
        from backend.mentorship.config import TIER_PRICING
        
        # Verifica se todos os tiers têm preços definidos
        for tier in MentorshipTier:
            self.assertIn(tier, TIER_PRICING)
            pricing = TIER_PRICING[tier]
            
            self.assertIn('monthly_price', pricing)
            self.assertIn('yearly_price', pricing)
            self.assertIn('currency', pricing)
            
            # Verifica se preços são números válidos
            self.assertIsInstance(pricing['monthly_price'], (int, float))
            self.assertIsInstance(pricing['yearly_price'], (int, float))
            
            # FREE deve ser gratuito
            if tier == MentorshipTier.FREE:
                self.assertEqual(pricing['monthly_price'], 0)
                self.assertEqual(pricing['yearly_price'], 0)
            
            # Preço anual deve ser menor que 12x o mensal (desconto)
            if pricing['monthly_price'] > 0:
                annual_discount = pricing['yearly_price'] / (pricing['monthly_price'] * 12)
                self.assertLess(annual_discount, 1.0, "Preço anual deve ter desconto")


if __name__ == '__main__':
    # Configuração para executar testes
    pytest.main([__file__, '-v', '--tb=short'])