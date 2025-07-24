
from sqlalchemy.orm import declarative_base
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Boolean,
    Float,
    Enum,
    Table
)
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

# Enums para melhor tipagem e validação
class CompetencyStatus(enum.Enum):
    NAO_INICIADO = "Não Iniciado"
    EM_PROGRESSO = "Em Progresso"
    CONCLUIDO = "Concluído"
    APROVADO = "Aprovado"

class CaseDifficulty(enum.Enum):
    INICIANTE = 1
    INTERMEDIARIO = 3
    AVANCADO = 5

class ResourceType(enum.Enum):
    ARTIGO = "Artigo"
    VIDEO = "Vídeo"
    PODCAST = "Podcast"
    LIVRO = "Livro"
    CURSO = "Curso"
    WEBINAR = "Webinar"
    GUIDELINE = "Guideline"

Base = declarative_base()

# Tabelas de associação para relacionamentos muitos-para-muitos
resource_tags = Table(
    'resource_tags',
    Base.metadata,
    Column('resource_id', Integer, ForeignKey('educational_resource.id')),
    Column('tag_id', Integer, ForeignKey('tag.id'))
)

case_specialties = Table(
    'case_specialties',
    Base.metadata,
    Column('case_id', Integer, ForeignKey('educational_case.id')),
    Column('specialty_id', Integer, ForeignKey('specialty.id'))
)

# Tabela de associação para o relacionamento Muitos-para-Muitos
# entre Estagiários e Competências, com dados extras.
class InternCompetency(Base):
    __tablename__ = 'intern_competency'
    id = Column(Integer, primary_key=True)
    intern_id = Column(Integer, ForeignKey('intern.id'), nullable=False)
    competency_id = Column(Integer, ForeignKey('competency.id'), nullable=False)
    status = Column(Enum(CompetencyStatus), default=CompetencyStatus.NAO_INICIADO)
    progress_percentage = Column(Float, default=0.0)
    hours_completed = Column(Float, default=0.0)
    score = Column(Float) # Nota da avaliação (0-10)
    evaluated_at = Column(DateTime)
    notes = Column(Text)
    mentor_feedback = Column(Text)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Intern(Base):
    __tablename__ = 'intern'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('user.id'), unique=True, nullable=False) # Vincula a um usuário do sistema
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    phone = Column(String(20))
    university = Column(String(100))
    semester = Column(Integer)
    supervisor_id = Column(Integer, ForeignKey('user.id'))
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)
    total_hours = Column(Float, default=0.0)
    completed_cases = Column(Integer, default=0)
    average_grade = Column(Float, default=0.0)
    
    # Relacionamentos
    competencies = relationship('InternCompetency', backref='intern', lazy='dynamic')
    case_analyses = relationship('CaseAnalysis', back_populates='intern')
    mentorship_sessions = relationship('MentorshipSession', back_populates='intern')
    study_plans = relationship('StudyPlan', back_populates='intern')
    user = relationship('User', foreign_keys=[user_id])
    supervisor = relationship('User', foreign_keys=[supervisor_id])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Competency(Base):
    __tablename__ = 'competency'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50)) # Ex: Avaliação, Técnica, Comunicação
    description = Column(Text)
    evaluation_criteria = Column(JSON) # Critérios para avaliação (ex: { 'nota_1': '...', 'nota_5': '...' })
    required_hours = Column(Float, default=0.0)
    order_index = Column(Integer, default=0)
    is_mandatory = Column(Boolean, default=True)
    
    # Relacionamentos
    intern_competencies = relationship('InternCompetency', backref='competency')
    
    created_at = Column(DateTime, default=datetime.utcnow)

class EducationalCase(Base):
    __tablename__ = 'educational_case'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    specialty = Column(String(50))
    difficulty_level = Column(Enum(CaseDifficulty), default=CaseDifficulty.INTERMEDIARIO)
    patient_profile = Column(JSON) # Dados anonimizados
    clinical_history = Column(Text)
    physical_examination = Column(Text)
    diagnosis = Column(String(200))
    treatment_plan = Column(Text)
    outcomes = Column(Text)
    expected_outcomes = Column(Text)
    learning_objectives = Column(JSON)
    estimated_time_minutes = Column(Integer, default=60)
    created_by_id = Column(Integer, ForeignKey('user.id'))
    is_published = Column(Boolean, default=False)
    views_count = Column(Integer, default=0)
    
    # Relacionamentos
    specialties = relationship('Specialty', secondary=case_specialties, back_populates='cases')
    analyses = relationship('CaseAnalysis', back_populates='case')
    creator = relationship('User', backref='educational_cases')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Modelo para o Centro de Recursos
class EducationalResource(Base):
    __tablename__ = 'educational_resource'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    resource_type = Column(Enum(ResourceType), nullable=False)
    content_url = Column(String(500)) # URL do recurso
    file_path = Column(String(500)) # Caminho do arquivo se hospedado localmente
    author = Column(String(100))
    publication_date = Column(DateTime)
    duration_minutes = Column(Integer) # Para vídeos, podcasts, etc.
    difficulty_level = Column(Enum(CaseDifficulty))
    is_featured = Column(Boolean, default=False)
    is_free = Column(Boolean, default=True)
    views_count = Column(Integer, default=0)
    downloads_count = Column(Integer, default=0)
    rating_average = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    added_by_id = Column(Integer, ForeignKey('user.id'))
    
    # Relacionamentos
    tags = relationship('Tag', secondary=resource_tags, back_populates='resources')
    adder = relationship('User', backref='educational_resources')
    
    added_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CaseAnalysis(Base):
    """Análises de casos feitas pelos estagiários"""
    __tablename__ = 'case_analysis'
    
    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey('educational_case.id'), nullable=False)
    intern_id = Column(Integer, ForeignKey('intern.id'), nullable=False)
    analysis_text = Column(Text, nullable=False)
    diagnosis_attempt = Column(Text)
    treatment_proposal = Column(Text)
    mentor_feedback = Column(Text)
    grade = Column(Float) # Nota de 0 a 10
    time_spent_minutes = Column(Integer)
    is_completed = Column(Boolean, default=False)
    
    # Relacionamentos
    case = relationship('EducationalCase', back_populates='analyses')
    intern = relationship('Intern', back_populates='case_analyses')
    
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Tag(Base):
    """Tags para categorização de recursos"""
    __tablename__ = 'tag'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)
    color = Column(String(7), default='#007bff') # Cor em hexadecimal
    
    # Relacionamentos
    resources = relationship('EducationalResource', secondary=resource_tags, back_populates='tags')

class Specialty(Base):
    """Especialidades da fisioterapia"""
    __tablename__ = 'specialty'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    icon = Column(String(50)) # Nome do ícone para UI
    
    # Relacionamentos
    cases = relationship('EducationalCase', secondary=case_specialties, back_populates='specialties')

class MentorshipSession(Base):
    """Sessões de mentoria entre mentor e estagiário"""
    __tablename__ = 'mentorship_session'
    
    id = Column(Integer, primary_key=True)
    intern_id = Column(Integer, ForeignKey('intern.id'), nullable=False)
    mentor_id = Column(Integer, ForeignKey('user.id'), nullable=False)
    session_date = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=60)
    objectives = Column(Text)
    summary = Column(Text)
    feedback = Column(Text)
    next_steps = Column(Text)
    is_completed = Column(Boolean, default=False)
    
    # Relacionamentos
    intern = relationship('Intern', back_populates='mentorship_sessions')
    mentor = relationship('User')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class StudyPlan(Base):
    """Planos de estudo personalizados"""
    __tablename__ = 'study_plan'
    
    id = Column(Integer, primary_key=True)
    intern_id = Column(Integer, ForeignKey('intern.id'), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    total_hours = Column(Float, default=0.0)
    completed_hours = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    
    # Relacionamentos
    intern = relationship('Intern', back_populates='study_plans')
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Modelo User (mantendo compatibilidade)
class User(Base):
    __tablename__ = 'user'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    # Adicione outros campos do usuário conforme necessário
