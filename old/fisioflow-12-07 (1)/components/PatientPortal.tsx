import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Task, Patient, Prescription, Exercise, ExerciseLog, Appointment, User, PersonalGoal, VideoSubmission, TherapistGoal, FormSubmission, DailyLog, ChatMessage } from '../types.js';
import PatientFeedbackModal from './PatientFeedbackModal.js';
import ExerciseModal from './ExerciseModal.js';
import ExerciseFeedbackModal from './ExerciseFeedbackModal.js';
import { IconLogout, IconStethoscope, IconClipboardList, IconActivity, IconVideo, IconEdit, IconCalendar, IconTrendingUp, IconTrophy, IconPlus, IconTrash, IconCheckCircle, IconMessageCircle, IconCalendarCheck, IconUpload, IconAlertTriangle, IconClock, IconCrosshair, IconHistory, IconListChecks, IconBook } from './icons/IconComponents.js';
import GamificationWidget from './GamificationWidget.js';
import EmptyState from './ui/EmptyState.js';
import { ACHIEVEMENTS_LIST } from '../constants.js';
import AchievementBadge from './AchievementBadge.js';
import ChatInterface from './ChatInterface.js';
import { usePatients } from '../hooks/usePatients.js';
import { useTasks } from '../hooks/useTasks.js';
import { useAppointments } from '../hooks/useAppointments.js';
import { useExercises } from '../hooks/useExercises.js';
import { usePrescriptions } from '../hooks/usePrescriptions.js';
import { useExerciseLogs } from '../hooks/useExerciseLogs.js';
import { useUsers } from '../hooks/useUsers.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useNotification } from '../hooks/useNotification.js';
import { useVideoSubmissions } from '../hooks/useVideoSubmissions.js';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useTherapistGoals } from '../hooks/useTherapistGoals.js';
import VideoRecordingModal from './VideoRecordingModal.js';
import ExerciseHistoryModal from './ExerciseHistoryModal.js';
import { useFormSubmissions } from '../hooks/useFormSubmissions.js';
import { useFormTemplates } from '../hooks/useFormTemplates.js';
import { FillFormModal } from './FillFormModal.js';
import { SymptomDiaryModal } from './SymptomDiaryModal.js';
import { useDailyLogs } from '../hooks/useDailyLogs.js';
import { areOnSameDay } from '../utils.js';
import Button from './ui/Button.js';


// --- Re-usable sub-components for the new dashboard ---

const NextAppointmentCard: React.FC<{ appointment?: Appointment, therapist?: User | null }> = ({ appointment, therapist }) => (
    <div className="bg-blue-900/40 border border-blue-500/50 rounded-lg p-6 flex flex-col md:flex-row items-center justify-between gap-4 h-full">
        <div className="flex items-center gap-4">
            <IconCalendar size={40} className="text-blue-300"/>
            <div>
                <h3 className="text-xl font-bold text-white">Próxima Sessão</h3>
                {appointment ? (
                     <p className="text-blue-200 text-lg">
                        {new Date(appointment.start).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {new Date(appointment.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                ) : (
                    <p className="text-blue-200">Nenhuma sessão agendada.</p>
                )}
            </div>
        </div>
        {therapist && (
            <div className="flex items-center gap-3 bg-slate-900/50 p-3 rounded-lg">
                <img src={therapist.avatarUrl} alt={therapist.name} className="w-10 h-10 rounded-full"/>
                <div>
                    <p className="text-sm text-slate-400">com</p>
                    <p className="font-semibold text-slate-100">{therapist.name}</p>
                </div>
            </div>
        )}
    </div>
);

const submissionStatusClasses: Record<VideoSubmission['status'], string> = {
    pending_review: 'bg-amber-500/20 text-amber-300',
    approved: 'bg-emerald-500/20 text-emerald-300',
    needs_correction: 'bg-red-500/20 text-red-300',
};
const submissionIcons: Record<VideoSubmission['status'], React.ReactNode> = {
    pending_review: <IconClock size={12} />,
    approved: <IconCheckCircle size={12} />,
    needs_correction: <IconAlertTriangle size={12} />,
};
const submissionStatusText: Record<VideoSubmission['status'], string> = {
    pending_review: 'Em Análise',
    approved: 'Aprovado',
    needs_correction: 'Ajustar',
};

const getYouTubeThumbnail = (url: string) => {
    try {
        const videoId = new URL(url).pathname.split('/').pop();
        if (videoId) {
            return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        }
    } catch (e) {
        return null;
    }
    return null;
};

const PatientExerciseCard: React.FC<{
    prescription: Prescription;
    exercise: Exercise;
    latestSubmission?: VideoSubmission;
    onWatchVideo: () => void;
    onLogProgress: () => void;
    onSendVideo: () => void;
    onShowHistory: () => void;
}> = ({ prescription, exercise, latestSubmission, onWatchVideo, onLogProgress, onSendVideo, onShowHistory }) => {
    const thumbnailUrl = getYouTubeThumbnail(exercise.videoUrl);
    
    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden h-full">
            {latestSubmission && (
                <div className={`absolute top-2 right-2 flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${submissionStatusClasses[latestSubmission.status]}`} title={latestSubmission.therapistNotes}>
                    {submissionIcons[latestSubmission.status]}
                    {submissionStatusText[latestSubmission.status]}
                </div>
            )}
            <div>
                 {thumbnailUrl ? (
                    <div onClick={onWatchVideo} className="relative cursor-pointer group mb-4 rounded-lg overflow-hidden">
                        <img src={thumbnailUrl} alt={`Thumbnail for ${exercise.name}`} className="w-full h-auto object-cover" />
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <IconVideo className="text-white drop-shadow-lg" size={48} />
                        </div>
                         {exercise.duration && (
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                                <IconClock size={12} className="inline-block mr-1" />
                                {exercise.duration}s
                            </div>
                        )}
                    </div>
                 ) : (
                    <div className="w-full aspect-video bg-slate-900 mb-4 rounded-lg flex items-center justify-center">
                        <IconVideo className="text-slate-600" size={48} />
                    </div>
                 )}
                <h3 className="text-lg font-semibold text-slate-100 pr-20">{exercise.name}</h3>
                <div className="text-sm text-slate-300 my-2 space-y-1">
                    <p><span className="font-semibold text-slate-400">Séries:</span> {prescription.sets}</p>
                    <p><span className="font-semibold text-slate-400">Repetições:</span> {prescription.reps}</p>
                    <p><span className="font-semibold text-slate-400">Frequência:</span> {prescription.frequency}</p>
                    {prescription.notes && <p><span className="font-semibold text-slate-400">Notas:</span> {prescription.notes}</p>}
                </div>
            </div>
            {latestSubmission?.status === 'needs_correction' && latestSubmission.therapistNotes && (
                <div className="my-2 p-2 bg-red-900/30 rounded-md border border-red-500/30">
                    <p className="text-xs font-semibold text-red-300">Feedback do Fisioterapeuta:</p>
                    <p className="text-xs text-red-200 italic">"{latestSubmission.therapistNotes}"</p>
                </div>
            )}
            <div className="mt-4 flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                    <button
                        onClick={onLogProgress}
                        className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        <IconEdit size={16}/>
                        <span className="ml-2">Registrar</span>
                    </button>
                     <button onClick={onShowHistory} className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors" aria-label="Ver Histórico">
                        <IconHistory size={16}/>
                    </button>
                </div>
                <button
                    onClick={onWatchVideo}
                    className="w-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <IconVideo size={16}/>
                    <span className="ml-2">Ver Vídeo</span>
                </button>
                <button
                    onClick={onSendVideo}
                    className="w-full flex items-center justify-center bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                    <IconUpload size={16}/>
                    <span className="ml-2">Enviar Vídeo para Análise</span>
                </button>
            </div>
        </div>
    );
};


const appointmentStatusStyles: Record<Appointment['status'], string> = {
    realizado: 'bg-emerald-500/20 text-emerald-300',
    confirmado: 'bg-blue-500/20 text-blue-300',
    agendado: 'bg-amber-500/20 text-amber-300',
    cancelado: 'bg-red-500/20 text-red-300',
    em_atendimento: 'bg-purple-500/20 text-purple-300',
};

const AppointmentListCard: React.FC<{appointments: Appointment[]}> = ({ appointments }) => (
    <div className="space-y-3">
        {appointments.length > 0 ? (
            appointments.map(appt => (
                <div key={appt.id} className="p-3 bg-slate-900/50 rounded-md">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-200">{new Date(appt.start).toLocaleDateString('pt-BR', {day: '2-digit', month:'long', year: 'numeric'})}</p>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${appointmentStatusStyles[appt.status]}`}>{appt.status.replace('_', ' ')}</span>
                    </div>
                    <p className="text-sm text-slate-400">
                        {new Date(appt.start).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                        {' - '}
                        {new Date(appt.end).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                    </p>
                </div>
            ))
        ) : (
            <p className="text-slate-400 text-sm text-center py-4">Nenhuma sessão encontrada.</p>
        )}
    </div>
);

const ClinicalGoalCard: React.FC<{ goal: TherapistGoal }> = ({ goal }) => {
  const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;
  return (
    <div className="bg-slate-900/50 p-3 rounded-md">
      <p className="font-semibold text-slate-200 text-sm">{goal.description}</p>
      <div className="w-full bg-slate-700 rounded-full h-1.5 my-1.5">
        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, progress)}%` }}></div>
      </div>
      <p className="text-xs text-slate-400 text-right">
        {goal.currentValue} / {goal.targetValue} {goal.unit}
      </p>
    </div>
  );
};


// --- Main Patient Portal Component ---
type ActiveTab = 'metas' | 'sessoes' | 'evolucao' | 'diario';

const PatientPortal: React.FC = () => {
    const { user, logout } = useAuth();
    const { patients = [], addPersonalGoal, updatePersonalGoal, deletePersonalGoal } = usePatients();
    const { tasks = [], addTaskFeedback } = useTasks();
    const { appointments = [] } = useAppointments();
    const { exercises = [] } = useExercises();
    const { prescriptions = [] } = usePrescriptions();
    const { exerciseLogs = [], saveExerciseLog } = useExerciseLogs();
    const { users = [] } = useUsers();
    const { messages: chatMessages = [], sendMessage } = useChatMessages();
    const { addNotification } = useNotification();
    const { videoSubmissions = [], saveVideoSubmission } = useVideoSubmissions();
    const { goals: allTherapistGoals = [] } = useTherapistGoals();
    const { submissions: formSubmissions = [], saveSubmission: saveFormSubmission } = useFormSubmissions();
    const { templates: formTemplates = [] } = useFormTemplates();
    const { dailyLogs = [], saveDailyLog } = useDailyLogs();
    
    // UI State
    const [activeTab, setActiveTab] = useState<ActiveTab>('metas');

    // Modal States
    const [isTaskFeedbackModalOpen, setIsTaskFeedbackModalOpen] = useState(false);
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
    const [isExerciseFeedbackModalOpen, setIsExerciseFeedbackModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
    const [isFillFormModalOpen, setIsFillFormModalOpen] = useState(false);
    const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);

    // Selected Item States
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<Exercise | null>(null);
    const [exerciseForRecording, setExerciseForRecording] = useState<Exercise | null>(null);
    const [selectedFormSubmission, setSelectedFormSubmission] = useState<FormSubmission | null>(null);
    const [newGoalText, setNewGoalText] = useState('');
    const [highlightedPrescriptionId, setHighlightedPrescriptionId] = useState<string | null>(null);
    
    // --- Data processing with useMemo ---
    
    const patientProfile = useMemo(() => 
        patients.find(p => p.id === user?.patientProfileId), 
    [patients, user]);

    const patientPrescriptions = useMemo(() =>
        prescriptions.filter(p => p.patientId === patientProfile?.id),
    [prescriptions, patientProfile]);
        
    const nextAppointment = useMemo(() => 
        appointments
            .filter(a => a.patientId === patientProfile?.id && new Date(a.start) > new Date() && a.status !== 'cancelado')
            .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0],
    [appointments, patientProfile]);
    
    const therapistForNextAppointment = useMemo(() => {
        if (!patientProfile) return null;
        const mainTherapistId = tasks.find(t => t.patientId === patientProfile.id)?.assigneeId;
        return users.find(u => u.id === (nextAppointment?.therapistId || mainTherapistId));
    }, [users, nextAppointment, tasks, patientProfile]);
    
    const patientMessages = useMemo(() => 
        chatMessages.filter(m => m.patientId === patientProfile?.id)
                    .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [chatMessages, patientProfile]);

    const hasUnreadMessages = useMemo(() => {
        if (!user || !patientMessages || patientMessages.length === 0) return false;
        
        const lastPatientMessageTs = patientMessages
            .filter(m => m.senderId === user.id)
            .reduce((latest, m) => Math.max(latest, new Date(m.timestamp).getTime()), 0);

        return patientMessages.some(m => 
            m.senderId !== user.id && new Date(m.timestamp).getTime() > lastPatientMessageTs
        );
    }, [patientMessages, user]);

    const allAppointmentsSorted = useMemo(() => 
        appointments.filter(a => a.patientId === patientProfile?.id)
            .sort((a,b) => new Date(b.start).getTime() - new Date(b.start).getTime()),
    [appointments, patientProfile]);

    const progressChartData = useMemo(() => {
        if (!exerciseLogs || exerciseLogs.length === 0) return [];
        return exerciseLogs
            .filter(log => log.patientId === patientProfile?.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(log => ({
                date: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                Dor: log.painLevel,
                Dificuldade: log.difficultyLevel,
            })).slice(-15); // Show last 15 entries for clarity
    }, [exerciseLogs, patientProfile]);

    const latestSubmissions = useMemo(() => {
        const submissionMap = new Map<string, VideoSubmission>();
        videoSubmissions
            .filter(s => s.patientId === patientProfile?.id)
            .sort((a,b) => new Date(b.timestamp).getTime() - new Date(b.timestamp).getTime())
            .forEach(s => {
                if (!submissionMap.has(s.exerciseId)) {
                    submissionMap.set(s.exerciseId, s);
                }
            });
        return submissionMap;
    }, [videoSubmissions, patientProfile]);
    
    const therapistGoals = useMemo(() =>
        allTherapistGoals.filter(g => g.patientId === patientProfile?.id),
    [allTherapistGoals, patientProfile]);

    const pendingForms = useMemo(() =>
        formSubmissions.filter(s => s.patientId === patientProfile?.id && s.status === 'pending'),
    [formSubmissions, patientProfile]);

    const patientDailyLogs = useMemo(() =>
        dailyLogs.filter(log => log.patientId === patientProfile?.id),
    [dailyLogs, patientProfile]);
    
    const todaysLog = useMemo(() => {
        const today = new Date();
        return patientDailyLogs.find(log => areOnSameDay(new Date(log.date), today)) || null;
    }, [patientDailyLogs]);

    // --- QR Code URL Handling ---
    const handleOpenExerciseModal = useCallback((exercise: Exercise) => {
        setSelectedExercise(exercise);
        setIsExerciseModalOpen(true);
    }, []);

    useEffect(() => {
        if (patientPrescriptions.length > 0 && exercises.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const prescriptionId = params.get('prescriptionId');
            if (prescriptionId) {
                setHighlightedPrescriptionId(prescriptionId);
                const prescription = patientPrescriptions.find(p => p.id === prescriptionId);
                if (prescription) {
                    const exercise = exercises.find(ex => ex.id === prescription.exerciseId);
                    if (exercise) {
                        setTimeout(() => handleOpenExerciseModal(exercise), 500);
                    }
                }
                // Clean URL after handling
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
            }
        }
    }, [patientPrescriptions, exercises, handleOpenExerciseModal]);

    useEffect(() => {
        if (highlightedPrescriptionId) {
            const element = document.getElementById(`prescription-${highlightedPrescriptionId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900', 'transition-shadow', 'duration-1000');
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-slate-900');
                }, 3000);
            }
        }
    }, [highlightedPrescriptionId]);


    // --- Modal Handlers ---

    const handleOpenTaskFeedbackModal = useCallback((task: Task) => {
        setSelectedTask(task);
        setIsTaskFeedbackModalOpen(true);
    }, []);

    const handleCloseTaskFeedbackModal = useCallback(() => {
        setIsTaskFeedbackModalOpen(false);
        setSelectedTask(null);
    }, []);

    const handleSaveTaskFeedback = useCallback(async (taskId: string, feedback: string) => {
        try {
            await addTaskFeedback({taskId, feedback});
            addNotification({ type: 'success', title: 'Feedback Enviado', message: 'Seu feedback sobre a tarefa foi enviado.' });
            handleCloseTaskFeedbackModal();
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro ao Enviar', message: (error as Error).message });
        }
    }, [addTaskFeedback, addNotification, handleCloseTaskFeedbackModal]);

    const handleCloseExerciseModal = useCallback(() => {
        setIsExerciseModalOpen(false);
        setSelectedExercise(null);
    }, []);

    const handleOpenExerciseFeedbackModal = useCallback((prescription: Prescription) => {
        const exercise = exercises.find(ex => ex.id === prescription.exerciseId);
        if (exercise) {
            setSelectedPrescription(prescription);
            setSelectedExercise(exercise);
            setIsExerciseFeedbackModalOpen(true);
        }
    }, [exercises]);

    const handleCloseExerciseFeedbackModal = useCallback(() => {
        setIsExerciseFeedbackModalOpen(false);
        setSelectedPrescription(null);
        setSelectedExercise(null);
    }, []);

    const handleSaveExerciseLog = useCallback(async (log: Omit<ExerciseLog, 'id'>) => {
        try {
            await saveExerciseLog(log);
            handleCloseExerciseFeedbackModal();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
        }
    }, [saveExerciseLog, addNotification, handleCloseExerciseFeedbackModal]);

    const handleOpenHistoryModal = useCallback((exercise: Exercise) => {
        setSelectedExerciseForHistory(exercise);
        setIsHistoryModalOpen(true);
    }, []);

    const handleOpenRecordingModal = useCallback((exercise: Exercise) => {
        setExerciseForRecording(exercise);
        setIsRecordingModalOpen(true);
    }, []);

    const handleSaveRecording = useCallback(async (videoBlob: Blob) => {
        if (!patientProfile || !exerciseForRecording) return;
        const videoUrl = URL.createObjectURL(videoBlob);
        await saveVideoSubmission({
            patientId: patientProfile.id,
            exerciseId: exerciseForRecording.id,
            videoUrl,
        });
        setIsRecordingModalOpen(false);
        setExerciseForRecording(null);
    }, [patientProfile, exerciseForRecording, saveVideoSubmission]);
    
    const handleOpenFillFormModal = useCallback((submission: FormSubmission) => {
        setSelectedFormSubmission(submission);
        setIsFillFormModalOpen(true);
    }, []);

    const handleSaveFormSubmission = useCallback(async (submission: FormSubmission) => {
        await saveFormSubmission(submission);
        setIsFillFormModalOpen(false);
        setSelectedFormSubmission(null);
    }, [saveFormSubmission]);
    
    const handleAddGoal = useCallback(async () => {
        if (newGoalText.trim() && patientProfile) {
            try {
                await addPersonalGoal({patientId: patientProfile.id, text: newGoalText});
                addNotification({ type: 'success', title: 'Meta Adicionada!', message: 'Sua nova meta foi salva.' });
                setNewGoalText('');
            } catch(error) {
                addNotification({ type: 'error', title: 'Erro', message: (error as Error).message });
            }
        }
    }, [newGoalText, patientProfile, addPersonalGoal, addNotification]);

    const handleUpdateGoal = useCallback(async (goalId: string, completed: boolean) => {
        if (!patientProfile) return;
        try {
            await updatePersonalGoal({ patientId: patientProfile.id, goalId, completed });
            if (completed) {
                addNotification({ type: 'achievement', title: 'Meta Concluída!', message: 'Parabéns por alcançar seu objetivo!' });
            }
        } catch(error) {
             addNotification({ type: 'error', title: 'Erro', message: (error as Error).message });
        }
    }, [patientProfile, updatePersonalGoal, addNotification]);

    const handleDeleteGoal = useCallback(async (goalId: string) => {
        if (!patientProfile) return;
        try {
            await deletePersonalGoal({ patientId: patientProfile.id, goalId });
            addNotification({ type: 'info', title: 'Meta Removida', message: 'A meta foi removida da sua lista.' });
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro', message: (error as Error).message });
        }
    }, [patientProfile, deletePersonalGoal, addNotification]);


    const handleSendMessage = useCallback(async (message: Partial<ChatMessage>) => {
        if (!user || !patientProfile) return;
        try {
            await sendMessage({
                ...message,
                patientId: patientProfile.id,
                senderId: user.id,
            });
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro ao Enviar', message: (error as Error).message });
        }
    }, [user, patientProfile, sendMessage, addNotification]);

    const handleSaveDiary = useCallback(async (logData: Omit<DailyLog, 'id' | 'patientId'>) => {
        if (!patientProfile) return;
        await saveDailyLog({ ...logData, patientId: patientProfile.id });
        setIsDiaryModalOpen(false);
    }, [patientProfile, saveDailyLog]);


    if (!patientProfile) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-50">
                <h1 className="text-2xl">Perfil de paciente não encontrado.</h1>
                <button onClick={logout} className="mt-4 px-4 py-2 bg-blue-600 rounded-md">Sair</button>
            </div>
        );
    }
    
    const GoalsCard = () => (
         <div className="space-y-4">
            <div>
                <h4 className="font-semibold text-slate-300 mb-2">Metas Clínicas</h4>
                <div className="space-y-3">
                    {therapistGoals.length > 0 ? (
                        therapistGoals.map(goal => <ClinicalGoalCard key={goal.id} goal={goal} />)
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-2">Seu fisioterapeuta definirá as metas clínicas aqui.</p>
                    )}
                </div>
            </div>
            <div className="pt-4 border-t border-slate-700/50">
                <h4 className="font-semibold text-slate-300 mb-2">Minhas Metas Pessoais</h4>
                <div className="flex gap-2">
                    <input type="text" value={newGoalText} onChange={(e) => setNewGoalText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddGoal()} placeholder="Ex: Voltar a correr no parque" className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"/>
                    <button onClick={handleAddGoal} className="px-3 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50" disabled={!newGoalText.trim()}><IconPlus/></button>
                </div>
                <ul className="space-y-2 mt-3">
                    {patientProfile.personalGoals.filter(g => !g.completed).map(goal => (
                        <li key={goal.id} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-md group">
                            <input type="checkbox" checked={goal.completed} onChange={() => handleUpdateGoal(goal.id, true)} className="w-5 h-5 bg-slate-700 border-slate-500 rounded text-blue-500 focus:ring-blue-600 cursor-pointer"/>
                            <span className="flex-1 text-slate-200">{goal.text}</span>
                            <button onClick={() => handleDeleteGoal(goal.id)} className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash size={14}/></button>
                        </li>
                    ))}
                </ul>
                {patientProfile.personalGoals.filter(g => g.completed).length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-700/50"><h4 className="text-sm font-semibold text-slate-400">Concluídas</h4>
                        <ul className="space-y-2 mt-2">
                            {patientProfile.personalGoals.filter(g => g.completed).map(goal => (
                                <li key={goal.id} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-md opacity-70">
                                    <input type="checkbox" checked={goal.completed} onChange={() => handleUpdateGoal(goal.id, false)} className="w-5 h-5 bg-slate-700 border-slate-500 rounded text-blue-500 focus:ring-blue-600 cursor-pointer"/>
                                    <span className="flex-1 text-slate-300 line-through">{goal.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );

    const handleTabClick = (tab: ActiveTab) => {
        setActiveTab(tab);
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
            {/* Header */}
            <header className="bg-slate-900/80 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                    <div className="flex items-center gap-3">
                        <IconStethoscope className="text-blue-400" size={28}/>
                        <h1 className="text-xl font-bold text-white">Portal do Paciente</h1>
                    </div>
                     <div className="flex items-center gap-4">
                        <p className="hidden sm:block text-slate-300">Olá, <span className="font-semibold text-white">{patientProfile.name.split(' ')[0]}</span></p>
                        <button onClick={logout} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
                            <IconLogout />
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </div>
                </div>
            </header>
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Next Appointment */}
                        <NextAppointmentCard appointment={nextAppointment} therapist={therapistForNextAppointment} />
                        
                        {/* Pending Forms */}
                        {pendingForms.length > 0 && (
                            <div className="bg-amber-900/30 border border-amber-500/40 p-4 rounded-lg">
                                <h3 className="text-lg font-semibold text-amber-200 mb-2">Ações Pendentes</h3>
                                {pendingForms.map(form => {
                                    const template = formTemplates.find(t => t.id === form.formTemplateId);
                                    return (
                                        <div key={form.id} className="flex justify-between items-center">
                                            <p className="text-amber-100">Você tem um novo formulário para preencher: <span className="font-bold">{template?.name}</span></p>
                                            <Button onClick={() => handleOpenFillFormModal(form)}>Responder Agora</Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Home Exercise Plan */}
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Seu Plano de Exercícios em Casa</h2>
                            {patientPrescriptions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {patientPrescriptions.map(p => {
                                        const exercise = exercises.find(ex => ex.id === p.exerciseId);
                                        if (!exercise) return null;
                                        return (
                                            <div id={`prescription-${p.id}`} key={p.id}>
                                                <PatientExerciseCard
                                                    prescription={p}
                                                    exercise={exercise}
                                                    latestSubmission={latestSubmissions.get(exercise.id)}
                                                    onWatchVideo={() => handleOpenExerciseModal(exercise)}
                                                    onLogProgress={() => handleOpenExerciseFeedbackModal(p)}
                                                    onSendVideo={() => handleOpenRecordingModal(exercise)}
                                                    onShowHistory={() => handleOpenHistoryModal(exercise)}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <EmptyState icon={<IconActivity/>} title="Nenhum Exercício" message="Seu fisioterapeuta ainda não prescreveu exercícios para você fazer em casa."/>
                            )}
                        </div>
                    </div>
                    
                    {/* Right Column */}
                    <div className="space-y-8">
                        {/* Gamification */}
                        <GamificationWidget gamification={patientProfile.gamification} />
                        
                        {/* Tabs */}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg">
                            <div className="border-b border-slate-700 flex justify-around">
                                <button onClick={() => handleTabClick('metas')} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'metas' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700/50'}`}>Metas</button>
                                <button onClick={() => handleTabClick('sessoes')} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'sessoes' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700/50'}`}>Sessões</button>
                                <button onClick={() => handleTabClick('evolucao')} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'evolucao' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700/50'}`}>Evolução</button>
                                <button onClick={() => handleTabClick('diario')} className={`flex-1 p-3 text-sm font-semibold transition-colors ${activeTab === 'diario' ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/50' : 'text-slate-400 hover:bg-slate-700/50'}`}>Diário</button>
                            </div>
                            <div className="p-4">
                                {activeTab === 'metas' && <GoalsCard />}
                                {activeTab === 'sessoes' && <AppointmentListCard appointments={allAppointmentsSorted} />}
                                {activeTab === 'evolucao' && (
                                     <div className="h-48">
                                         {progressChartData.length > 0 ? (
                                             <ResponsiveContainer width="100%" height="100%">
                                                 <LineChart data={progressChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                                     <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                                     <XAxis dataKey="date" stroke="#cbd5e1" fontSize={10}/>
                                                     <YAxis domain={[0, 10]} stroke="#cbd5e1" fontSize={10} />
                                                     <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', color: '#f8fafc', borderRadius: '0.5rem' }} />
                                                     <Legend wrapperStyle={{fontSize: '12px'}} />
                                                     <Line type="monotone" dataKey="Dor" stroke="#ef4444" strokeWidth={2} />
                                                     <Line type="monotone" dataKey="Dificuldade" stroke="#3b82f6" strokeWidth={2} />
                                                 </LineChart>
                                             </ResponsiveContainer>
                                         ) : (
                                             <div className="text-center text-sm text-slate-500 pt-8">Nenhum dado de progresso para exibir.</div>
                                         )}
                                    </div>
                                )}
                                {activeTab === 'diario' && (
                                    <div className="text-center">
                                        <p className="text-sm text-slate-400">Registre como você se sentiu hoje para ajudar no seu tratamento.</p>
                                        <Button className="mt-2" onClick={() => setIsDiaryModalOpen(true)}>
                                            {todaysLog ? 'Editar Registro de Hoje' : 'Adicionar Registro de Hoje'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Achievements */}
                         <div>
                            <h3 className="text-xl font-bold text-white mb-3">Conquistas</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {ACHIEVEMENTS_LIST.slice(0, 4).map(ach => {
                                    const unlocked = patientProfile.unlockedAchievements.find(ua => ua.achievementId === ach.id);
                                    return <AchievementBadge key={ach.id} achievement={ach} isUnlocked={!!unlocked} unlockedDate={unlocked?.date}/>;
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Chat Widget */}
            <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 flex flex-col z-30">
                 <ChatInterface
                    messages={patientMessages}
                    currentUserId={user!.id}
                    interlocutor={therapistForNextAppointment}
                    onSendMessage={handleSendMessage}
                    onViewExercise={handleOpenExerciseModal}
                    allExercises={exercises}
                />
            </div>
            
             {/* Modals */}
            {isTaskFeedbackModalOpen && <PatientFeedbackModal isOpen={isTaskFeedbackModalOpen} onClose={handleCloseTaskFeedbackModal} task={selectedTask} onSaveFeedback={handleSaveTaskFeedback}/>}
            {isExerciseModalOpen && <ExerciseModal isOpen={isExerciseModalOpen} onClose={handleCloseExerciseModal} exercise={selectedExercise} />}
            {isExerciseFeedbackModalOpen && selectedPrescription && selectedExercise && <ExerciseFeedbackModal isOpen={isExerciseFeedbackModalOpen} onClose={handleCloseExerciseFeedbackModal} onSave={handleSaveExerciseLog} prescription={selectedPrescription} exercise={selectedExercise}/>}
            {isHistoryModalOpen && selectedExerciseForHistory && <ExerciseHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} exercise={selectedExerciseForHistory} logs={exerciseLogs.filter(l => l.prescriptionId === selectedPrescription?.id)}/>}
            {isRecordingModalOpen && exerciseForRecording && <VideoRecordingModal isOpen={isRecordingModalOpen} onClose={() => setIsRecordingModalOpen(false)} onSave={handleSaveRecording} exercise={exerciseForRecording} />}
            {isFillFormModalOpen && selectedFormSubmission && <FillFormModal isOpen={isFillFormModalOpen} onClose={() => setIsFillFormModalOpen(false)} onSave={handleSaveFormSubmission} submission={selectedFormSubmission} template={formTemplates.find(t => t.id === selectedFormSubmission.formTemplateId)} />}
            {isDiaryModalOpen && <SymptomDiaryModal isOpen={isDiaryModalOpen} onClose={() => setIsDiaryModalOpen(false)} onSave={handleSaveDiary} existingLog={todaysLog} />}
        </div>
    );
};

export default PatientPortal;