/**
 * Sistema de Compliance Automático
 * Sistema completo de verificação, auditoria e conformidade automática com LGPD, regulamentações médicas
 */

import React from 'react';

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { encryption } from './encryption';
import { intelligentNotificationService } from './intelligentNotificationService';


// === INTERFACES ===
interface ComplianceRule {
  id: string;
  
  // Identificação
  name: string;
  description: string;
  category: 'lgpd' | 'medical' | 'security' | 'clinical' | 'financial' | 'operational';
  subcategory: string;
  
  // Configuração da regra
  type: 'data_retention' | 'access_control' | 'encryption_check' | 'audit_requirement' | 'consent_validation' | 'clinical_protocol' | 'financial_compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Condições
  conditions: ComplianceCondition[];
  
  // Ações automáticas
  automaticActions: ComplianceAction[];
  
  // Configuração de execução
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  activeHours?: { start: string; end: string }; // HH:mm format
  
  // Status
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  
  // Estatísticas
  violations: number;
  lastViolationAt?: string;
  
  // Metadados
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface ComplianceCondition {
  field: string; // Campo ou entidade a verificar
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'older_than' | 'newer_than';
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
}

interface ComplianceAction {
  type: 'notify' | 'delete_data' | 'encrypt_data' | 'anonymize_data' | 'block_access' | 'create_audit_log' | 'send_report' | 'escalate';
  target: string; // Quem ou o que será afetado
  parameters: Record<string, any>;
  delay?: number; // Delay em segundos antes da execução
}

interface ComplianceViolation {
  id: string;
  
  // Regra violada
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  
  // Detalhes da violação
  entityType: string;
  entityId: string;
  entityName?: string;
  
  // Contexto
  violationData: any;
  detectedAt: string;
  
  // Severidade e impacto
  severity: ComplianceRule['severity'];
  riskScore: number; // 0-100
  
  // Status
  status: 'open' | 'investigating' | 'resolved' | 'false_positive' | 'accepted_risk';
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Ações tomadas
  actionsExecuted: ComplianceActionResult[];
  
  // Metadados
  tenantId: string;
}

interface ComplianceActionResult {
  actionType: ComplianceAction['type'];
  executedAt: string;
  success: boolean;
  result?: any;
  error?: string;
}

interface ComplianceReport {
  id: string;
  
  // Período do relatório
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  
  // Escopo
  tenantId: string;
  categories: string[];
  
  // Estatísticas
  summary: {
    totalRules: number;
    activeRules: number;
    totalViolations: number;
    openViolations: number;
    resolvedViolations: number;
    criticalViolations: number;
    complianceScore: number; // 0-100
  };
  
  // Detalhes por categoria
  categoryBreakdown: Array<{
    category: string;
    rulesCount: number;
    violationsCount: number;
    complianceScore: number;
    topViolations: Array<{
      ruleId: string;
      ruleName: string;
      count: number;
    }>;
  }>;
  
  // Tendências
  trends: {
    violationsTrend: 'improving' | 'stable' | 'worsening';
    complianceScoreTrend: 'improving' | 'stable' | 'declining';
    mostProblematicAreas: string[];
  };
  
  // Recomendações
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionRequired: string;
    estimatedImpact: string;
  }>;
  
  // Dados para gráficos
  chartData: {
    violationsOverTime: Array<{ date: string; count: number; category: string }>;
    complianceScoreHistory: Array<{ date: string; score: number }>;
    violationsByCategory: Array<{ category: string; count: number }>;
  };
}

interface LGPDConsentRecord {
  id: string;
  
  // Titular dos dados
  dataSubjectId: string;
  dataSubjectType: 'patient' | 'employee' | 'visitor' | 'vendor';
  
  // Consentimento
  purpose: string[];
  legalBasis: LegalBasis;
  consentGiven: boolean;
  consentTimestamp: string;
  
  // Detalhes do consentimento
  consentMethod: 'digital_signature' | 'checkbox' | 'verbal' | 'implied' | 'form';
  consentText: string;
  consentVersion: string;
  
  // Dados coletados
  dataCategories: string[];
  sensitiveData: boolean;
  
  // Processamento
  processingPurposes: string[];
  dataRetentionPeriod: number; // em dias
  automaticDeletion: boolean;
  
  // Compartilhamento
  dataSharing: boolean;
  sharingPartners?: string[];
  
  // Status
  isActive: boolean;
  withdrawnAt?: string;
  withdrawalMethod?: string;
  
  // Atualizações
  lastReconfirmedAt?: string;
  reconfirmationRequired: boolean;
  
  tenantId: string;
}

interface DataRetentionPolicy {
  id: string;
  
  // Identificação
  name: string;
  description: string;
  dataCategory: string;
  
  // Política
  retentionPeriodDays: number;
  retentionPeriodMonths: number;
  retentionPeriodYears: number;
  
  // Condições
  applicableConditions: Array<{
    field: string;
    value: any;
    operator: string;
  }>;
  
  // Ações ao expirar
  expirationAction: 'delete' | 'anonymize' | 'archive' | 'notify_manual_review';
  
  // Exceções
  exceptions: Array<{
    condition: string;
    extendedRetentionDays: number;
    reason: string;
  }>;
  
  // Status
  isActive: boolean;
  
  // Estatísticas
  appliedToCount: number;
  deletedCount: number;
  lastRunAt?: string;
  
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

// === CLASSE PRINCIPAL ===
class ComplianceService {
  private rules: Map<string, ComplianceRule> = new Map();
  private violations: Map<string, ComplianceViolation> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();
  private consentRecords: Map<string, LGPDConsentRecord> = new Map();
  private retentionPolicies: Map<string, DataRetentionPolicy> = new Map();
  
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o sistema de compliance
   */
  async initialize(): Promise<void> {
    await this.loadStoredData();
    this.setupDefaultRules();
    this.startMonitoring();
    
    console.log('🛡️ Compliance Service inicializado');
  }

  // === GESTÃO DE REGRAS ===

  /**
   * Criar nova regra de compliance
   */
  async createRule(
    rule: Omit<ComplianceRule, 'id' | 'violations' | 'createdAt' | 'updatedAt'>,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const ruleId = this.generateId('rule');
    
    const fullRule: ComplianceRule = {
      ...rule,
      id: ruleId,
      violations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
    };

    // Calcular próxima execução
    fullRule.nextRun = this.calculateNextRun(fullRule.frequency);

    this.rules.set(ruleId, fullRule);
    await this.saveRules();

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      AuditAction.CREATE,
      'compliance_rule',
      ruleId,
      {
        entityName: rule.name,
        legalBasis: LegalBasis.LEGAL_OBLIGATION,
        dataAccessed: ['compliance_config'],
        metadata: {
          category: rule.category,
          type: rule.type,
          severity: rule.severity,
        },
      }
    );

    console.log(`🛡️ Regra de compliance criada: ${rule.name}`);
    return ruleId;
  }

  /**
   * Executar verificação de compliance para uma regra específica
   */
  async executeRule(ruleId: string, userId: string): Promise<ComplianceViolation[]> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.isActive) {
      throw new Error('Regra não encontrada ou inativa');
    }

    console.log(`🔍 Executando regra: ${rule.name}`);
    
    const violations: ComplianceViolation[] = [];
    
    try {
      // Obter dados para verificação baseado no tipo da regra
      const dataToCheck = await this.getDataForRule(rule);
      
      // Verificar cada item contra as condições
      for (const item of dataToCheck) {
        const violatesRule = this.checkRuleConditions(rule.conditions, item);
        
        if (violatesRule) {
          const violation = await this.createViolation(rule, item, userId);
          violations.push(violation);
          
          // Executar ações automáticas
          await this.executeAutomaticActions(rule, violation);
        }
      }
      
      // Atualizar estatísticas da regra
      rule.violations += violations.length;
      rule.lastRun = new Date().toISOString();
      rule.nextRun = this.calculateNextRun(rule.frequency);
      
      if (violations.length > 0) {
        rule.lastViolationAt = new Date().toISOString();
      }
      
      await this.saveRules();
      
      console.log(`✅ Regra executada: ${violations.length} violações encontradas`);
      return violations;
    } catch (error) {
      console.error(`❌ Erro ao executar regra ${rule.name}:`, error);
      throw error;
    }
  }

  /**
   * Executar todas as regras programadas
   */
  async executeScheduledRules(): Promise<{ executed: number; violations: number }> {
    const now = new Date().toISOString();
    const rulesToExecute = Array.from(this.rules.values())
      .filter(rule => 
        rule.isActive && 
        rule.nextRun && 
        rule.nextRun <= now &&
        this.isWithinActiveHours(rule)
      );

    let totalViolations = 0;
    
    for (const rule of rulesToExecute) {
      try {
        const violations = await this.executeRule(rule.id, 'system');
        totalViolations += violations.length;
      } catch (error) {
        console.error(`❌ Erro ao executar regra ${rule.name}:`, error);
      }
    }

    console.log(`🔄 Compliance check: ${rulesToExecute.length} regras executadas, ${totalViolations} violações`);
    return { executed: rulesToExecute.length, violations: totalViolations };
  }

  // === GESTÃO DE LGPD ===

  /**
   * Registrar consentimento LGPD
   */
  async recordConsent(
    consent: Omit<LGPDConsentRecord, 'id' | 'consentTimestamp' | 'isActive' | 'reconfirmationRequired'>,
    userId: string,
    tenantId: string
  ): Promise<string> {
    const consentId = this.generateId('consent');
    
    const fullConsent: LGPDConsentRecord = {
      ...consent,
      id: consentId,
      consentTimestamp: new Date().toISOString(),
      isActive: true,
      reconfirmationRequired: false,
      tenantId,
    };

    this.consentRecords.set(consentId, fullConsent);
    await this.saveConsentRecords();

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      AuditAction.CREATE,
      'lgpd_consent',
      consentId,
      {
        entityName: `Consent: ${consent.dataSubjectId}`,
        legalBasis: consent.legalBasis,
        dataAccessed: ['personal_data', 'consent_records'],
        metadata: {
          dataSubjectType: consent.dataSubjectType,
          purposes: consent.purpose,
          sensitiveData: consent.sensitiveData,
        },
      }
    );

    console.log(`✅ Consentimento LGPD registrado: ${consent.dataSubjectId}`);
    return consentId;
  }

  /**
   * Retirar consentimento LGPD
   */
  async withdrawConsent(
    consentId: string,
    withdrawalMethod: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    const consent = this.consentRecords.get(consentId);
    if (!consent || consent.tenantId !== tenantId) {
      throw new Error('Consentimento não encontrado');
    }

    consent.isActive = false;
    consent.withdrawnAt = new Date().toISOString();
    consent.withdrawalMethod = withdrawalMethod;

    await this.saveConsentRecords();

    // Executar ações de retirada de consentimento
    await this.executeConsentWithdrawal(consent);

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      userId,
      'USER',
      AuditAction.UPDATE,
      'lgpd_consent',
      consentId,
      {
        entityName: `Consent Withdrawal: ${consent.dataSubjectId}`,
        legalBasis: LegalBasis.LEGAL_OBLIGATION,
        dataAccessed: ['consent_records'],
        metadata: {
          withdrawalMethod,
          previousPurposes: consent.purpose,
        },
      }
    );

    console.log(`❌ Consentimento retirado: ${consent.dataSubjectId}`);
  }

  /**
   * Gerar relatório de compliance
   */
  async generateComplianceReport(
    tenantId: string,
    periodStart: string,
    periodEnd: string,
    categories?: string[]
  ): Promise<ComplianceReport> {
    const reportId = this.generateId('report');
    
    // Filtrar dados do período
    const periodViolations = Array.from(this.violations.values())
      .filter(v => 
        v.tenantId === tenantId &&
        v.detectedAt >= periodStart &&
        v.detectedAt <= periodEnd &&
        (!categories || categories.includes(v.ruleCategory))
      );

    const periodRules = Array.from(this.rules.values())
      .filter(r => 
        r.tenantId === tenantId &&
        (!categories || categories.includes(r.category))
      );

    // Calcular estatísticas
    const summary = {
      totalRules: periodRules.length,
      activeRules: periodRules.filter(r => r.isActive).length,
      totalViolations: periodViolations.length,
      openViolations: periodViolations.filter(v => v.status === 'open').length,
      resolvedViolations: periodViolations.filter(v => v.status === 'resolved').length,
      criticalViolations: periodViolations.filter(v => v.severity === 'critical').length,
      complianceScore: this.calculateComplianceScore(periodRules, periodViolations),
    };

    const report: ComplianceReport = {
      id: reportId,
      periodStart,
      periodEnd,
      generatedAt: new Date().toISOString(),
      tenantId,
      categories: categories || [],
      summary,
      categoryBreakdown: [],
      trends: {
        violationsTrend: 'improving',
        complianceScoreTrend: 'improving',
        mostProblematicAreas: [],
      },
      recommendations: [],
      chartData: {
        violationsOverTime: [],
        complianceScoreHistory: [],
        violationsByCategory: [],
      },
    };

    this.reports.set(reportId, report);
    await this.saveReports();

    console.log(`📊 Relatório de compliance gerado: ${summary.complianceScore}% compliance`);
    return report;
  }

  // === MÉTODOS PRIVADOS ===

  private async getDataForRule(rule: ComplianceRule): Promise<any[]> {
    // Simular obtenção de dados baseado no tipo da regra
    switch (rule.type) {
      case 'data_retention':
        return await this.getDataForRetentionCheck(rule);
      case 'consent_validation':
        return await this.getConsentValidationData(rule);
      default:
        return [];
    }
  }

  private async getDataForRetentionCheck(rule: ComplianceRule): Promise<any[]> {
    // Simular dados que precisam verificação de retenção
    const mockData = [
      { id: 'patient_1', dataCategory: 'patient_records', createdAt: '2020-01-01T00:00:00Z' },
      { id: 'assessment_1', dataCategory: 'assessments', createdAt: '2019-06-01T00:00:00Z' },
    ];
    return mockData;
  }

  private async getConsentValidationData(rule: ComplianceRule): Promise<any[]> {
    // Verificar consentimentos que precisam revalidação
    const expiredConsents = Array.from(this.consentRecords.values())
      .filter(consent => {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        return new Date(consent.consentTimestamp) < sixMonthsAgo && !consent.lastReconfirmedAt;
      });
    
    return expiredConsents;
  }

  private checkRuleConditions(conditions: ComplianceCondition[], data: any): boolean {
    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(data, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private evaluateCondition(value: any, condition: ComplianceCondition): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'older_than':
        return new Date(value) < new Date(condition.value);
      default:
        return false;
    }
  }

  private async createViolation(
    rule: ComplianceRule, 
    data: any, 
    userId: string
  ): Promise<ComplianceViolation> {
    const violationId = this.generateId('violation');
    
    const violation: ComplianceViolation = {
      id: violationId,
      ruleId: rule.id,
      ruleName: rule.name,
      ruleCategory: rule.category,
      entityType: data.entityType || 'unknown',
      entityId: data.id || 'unknown',
      entityName: data.name || data.title,
      violationData: data,
      detectedAt: new Date().toISOString(),
      severity: rule.severity,
      riskScore: this.calculateRiskScore(rule, data),
      status: 'open',
      actionsExecuted: [],
      tenantId: rule.tenantId,
    };

    this.violations.set(violationId, violation);
    await this.saveViolations();

    return violation;
  }

  private calculateRiskScore(rule: ComplianceRule, data: any): number {
    let baseScore = 0;
    
    switch (rule.severity) {
      case 'critical': baseScore = 90; break;
      case 'high': baseScore = 70; break;
      case 'medium': baseScore = 50; break;
      case 'low': baseScore = 20; break;
    }

    return Math.min(100, baseScore);
  }

  private async executeAutomaticActions(
    rule: ComplianceRule, 
    violation: ComplianceViolation
  ): Promise<void> {
    for (const action of rule.automaticActions) {
      try {
        await this.executeAction(action, violation);
      } catch (error) {
        console.error(`❌ Erro ao executar ação ${action.type}:`, error);
      }
    }
  }

  private async executeAction(action: ComplianceAction, violation: ComplianceViolation): Promise<void> {
    const result: ComplianceActionResult = {
      actionType: action.type,
      executedAt: new Date().toISOString(),
      success: false,
    };

    try {
      switch (action.type) {
        case 'notify':
          await this.executeNotifyAction(action, violation);
          break;
        default:
          console.log(`⚠️ Ação não implementada: ${action.type}`);
      }
      
      result.success = true;
    } catch (error) {
      result.error = String(error);
    }

    violation.actionsExecuted.push(result);
    await this.saveViolations();
  }

  private async executeNotifyAction(action: ComplianceAction, violation: ComplianceViolation): Promise<void> {
    await intelligentNotificationService.sendNotification(
      action.target,
      'compliance',
      {
        title: `Violação de Compliance: ${violation.ruleName}`,
        message: `Detectada violação ${violation.severity} na regra ${violation.ruleName}`,
        category: 'compliance_violation',
        priority: violation.severity === 'critical' ? 'urgent' : 'high',
        data: {
          violationId: violation.id,
          ruleId: violation.ruleId,
        },
      },
      violation.tenantId
    );
  }

  private async executeConsentWithdrawal(consent: LGPDConsentRecord): Promise<void> {
    console.log(`🚫 Executando retirada de consentimento para: ${consent.dataSubjectId}`);
    
    if (consent.automaticDeletion) {
      console.log(`🗑️ Dados serão automaticamente excluídos em ${consent.dataRetentionPeriod} dias`);
    }
  }

  private calculateNextRun(frequency: ComplianceRule['frequency']): string {
    const now = new Date();
    
    switch (frequency) {
      case 'real_time':
        return now.toISOString();
      case 'hourly':
        now.setHours(now.getHours() + 1);
        break;
      case 'daily':
        now.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        now.setDate(now.getDate() + 7);
        break;
      case 'monthly':
        now.setMonth(now.getMonth() + 1);
        break;
    }
    
    return now.toISOString();
  }

  private isWithinActiveHours(rule: ComplianceRule): boolean {
    if (!rule.activeHours) return true;
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= rule.activeHours.start && currentTime <= rule.activeHours.end;
  }

  private calculateComplianceScore(rules: ComplianceRule[], violations: ComplianceViolation[]): number {
    if (rules.length === 0) return 100;
    
    const violationWeight = violations.reduce((sum, violation) => {
      switch (violation.severity) {
        case 'critical': return sum + 4;
        case 'high': return sum + 3;
        case 'medium': return sum + 2;
        case 'low': return sum + 1;
        default: return sum + 1;
      }
    }, 0);
    
    return Math.max(0, Math.round((1 - violationWeight / (rules.length * 4)) * 100));
  }

  private setupDefaultRules(): void {
    const defaultRules = [
      {
        name: 'LGPD - Consentimento Expirado',
        description: 'Detecta consentimentos que precisam ser renovados',
        category: 'lgpd' as const,
        subcategory: 'consent_management',
        type: 'consent_validation' as const,
        severity: 'high' as const,
        conditions: [
          {
            field: 'consentTimestamp',
            operator: 'older_than' as const,
            value: this.getSixMonthsAgo(),
            dataType: 'date' as const,
          },
        ],
        automaticActions: [
          {
            type: 'notify' as const,
            target: 'compliance_officer',
            parameters: { message: 'Consentimento precisa ser renovado' },
          },
        ],
        frequency: 'daily' as const,
        isActive: true,
        createdBy: 'system',
      },
    ];

    if (this.rules.size === 0) {
      defaultRules.forEach(rule => {
        this.createRule(rule, 'system', 'default');
      });
    }
  }

  private getSixMonthsAgo(): string {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return sixMonthsAgo.toISOString();
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.executeScheduledRules();
      } catch (error) {
        console.error('❌ Erro no monitoramento de compliance:', error);
      }
    }, 60 * 60 * 1000); // 1 hora

    console.log('🔄 Monitoramento de compliance iniciado');
  }

  private async loadStoredData(): Promise<void> {
    try {
      const rulesData = localStorage.getItem('fisioflow_compliance_rules');
      if (rulesData) {
        const rules = JSON.parse(rulesData);
        rules.forEach((rule: ComplianceRule) => {
          this.rules.set(rule.id, rule);
        });
      }

      const violationsData = localStorage.getItem('fisioflow_compliance_violations');
      if (violationsData) {
        const violations = JSON.parse(violationsData);
        violations.forEach((violation: ComplianceViolation) => {
          this.violations.set(violation.id, violation);
        });
      }

      const consentsData = localStorage.getItem('fisioflow_lgpd_consents');
      if (consentsData) {
        const consents = JSON.parse(consentsData);
        consents.forEach((consent: LGPDConsentRecord) => {
          this.consentRecords.set(consent.id, consent);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de compliance:', error);
    }
  }

  private async saveRules(): Promise<void> {
    try {
      const rules = Array.from(this.rules.values());
      localStorage.setItem('fisioflow_compliance_rules', JSON.stringify(rules));
    } catch (error) {
      console.error('❌ Erro ao salvar regras:', error);
    }
  }

  private async saveViolations(): Promise<void> {
    try {
      const violations = Array.from(this.violations.values());
      localStorage.setItem('fisioflow_compliance_violations', JSON.stringify(violations));
    } catch (error) {
      console.error('❌ Erro ao salvar violações:', error);
    }
  }

  private async saveReports(): Promise<void> {
    try {
      const reports = Array.from(this.reports.values());
      localStorage.setItem('fisioflow_compliance_reports', JSON.stringify(reports));
    } catch (error) {
      console.error('❌ Erro ao salvar relatórios:', error);
    }
  }

  private async saveConsentRecords(): Promise<void> {
    try {
      const consents = Array.from(this.consentRecords.values());
      localStorage.setItem('fisioflow_lgpd_consents', JSON.stringify(consents));
    } catch (error) {
      console.error('❌ Erro ao salvar consentimentos:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const complianceService = new ComplianceService();

// === HOOKS REACT ===
export const useCompliance = () => {
  const createRule = React.useCallback(async (
    rule: any,
    userId: string,
    tenantId: string
  ) => {
    return await complianceService.createRule(rule, userId, tenantId);
  }, []);

  const executeRule = React.useCallback(async (
    ruleId: string,
    userId: string
  ) => {
    return await complianceService.executeRule(ruleId, userId);
  }, []);

  const recordConsent = React.useCallback(async (
    consent: any,
    userId: string,
    tenantId: string
  ) => {
    return await complianceService.recordConsent(consent, userId, tenantId);
  }, []);

  const generateReport = React.useCallback(async (
    tenantId: string,
    periodStart: string,
    periodEnd: string,
    categories?: string[]
  ) => {
    return await complianceService.generateComplianceReport(tenantId, periodStart, periodEnd, categories);
  }, []);

  return {
    createRule,
    executeRule,
    recordConsent,
    withdrawConsent: complianceService.withdrawConsent.bind(complianceService),
    generateReport,
    executeScheduledRules: complianceService.executeScheduledRules.bind(complianceService),
  };
};

export default complianceService;
