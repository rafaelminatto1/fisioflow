
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Patient, Exercise, ExerciseLog, Prescription, UserRole, Assessment, Transaction, ChatMessage, TherapistGoal, VideoSubmission, SessionNote, Appointment, Task, ClinicalProtocol, Package, PatientPackage, ReceiptProps, PatientDetailPanelProps, Medication } from '../types';
import { useAuth } from '../hooks/useAuth';
import { IconTrash, IconSparkles, IconPlus, IconPencil, IconPackage, IconListChecks, IconArrowLeft, IconBook, IconMessageCircle, IconActivity, IconClipboardCheck, IconCrosshair, IconFileText, IconDollarSign, IconUser, IconVideo, IconBell, IconFilePlus, IconTrendingUp, IconUpload } from '../icons/IconComponents';
import { generateClinicalSummary, projectPatientEvolution } from '../services/geminiService';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import PrescriptionModal from './PrescriptionModal';
import AssessmentModal from './AssessmentModal';
import { useNotification } from '../hooks/useNotification';
import GoalModal from './GoalModal';
import Receipt from './Receipt';
import { usePrescriptions } from '../hooks/usePrescriptions';
import { useAssessments } from '../hooks/useAssessments';
import { useChatMessages } from '../hooks/useChatMessages';
import { useTherapistGoals } from '../hooks/useTherapistGoals';
import { useVideoSubmissions } from '../hooks/useVideoSubmissions';
import Button from './ui/Button';
import VideoReviewModal from './VideoReviewModal';
import SessionNoteModal from './SessionNoteModal';
import { useSessionNotes } from '../hooks/useSessionNotes';
import { useAppointments } from '../hooks/useAppointments';
import SummaryModal from './SummaryModal';
import TaskModal from './TaskModal';
import { useTasks } from '../hooks/useTasks';
import { useUsers } from '../hooks/useUsers';
import { useClinicalProtocols } from '../hooks/useClinicalProtocols';
import { useAssessmentTemplates } from '../hooks/useAssessmentTemplates';
import { usePatients } from '../hooks/usePatients';
import { usePatientPackages } from '../hooks/usePatientPackages';
import AssignPackageModal from './AssignPackageModal';
import { useSettings } from '../hooks/useSettings';
import FormSubmissionsTab from './FormSubmissionsTab';
import ExerciseModal from './ExerciseModal';
import { PatientOverviewTab } from './patient-detail-tabs/PatientOverviewTab';
import { PatientExercisesTab } from './patient-detail-tabs/PatientExercisesTab';
import { PatientAssessmentsTab } from './patient-detail-tabs/PatientAssessmentsTab';
import { PatientClinicalGoalsTab } from './patient-detail-tabs/PatientClinicalGoalsTab';
import { PatientSubmissionsTab } from './patient-detail-tabs/PatientSubmissionsTab';
import { PatientFinanceTab } from './patient-detail-tabs/PatientFinanceTab';
import { PatientMessagesTab } from './patient-detail-tabs/PatientMessagesTab';
import { PatientDiaryTab } from './patient-detail-tabs/PatientDiaryTab';
import { usePatientDetailData } from '../hooks/usePatientDetailData';
import { useModalState } from '../hooks/useModalState';
import { PatientSettingsTab } from './patient-detail-tabs/PatientSettingsTab';
import { PatientMedicationsTab } from './patient-detail-tabs/PatientMedicationsTab';
import { useMedications } from '../hooks/useMedications';
import { PatientFlowsheetTab } from './patient-detail-tabs/PatientFlowsheetTab';
import { MedicationModal } from './MedicationModal';

type ActiveTab = 'details' | 'flowsheet' | 'exercises' | 'assessments' | 'metas_clinicas' | 'medications' | 'diario' | 'submissions' | 'financeiro' | 'forms' | 'notifications' | 'mensagens';
type PatientErrors = {
  name?: string;
  email?: string;
};

export const PatientDetailPanel: React.FC<PatientDetailPanelProps> = ({ onClose, onSave, onDelete, onScheduleNext, patient, tasks, appointments, prescribedExercises, exercises, exerciseLogs, dailyLogs, assessments, transactions, chatMessages, therapistGoals, sessionNotes, packages, patientPackages, permissions }) => {
  const { user } = useAuth();
  const { users = [] } = useUsers();
  const { settings } = useSettings();
  const { applyProtocol } = usePatients();
  const { savePrescription, deletePrescription } = usePrescriptions();
  const { saveAssessment, deleteAssessment } = useAssessments();
  const { sendMessage } = useChatMessages();
  const { saveGoal, deleteGoal } = useTherapistGoals();
  const { videoSubmissions = [], updateVideoSubmission } = useVideoSubmissions();
  const { addNotification } = useNotification();
  const { saveSessionNote, deleteSessionNote } = useSessionNotes();
  const { saveAppointment } = useAppointments();
  const { saveTask: saveNewTask, deleteTask: deleteTaskFromHook } = useTasks();
  const { protocols = [] } = useClinicalProtocols();
  const { templates: assessmentTemplates = [] } = useAssessmentTemplates();
  const { assignPackage } = usePatientPackages();
  const { medications, saveMedication, deleteMedication } = useMedications(patient.id);

  // Component State
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState<Patient>(patient);
  const [errors, setErrors] = useState<PatientErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptProps | null>(null);

  // Modal States using the custom hook
  const historyModal = useModalState<{ exercise: Exercise; logs: ExerciseLog[] }>();
  const prescriptionModal = useModalState<Prescription>();
  const goalModal = useModalState<TherapistGoal>();
  const videoReviewModal = useModalState<VideoSubmission>();
  const noteModal = useModalState<Appointment>();
  const taskModal = useModalState<Task>();
  const assignPackageModal = useModalState();
  const exerciseModal = useModalState<Exercise>();
  const medicationModal = useModalState<Medication>();
  
  // Modals with more complex state
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | Partial<Assessment> | null>(null);
  const [isAssessmentReadOnly, setIsAssessmentReadOnly] = useState(false);
  
  const [summaryModalState, setSummaryModalState] = useState({ isOpen: false, title: '', content: '', isLoading: false });
  
  const {
      patient: currentPatient,
      patientAssessments,
      patientSessionNotes,
  } = usePatientDetailData(patient.id);

  useEffect(() => {
    setEditedPatient(patient);
    setErrors({});
    setActiveTab('details');
    setViewingReceipt(null);
    setIsEditing(false);
  }, [patient]);

  const validate = (): boolean => {
    const newErrors: PatientErrors = {};
    if (!editedPatient?.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!editedPatient?.email?.trim()) {
      newErrors.email = 'O email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(editedPatient.email)) {
      newErrors.email = 'O formato do email é inválido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedPatient(prev => prev ? { ...prev, [name]: value } : {} as Patient);
    if (errors[name as keyof PatientErrors]) {
        setErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
        await onSave(editedPatient);
        setIsEditing(false);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Tem certeza que deseja excluir o paciente "${editedPatient.name}"? Esta ação não pode ser desfeita.`)) {
      onDelete(editedPatient.id);
    }
  };
  
  const handleGenerateSummary = async () => {
      setSummaryModalState({ isOpen: true, title: "Resumo Clínico (IA)", content: '', isLoading: true });
      try {
          const context = `
              Paciente: ${patient.name}, Histórico: ${patient.medicalHistory}
              ---
              Última Avaliação: ${JSON.stringify(latestAssessment)}
              ---
              Metas Clínicas Ativas: ${JSON.stringify(therapistGoals)}
              ---
              Últimas Notas de Sessão: ${JSON.stringify(patientSessionNotes.slice(0, 3))}
          `;
          const summary = await generateClinicalSummary(context);
          setSummaryModalState(prev => ({ ...prev, content: summary, isLoading: false }));
      } catch (e) {
          setSummaryModalState(prev => ({ ...prev, content: (e as Error).message, isLoading: false }));
      }
  };

  const handleGenerateProjection = async () => {
    setSummaryModalState({ isOpen: true, title: "Projeção de Evolução (IA)", content: '', isLoading: true });
    try {
        const context = `
            Paciente: ${patient.name}
            Diagnóstico: ${latestAssessment?.diagnosticHypothesis || 'Não informado'}
            Histórico: ${patient.medicalHistory}
            Últimas avaliações: ${JSON.stringify(patientAssessments.slice(0, 2))}
            Últimos logs de exercícios: ${JSON.stringify(exerciseLogs.slice(0, 5))}
        `;
        const projection = await projectPatientEvolution(context);
        setSummaryModalState(prev => ({ ...prev, content: projection, isLoading: false }));
    } catch (e) {
        setSummaryModalState(prev => ({ ...prev, content: (e as Error).message, isLoading: false }));
    }
  };

  const handleExportData = () => {
    const dataToExport = {
      patient,
      appointments,
      tasks,
      assessments,
      prescribedExercises,
      exerciseLogs,
      dailyLogs,
      therapistGoals,
      sessionNotes,
      transactions,
      chatMessages,
      videoSubmissions,
      patientPackages,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(dataToExport, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `dados-lgpd-${patient.name.toLowerCase().replace(/\s/g, '-')}.json`;

    link.click();
    addNotification({type: 'success', title: 'Exportação Iniciada', message: 'O download dos dados do paciente foi iniciado.'});
  };

  const handleSendMessage = async (message: Partial<ChatMessage>) => {
    if(!user) return;
    await sendMessage({
        ...message,
        patientId: editedPatient.id,
        senderId: user.id,
    });
  };

  const hasUnreadMessages = useMemo(() => {
    if (!user || !chatMessages || chatMessages.length === 0) return false;
    
    const lastTherapistMessageTs = chatMessages
        .filter(m => m.senderId === user.id)
        .reduce((latest, m) => Math.max(latest, new Date(m.timestamp).getTime()), 0);

    return chatMessages.some(m => 
        m.senderId === patient.id && new Date(m.timestamp).getTime() > lastTherapistMessageTs
    );
  }, [chatMessages, user, patient.id]);

  // Modal Handlers
  const handleOpenNewPrescriptionModal = () => prescriptionModal.openModal({ patientId: patient.id, exerciseId: '', sets: 3, reps: 10, frequency: '3x por semana' });
  const handleSavePrescription = async (p: Prescription) => { await savePrescription(p); prescriptionModal.closeModal(); };
  const handleDeletePrescription = async (id: string) => { await deletePrescription(id); prescriptionModal.closeModal(); };

  const handleOpenNewAssessmentModal = () => {
    if (!user) return;
    setSelectedAssessment({ patientId: patient.id, therapistId: user.id, date: new Date().toISOString(), painLevel: 0, rangeOfMotion: [], muscleStrength: [], functionalTests: [] });
    setIsAssessmentReadOnly(false);
    setIsAssessmentModalOpen(true);
  };
  const handleOpenViewAssessmentModal = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsAssessmentReadOnly(true);
    setIsAssessmentModalOpen(true);
  };
  const handleCloseAssessmentModal = () => setIsAssessmentModalOpen(false);
  const handleSaveAssessment = async (a: Assessment) => { await saveAssessment(a); handleCloseAssessmentModal(); };
  const handleDeleteAssessment = async (id: string) => { await deleteAssessment(id); handleCloseAssessmentModal(); };
  const handlePrescribeExercises = async (ids: string[]) => {
    let successCount = 0;
    try {
      for (const exerciseId of ids) {
        await savePrescription({ patientId: patient.id, exerciseId, sets: 3, reps: 10, frequency: "3x por semana" } as Prescription);
        successCount++;
      }
      addNotification({ type: 'success', title: 'Exercícios Prescritos', message: `${successCount} exercícios foram prescritos!` });
    } catch(e) { addNotification({ type: 'error', title: 'Erro', message: (e as Error).message }); }
    finally { handleCloseAssessmentModal(); }
  };

  const handleOpenNewGoalModal = () => goalModal.openModal({ patientId: patient.id, currentValue: 0 });
  const handleSaveGoal = async (g: TherapistGoal) => { await saveGoal(g); goalModal.closeModal(); };
  const handleDeleteGoal = async (id: string) => { await deleteGoal(id); goalModal.closeModal(); };

  const handleSaveVideoReview = async (id: string, status: 'approved' | 'needs_correction', notes: string) => { await updateVideoSubmission({ submissionId: id, status, therapistNotes: notes }); videoReviewModal.closeModal(); };
  
  const handleSaveNote = async (n: SessionNote) => { if (!user) return; await saveSessionNote({ note: n, userId: user.id }); noteModal.closeModal(); };
  const handleDeleteNote = async (noteId: string) => { if (!user) return; await deleteSessionNote({ noteId, userId: user.id }); noteModal.closeModal(); };
  const handleCloseAndScheduleNext = (id: string) => { noteModal.closeModal(); onScheduleNext(id); };
  const handleCloseAndCreateTask = (id: string) => { noteModal.closeModal(); taskModal.openModal({ patientId: id, assigneeId: user?.id, status: 'todo', priority: 'medium' }); };
  
  const handleSaveTask = async (t: Task) => { await saveNewTask(t); taskModal.closeModal(); };
  const handleDeleteTask = async (id: string) => { if (!user) return; await deleteTaskFromHook({ taskId: id, userId: user.id }); taskModal.closeModal(); };

  const handleAssignPackage = async (id: string) => { await assignPackage({ patientId: patient.id, packageId: id }); assignPackageModal.closeModal(); };
  
  const handleSaveMedication = async (med: Medication) => { await saveMedication(med); medicationModal.closeModal(); };
  const handleDeleteMedication = async (id: string) => { await deleteMedication(id); medicationModal.closeModal(); };

  // Data Memos
  const latestAssessment = useMemo(() => patientAssessments.length > 0 ? [...patientAssessments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null, [patientAssessments]);
  const futureAppointments = useMemo(() => appointments.filter(a => new Date(a.start) > new Date()), [appointments]);
  const overdueTasksCount = useMemo(() => tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length, [tasks]);
  const matchingProtocol = useMemo(() => (!latestAssessment?.diagnosticHypothesis || patient.appliedProtocolId) ? null : protocols.find(p => latestAssessment.diagnosticHypothesis.toLowerCase().includes(p.name.toLowerCase().split('(')[0].trim())) || null, [latestAssessment, protocols, patient.appliedProtocolId]);
  const currentProtocol = useMemo(() => protocols.find(p => p.id === patient.appliedProtocolId), [protocols, patient.appliedProtocolId]);
  const currentProtocolPhase = useMemo(() => {
      if (!currentProtocol?.phases || !patient.protocolStartDate) return null;
      const startDate = new Date(patient.protocolStartDate);
      const daysSinceStart = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      let accumulatedDays = 0;
      for (const phase of currentProtocol.phases) {
          accumulatedDays += phase.durationDays;
          if (daysSinceStart < accumulatedDays) {
              const phaseStartDate = new Date(startDate);
              phaseStartDate.setDate(startDate.getDate() + (accumulatedDays - phase.durationDays));
              const daysIntoPhase = Math.floor((new Date().getTime() - phaseStartDate.getTime()) / (1000 * 3600 * 24));
              const progress = (daysIntoPhase / phase.durationDays) * 100;
              const daysRemaining = phase.durationDays - daysIntoPhase;
              return { phase, daysRemaining, progress };
          }
      }
      return null;
  }, [currentProtocol, patient.protocolStartDate]);

  const handleApplyProtocol = async (protocol: ClinicalProtocol) => {
    if (window.confirm(`Tem certeza que deseja aplicar o protocolo "${protocol.name}"? Isto irá substituir as prescrições existentes.`)) {
        await applyProtocol({ patientId: patient.id, protocolId: protocol.id });
        addNotification({type: 'success', title: 'Protocolo Aplicado', message: 'Novas prescrições foram criadas.'});
    }
  };

  const TabButton: React.FC<{tabId: ActiveTab, label: React.ReactNode, icon: React.ReactNode}> = ({tabId, label, icon}) => (
      <button
          onClick={() => setActiveTab(tabId)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-all ${activeTab === tabId ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'}`}
      >
          {icon} {label}
      </button>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-slate-800 border border-slate-700 rounded-lg overflow-hidden animate-fade-in-right">
        {/* Header */}
        <header className="p-4 flex-shrink-0 border-b border-slate-700 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-4">
                <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white">
                    <IconArrowLeft />
                </button>
                <img src={patient.avatarUrl} alt={patient.name} className="w-14 h-14 rounded-full border-2 border-slate-600" />
                <div>
                    <h2 className="text-xl font-bold text-slate-100">{patient.name}</h2>
                    <p className="text-sm text-slate-400">{patient.email}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedPatient(patient); }}>Cancelar</Button>
                        <Button onClick={handleSave} isLoading={isSaving}>Salvar</Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" onClick={handleExportData} icon={<IconUpload />}>Exportar Dados (LGPD)</Button>
                        {permissions.edit && <Button variant="secondary" onClick={() => setIsEditing(true)} icon={<IconPencil />}>Editar</Button>}
                        {settings?.aiSmartSummaryEnabled && <Button onClick={handleGenerateSummary} icon={<IconSparkles />}>Resumo Clínico</Button>}
                    </>
                )}
            </div>
        </header>

         {/* Tabs */}
        <nav className="flex-shrink-0 border-b border-slate-700 px-2 overflow-x-auto">
             <div className="flex space-x-1">
                <TabButton tabId="details" label="Visão Geral" icon={<IconUser size={14}/>}/>
                <TabButton tabId="flowsheet" label="Flowsheet" icon={<IconTrendingUp size={14}/>}/>
                <TabButton tabId="exercises" label="Exercícios" icon={<IconActivity size={14}/>}/>
                <TabButton tabId="assessments" label="Avaliações" icon={<IconClipboardCheck size={14}/>}/>
                <TabButton tabId="metas_clinicas" label="Metas" icon={<IconCrosshair size={14}/>}/>
                <TabButton tabId="medications" label="Medicações" icon={<IconFilePlus size={14}/>}/>
                <TabButton tabId="diario" label="Diário" icon={<IconBook size={14}/>}/>
                <TabButton tabId="submissions" label="Vídeos" icon={<IconVideo size={14}/>}/>
                <TabButton tabId="financeiro" label="Financeiro" icon={<IconDollarSign size={14}/>}/>
                <TabButton tabId="forms" label="Formulários" icon={<IconFileText size={14}/>}/>
                <TabButton tabId="notifications" label="Notificações" icon={<IconBell size={14}/>}/>
                <TabButton tabId="mensagens" label={
                    <div className="flex items-center gap-2">
                        <span>Mensagens</span>
                        {hasUnreadMessages && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>}
                    </div>
                } icon={<IconMessageCircle size={14}/>}/>
             </div>
        </nav>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'details' && <PatientOverviewTab 
                patient={patient}
                isEditing={isEditing}
                editedPatient={editedPatient}
                errors={errors}
                futureAppointments={futureAppointments}
                overdueTasksCount={overdueTasksCount}
                latestAssessment={latestAssessment}
                therapistGoals={therapistGoals}
                matchingProtocol={matchingProtocol}
                currentProtocol={currentProtocol}
                currentProtocolPhase={currentProtocolPhase}
                permissions={permissions}
                handleApplyProtocol={handleApplyProtocol}
                handleChange={handleChange}
                handleDelete={handleDelete}
            />}
             {activeTab === 'flowsheet' && (
                <PatientFlowsheetTab
                    patient={patient}
                    assessments={patientAssessments}
                    goals={therapistGoals}
                    exerciseLogs={exerciseLogs}
                    dailyLogs={dailyLogs}
                    prescriptions={prescribedExercises}
                />
            )}
            {activeTab === 'exercises' && (
                <PatientExercisesTab
                    patient={patient}
                    prescribedExercises={prescribedExercises}
                    exercises={exercises}
                    onPrescribeNew={handleOpenNewPrescriptionModal}
                    onViewVideo={(ex) => exerciseModal.openModal(ex)}
                    onViewHistory={(exercise, pId) => historyModal.openModal({ exercise, logs: exerciseLogs.filter(log => log.prescriptionId === pId) })}
                    onEditPrescription={(p) => prescriptionModal.openModal(p)}
                />
            )}
            {activeTab === 'assessments' && (
                <PatientAssessmentsTab
                    assessments={patientAssessments}
                    onOpenNewModal={handleOpenNewAssessmentModal}
                    onOpenViewModal={handleOpenViewAssessmentModal}
                />
            )}
             {activeTab === 'metas_clinicas' && (
                <PatientClinicalGoalsTab
                    therapistGoals={therapistGoals}
                    onOpenNewGoalModal={handleOpenNewGoalModal}
                    onOpenEditGoalModal={(g) => goalModal.openModal(g)}
                />
            )}
             {activeTab === 'diario' && (
                <PatientDiaryTab dailyLogs={dailyLogs} />
            )}
            {activeTab === 'submissions' && (
                <PatientSubmissionsTab
                    videoSubmissions={videoSubmissions.filter(s => s.patientId === patient.id)}
                    exercises={exercises}
                    onOpenVideoReviewModal={(s) => videoReviewModal.openModal(s)}
                />
            )}
            {activeTab === 'financeiro' && (
                <PatientFinanceTab
                    transactions={transactions}
                    patient={patient}
                    settings={settings}
                    onAssignPackage={() => assignPackageModal.openModal()}
                    setViewingReceipt={setViewingReceipt}
                />
            )}
            {activeTab === 'forms' && (
                <FormSubmissionsTab patientId={patient.id} />
            )}
            {activeTab === 'medications' && (
                <PatientMedicationsTab
                    patientId={patient.id}
                    medications={medications}
                    onOpenModal={(med) => medicationModal.openModal(med)}
                />
            )}
            {activeTab === 'notifications' && (
                <PatientSettingsTab patient={editedPatient} onSave={onSave} />
            )}
            {activeTab === 'mensagens' && user && (
                <PatientMessagesTab
                    patient={patient}
                    chatMessages={chatMessages}
                    onSendMessage={handleSendMessage}
                    onViewExercise={(ex) => exerciseModal.openModal(ex)}
                    currentUserId={user.id}
                />
            )}
        </main>
      </div>

        {/* Modals */}
        {historyModal.isOpen && <ExerciseHistoryModal isOpen={historyModal.isOpen} onClose={historyModal.closeModal} exercise={historyModal.selectedData!.exercise} logs={historyModal.selectedData!.logs} />}
        {exerciseModal.isOpen && <ExerciseModal isOpen={exerciseModal.isOpen} onClose={exerciseModal.closeModal} exercise={exerciseModal.selectedData as Exercise} />}
        {prescriptionModal.isOpen && <PrescriptionModal isOpen={prescriptionModal.isOpen} onClose={prescriptionModal.closeModal} onSave={handleSavePrescription} onDelete={handleDeletePrescription} prescription={prescriptionModal.selectedData as Prescription | Partial<Prescription>} patientId={patient.id} exercises={exercises} />}
        {goalModal.isOpen && <GoalModal isOpen={goalModal.isOpen} onClose={goalModal.closeModal} onSave={handleSaveGoal} onDelete={handleDeleteGoal} goal={goalModal.selectedData as Partial<TherapistGoal>} patientId={patient.id} assessment={latestAssessment}/>}
        {videoReviewModal.isOpen && <VideoReviewModal isOpen={videoReviewModal.isOpen} onClose={videoReviewModal.closeModal} submission={videoReviewModal.selectedData as VideoSubmission} exercise={exercises.find(e => e.id === videoReviewModal.selectedData?.exerciseId)} onSave={handleSaveVideoReview}/>}
        {noteModal.isOpen && <SessionNoteModal isOpen={noteModal.isOpen} onClose={noteModal.closeModal} onSave={handleSaveNote} onDelete={handleDeleteNote} appointment={noteModal.selectedData as Appointment} patient={currentPatient!} allPatientAssessments={patientAssessments} allPatientSessionNotes={patientSessionNotes} onCloseAndScheduleNext={handleCloseAndScheduleNext} onCloseAndCreateTask={handleCloseAndCreateTask} />}
        {taskModal.isOpen && <TaskModal isOpen={taskModal.isOpen} onClose={taskModal.closeModal} onSave={handleSaveTask} onDelete={handleDeleteTask} task={taskModal.selectedData as Task} users={users} patients={[patient]} />}
        {isAssessmentModalOpen && <AssessmentModal isOpen={isAssessmentModalOpen} onClose={handleCloseAssessmentModal} onSave={handleSaveAssessment} onDelete={handleDeleteAssessment} onPrescribeExercises={handlePrescribeExercises} assessment={selectedAssessment} patientId={patient.id} therapistId={user?.id || ''} isReadOnly={isAssessmentReadOnly} exercises={exercises} templates={assessmentTemplates}/>}
        {summaryModalState.isOpen && <SummaryModal isOpen={summaryModalState.isOpen} onClose={() => setSummaryModalState(prev => ({...prev, isOpen: false}))} title={summaryModalState.title} content={summaryModalState.content} isLoading={summaryModalState.isLoading}/>}
        {assignPackageModal.isOpen && <AssignPackageModal isOpen={assignPackageModal.isOpen} onClose={assignPackageModal.closeModal} onAssign={handleAssignPackage} packages={packages} patientName={patient.name} />}
        {medicationModal.isOpen && <MedicationModal isOpen={medicationModal.isOpen} onClose={medicationModal.closeModal} onSave={handleSaveMedication} onDelete={handleDeleteMedication} medication={medicationModal.selectedData} patientId={patient.id} />}
        {viewingReceipt && <Receipt {...viewingReceipt} />}
    </>
  );
};
