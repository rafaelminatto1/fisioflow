import React from 'react';
import {
  User,
  UserRole,
  Task,
  Notebook,
  Patient,
  Appointment,
  TimeBlock,
  Exercise,
  Prescription,
  ExerciseLog,
  Assessment,
  Transaction,
  AuditLog,
  Tenant,
  Document,
  Chat,
  ChatMessage,
  ClinicalCase,
  CaseAttachment,
  CaseComment,
  CaseView,
  CaseRating,
  CaseFavorite,
  Course,
  StudentProgress,
  MentorshipSession,
  ClinicalProtocol,
  ProtocolPhase,
  ProtocolExercise,
  ProtocolEvidence,
  PatientProtocol,
  ProtocolCustomization,
  ProtocolProgressNote,
  ProtocolOutcome,
  ProtocolAnalytics,
  QualityIndicator,
  ProductivityMetric,
  Equipment,
  OperationalAlert,
  ExecutiveReport,
  KPIData,
} from './types';

// === CONSTANTES DE TASKS ===
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

export const TASK_STATUS_LABELS = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
} as const;

export const TASK_STATUS_COLORS = {
  todo: '#f1f5f9',
  in_progress: '#dbeafe',
  review: '#fef3c7',
  done: '#dcfce7',
};

export const TASK_PRIORITY_STYLES = {
  low: {
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    icon: '⬇️'
  },
  medium: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    icon: '➡️'
  },
  high: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: '⬆️'
  },
  urgent: {
    color: 'text-red-800',
    bg: 'bg-red-200',
    icon: '🔥'
  },
};

// === DADOS ESSENCIAIS (otimizados) ===
export const INITIAL_TENANTS: Tenant[] = [
  { id: 't1', name: 'FisioPrime', plan: 'gold' },
];

export const INITIAL_USERS: Record<string, User> = {
  '1': {
    id: '1',
    name: 'Dr. Ana Costa',
    email: 'ana.costa@fisioflow.com',
    role: UserRole.ADMIN,
    avatarUrl: 'https://picsum.photos/seed/dra_ana/100/100',
    tenantId: 't1',
  },
  '2': {
    id: '2',
    name: 'Carlos Martins', 
    email: 'carlos.martins@fisioflow.com',
    role: UserRole.FISIOTERAPEUTA,
    avatarUrl: 'https://picsum.photos/seed/carlos/100/100',
    tenantId: 't1',
  },
  '3': {
    id: '3',
    name: 'Beatriz Lima',
    email: 'beatriz.lima@fisioflow.com',
    role: UserRole.ESTAGIARIO,
    avatarUrl: 'https://picsum.photos/seed/beatriz/100/100',
    tenantId: 't1',
  },
};

// === NOTEBOOKS ===
export const NOTEBOOKS: Notebook[] = [
  {
    id: 'nb1',
    title: 'Fisioterapia Geral',
    description: 'Conceitos básicos de fisioterapia',
    tenantId: 't1',
    isShared: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// === DADOS LAZY (arrays vazios para carregamento otimizado) ===
export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Avaliação inicial - João Silva',
    description: 'Realizar avaliação postural completa e análise de movimento para paciente com dor lombar crônica.',
    status: 'todo',
    priority: 'high',
    assigneeId: '2',
    patientId: 'pat-1',
    tenantId: 't1',
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Protocolo de fortalecimento - Maria Santos',
    description: 'Implementar exercícios de fortalecimento para quadríceps após cirurgia de joelho.',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: '2',
    patientId: 'pat-2',
    tenantId: 't1',
  },
  {
    id: 'task-3',
    projectId: 'proj-1',
    title: 'Reavaliação - Carlos Oliveira',
    description: 'Verificar progresso do tratamento de ombro congelado após 4 semanas de fisioterapia.',
    status: 'review',
    priority: 'medium',
    assigneeId: '3',
    patientId: 'pat-3',
    tenantId: 't1',
  },
  {
    id: 'task-4',
    projectId: 'proj-1',
    title: 'Alta fisioterapêutica - Ana Costa',
    description: 'Paciente completou tratamento para tendinite de Aquiles com sucesso. Preparar relatório de alta.',
    status: 'done',
    priority: 'low',
    assigneeId: '2',
    patientId: 'pat-4',
    tenantId: 't1',
  },
  {
    id: 'task-5',
    projectId: 'proj-1',
    title: 'Plano de exercícios domiciliares',
    description: 'Elaborar programa de exercícios para paciente realizar em casa durante o período de férias.',
    status: 'todo',
    priority: 'medium',
    assigneeId: '2',
    tenantId: 't1',
  },
];
export const INITIAL_PATIENTS: Patient[] = [];
export const INITIAL_EXERCISES: Exercise[] = [];
export const INITIAL_APPOINTMENTS: Appointment[] = [];
export const INITIAL_TIMEBLOCKS: TimeBlock[] = [];
export const INITIAL_PRESCRIPTIONS: Prescription[] = [];
export const INITIAL_EXERCISE_LOGS: ExerciseLog[] = [];
export const INITIAL_ASSESSMENTS: Assessment[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_DOCUMENTS: Document[] = [];
export const INITIAL_CHATS: Chat[] = [];
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
export const INITIAL_COURSES: Course[] = [];
export const INITIAL_STUDENT_PROGRESS: StudentProgress[] = [];
export const INITIAL_MENTORSHIP_SESSIONS: MentorshipSession[] = [];
export const INITIAL_CLINICAL_CASES: ClinicalCase[] = [];
export const INITIAL_CASE_ATTACHMENTS: CaseAttachment[] = [];
export const INITIAL_CASE_COMMENTS: CaseComment[] = [];
export const INITIAL_CASE_VIEWS: CaseView[] = [];
export const INITIAL_CASE_RATINGS: CaseRating[] = [];
export const INITIAL_CASE_FAVORITES: CaseFavorite[] = [];
export const INITIAL_CLINICAL_PROTOCOLS: ClinicalProtocol[] = [];
export const INITIAL_PROTOCOL_PHASES: ProtocolPhase[] = [];
export const INITIAL_PROTOCOL_EXERCISES: ProtocolExercise[] = [];
export const INITIAL_PROTOCOL_EVIDENCES: ProtocolEvidence[] = [];
export const INITIAL_PATIENT_PROTOCOLS: PatientProtocol[] = [];
export const INITIAL_PROTOCOL_CUSTOMIZATIONS: ProtocolCustomization[] = [];
export const INITIAL_PROTOCOL_PROGRESS_NOTES: ProtocolProgressNote[] = [];
export const INITIAL_PROTOCOL_OUTCOMES: ProtocolOutcome[] = [];
export const INITIAL_PROTOCOL_ANALYTICS: ProtocolAnalytics[] = [];
export const INITIAL_QUALITY_INDICATORS: QualityIndicator[] = [];
export const INITIAL_PRODUCTIVITY_METRICS: ProductivityMetric[] = [];
export const INITIAL_EQUIPMENT: Equipment[] = [];
export const INITIAL_OPERATIONAL_ALERTS: OperationalAlert[] = [];
export const INITIAL_EXECUTIVE_REPORTS: ExecutiveReport[] = [];

// === CONSTANTES DE CONFIGURAÇÃO ===
export const APP_CONFIG = {
  maxCacheSize: 1000,
  defaultPageSize: 20,
  debounceMs: 300,
  maxUploadSize: 10 * 1024 * 1024, // 10MB
  supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
  supportedDocFormats: ['pdf', 'doc', 'docx', 'txt'],
};

export const UI_CONSTANTS = {
  sidebar: {
    width: 280,
    collapsedWidth: 64,
  },
  header: {
    height: 64,
  },
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B', 
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
};