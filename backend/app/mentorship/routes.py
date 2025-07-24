
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta
from .models import (
    Intern, Competency, InternCompetency, EducationalCase, 
    EducationalResource, CaseAnalysis, Tag, Specialty, 
    MentorshipSession, StudyPlan, CompetencyStatus, 
    CaseDifficulty, ResourceType
)
from ..database import db

mentorship_bp = Blueprint(
    'mentorship_bp',
    __name__,
    url_prefix='/api/mentorship'
)

# -- Dashboard Endpoints --
@mentorship_bp.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Retorna métricas agregadas para o dashboard de mentoria"""
    try:
        # Estatísticas gerais
        total_interns = db.session.query(Intern).filter(Intern.is_active == True).count()
        total_cases = db.session.query(EducationalCase).filter(EducationalCase.is_published == True).count()
        total_resources = db.session.query(EducationalResource).count()
        
        # Estatísticas de progresso
        completed_competencies = db.session.query(InternCompetency).filter(
            InternCompetency.status == CompetencyStatus.COMPLETED
        ).count()
        
        in_progress_competencies = db.session.query(InternCompetency).filter(
            InternCompetency.status == CompetencyStatus.IN_PROGRESS
        ).count()
        
        # Casos analisados no último mês
        last_month = datetime.utcnow() - timedelta(days=30)
        recent_case_analyses = db.session.query(CaseAnalysis).filter(
            CaseAnalysis.completed_at >= last_month,
            CaseAnalysis.is_completed == True
        ).count()
        
        # Horas de estudo totais
        total_study_hours = db.session.query(func.sum(Intern.total_hours)).scalar() or 0
        
        # Média de notas dos casos
        avg_case_grade = db.session.query(func.avg(CaseAnalysis.grade)).filter(
            CaseAnalysis.grade.isnot(None)
        ).scalar() or 0
        
        # Top 5 estagiários por progresso
        top_interns = db.session.query(
            Intern.id, Intern.name, 
            func.avg(InternCompetency.progress_percentage).label('avg_progress')
        ).join(InternCompetency).group_by(Intern.id, Intern.name).order_by(
            desc('avg_progress')
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'overview': {
                    'total_interns': total_interns,
                    'total_cases': total_cases,
                    'total_resources': total_resources,
                    'total_study_hours': float(total_study_hours)
                },
                'progress': {
                    'completed_competencies': completed_competencies,
                    'in_progress_competencies': in_progress_competencies,
                    'recent_case_analyses': recent_case_analyses,
                    'avg_case_grade': float(avg_case_grade)
                },
                'top_interns': [{
                    'id': intern.id,
                    'name': intern.name,
                    'avg_progress': float(intern.avg_progress or 0)
                } for intern in top_interns]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# -- Interns & Development Plans Endpoints --
@mentorship_bp.route('/interns', methods=['GET'])
def get_interns():
    """Lista todos os estagiários com filtros opcionais"""
    try:
        # Parâmetros de filtro
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Query base
        query = db.session.query(Intern).filter(Intern.is_active == is_active)
        
        # Paginação
        interns = query.offset((page - 1) * per_page).limit(per_page).all()
        total = query.count()
        
        return jsonify({
            'success': True,
            'data': {
                'interns': [{
                    'id': intern.id,
                    'name': intern.name,
                    'email': intern.email,
                    'phone': intern.phone,
                    'total_hours': float(intern.total_hours),
                    'completed_cases': intern.completed_cases,
                    'average_grade': float(intern.average_grade or 0),
                    'created_at': intern.created_at.isoformat()
                } for intern in interns],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/interns', methods=['POST'])
def create_intern():
    """Cadastra um novo estagiário"""
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['name', 'email']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo obrigatório: {field}'
                }), 400
        
        # Verificar se email já existe
        existing_intern = db.session.query(Intern).filter(
            Intern.email == data['email']
        ).first()
        
        if existing_intern:
            return jsonify({
                'success': False,
                'error': 'Email já cadastrado'
            }), 400
        
        # Criar novo estagiário
        intern = Intern(
            name=data['name'],
            email=data['email'],
            phone=data.get('phone'),
            is_active=True
        )
        
        db.session.add(intern)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': intern.id,
                'name': intern.name,
                'email': intern.email,
                'phone': intern.phone,
                'created_at': intern.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/interns/<int:intern_id>', methods=['GET'])
def get_intern_details(intern_id):
    """Detalhes de um estagiário, incluindo plano e progresso"""
    try:
        intern = db.session.query(Intern).filter(Intern.id == intern_id).first()
        
        if not intern:
            return jsonify({
                'success': False,
                'error': 'Estagiário não encontrado'
            }), 404
        
        # Buscar competências e progresso
        competencies = db.session.query(
            Competency, InternCompetency
        ).outerjoin(
            InternCompetency, 
            and_(InternCompetency.competency_id == Competency.id,
                 InternCompetency.intern_id == intern_id)
        ).order_by(Competency.order_index).all()
        
        # Buscar análises de casos recentes
        recent_analyses = db.session.query(CaseAnalysis).filter(
            CaseAnalysis.intern_id == intern_id
        ).order_by(desc(CaseAnalysis.updated_at)).limit(5).all()
        
        return jsonify({
            'success': True,
            'data': {
                'intern': {
                    'id': intern.id,
                    'name': intern.name,
                    'email': intern.email,
                    'phone': intern.phone,
                    'total_hours': float(intern.total_hours),
                    'completed_cases': intern.completed_cases,
                    'average_grade': float(intern.average_grade or 0)
                },
                'competencies': [{
                    'competency': {
                        'id': comp.id,
                        'name': comp.name,
                        'description': comp.description,
                        'required_hours': float(comp.required_hours),
                        'is_mandatory': comp.is_mandatory
                    },
                    'progress': {
                        'status': intern_comp.status.value if intern_comp else 'NOT_STARTED',
                        'progress_percentage': float(intern_comp.progress_percentage or 0) if intern_comp else 0,
                        'hours_completed': float(intern_comp.hours_completed or 0) if intern_comp else 0,
                        'grade': float(intern_comp.grade or 0) if intern_comp else None,
                        'mentor_feedback': intern_comp.mentor_feedback if intern_comp else None,
                        'started_at': intern_comp.started_at.isoformat() if intern_comp and intern_comp.started_at else None,
                        'completed_at': intern_comp.completed_at.isoformat() if intern_comp and intern_comp.completed_at else None
                    }
                } for comp, intern_comp in competencies],
                'recent_analyses': [{
                    'id': analysis.id,
                    'case_id': analysis.case_id,
                    'grade': float(analysis.grade or 0),
                    'is_completed': analysis.is_completed,
                    'completed_at': analysis.completed_at.isoformat() if analysis.completed_at else None
                } for analysis in recent_analyses]
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/interns/<int:intern_id>/competencies/<int:comp_id>', methods=['PUT'])
def update_intern_competency(intern_id, comp_id):
    """Atualiza o status/nota de uma competência para um estagiário"""
    try:
        data = request.get_json()
        
        # Verificar se estagiário existe
        intern = db.session.query(Intern).filter(Intern.id == intern_id).first()
        if not intern:
            return jsonify({
                'success': False,
                'error': 'Estagiário não encontrado'
            }), 404
        
        # Verificar se competência existe
        competency = db.session.query(Competency).filter(Competency.id == comp_id).first()
        if not competency:
            return jsonify({
                'success': False,
                'error': 'Competência não encontrada'
            }), 404
        
        # Buscar ou criar registro de competência do estagiário
        intern_comp = db.session.query(InternCompetency).filter(
            and_(InternCompetency.intern_id == intern_id,
                 InternCompetency.competency_id == comp_id)
        ).first()
        
        if not intern_comp:
            intern_comp = InternCompetency(
                intern_id=intern_id,
                competency_id=comp_id,
                status=CompetencyStatus.NOT_STARTED
            )
            db.session.add(intern_comp)
        
        # Atualizar campos
        if 'status' in data:
            intern_comp.status = CompetencyStatus(data['status'])
            if data['status'] == 'IN_PROGRESS' and not intern_comp.started_at:
                intern_comp.started_at = datetime.utcnow()
            elif data['status'] == 'COMPLETED':
                intern_comp.completed_at = datetime.utcnow()
        
        if 'progress_percentage' in data:
            intern_comp.progress_percentage = float(data['progress_percentage'])
        
        if 'hours_completed' in data:
            intern_comp.hours_completed = float(data['hours_completed'])
        
        if 'grade' in data:
            intern_comp.grade = float(data['grade'])
        
        if 'mentor_feedback' in data:
            intern_comp.mentor_feedback = data['mentor_feedback']
        
        intern_comp.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'status': intern_comp.status.value,
                'progress_percentage': float(intern_comp.progress_percentage or 0),
                'hours_completed': float(intern_comp.hours_completed or 0),
                'grade': float(intern_comp.grade or 0) if intern_comp.grade else None,
                'mentor_feedback': intern_comp.mentor_feedback,
                'updated_at': intern_comp.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# -- Educational Clinical Cases Endpoints --
@mentorship_bp.route('/cases', methods=['GET'])
def get_cases():
    """Lista casos clínicos com filtros opcionais"""
    try:
        # Parâmetros de filtro
        specialty_id = request.args.get('specialty_id', type=int)
        difficulty = request.args.get('difficulty')
        is_published = request.args.get('is_published', 'true').lower() == 'true'
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        
        # Query base
        query = db.session.query(EducationalCase).filter(
            EducationalCase.is_published == is_published
        )
        
        # Filtros
        if specialty_id:
            query = query.join(EducationalCase.specialties).filter(
                Specialty.id == specialty_id
            )
        
        if difficulty:
            query = query.filter(EducationalCase.difficulty == CaseDifficulty(difficulty))
        
        if search:
            query = query.filter(
                or_(
                    EducationalCase.title.ilike(f'%{search}%'),
                    EducationalCase.description.ilike(f'%{search}%')
                )
            )
        
        # Ordenação e paginação
        query = query.order_by(desc(EducationalCase.created_at))
        cases = query.offset((page - 1) * per_page).limit(per_page).all()
        total = query.count()
        
        return jsonify({
            'success': True,
            'data': {
                'cases': [{
                    'id': case.id,
                    'title': case.title,
                    'description': case.description,
                    'difficulty': case.difficulty.value,
                    'estimated_time_minutes': case.estimated_time_minutes,
                    'views_count': case.views_count,
                    'specialties': [{
                        'id': spec.id,
                        'name': spec.name
                    } for spec in case.specialties],
                    'created_at': case.created_at.isoformat()
                } for case in cases],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/cases', methods=['POST'])
def create_case():
    """Cria um novo caso clínico educacional"""
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['title', 'description', 'clinical_history', 'difficulty']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo obrigatório: {field}'
                }), 400
        
        # Criar novo caso
        case = EducationalCase(
            title=data['title'],
            description=data['description'],
            clinical_history=data['clinical_history'],
            physical_examination=data.get('physical_examination'),
            expected_outcomes=data.get('expected_outcomes'),
            difficulty=CaseDifficulty(data['difficulty']),
            estimated_time_minutes=data.get('estimated_time_minutes', 60),
            is_published=data.get('is_published', False)
        )
        
        db.session.add(case)
        db.session.flush()  # Para obter o ID
        
        # Associar especialidades se fornecidas
        if 'specialty_ids' in data:
            specialties = db.session.query(Specialty).filter(
                Specialty.id.in_(data['specialty_ids'])
            ).all()
            case.specialties = specialties
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': case.id,
                'title': case.title,
                'description': case.description,
                'difficulty': case.difficulty.value,
                'is_published': case.is_published,
                'created_at': case.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/cases/<int:case_id>', methods=['GET'])
def get_case_details(case_id):
    """Retorna detalhes completos de um caso clínico"""
    try:
        case = db.session.query(EducationalCase).filter(
            EducationalCase.id == case_id
        ).first()
        
        if not case:
            return jsonify({
                'success': False,
                'error': 'Caso não encontrado'
            }), 404
        
        # Incrementar contador de visualizações
        case.views_count += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': case.id,
                'title': case.title,
                'description': case.description,
                'clinical_history': case.clinical_history,
                'physical_examination': case.physical_examination,
                'expected_outcomes': case.expected_outcomes,
                'difficulty': case.difficulty.value,
                'estimated_time_minutes': case.estimated_time_minutes,
                'views_count': case.views_count,
                'is_published': case.is_published,
                'specialties': [{
                    'id': spec.id,
                    'name': spec.name,
                    'description': spec.description
                } for spec in case.specialties],
                'created_at': case.created_at.isoformat(),
                'updated_at': case.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# -- Educational Resources Endpoints --
@mentorship_bp.route('/resources', methods=['GET'])
def get_resources():
    """Lista recursos educacionais com filtros e busca"""
    try:
        # Parâmetros de filtro
        resource_type = request.args.get('resource_type')
        difficulty = request.args.get('difficulty')
        is_featured = request.args.get('is_featured')
        is_free = request.args.get('is_free')
        tags = request.args.getlist('tags')  # Lista de tags
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'created_at')  # created_at, rating, views
        
        # Query base
        query = db.session.query(EducationalResource)
        
        # Filtros
        if resource_type:
            query = query.filter(EducationalResource.resource_type == ResourceType(resource_type))
        
        if difficulty:
            query = query.filter(EducationalResource.difficulty_level == CaseDifficulty(difficulty))
        
        if is_featured is not None:
            query = query.filter(EducationalResource.is_featured == (is_featured.lower() == 'true'))
        
        if is_free is not None:
            query = query.filter(EducationalResource.is_free == (is_free.lower() == 'true'))
        
        if tags:
            query = query.join(EducationalResource.tags).filter(Tag.name.in_(tags))
        
        if search:
            query = query.filter(
                or_(
                    EducationalResource.title.ilike(f'%{search}%'),
                    EducationalResource.description.ilike(f'%{search}%'),
                    EducationalResource.author.ilike(f'%{search}%')
                )
            )
        
        # Ordenação
        if sort_by == 'rating':
            query = query.order_by(desc(EducationalResource.rating_average))
        elif sort_by == 'views':
            query = query.order_by(desc(EducationalResource.views_count))
        else:
            query = query.order_by(desc(EducationalResource.created_at))
        
        # Paginação
        resources = query.offset((page - 1) * per_page).limit(per_page).all()
        total = query.count()
        
        return jsonify({
            'success': True,
            'data': {
                'resources': [{
                    'id': resource.id,
                    'title': resource.title,
                    'description': resource.description,
                    'resource_type': resource.resource_type.value,
                    'author': resource.author,
                    'duration_minutes': resource.duration_minutes,
                    'difficulty_level': resource.difficulty_level.value if resource.difficulty_level else None,
                    'is_featured': resource.is_featured,
                    'is_free': resource.is_free,
                    'views_count': resource.views_count,
                    'downloads_count': resource.downloads_count,
                    'rating_average': float(resource.rating_average),
                    'rating_count': resource.rating_count,
                    'tags': [{
                        'id': tag.id,
                        'name': tag.name,
                        'color': tag.color
                    } for tag in resource.tags],
                    'created_at': resource.created_at.isoformat()
                } for resource in resources],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'pages': (total + per_page - 1) // per_page
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/resources', methods=['POST'])
def create_resource():
    """Adiciona um novo recurso educacional"""
    try:
        data = request.get_json()
        
        # Validação básica
        required_fields = ['title', 'resource_type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Campo obrigatório: {field}'
                }), 400
        
        # Criar novo recurso
        resource = EducationalResource(
            title=data['title'],
            description=data.get('description'),
            resource_type=ResourceType(data['resource_type']),
            content_url=data.get('content_url'),
            file_path=data.get('file_path'),
            author=data.get('author'),
            publication_date=datetime.fromisoformat(data['publication_date']) if data.get('publication_date') else None,
            duration_minutes=data.get('duration_minutes'),
            difficulty_level=CaseDifficulty(data['difficulty_level']) if data.get('difficulty_level') else None,
            is_featured=data.get('is_featured', False),
            is_free=data.get('is_free', True),
            added_by_id=data.get('added_by_id')  # ID do usuário que está adicionando
        )
        
        db.session.add(resource)
        db.session.flush()  # Para obter o ID
        
        # Associar tags se fornecidas
        if 'tag_names' in data:
            for tag_name in data['tag_names']:
                tag = db.session.query(Tag).filter(Tag.name == tag_name).first()
                if not tag:
                    tag = Tag(name=tag_name)
                    db.session.add(tag)
                resource.tags.append(tag)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': resource.id,
                'title': resource.title,
                'description': resource.description,
                'resource_type': resource.resource_type.value,
                'author': resource.author,
                'is_featured': resource.is_featured,
                'is_free': resource.is_free,
                'created_at': resource.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/resources/<int:resource_id>', methods=['GET'])
def get_resource_details(resource_id):
    """Retorna detalhes completos de um recurso educacional"""
    try:
        resource = db.session.query(EducationalResource).filter(
            EducationalResource.id == resource_id
        ).first()
        
        if not resource:
            return jsonify({
                'success': False,
                'error': 'Recurso não encontrado'
            }), 404
        
        # Incrementar contador de visualizações
        resource.views_count += 1
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'id': resource.id,
                'title': resource.title,
                'description': resource.description,
                'resource_type': resource.resource_type.value,
                'content_url': resource.content_url,
                'file_path': resource.file_path,
                'author': resource.author,
                'publication_date': resource.publication_date.isoformat() if resource.publication_date else None,
                'duration_minutes': resource.duration_minutes,
                'difficulty_level': resource.difficulty_level.value if resource.difficulty_level else None,
                'is_featured': resource.is_featured,
                'is_free': resource.is_free,
                'views_count': resource.views_count,
                'downloads_count': resource.downloads_count,
                'rating_average': float(resource.rating_average),
                'rating_count': resource.rating_count,
                'tags': [{
                    'id': tag.id,
                    'name': tag.name,
                    'color': tag.color
                } for tag in resource.tags],
                'created_at': resource.created_at.isoformat(),
                'updated_at': resource.updated_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# -- Utility Endpoints --
@mentorship_bp.route('/specialties', methods=['GET'])
def get_specialties():
    """Lista todas as especialidades disponíveis"""
    try:
        specialties = db.session.query(Specialty).order_by(Specialty.name).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': spec.id,
                'name': spec.name,
                'description': spec.description,
                'icon': spec.icon
            } for spec in specialties]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@mentorship_bp.route('/tags', methods=['GET'])
def get_tags():
    """Lista todas as tags disponíveis"""
    try:
        tags = db.session.query(Tag).order_by(Tag.name).all()
        
        return jsonify({
            'success': True,
            'data': [{
                'id': tag.id,
                'name': tag.name,
                'color': tag.color
            } for tag in tags]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
