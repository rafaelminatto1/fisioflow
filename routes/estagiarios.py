# -*- coding: utf-8 -*-
"""
Rotas Flask para Gestão de Estagiários
Módulo responsável pelo CRUD completo de estagiários e suas funcionalidades.
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, abort, send_file
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from flask_wtf.file import FileField, FileAllowed
from wtforms import StringField, TextAreaField, SelectField, DateField, IntegerField, HiddenField
from wtforms.validators import DataRequired, Email, Length, NumberRange, Optional
from werkzeug.utils import secure_filename
from sqlalchemy import or_, and_
from datetime import datetime, date
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

from models.mentoria import db, Intern, EducationalCase, Competency, CaseAssignment, EducationalResource
from models.mentoria import InternStatus, CompetencyLevel, AssignmentStatus

estagiarios_bp = Blueprint('estagiarios', __name__, url_prefix='/mentoria')

# Configurações para upload de arquivos
UPLOAD_FOLDER = 'static/uploads/estagiarios'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Formulários Flask-WTF
class InternForm(FlaskForm):
    """Formulário para cadastro/edição de estagiário"""
    name = StringField('Nome Completo', validators=[DataRequired(), Length(min=2, max=100)])
    email = StringField('Email', validators=[DataRequired(), Email(), Length(max=120)])
    phone = StringField('Telefone', validators=[Length(max=20)])
    student_id = StringField('Matrícula', validators=[DataRequired(), Length(max=50)])
    university = StringField('Universidade', validators=[DataRequired(), Length(max=100)])
    semester = IntegerField('Semestre', validators=[DataRequired(), NumberRange(min=1, max=20)])
    supervisor_id = SelectField('Supervisor', coerce=int, validators=[Optional()])
    start_date = DateField('Data de Início', validators=[DataRequired()])
    end_date = DateField('Data de Término', validators=[Optional()])
    status = SelectField('Status', choices=[
        (InternStatus.ACTIVE.value, 'Ativo'),
        (InternStatus.INACTIVE.value, 'Inativo'),
        (InternStatus.COMPLETED.value, 'Concluído'),
        (InternStatus.SUSPENDED.value, 'Suspenso')
    ], validators=[DataRequired()])
    bio = TextAreaField('Biografia/Observações', validators=[Length(max=500)])
    photo = FileField('Foto do Estagiário', validators=[FileAllowed(ALLOWED_EXTENSIONS, 'Apenas imagens são permitidas!')])

class SearchForm(FlaskForm):
    """Formulário para busca e filtros"""
    search = StringField('Buscar por nome, email ou matrícula')
    status_filter = SelectField('Filtrar por Status', choices=[
        ('', 'Todos'),
        (InternStatus.ACTIVE.value, 'Ativo'),
        (InternStatus.INACTIVE.value, 'Inativo'),
        (InternStatus.COMPLETED.value, 'Concluído'),
        (InternStatus.SUSPENDED.value, 'Suspenso')
    ])
    supervisor_filter = SelectField('Filtrar por Supervisor', coerce=int)
    university_filter = StringField('Filtrar por Universidade')

class AssignmentForm(FlaskForm):
    """Formulário para atribuição de casos educacionais"""
    intern_id = HiddenField()
    case_id = SelectField('Caso Educacional', coerce=int, validators=[DataRequired()])
    assigned_date = DateField('Data de Atribuição', default=date.today, validators=[DataRequired()])
    due_date = DateField('Data de Entrega', validators=[DataRequired()])
    notes = TextAreaField('Observações', validators=[Length(max=500)])

# Rotas principais
@estagiarios_bp.route('/estagiarios')
@login_required
def list_interns():
    """Lista todos os estagiários com filtros e busca"""
    form = SearchForm()
    
    # Populate supervisor choices
    supervisors = db.session.query(Intern.supervisor_id, Intern.supervisor_name)\
                           .filter(Intern.supervisor_id.isnot(None))\
                           .distinct().all()
    form.supervisor_filter.choices = [('', 'Todos')] + [(s.supervisor_id, s.supervisor_name) for s in supervisors]
    
    # Base query
    query = Intern.query.filter_by(tenant_id=current_user.tenant_id)
    
    # Apply filters
    if request.args.get('search'):
        search_term = f"%{request.args.get('search')}%"
        query = query.filter(or_(
            Intern.name.ilike(search_term),
            Intern.email.ilike(search_term),
            Intern.student_id.ilike(search_term)
        ))
    
    if request.args.get('status_filter'):
        query = query.filter(Intern.status == request.args.get('status_filter'))
    
    if request.args.get('supervisor_filter'):
        query = query.filter(Intern.supervisor_id == int(request.args.get('supervisor_filter')))
    
    if request.args.get('university_filter'):
        university_term = f"%{request.args.get('university_filter')}%"
        query = query.filter(Intern.university.ilike(university_term))
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = 10
    interns = query.order_by(Intern.name).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    # Statistics for dashboard
    stats = {
        'total_interns': Intern.query.filter_by(tenant_id=current_user.tenant_id).count(),
        'active_interns': Intern.query.filter_by(tenant_id=current_user.tenant_id, status=InternStatus.ACTIVE).count(),
        'completed_interns': Intern.query.filter_by(tenant_id=current_user.tenant_id, status=InternStatus.COMPLETED).count(),
        'pending_assignments': CaseAssignment.query.join(Intern).filter(
            Intern.tenant_id == current_user.tenant_id,
            CaseAssignment.status == AssignmentStatus.PENDING
        ).count()
    }
    
    return render_template('estagiarios/list.html', 
                         interns=interns, 
                         form=form, 
                         stats=stats,
                         title='Gestão de Estagiários')

@estagiarios_bp.route('/estagiario/novo', methods=['GET', 'POST'])
@login_required
def create_intern():
    """Cria um novo estagiário"""
    form = InternForm()
    
    # Populate supervisor choices (get from users table or predefined list)
    # For now, using a simple list - in production, this would come from a users table
    supervisors = [
        (1, 'Dr. Ana Costa'),
        (2, 'Carlos Martins'),
        (3, 'Dra. Maria Silva')
    ]
    form.supervisor_id.choices = [('', 'Selecione um supervisor')] + supervisors
    
    if form.validate_on_submit():
        try:
            # Handle photo upload
            photo_filename = None
            if form.photo.data:
                photo = form.photo.data
                if allowed_file(photo.filename):
                    filename = secure_filename(photo.filename)
                    # Create unique filename
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    photo_filename = f"{timestamp}_{filename}"
                    
                    # Ensure upload directory exists
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    
                    photo.save(os.path.join(UPLOAD_FOLDER, photo_filename))
            
            # Create new intern
            intern = Intern(
                name=form.name.data,
                email=form.email.data,
                phone=form.phone.data,
                student_id=form.student_id.data,
                university=form.university.data,
                semester=form.semester.data,
                supervisor_id=form.supervisor_id.data if form.supervisor_id.data else None,
                supervisor_name=dict(supervisors).get(form.supervisor_id.data, ''),
                start_date=form.start_date.data,
                end_date=form.end_date.data,
                status=InternStatus(form.status.data),
                bio=form.bio.data,
                photo_url=photo_filename,
                tenant_id=current_user.tenant_id,
                created_by=current_user.id
            )
            
            db.session.add(intern)
            db.session.commit()
            
            flash(f'Estagiário {intern.name} cadastrado com sucesso!', 'success')
            return redirect(url_for('estagiarios.view_intern', id=intern.id))
            
        except Exception as e:
            db.session.rollback()
            flash('Erro ao cadastrar estagiário. Tente novamente.', 'error')
            print(f"Error creating intern: {e}")
    
    return render_template('estagiarios/form.html', 
                         form=form, 
                         title='Novo Estagiário',
                         action='create')

@estagiarios_bp.route('/estagiario/<int:id>')
@login_required
def view_intern(id):
    """Visualiza detalhes de um estagiário específico"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    # Get assignments for this intern
    assignments = CaseAssignment.query.filter_by(intern_id=id)\
                                    .join(EducationalCase)\
                                    .order_by(CaseAssignment.assigned_date.desc()).all()
    
    # Get competencies progress
    competencies = Competency.query.filter_by(intern_id=id).all()
    
    # Calculate progress statistics
    total_assignments = len(assignments)
    completed_assignments = len([a for a in assignments if a.status == AssignmentStatus.COMPLETED])
    pending_assignments = len([a for a in assignments if a.status == AssignmentStatus.PENDING])
    overdue_assignments = len([a for a in assignments if a.status == AssignmentStatus.OVERDUE])
    
    progress_stats = {
        'total_assignments': total_assignments,
        'completed_assignments': completed_assignments,
        'pending_assignments': pending_assignments,
        'overdue_assignments': overdue_assignments,
        'completion_rate': (completed_assignments / total_assignments * 100) if total_assignments > 0 else 0
    }
    
    return render_template('estagiarios/detail.html', 
                         intern=intern,
                         assignments=assignments,
                         competencies=competencies,
                         progress_stats=progress_stats,
                         title=f'Estagiário: {intern.name}')

@estagiarios_bp.route('/estagiario/<int:id>/editar', methods=['GET', 'POST'])
@login_required
def edit_intern(id):
    """Edita dados de um estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    form = InternForm(obj=intern)
    
    # Populate supervisor choices
    supervisors = [
        (1, 'Dr. Ana Costa'),
        (2, 'Carlos Martins'),
        (3, 'Dra. Maria Silva')
    ]
    form.supervisor_id.choices = [('', 'Selecione um supervisor')] + supervisors
    
    if form.validate_on_submit():
        try:
            # Handle photo upload
            if form.photo.data:
                photo = form.photo.data
                if allowed_file(photo.filename):
                    # Delete old photo if exists
                    if intern.photo_url:
                        old_photo_path = os.path.join(UPLOAD_FOLDER, intern.photo_url)
                        if os.path.exists(old_photo_path):
                            os.remove(old_photo_path)
                    
                    filename = secure_filename(photo.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    photo_filename = f"{timestamp}_{filename}"
                    
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    photo.save(os.path.join(UPLOAD_FOLDER, photo_filename))
                    intern.photo_url = photo_filename
            
            # Update intern data
            intern.name = form.name.data
            intern.email = form.email.data
            intern.phone = form.phone.data
            intern.student_id = form.student_id.data
            intern.university = form.university.data
            intern.semester = form.semester.data
            intern.supervisor_id = form.supervisor_id.data if form.supervisor_id.data else None
            intern.supervisor_name = dict(supervisors).get(form.supervisor_id.data, '')
            intern.start_date = form.start_date.data
            intern.end_date = form.end_date.data
            intern.status = InternStatus(form.status.data)
            intern.bio = form.bio.data
            intern.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            flash(f'Dados de {intern.name} atualizados com sucesso!', 'success')
            return redirect(url_for('estagiarios.view_intern', id=intern.id))
            
        except Exception as e:
            db.session.rollback()
            flash('Erro ao atualizar dados do estagiário.', 'error')
            print(f"Error updating intern: {e}")
    
    return render_template('estagiarios/form.html', 
                         form=form, 
                         intern=intern,
                         title=f'Editar: {intern.name}',
                         action='edit')

@estagiarios_bp.route('/estagiario/<int:id>/deletar', methods=['POST'])
@login_required
def delete_intern(id):
    """Remove um estagiário (soft delete)"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    
    try:
        # Instead of hard delete, mark as inactive
        intern.status = InternStatus.INACTIVE
        intern.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        flash(f'Estagiário {intern.name} foi desativado com sucesso.', 'info')
        
    except Exception as e:
        db.session.rollback()
        flash('Erro ao remover estagiário.', 'error')
        print(f"Error deleting intern: {e}")
    
    return redirect(url_for('estagiarios.list_interns'))

@estagiarios_bp.route('/estagiario/<int:id>/atribuir-caso', methods=['GET', 'POST'])
@login_required
def assign_case(id):
    """Atribui um caso educacional a um estagiário"""
    intern = Intern.query.filter_by(id=id, tenant_id=current_user.tenant_id).first_or_404()
    form = AssignmentForm()
    form.intern_id.data = id
    
    # Get available educational cases
    cases = EducationalCase.query.filter_by(tenant_id=current_user.tenant_id, is_active=True).all()
    form.case_id.choices = [(case.id, f"{case.title} - {case.specialty}") for case in cases]
    
    if form.validate_on_submit():
        try:
            assignment = CaseAssignment(
                intern_id=form.intern_id.data,
                case_id=form.case_id.data,
                assigned_date=form.assigned_date.data,
                due_date=form.due_date.data,
                status=AssignmentStatus.PENDING,
                notes=form.notes.data,
                assigned_by=current_user.id
            )
            
            db.session.add(assignment)
            db.session.commit()
            
            flash('Caso educacional atribuído com sucesso!', 'success')
            return redirect(url_for('estagiarios.view_intern', id=id))
            
        except Exception as e:
            db.session.rollback()
            flash('Erro ao atribuir caso educacional.', 'error')
            print(f"Error assigning case: {e}")
    
    return render_template('estagiarios/assign_case.html', 
                         form=form, 
                         intern=intern,
                         title=f'Atribuir Caso - {intern.name}')

@estagiarios_bp.route('/api/estagiarios/search')
@login_required
def api_search_interns():
    """API endpoint para busca de estagiários (AJAX)"""
    search_term = request.args.get('q', '')
    
    query = Intern.query.filter_by(tenant_id=current_user.tenant_id)
    
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.filter(or_(
            Intern.name.ilike(search_pattern),
            Intern.email.ilike(search_pattern),
            Intern.student_id.ilike(search_pattern)
        ))
    
    interns = query.limit(10).all()
    
    results = []
    for intern in interns:
        results.append({
            'id': intern.id,
            'name': intern.name,
            'email': intern.email,
            'student_id': intern.student_id,
            'university': intern.university,
            'status': intern.status.value,
            'photo_url': intern.photo_url
        })
    
    return jsonify(results)

@estagiarios_bp.route('/relatorios/estagiarios/excel')
@login_required
def export_excel():
    """Exporta lista de estagiários para Excel"""
    interns = Intern.query.filter_by(tenant_id=current_user.tenant_id).all()
    
    data = []
    for intern in interns:
        data.append({
            'Nome': intern.name,
            'Email': intern.email,
            'Telefone': intern.phone,
            'Matrícula': intern.student_id,
            'Universidade': intern.university,
            'Semestre': intern.semester,
            'Supervisor': intern.supervisor_name,
            'Data Início': intern.start_date.strftime('%d/%m/%Y') if intern.start_date else '',
            'Data Término': intern.end_date.strftime('%d/%m/%Y') if intern.end_date else '',
            'Status': intern.status.value,
            'Criado em': intern.created_at.strftime('%d/%m/%Y %H:%M')
        })
    
    df = pd.DataFrame(data)
    
    # Create Excel file in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Estagiários', index=False)
    
    output.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'estagiarios_{timestamp}.xlsx'
    
    return send_file(
        output,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename
    )

@estagiarios_bp.route('/relatorios/estagiarios/pdf')
@login_required
def export_pdf():
    """Exporta relatório de estagiários em PDF"""
    interns = Intern.query.filter_by(tenant_id=current_user.tenant_id).order_by(Intern.name).all()
    
    # Create PDF in memory
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,  # Center alignment
        spaceAfter=30,
    )
    
    # Title
    title = Paragraph("Relatório de Estagiários", title_style)
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Summary stats
    stats_data = [
        ['Total de Estagiários', str(len(interns))],
        ['Ativos', str(len([i for i in interns if i.status == InternStatus.ACTIVE]))],
        ['Concluídos', str(len([i for i in interns if i.status == InternStatus.COMPLETED]))],
        ['Data do Relatório', datetime.now().strftime('%d/%m/%Y %H:%M')]
    ]
    
    stats_table = Table(stats_data, colWidths=[3*inch, 2*inch])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.blackColor),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(stats_table)
    story.append(Spacer(1, 20))
    
    # Intern details table
    if interns:
        data = [['Nome', 'Matrícula', 'Universidade', 'Status', 'Supervisor']]
        
        for intern in interns:
            data.append([
                intern.name[:25] + '...' if len(intern.name) > 25 else intern.name,
                intern.student_id,
                intern.university[:20] + '...' if len(intern.university) > 20 else intern.university,
                intern.status.value,
                intern.supervisor_name[:15] + '...' if intern.supervisor_name and len(intern.supervisor_name) > 15 else intern.supervisor_name or 'N/A'
            ])
        
        table = Table(data, colWidths=[1.5*inch, 1*inch, 1.5*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f'relatorio_estagiarios_{timestamp}.pdf'
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename
    )