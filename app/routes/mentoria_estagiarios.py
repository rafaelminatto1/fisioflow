# -*- coding: utf-8 -*-
"""
Rotas Flask para Gestão de Estagiários - Sistema de Mentoria FisioFlow
Funcionalidades completas de CRUD, cronograma, avaliações e relatórios
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, abort, send_file
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, TextAreaField, SelectField, DateField, IntegerField, HiddenField, FloatField
from wtforms.validators import DataRequired, Email, Length, NumberRange, Optional, ValidationError
from werkzeug.utils import secure_filename
from sqlalchemy import or_, and_, desc, func
from datetime import datetime, date, timedelta
import os
import json
from io import BytesIO
import pandas as pd
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
import re

from models.mentoria import db, Intern, EducationalCase, Competency, CaseAssignment, EducationalResource
from models.mentoria import InternStatus, CompetencyLevel, AssignmentStatus

mentoria_estagiarios_bp = Blueprint('mentoria_estagiarios', __name__, url_prefix='/mentoria')

# Configurações
UPLOAD_FOLDER = 'static/uploads/estagiarios'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_cpf(cpf):
    """Validação de CPF"""
    cpf = re.sub(r'[^0-9]', '', cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    
    # Validação do primeiro dígito
    soma = sum(int(cpf[i]) * (10 - i) for i in range(9))
    resto = soma % 11
    if resto < 2:
        digito1 = 0
    else:
        digito1 = 11 - resto
    
    if int(cpf[9]) != digito1:
        return False
    
    # Validação do segundo dígito
    soma = sum(int(cpf[i]) * (11 - i) for i in range(10))
    resto = soma % 11
    if resto < 2:
        digito2 = 0
    else:
        digito2 = 11 - resto
    
    return int(cpf[10]) == digito2

# Formulários
class InternForm(FlaskForm):
    """Formulário principal para cadastro/edição de estagiário"""
    # Dados pessoais
    name = StringField('Nome Completo', validators=[DataRequired(), Length(min=2, max=100)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    phone = StringField('Telefone', validators=[Length(max=20)])
    cpf = StringField('CPF', validators=[Length(max=14)])
    birth_date = DateField('Data de Nascimento', validators=[Optional()])
    
    # Dados acadêmicos
    student_id = StringField('Matrícula', validators=[DataRequired(), Length(max=50)])
    university = StringField('Universidade', validators=[DataRequired(), Length(max=100)])
    course = StringField('Curso', validators=[DataRequired(), Length(max=100)], default='Fisioterapia')
    semester = IntegerField('Semestre', validators=[DataRequired(), NumberRange(min=1, max=20)])
    expected_graduation = DateField('Previsão de Formatura', validators=[Optional()])
    
    # Dados do estágio
    supervisor_id = SelectField('Supervisor', coerce=int, validators=[Optional()])
    start_date = DateField('Data de Início', validators=[DataRequired()])
    end_date = DateField('Data de Término', validators=[Optional()])
    status = SelectField('Status', choices=[
        (InternStatus.ACTIVE.value, 'Ativo'),
        (InternStatus.INACTIVE.value, 'Inativo'),
        (InternStatus.COMPLETED.value, 'Concluído'),
        (InternStatus.SUSPENDED.value, 'Suspenso')
    ], validators=[DataRequired()])
    
    # Informações adicionais
    bio = TextAreaField('Biografia/Objetivos', validators=[Length(max=1000)])
    skills = TextAreaField('Habilidades/Conhecimentos Prévios', validators=[Length(max=500)])
    goals = TextAreaField('Objetivos do Estágio', validators=[Length(max=500)])
    photo = FileField('Foto do Estagiário', validators=[FileAllowed(ALLOWED_EXTENSIONS, 'Apenas imagens são permitidas!')])
    
    def validate_cpf(self, field):
        if field.data and not validate_cpf(field.data):
            raise ValidationError('CPF inválido.')
    
    def validate_birth_date(self, field):
        if field.data and field.data >= date.today():
            raise ValidationError('Data de nascimento deve ser anterior à data atual.')
    
    def validate_end_date(self, field):
        if field.data and self.start_date.data and field.data <= self.start_date.data:
            raise ValidationError('Data de término deve ser posterior à data de início.')

class SearchForm(FlaskForm):
    """Formulário para busca e filtros"""
    search = StringField('Buscar')
    status_filter = SelectField('Status', choices=[
        ('', 'Todos'),
        (InternStatus.ACTIVE.value, 'Ativo'),
        (InternStatus.INACTIVE.value, 'Inativo'),
        (InternStatus.COMPLETED.value, 'Concluído'),
        (InternStatus.SUSPENDED.value, 'Suspenso')
    ])
    supervisor_filter = SelectField('Supervisor', coerce=int)
    university_filter = StringField('Universidade')
    semester_filter = SelectField('Semestre', coerce=int)

class ActivityForm(FlaskForm):
    """Formulário para atividades do cronograma"""
    title = StringField('Título da Atividade', validators=[DataRequired(), Length(max=200)])
    description = TextAreaField('Descrição', validators=[Length(max=1000)])
    activity_type = SelectField('Tipo', choices=[
        ('lecture', 'Aula Teórica'),
        ('practice', 'Prática Clínica'),
        ('evaluation', 'Avaliação'),
        ('case_study', 'Estudo de Caso'),
        ('research', 'Pesquisa'),
        ('presentation', 'Apresentação'),
        ('meeting', 'Reunião'),
        ('other', 'Outro')
    ], validators=[DataRequired()])
    start_date = DateField('Data de Início', validators=[DataRequired()])
    end_date = DateField('Data de Término', validators=[Optional()])
    hours = FloatField('Carga Horária', validators=[NumberRange(min=0.5, max=40)])
    location = StringField('Local', validators=[Length(max=100)])
    materials = TextAreaField('Materiais Necessários', validators=[Length(max=500)])
    priority = SelectField('Prioridade', choices=[
        ('low', 'Baixa'),
        ('medium', 'Média'),
        ('high', 'Alta'),
        ('urgent', 'Urgente')
    ], default='medium')

class EvaluationForm(FlaskForm):
    """Formulário para avaliações"""
    evaluation_type = SelectField('Tipo de Avaliação', choices=[
        ('performance', 'Desempenho Clínico'),
        ('knowledge', 'Conhecimento Teórico'),
        ('attitude', 'Postura Profissional'),
        ('skills', 'Habilidades Práticas'),
        ('presentation', 'Apresentação'),
        ('final', 'Avaliação Final')
    ], validators=[DataRequired()])
    score = FloatField('Nota', validators=[DataRequired(), NumberRange(min=0, max=10)])
    evaluation_date = DateField('Data da Avaliação', validators=[DataRequired()])
    criteria = TextAreaField('Critérios Avaliados', validators=[Length(max=1000)])
    feedback = TextAreaField('Feedback', validators=[DataRequired(), Length(min=10, max=2000)])
    strengths = TextAreaField('Pontos Fortes', validators=[Length(max=500)])
    improvements = TextAreaField('Pontos de Melhoria', validators=[Length(max=500)])
    recommendations = TextAreaField('Recomendações', validators=[Length(max=500)])

# Rotas principais
@mentoria_estagiarios_bp.route('/estagiarios')
@login_required
def listar_estagiarios():
    """Lista todos os estagiários com filtros e busca avançada"""
    form = SearchForm()
    
    # Opções para filtros
    supervisors = db.session.query(Intern.supervisor_id, Intern.supervisor_name)\
                           .filter(Intern.supervisor_id.isnot(None), Intern.tenant_id == current_user.tenant_id)\
                           .distinct().all()
    form.supervisor_filter.choices = [('', 'Todos')] + [(s.supervisor_id, s.supervisor_name) for s in supervisors]
    
    semesters = db.session.query(Intern.semester)\
                         .filter(Intern.tenant_id == current_user.tenant_id)\
                         .distinct().order_by(Intern.semester).all()
    form.semester_filter.choices = [('', 'Todos')] + [(s.semester, f'{s.semester}º semestre') for s in semesters]
    
    # Query base
    query = Intern.query.filter_by(tenant_id=current_user.tenant_id)
    
    # Aplicar filtros
    if request.args.get('search'):
        search_term = f"%{request.args.get('search')}%"
        query = query.filter(or_(
            Intern.name.ilike(search_term),
            Intern.email.ilike(search_term),
            Intern.student_id.ilike(search_term),
            Intern.university.ilike(search_term)
        ))
    
    if request.args.get('status_filter'):
        query = query.filter(Intern.status == request.args.get('status_filter'))
    
    if request.args.get('supervisor_filter'):
        query = query.filter(Intern.supervisor_id == int(request.args.get('supervisor_filter')))
    
    if request.args.get('university_filter'):
        university_term = f"%{request.args.get('university_filter')}%"
        query = query.filter(Intern.university.ilike(university_term))
    
    if request.args.get('semester_filter'):
        query = query.filter(Intern.semester == int(request.args.get('semester_filter')))
    
    # Ordenação
    order_by = request.args.get('order_by', 'name')
    order_dir = request.args.get('order_dir', 'asc')
    
    if order_by == 'name':
        query = query.order_by(Intern.name.asc() if order_dir == 'asc' else Intern.name.desc())
    elif order_by == 'start_date':
        query = query.order_by(Intern.start_date.desc() if order_dir == 'desc' else Intern.start_date.asc())
    elif order_by == 'status':
        query = query.order_by(Intern.status.asc() if order_dir == 'asc' else Intern.status.desc())
    
    # Paginação
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    interns = query.paginate(page=page, per_page=per_page, error_out=False)
    
    # Estatísticas para dashboard
    total_interns = Intern.query.filter_by(tenant_id=current_user.tenant_id).count()
    active_interns = Intern.query.filter_by(tenant_id=current_user.tenant_id, status=InternStatus.ACTIVE).count()
    completed_interns = Intern.query.filter_by(tenant_id=current_user.tenant_id, status=InternStatus.COMPLETED).count()
    
    # Estagiários próximos do fim do estágio (30 dias)
    end_soon = Intern.query.filter(
        Intern.tenant_id == current_user.tenant_id,
        Intern.status == InternStatus.ACTIVE,
        Intern.end_date.isnot(None),
        Intern.end_date <= date.today() + timedelta(days=30)
    ).count()
    
    stats = {
        'total_interns': total_interns,
        'active_interns': active_interns,
        'completed_interns': completed_interns,
        'ending_soon': end_soon,
        'completion_rate': round((completed_interns / total_interns * 100) if total_interns > 0 else 0, 1)
    }
    
    return render_template('mentoria/estagiarios.html', 
                         interns=interns, 
                         form=form, 
                         stats=stats,
                         title='Gestão de Estagiários')

@mentoria_estagiarios_bp.route('/estagiario/novo', methods=['GET', 'POST'])
@login_required
def novo_estagiario():
    """Cadastro de novo estagiário"""
    form = InternForm()
    
    # Carregar supervisores
    supervisors = [
        (1, 'Dr. Ana Costa - Supervisor Sênior'),
        (2, 'Carlos Martins - Fisioterapeuta'),
        (3, 'Dra. Maria Silva - Coordenadora'),
        (4, 'Dr. João Santos - Especialista Ortopédico')
    ]
    form.supervisor_id.choices = [('', 'Selecione um supervisor')] + supervisors
    
    if form.validate_on_submit():
        try:
            # Upload da foto
            photo_filename = None
            if form.photo.data:
                photo = form.photo.data
                if allowed_file(photo.filename):
                    filename = secure_filename(photo.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    photo_filename = f"{timestamp}_{filename}"
                    
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    photo_path = os.path.join(UPLOAD_FOLDER, photo_filename)
                    photo.save(photo_path)
            
            # Criar novo estagiário
            intern = Intern(
                name=form.name.data,
                email=form.email.data,
                phone=form.phone.data,
                cpf=form.cpf.data,
                birth_date=form.birth_date.data,
                student_id=form.student_id.data,
                university=form.university.data,
                course=form.course.data,
                semester=form.semester.data,
                expected_graduation=form.expected_graduation.data,
                supervisor_id=form.supervisor_id.data if form.supervisor_id.data else None,
                supervisor_name=dict(supervisors).get(form.supervisor_id.data, ''),
                start_date=form.start_date.data,
                end_date=form.end_date.data,
                status=InternStatus(form.status.data),
                bio=form.bio.data,
                skills=form.skills.data,
                goals=form.goals.data,
                photo_url=photo_filename,
                tenant_id=current_user.tenant_id,
                created_by=current_user.id
            )
            
            db.session.add(intern)
            db.session.commit()
            
            flash(f'Estagiário {intern.name} cadastrado com sucesso!', 'success')
            return redirect(url_for('mentoria_estagiarios.perfil_estagiario', id=intern.id))
            
        except Exception as e:
            db.session.rollback()
            flash('Erro ao cadastrar estagiário. Verifique os dados e tente novamente.', 'error')
            print(f"Erro ao criar estagiário: {e}")
    
    return render_template('mentoria/novo_estagiario.html', 
                         form=form, 
                         title='Novo Estagiário')

@mentoria_estagiarios_bp.route('/estagiario/<int:id>')
@login_required
def perfil_estagiario(id):
    """Perfil individual do estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    # Buscar dados relacionados
    assignments = CaseAssignment.query.filter_by(intern_id=id)\
                                    .join(EducationalCase)\
                                    .order_by(CaseAssignment.assigned_date.desc()).all()
    
    competencies = Competency.query.filter_by(intern_id=id).all()
    
    # Calcular estatísticas de progresso
    total_assignments = len(assignments)
    completed_assignments = len([a for a in assignments if a.status == AssignmentStatus.COMPLETED])
    pending_assignments = len([a for a in assignments if a.status == AssignmentStatus.PENDING])
    overdue_assignments = len([a for a in assignments if a.status == AssignmentStatus.OVERDUE])
    
    # Calcular dias restantes do estágio
    days_remaining = None
    if intern.end_date:
        days_remaining = (intern.end_date - date.today()).days
    
    # Avaliar progresso geral
    overall_progress = 0
    if total_assignments > 0:
        overall_progress = (completed_assignments / total_assignments) * 100
    
    progress_stats = {
        'total_assignments': total_assignments,
        'completed_assignments': completed_assignments,
        'pending_assignments': pending_assignments,
        'overdue_assignments': overdue_assignments,
        'completion_rate': overall_progress,
        'days_remaining': days_remaining,
        'average_score': 8.5  # Será calculado das avaliações reais
    }
    
    # Atividades recentes (simulado - será implementado com modelo real)
    recent_activities = [
        {
            'type': 'case_completed',
            'title': 'Caso de Lombalgia Concluído',
            'date': datetime.now() - timedelta(days=2),
            'description': 'Estudo de caso sobre lombalgia aguda finalizado com sucesso.'
        },
        {
            'type': 'evaluation',
            'title': 'Avaliação Prática',
            'date': datetime.now() - timedelta(days=5),
            'description': 'Avaliação de desempenho clínico - Nota: 9.0'
        }
    ]
    
    return render_template('mentoria/perfil_estagiario.html', 
                         intern=intern,
                         assignments=assignments,
                         competencies=competencies,
                         progress_stats=progress_stats,
                         recent_activities=recent_activities,
                         title=f'Perfil: {intern.name}')

@mentoria_estagiarios_bp.route('/estagiario/<int:id>/editar', methods=['GET', 'POST'])
@login_required
def editar_estagiario(id):
    """Edição de dados do estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    form = InternForm(obj=intern)
    
    # Carregar supervisores
    supervisors = [
        (1, 'Dr. Ana Costa - Supervisor Sênior'),
        (2, 'Carlos Martins - Fisioterapeuta'),
        (3, 'Dra. Maria Silva - Coordenadora'),
        (4, 'Dr. João Santos - Especialista Ortopédico')
    ]
    form.supervisor_id.choices = [('', 'Selecione um supervisor')] + supervisors
    
    if form.validate_on_submit():
        try:
            # Upload de nova foto
            if form.photo.data:
                photo = form.photo.data
                if allowed_file(photo.filename):
                    # Remover foto antiga
                    if intern.photo_url:
                        old_photo_path = os.path.join(UPLOAD_FOLDER, intern.photo_url)
                        if os.path.exists(old_photo_path):
                            os.remove(old_photo_path)
                    
                    filename = secure_filename(photo.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    photo_filename = f"{timestamp}_{filename}"
                    
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    photo_path = os.path.join(UPLOAD_FOLDER, photo_filename)
                    photo.save(photo_path)
                    intern.photo_url = photo_filename
            
            # Atualizar dados
            form.populate_obj(intern)
            intern.supervisor_name = dict(supervisors).get(form.supervisor_id.data, '')
            intern.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            flash(f'Dados de {intern.name} atualizados com sucesso!', 'success')
            return redirect(url_for('mentoria_estagiarios.perfil_estagiario', id=intern.id))
            
        except Exception as e:
            db.session.rollback()
            flash('Erro ao atualizar dados do estagiário.', 'error')
            print(f"Erro ao atualizar estagiário: {e}")
    
    return render_template('mentoria/editar_estagiario.html', 
                         form=form, 
                         intern=intern,
                         title=f'Editar: {intern.name}')

@mentoria_estagiarios_bp.route('/estagiario/<int:id>/cronograma')
@login_required
def cronograma_estagiario(id):
    """Cronograma de atividades do estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    # Buscar atividades (por enquanto simuladas - implementar modelo real)
    activities = [
        {
            'id': 1,
            'title': 'Aula Teórica: Anatomia da Coluna',
            'type': 'lecture',
            'start_date': date.today() + timedelta(days=1),
            'end_date': date.today() + timedelta(days=1),
            'hours': 2.0,
            'status': 'scheduled',
            'location': 'Sala de Aula 1',
            'description': 'Revisão da anatomia da coluna vertebral aplicada à fisioterapia.'
        },
        {
            'id': 2,
            'title': 'Prática Clínica: Avaliação Postural',
            'type': 'practice',
            'start_date': date.today() + timedelta(days=3),
            'end_date': date.today() + timedelta(days=3),
            'hours': 4.0,
            'status': 'scheduled',
            'location': 'Clínica',
            'description': 'Prática de avaliação postural em pacientes reais.'
        },
        {
            'id': 3,
            'title': 'Apresentação de Caso',
            'type': 'presentation',
            'start_date': date.today() + timedelta(days=7),
            'end_date': date.today() + timedelta(days=7),
            'hours': 1.0,
            'status': 'scheduled',
            'location': 'Auditório',
            'description': 'Apresentação do estudo de caso de lombalgia.'
        }
    ]
    
    # Calcular estatísticas do cronograma
    total_hours = sum(activity['hours'] for activity in activities)
    completed_activities = len([a for a in activities if a['status'] == 'completed'])
    scheduled_activities = len([a for a in activities if a['status'] == 'scheduled'])
    
    schedule_stats = {
        'total_activities': len(activities),
        'completed_activities': completed_activities,
        'scheduled_activities': scheduled_activities,
        'total_hours': total_hours,
        'completion_rate': (completed_activities / len(activities) * 100) if activities else 0
    }
    
    return render_template('mentoria/cronograma_estagiario.html',
                         intern=intern,
                         activities=activities,
                         schedule_stats=schedule_stats,
                         title=f'Cronograma: {intern.name}')

@mentoria_estagiarios_bp.route('/estagiario/<int:id>/deletar', methods=['POST'])
@login_required
def deletar_estagiario(id):
    """Desativar estagiário (soft delete)"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    try:
        intern.status = InternStatus.INACTIVE
        intern.updated_at = datetime.utcnow()
        db.session.commit()
        
        flash(f'Estagiário {intern.name} foi desativado com sucesso.', 'info')
        
    except Exception as e:
        db.session.rollback()
        flash('Erro ao desativar estagiário.', 'error')
        print(f"Erro ao deletar estagiário: {e}")
    
    return redirect(url_for('mentoria_estagiarios.listar_estagiarios'))

# APIs e funcionalidades extras
@mentoria_estagiarios_bp.route('/api/estagiarios/search')
@login_required
def api_buscar_estagiarios():
    """API para busca AJAX de estagiários"""
    search_term = request.args.get('q', '')
    limit = request.args.get('limit', 10, type=int)
    
    query = Intern.query.filter_by(tenant_id=current_user.tenant_id)
    
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.filter(or_(
            Intern.name.ilike(search_pattern),
            Intern.email.ilike(search_pattern),
            Intern.student_id.ilike(search_pattern)
        ))
    
    interns = query.limit(limit).all()
    
    results = []
    for intern in interns:
        results.append({
            'id': intern.id,
            'name': intern.name,
            'email': intern.email,
            'student_id': intern.student_id,
            'university': intern.university,
            'semester': intern.semester,
            'status': intern.status.value,
            'photo_url': intern.photo_url,
            'supervisor_name': intern.supervisor_name
        })
    
    return jsonify(results)

@mentoria_estagiarios_bp.route('/relatorios/estagiarios/excel')
@login_required
def exportar_excel():
    """Exportar lista de estagiários para Excel"""
    interns = Intern.query.filter_by(tenant_id=current_user.tenant_id).order_by(Intern.name).all()
    
    data = []
    for intern in interns:
        data.append({
            'Nome': intern.name,
            'Email': intern.email,
            'Telefone': intern.phone or '-',
            'CPF': intern.cpf or '-',
            'Matrícula': intern.student_id,
            'Universidade': intern.university,
            'Curso': intern.course or 'Fisioterapia',
            'Semestre': intern.semester,
            'Supervisor': intern.supervisor_name or 'Não definido',
            'Data Início': intern.start_date.strftime('%d/%m/%Y') if intern.start_date else '-',
            'Data Término': intern.end_date.strftime('%d/%m/%Y') if intern.end_date else 'Em andamento',
            'Status': intern.status.value,
            'Cadastrado em': intern.created_at.strftime('%d/%m/%Y %H:%M')
        })
    
    df = pd.DataFrame(data)
    
    # Criar arquivo Excel em memória
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Estagiários', index=False)
        
        # Ajustar largura das colunas
        workbook = writer.book
        worksheet = writer.sheets['Estagiários']
        
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    output.seek(0)
    
    # Gerar nome do arquivo com timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'estagiarios_fisioflow_{timestamp}.xlsx'
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@mentoria_estagiarios_bp.route('/relatorios/estagiario/<int:id>/individual')
@login_required
def relatorio_individual(id):
    """Relatório individual completo do estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    # Buscar todos os dados do estagiário
    assignments = CaseAssignment.query.filter_by(intern_id=id).all()
    competencies = Competency.query.filter_by(intern_id=id).all()
    
    # Criar PDF em memória
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1*inch)
    story = []
    
    # Estilos
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        alignment=1,
        spaceAfter=30,
        textColor=colors.HexColor('#2c5aa0')
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Heading2'],
        fontSize=14,
        spaceAfter=20,
        textColor=colors.HexColor('#2c5aa0')
    )
    
    # Título
    title = Paragraph(f"Relatório Individual do Estagiário", title_style)
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Informações do estagiário
    subtitle = Paragraph("Dados do Estagiário", subtitle_style)
    story.append(subtitle)
    
    intern_data = [
        ['Nome:', intern.name],
        ['Matrícula:', intern.student_id],
        ['Universidade:', intern.university],
        ['Curso:', intern.course or 'Fisioterapia'],
        ['Semestre:', f'{intern.semester}º'],
        ['Supervisor:', intern.supervisor_name or 'Não definido'],
        ['Período:', f"{intern.start_date.strftime('%d/%m/%Y') if intern.start_date else '-'} a {intern.end_date.strftime('%d/%m/%Y') if intern.end_date else 'Em andamento'}"],
        ['Status:', intern.status.value.title()]
    ]
    
    intern_table = Table(intern_data, colWidths=[2*inch, 4*inch])
    intern_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.blackColor),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(intern_table)
    story.append(Spacer(1, 20))
    
    # Estatísticas de progresso
    if assignments:
        subtitle = Paragraph("Progresso de Casos", subtitle_style)
        story.append(subtitle)
        
        completed = len([a for a in assignments if a.status == AssignmentStatus.COMPLETED])
        total = len(assignments)
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        progress_data = [
            ['Total de Casos Atribuídos:', str(total)],
            ['Casos Concluídos:', str(completed)],
            ['Taxa de Conclusão:', f'{completion_rate:.1f}%'],
            ['Status Atual:', 'Em progresso' if completion_rate < 100 else 'Todos concluídos']
        ]
        
        progress_table = Table(progress_data, colWidths=[2*inch, 4*inch])
        progress_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.lightblue),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.blackColor),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(progress_table)
        story.append(Spacer(1, 20))
    
    # Rodapé
    story.append(Spacer(1, 30))
    footer = Paragraph(f"Relatório gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')} - FisioFlow", styles['Normal'])
    story.append(footer)
    
    # Construir PDF
    doc.build(story)
    buffer.seek(0)
    
    # Gerar nome do arquivo
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'relatorio_{intern.name.replace(" ", "_")}_{timestamp}.pdf'
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )

# Notificações automáticas (implementação básica)
@mentoria_estagiarios_bp.route('/api/notificacoes/estagiarios')
@login_required
def verificar_notificacoes():
    """Verificar e retornar notificações automáticas"""
    notifications = []
    
    # Estagiários próximos do fim do estágio
    ending_soon = Intern.query.filter(
        Intern.tenant_id == current_user.tenant_id,
        Intern.status == InternStatus.ACTIVE,
        Intern.end_date.isnot(None),
        Intern.end_date <= date.today() + timedelta(days=30),
        Intern.end_date > date.today()
    ).all()
    
    for intern in ending_soon:
        days_left = (intern.end_date - date.today()).days
        notifications.append({
            'type': 'warning',
            'title': 'Estágio próximo do fim',
            'message': f'{intern.name} termina o estágio em {days_left} dias',
            'intern_id': intern.id,
            'action_url': url_for('mentoria_estagiarios.perfil_estagiario', id=intern.id)
        })
    
    # Casos em atraso
    overdue_assignments = CaseAssignment.query.join(Intern).filter(
        Intern.tenant_id == current_user.tenant_id,
        CaseAssignment.due_date < date.today(),
        CaseAssignment.status != AssignmentStatus.COMPLETED
    ).all()
    
    for assignment in overdue_assignments:
        days_overdue = (date.today() - assignment.due_date).days
        notifications.append({
            'type': 'error',
            'title': 'Caso em atraso',
            'message': f'{assignment.intern.name} - Caso atrasado há {days_overdue} dias',
            'intern_id': assignment.intern_id,
            'action_url': url_for('mentoria_estagiarios.perfil_estagiario', id=assignment.intern_id)
        })
    
    return jsonify(notifications)