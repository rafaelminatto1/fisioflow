
import React, { useMemo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { Appointment, Task, UserRole, SmartSummaryData, Patient, TeamInsight, DropoutRiskPrediction } from '../types.js';
import { IconCalendar, IconClipboardList, IconTrendingUp, IconUsers, IconFileText, IconDollarSign } from './icons/IconComponents.js';
import { generateDailyBriefing, generateTeamInsights, generateDropoutRiskPredictions } from '../services/geminiService.js';
import { useNotification } from '../hooks/useNotification.js';
import { useAppointments } from '../hooks/useAppointments.js';
import { useTasks } from '../hooks/useTasks.js';
import { useExerciseLogs } from '../hooks/useExerciseLogs.js';
import { usePatients } from '../hooks/usePatients.js';
import { useUsers } from '../hooks/useUsers.js';
import { useQuery } from '@tanstack/react-query';
import SmartSummary from './SmartSummary.js';
import TaskModal from './TaskModal.js';
import { useSessionNotes } from '../hooks/useSessionNotes.js';
import SessionNoteModal from './SessionNoteModal.js';
import { usePatientDetailData } from '../hooks/usePatientDetailData.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useSettings } from '../hooks/useSettings.js';
import TeamWidget from './TeamWidget.js';
import DropoutRiskWidget from './DropoutRiskWidget.js';
import EngagementWidget from './EngagementWidget.js';

const BentoBox = ({ children, className = '', style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
    <div className={`bento-box flex flex-col animate-slide-in-from-bottom ${className}`} style={style}>
        {children}
    </div>
);

const TodaysAgenda: React.FC<{ appointments: Appointment[], patients: Patient[] | undefined }> = ({ appointments, patients }) => (
    <>
        <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2"><IconCalendar/> Agenda de Hoje</h3>
        <div className="flex-1 overflow-y-auto -mr-3 pr-2">
            {appointments.length > 0 ? (
                <ul className="space-y-1">
                    {appointments.map(appt => {
                        const patient = patients?.find(p => p.id === appt.patientId);
                        return (
                             <li key={appt.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                                <div className="font-semibold text-slate-300 text-sm">
                                    {new Date(appt.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div className="w-px h-6 bg-slate-600"></div>
                                <div className="truncate">
                                    <p className="font-medium text-slate-200 truncate">{patient?.name || 'Bloqueio'}</p>
                                    <p className="text-xs text-slate-400 truncate">{appt.title}</p>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : <div className="text-slate-400 text-sm h-full flex items-center justify-center"><p>Nenhuma sessão agendada para hoje.</p></div>}
        </div>
    </>
);

const TopTasks: React.FC<{ tasks: Task[], onSelectTask: (task: Task) => void }> = ({ tasks, onSelectTask }) => (
    <>
        <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2"><IconClipboardList/> Suas Tarefas Urgentes</h3>
        <div className="flex-1 overflow-y-auto -mr-3 pr-2">
            {tasks.length > 0 ? (
                 <ul className="space-y-1">
                    {tasks.map(task => (
                        <li key={task.id}>
                            <button onClick={() => onSelectTask(task)} className="w-full text-left p-2 rounded-md hover:bg-slate-700/50 transition-colors group">
                                <p className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{task.title}</p>
                                <p className="text-xs text-slate-400">Prioridade: {task.priority}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <div className="text-slate-400 text-sm h-full flex items-center justify-center"><p>Nenhuma tarefa urgente. Bom trabalho!</p></div>}
        </div>
    </>
);

const UndocumentedSessions: React.FC<{ sessions: Appointment[], onSelectSession: (appointment: Appointment) => void, patients: Patient[] | undefined }> = ({ sessions, onSelectSession, patients }) => (
     <>
        <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2"><IconFileText/> Sessões para Documentar</h3>
        <div className="flex-1 overflow-y-auto -mr-3 pr-2">
            {sessions.length > 0 ? (
                 <ul className="space-y-1">
                    {sessions.map(appt => (
                         <li key={appt.id}>
                            <button onClick={() => onSelectSession(appt)} className="w-full text-left p-2 rounded-md hover:bg-slate-700/50 transition-colors group">
                                <p className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{patients?.find(p => p.id === appt.patientId)?.name}</p>
                                <p className="text-xs text-slate-400">{new Date(appt.start).toLocaleDateString('pt-BR')}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : <div className="text-slate-400 text-sm h-full flex items-center justify-center"><p>Nenhuma sessão pendente de documentação.</p></div>}
        </div>
    </>
);

const QuickStats: React.FC<{ stats: { activePatients: number, sessionsToday: number, monthlyRevenue: number } }> = ({ stats }) => (
    <>
        <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2"><IconTrendingUp/> Métricas Rápidas</h3>
        <div className="space-y-3">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-md bg-slate-700/50 flex items-center justify-center text-blue-400"><IconUsers size={20}/></div>
                 <div>
                     <p className="text-xl font-bold text-slate-50">{stats.activePatients}</p>
                     <p className="text-xs text-slate-400">Pacientes Ativos</p>
                 </div>
            </div>
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-md bg-slate-700/50 flex items-center justify-center text-emerald-400"><IconCalendar size={20}/></div>
                 <div>
                     <p className="text-xl font-bold text-slate-50">{stats.sessionsToday}</p>
                     <p className="text-xs text-slate-400">Sessões Hoje</p>
                 </div>
            </div>
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-md bg-slate-700/50 flex items-center justify-center text-amber-400"><IconDollarSign size={20}/></div>
                 <div>
                     <p className="text-xl font-bold text-slate-50">R$ {stats.monthlyRevenue.toFixed(2)}</p>
                     <p className="text-xs text-slate-400">Receita no Mês</p>
                 </div>
            </div>
        </div>
    </>
);


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    // Data hooks
    const appointmentsQuery = useAppointments();
    const tasksQuery = useTasks();
    const exerciseLogsQuery = useExerciseLogs();
    const patientsQuery = usePatients();
    const transactionsQuery = useTransactions();
    const usersQuery = useUsers();
    const sessionNotesQuery = useSessionNotes();
    const { settings } = useSettings();
    
    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | Partial<Task> | null>(null);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [selectedAppointmentForNote, setSelectedAppointmentForNote] = useState<Appointment | null>(null);
    
    const { addNotification } = useNotification();
    
    const isDashboardLoading = appointmentsQuery.isLoading || tasksQuery.isLoading || patientsQuery.isLoading || transactionsQuery.isLoading || usersQuery.isLoading || exerciseLogsQuery.isLoading || sessionNotesQuery.isLoading;

    // AI Widget Hooks
    const { data: teamInsights, isLoading: isLoadingTeamInsights } = useQuery<TeamInsight[] | null, Error>({
        queryKey: ['teamInsights', user?.id],
        queryFn: async () => {
            if (!user || user.role !== UserRole.ADMIN) return null;
            
            const tasksCompleted = tasksQuery.tasks?.filter(t => t.status === 'done').length || 0;
            const tasksPending = tasksQuery.tasks?.filter(t => t.status !== 'done').length || 0;
            const tasksInReview = tasksQuery.tasks?.filter(t => t.status === 'review').length || 0;
            const teamMembers = usersQuery.users?.filter(u => u.role !== UserRole.PACIENTE).length || 0;
            
            const context = `
                Dados da Clínica:
                - Membros da equipe: ${teamMembers}
                - Tarefas concluídas: ${tasksCompleted}
                - Tarefas pendentes: ${tasksPending}
                - Tarefas em revisão: ${tasksInReview}
            `;
            return generateTeamInsights(context);
        },
        enabled: !!user && user.role === UserRole.ADMIN && !isDashboardLoading && (settings?.aiSmartSummaryEnabled ?? true),
        staleTime: 1000 * 60 * 30, // 30 minutes
    });

    const { data: dropoutPredictions, isLoading: isLoadingDropout } = useQuery<DropoutRiskPrediction[], Error>({
        queryKey: ['dropoutPredictions', user?.id],
        queryFn: async () => {
            if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.FISIOTERAPEUTA)) return [];
            
            const patientContext = (patientsQuery.patients || []).map(p => {
                const lastLog = [...(exerciseLogsQuery.exerciseLogs || [])]
                    .filter(l => l.patientId === p.id)
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                const lastAppointment = [...(appointmentsQuery.appointments || [])]
                     .filter(a => a.patientId === p.id && a.status === 'realizado')
                     .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
                
                return `ID: ${p.id}, Último exercício: ${lastLog ? new Date(lastLog.date).toLocaleDateString() : 'Nunca'}, Última dor: ${lastLog?.painLevel || 'N/A'}, Última consulta: ${lastAppointment ? new Date(lastAppointment.start).toLocaleDateString() : 'N/A'}`;
            }).join('\n');
            
            return generateDropoutRiskPredictions(patientContext);
        },
        enabled: !!user && (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA) && !isDashboardLoading && (settings?.aiSmartSummaryEnabled ?? true),
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const { data: summaryData, isLoading: isLoadingSummary, refetch: fetchSummary } = useQuery<SmartSummaryData, Error>({
        queryKey: ['smartSummary', user?.id],
        queryFn: async () => {
            if (!user || user.role === UserRole.ESTAGIARIO || !tasksQuery.tasks) {
                throw new Error("Usuário não autorizado ou dados insuficientes.");
            }
            const myTasks = tasksQuery.tasks.filter(t => t.assigneeId === user.id && t.status !== 'done');
            const context = `Agendamentos de Hoje: ${todaysAppointments.length}, Tarefas Pendentes: ${myTasks.length}`;
            return generateDailyBriefing(user.name, context);
        },
        enabled: !!user && !isDashboardLoading && (settings?.aiSmartSummaryEnabled ?? true),
        staleTime: 1000 * 60 * 15, // 15 minutes
    });


    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    
    const todaysAppointments = useMemo(() => {
        if (!user || !appointmentsQuery.appointments) return [];
        return appointmentsQuery.appointments
            .filter(a => a.start.startsWith(todayStr) && (user.role === UserRole.ADMIN || a.therapistId === user.id))
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [appointmentsQuery.appointments, user, todayStr]);

    const topTasks = useMemo(() => {
        if (!user || !tasksQuery.tasks) return [];
        const now = new Date();
        return tasksQuery.tasks
            .filter(t => t.assigneeId === user.id && t.status !== 'done')
            .sort((a,b) => {
                const aOverdue = a.dueDate && new Date(a.dueDate) < now;
                const bOverdue = b.dueDate && new Date(b.dueDate) < now;
                if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
                if(a.priority === 'urgent') return -1;
                if(b.priority === 'urgent') return 1;
                if(a.priority === 'high') return -1;
                if(b.priority === 'high') return 1;
                return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
            })
            .slice(0, 5);
    }, [tasksQuery.tasks, user]);

    const quickStats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthlyRevenue = (transactionsQuery.transactions || [])
            .filter(t => {
                if (t.status !== 'pago' || !t.paidDate) return false;
                const paidDate = new Date(t.paidDate);
                return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            activePatients: (patientsQuery.patients || []).length,
            sessionsToday: todaysAppointments.length,
            monthlyRevenue,
        };
    }, [patientsQuery.patients, todaysAppointments, transactionsQuery.transactions]);

    const undocumentedSessions = useMemo(() => {
        return (appointmentsQuery.appointments || [])
            .filter(appt => appt.status === 'realizado' && !appt.sessionNoteId && (user?.role === UserRole.ADMIN || appt.therapistId === user?.id))
            .sort((a, b) => new Date(b.start).getTime() - new Date(b.start).getTime())
            .slice(0, 5);
    }, [appointmentsQuery.appointments, user?.id, user?.role]);

    // --- Task Modal Handlers ---
    const handleOpenTaskModal = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setSelectedTask(null);
    };

    const handleSaveTask = async (task: Task) => {
        try {
            await tasksQuery.saveTask(task);
            addNotification({type: 'success', title: 'Tarefa Salva', message: `A tarefa "${task.title}" foi salva.`});
            handleCloseTaskModal();
        } catch (e) {
            addNotification({type: 'error', title: 'Erro ao Salvar', message: (e as Error).message});
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        try {
            await tasksQuery.deleteTask({ taskId, userId: user!.id });
            addNotification({type: 'info', title: 'Tarefa Excluída', message: `A tarefa foi excluída.`});
            handleCloseTaskModal();
        } catch (e) {
            addNotification({type: 'error', title: 'Erro ao Excluir', message: (e as Error).message});
        }
    };

    // --- Session Note Modal Handlers ---
    const handleOpenNoteModal = (appointment: Appointment) => {
        setSelectedAppointmentForNote(appointment);
        setIsNoteModalOpen(true);
    };
    const {
        patient: patientForNote,
        patientAssessments,
        patientSessionNotes
    } = usePatientDetailData(selectedAppointmentForNote?.patientId || null);

    const handleSaveNote = async (note: any) => {
        await sessionNotesQuery.saveSessionNote({note, userId: user!.id});
        setIsNoteModalOpen(false);
        addNotification({type: 'success', title: 'Nota Salva', message: 'A nota da sessão foi salva.'});
    }

    const onSelectPatient = (patientId: string) => {
        navigate(`/patients/${patientId}`);
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Olá, {user?.name.split(' ')[0]}!</h1>
            
             <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <BentoBox className="lg:col-span-4" style={{ animationDelay: '100ms' }}>
                    {settings?.aiSmartSummaryEnabled ? (
                         <SmartSummary summary={summaryData || null} isLoading={isLoadingSummary} error={null} onRegenerate={fetchSummary} />
                    ): (
                        <div className="p-4 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                            <p className="font-semibold">O resumo inteligente está desativado.</p>
                            <p className="text-xs mt-1">Você pode reativá-lo na tela de Configurações da Clínica.</p>
                        </div>
                    )}
                </BentoBox>

                <BentoBox className="lg:col-span-2 min-h-[300px]" style={{ animationDelay: '200ms' }}>
                    <TodaysAgenda appointments={todaysAppointments} patients={patientsQuery.patients}/>
                </BentoBox>
                
                <BentoBox className="min-h-[300px]" style={{ animationDelay: '300ms' }}>
                   <TopTasks tasks={topTasks} onSelectTask={handleOpenTaskModal} />
                </BentoBox>

                <BentoBox className="min-h-[300px]" style={{ animationDelay: '400ms' }}>
                   <QuickStats stats={quickStats} />
                </BentoBox>
                
                 <BentoBox className="lg:col-span-2 min-h-[300px]" style={{ animationDelay: '500ms' }}>
                    <EngagementWidget exerciseLogs={exerciseLogsQuery.exerciseLogs || []} />
                </BentoBox>

                <BentoBox className="lg:col-span-2 min-h-[300px]" style={{ animationDelay: '600ms' }}>
                    <UndocumentedSessions sessions={undocumentedSessions} onSelectSession={handleOpenNoteModal} patients={patientsQuery.patients} />
                </BentoBox>

                {(user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA) && (
                    <BentoBox className="lg:col-span-2 min-h-[300px]" style={{ animationDelay: '700ms' }}>
                        <DropoutRiskWidget 
                            predictions={dropoutPredictions} 
                            patients={patientsQuery.patients}
                            isLoading={isLoadingDropout}
                            onSelectPatient={onSelectPatient}
                        />
                    </BentoBox>
                )}

                {user?.role === UserRole.ADMIN && (
                     <BentoBox className="lg:col-span-2 min-h-[300px]" style={{ animationDelay: '800ms' }}>
                        <TeamWidget insights={teamInsights} isLoading={isLoadingTeamInsights} />
                    </BentoBox>
                )}
            </div>

            {isTaskModalOpen && (
                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={handleCloseTaskModal}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    task={selectedTask}
                    users={usersQuery.users || []}
                    patients={patientsQuery.patients || []}
                />
            )}

            {isNoteModalOpen && selectedAppointmentForNote && patientForNote && (
                <SessionNoteModal
                    isOpen={isNoteModalOpen}
                    onClose={() => setIsNoteModalOpen(false)}
                    onSave={handleSaveNote}
                    onDelete={(noteId) => sessionNotesQuery.deleteSessionNote({noteId, userId: user!.id})}
                    appointment={selectedAppointmentForNote}
                    patient={patientForNote}
                    allPatientAssessments={patientAssessments}
                    allPatientSessionNotes={patientSessionNotes}
                    onCloseAndScheduleNext={() => {}}
                    onCloseAndCreateTask={() => {}}
                />
            )}
        </div>
    );
};

export default Dashboard;