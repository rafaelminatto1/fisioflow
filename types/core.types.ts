/**
 * Tipos principais do sistema - Core Types
 * Enums e interfaces básicas usadas em todo o sistema
 */

// === ENUMS PRINCIPAIS ===
export enum UserRole {
  ADMIN = 'admin',
  FISIOTERAPEUTA = 'fisio',
  ESTAGIARIO = 'estagiario',
  PACIENTE = 'paciente',
}

export type SubscriptionPlan = 'free' | 'silver' | 'gold' | 'platinum';

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

// === INTERFACES BÁSICAS ===
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: SubscriptionPlan;
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

export interface AuditLog extends BaseEntity {
  timestamp: string;
  userId: string;
  userName: string;
  action: LogAction;
  targetCollection: string;
  targetId?: string;
  changes?: Record<string, { old: any; new: any }>;
  userAgent?: string;
  ipAddress?: string;
}

// === TIPOS UTILITÁRIOS ===
export type EntityWithTenant<T> = T & { tenantId: string };
export type CreateDTO<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateDTO<T> = Partial<Omit<T, 'id' | 'createdAt' | 'tenantId'>>;

// === BILLING E ONBOARDING ===
export interface BillingPlan {
  id: SubscriptionPlan;
  name: string;
  price: string;
  features: string[];
  isCurrent: boolean;
}

export interface ClinicOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOnboard: (clinicName: string, plan: SubscriptionPlan) => void;
}

export default {
  UserRole,
  LogAction,
};