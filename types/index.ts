/**
 * Index consolidado de todos os tipos do sistema
 * Organizado por domínio para melhor manutenibilidade
 */

// === TIPOS PRINCIPAIS ===
export * from './core.types';
export * from './patient.types';
export * from './exercise.types';
export * from './calendar.types';

// === RE-EXPORTS PARA COMPATIBILIDADE ===
// Mantém compatibilidade com imports existentes
export type {
  // Core
  UserRole,
  SubscriptionPlan,
  User,
  Tenant,
  AuditLog,
  BaseEntity,
  
  // Pacientes
  Patient,
  Assessment,
  MedicalDocument,
  PatientConsent,
  TreatmentPlan,
  
  // Exercícios
  Exercise,
  Prescription,
  ExerciseLog,
  ClinicalProtocol,
  PatientProtocol,
  
  // Calendário
  Appointment,
  TimeBlock,
  TherapistAvailability,
  Room,
  CalendarEvent,
} from './core.types';

export type {
  Patient,
  Assessment,
  MedicalDocument,
  MedicalHistory,
  PatientConsent,
  TreatmentPlan,
  PatientListFilters,
  PatientStats,
  PatientFormData,
} from './patient.types';

export type {
  Exercise,
  Prescription,
  PrescribedExercise,
  ExerciseLog,
  ClinicalProtocol,
  ProtocolPhase,
  PatientProtocol,
  ProtocolCustomization,
  ProtocolProgressNote,
  ProtocolOutcome,
  ExerciseFavorite,
  ExerciseRating,
  ExerciseFilters,
  ExerciseStats,
} from './exercise.types';

export type {
  Appointment,
  RecurrencePattern,
  TimeBlock,
  TherapistAvailability,
  WeeklySchedule,
  DaySchedule,
  TimePeriod,
  AvailabilityException,
  Room,
  ScheduleConflict,
  CalendarEvent,
  CalendarView,
  CalendarResource,
  CalendarStats,
  AppointmentFilters,
  AppointmentFormData,
  RescheduleData,
} from './calendar.types';

// === TIPOS DERIVADOS PARA COMPATIBILIDADE ===
// Alguns tipos que ainda podem estar sendo usados no código legado

// Task-related (se ainda usado)
export interface Task extends BaseEntity {
  title: string;
  description: string;
  assignedTo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  tags?: string[];
  attachments?: string[];
}

// Financial (básico)
export interface Transaction extends BaseEntity {
  patientId?: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  paymentMethod?: string;
}

// Document (genérico)
export interface DocumentGeneric extends BaseEntity {
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  category?: string;
  isPublic: boolean;
  sharedWith?: string[];
}

// Notebook/Pages
export interface Page extends BaseEntity {
  title: string;
  content: string;
  parentId?: string;
  order: number;
  isPublic: boolean;
  tags?: string[];
}

export interface Notebook extends BaseEntity {
  title: string;
  description?: string;
  pages: Page[];
  isPublic: boolean;
  collaborators?: string[];
}

// Chat
export interface Chat extends BaseEntity {
  participants: string[];
  type: 'direct' | 'group' | 'support';
  title?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isActive: boolean;
}

export interface ChatMessage extends BaseEntity {
  chatId: string;
  senderId: string;
  senderName: string; // Cache
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  attachments?: string[];
  isRead: boolean;
}

// Data Context (para hooks)
export interface DataContextType {
  // Estados de carregamento
  loading: boolean;
  error: string | null;
  
  // Dados principais
  users: User[];
  tenants: Tenant[];
  patients: Patient[];
  appointments: Appointment[];
  exercises: Exercise[];
  prescriptions: Prescription[];
  exerciseLogs: ExerciseLog[];
  assessments: Assessment[];
  
  // Dados secundários
  tasks: Task[];
  notebooks: Notebook[];
  timeBlocks: TimeBlock[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  documents: DocumentGeneric[];
  chats: Chat[];
  chatMessages: ChatMessage[];
  
  // Funcionalidades especializadas (podem ser vazias se não implementadas)
  courses: any[];
  studentProgress: any[];
  mentorshipSessions: any[];
  clinicalCases: any[];
  caseAttachments: any[];
  caseComments: any[];
  caseViews: any[];
  caseRatings: any[];
  caseFavorites: any[];
  clinicalProtocols: ClinicalProtocol[];
  protocolPhases: ProtocolPhase[];
  protocolExercises: any[];
  protocolEvidences: any[];
  patientProtocols: PatientProtocol[];
  protocolCustomizations: ProtocolCustomization[];
  protocolProgressNotes: ProtocolProgressNote[];
  protocolOutcomes: ProtocolOutcome[];
  protocolAnalytics: any[];
  qualityIndicators: any[];
  productivityMetrics: any[];
  equipment: any[];
  operationalAlerts: any[];
  executiveReports: any[];
  exerciseFavorites: ExerciseFavorite[];
  exerciseRatings: ExerciseRating[];
  exerciseVideos: any[];
  exerciseImages: any[];
  reminderRules: any[];
  scheduledReminders: any[];
  reminderSettings: any[];
  notificationDeliveryLogs: any[];
  reminderAnalytics: any[];
  smartReminderInsights: any[];
  symptomDiaryEntries: any[];
  symptomDiaryTemplates: any[];
  symptomAnalyses: any[];
  symptomInsights: any[];
  symptomAlerts: any[];
  symptomReports: any[];
  symptomDiarySettings: any[];
  
  // Métodos CRUD básicos
  saveTenant: (tenant: Tenant) => void;
  saveUser: (user: User) => void;
  deleteUser: (id: string) => void;
  saveTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  savePatient: (patient: Patient) => void;
  deletePatient: (id: string) => void;
  savePage: (page: Page) => void;
  addTaskFeedback: (taskId: string, feedback: string) => void;
  saveAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;
  saveTimeBlock: (timeBlock: TimeBlock) => void;
  deleteTimeBlock: (id: string) => void;
  saveExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  savePrescription: (prescription: Prescription) => void;
  deletePrescription: (id: string) => void;
  saveExerciseLog: (log: ExerciseLog) => void;
  saveAssessment: (assessment: Assessment) => void;
  deleteAssessment: (id: string) => void;
  saveTransaction: (transaction: Transaction) => void;
  deleteTransaction: (id: string) => void;
  saveDocument: (document: DocumentGeneric) => void;
  deleteDocument: (id: string) => void;
  sendChatMessage: (chatId: string, content: string) => void;
  
  // Métodos de busca e filtro
  getTasksForPatient: (patientId: string) => Task[];
  getAppointmentsForPatient: (patientId: string) => Appointment[];
  getPrescriptionsForPatient: (patientId: string) => Prescription[];
  getExerciseLogsForPatient: (patientId: string) => ExerciseLog[];
  getAssessmentsForPatient: (patientId: string) => Assessment[];
  getTransactionsForPatient: (patientId: string) => Transaction[];
  getDocumentsForPatient: (patientId: string) => DocumentGeneric[];
  
  // Outros métodos que podem existir
  getAllData: () => Record<string, any>;
  saveAuditLog: (log: AuditLog) => void;
  
  // Métodos específicos que podem não estar implementados
  [key: string]: any;
}

// === EXPORTS DEFAULT ORGANIZADOS ===
export default {
  // Core
  UserRole,
  
  // Interfaces principais que são mais usadas
  User,
  Patient,
  Appointment,
  Exercise,
  Assessment,
  
  // Context
  DataContextType,
} as const;