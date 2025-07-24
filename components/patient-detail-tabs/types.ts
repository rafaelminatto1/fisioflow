import { Patient } from '@/types/patient';

// Interfaces base para todas as abas
interface BasePatientTabProps {
  patient: Patient;
  onUpdate: (updates: Partial<Patient>) => void;
}

// Props específicas para cada aba
export interface PatientOverviewTabProps extends BasePatientTabProps {
  // Props específicas da aba de visão geral, se houver
}

export interface PatientDiaryTabProps extends BasePatientTabProps {
  // Props específicas da aba de diário, se houver
}

export interface PatientFlowsheetTabProps extends BasePatientTabProps {
  // Props específicas da aba de evolução, se houver
}

export interface PatientExercisesTabProps extends BasePatientTabProps {
  // Props específicas da aba de exercícios, se houver
}

export interface PatientMedicationsTabProps extends BasePatientTabProps {
  // Props específicas da aba de medicações, se houver
}

export interface PatientMessagesTabProps extends BasePatientTabProps {
  // Props específicas da aba de mensagens, se houver
}

export interface PatientSettingsTabProps extends BasePatientTabProps {
  // Props específicas da aba de configurações, se houver
}

// Tipos para dados específicos das abas

// Tipos para Diário
export interface DiaryEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  painLevel: number;
  energyLevel: number;
  sleepQuality: number;
  notes?: string;
  symptoms?: string[];
  activities?: string[];
}

// Tipos para Exercícios
export interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl?: string;
  sets: number;
  reps: number;
  duration?: number;
  frequency: string;
  status: 'active' | 'completed' | 'paused';
  prescribedDate: string;
  lastPerformed?: string;
  adherence: number;
}

export interface ExerciseHistory {
  id: string;
  exerciseId: string;
  performedDate: string;
  sets: number;
  reps: number;
  duration?: number;
  notes?: string;
  painLevel?: number;
}

// Tipos para Medicações
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: 'oral' | 'tópico' | 'injetável';
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'suspended';
  prescribedBy: string;
  notes?: string;
  sideEffects?: string[];
  interactions?: string[];
}

export interface MedicationHistory {
  id: string;
  medicationId: string;
  takenDate: string;
  takenTime: string;
  dosageTaken: string;
  notes?: string;
  sideEffectsReported?: string[];
}

// Tipos para Mensagens
export interface Message {
  id: string;
  type: 'whatsapp' | 'sms' | 'email' | 'internal';
  direction: 'sent' | 'received';
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sender: string;
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
  type: 'appointment' | 'reminder' | 'exercise' | 'general';
}

// Tipos para Configurações
export interface NotificationSettings {
  appointments: boolean;
  exercises: boolean;
  medications: boolean;
  results: boolean;
  marketing: boolean;
  whatsapp: boolean;
  sms: boolean;
  email: boolean;
}

export interface PrivacySettings {
  shareDataWithPartners: boolean;
  allowResearchParticipation: boolean;
  receiveHealthTips: boolean;
  profileVisibility: 'private' | 'limited' | 'public';
}

export interface PaymentMethod {
  id: string;
  type: 'credit' | 'debit' | 'pix' | 'boleto';
  last4?: string;
  brand?: string;
  isDefault: boolean;
  expiryDate?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email: string;
}

// Tipos para Evolução Clínica
export interface Assessment {
  id: string;
  date: string;
  type: string;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  progress: number;
  status: 'active' | 'completed' | 'paused';
}

export interface PainData {
  date: string;
  level: number;
  location?: string;
  type?: string;
}

// Tipos para cards de resumo
export interface SummaryCard {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'green' | 'red' | 'yellow' | 'blue' | 'gray';
}