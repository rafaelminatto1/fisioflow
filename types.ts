export enum UserRole {
  ADMIN = 'admin',
  FISIOTERAPEUTA = 'fisio',
  ESTAGIARIO = 'estagiario',
  PACIENTE = 'paciente',
}

export type SubscriptionPlan = 'free' | 'silver' | 'gold' | 'platinum';

export interface Tenant {
  id: string;
  name: string;
  plan: SubscriptionPlan;
}

export interface BillingPlan {
  id: SubscriptionPlan;
  name: string;
  price: string;
  features: string[];
  isCurrent: boolean;
}

export interface ClinicOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void; // This will trigger a logout or app reload
  onOnboard: (clinicName: string, plan: SubscriptionPlan) => void;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  patientProfileId?: string;
  email?: string;
  phone?: string;
  tenantId?: string;
}

export enum LogAction {
  // User Management
  CREATE_USER = 'Criou Usuário',
  UPDATE_USER = 'Atualizou Usuário',
  DELETE_USER = 'Excluiu Usuário',

  // Patient Management
  CREATE_PATIENT = 'Criou Paciente',
  UPDATE_PATIENT = 'Atualizou Paciente',
  DELETE_PATIENT = 'Excluiu Paciente',
  GIVE_CONSENT = 'Registrou Consentimento',

  // Task Management
  CREATE_TASK = 'Criou Tarefa',
  UPDATE_TASK = 'Atualizou Tarefa',
  DELETE_TASK = 'Excluiu Tarefa',

  // Appointment Management
  CREATE_APPOINTMENT = 'Criou Agendamento',
  UPDATE_APPOINTMENT = 'Atualizou Agendamento',
  DELETE_APPOINTMENT = 'Excluiu Agendamento',

  // Exercise Management
  CREATE_EXERCISE = 'Criou Exercício',
  UPDATE_EXERCISE = 'Atualizou Exercício',
  DELETE_EXERCISE = 'Excluiu Exercício',

  // Prescription Management
  CREATE_PRESCRIPTION = 'Criou Prescrição',
  UPDATE_PRESCRIPTION = 'Atualizou Prescrição',
  DELETE_PRESCRIPTION = 'Excluiu Prescrição',

  // Assessment Management
  CREATE_ASSESSMENT = 'Criou Avaliação',
  UPDATE_ASSESSMENT = 'Atualizou Avaliação',
  DELETE_ASSESSMENT = 'Excluiu Avaliação',

  // Financial Management
  CREATE_TRANSACTION = 'Criou Transação',
  UPDATE_TRANSACTION = 'Atualizou Transação',
  DELETE_TRANSACTION = 'Excluiu Transação',

  // Notebook Management
  UPDATE_PAGE = 'Atualizou Página de Notebook',

  // Document Management
  CREATE_DOCUMENT = 'Fez Upload de Documento',
  DELETE_DOCUMENT = 'Excluiu Documento',

  // Chat Management
  CREATE_CHAT_MESSAGE = 'Enviou Mensagem de Chat',
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  action: LogAction;
  targetCollection: string;
  targetId: string;
  targetName?: string;
  details?: any;
  tenantId: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  medicalHistory: string;
  consent: {
    given: boolean;
    timestamp?: string; // ISO string
  };
  createdAt: string; // ISO string
  tenantId: string;
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
  tenantId: string;
}

export interface Notebook {
  id: string;
  title: string;
  icon: React.ReactNode;
  pages: Page[];
  tenantId: string;
}

export interface Page {
  id: string;
  title: string;
  content?: string;
  subpages?: Page[];
}

export interface Appointment {
  id: string;
  title: string;
  patientId: string;
  therapistId: string;
  start: string; // ISO string format
  end: string; // ISO string format
  date: string; // ISO string date (YYYY-MM-DD)
  notes?: string;
  status?: 'agendado' | 'confirmado' | 'realizado' | 'cancelado';
  tenantId: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  therapistId: string;
  start: string; // ISO string format
  end: string; // ISO string format
  type: 'break' | 'lunch' | 'unavailable';
  description?: string;
  tenantId: string;
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  category: 'Fortalecimento' | 'Mobilidade' | 'Cardio' | 'Equilíbrio' | 'Mobilização Neural' | 'Alongamento' | 'Propriocepção' | 'Relaxamento';
  bodyPart: 'Ombro' | 'Joelho' | 'Coluna' | 'Quadril' | 'Tornozelo' | 'Geral' | 'Cervical' | 'Membros Superiores' | 'Tronco' | 'Membros Inferiores';
  subcategory?: string;
  videoUrl: string; // YouTube embed URL
  indications: string[]; // Indicações clínicas específicas
  contraindications: string[]; // Contraindicações claras
  difficultyLevel: 1 | 2 | 3 | 4 | 5; // Nível de dificuldade
  equipment?: string[]; // Equipamentos necessários
  targetMuscles?: string[]; // Músculos alvo
  duration?: string; // Duração sugerida
  frequency?: string; // Frequência recomendada
}

// === SISTEMA DE VÍDEOS ===

export type VideoQuality = 'low' | 'medium' | 'high' | 'auto';
export type VideoType = 'demonstration' | 'progression' | 'variation' | 'alternative';

export interface ExerciseVideo {
  id: string;
  exerciseId: string;
  title: string;
  description?: string;
  videoUrl: string; // URL do arquivo de vídeo ou YouTube
  thumbnailUrl?: string; // URL da thumbnail
  duration: number; // Duração em segundos
  type: VideoType;
  quality: VideoQuality;
  fileSize?: number; // Tamanho em bytes (se arquivo local)
  format?: string; // mp4, avi, mov, etc.
  uploadedById: string;
  uploadedAt: string; // ISO string
  order: number; // Ordem de exibição
  tags: string[]; // Tags para organização
  isActive: boolean;
  youtubeId?: string; // ID do YouTube se for vídeo do YouTube
  viewCount: number;
  lastViewed?: string; // ISO string
  tenantId: string;
}

// === SISTEMA DE IMAGENS ===

export type ImageCategory = 'initial_position' | 'execution' | 'final_position' | 'anatomy' | 'equipment' | 'variation';

export interface ExerciseImage {
  id: string;
  exerciseId: string;
  title: string;
  caption?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  category: ImageCategory;
  order: number;
  width?: number;
  height?: number;
  fileSize?: number; // Tamanho em bytes
  format?: string; // jpg, png, webp, etc.
  uploadedById: string;
  uploadedAt: string; // ISO string
  tags: string[];
  isActive: boolean;
  annotationPoints?: ImageAnnotation[]; // Pontos de anotação na imagem
  tenantId: string;
}

export interface ImageAnnotation {
  id: string;
  x: number; // Posição X em %
  y: number; // Posição Y em %
  title: string;
  description?: string;
  color?: string; // Cor do ponto de anotação
}

// === SISTEMA DE FAVORITOS E AVALIAÇÕES ===

export interface ExerciseFavorite {
  id: string;
  userId: string;
  exerciseId: string;
  createdAt: string; // ISO string
  tenantId: string;
}

export type ExerciseRatingEmoji = '😊' | '😐' | '😰';

export interface ExerciseRating {
  id: string;
  patientId: string;
  exerciseId: string;
  prescriptionId?: string; // Vinculado a uma prescrição específica
  rating: ExerciseRatingEmoji;
  painLevel: number; // 0-10 escala de dor
  comments?: string;
  date: string; // ISO string
  sessionNumber?: number; // Número da sessão
  tenantId: string;
}

export interface ExerciseStatistics {
  exerciseId: string;
  exerciseName: string;
  totalRatings: number;
  averagePainLevel: number;
  ratingDistribution: {
    easy: number; // 😊
    medium: number; // 😐
    difficult: number; // 😰
  };
  favoriteCount: number;
  usageCount: number;
  lastUsed: string; // ISO string
}

export interface Prescription {
  id: string;
  patientId: string;
  exerciseId: string;
  sets: number;
  reps: number;
  frequency: string; // e.g. "3x por semana"
  notes?: string;
  tenantId: string;
}

export interface ExerciseLog {
  id: string;
  prescriptionId: string;
  patientId: string;
  date: string; // ISO String
  painLevel: number; // 0-10
  difficultyLevel: number; // 0-10
  notes?: string;
  tenantId: string;
}

export interface Transaction {
  id: string;
  patientId: string;
  description: string;
  amount: number;
  status: 'pago' | 'pendente';
  type: 'receita' | 'despesa';
  date: string; // ISO string for the transaction date
  dueDate: string; // ISO string for the due date
  paidDate?: string; // ISO string for when it was paid
  paymentMethod?: string;
  tenantId: string;
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
  id: string;
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
  tenantId: string;
}

export interface Document {
  id: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  uploadDate: string; // ISO string
  uploadedById: string; // user ID
  tenantId: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string
  tenantId: string;
}

export interface Chat {
  id: string; // e.g., 'user1-user2'
  participants: string[]; // array of user IDs
  lastMessageTimestamp: string;
  tenantId: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'Anatomia' | 'Técnicas' | 'Avaliação' | 'Reabilitação' | 'Ética';
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  estimatedHours: number;
  modules: CourseModule[];
  instructorId: string;
  enrolledStudents: string[]; // user IDs
  published: boolean;
  tenantId: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  content: string; // Rich text content
  videoUrl?: string;
  attachments: MaterialAttachment[];
  order: number;
  estimatedMinutes: number;
}

export interface MaterialAttachment {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'link';
  url: string;
  size?: number; // in bytes for files
}

export interface StudentProgress {
  id: string;
  studentId: string;
  courseId: string;
  completedModules: string[]; // module IDs
  totalTimeSpent: number; // in minutes
  lastAccessed: string; // ISO string
  grade?: number; // 0-100
  certificateIssued: boolean;
  tenantId: string;
}

export interface MentorshipSession {
  id: string;
  mentorId: string;
  studentId: string;
  title: string;
  notes: string;
  date: string; // ISO string
  duration: number; // in minutes
  topics: string[];
  rating?: number; // 1-5 stars from student
  feedback?: string;
  tenantId: string;
}

export interface ClinicalCase {
  id: string;
  title: string;
  specialty:
    | 'Ortopedia'
    | 'Neurologia'
    | 'Cardio'
    | 'Respiratoria'
    | 'Pediatria'
    | 'Geriatria'
    | 'Esportiva'
    | 'Geral';
  pathology: string;
  tags: string[];
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado';
  anonymizedPatientData: {
    age: number;
    gender: 'M' | 'F' | 'Outro';
    occupation?: string;
    relevantHistory: string;
  };
  clinicalHistory: string;
  examinations: CaseExamination[];
  treatment: CaseTreatment;
  evolution: CaseEvolution[];
  attachments: CaseAttachment[];
  discussionQuestions: string[];
  learningObjectives: string[];
  createdById: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isPublished: boolean;
  viewCount: number;
  rating: number; // Average rating 0-5
  ratingCount: number;
  tenantId: string;
}

export interface CaseExamination {
  id: string;
  type: 'Física' | 'Laboratorial' | 'Imagem' | 'Funcional' | 'Outro';
  name: string;
  findings: string;
  date: string; // ISO string
  attachments?: string[]; // IDs of related attachments
}

export interface CaseTreatment {
  objectives: string[];
  interventions: CaseIntervention[];
  duration: string; // e.g., "6 semanas"
  frequency: string; // e.g., "3x por semana"
  precautions: string[];
}

export interface CaseIntervention {
  id: string;
  type:
    | 'Cinesioterapia'
    | 'Terapia Manual'
    | 'Eletroterapia'
    | 'Hidroterapia'
    | 'Educação'
    | 'Outro';
  description: string;
  parameters?: string; // Parameters specific to the intervention
  progression: string;
}

export interface CaseEvolution {
  id: string;
  date: string; // ISO string
  sessionNumber: number;
  findings: string;
  progress: string;
  modifications: string;
  nextSteps: string;
}

export interface CaseAttachment {
  id: string;
  caseId: string;
  fileName: string;
  fileType: 'image' | 'video' | 'pdf' | 'document' | 'other';
  fileSize: number; // in bytes
  url: string; // File storage URL or path
  description?: string;
  category: 'Exame' | 'Imagem' | 'Video' | 'Documento' | 'Outro';
  uploadedAt: string; // ISO string
  uploadedById: string;
  tenantId: string;
}

export interface CaseComment {
  id: string;
  caseId: string;
  authorId: string;
  authorName: string;
  content: string;
  parentCommentId?: string; // For nested comments
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  likes: number;
  likedBy: string[]; // User IDs who liked this comment
  tenantId: string;
}

export interface CaseView {
  id: string;
  caseId: string;
  userId: string;
  viewedAt: string; // ISO string
  duration: number; // in seconds
  completed: boolean; // Did they view the entire case?
  tenantId: string;
}

export interface CaseRating {
  id: string;
  caseId: string;
  userId: string;
  rating: number; // 1-5 stars
  review?: string;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string
  tenantId: string;
}

export interface CaseFavorite {
  id: string;
  caseId: string;
  userId: string;
  createdAt: string; // ISO string
  tenantId: string;
}

export interface ClinicalProtocol {
  id: string;
  name: string;
  description: string;
  specialty:
    | 'Ortopedia'
    | 'Neurologia'
    | 'Cardio'
    | 'Respiratoria'
    | 'Pediatria'
    | 'Geriatria'
    | 'Esportiva'
    | 'Geral';
  category: 'Pós-Cirúrgico' | 'Conservador' | 'Preventivo' | 'Manutenção';
  indication: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  expectedDuration: string; // e.g., "12 semanas"
  phases: ProtocolPhase[];
  evidences: ProtocolEvidence[];
  expectedOutcomes: string[];
  contraindications: string[];
  precautions: string[];
  createdById: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  isActive: boolean;
  version: string;
  tenantId: string;
}

export interface ProtocolPhase {
  id: string;
  protocolId: string;
  name: string;
  description: string;
  phase: 'Aguda' | 'Subaguda' | 'Crônica' | 'Manutenção';
  order: number;
  duration: string; // e.g., "2-4 semanas"
  objectives: string[];
  exercises: ProtocolExercise[];
  progressionCriteria: string[];
  precautions: string[];
  frequency: string; // e.g., "3x por semana"
  tenantId: string;
}

export interface ProtocolExercise {
  id: string;
  phaseId: string;
  exerciseId: string; // Reference to Exercise from existing system
  sets: number;
  reps: string; // e.g., "10-15" or "30 segundos"
  intensity: string; // e.g., "Leve", "Moderada", "Intensa"
  progression: string;
  modifications: string[];
  order: number;
  tenantId: string;
}

export interface ProtocolEvidence {
  id: string;
  protocolId: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  doi?: string;
  evidenceLevel: 'I' | 'II' | 'III' | 'IV' | 'V';
  description: string;
  link?: string;
  tenantId: string;
}

export interface PatientProtocol {
  id: string;
  patientId: string;
  protocolId: string;
  prescribedById: string;
  startDate: string; // ISO string
  expectedEndDate: string; // ISO string
  actualEndDate?: string; // ISO string
  currentPhaseId: string;
  status: 'Ativo' | 'Pausado' | 'Concluído' | 'Descontinuado';
  adherenceRate: number; // 0-100%
  customizations: ProtocolCustomization[];
  progressNotes: ProtocolProgressNote[];
  outcomes: ProtocolOutcome[];
  tenantId: string;
}

export interface ProtocolCustomization {
  id: string;
  patientProtocolId: string;
  exerciseId: string;
  originalSets: number;
  customSets: number;
  originalReps: string;
  customReps: string;
  originalIntensity: string;
  customIntensity: string;
  reason: string;
  modifiedById: string;
  modifiedAt: string; // ISO string
  tenantId: string;
}

export interface ProtocolProgressNote {
  id: string;
  patientProtocolId: string;
  date: string; // ISO string
  currentPhase: string;
  adherence: number; // 0-100%
  painLevel: number; // 0-10
  functionalLevel: number; // 0-10
  notes: string;
  therapistId: string;
  nextSteps: string;
  phaseProgression?: 'Manter' | 'Avançar' | 'Regredir';
  tenantId: string;
}

export interface ProtocolOutcome {
  id: string;
  patientProtocolId: string;
  metric: string; // e.g., "Amplitude de movimento", "Força muscular"
  initialValue: string;
  currentValue: string;
  targetValue: string;
  unit: string; // e.g., "graus", "kg", "escala 0-10"
  measurementDate: string; // ISO string
  assessedById: string;
  tenantId: string;
}

export interface ProtocolAnalytics {
  id: string;
  protocolId: string;
  totalPrescriptions: number;
  completionRate: number; // 0-100%
  averageAdherence: number; // 0-100%
  averageDuration: number; // in days
  effectivenessScore: number; // 0-100%
  patientSatisfaction: number; // 0-10
  lastUpdated: string; // ISO string
  tenantId: string;
}

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  task: Task | Partial<Task> | null;
  users: User[];
  patients: Patient[];
}

export interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => void;
  appointment: Appointment | Partial<Appointment> | null;
  users: User[];
  patients: Patient[];
  initialDate?: string; // YYYY-MM-DD
}

export interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
  onDelete: (patientId: string) => void;
  patient: Patient | Partial<Patient> | null;
  tasks: Task[];
  appointments: Appointment[];
  prescribedExercises: Prescription[];
  exercises: Exercise[];
  exerciseLogs: ExerciseLog[];
  assessments: Assessment[];
  transactions: Transaction[];
  documents: Document[];
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

export interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assessment: Assessment) => void;
  onDelete: (assessmentId: string) => void;
  assessment: Assessment | Partial<Assessment> | null;
  patientId: string;
  therapistId: string;
  isReadOnly?: boolean;
}

export interface NotebookPageProps {
  pageId: string;
}

export interface PatientFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSaveFeedback: (taskId: string, feedback: string) => void;
}

export interface ExerciseFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: Omit<ExerciseLog, 'id' | 'tenantId'>) => void;
  prescription: Prescription;
  exercise: Exercise;
}

export interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
  logs: ExerciseLog[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  onDelete: (userId: string) => void;
  user: User | Partial<User> | null;
}

export interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  contextType?: 'staff' | 'patient';
  patientData?: {
    patient: Patient;
    appointments: Appointment[];
    prescriptions: Prescription[];
    exercises: Exercise[];
  };
}

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onConfirmPayment: (transaction: Transaction) => void;
}

export interface AbandonmentRiskPrediction {
  patientId: string;
  patientName: string;
  riskLevel: 'Alto' | 'Médio' | 'Baixo';
  reason: string;
}

// In DataContextType, update function signatures
export interface DataContextType {
  users: User[];
  tasks: Task[];
  patients: Patient[];
  notebooks: Notebook[];
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  exercises: Exercise[];
  prescriptions: Prescription[];
  exerciseLogs: ExerciseLog[];
  assessments: Assessment[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  tenants: Tenant[];
  documents: Document[];
  chats: Chat[];
  chatMessages: ChatMessage[];
  courses: Course[];
  studentProgress: StudentProgress[];
  mentorshipSessions: MentorshipSession[];
  clinicalCases: ClinicalCase[];
  caseAttachments: CaseAttachment[];
  caseComments: CaseComment[];
  caseViews: CaseView[];
  caseRatings: CaseRating[];
  caseFavorites: CaseFavorite[];
  clinicalProtocols: ClinicalProtocol[];
  protocolPhases: ProtocolPhase[];
  protocolExercises: ProtocolExercise[];
  protocolEvidences: ProtocolEvidence[];
  patientProtocols: PatientProtocol[];
  protocolCustomizations: ProtocolCustomization[];
  protocolProgressNotes: ProtocolProgressNote[];
  protocolOutcomes: ProtocolOutcome[];
  protocolAnalytics: ProtocolAnalytics[];
  qualityIndicators: QualityIndicator[];
  productivityMetrics: ProductivityMetric[];
  equipment: Equipment[];
  operationalAlerts: OperationalAlert[];
  executiveReports: ExecutiveReport[];
  // Sistema de Favoritos e Avaliações
  exerciseFavorites: ExerciseFavorite[];
  exerciseRatings: ExerciseRating[];
  // Sistema de Vídeos e Imagens
  exerciseVideos: ExerciseVideo[];
  exerciseImages: ExerciseImage[];
  saveTenant: (tenant: Partial<Tenant>, actingUser: User) => void;
  saveUser: (user: User, actingUser: User) => void;
  deleteUser: (userId: string, actingUser: User) => void;
  saveTask: (task: Task, actingUser: User) => void;
  deleteTask: (taskId: string, actingUser: User) => void;
  savePatient: (patient: Patient, actingUser: User) => void;
  deletePatient: (patientId: string, actingUser: User) => void;
  savePage: (pageId: string, content: string, actingUser: User) => void;
  addTaskFeedback: (taskId: string, feedback: string) => void;
  saveAppointment: (appointment: Appointment, actingUser: User) => void;
  deleteAppointment: (appointmentId: string, actingUser: User) => void;
  saveTimeBlock: (timeBlock: TimeBlock, actingUser: User) => void;
  deleteTimeBlock: (timeBlockId: string, actingUser: User) => void;
  saveExercise: (exercise: Exercise, actingUser: User) => void;
  deleteExercise: (exerciseId: string, actingUser: User) => void;
  savePrescription: (prescription: Prescription, actingUser: User) => void;
  deletePrescription: (prescriptionId: string, actingUser: User) => void;
  saveExerciseLog: (
    log: Omit<ExerciseLog, 'id' | 'tenantId'>,
    actingUser: User
  ) => void;
  saveAssessment: (assessment: Assessment, actingUser: User) => void;
  deleteAssessment: (assessmentId: string, actingUser: User) => void;
  saveTransaction: (transaction: Transaction, actingUser: User) => void;
  deleteTransaction: (transactionId: string, actingUser: User) => void;
  saveDocument: (document: Document, actingUser: User) => void;
  deleteDocument: (documentId: string, actingUser: User) => void;
  sendChatMessage: (
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
    actingUser: User
  ) => void;
  saveCourse: (course: Course, actingUser: User) => void;
  deleteCourse: (courseId: string, actingUser: User) => void;
  saveStudentProgress: (progress: StudentProgress, actingUser: User) => void;
  saveMentorshipSession: (session: MentorshipSession, actingUser: User) => void;
  deleteMentorshipSession: (sessionId: string, actingUser: User) => void;
  saveClinicalCase: (clinicalCase: ClinicalCase, actingUser: User) => void;
  deleteClinicalCase: (caseId: string, actingUser: User) => void;
  saveCaseAttachment: (attachment: CaseAttachment, actingUser: User) => void;
  deleteCaseAttachment: (attachmentId: string, actingUser: User) => void;
  saveCaseComment: (
    comment: Omit<CaseComment, 'id' | 'createdAt'>,
    actingUser: User
  ) => void;
  deleteCaseComment: (commentId: string, actingUser: User) => void;
  likeCaseComment: (commentId: string, actingUser: User) => void;
  recordCaseView: (
    caseId: string,
    duration: number,
    completed: boolean,
    actingUser: User
  ) => void;
  saveCaseRating: (
    rating: Omit<CaseRating, 'id' | 'createdAt'>,
    actingUser: User
  ) => void;
  toggleCaseFavorite: (caseId: string, actingUser: User) => void;
  saveClinicalProtocol: (protocol: ClinicalProtocol, actingUser: User) => void;
  deleteClinicalProtocol: (protocolId: string, actingUser: User) => void;
  prescribeProtocol: (
    patientId: string,
    protocolId: string,
    customizations: ProtocolCustomization[],
    actingUser: User
  ) => void;
  updatePatientProtocolStatus: (
    patientProtocolId: string,
    status: PatientProtocol['status'],
    actingUser: User
  ) => void;
  addProtocolProgressNote: (
    note: Omit<ProtocolProgressNote, 'id'>,
    actingUser: User
  ) => void;
  updateProtocolOutcome: (
    outcome: Omit<ProtocolOutcome, 'id'>,
    actingUser: User
  ) => void;
  advanceProtocolPhase: (
    patientProtocolId: string,
    newPhaseId: string,
    actingUser: User
  ) => void;
  customizeProtocolExercise: (
    customization: Omit<ProtocolCustomization, 'id'>,
    actingUser: User
  ) => void;
  acknowledgeAlert: (alertId: string, actingUser: User) => void;
  resolveAlert: (alertId: string, actingUser: User) => void;
  saveEquipment: (equipment: Equipment, actingUser: User) => void;
  deleteEquipment: (equipmentId: string, actingUser: User) => void;
  generateExecutiveReport: (
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom',
    period: { start: string; end: string },
    actingUser: User
  ) => ExecutiveReport | undefined;
  saveAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => void;
  getTasksForPatient: (patientId: string) => Task[];
  getAppointmentsForPatient: (patientId: string) => Appointment[];
  getPrescriptionsForPatient: (patientId: string) => Prescription[];
  getExerciseLogsForPatient: (patientId: string) => ExerciseLog[];
  getAssessmentsForPatient: (patientId: string) => Assessment[];
  getTransactionsForPatient: (patientId: string) => Transaction[];
  getDocumentsForPatient: (patientId: string) => Document[];
  getAllData: () => any;
  // Sistema de Favoritos e Avaliações - Funções
  toggleExerciseFavorite: (exerciseId: string, actingUser: User) => void;
  saveExerciseRating: (rating: Omit<ExerciseRating, 'id'>, actingUser: User) => void;
  getExerciseFavorites: (userId: string) => ExerciseFavorite[];
  getExerciseRatings: (exerciseId: string) => ExerciseRating[];
  getExerciseStatistics: (exerciseId: string) => ExerciseStatistics | null;
  getMostUsedExercises: (userId?: string) => ExerciseStatistics[];
  // Sistema de Vídeos e Imagens - Funções
  saveExerciseVideo: (video: Omit<ExerciseVideo, 'id'>, actingUser: User) => void;
  deleteExerciseVideo: (videoId: string, actingUser: User) => void;
  getExerciseVideos: (exerciseId: string) => ExerciseVideo[];
  incrementVideoView: (videoId: string, actingUser: User) => void;
  saveExerciseImage: (image: Omit<ExerciseImage, 'id'>, actingUser: User) => void;
  deleteExerciseImage: (imageId: string, actingUser: User) => void;
  getExerciseImages: (exerciseId: string) => ExerciseImage[];
  getExerciseImagesByCategory: (exerciseId: string, category: ImageCategory) => ExerciseImage[];
}

// Gestão Operacional - Modelos de Dados

export interface QualityIndicator {
  id: string;
  name: string;
  type:
    | 'nps'
    | 'satisfaction'
    | 'completion_rate'
    | 'effectiveness'
    | 'adherence';
  value: number;
  target: number;
  unit: string; // '%', 'score', 'days', etc.
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  timestamp: string;
  patientId?: string;
  therapistId?: string;
  protocolId?: string;
  trend: 'up' | 'down' | 'stable';
  previousValue?: number;
  tenantId: string;
}

export interface ProductivityMetric {
  id: string;
  therapistId: string;
  date: string;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  cancellationRate: number;
  averageSessionDuration: number;
  patientsPerDay: number;
  revenueGenerated: number;
  utilizationRate: number; // % do tempo útil utilizado
  efficiencyScore: number;
  qualityRating: number;
  tenantId: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: 'therapeutic' | 'diagnostic' | 'support' | 'technology';
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  warrantyExpiry?: string;
  status: 'active' | 'maintenance' | 'repair' | 'inactive' | 'disposed';
  location: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  maintenanceSchedule: string; // ISO date for next maintenance
  lastMaintenance?: string; // ISO date for last maintenance
  nextMaintenance?: string; // ISO date for next maintenance
  usageHours?: number;
  cost: number;
  depreciationRate?: number;
  responsibleId?: string; // User responsible for the equipment
  notes?: string;
  tenantId: string;
}

export interface OperationalAlert {
  id: string;
  type:
    | 'quality'
    | 'productivity'
    | 'equipment'
    | 'financial'
    | 'schedule'
    | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  source: string; // What triggered the alert
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  isActive: boolean;
  autoResolve: boolean;
  thresholdValue?: number;
  actualValue?: number;
  entityId?: string; // Related entity (patient, therapist, equipment, etc.)
  entityType?: string;
  actionRequired?: string;
  tenantId: string;
}

export interface ExecutiveReport {
  id: string;
  title: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  generatedBy: string;
  status: 'generating' | 'ready' | 'error';
  sections: ReportSection[];
  summary: ReportSummary;
  kpis: KPIData[];
  fileUrl?: string; // For PDF/Excel exports
  tenantId: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'kpi' | 'chart' | 'table' | 'text' | 'metrics';
  data: any;
  chartConfig?: ChartConfig;
}

export interface ReportSummary {
  totalRevenue: number;
  totalAppointments: number;
  averageSatisfaction: number;
  utilizationRate: number;
  topPerformer: string;
  mainConcerns: string[];
  recommendations: string[];
}

export interface KPIData {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number; // % change from previous period
  category: 'financial' | 'operational' | 'quality' | 'productivity';
  isGood: boolean; // Whether current value is good or bad
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  labels: string[];
  datasets: ChartDataset[];
  options?: any;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
}
