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

// === DADOS ESSENCIAIS (sempre carregados) ===
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

// === LAZY LOADERS (carregados sob demanda) ===
const loadInitialData = async (key: string): Promise<any[]> => {
  try {
    // Dynamic imports com template strings precisam ser tratados diferente
    const response = await fetch(`/data/initial/${key}.json`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  } catch (error) {
    console.warn(`Failed to load ${key} data, using fallback`);
    return getFallbackData(key);
  }
};

// Fallback para desenvolvimento
const getFallbackData = (key: string): any[] => {
  const fallbacks: Record<string, any[]> = {
    tasks: [
      {
        id: '1',
        title: 'Avaliação inicial - Maria Silva',
        description: 'Realizar avaliação completa do paciente',
        status: 'todo',
        priority: 'high',
        assignedTo: '2',
        tenantId: 't1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    patients: [
      {
        id: '1',
        name: 'Maria Silva',
        email: 'maria.silva@email.com',
        phone: '(11) 99999-9999',
        birthDate: '1985-05-15',
        address: 'Rua das Flores, 123',
        medicalHistory: 'Paciente com dor lombar crônica',
        tenantId: 't1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ],
    exercises: [],
    appointments: [],
    // ... outros fallbacks mínimos
  };
  
  return fallbacks[key] || [];
};

// === EXPORTAÇÕES LAZY ===
export const loadInitialTasks = () => loadInitialData('tasks');
export const loadInitialPatients = () => loadInitialData('patients');
export const loadInitialExercises = () => loadInitialData('exercises');
export const loadInitialAppointments = () => loadInitialData('appointments');
export const loadInitialTimeBlocks = () => loadInitialData('timeblocks');
export const loadInitialPrescriptions = () => loadInitialData('prescriptions');
export const loadInitialExerciseLogs = () => loadInitialData('exerciselogs');
export const loadInitialAssessments = () => loadInitialData('assessments');
export const loadInitialTransactions = () => loadInitialData('transactions');
export const loadInitialAuditLogs = () => loadInitialData('auditlogs');
export const loadInitialDocuments = () => loadInitialData('documents');
export const loadInitialChats = () => loadInitialData('chats');
export const loadInitialChatMessages = () => loadInitialData('chatmessages');
export const loadInitialCourses = () => loadInitialData<Course>('courses');
export const loadInitialStudentProgress = () => loadInitialData<StudentProgress>('studentprogress');
export const loadInitialMentorshipSessions = () => loadInitialData<MentorshipSession>('mentorshipsessions');
export const loadInitialClinicalCases = () => loadInitialData<ClinicalCase>('clinicalcases');
export const loadInitialCaseAttachments = () => loadInitialData<CaseAttachment>('caseattachments');
export const loadInitialCaseComments = () => loadInitialData<CaseComment>('casecomments');
export const loadInitialCaseViews = () => loadInitialData<CaseView>('caseviews');
export const loadInitialCaseRatings = () => loadInitialData<CaseRating>('caseratings');
export const loadInitialCaseFavorites = () => loadInitialData<CaseFavorite>('casefavorites');
export const loadInitialClinicalProtocols = () => loadInitialData<ClinicalProtocol>('clinicalprotocols');
export const loadInitialProtocolPhases = () => loadInitialData<ProtocolPhase>('protocolphases');
export const loadInitialProtocolExercises = () => loadInitialData<ProtocolExercise>('protocolexercises');
export const loadInitialProtocolEvidences = () => loadInitialData<ProtocolEvidence>('protocolevidences');
export const loadInitialPatientProtocols = () => loadInitialData<PatientProtocol>('patientprotocols');
export const loadInitialProtocolCustomizations = () => loadInitialData<ProtocolCustomization>('protocolcustomizations');
export const loadInitialProtocolProgressNotes = () => loadInitialData<ProtocolProgressNote>('protocolprogressnotes');
export const loadInitialProtocolOutcomes = () => loadInitialData<ProtocolOutcome>('protocoloutcomes');
export const loadInitialProtocolAnalytics = () => loadInitialData<ProtocolAnalytics>('protocolanalytics');
export const loadInitialQualityIndicators = () => loadInitialData<QualityIndicator>('qualityindicators');
export const loadInitialProductivityMetrics = () => loadInitialData<ProductivityMetric>('productivitymetrics');
export const loadInitialEquipment = () => loadInitialData<Equipment>('equipment');
export const loadInitialOperationalAlerts = () => loadInitialData<OperationalAlert>('operationalalerts');
export const loadInitialExecutiveReports = () => loadInitialData<ExecutiveReport>('executivereports');

// === NOTEBOOKS (mantido como estava - dados pequenos) ===
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

// === HOOK PARA CARREGAR DADOS LAZY ===
export const useInitialData = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startTime = performance.now();
      
      // Carrega dados em paralelo para melhor performance
      const [
        tasks,
        patients,
        exercises,
        appointments,
        // ... outros dados conforme necessário
      ] = await Promise.all([
        loadInitialTasks(),
        loadInitialPatients(),
        loadInitialExercises(),
        loadInitialAppointments(),
        // ... outras chamadas lazy
      ]);

      const endTime = performance.now();
      console.log(`📊 Dados iniciais carregados em ${(endTime - startTime).toFixed(2)}ms`);
      
      return {
        tasks,
        patients,
        exercises,
        appointments,
        // ... outros retornos
      };
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      console.error('Erro ao carregar dados iniciais:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loadAllData, loading, error };
};

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

// Compatibilidade com imports existentes
export const INITIAL_TASKS: Task[] = [];
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