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
  category:
    | 'Fortalecimento'
    | 'Mobilidade'
    | 'Cardio'
    | 'Equilíbrio'
    | 'Mobilização Neural'
    | 'Alongamento'
    | 'Propriocepção'
    | 'Relaxamento';
  bodyPart:
    | 'Ombro'
    | 'Joelho'
    | 'Coluna'
    | 'Quadril'
    | 'Tornozelo'
    | 'Geral'
    | 'Cervical'
    | 'Membros Superiores'
    | 'Tronco'
    | 'Membros Inferiores';
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
export type VideoType =
  | 'demonstration'
  | 'progression'
  | 'variation'
  | 'alternative';

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

export type ImageCategory =
  | 'initial_position'
  | 'execution'
  | 'final_position'
  | 'anatomy'
  | 'equipment'
  | 'variation';

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

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'exercise'
  | 'appointment'
  | 'file';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text?: string;
  type: MessageType;
  timestamp: string; // ISO string
  readAt?: string; // ISO string - quando a mensagem foi lida
  editedAt?: string; // ISO string - quando foi editada
  replyToId?: string; // ID da mensagem sendo respondida
  attachments?: ChatAttachment[];
  metadata?: ChatMessageMetadata;
  tenantId: string;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  name: string;
  size: number; // bytes
  mimeType: string;
  thumbnailUrl?: string; // para vídeos e imagens
}

export interface ChatMessageMetadata {
  exerciseId?: string; // para mensagens de exercício
  appointmentId?: string; // para agendamentos
  prescriptionId?: string; // para prescrições
  templateId?: string; // para templates usados
  translatedText?: string; // texto traduzido
  originalLanguage?: string;
  isFromTemplate?: boolean;
}

export interface Chat {
  id: string; // e.g., 'patient-therapist-123'
  participants: string[]; // array of user IDs
  participantRoles: Record<string, UserRole>; // role de cada participante
  lastMessage?: ChatMessage;
  lastMessageTimestamp: string;
  unreadCount: Record<string, number>; // contador de não lidas por usuário
  isActive: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  settings?: ChatSettings;
  tenantId: string;
}

export interface ChatSettings {
  allowFileSharing: boolean;
  allowVoiceMessages: boolean;
  allowVideoCall: boolean;
  enableTranslation: boolean;
  enableNotifications: boolean;
  notificationSound: string;
  autoDeleteAfterDays?: number;
}

export interface ChatNotification {
  id: string;
  userId: string;
  chatId: string;
  messageId: string;
  type: 'new_message' | 'message_read' | 'typing' | 'online_status';
  title: string;
  body: string;
  data?: any;
  readAt?: string;
  createdAt: string;
  tenantId: string;
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category:
    | 'greeting'
    | 'appointment'
    | 'exercise'
    | 'followup'
    | 'reminder'
    | 'general';
  userRole: UserRole; // para qual tipo de usuário é o template
  isActive: boolean;
  usageCount: number;
  createdById: string;
  createdAt: string;
  tenantId: string;
}

export interface UserStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string; // ISO string
  isTyping: boolean;
  typingInChat?: string; // ID do chat onde está digitando
  status: 'available' | 'busy' | 'away' | 'offline';
  customMessage?: string;
}

export interface VoiceCall {
  id: string;
  chatId: string;
  initiatorId: string;
  receiverId: string;
  status: 'initiated' | 'ringing' | 'accepted' | 'ended' | 'missed';
  startedAt?: string; // ISO string
  endedAt?: string; // ISO string
  duration?: number; // segundos
  recordingUrl?: string;
  tenantId: string;
}

export interface VideoCall {
  id: string;
  chatId: string;
  initiatorId: string;
  receiverId: string;
  status: 'initiated' | 'ringing' | 'accepted' | 'ended' | 'missed';
  startedAt?: string; // ISO string
  endedAt?: string; // ISO string
  duration?: number; // segundos
  recordingUrl?: string;
  screenShareEnabled: boolean;
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
  // Sistema de Lembretes e Notificações
  reminderRules: ReminderRule[];
  scheduledReminders: ScheduledReminder[];
  reminderSettings: ReminderSettings[];
  notificationDeliveryLogs: NotificationDeliveryLog[];
  reminderAnalytics: ReminderAnalytics[];
  smartReminderInsights: SmartReminderInsight[];
  // Sistema de Diário de Sintomas
  symptomDiaryEntries: SymptomDiaryEntry[];
  symptomDiaryTemplates: SymptomDiaryTemplate[];
  symptomAnalyses: SymptomAnalysis[];
  symptomInsights: SymptomInsight[];
  symptomAlerts: SymptomAlert[];
  symptomReports: SymptomReport[];
  symptomDiarySettings: SymptomDiarySettings[];
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
  saveExerciseRating: (
    rating: Omit<ExerciseRating, 'id'>,
    actingUser: User
  ) => void;
  getExerciseFavorites: (userId: string) => ExerciseFavorite[];
  getExerciseRatings: (exerciseId: string) => ExerciseRating[];
  getExerciseStatistics: (exerciseId: string) => ExerciseStatistics | null;
  getMostUsedExercises: (userId?: string) => ExerciseStatistics[];
  // Sistema de Vídeos e Imagens - Funções
  saveExerciseVideo: (
    video: Omit<ExerciseVideo, 'id'>,
    actingUser: User
  ) => void;
  deleteExerciseVideo: (videoId: string, actingUser: User) => void;
  getExerciseVideos: (exerciseId: string) => ExerciseVideo[];
  incrementVideoView: (videoId: string, actingUser: User) => void;
  saveExerciseImage: (
    image: Omit<ExerciseImage, 'id'>,
    actingUser: User
  ) => void;
  deleteExerciseImage: (imageId: string, actingUser: User) => void;
  getExerciseImages: (exerciseId: string) => ExerciseImage[];
  getExerciseImagesByCategory: (
    exerciseId: string,
    category: ImageCategory
  ) => ExerciseImage[];
  // Sistema de Lembretes e Notificações - Funções
  saveReminderRule: (rule: Omit<ReminderRule, 'id'>, actingUser: User) => void;
  updateReminderRule: (
    ruleId: string,
    updates: Partial<ReminderRule>,
    actingUser: User
  ) => void;
  deleteReminderRule: (ruleId: string, actingUser: User) => void;
  scheduleReminder: (
    reminder: Omit<ScheduledReminder, 'id'>,
    actingUser: User
  ) => void;
  cancelScheduledReminder: (reminderId: string, actingUser: User) => void;
  markReminderAsSent: (
    reminderId: string,
    channel: NotificationChannel,
    messageId?: string,
    actingUser?: User
  ) => void;
  markReminderAsRead: (reminderId: string, actingUser?: User) => void;
  saveReminderSettings: (
    settings: Omit<ReminderSettings, 'id'>,
    actingUser: User
  ) => void;
  updateReminderSettings: (
    patientId: string,
    updates: Partial<ReminderSettings>,
    actingUser: User
  ) => void;
  logNotificationDelivery: (
    log: Omit<NotificationDeliveryLog, 'id'>,
    actingUser?: User
  ) => void;
  generateReminderAnalytics: (
    patientId?: string,
    ruleId?: string,
    period?: { start: string; end: string },
    actingUser?: User
  ) => ReminderAnalytics;
  generateSmartInsights: (
    patientId: string,
    actingUser: User
  ) => SmartReminderInsight[];
  getReminderRulesForPatient: (patientId: string) => ReminderRule[];
  getScheduledRemindersForPatient: (patientId: string) => ScheduledReminder[];
  getReminderSettingsForPatient: (patientId: string) => ReminderSettings | null;
  processScheduledReminders: () => Promise<void>;
  // Sistema de Diário de Sintomas - Funções
  saveSymptomDiaryEntry: (
    entry: Omit<SymptomDiaryEntry, 'id'>,
    actingUser: User
  ) => void;
  updateSymptomDiaryEntry: (
    entryId: string,
    updates: Partial<SymptomDiaryEntry>,
    actingUser: User
  ) => void;
  deleteSymptomDiaryEntry: (entryId: string, actingUser: User) => void;
  getSymptomDiaryEntries: (
    patientId: string,
    startDate?: string,
    endDate?: string
  ) => SymptomDiaryEntry[];
  getTodaysSymptomEntry: (patientId: string) => SymptomDiaryEntry | null;
  createSymptomDiaryTemplate: (
    template: Omit<SymptomDiaryTemplate, 'id'>,
    actingUser: User
  ) => void;
  updateSymptomDiaryTemplate: (
    templateId: string,
    updates: Partial<SymptomDiaryTemplate>,
    actingUser: User
  ) => void;
  deleteSymptomDiaryTemplate: (templateId: string, actingUser: User) => void;
  generateSymptomAnalysis: (
    patientId: string,
    period: { start: string; end: string },
    actingUser: User
  ) => SymptomAnalysis;
  generateSymptomInsights: (
    patientId: string,
    actingUser: User
  ) => SymptomInsight[];
  createSymptomAlert: (
    alert: Omit<SymptomAlert, 'id'>,
    actingUser: User
  ) => void;
  acknowledgeSymptomAlert: (alertId: string, actingUser: User) => void;
  resolveSymptomAlert: (alertId: string, actingUser: User) => void;
  generateSymptomReport: (
    patientId: string,
    reportType: SymptomReport['reportType'],
    period: { start: string; end: string },
    actingUser: User
  ) => SymptomReport;
  getSymptomDiarySettings: (patientId: string) => SymptomDiarySettings | null;
  updateSymptomDiarySettings: (
    patientId: string,
    settings: Partial<SymptomDiarySettings>,
    actingUser: User
  ) => void;
  analyzeSymptomTrends: (
    patientId: string,
    metric: 'pain' | 'energy' | 'sleep' | 'mood',
    days: number
  ) => { trend: 'improving' | 'worsening' | 'stable'; rate: number };
  findSymptomCorrelations: (
    patientId: string,
    days: number
  ) => Array<{ metric1: string; metric2: string; correlation: number }>;
  getSymptomPatterns: (
    patientId: string,
    days: number
  ) => { dailyPatterns: any; weeklyPatterns: any; cyclicPatterns: any };
  checkSymptomAlerts: (patientId: string) => SymptomAlert[];
  exportSymptomData: (
    patientId: string,
    format: 'csv' | 'json' | 'pdf',
    period: { start: string; end: string }
  ) => string;
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

// Sistema de Lembretes e Notificações Inteligentes

export type ReminderType =
  | 'exercise_daily'
  | 'appointment_24h'
  | 'appointment_2h'
  | 'medication'
  | 'assessment_followup'
  | 'payment_reminder'
  | 'treatment_progress'
  | 'custom';

export type NotificationChannel =
  | 'push'
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'in_app';

export type ReminderFrequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'custom';

export interface ReminderRule {
  id: string;
  type: ReminderType;
  title: string;
  message: string;
  isActive: boolean;
  patientId?: string; // null for global rules
  channels: NotificationChannel[];
  frequency: ReminderFrequency;
  customFrequencyDays?: number[];
  timeOfDay: string; // HH:MM format
  conditions?: {
    minDaysSinceLastAppointment?: number;
    exerciseComplianceThreshold?: number;
    paymentOverdueDays?: number;
    customConditions?: Record<string, any>;
  };
  personalization: {
    usePatientName: boolean;
    useTherapistName: boolean;
    includeProgressData: boolean;
    customFields: string[];
  };
  scheduling: {
    allowedDays?: number[]; // 0-6 (Sunday-Saturday)
    blackoutDates?: string[]; // ISO dates
    timezone: string;
    respectQuietHours: boolean;
  };
  createdById: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface ScheduledReminder {
  id: string;
  ruleId: string;
  patientId: string;
  scheduledFor: string; // ISO timestamp
  title: string;
  message: string;
  channels: NotificationChannel[];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: string;
  sentAt?: string;
  readAt?: string;
  metadata: {
    originalScheduledTime: string;
    rescheduleCount: number;
    failureReason?: string;
    deliveryDetails?: Record<
      NotificationChannel,
      {
        sent: boolean;
        timestamp?: string;
        error?: string;
        messageId?: string;
      }
    >;
  };
  tenantId: string;
}

export interface ReminderSettings {
  id: string;
  patientId: string;
  globalSettings: {
    enabled: boolean;
    preferredChannels: NotificationChannel[];
    quietHours: {
      enabled: boolean;
      start: string; // HH:MM
      end: string; // HH:MM
    };
    timezone: string;
    language: 'pt' | 'en' | 'es';
  };
  channelSettings: {
    push: {
      enabled: boolean;
      sound: boolean;
      vibration: boolean;
      showPreview: boolean;
    };
    email: {
      enabled: boolean;
      emailAddress?: string;
    };
    sms: {
      enabled: boolean;
      phoneNumber?: string;
    };
    whatsapp: {
      enabled: boolean;
      phoneNumber?: string;
    };
  };
  typeSettings: Record<
    ReminderType,
    {
      enabled: boolean;
      preferredChannels: NotificationChannel[];
      customTime?: string; // Override default time
      snoozeOptions: number[]; // minutes
    }
  >;
  locationBasedSettings?: {
    enabled: boolean;
    clinicRadius: number; // meters
    homeRemindersOnly: boolean;
  };
  smartSettings: {
    adaptiveScheduling: boolean; // Adjust based on patient behavior
    skipWeekends: boolean;
    skipHolidays: boolean;
    consolidateReminders: boolean; // Group multiple reminders
  };
  updatedAt: string;
  tenantId: string;
}

export interface NotificationDeliveryLog {
  id: string;
  reminderId: string;
  patientId: string;
  channel: NotificationChannel;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'bounced';
  timestamp: string;
  messageId?: string;
  errorMessage?: string;
  responseData?: any;
  metadata: {
    deviceType?: string;
    userAgent?: string;
    location?: string;
    retryCount: number;
  };
  tenantId: string;
}

export interface ReminderAnalytics {
  id: string;
  patientId?: string; // null for global analytics
  ruleId?: string; // null for all rules
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalScheduled: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    totalFailed: number;
    deliveryRate: number; // %
    readRate: number; // %
    responseRate: number; // %
    averageResponseTime: number; // minutes
    channelPerformance: Record<
      NotificationChannel,
      {
        sent: number;
        delivered: number;
        read: number;
        failed: number;
        rate: number;
      }
    >;
    timeSlotPerformance: Record<
      string,
      {
        sent: number;
        read: number;
        rate: number;
      }
    >;
    patientEngagement: {
      highEngagement: number;
      mediumEngagement: number;
      lowEngagement: number;
      noEngagement: number;
    };
  };
  generatedAt: string;
  tenantId: string;
}

export interface SmartReminderInsight {
  id: string;
  patientId: string;
  type:
    | 'timing_optimization'
    | 'channel_preference'
    | 'frequency_adjustment'
    | 'content_personalization';
  insight: string;
  recommendation: string;
  confidence: number; // 0-100
  basedOnData: {
    dataPoints: number;
    timeFrame: string;
    patterns: string[];
  };
  implementationSuggestion?: {
    action: string;
    parameters: Record<string, any>;
    expectedImprovement: number; // % improvement expected
  };
  status: 'new' | 'reviewed' | 'implemented' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  tenantId: string;
}

// Sistema de Diário de Sintomas e Evolução

export type PainQuality =
  | 'stabbing' // pontada
  | 'burning' // queimação
  | 'aching' // dolorida
  | 'throbbing' // latejante
  | 'sharp' // aguda
  | 'dull' // surda
  | 'cramping' // cãibra
  | 'tingling' // formigamento
  | 'numb'; // dormência

export type BodyRegion =
  | 'head'
  | 'neck'
  | 'shoulder_left'
  | 'shoulder_right'
  | 'arm_left'
  | 'arm_right'
  | 'elbow_left'
  | 'elbow_right'
  | 'wrist_left'
  | 'wrist_right'
  | 'hand_left'
  | 'hand_right'
  | 'chest'
  | 'upper_back'
  | 'middle_back'
  | 'lower_back'
  | 'abdomen'
  | 'hip_left'
  | 'hip_right'
  | 'thigh_left'
  | 'thigh_right'
  | 'knee_left'
  | 'knee_right'
  | 'calf_left'
  | 'calf_right'
  | 'ankle_left'
  | 'ankle_right'
  | 'foot_left'
  | 'foot_right';

export type MoodLevel = 1 | 2 | 3 | 4 | 5; // 1 = muito ruim, 5 = excelente
export type EnergyLevel = 1 | 2 | 3 | 4 | 5; // 1 = exausto, 5 = muito energético
export type SleepQuality = 1 | 2 | 3 | 4 | 5; // 1 = péssima, 5 = excelente

export interface PainLocation {
  id: string;
  region: BodyRegion;
  intensity: number; // 0-10
  quality: PainQuality[];
  coordinates?: {
    x: number; // posição x no mapa corporal (%)
    y: number; // posição y no mapa corporal (%)
  };
  notes?: string;
}

export interface MedicationTaken {
  id: string;
  name: string;
  dosage: string;
  time: string; // HH:MM
  takenAsScheduled: boolean;
  sideEffects?: string[];
  effectiveness?: number; // 1-5 escala de efetividade
}

export interface ExerciseCompleted {
  id: string;
  exerciseId: string;
  exerciseName: string;
  duration: number; // minutos
  intensity: number; // 1-5
  difficulty: number; // 1-5 (como se sentiu)
  completedSets?: number;
  completedReps?: number;
  notes?: string;
}

export interface SymptomDiaryEntry {
  id: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string - quando foi registrado

  // Métricas principais
  overallPainLevel: number; // 0-10 escala geral de dor
  painLocations: PainLocation[];
  energyLevel: EnergyLevel;
  sleepQuality: SleepQuality;
  sleepHours?: number;
  moodLevel: MoodLevel;
  stressLevel?: number; // 0-10

  // Atividades e medicamentos
  medicationsTaken: MedicationTaken[];
  exercisesCompleted: ExerciseCompleted[];

  // Fatores externos
  weatherInfluence?: boolean;
  workStressLevel?: number; // 0-10
  physicalActivityLevel?: number; // 0-10

  // Notas e observações
  symptoms: string[]; // lista de sintomas relatados
  notes?: string;
  progressPhotos?: string[]; // URLs das fotos

  // Contexto do tratamento
  treatmentAdherence?: number; // 0-10 aderência ao tratamento
  treatmentSatisfaction?: number; // 0-10 satisfação com o tratamento

  // Metadata
  entryDuration?: number; // tempo gasto preenchendo (segundos)
  isComplete: boolean; // entrada foi completamente preenchida
  lastModified: string; // ISO string
  tenantId: string;
}

export interface SymptomDiaryTemplate {
  id: string;
  name: string;
  description: string;
  patientId?: string; // null para templates globais

  // Configuração dos campos
  fieldsConfig: {
    painLevel: { enabled: boolean; required: boolean };
    painLocations: { enabled: boolean; required: boolean };
    energy: { enabled: boolean; required: boolean };
    sleep: { enabled: boolean; required: boolean };
    mood: { enabled: boolean; required: boolean };
    stress: { enabled: boolean; required: boolean };
    medications: { enabled: boolean; required: boolean };
    exercises: { enabled: boolean; required: boolean };
    photos: { enabled: boolean; required: boolean };
    symptoms: { enabled: boolean; required: boolean };
    notes: { enabled: boolean; required: boolean };
  };

  // Configuração de lembretes
  reminderConfig?: {
    enabled: boolean;
    times: string[]; // horários para lembrar
    frequency: 'daily' | 'weekly' | 'custom';
    customDays?: number[]; // dias da semana (0-6)
  };

  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface SymptomAnalysis {
  id: string;
  patientId: string;
  analysisDate: string;
  period: {
    start: string;
    end: string;
  };

  // Tendências identificadas
  trends: {
    painTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
    energyTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
    sleepTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
    moodTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
    overallTrend: 'improving' | 'worsening' | 'stable' | 'fluctuating';
  };

  // Correlações encontradas
  correlations: {
    sleepPainCorrelation: number; // -1 a 1
    exercisePainCorrelation: number;
    moodEnergyCorrelation: number;
    medicationEffectivenessCorrelation: number;
    weatherPainCorrelation: number;
    stressPainCorrelation: number;
  };

  // Padrões identificados
  patterns: {
    bestDaysOfWeek: number[]; // dias da semana com menores sintomas
    worstDaysOfWeek: number[];
    bestTimeOfDay?: string; // horário com menos dor
    worstTimeOfDay?: string;
    cyclicPatterns: boolean; // se há padrões cíclicos
    cycleLength?: number; // em dias
  };

  // Estatísticas
  statistics: {
    averagePainLevel: number;
    painReduction?: number; // % de redução comparado ao período anterior
    averageEnergyLevel: number;
    averageSleepQuality: number;
    averageMoodLevel: number;
    adherenceRate: number; // % de dias com registro completo
    mostCommonSymptoms: string[];
    mostEffectiveMedications: string[];
    mostEffectiveExercises: string[];
  };

  // Insights e alertas
  insights: SymptomInsight[];
  alerts: SymptomAlert[];

  confidence: number; // 0-100 confiança da análise
  tenantId: string;
}

export interface SymptomInsight {
  id: string;
  type: 'pattern' | 'correlation' | 'trend' | 'recommendation' | 'warning';
  title: string;
  description: string;
  insight: string;
  recommendation?: string;
  evidence: string[]; // dados que suportam o insight
  confidence: number; // 0-100
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionable: boolean;
  category:
    | 'pain'
    | 'sleep'
    | 'energy'
    | 'mood'
    | 'medication'
    | 'exercise'
    | 'lifestyle';

  // Dados específicos do insight
  data?: {
    beforeValue?: number;
    afterValue?: number;
    changePercentage?: number;
    timeframe?: string;
    correlationStrength?: number;
  };

  // Sugestões de ação
  suggestedActions?: {
    action: string;
    expectedOutcome: string;
    effort: 'low' | 'medium' | 'high';
    timeframe: string;
  }[];

  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
  tenantId: string;
}

export interface SymptomAlert {
  id: string;
  patientId: string;
  type:
    | 'deterioration'
    | 'improvement'
    | 'anomaly'
    | 'missed_entries'
    | 'medication_concern';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;

  // Dados do alerta
  triggerData: {
    metric: string;
    currentValue: number;
    thresholdValue: number;
    changeRate?: number;
    timeframe: string;
    comparisonPeriod?: string;
  };

  // Recomendações
  recommendations: string[];

  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;

  // Notificações
  notifyTherapist: boolean;
  notifyPatient: boolean;
  notificationsSent?: {
    therapist?: string; // timestamp
    patient?: string; // timestamp
  };

  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface SymptomReport {
  id: string;
  patientId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  period: {
    start: string;
    end: string;
  };

  // Resumo executivo
  summary: {
    totalEntries: number;
    averagePainLevel: number;
    painTrend: 'improving' | 'worsening' | 'stable';
    keyHighlights: string[];
    majorConcerns: string[];
    achievements: string[];
  };

  // Métricas detalhadas
  metrics: {
    pain: {
      average: number;
      min: number;
      max: number;
      trend: number; // taxa de mudança
      worstAreas: BodyRegion[];
      improvingAreas: BodyRegion[];
    };
    energy: {
      average: number;
      trend: number;
      lowEnergyDays: number;
    };
    sleep: {
      averageQuality: number;
      averageHours: number;
      sleepIssues: number; // dias com problemas
    };
    mood: {
      average: number;
      trend: number;
      goodMoodDays: number;
    };
    adherence: {
      diaryCompletionRate: number;
      medicationAdherence: number;
      exerciseAdherence: number;
    };
  };

  // Gráficos e visualizações
  chartData: {
    painOverTime: Array<{ date: string; value: number }>;
    energyOverTime: Array<{ date: string; value: number }>;
    sleepOverTime: Array<{ date: string; value: number }>;
    moodOverTime: Array<{ date: string; value: number }>;
    correlationMatrix: Array<{ x: string; y: string; correlation: number }>;
  };

  // Comparações
  comparisons?: {
    previousPeriod?: {
      painChange: number;
      energyChange: number;
      sleepChange: number;
      moodChange: number;
    };
    baseline?: {
      painChange: number;
      energyChange: number;
      sleepChange: number;
      moodChange: number;
    };
  };

  // Recomendações
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };

  generatedAt: string;
  generatedBy: string; // user ID
  isShared: boolean;
  sharedWith?: string[]; // user IDs
  tenantId: string;
}

export interface SymptomDiarySettings {
  id: string;
  patientId: string;

  // Configurações de entrada
  reminderTimes: string[]; // horários para lembretes
  reminderFrequency: 'daily' | 'twice_daily' | 'weekly' | 'custom';
  customReminderDays?: number[]; // dias da semana

  // Preferências de interface
  quickEntryMode: boolean; // modo rápido vs completo
  defaultPainScale: 'numeric' | 'visual' | 'descriptive';
  showBodyMap: boolean;
  enablePhotos: boolean;
  enableVoiceNotes: boolean;

  // Configurações de análise
  analysisFrequency: 'weekly' | 'monthly' | 'on_demand';
  autoGenerateInsights: boolean;
  alertThresholds: {
    painIncrease: number; // % de aumento que gera alerta
    energyDecrease: number;
    sleepQualityDecrease: number;
    moodDecrease: number;
    missedEntriesThreshold: number; // dias consecutivos sem entrada
  };

  // Configurações de privacidade
  shareWithTherapist: boolean;
  shareDetailedData: boolean; // compartilhar dados detalhados ou apenas resumos
  allowAnalysis: boolean;

  // Configurações de backup
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';

  updatedAt: string;
  tenantId: string;
}
