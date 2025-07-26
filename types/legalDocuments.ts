/**
 * Tipos e Interfaces para Sistema de Documentação Legal
 * Baseado no Lumi Dashboard com compliance total para fisioterapia
 */

// Tipos base para documentos legais
export interface BaseDocument {
  id: string;
  type: DocumentType;
  patientId: string;
  therapistId: string;
  tenantId: string;
  title: string;
  content: string;
  templateId: string;
  status: DocumentStatus;
  version: string;
  createdAt: string;
  updatedAt: string;
  validUntil?: string;
  metadata: DocumentMetadata;
  signatures: DigitalSignature[];
  compliance: ComplianceInfo;
}

export enum DocumentType {
  // Termos de Consentimento
  CONSENT_IMAGE_USE = 'consent_image_use',
  CONSENT_TREATMENT = 'consent_treatment',
  CONSENT_DATA_SHARING = 'consent_data_sharing',
  CONSENT_HOME_EXERCISES = 'consent_home_exercises',
  CONSENT_TELEMEDICINE = 'consent_telemedicine',
  
  // Declarações e Atestados
  ATTENDANCE_DECLARATION = 'attendance_declaration',
  PHYSICAL_CAPACITY_CERTIFICATE = 'physical_capacity_certificate',
  MEDICAL_REPORT = 'medical_report',
  TREATMENT_COMPLETION_CERTIFICATE = 'treatment_completion_certificate',
  DISCHARGE_DECLARATION = 'discharge_declaration',
  
  // Documentos Financeiros
  PAYMENT_RECEIPT = 'payment_receipt',
  SERVICE_INVOICE = 'service_invoice',
  TREATMENT_CONTRACT = 'treatment_contract',
  CANCELLATION_TERMS = 'cancellation_terms',
  BILLING_REPORT = 'billing_report',
  
  // Receituários e Prescrições
  EXERCISE_PRESCRIPTION = 'exercise_prescription',
  EQUIPMENT_PRESCRIPTION = 'equipment_prescription',
  HOME_CARE_INSTRUCTIONS = 'home_care_instructions',
  TREATMENT_PLAN = 'treatment_plan',
  EXERCISE_PROTOCOL = 'exercise_protocol'
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pending_signature',
  SIGNED = 'signed',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  ARCHIVED = 'archived'
}

export interface DocumentMetadata {
  language: string;
  locale: string;
  generatedBy: string;
  approvedBy?: string;
  reviewedBy?: string;
  tags: string[];
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidentiality: 'public' | 'internal' | 'confidential' | 'restricted';
  legalBasis: string[];
  retentionPeriod: number; // em anos
  customFields: Record<string, any>;
}

// Assinatura Digital
export interface DigitalSignature {
  id: string;
  signerId: string;
  signerName: string;
  signerRole: string;
  signerCPF?: string;
  signatureMethod: SignatureMethod;
  timestamp: string;
  certificateInfo: CertificateInfo;
  ipAddress: string;
  userAgent: string;
  geolocation?: Geolocation;
  biometricData?: BiometricData;
  isValid: boolean;
  validationResult: ValidationResult;
}

export enum SignatureMethod {
  DIGITAL_CERTIFICATE = 'digital_certificate',
  SMS_TOKEN = 'sms_token',
  EMAIL_CONFIRMATION = 'email_confirmation',
  BIOMETRIC = 'biometric',
  PIN_CODE = 'pin_code',
  QUALIFIED_SIGNATURE = 'qualified_signature' // ICP-Brasil
}

export interface CertificateInfo {
  serialNumber: string;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  algorithm: string;
  fingerprint: string;
  keyUsage: string[];
  icpBrasil: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  timestamp: string;
  validator: string;
  errors: string[];
  warnings: string[];
  trustLevel: 'low' | 'medium' | 'high';
}

// Compliance e Regulamentações
export interface ComplianceInfo {
  cfm: CFMCompliance;
  coffito: COFFITOCompliance;
  lgpd: LGPDCompliance;
  anvisa: ANVISACompliance;
  auditTrail: AuditEntry[];
}

export interface CFMCompliance {
  resolutionNumber: string;
  requirements: string[];
  isCompliant: boolean;
  lastReview: string;
  reviewer: string;
  notes: string;
}

export interface COFFITOCompliance {
  resolutionNumber: string;
  ethicalCode: string;
  professionalRegistry: string;
  isCompliant: boolean;
  lastReview: string;
  notes: string;
}

export interface LGPDCompliance {
  legalBasis: LGPDLegalBasis;
  dataCategories: string[];
  retentionPeriod: number;
  dataSubjectRights: string[];
  isCompliant: boolean;
  dpoApproval: boolean;
  lastReview: string;
  privacyNotice: string;
}

export enum LGPDLegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
  HEALTH_PROTECTION = 'health_protection'
}

export interface ANVISACompliance {
  sanitaryLicense: string;
  regulationNumber: string;
  isCompliant: boolean;
  lastInspection: string;
  notes: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
  ipAddress: string;
  result: 'success' | 'failure' | 'warning';
}

// Templates de Documentos
export interface DocumentTemplate {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  version: string;
  htmlContent: string;
  cssStyles: string;
  variables: TemplateVariable[];
  sections: TemplateSection[];
  validationRules: ValidationRule[];
  compliance: ComplianceRequirement[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'list' | 'object';
  required: boolean;
  defaultValue?: any;
  validation?: string;
  description: string;
  placeholder?: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  order: number;
  required: boolean;
  conditional?: string; // Condição JavaScript
  content: string;
  variables: string[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ComplianceRequirement {
  regulation: 'CFM' | 'COFFITO' | 'LGPD' | 'ANVISA';
  requirement: string;
  mandatory: boolean;
  description: string;
}

// Dados específicos para tipos de documentos
export interface ConsentFormData {
  patientName: string;
  patientCPF: string;
  patientRG: string;
  patientBirthDate: string;
  patientAddress: string;
  patientPhone: string;
  patientEmail: string;
  legalGuardian?: LegalGuardian;
  consentScope: string[];
  limitations: string[];
  risks: string[];
  benefits: string[];
  alternatives: string[];
  duration: string;
  revocationRights: string[];
  dataProcessing: DataProcessingInfo;
}

export interface LegalGuardian {
  name: string;
  cpf: string;
  rg: string;
  relationship: string;
  phone: string;
  email: string;
}

export interface DataProcessingInfo {
  purposes: string[];
  categories: string[];
  recipients: string[];
  retention: string;
  transfers: string[];
  rights: string[];
}

export interface TreatmentData {
  diagnosis: string;
  treatment: string;
  procedures: string[];
  duration: string;
  frequency: string;
  objectives: string[];
  contraindications: string[];
  precautions: string[];
  homeInstructions: string[];
}

export interface FinancialData {
  amount: number;
  currency: string;
  paymentMethod: string;
  installments?: number;
  dueDate: string;
  services: ServiceItem[];
  taxes: TaxItem[];
  discounts: DiscountItem[];
  total: number;
}

export interface ServiceItem {
  code: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxable: boolean;
}

export interface TaxItem {
  name: string;
  rate: number;
  amount: number;
  type: 'percentage' | 'fixed';
}

export interface DiscountItem {
  description: string;
  amount: number;
  type: 'percentage' | 'fixed';
}

// Configurações de sistema
export interface DocumentSystemConfig {
  defaultLanguage: string;
  defaultLocale: string;
  signatureRequired: boolean;
  automaticGeneration: boolean;
  emailDelivery: boolean;
  whatsappDelivery: boolean;
  storageLocation: string;
  encryptionEnabled: boolean;
  backupEnabled: boolean;
  retentionPolicies: RetentionPolicy[];
  complianceSettings: ComplianceSettings;
}

export interface RetentionPolicy {
  documentType: DocumentType;
  retentionPeriod: number; // em anos
  destructionMethod: string;
  archiveLocation: string;
  reviewFrequency: number; // em meses
}

export interface ComplianceSettings {
  cfmEnabled: boolean;
  coffitoEnabled: boolean;
  lgpdEnabled: boolean;
  anvisaEnabled: boolean;
  automaticCompliance: boolean;
  auditLogging: boolean;
  reportGeneration: boolean;
}

// Interfaces para geração de documentos
export interface DocumentGenerationRequest {
  templateId: string;
  patientId: string;
  therapistId: string;
  data: Record<string, any>;
  options: GenerationOptions;
}

export interface GenerationOptions {
  format: 'html' | 'pdf' | 'docx';
  includeSignature: boolean;
  deliveryMethod: 'email' | 'whatsapp' | 'download' | 'print';
  recipients: string[];
  customization: DocumentCustomization;
}

export interface DocumentCustomization {
  logoUrl?: string;
  headerText?: string;
  footerText?: string;
  colors?: {
    primary: string;
    secondary: string;
    text: string;
  };
  fonts?: {
    primary: string;
    secondary: string;
  };
}

// Tipos para entrega e notificação
export interface DocumentDelivery {
  id: string;
  documentId: string;
  method: 'email' | 'whatsapp' | 'sms' | 'postal';
  recipient: string;
  status: DeliveryStatus;
  attempts: number;
  lastAttempt: string;
  deliveredAt?: string;
  errorMessage?: string;
  trackingInfo?: TrackingInfo;
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  VIEWED = 'viewed',
  DOWNLOADED = 'downloaded'
}

export interface TrackingInfo {
  openedAt?: string[];
  downloadedAt?: string[];
  ipAddresses: string[];
  userAgents: string[];
  referrers: string[];
}

// Tipos para relatórios e analytics
export interface DocumentAnalytics {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<DocumentStatus, number>;
  signatureRate: number;
  deliveryRate: number;
  complianceRate: number;
  popularTemplates: TemplateUsage[];
  errors: ErrorSummary[];
  performance: PerformanceMetrics;
}

export interface TemplateUsage {
  templateId: string;
  templateName: string;
  usageCount: number;
  successRate: number;
  averageGenerationTime: number;
}

export interface ErrorSummary {
  type: string;
  count: number;
  lastOccurrence: string;
  affectedDocuments: string[];
}

export interface PerformanceMetrics {
  averageGenerationTime: number;
  averageDeliveryTime: number;
  systemUptime: number;
  errorRate: number;
  throughput: number;
}

// Interfaces para integração
export interface ExternalIntegration {
  id: string;
  name: string;
  type: 'email' | 'whatsapp' | 'signature' | 'storage' | 'compliance';
  enabled: boolean;
  config: Record<string, any>;
  credentials: EncryptedCredentials;
  lastSync: string;
  status: 'active' | 'inactive' | 'error';
}

export interface EncryptedCredentials {
  encrypted: string;
  algorithm: string;
  keyId: string;
}

// Tipos para auditoria e logs
export interface DocumentLog {
  id: string;
  documentId: string;
  timestamp: string;
  userId: string;
  action: DocumentAction;
  details: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
}

export enum DocumentAction {
  CREATED = 'created',
  UPDATED = 'updated',
  SIGNED = 'signed',
  DELIVERED = 'delivered',
  VIEWED = 'viewed',
  DOWNLOADED = 'downloaded',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  RESTORED = 'restored'
}

// Tipos para segurança
export interface SecuritySettings {
  encryptionAlgorithm: string;
  keyRotationPeriod: number;
  accessControlEnabled: boolean;
  ipWhitelist: string[];
  twoFactorRequired: boolean;
  sessionTimeout: number;
  passwordPolicy: PasswordPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number;
  historyCount: number;
}

// Geolocalização e dados biométricos
export interface Geolocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
  address?: string;
}

export interface BiometricData {
  type: 'fingerprint' | 'facial' | 'voice' | 'signature';
  data: string;
  confidence: number;
  timestamp: string;
  deviceInfo: string;
}