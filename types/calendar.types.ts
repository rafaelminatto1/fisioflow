/**
 * Tipos relacionados a agendamentos, calendário e blocos de tempo
 */

import { BaseEntity } from './core.types';

// === AGENDAMENTOS ===
export interface Appointment extends BaseEntity {
  // Participantes
  patientId: string;
  patientName: string; // Cache para performance
  therapistId: string;
  therapistName: string; // Cache para performance
  
  // Horário
  startTime: string; // ISO string
  endTime: string; // ISO string
  duration: number; // em minutos
  
  // Tipo e categoria
  type: 'evaluation' | 'treatment' | 'follow_up' | 'group_session' | 'consultation';
  category?: string; // Ex: 'fisioterapia', 'pilates', 'rpg'
  
  // Status
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
  
  // Localização
  room?: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  
  // Informações adicionais
  notes?: string;
  privateNotes?: string; // Visível apenas para staff
  reasonForCancellation?: string;
  
  // Confirmação
  confirmationSent?: boolean;
  confirmationSentAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  
  // Lembrete
  reminderSent?: boolean;
  reminderSentAt?: string;
  
  // Recorrência
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  parentAppointmentId?: string; // Para agendamentos recorrentes
  
  // Financeiro
  price?: number;
  isPaid?: boolean;
  paymentMethod?: string;
  
  // Avaliação pós-consulta
  sessionRating?: number; // 1-5
  sessionNotes?: string;
  nextAppointmentSuggested?: boolean;
}

// === PADRÃO DE RECORRÊNCIA ===
export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number; // A cada X dias/semanas/meses
  daysOfWeek?: number[]; // 0-6 (domingo a sábado)
  endDate?: string;
  occurrences?: number; // Número total de ocorrências
}

// === BLOCOS DE TEMPO ===
export interface TimeBlock extends BaseEntity {
  therapistId: string;
  
  // Horário
  startTime: string;
  endTime: string;
  
  // Tipo
  type: 'available' | 'busy' | 'break' | 'meeting' | 'admin' | 'blocked';
  
  // Detalhes
  title?: string;
  description?: string;
  
  // Recorrência
  isRecurring: boolean;
  recurrencePattern?: RecurrencePattern;
  
  // Configurações
  allowBooking: boolean; // Se pode ser usado para agendamentos
  maxConcurrentAppointments?: number;
  
  // Cor para visualização
  color?: string;
}

// === DISPONIBILIDADE ===
export interface TherapistAvailability extends BaseEntity {
  therapistId: string;
  
  // Padrão semanal
  weeklySchedule: WeeklySchedule;
  
  // Exceções
  exceptions: AvailabilityException[];
  
  // Configurações
  advanceBookingDays: number; // Quantos dias de antecedência permite
  minBookingNotice: number; // Mínimo de horas de antecedência
  bufferBetweenAppointments: number; // Buffer em minutos
  
  // Tipos de consulta permitidos
  allowedAppointmentTypes: string[];
  
  // Status
  isActive: boolean;
  effectiveFrom: string;
  effectiveUntil?: string;
}

export interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isWorking: boolean;
  periods: TimePeriod[];
}

export interface TimePeriod {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  type: 'work' | 'break' | 'lunch';
}

export interface AvailabilityException {
  date: string; // YYYY-MM-DD
  type: 'unavailable' | 'modified_schedule' | 'holiday';
  reason?: string;
  modifiedSchedule?: DaySchedule;
}

// === SALAS E RECURSOS ===
export interface Room extends BaseEntity {
  name: string;
  code: string;
  
  // Capacidade
  capacity: number;
  maxConcurrentAppointments: number;
  
  // Equipamentos
  equipment: string[];
  
  // Configurações
  allowOnlineBooking: boolean;
  isActive: boolean;
  
  // Localização
  floor?: string;
  building?: string;
  description?: string;
  
  // Imagem
  imageUrl?: string;
}

// === CONFLITOS E VALIDAÇÕES ===
export interface ScheduleConflict {
  type: 'therapist_busy' | 'room_occupied' | 'patient_conflict' | 'outside_hours';
  appointmentId?: string;
  conflictingAppointment?: Appointment;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// === TIPOS PARA CALENDÁRIO ===
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  
  // Aparência
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  
  // Metadados
  type: 'appointment' | 'timeblock' | 'break' | 'holiday';
  resource?: string; // ID do recurso (terapeuta, sala)
  
  // Interatividade
  editable?: boolean;
  deletable?: boolean;
  
  // Dados originais
  appointment?: Appointment;
  timeBlock?: TimeBlock;
}

export interface CalendarView {
  name: string;
  type: 'month' | 'week' | 'day' | 'agenda';
  resources?: CalendarResource[];
}

export interface CalendarResource {
  id: string;
  title: string;
  type: 'therapist' | 'room' | 'equipment';
  
  // Aparência
  eventColor?: string;
  
  // Dados
  data?: any;
}

// === ESTATÍSTICAS ===
export interface CalendarStats {
  totalAppointments: number;
  todayAppointments: number;
  weekAppointments: number;
  attendanceRate: number;
  cancellationRate: number;
  averageSessionDuration: number;
  busyHours: { hour: number; count: number }[];
  popularServices: { service: string; count: number }[];
}

// === FILTROS E BUSCA ===
export interface AppointmentFilters {
  therapistId?: string;
  patientId?: string;
  status?: string[];
  type?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  room?: string;
  search?: string;
}

// === FORMULÁRIOS ===
export interface AppointmentFormData {
  patientId: string;
  therapistId: string;
  date: string;
  startTime: string;
  duration: number;
  type: string;
  category?: string;
  room?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  sendConfirmation?: boolean;
  sendReminder?: boolean;
}

export interface RescheduleData {
  appointmentId: string;
  newDate: string;
  newStartTime: string;
  reason?: string;
  notifyPatient?: boolean;
}

export default {
  Appointment,
  TimeBlock,
  TherapistAvailability,
  Room,
  CalendarEvent,
  RecurrencePattern,
};