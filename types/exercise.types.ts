/**
 * Tipos relacionados a exercícios, prescrições e protocolos
 */

import { BaseEntity } from './core.types';

// === EXERCÍCIOS ===
export interface Exercise extends BaseEntity {
  name: string;
  description: string;
  instructions: string;
  category: string;
  bodyPart: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  
  // Mídia
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  
  // Parâmetros
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number; // em segundos
  defaultWeight?: number; // em kg
  
  // Metadados
  equipment?: string[];
  contraindications?: string[];
  modifications?: string[];
  targetMuscles?: string[];
  
  // Classificação e busca
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  
  // Estatísticas
  timesUsed?: number;
  averageRating?: number;
  totalRatings?: number;
}

// === PRESCRIÇÕES DE EXERCÍCIOS ===
export interface Prescription extends BaseEntity {
  patientId: string;
  therapistId: string;
  
  // Informações básicas
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  
  // Status
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  // Exercícios prescritos
  exercises: PrescribedExercise[];
  
  // Configurações
  frequency: number; // vezes por semana
  duration: number; // duração total em semanas
  
  // Observações
  notes?: string;
  precautions?: string[];
  
  // Progresso
  progressNotes?: ProgressNote[];
  adherenceRate?: number; // 0-100%
}

export interface PrescribedExercise {
  exerciseId: string;
  exerciseName: string; // Cache para performance
  
  // Parâmetros específicos
  sets: number;
  reps: number;
  duration?: number; // em segundos
  weight?: number; // em kg
  restBetweenSets?: number; // em segundos
  
  // Progressão
  progressionType?: 'sets' | 'reps' | 'weight' | 'duration';
  progressionIncrement?: number;
  
  // Ordem e agrupamento
  order: number;
  superset?: string; // ID do superset se aplicável
  
  // Instruções específicas
  specialInstructions?: string;
  modifications?: string;
  
  // Status
  isCompleted: boolean;
  completedSets?: number;
}

// === LOGS DE EXECUÇÃO ===
export interface ExerciseLog extends BaseEntity {
  patientId: string;
  prescriptionId?: string;
  exerciseId: string;
  exerciseName: string; // Cache
  
  // Data e sessão
  date: string;
  sessionId?: string; // Para agrupar exercícios da mesma sessão
  
  // Execução
  completedSets: number;
  completedReps: number[];
  weight?: number[];
  duration?: number; // tempo total
  restTimes?: number[]; // tempo de descanso entre séries
  
  // Avaliação subjetiva
  perceivedExertion?: number; // Escala de Borg (6-20)
  painLevel?: number; // 0-10
  difficultyRating?: number; // 1-5
  
  // Observações
  notes?: string;
  patientFeedback?: string;
  
  // Localização (se app móvel)
  location?: string;
  
  // Status
  isVerified?: boolean; // Se verificado pelo terapeuta
  verifiedBy?: string;
}

// === PROTOCOLOS CLÍNICOS ===
export interface ClinicalProtocol extends BaseEntity {
  name: string;
  description: string;
  category: string;
  
  // Indicações
  indications: string[];
  contraindications: string[];
  targetPopulation: string;
  
  // Estrutura
  phases: ProtocolPhase[];
  totalDuration: number; // em semanas
  
  // Evidência científica
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  references?: string[];
  
  // Metadados
  version: string;
  isPublished: boolean;
  createdBy: string;
  reviewedBy?: string[];
  lastReviewDate?: string;
  
  // Uso
  timesUsed?: number;
  successRate?: number;
}

export interface ProtocolPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  
  // Duração
  durationWeeks: number;
  
  // Critérios
  startCriteria?: string[];
  completionCriteria?: string[];
  
  // Exercícios
  exercises: ProtocolExercise[];
  
  // Objetivos específicos
  goals: string[];
  expectedOutcomes: string[];
}

export interface ProtocolExercise {
  exerciseId: string;
  exerciseName: string;
  
  // Parâmetros
  sets: number;
  reps: number;
  duration?: number;
  weight?: number;
  
  // Frequência na fase
  frequencyPerWeek: number;
  
  // Progressão
  progression?: {
    type: 'linear' | 'weekly' | 'criteria-based';
    increment: number;
    maxValue?: number;
  };
  
  // Modificações permitidas
  allowedModifications?: string[];
  
  // Ordem
  order: number;
}

// === ACOMPANHAMENTO DE PROTOCOLO ===
export interface PatientProtocol extends BaseEntity {
  patientId: string;
  protocolId: string;
  prescribedBy: string;
  
  // Status
  status: 'active' | 'completed' | 'paused' | 'discontinued';
  currentPhase: number;
  
  // Datas
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  
  // Customizações
  customizations?: ProtocolCustomization[];
  
  // Progresso
  progressNotes: ProtocolProgressNote[];
  adherenceRate: number;
  
  // Resultados
  outcomes?: ProtocolOutcome[];
}

export interface ProtocolCustomization {
  phaseId: string;
  exerciseId: string;
  customization: {
    sets?: number;
    reps?: number;
    weight?: number;
    duration?: number;
    specialInstructions?: string;
  };
  reason: string;
  modifiedBy: string;
  modifiedDate: string;
}

export interface ProtocolProgressNote extends BaseEntity {
  patientProtocolId: string;
  phase: number;
  week: number;
  
  // Avaliação
  adherence: number; // 0-100%
  progressRating: number; // 1-5
  patientFeedback: string;
  
  // Observações profissionais
  clinicalNotes: string;
  modifications?: string;
  nextSteps?: string;
  
  // Decisões
  continueToNextPhase?: boolean;
  repeatPhase?: boolean;
  discontinue?: boolean;
  
  // Autor
  recordedBy: string;
}

export interface ProtocolOutcome extends BaseEntity {
  patientProtocolId: string;
  
  // Tipo de resultado
  outcomeType: 'functional' | 'pain' | 'satisfaction' | 'objective_measure';
  
  // Medição
  measure: string;
  baselineValue: number;
  finalValue: number;
  unit: string;
  
  // Avaliação
  clinicallySignificant: boolean;
  notes?: string;
  
  // Contexto
  measurementDate: string;
  measuredBy: string;
}

// === FAVORITOS E AVALIAÇÕES ===
export interface ExerciseFavorite extends BaseEntity {
  userId: string;
  exerciseId: string;
  tags?: string[]; // Tags personalizadas do usuário
  notes?: string;
}

export interface ExerciseRating extends BaseEntity {
  userId: string;
  exerciseId: string;
  rating: number; // 1-5
  review?: string;
  
  // Contexto
  usedWith?: string; // Condição/população
  effectiveness?: number; // 1-5
  easiness?: number; // 1-5
}

// === TIPOS PARA COMPONENTES ===
export interface ExerciseFilters {
  category?: string;
  bodyPart?: string[];
  difficulty?: string;
  equipment?: string[];
  search?: string;
}

export interface ExerciseStats {
  totalExercises: number;
  categoriesCount: number;
  recentLogsCount: number;
  totalPrescriptions: number;
}

export default {
  Exercise,
  Prescription,
  PrescribedExercise,
  ExerciseLog,
  ClinicalProtocol,
  ProtocolPhase,
  PatientProtocol,
};