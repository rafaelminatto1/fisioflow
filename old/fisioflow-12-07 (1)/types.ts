
import React from 'react';


export type PainType = 'sharp' | 'dull' | 'tingling' | 'burning' | 'numbness';

export interface BodyChartMarking {
    id: string;
    x: number; // percentage
    y: number; // percentage
    painType: PainType;
    view: 'front' | 'back';
}


export enum UserRole {
  ADMIN = 'admin',
  FISIOTERAPEUTA = 'fisio',
  ESTAGIARIO = 'estagiario',
  PACIENTE = 'paciente',
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';
export type PatientPermissionAction = 'view_all' | 'view_assigned' | 'edit' | 'delete';

export interface PermissionSet {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

export interface PatientPermissionSet {
    view_all: boolean;
    view_assigned: boolean;
    edit: boolean;
    delete: boolean;
}


export interface RolePermissions {
    [UserRole.ADMIN]: {
        notebooks: PermissionSet;
        patients: PatientPermissionSet;
        backups: PermissionSet;
    };
    [UserRole.FISIOTERAPEUTA]: {
        notebooks: PermissionSet;
        patients: PatientPermissionSet;
        backups: PermissionSet;
    };
    [UserRole.ESTAGIARIO]: {
        notebooks: PermissionSet;
        patients: PatientPermissionSet;
        backups: PermissionSet;
    };
     [UserRole.PACIENTE]: {
        notebooks: PermissionSet;
        patients: PatientPermissionSet;
        backups: PermissionSet;
    };
}


export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  patientProfileId?: string;
  email?: string;
  favoriteExerciseIds?: string[];
}

export interface GamificationStats {
  points: number;
  level: number;
  streak: number;
  lastLogDate: string | null; // ISO string
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
}

export interface UnlockedAchievement {
    achievementId: string;
    date: string; // ISO string
}

export interface PersonalGoal {
    id: string;
    text: string;
    completed: boolean;
    dateCompleted: string | null;
}

export interface TherapistGoal {
    id: string;
    patientId: string;
    description: string;
    currentValue: number;
    targetValue: number;
    unit: string; // ex: 'graus', 'cm', '%'
    startDate: string; // ISO String
    targetDate: string; // ISO String
    observations?: string;
}

export interface FlowsheetDataPoint {
    date: string; // formatted date string for the X-axis
    timestamp: number; // for sorting
    value: number;
    type?: string; // e.g., 'Dor (Diário)', 'Dor (Exercício)'
}


export interface NotificationPreferences {
    channel: 'in_app' | 'email' | 'sms';
    enabled: boolean;
}

export interface FisioNotificationSettings {
    appointmentReminders: {
        enabled: boolean;
        beforeMinutes: number[];
        channels: NotificationPreferences[];
    };
    exerciseReminders: {
        enabled: boolean;
        times: string[];
        channels: NotificationPreferences[];
    };
    medicationReminders: {
        enabled: boolean;
        channels: NotificationPreferences[];
    };
}


export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  medicalHistory: string;
  gamification: GamificationStats;
  unlockedAchievements: UnlockedAchievement[];
  personalGoals: PersonalGoal[];
  appliedProtocolId?: string;
  protocolStartDate?: string; // ISO String
  notificationSettings: FisioNotificationSettings;
}

export interface ChatMessage {
    id:string;
    patientId: string;
    senderId: string; // Can be a therapist's ID or the patient's ID
    text: string;
    timestamp: string; // ISO String
    type?: 'text' | 'image' | 'exercise' | 'file' | 'voice';
    metadata?: {
        fileName?: string;
        fileUrl?: string; // Could be a blob url for local files
        fileSize?: string;
        exerciseId?: string;
        duration?: string;
    };
}

export interface Comment {
    id: string;
    taskId: string;
    userId: string;
    text: string;
    timestamp: string; // ISO string
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  status: 'active' | 'completed' | 'archived' | 'on_hold';
  startDate: string; // ISO String
  endDate?: string; // ISO String
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  patientId?: string;
  dueDate?: Date;
  isReminder?: boolean;
}

export interface Notebook {
    id: string;
    title: string;
    icon: React.ReactNode;
    pages: Page[];
}

export interface Page {
    id: string;
    title: string;
    content?: string;
    subpages?: Page[];
}

export interface SessionNote {
  id: string;
  appointmentId: string;
  patientId: string;
  therapistId: string;
  date: string; // ISO String, should match appointment start
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface ClinicalProtocol {
  id: string;
  name: string;
  description: string;
  // SOAP note template part
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  // Exercises part
  exerciseIds: string[];
  phases?: ProtocolPhase[];
  defaultPrice?: number;
}

export interface ProtocolPhase {
    id: string;
    name: string; // e.g., "Fase 1: Semanas 0-2"
    durationDays: number;
    exerciseIds: string[];
}

export interface Service {
    id: string;
    name: string;
    price: number;
}

export interface Package {
    id: string;
    name: string;
    serviceId: string;
    sessionCount: number;
    price: number;
}

export interface PatientPackage {
    id: string;
    patientId: string;
    packageId: string;
    purchaseDate: string; // ISO string
    sessionsRemaining: number;
}


export interface AssessmentTemplate {
    id: string;
    name: string;
    description: string;
    mainComplaint: string;
    history: string;
    painLevel: number;
    posturalAnalysis: string;
    rangeOfMotion: Omit<RangeOfMotionEntry, 'id' | 'active' | 'passive'>[];
    muscleStrength: Omit<MuscleStrengthEntry, 'id' | 'grade'>[];
    functionalTests: Omit<FunctionalTestEntry, 'id' | 'result'>[];
    bodyChartData?: BodyChartMarking[];
}

export interface SessionNoteTemplate {
    id: string;
    name: string;
    description: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

export type FormQuestionType = 'text' | 'textarea' | 'number' | 'scale' | 'multiple-choice' | 'checkbox';

export interface FormQuestion {
  id: string;
  type: FormQuestionType;
  label: string;
  options?: string[]; // for multiple-choice, checkbox
  scaleMin?: number; // for scale
  scaleMax?: number; // for scale
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  required: boolean;
}

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  questions: FormQuestion[];
}

export interface FormAnswer {
  questionId: string;
  value: string | number | string[] | null;
}

export interface FormSubmission {
  id: string;
  patientId: string;
  formTemplateId: string;
  submissionDate: string; // ISO String
  status: 'pending' | 'completed';
  answers: FormAnswer[];
}

export enum AppointmentType {
    AVALIACAO = 'avaliacao',
    SESSAO = 'sessao',
    RETORNO = 'retorno',
    BLOQUEIO = 'bloqueio',
}

export interface Appointment {
  id: string;
  title: string;
  patientId: string;
  therapistId: string;
  start: string; // ISO string format
  end: string;   // ISO string format
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'em_atendimento';
  notes?: string;
  type?: AppointmentType;
  sessionNoteId?: string;
  serviceId?: string;
  protocolId?: string;
  consumedPatientPackageId?: string;
  recurringId?: string;
}

export interface AppointmentLog {
    id: string;
    appointmentId: string;
    userId: string;
    userName: string;
    timestamp: string;
    action: 'criado' | 'atualizado' | 'excluído';
    details: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: 'Mobilização Neural' | 'Cervical' | 'Membros Superiores' | 'Tronco' | 'Membros Inferiores' | 'Mobilidade Geral' | 'Fortalecimento' | 'Mobilidade' | 'Cardio' | 'Equilíbrio' | 'Estabilização' | 'Respiratório' | 'Funcional';
  bodyPart: 'Nervos Periféricos' | 'Pescoço' | 'Ombro' | 'Cotovelo' | 'Punho e Mão' | 'Coluna Torácica' | 'Coluna Lombar' | 'Abdômen' | 'Quadril' | 'Joelho' | 'Perna' | 'Tornozelo e Pé' | 'Geral' | 'Pulmões';
  videoUrl: string; // YouTube embed URL
  indications?: string;
  contraindications?: string;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  duration?: number; // in seconds
  tags?: string[];
  progressions?: {
      name: string;
      description: string;
  }[];
}

export interface Prescription {
    id: string;
    patientId: string;
    exerciseId: string;
    sets: number;
    reps: number;
    frequency: string; // e.g., "3x por semana"
    notes?: string;
}

export interface ExerciseLog {
  id: string;
  prescriptionId: string;
  patientId: string;
  date: string; // ISO String
  painLevel: number; // 0-10
  difficultyLevel: number; // 0-10
  notes?: string;
}

export type Mood = 'triste' | 'neutro' | 'feliz';

export interface DailyLog {
  id: string;
  patientId: string;
  date: string; // ISO String
  painLevel: number; // 0-10
  energyLevel: number; // 1-5 (very low to very high)
  sleepQuality: number; // 1-5 (very poor to very good)
  mood: Mood;
  notes?: string;
  bodyChartData?: BodyChartMarking[];
}

export interface VideoSubmission {
  id: string;
  patientId: string;
  exerciseId: string;
  timestamp: string; // ISO String
  videoUrl: string; // Placeholder
  status: 'pending_review' | 'approved' | 'needs_correction';
  therapistNotes?: string;
}

export interface Transaction {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  status: 'pago' | 'pendente';
  dueDate: string; // ISO string for the due date
  paidDate?: string; // ISO string for when it was paid
  appointmentId?: string;
  patientPackageId?: string; // Links payment to a package sale
}

export interface RangeOfMotionEntry {
    id: string;
    joint: string;
    movement: string;
    active: string;
    passive: string;
}

export interface MuscleStrengthEntry {
    id: string;
    muscle: string;
    grade: '0' | '1' | '2' | '3' | '4' | '5';
}

export interface FunctionalTestEntry {
    id:string;
    testName: string;
    result: string;
}

export interface Assessment {
    id: string;
    patientId: string;
    therapistId: string;
    date: string; // ISO String
    mainComplaint: string;
    history: string;
    painLevel: number;
    posturalAnalysis: string;
    rangeOfMotion: RangeOfMotionEntry[];
    muscleStrength: MuscleStrengthEntry[];
    functionalTests: FunctionalTestEntry[];
    diagnosticHypothesis: string;
    treatmentPlan: string;
    bodyChartData?: BodyChartMarking[];
}

export interface SmartSummaryAlert {
    type: 'high_pain' | 'overdue_task' | 'first_appointment' | 'pending_payment' | 'unread_message' | 'low_adherence';
    priority: 'high' | 'medium';
    description: string;
    patientId?: string;
    taskId?: string;
}

export interface SmartSummaryFocus {
    type: 'task' | 'appointment';
    priority: 'high' | 'medium' | 'low';
    description: string;
    patientId?: string;
}

export interface SmartSummaryData {
    greeting: string;
    motivationalQuote: string;
    criticalAlerts: SmartSummaryAlert[];
    dailyFocus: SmartSummaryFocus[];
}

export interface TeamInsight {
  id: string;
  title: string;
  insight: string;
  priority: 'high' | 'medium' | 'low';
  icon: 'performance' | 'workload' | 'bottleneck' | 'opportunity';
}

export interface DropoutRiskPrediction {
    patientId: string;
    riskLevel: 'Baixo' | 'Médio' | 'Alto';
    reason: string;
    score: number;
}

export enum AutomationTriggerType {
    SESSIONS_COMPLETED = 'SESSIONS_COMPLETED',
    PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
    PATIENT_CREATED = 'PATIENT_CREATED',
}

export enum AutomationActionType {
    CREATE_TASK = 'CREATE_TASK',
    SEND_FORM = 'SEND_FORM',
}

export interface Automation {
  id: string;
  name: string;
  trigger: {
    type: AutomationTriggerType;
    value?: number; // for number of sessions or days overdue
  };
  action: {
    type: AutomationActionType;
    value: string; // task title or formTemplateId
    assigneeId?: string;
  };
}

export interface ClinicSettings {
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicEmail: string;
  clinicLogoUrl: string;
  enableHybridSearch: boolean;
  aiSmartSummaryEnabled?: boolean;
  aiMentoringEnabled?: boolean;
  aiTreatmentPlanEnabled?: boolean;
  aiExerciseRecEnabled?: boolean;
}

export interface BreadcrumbItem {
    name: string;
    href: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'achievement' | 'message';
  title: string;
  message: string;
}

export interface ProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (project: Project) => void;
    onDelete?: (projectId: string) => void;
    project: Partial<Project> | null;
    users: User[];
}

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void> | void;
  onDelete: (taskId: string) => Promise<void> | void;
  task: Task | Partial<Task> | null;
  users: User[];
  patients: Patient[];
}

export interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment | Partial<Appointment>) => void;
    onDelete: (appointmentId: string) => void;
    onAddNewPatient: (name: string) => Promise<Patient | null>;
    appointment: Appointment | Partial<Appointment> | null;
    users: User[];
    patients: Patient[];
    services: Service[];
    protocols: ClinicalProtocol[];
    initialDate?: string; // YYYY-MM-DD
    isSchedulingNext?: boolean;
}

export interface BlockTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Partial<Appointment>) => void;
    initialDate?: string; // YYYY-MM-DD
}


export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  transaction: Transaction | Partial<Transaction> | null;
  patients: Patient[];
}

export interface ExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise | null;
}

export interface EditExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (exercise: Exercise) => void;
    onDelete: (exerciseId: string) => void;
    exercise: Exercise | Partial<Exercise> | null;
}

export interface PrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (prescription: Prescription) => void;
    onDelete: (prescriptionId: string) => void;
    prescription: Prescription | Partial<Prescription> | null;
    patientId: string;
    exercises: Exercise[];
}

export interface SessionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: SessionNote) => void;
  onDelete: (noteId: string) => void;
  appointment: Appointment;
  patient: Patient;
  allPatientAssessments: Assessment[];
  allPatientSessionNotes: SessionNote[];
  onCloseAndScheduleNext: (patientId: string) => void;
  onCloseAndCreateTask: (patientId: string) => void;
}

export interface ExerciseHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: Exercise;
    logs: ExerciseLog[];
}

export interface ExerciseFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (log: Omit<ExerciseLog, 'id'>) => void;
    prescription: Prescription;
    exercise: Exercise;
}

export interface SymptomDiaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (log: Omit<DailyLog, 'id' | 'patientId'>) => void;
    existingLog: DailyLog | null; // To edit today's log
}

export interface PatientFeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onSaveFeedback: (taskId: string, feedback: string) => void;
}

export interface AssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (assessment: Assessment) => void;
    onDelete: (assessmentId: string) => void;
    onPrescribeExercises: (exerciseIds: string[]) => void;
    assessment: Partial<Assessment> | null;
    patientId: string;
    therapistId: string;
    isReadOnly?: boolean;
    exercises: Exercise[];
    templates: AssessmentTemplate[];
}

export interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (goal: TherapistGoal) => void;
    onDelete: (goalId: string) => void;
    goal: Partial<TherapistGoal> | null;
    patientId: string;
    assessment: Assessment | null;
}

export interface SummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    isLoading: boolean;
}

export interface VideoRecordingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (videoBlob: Blob) => void;
    exercise: Exercise;
}

export interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete: (userId: string) => void;
  user: Partial<User> | null;
}

export interface PatientCardProps {
    patient: Patient;
    isSelected: boolean;
    onClick: () => void;
    appointmentCount: number;
    overdueTaskCount: number;
    isChecked: boolean;
    onCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isSelectionMode: boolean;
}

export interface PatientDetailPanelProps {
    onClose: () => void;
    onSave: (patient: Patient) => void;
    onDelete: (patientId: string) => void;
    onScheduleNext: (patientId: string) => void;
    patient: Patient;
    tasks: Task[];
    appointments: Appointment[];
    prescribedExercises: Prescription[];
    exercises: Exercise[];
    exerciseLogs: ExerciseLog[];
    dailyLogs: DailyLog[];
    assessments: Assessment[];
    transactions: Transaction[];
    chatMessages: ChatMessage[];
    therapistGoals: TherapistGoal[];
    sessionNotes: SessionNote[];
    packages: Package[];
    patientPackages: PatientPackage[];
    permissions: PatientPermissionSet;
}


export interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Service) => void;
    service: Partial<Service> | null;
}

export interface PackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (pkg: Package) => void;
    pkg: Partial<Package> | null;
    services: Service[];
}

export interface AssignPackageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (packageId: string) => void;
    packages: Package[];
    patientName: string;
}

export interface SessionNoteTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (template: SessionNoteTemplate) => void;
    template: Partial<SessionNoteTemplate> | null;
}

export interface ProtocolDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (protocol: ClinicalProtocol) => void;
    protocol: ClinicalProtocol | null;
}

export interface ReceiptProps {
    patient: Patient;
    transaction: Transaction;
    settings: ClinicSettings;
    onClose: () => void;
}

export interface SendFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (templateId: string) => void;
    templates: FormTemplate[];
    patientName: string;
}

export interface ViewSubmissionModalProps {
    isOpen: boolean;
    onClose: () => void;
    submission: FormSubmission;
    template: FormTemplate | undefined;
}

export interface FillFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (submission: FormSubmission) => void;
    submission: FormSubmission;
    template: FormTemplate | undefined;
}

export interface AutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (automation: Automation) => void;
    automation: Partial<Automation> | null;
    formTemplates: FormTemplate[];
    users: User[];
}

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (scope: 'single' | 'all') => void;
    title: string;
    message: string;
    confirmTextSingle?: string;
    confirmTextAll?: string;
}

export interface DestructiveConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmationWord: string;
}

export interface AppointmentLogModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: AppointmentLog[];
}

export type ExerciseImageCategory = 'Posição Inicial' | 'Execução' | 'Posição Final' | 'Anatomia' | 'Equipamentos';

export interface ExerciseImage {
    id: string;
    exerciseId: string;
    imageUrl: string;
    category: ExerciseImageCategory;
    order: number;
    caption?: string;
}

export interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: ExerciseImage | null;
}

export interface EducationalCaseStudy {
  id: string;
  title: string;
  description: string;
  anonymousPatientSummary: string;
  learningObjectives: string[];
  discussionQuestions: string[];
  authorId: string;
  createdAt: string; // ISO String
}

export interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caseStudy: EducationalCaseStudy) => void;
  caseStudy: Partial<EducationalCaseStudy> | null;
  patients: Patient[];
  assessments: Assessment[];
}

export interface ImportPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPatient: (patient: Patient, assessments: Assessment[]) => void;
    patients: Patient[];
    assessments: Assessment[];
}

export interface Medication {
    id: string;
    patientId: string;
    name: string;
    dosage: string; // e.g., "500mg"
    frequency: string; // e.g., "A cada 8 horas"
    reminderTimes: string[]; // e.g., ["08:00", "16:00", "24:00"]
    startDate: string; // ISO String
    endDate?: string; // ISO String
}

export interface MedicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (medication: Medication) => void;
    onDelete?: (medicationId: string) => void;
    medication: Partial<Medication> | null;
    patientId: string;
}

export interface Backup {
    id: string;
    timestamp: string;
    status: 'success' | 'failed' | 'in_progress';
    version: string;
    size?: string;
}

export interface PatientFlowsheetTabProps {
    patient: Patient;
    assessments: Assessment[];
    goals: TherapistGoal[];
    exerciseLogs: ExerciseLog[];
    dailyLogs: DailyLog[];
    prescriptions: Prescription[];
}
