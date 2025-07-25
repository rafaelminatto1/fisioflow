/**
 * Tipos para Sistema de Analytics Preditivo e Insights Clínicos
 * Implementação do Prompt 4.3
 */

// ============= PREDIÇÃO DE RESULTADOS =============

export interface TreatmentPrediction {
  patientId: string;
  pathology: string;
  estimatedTreatmentDays: number;
  successProbability: number; // 0-1
  abandonmentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  reassessmentNeeded: boolean;
  complicationRisk: number; // 0-1
  confidence: number; // 0-1
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  name: string;
  impact: number; // -1 a 1
  description: string;
}

// ============= INSIGHTS CLÍNICOS =============

export interface ClinicalInsight {
  id: string;
  type: 'EXERCISE_EFFECTIVENESS' | 'AGE_PATTERNS' | 'SYMPTOM_CORRELATION' | 'RISK_FACTORS' | 'BENCHMARK';
  title: string;
  description: string;
  data: any;
  confidence: number;
  actionable: boolean;
  createdAt: string;
}

export interface ExerciseEffectiveness {
  exerciseId: string;
  exerciseName: string;
  pathology: string;
  effectivenessScore: number; // 0-1
  patientsCount: number;
  averageImprovement: number;
  recommendationStrength: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AgePattern {
  ageGroup: string;
  pathology: string;
  averageRecoveryTime: number;
  successRate: number;
  commonFactors: string[];
}

export interface SymptomCorrelation {
  symptom1: string;
  symptom2: string;
  correlationStrength: number; // -1 a 1
  pathologies: string[];
  clinicalSignificance: 'LOW' | 'MEDIUM' | 'HIGH';
}

// ============= DASHBOARD EXECUTIVO =============

export interface ExecutiveDashboard {
  clinicKPIs: ClinicKPIs;
  therapistMetrics: TherapistMetrics[];
  treatmentSuccess: TreatmentSuccessMetrics;
  patientSatisfaction: PatientSatisfactionMetrics;
  financialMetrics: FinancialMetrics;
  generatedAt: string;
}

export interface ClinicKPIs {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  averageSessionsPerPatient: number;
  overallSuccessRate: number;
  patientRetentionRate: number;
  averageTreatmentDuration: number;
}

export interface TherapistMetrics {
  therapistId: string;
  therapistName: string;
  totalPatients: number;
  successRate: number;
  averageSessionDuration: number;
  patientSatisfactionScore: number;
  productivityScore: number;
  specializations: string[];
}

export interface TreatmentSuccessMetrics {
  byPathology: PathologySuccessRate[];
  byAgeGroup: AgeGroupSuccessRate[];
  byTreatmentType: TreatmentTypeSuccessRate[];
  overallTrends: TrendData[];
}

export interface PathologySuccessRate {
  pathology: string;
  successRate: number;
  patientCount: number;
  averageDuration: number;
  trendDirection: 'UP' | 'DOWN' | 'STABLE';
}

export interface AgeGroupSuccessRate {
  ageGroup: string;
  successRate: number;
  patientCount: number;
  commonPathologies: string[];
}

export interface TreatmentTypeSuccessRate {
  treatmentType: string;
  successRate: number;
  patientCount: number;
  cost: number;
  roi: number;
}

export interface PatientSatisfactionMetrics {
  overallNPS: number;
  satisfactionByTherapist: { therapistId: string; score: number }[];
  commonComplaints: string[];
  commonPraises: string[];
  trendData: TrendData[];
}

export interface FinancialMetrics {
  totalRevenue: number;
  revenuePerPatient: number;
  costPerSession: number;
  profitMargin: number;
  outstandingPayments: number;
  revenueByTreatmentType: { type: string; revenue: number }[];
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

// ============= ALERTAS INTELIGENTES =============

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  affectedEntities: string[];
  suggestedActions: SuggestedAction[];
  createdAt: string;
  isRead: boolean;
  isResolved: boolean;
}

export enum AlertType {
  ABANDONMENT_RISK = 'ABANDONMENT_RISK',
  SPECIAL_ATTENTION = 'SPECIAL_ATTENTION',
  TREATMENT_IMPROVEMENT = 'TREATMENT_IMPROVEMENT',
  CONCERNING_TREND = 'CONCERNING_TREND',
  OPERATIONAL_OPTIMIZATION = 'OPERATIONAL_OPTIMIZATION'
}

export interface SuggestedAction {
  action: string;
  priority: number;
  estimatedImpact: 'LOW' | 'MEDIUM' | 'HIGH';
  resourcesRequired: string[];
}

// ============= MODELOS PREDITIVOS =============

export interface MLModel {
  id: string;
  name: string;
  type: 'RANDOM_FOREST' | 'NEURAL_NETWORK' | 'LINEAR_REGRESSION' | 'SVM';
  target: string;
  features: string[];
  accuracy: number;
  lastTrained: string;
  version: string;
  isActive: boolean;
}

export interface ModelPrediction {
  modelId: string;
  entityId: string;
  prediction: any;
  confidence: number;
  features: { [key: string]: any };
  createdAt: string;
}

// ============= MÉTRICAS PRINCIPAIS =============

export interface PathologyMetrics {
  pathology: string;
  improvementRate: number;
  averageTreatmentTime: number;
  exerciseAdherence: number;
  patientSatisfactionNPS: number;
  treatmentROI: number;
  successFactors: string[];
  riskFactors: string[];
}

// ============= DATA WAREHOUSE =============

export interface AnalyticsDataPoint {
  id: string;
  timestamp: string;
  patientId: string;
  therapistId: string;
  sessionId?: string;
  pathology: string;
  metrics: { [key: string]: number };
  qualitativeData: { [key: string]: string };
  source: 'SESSION' | 'ASSESSMENT' | 'EXERCISE' | 'FEEDBACK' | 'OUTCOME';
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  filters: { [key: string]: any };
  groupBy: string[];
  metrics: string[];
  limit: number;
}

export interface AnalyticsResult {
  data: any[];
  summary: { [key: string]: any };
  totalRecords: number;
  executionTime: number;
  query: AnalyticsQuery;
}

// ============= CONFIGURAÇÕES =============

export interface AnalyticsConfig {
  modelSettings: {
    retrain: boolean;
    retrainFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    minDataPoints: number;
  };
  alertSettings: {
    enabled: boolean;
    thresholds: { [AlertType: string]: number };
    recipients: string[];
  };
  dashboardSettings: {
    autoRefresh: boolean;
    refreshInterval: number;
    defaultDateRange: number;
  };
}