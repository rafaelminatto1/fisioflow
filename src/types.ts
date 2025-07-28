import { z } from 'zod';

// ============================================================================
// TIPOS BASE DO SISTEMA
// ============================================================================

// Tipos de usuário e autenticação
export type UserTier = 'free' | 'premium' | 'enterprise';
export type UserRole = 'patient' | 'physiotherapist' | 'admin' | 'clinic_owner';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';

// Schema de validação para usuário
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['patient', 'physiotherapist', 'admin', 'clinic_owner']),
  tier: z.enum(['free', 'premium', 'enterprise']),
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
  isActive: z.boolean().default(true),
  clinicId: z.string().uuid().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ============================================================================
// SISTEMA FREEMIUM - LIMITES E TIERS
// ============================================================================

// Definição de limites por tier
export interface TierLimits {
  patients: number;
  appointments: number;
  sessions: number;
  reports: number;
  storage: number; // em MB
  users: number;
  clinics: number;
  features: string[];
}

// Configuração de tiers
export const TIER_LIMITS: Record<UserTier, TierLimits> = {
  free: {
    patients: 10,
    appointments: 50,
    sessions: 100,
    reports: 5,
    storage: 100, // 100MB
    users: 1,
    clinics: 1,
    features: ['basic_exercises', 'basic_reports', 'patient_management']
  },
  premium: {
    patients: 100,
    appointments: 500,
    sessions: 1000,
    reports: 50,
    storage: 1000, // 1GB
    users: 5,
    clinics: 3,
    features: [
      'basic_exercises', 'basic_reports', 'patient_management',
      'advanced_reports', 'custom_exercises', 'appointment_reminders',
      'progress_tracking', 'export_data'
    ]
  },
  enterprise: {
    patients: -1, // ilimitado
    appointments: -1,
    sessions: -1,
    reports: -1,
    storage: 10000, // 10GB
    users: -1,
    clinics: -1,
    features: [
      'basic_exercises', 'basic_reports', 'patient_management',
      'advanced_reports', 'custom_exercises', 'appointment_reminders',
      'progress_tracking', 'export_data', 'api_access', 'white_label',
      'advanced_analytics', 'multi_clinic', 'custom_integrations'
    ]
  }
};

// Schema de validação para subscription
export const SubscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tier: z.enum(['free', 'premium', 'enterprise']),
  status: z.enum(['active', 'inactive', 'cancelled', 'past_due', 'trialing']),
  currentPeriodStart: z.date(),
  currentPeriodEnd: z.date(),
  cancelAtPeriodEnd: z.boolean().default(false),
  trialEnd: z.date().optional(),
  stripeSubscriptionId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

// ============================================================================
// ENTIDADES PRINCIPAIS
// ============================================================================

// Schema de validação para paciente
export const PatientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  medicalHistory: z.string().optional(),
  emergencyContact: z.object({
    name: z.string(),
    phone: z.string(),
    relationship: z.string()
  }).optional(),
  physiotherapistId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Patient = z.infer<typeof PatientSchema>;

// Schema de validação para consulta/sessão
export const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  physiotherapistId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  startTime: z.date(),
  endTime: z.date(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  type: z.enum(['consultation', 'treatment', 'follow_up', 'assessment']),
  notes: z.string().optional(),
  exercises: z.array(z.string().uuid()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

// Schema de validação para exercício
export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string(),
  instructions: z.string(),
  duration: z.number().positive().optional(), // em minutos
  repetitions: z.number().positive().optional(),
  sets: z.number().positive().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  category: z.string(),
  tags: z.array(z.string()),
  videoUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  equipment: z.array(z.string()).optional(),
  bodyParts: z.array(z.string()),
  isCustom: z.boolean().default(false),
  createdBy: z.string().uuid().optional(),
  clinicId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

// Schema de validação para relatório
export const ReportSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  type: z.enum(['progress', 'assessment', 'treatment_plan', 'discharge']),
  patientId: z.string().uuid(),
  physiotherapistId: z.string().uuid(),
  clinicId: z.string().uuid().optional(),
  content: z.string(),
  data: z.record(z.any()).optional(), // dados estruturados do relatório
  attachments: z.array(z.string().url()).optional(),
  isTemplate: z.boolean().default(false),
  templateId: z.string().uuid().optional(),
  generatedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Report = z.infer<typeof ReportSchema>;

// ============================================================================
// TIPOS DE RESPOSTA DA API
// ============================================================================

// Resposta padrão da API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

// Tipos de erro
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

// Resposta de paginação
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// TIPOS DE FILTROS E BUSCA
// ============================================================================

// Filtros base
export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// Filtros específicos para pacientes
export interface PatientFilters extends BaseFilters {
  physiotherapistId?: string;
  clinicId?: string;
  isActive?: boolean;
  ageMin?: number;
  ageMax?: number;
  gender?: 'male' | 'female' | 'other';
}

// Filtros específicos para consultas
export interface AppointmentFilters extends BaseFilters {
  patientId?: string;
  physiotherapistId?: string;
  clinicId?: string;
  status?: string[];
  type?: string[];
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// TIPOS DE CONFIGURAÇÃO
// ============================================================================

// Configurações da clínica
export const ClinicSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string(),
  website: z.string().url().optional(),
  logo: z.string().url().optional(),
  settings: z.record(z.any()).optional(),
  ownerId: z.string().uuid(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Clinic = z.infer<typeof ClinicSchema>;

// Configurações do sistema
export interface SystemSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  features: {
    [key: string]: boolean;
  };
}

// ============================================================================
// TIPOS DE HOOKS E ESTADO
// ============================================================================

// Estado de loading
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: string | null;
}

// Estado de autenticação
export interface AuthState extends LoadingState {
  user: User | null;
  isAuthenticated: boolean;
  tier: UserTier;
  subscription: Subscription | null;
  permissions: string[];
}

// Estado de dados paginados
export interface PaginatedState<T> extends LoadingState {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// TIPOS DE EVENTOS E NOTIFICAÇÕES
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

// Eventos do sistema
export type SystemEvent = 
  | 'user_login'
  | 'user_logout'
  | 'subscription_upgraded'
  | 'subscription_downgraded'
  | 'limit_reached'
  | 'payment_failed'
  | 'data_exported'
  | 'backup_created';

export interface EventLog {
  id: string;
  event: SystemEvent;
  userId: string;
  data?: any;
  timestamp: Date;
}

// ============================================================================
// TIPOS DE INTEGRAÇÃO E API
// ============================================================================

// Configuração de integração
export interface Integration {
  id: string;
  name: string;
  type: 'payment' | 'calendar' | 'email' | 'sms' | 'analytics';
  config: Record<string, any>;
  isActive: boolean;
  requiredTier: UserTier;
}

// Webhook payload
export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature?: string;
}

// ============================================================================
// EXPORT DE TODOS OS SCHEMAS PARA VALIDAÇÃO
// ============================================================================

export const Schemas = {
  User: UserSchema,
  Patient: PatientSchema,
  Appointment: AppointmentSchema,
  Exercise: ExerciseSchema,
  Report: ReportSchema,
  Subscription: SubscriptionSchema,
  Clinic: ClinicSchema,
} as const;

// Tipo helper para extrair tipos dos schemas
export type SchemaType<T extends keyof typeof Schemas> = z.infer<typeof Schemas[T]>;

// ============================================================================
// TIPOS UTILITÁRIOS
// ============================================================================

// Tipo para IDs
export type ID = string;

// Tipo para timestamps
export type Timestamp = Date;

// Tipo para status genérico
export type Status = 'active' | 'inactive' | 'pending' | 'archived';

// Tipo para operações CRUD
export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

// Tipo para permissões
export type Permission = `${string}:${CrudOperation}`;

// Tipo para dados de formulário
export type FormData<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

// Tipo para dados de atualização
export type UpdateData<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

// Tipo para dados de criação
export type CreateData<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// CONSTANTES
// ============================================================================

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutos
export const DEFAULT_STALE_TIME = 2 * 60 * 1000; // 2 minutos

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Acesso não autorizado',
  FORBIDDEN: 'Operação não permitida',
  NOT_FOUND: 'Recurso não encontrado',
  VALIDATION_ERROR: 'Dados inválidos',
  LIMIT_EXCEEDED: 'Limite excedido para seu plano',
  SUBSCRIPTION_REQUIRED: 'Assinatura premium necessária',
  NETWORK_ERROR: 'Erro de conexão',
  SERVER_ERROR: 'Erro interno do servidor',
} as const;

// Features por tier
export const TIER_FEATURES = {
  free: new Set(TIER_LIMITS.free.features),
  premium: new Set(TIER_LIMITS.premium.features),
  enterprise: new Set(TIER_LIMITS.enterprise.features),
} as const;