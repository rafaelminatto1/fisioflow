export type UserRole = 'ADMIN' | 'FISIOTERAPEUTA' | 'ESTAGIARIO' | 'PACIENTE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  avatar?: string;
  phone?: string;
  specialization?: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  plan: SubscriptionPlan;
  subscriptionExpiresAt?: string;
  appleSubscriptionId?: string;
  maxUsers: number;
  maxPatients: number;
  createdAt: string;
  ownerId: string;
}

export type SubscriptionPlan = 'free' | 'silver' | 'gold' | 'platinum';

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birthDate: string;
  address: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    zipCode: string;
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  medicalInfo: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries: string[];
    familyHistory: string;
  };
  sessions: number;
  progress: number;
  status: 'active' | 'inactive' | 'discharged';
  tenantId: string;
  assignedPhysiotherapist: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId: string;
  patientId?: string;
  dueDate?: string;
  tags: string[];
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  physiotherapistId: string;
  startTime: string;
  endTime: string;
  type: 'evaluation' | 'treatment' | 'reevaluation' | 'discharge';
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  notes?: string;
  tenantId: string;
  createdAt: string;
}

export interface SubscriptionMetrics {
  activeSubscribers: number;
  monthlyRevenue: number;
  conversionRate: number;
  churnRate: number;
  totalUsers: number;
  newSignups: number;
  cancelledSubscriptions: number;
  averageRevenuePerUser: number;
}

export interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  description?: string;
}

export interface ConversionFunnelData {
  stage: string;
  users: number;
  conversionRate: number;
}

export interface RevenueData {
  period: string;
  revenue: number;
  subscriptions: number;
  churn: number;
}

export interface PlanDistribution {
  plan: SubscriptionPlan;
  count: number;
  percentage: number;
}