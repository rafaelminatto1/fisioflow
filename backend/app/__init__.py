from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from datetime import timedelta

# Inicializar extensões
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app(config_name='development'):
    """Factory function para criar a aplicação Flask"""
    
    app = Flask(__name__)
    
    # Configurações básicas
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 
        'postgresql://user:password@localhost/fisioflow_db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Configurações JWT
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Configurações CORS
    app.config['CORS_ORIGINS'] = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    
    # Configurações de upload
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB
    app.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
    
    # Configurações específicas por ambiente
    if config_name == 'development':
        app.config['DEBUG'] = True
        app.config['SQLALCHEMY_ECHO'] = True
    elif config_name == 'production':
        app.config['DEBUG'] = False
        app.config['SQLALCHEMY_ECHO'] = False
    elif config_name == 'testing':
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    # Inicializar extensões com a app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    
    # Configurar CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Registrar Blueprints
    register_blueprints(app)
    
    # Registrar handlers de erro
    register_error_handlers(app)
    
    # Configurar logging
    configure_logging(app)
    
    # Criar diretórios necessários
    create_directories(app)
    
    return app

def register_blueprints(app):
    """Registra todos os Blueprints da aplicação"""
    
    # Blueprint principal (se existir)
    try:
        from app.main import main_bp
        app.register_blueprint(main_bp)
    except ImportError:
        pass
    
    # Blueprint de autenticação (se existir)
    try:
        from app.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
    except ImportError:
        pass
    
    # Blueprint de usuários (se existir)
    try:
        from app.users import users_bp
        app.register_blueprint(users_bp, url_prefix='/api/users')
    except ImportError:
        pass
    
    # Registrar módulo de mentoria
    try:
        from app.mentorship.blueprint import register_mentorship_blueprint
        register_mentorship_blueprint(app)
        app.logger.info("Módulo de mentoria registrado com sucesso")
    except ImportError as e:
        app.logger.error(f"Erro ao registrar módulo de mentoria: {e}")
    
    # Blueprint de pacientes (se existir)
    try:
        from app.patients import patients_bp
        app.register_blueprint(patients_bp, url_prefix='/api/patients')
    except ImportError:
        pass
    
    # Blueprint de agendamentos (se existir)
    try:
        from app.appointments import appointments_bp
        app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    except ImportError:
        pass

def register_error_handlers(app):
    """Registra handlers de erro personalizados"""
    
    @app.errorhandler(400)
    def bad_request(error):
        return {
            'success': False,
            'error': 'Requisição inválida',
            'message': str(error.description)
        }, 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return {
            'success': False,
            'error': 'Não autorizado',
            'message': 'Token de acesso inválido ou expirado'
        }, 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return {
            'success': False,
            'error': 'Acesso negado',
            'message': 'Você não tem permissão para acessar este recurso'
        }, 403
    
    @app.errorhandler(404)
    def not_found(error):
        return {
            'success': False,
            'error': 'Recurso não encontrado',
            'message': 'O recurso solicitado não foi encontrado'
        }, 404
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        return {
            'success': False,
            'error': 'Dados inválidos',
            'message': 'Os dados fornecidos são inválidos'
        }, 422
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return {
            'success': False,
            'error': 'Limite de requisições excedido',
            'message': 'Muitas requisições. Tente novamente mais tarde.'
        }, 429
    
    @app.errorhandler(500)
    def internal_error(error):
        app.logger.error(f"Erro interno do servidor: {error}")
        return {
            'success': False,
            'error': 'Erro interno do servidor',
            'message': 'Ocorreu um erro inesperado. Tente novamente mais tarde.'
        }, 500

def configure_logging(app):
    """Configura sistema de logging"""
    
    if not app.debug and not app.testing:
        import logging
        from logging.handlers import RotatingFileHandler
        
        # Criar diretório de logs se não existir
        if not os.path.exists('logs'):
            os.mkdir('logs')
        
        # Configurar handler de arquivo
        file_handler = RotatingFileHandler(
            'logs/fisioflow.log',
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('FisioFlow startup')

def create_directories(app):
    """Cria diretórios necessários para a aplicação"""
    
    directories = [
        app.config.get('UPLOAD_FOLDER', 'uploads'),
        'logs',
        'temp',
        'backups'
    ]
    
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            app.logger.info(f"Diretório criado: {directory}")

# Importar modelos para que o SQLAlchemy os reconheça
def import_models():
    """Importa todos os modelos para registro no SQLAlchemy"""
    
    try:
        # Modelos principais (se existirem)
        from app.models import User, Patient, Appointment
    except ImportError:
        pass
    
    try:
        # Modelos do módulo de mentoria
        from app.mentorship.models import (
            Intern, Competency, InternCompetency, EducationalCase,
            EducationalResource, CaseAnalysis, Tag, Specialty,
            MentorshipSession, StudyPlan
        )
    except ImportError:
        pass

# Comandos CLI personalizados
def register_cli_commands(app):
    """Registra comandos CLI personalizados"""
    
    @app.cli.command()
    def init_db():
        """Inicializa o banco de dados"""
        db.create_all()
        print("Banco de dados inicializado.")
    
    @app.cli.command()
    def seed_mentorship():
        """Popula dados iniciais do módulo de mentoria"""
        from app.mentorship.models import Competency, Specialty, Tag
        
        # Competências básicas
        competencies = [
            {'name': 'Avaliação Postural', 'description': 'Análise da postura corporal', 'required_hours': 40},
            {'name': 'Exercícios Terapêuticos', 'description': 'Prescrição de exercícios', 'required_hours': 60},
            {'name': 'Eletroterapia', 'description': 'Uso de recursos eletroterapêuticos', 'required_hours': 30},
            {'name': 'Terapia Manual', 'description': 'Técnicas manuais de tratamento', 'required_hours': 80}
        ]
        
        for comp_data in competencies:
            comp = Competency(**comp_data)
            db.session.add(comp)
        
        # Especialidades
        specialties = [
            {'name': 'Ortopedia', 'description': 'Fisioterapia ortopédica e traumatológica'},
            {'name': 'Neurologia', 'description': 'Fisioterapia neurológica'},
            {'name': 'Cardiorrespiratória', 'description': 'Fisioterapia cardiorrespiratória'},
            {'name': 'Pediatria', 'description': 'Fisioterapia pediátrica'}
        ]
        
        for spec_data in specialties:
            spec = Specialty(**spec_data)
            db.session.add(spec)
        
        # Tags
        tags = [
            {'name': 'Iniciante', 'color': '#4CAF50'},
            {'name': 'Intermediário', 'color': '#FF9800'},
            {'name': 'Avançado', 'color': '#F44336'},
            {'name': 'Prático', 'color': '#2196F3'},
            {'name': 'Teórico', 'color': '#9C27B0'}
        ]
        
        for tag_data in tags:
            tag = Tag(**tag_data)
            db.session.add(tag)
        
        db.session.commit()
        print("Dados iniciais do módulo de mentoria criados.")

# Função para criar app com configuração específica
def create_app_with_config(config_name=None):
    """Cria app com configuração específica baseada em variável de ambiente"""
    
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    app = create_app(config_name)
    
    # Importar modelos
    with app.app_context():
        import_models()
    
    # Registrar comandos CLI
    register_cli_commands(app)
    
    return app