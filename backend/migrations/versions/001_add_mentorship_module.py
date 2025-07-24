"""Add mentorship module

Revision ID: 001_mentorship
Revises: 
Create Date: 2024-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001_mentorship'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create enum types
    competency_status_enum = postgresql.ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', name='competencystatus')
    competency_status_enum.create(op.get_bind())
    
    case_difficulty_enum = postgresql.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', name='casedifficulty')
    case_difficulty_enum.create(op.get_bind())
    
    resource_type_enum = postgresql.ENUM('VIDEO', 'ARTICLE', 'PDF', 'PRESENTATION', 'INTERACTIVE', 'BOOK', name='resourcetype')
    resource_type_enum.create(op.get_bind())
    
    # Create users table (if not exists)
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Create specialties table
    op.create_table('specialties',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create tags table
    op.create_table('tags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('color', sa.String(length=7), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create competencies table
    op.create_table('competencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('required_hours', sa.Integer(), nullable=True, default=0),
        sa.Column('order_index', sa.Integer(), nullable=True, default=0),
        sa.Column('is_mandatory', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create interns table
    op.create_table('interns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=120), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('total_hours', sa.Float(), nullable=True, default=0.0),
        sa.Column('completed_cases', sa.Integer(), nullable=True, default=0),
        sa.Column('average_grade', sa.Float(), nullable=True, default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    # Create educational_cases table
    op.create_table('educational_cases',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('clinical_history', sa.Text(), nullable=True),
        sa.Column('physical_examination', sa.Text(), nullable=True),
        sa.Column('expected_outcomes', sa.Text(), nullable=True),
        sa.Column('difficulty', case_difficulty_enum, nullable=True),
        sa.Column('estimated_time_minutes', sa.Integer(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=True, default=False),
        sa.Column('views_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create educational_resources table
    op.create_table('educational_resources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('resource_type', resource_type_enum, nullable=True),
        sa.Column('content_url', sa.String(length=500), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('author', sa.String(length=100), nullable=True),
        sa.Column('publication_date', sa.Date(), nullable=True),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('difficulty_level', case_difficulty_enum, nullable=True),
        sa.Column('is_featured', sa.Boolean(), nullable=True, default=False),
        sa.Column('is_free', sa.Boolean(), nullable=True, default=True),
        sa.Column('views_count', sa.Integer(), nullable=True, default=0),
        sa.Column('downloads_count', sa.Integer(), nullable=True, default=0),
        sa.Column('rating_average', sa.Float(), nullable=True, default=0.0),
        sa.Column('rating_count', sa.Integer(), nullable=True, default=0),
        sa.Column('added_by_id', sa.Integer(), nullable=True),
        sa.Column('added_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['added_by_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create intern_competencies table
    op.create_table('intern_competencies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('intern_id', sa.Integer(), nullable=False),
        sa.Column('competency_id', sa.Integer(), nullable=False),
        sa.Column('status', competency_status_enum, nullable=True, default='NOT_STARTED'),
        sa.Column('progress_percentage', sa.Float(), nullable=True, default=0.0),
        sa.Column('hours_completed', sa.Float(), nullable=True, default=0.0),
        sa.Column('grade', sa.Float(), nullable=True),
        sa.Column('mentor_feedback', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['competency_id'], ['competencies.id'], ),
        sa.ForeignKeyConstraint(['intern_id'], ['interns.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('intern_id', 'competency_id')
    )
    
    # Create study_plans table
    op.create_table('study_plans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('intern_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('total_hours', sa.Float(), nullable=True, default=0.0),
        sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['intern_id'], ['interns.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create mentorship_sessions table
    op.create_table('mentorship_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('intern_id', sa.Integer(), nullable=False),
        sa.Column('mentor_id', sa.Integer(), nullable=False),
        sa.Column('session_date', sa.DateTime(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True, default=60),
        sa.Column('objectives', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('feedback', sa.Text(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['intern_id'], ['interns.id'], ),
        sa.ForeignKeyConstraint(['mentor_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create case_analyses table
    op.create_table('case_analyses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('intern_id', sa.Integer(), nullable=False),
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('analysis_text', sa.Text(), nullable=True),
        sa.Column('diagnosis_attempt', sa.String(length=200), nullable=True),
        sa.Column('treatment_proposal', sa.Text(), nullable=True),
        sa.Column('grade', sa.Float(), nullable=True),
        sa.Column('mentor_feedback', sa.Text(), nullable=True),
        sa.Column('time_spent_minutes', sa.Integer(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=True, default=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['educational_cases.id'], ),
        sa.ForeignKeyConstraint(['intern_id'], ['interns.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('intern_id', 'case_id')
    )
    
    # Create association tables
    op.create_table('resource_tags',
        sa.Column('resource_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['resource_id'], ['educational_resources.id'], ),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ),
        sa.PrimaryKeyConstraint('resource_id', 'tag_id')
    )
    
    op.create_table('case_specialties',
        sa.Column('case_id', sa.Integer(), nullable=False),
        sa.Column('specialty_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['educational_cases.id'], ),
        sa.ForeignKeyConstraint(['specialty_id'], ['specialties.id'], ),
        sa.PrimaryKeyConstraint('case_id', 'specialty_id')
    )
    
    # Create indexes for better performance
    op.create_index('idx_intern_competencies_status', 'intern_competencies', ['status'])
    op.create_index('idx_educational_cases_difficulty', 'educational_cases', ['difficulty'])
    op.create_index('idx_educational_resources_type', 'educational_resources', ['resource_type'])
    op.create_index('idx_case_analyses_completed', 'case_analyses', ['is_completed'])
    op.create_index('idx_mentorship_sessions_date', 'mentorship_sessions', ['session_date'])

def downgrade():
    # Drop indexes
    op.drop_index('idx_mentorship_sessions_date')
    op.drop_index('idx_case_analyses_completed')
    op.drop_index('idx_educational_resources_type')
    op.drop_index('idx_educational_cases_difficulty')
    op.drop_index('idx_intern_competencies_status')
    
    # Drop association tables
    op.drop_table('case_specialties')
    op.drop_table('resource_tags')
    
    # Drop main tables
    op.drop_table('case_analyses')
    op.drop_table('mentorship_sessions')
    op.drop_table('study_plans')
    op.drop_table('intern_competencies')
    op.drop_table('educational_resources')
    op.drop_table('educational_cases')
    op.drop_table('interns')
    op.drop_table('competencies')
    op.drop_table('tags')
    op.drop_table('specialties')
    op.drop_table('users')
    
    # Drop enum types
    sa.Enum(name='resourcetype').drop(op.get_bind())
    sa.Enum(name='casedifficulty').drop(op.get_bind())
    sa.Enum(name='competencystatus').drop(op.get_bind())