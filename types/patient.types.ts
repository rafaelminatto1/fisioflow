/**
 * Tipos relacionados a pacientes e dados médicos
 */

import { BaseEntity, User } from './core.types';

// === PACIENTES ===
export interface Patient extends BaseEntity {
  name: string;
  dateOfBirth: string;
  address: string;
  phone: string;
  email?: string;
  medicalHistory: string;
  emergencyContact: string;
  emergencyPhone: string;
  status: 'active' | 'inactive' | 'discharged';
  assignedTherapist?: string;
  profilePicture?: string;
  
  // Dados médicos específicos
  diagnosis?: string;
  allergies?: string;
  medications?: string;
  referringPhysician?: string;
  
  // Informações administrativas
  insuranceInfo?: string;
  paymentMethod?: string;
  
  // Consentimentos LGPD
  consentGiven: boolean;
  consentDate?: string;
  dataProcessingConsent: boolean;
  marketingConsent?: boolean;
}

// === AVALIAÇÕES ===
export interface Assessment extends BaseEntity {
  patientId: string;
  therapistId: string;
  date: string;
  type: 'initial' | 'progress' | 'discharge' | 'reassessment';
  
  // Dados da avaliação
  mainComplaint: string;
  history: string;
  physicalExam: string;
  diagnosis: string;
  treatmentPlan: string;
  goals: string[];
  
  // Scores e medições
  painScale?: number; // 0-10
  rangeOfMotion?: Record<string, number>;
  strength?: Record<string, number>;
  functionalTests?: Record<string, any>;
  
  // Observações
  notes?: string;
  attachments?: string[];
  
  // Status
  status: 'draft' | 'completed' | 'reviewed';
  reviewedBy?: string;
  reviewDate?: string;
}

// === DOCUMENTOS MÉDICOS ===
export interface MedicalDocument extends BaseEntity {
  patientId: string;
  uploadedBy: string;
  
  // Metadados do arquivo
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  
  // Categorização
  category: 'exam' | 'prescription' | 'report' | 'image' | 'consent' | 'other';
  subcategory?: string;
  
  // Informações médicas
  description: string;
  date: string; // Data do documento/exame
  relevantTo?: string[]; // IDs de avaliações/tratamentos relacionados
  
  // Controle de acesso
  accessLevel: 'patient' | 'therapist' | 'admin';
  sharedWith?: string[]; // IDs de usuários com acesso
  
  // Metadados adicionais
  tags?: string[];
  isArchived: boolean;
}

// === HISTÓRICO MÉDICO ===
export interface MedicalHistory extends BaseEntity {
  patientId: string;
  recordedBy: string;
  
  // Tipo de registro
  category: 'surgery' | 'injury' | 'medication' | 'condition' | 'allergy' | 'family_history';
  
  // Detalhes
  title: string;
  description: string;
  date: string; // Data do evento
  severity?: 'low' | 'medium' | 'high' | 'critical';
  
  // Status
  isActive: boolean; // Se ainda é relevante
  resolvedDate?: string;
  
  // Relações
  relatedAssessments?: string[];
  relatedTreatments?: string[];
}

// === CONSENTIMENTOS LGPD ===
export interface PatientConsent extends BaseEntity {
  patientId: string;
  consentType: 'data_processing' | 'marketing' | 'research' | 'image_use' | 'treatment';
  
  // Status do consentimento
  granted: boolean;
  grantedDate?: string;
  revokedDate?: string;
  
  // Detalhes
  purpose: string;
  dataTypes: string[]; // Tipos de dados cobertos
  retentionPeriod?: string;
  
  // Auditoria
  grantedBy?: string; // Se concedido por responsável
  witnessedBy?: string;
  
  // Documentação
  consentForm?: string; // Caminho para documento assinado
  version: string; // Versão do termo de consentimento
}

// === PLANO DE TRATAMENTO ===
export interface TreatmentPlan extends BaseEntity {
  patientId: string;
  assessmentId: string;
  therapistId: string;
  
  // Objetivos
  shortTermGoals: string[];
  longTermGoals: string[];
  expectedDuration: number; // em semanas
  
  // Frequência e intensidade
  sessionsPerWeek: number;
  sessionDuration: number; // em minutos
  
  // Modalidades de tratamento
  treatmentModalities: string[];
  precautions?: string[];
  contraindications?: string[];
  
  // Progresso
  status: 'active' | 'completed' | 'suspended' | 'discontinued';
  progressNotes?: string[];
  
  // Reavaliação
  nextReviewDate?: string;
  outcomeTargets?: Record<string, any>;
}

// === TIPOS PARA COMPONENTES ===
export interface PatientListFilters {
  status?: string;
  therapist?: string;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface PatientStats {
  totalPatients: number;
  activePatients: number;
  newThisMonth: number;
  statusBreakdown: Record<string, number>;
  avgTreatmentDuration: number;
}

// === FORMULÁRIOS ===
export interface PatientFormData {
  personalInfo: Partial<Patient>;
  medicalInfo: {
    diagnosis?: string;
    allergies?: string;
    medications?: string;
    history?: string;
  };
  consentInfo: {
    dataProcessing: boolean;
    marketing: boolean;
    treatment: boolean;
  };
}

export default {
  Patient,
  Assessment,
  MedicalDocument,
  MedicalHistory,
  PatientConsent,
  TreatmentPlan,
};