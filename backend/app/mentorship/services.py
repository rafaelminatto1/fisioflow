from datetime import datetime, timedelta
from sqlalchemy import func, and_, or_
from .models import (
    Intern, Competency, InternCompetency, EducationalCase, 
    EducationalResource, CaseAnalysis, Tag, Specialty, 
    MentorshipSession, StudyPlan, CompetencyStatus, 
    CaseDifficulty, ResourceType
)
from ..database import db

class MentorshipService:
    """Serviço para lógica de negócio do módulo de mentoria"""
    
    @staticmethod
    def calculate_intern_progress(intern_id):
        """Calcula o progresso geral de um estagiário"""
        try:
            # Buscar todas as competências do estagiário
            competencies = db.session.query(
                InternCompetency
            ).filter(
                InternCompetency.intern_id == intern_id
            ).all()
            
            if not competencies:
                return {
                    'overall_progress': 0.0,
                    'completed_competencies': 0,
                    'total_competencies': 0,
                    'total_hours': 0.0,
                    'average_grade': 0.0
                }
            
            total_competencies = len(competencies)
            completed_competencies = sum(
                1 for comp in competencies 
                if comp.status == CompetencyStatus.COMPLETED
            )
            
            total_progress = sum(
                comp.progress_percentage or 0 
                for comp in competencies
            )
            overall_progress = total_progress / total_competencies if total_competencies > 0 else 0
            
            total_hours = sum(
                comp.hours_completed or 0 
                for comp in competencies
            )
            
            grades = [comp.grade for comp in competencies if comp.grade is not None]
            average_grade = sum(grades) / len(grades) if grades else 0
            
            return {
                'overall_progress': round(overall_progress, 2),
                'completed_competencies': completed_competencies,
                'total_competencies': total_competencies,
                'total_hours': round(total_hours, 2),
                'average_grade': round(average_grade, 2)
            }
            
        except Exception as e:
            raise Exception(f"Erro ao calcular progresso: {str(e)}")
    
    @staticmethod
    def get_dashboard_metrics():
        """Calcula métricas para o dashboard"""
        try:
            # Métricas básicas
            total_interns = db.session.query(Intern).filter(Intern.is_active == True).count()
            total_cases = db.session.query(EducationalCase).filter(EducationalCase.is_published == True).count()
            total_resources = db.session.query(EducationalResource).count()
            
            # Progresso das competências
            competency_stats = db.session.query(
                InternCompetency.status,
                func.count(InternCompetency.id).label('count')
            ).group_by(InternCompetency.status).all()
            
            competency_counts = {
                'NOT_STARTED': 0,
                'IN_PROGRESS': 0,
                'COMPLETED': 0
            }
            
            for stat in competency_stats:
                competency_counts[stat.status.value] = stat.count
            
            # Casos analisados recentemente
            last_month = datetime.utcnow() - timedelta(days=30)
            recent_analyses = db.session.query(CaseAnalysis).filter(
                CaseAnalysis.completed_at >= last_month,
                CaseAnalysis.is_completed == True
            ).count()
            
            # Horas totais de estudo
            total_hours = db.session.query(
                func.sum(InternCompetency.hours_completed)
            ).scalar() or 0
            
            # Média de notas
            avg_grade = db.session.query(
                func.avg(CaseAnalysis.grade)
            ).filter(
                CaseAnalysis.grade.isnot(None)
            ).scalar() or 0
            
            # Top estagiários
            top_interns = db.session.query(
                Intern.id,
                Intern.name,
                func.avg(InternCompetency.progress_percentage).label('avg_progress')
            ).join(
                InternCompetency
            ).group_by(
                Intern.id, Intern.name
            ).order_by(
                func.avg(InternCompetency.progress_percentage).desc()
            ).limit(5).all()
            
            return {
                'overview': {
                    'total_interns': total_interns,
                    'total_cases': total_cases,
                    'total_resources': total_resources,
                    'total_study_hours': float(total_hours)
                },
                'competencies': competency_counts,
                'recent_activity': {
                    'recent_case_analyses': recent_analyses,
                    'avg_case_grade': float(avg_grade)
                },
                'top_performers': [{
                    'id': intern.id,
                    'name': intern.name,
                    'avg_progress': float(intern.avg_progress or 0)
                } for intern in top_interns]
            }
            
        except Exception as e:
            raise Exception(f"Erro ao calcular métricas do dashboard: {str(e)}")
    
    @staticmethod
    def create_study_plan(intern_id, competency_ids, start_date, end_date, title=None):
        """Cria um plano de estudo personalizado"""
        try:
            # Verificar se estagiário existe
            intern = db.session.query(Intern).filter(Intern.id == intern_id).first()
            if not intern:
                raise Exception("Estagiário não encontrado")
            
            # Calcular horas totais baseado nas competências
            competencies = db.session.query(Competency).filter(
                Competency.id.in_(competency_ids)
            ).all()
            
            total_hours = sum(comp.required_hours for comp in competencies)
            
            # Criar plano de estudo
            study_plan = StudyPlan(
                intern_id=intern_id,
                title=title or f"Plano de Estudo - {intern.name}",
                description=f"Plano incluindo {len(competencies)} competências",
                start_date=start_date,
                end_date=end_date,
                total_hours=total_hours
            )
            
            db.session.add(study_plan)
            db.session.flush()
            
            # Criar registros de competências se não existirem
            for comp_id in competency_ids:
                existing = db.session.query(InternCompetency).filter(
                    and_(
                        InternCompetency.intern_id == intern_id,
                        InternCompetency.competency_id == comp_id
                    )
                ).first()
                
                if not existing:
                    intern_comp = InternCompetency(
                        intern_id=intern_id,
                        competency_id=comp_id,
                        status=CompetencyStatus.NOT_STARTED
                    )
                    db.session.add(intern_comp)
            
            db.session.commit()
            return study_plan
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao criar plano de estudo: {str(e)}")
    
    @staticmethod
    def submit_case_analysis(intern_id, case_id, analysis_data):
        """Submete uma análise de caso clínico"""
        try:
            # Verificar se caso e estagiário existem
            case = db.session.query(EducationalCase).filter(
                EducationalCase.id == case_id
            ).first()
            if not case:
                raise Exception("Caso clínico não encontrado")
            
            intern = db.session.query(Intern).filter(
                Intern.id == intern_id
            ).first()
            if not intern:
                raise Exception("Estagiário não encontrado")
            
            # Verificar se já existe análise
            existing_analysis = db.session.query(CaseAnalysis).filter(
                and_(
                    CaseAnalysis.intern_id == intern_id,
                    CaseAnalysis.case_id == case_id
                )
            ).first()
            
            if existing_analysis:
                # Atualizar análise existente
                analysis = existing_analysis
            else:
                # Criar nova análise
                analysis = CaseAnalysis(
                    intern_id=intern_id,
                    case_id=case_id
                )
                db.session.add(analysis)
            
            # Atualizar dados da análise
            analysis.analysis_text = analysis_data.get('analysis_text', '')
            analysis.diagnosis_attempt = analysis_data.get('diagnosis_attempt')
            analysis.treatment_proposal = analysis_data.get('treatment_proposal')
            analysis.time_spent_minutes = analysis_data.get('time_spent_minutes')
            analysis.is_completed = analysis_data.get('is_completed', False)
            
            if analysis.is_completed:
                analysis.completed_at = datetime.utcnow()
            
            analysis.updated_at = datetime.utcnow()
            
            db.session.commit()
            return analysis
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao submeter análise: {str(e)}")
    
    @staticmethod
    def get_recommended_resources(intern_id, limit=5):
        """Retorna recursos recomendados para um estagiário"""
        try:
            # Buscar competências em progresso do estagiário
            in_progress_competencies = db.session.query(
                InternCompetency
            ).filter(
                and_(
                    InternCompetency.intern_id == intern_id,
                    InternCompetency.status == CompetencyStatus.IN_PROGRESS
                )
            ).all()
            
            if not in_progress_competencies:
                # Se não há competências em progresso, retornar recursos em destaque
                resources = db.session.query(EducationalResource).filter(
                    EducationalResource.is_featured == True
                ).order_by(
                    EducationalResource.rating_average.desc()
                ).limit(limit).all()
            else:
                # Buscar recursos relacionados às competências em progresso
                # (Esta lógica pode ser refinada baseada em tags, especialidades, etc.)
                resources = db.session.query(EducationalResource).filter(
                    EducationalResource.is_free == True
                ).order_by(
                    EducationalResource.rating_average.desc(),
                    EducationalResource.views_count.desc()
                ).limit(limit).all()
            
            return resources
            
        except Exception as e:
            raise Exception(f"Erro ao buscar recursos recomendados: {str(e)}")
    
    @staticmethod
    def schedule_mentorship_session(intern_id, mentor_id, session_data):
        """Agenda uma sessão de mentoria"""
        try:
            # Verificar se estagiário existe
            intern = db.session.query(Intern).filter(
                Intern.id == intern_id
            ).first()
            if not intern:
                raise Exception("Estagiário não encontrado")
            
            # Criar sessão de mentoria
            session = MentorshipSession(
                intern_id=intern_id,
                mentor_id=mentor_id,
                session_date=session_data['session_date'],
                duration_minutes=session_data.get('duration_minutes', 60),
                objectives=session_data.get('objectives'),
                is_completed=False
            )
            
            db.session.add(session)
            db.session.commit()
            
            return session
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao agendar sessão: {str(e)}")
    
    @staticmethod
    def update_intern_statistics(intern_id):
        """Atualiza estatísticas calculadas do estagiário"""
        try:
            intern = db.session.query(Intern).filter(
                Intern.id == intern_id
            ).first()
            
            if not intern:
                raise Exception("Estagiário não encontrado")
            
            # Calcular horas totais
            total_hours = db.session.query(
                func.sum(InternCompetency.hours_completed)
            ).filter(
                InternCompetency.intern_id == intern_id
            ).scalar() or 0
            
            # Calcular casos completados
            completed_cases = db.session.query(CaseAnalysis).filter(
                and_(
                    CaseAnalysis.intern_id == intern_id,
                    CaseAnalysis.is_completed == True
                )
            ).count()
            
            # Calcular média de notas
            avg_grade = db.session.query(
                func.avg(CaseAnalysis.grade)
            ).filter(
                and_(
                    CaseAnalysis.intern_id == intern_id,
                    CaseAnalysis.grade.isnot(None)
                )
            ).scalar() or 0
            
            # Atualizar estagiário
            intern.total_hours = float(total_hours)
            intern.completed_cases = completed_cases
            intern.average_grade = float(avg_grade)
            intern.updated_at = datetime.utcnow()
            
            db.session.commit()
            
            return {
                'total_hours': intern.total_hours,
                'completed_cases': intern.completed_cases,
                'average_grade': intern.average_grade
            }
            
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Erro ao atualizar estatísticas: {str(e)}")