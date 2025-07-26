/**
 * Serviço de Compliance LGPD e CFM
 * Sistema completo de verificação e auditoria de conformidade
 */

import type {
  BaseDocument,
  DocumentType,
  ComplianceInfo,
  CFMCompliance,
  COFFITOCompliance,
  LGPDCompliance,
  ANVISACompliance,
  LGPDLegalBasis,
  AuditEntry,
  ConsentFormData,
  TreatmentData
} from '../types/legalDocuments';

interface ComplianceValidationResult {
  isCompliant: boolean;
  score: number; // 0-100
  violations: ComplianceViolation[];
  recommendations: ComplianceRecommendation[];
  auditTrail: AuditEntry[];
}

interface ComplianceViolation {
  regulation: 'CFM' | 'COFFITO' | 'LGPD' | 'ANVISA';
  severity: 'critical' | 'high' | 'medium' | 'low';
  code: string;
  description: string;
  requirement: string;
  impact: string;
  remediation: string;
}

interface ComplianceRecommendation {
  type: 'improvement' | 'optimization' | 'best_practice';
  description: string;
  benefit: string;
  implementation: string;
  priority: 'high' | 'medium' | 'low';
}

class ComplianceService {
  private auditTrail: Map<string, AuditEntry[]> = new Map();
  private complianceCache: Map<string, ComplianceValidationResult> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * ============== VALIDAÇÃO DE COMPLIANCE ==============
   */

  /**
   * Valida compliance completo de um documento
   */
  async validateDocumentCompliance(document: BaseDocument): Promise<ComplianceValidationResult> {
    const cacheKey = `${document.id}_${document.version}`;
    const cached = this.complianceCache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const violations: ComplianceViolation[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    
    // Validação CFM
    const cfmViolations = await this.validateCFMCompliance(document);
    violations.push(...cfmViolations);

    // Validação COFFITO
    const coffitoViolations = await this.validateCOFFITOCompliance(document);
    violations.push(...coffitoViolations);

    // Validação LGPD
    const lgpdViolations = await this.validateLGPDCompliance(document);
    violations.push(...lgpdViolations);

    // Validação ANVISA
    const anvisaViolations = await this.validateANVISACompliance(document);
    violations.push(...anvisaViolations);

    // Gera recomendações
    recommendations.push(...this.generateRecommendations(document, violations));

    // Calcula score de compliance
    const score = this.calculateComplianceScore(violations);

    const result: ComplianceValidationResult = {
      isCompliant: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      score,
      violations,
      recommendations,
      auditTrail: this.auditTrail.get(document.id) || []
    };

    // Cache do resultado
    this.complianceCache.set(cacheKey, result);
    
    // Log da auditoria
    this.logAuditEvent(document.id, 'COMPLIANCE_VALIDATION', 
      `Validation completed: Score ${score}, Violations: ${violations.length}`
    );

    await this.saveToStorage();
    return result;
  }

  /**
   * ============== VALIDAÇÕES ESPECÍFICAS ==============
   */

  /**
   * Validação CFM (Conselho Federal de Medicina)
   */
  private async validateCFMCompliance(document: BaseDocument): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // CFM Resolution 2.314/2022 - Telemedicina
    if (document.type === DocumentType.CONSENT_TELEMEDICINE) {
      if (!document.content.includes('telemedicina')) {
        violations.push({
          regulation: 'CFM',
          severity: 'high',
          code: 'CFM-2314-001',
          description: 'Termo de consentimento para telemedicina deve mencionar explicitamente os riscos e limitações',
          requirement: 'Resolução CFM 2.314/2022 Art. 4°',
          impact: 'Documento pode ser considerado inválido em auditoria',
          remediation: 'Adicionar seção específica sobre limitações da telemedicina'
        });
      }
    }

    // CFM Resolution 2.217/2018 - Código de Ética Médica
    if (document.content.includes('experimental') && !document.content.includes('protocolo')) {
      violations.push({
        regulation: 'CFM',
        severity: 'critical',
        code: 'CFM-2217-015',
        description: 'Procedimentos experimentais devem seguir protocolo aprovado por comitê de ética',
        requirement: 'Código de Ética Médica Art. 15',
        impact: 'Violação ética grave',
        remediation: 'Incluir referência ao protocolo de pesquisa aprovado'
      });
    }

    // Validação de assinatura profissional
    if (!document.signatures.some(sig => sig.signerRole === 'fisioterapeuta')) {
      violations.push({
        regulation: 'CFM',
        severity: 'medium',
        code: 'CFM-GEN-001',
        description: 'Document requires professional signature',
        requirement: 'Responsabilidade técnica profissional',
        impact: 'Documento sem validade legal',
        remediation: 'Adicionar assinatura do profissional responsável'
      });
    }

    return violations;
  }

  /**
   * Validação COFFITO (Conselho Federal de Fisioterapia)
   */
  private async validateCOFFITOCompliance(document: BaseDocument): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // COFFITO Resolution 402/2011 - Documentação Fisioterapêutica
    if (document.type === DocumentType.TREATMENT_PLAN) {
      const requiredSections = ['diagnóstico', 'objetivos', 'conduta', 'prognóstico'];
      const missingSections = requiredSections.filter(section => 
        !document.content.toLowerCase().includes(section)
      );

      if (missingSections.length > 0) {
        violations.push({
          regulation: 'COFFITO',
          severity: 'high',
          code: 'COFFITO-402-001',
          description: `Plano de tratamento deve conter: ${missingSections.join(', ')}`,
          requirement: 'Resolução COFFITO 402/2011',
          impact: 'Documentação incompleta conforme normas profissionais',
          remediation: `Adicionar seções obrigatórias: ${missingSections.join(', ')}`
        });
      }
    }

    // COFFITO Resolution 424/2013 - Código de Ética
    if (document.type === DocumentType.EXERCISE_PRESCRIPTION) {
      if (!document.content.includes('CREFITO') && !document.content.includes('registro profissional')) {
        violations.push({
          regulation: 'COFFITO',
          severity: 'medium',
          code: 'COFFITO-424-001',
          description: 'Prescrição deve conter identificação profissional (CREFITO)',
          requirement: 'Código de Ética e Deontologia da Fisioterapia',
          impact: 'Prescrição sem validade profissional',
          remediation: 'Incluir número do CREFITO do profissional'
        });
      }
    }

    // Validação de competência técnica
    if (document.type === DocumentType.PHYSICAL_CAPACITY_CERTIFICATE) {
      if (!document.content.includes('avaliação funcional')) {
        violations.push({
          regulation: 'COFFITO',
          severity: 'medium',
          code: 'COFFITO-GEN-001',
          description: 'Certificado de capacidade física deve basear-se em avaliação funcional',
          requirement: 'Competência técnica fisioterapêutica',
          impact: 'Certificado pode não ter validade técnica',
          remediation: 'Incluir referência à avaliação funcional realizada'
        });
      }
    }

    return violations;
  }

  /**
   * Validação LGPD (Lei Geral de Proteção de Dados)
   */
  private async validateLGPDCompliance(document: BaseDocument): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // Base legal obrigatória
    if (!document.compliance.lgpd.legalBasis) {
      violations.push({
        regulation: 'LGPD',
        severity: 'critical',
        code: 'LGPD-006-001',
        description: 'Todo tratamento de dados deve ter base legal definida',
        requirement: 'LGPD Art. 6°',
        impact: 'Tratamento ilegal de dados pessoais',
        remediation: 'Definir base legal apropriada (consentimento, execução de contrato, etc.)'
      });
    }

    // Dados sensíveis de saúde
    if (this.containsHealthData(document.content)) {
      if (document.compliance.lgpd.legalBasis !== LGPDLegalBasis.HEALTH_PROTECTION &&
          document.compliance.lgpd.legalBasis !== LGPDLegalBasis.CONSENT) {
        violations.push({
          regulation: 'LGPD',
          severity: 'critical',
          code: 'LGPD-011-001',
          description: 'Dados sensíveis de saúde requerem base legal específica',
          requirement: 'LGPD Art. 11',
          impact: 'Tratamento ilegal de dados sensíveis',
          remediation: 'Usar base legal "proteção da vida" ou "consentimento específico"'
        });
      }

      if (!document.compliance.lgpd.privacyNotice) {
        violations.push({
          regulation: 'LGPD',
          severity: 'high',
          code: 'LGPD-009-001',
          description: 'Titular deve ser informado sobre tratamento de dados de saúde',
          requirement: 'LGPD Art. 9°',
          impact: 'Falta de transparência no tratamento',
          remediation: 'Incluir aviso de privacidade detalhado'
        });
      }
    }

    // Consentimento válido
    if (document.compliance.lgpd.legalBasis === LGPDLegalBasis.CONSENT) {
      if (!this.validateConsent(document)) {
        violations.push({
          regulation: 'LGPD',
          severity: 'high',
          code: 'LGPD-008-001',
          description: 'Consentimento deve ser livre, informado e inequívoco',
          requirement: 'LGPD Art. 8°',
          impact: 'Consentimento inválido',
          remediation: 'Revisar formulário de consentimento para ser mais específico e claro'
        });
      }
    }

    // Direitos do titular
    const requiredRights = ['acesso', 'correção', 'eliminação', 'portabilidade', 'revogação'];
    const mentionedRights = requiredRights.filter(right => 
      document.content.toLowerCase().includes(right)
    );

    if (mentionedRights.length < 3) {
      violations.push({
        regulation: 'LGPD',
        severity: 'medium',
        code: 'LGPD-018-001',
        description: 'Documento deve informar sobre direitos do titular',
        requirement: 'LGPD Art. 18',
        impact: 'Titular desconhece seus direitos',
        remediation: 'Incluir seção com direitos do titular de dados'
      });
    }

    // Período de retenção
    if (!document.compliance.lgpd.retentionPeriod || document.compliance.lgpd.retentionPeriod <= 0) {
      violations.push({
        regulation: 'LGPD',
        severity: 'medium',
        code: 'LGPD-016-001',
        description: 'Período de retenção deve ser definido e justificado',
        requirement: 'LGPD Art. 16',
        impact: 'Retenção indefinida de dados',
        remediation: 'Definir período de retenção baseado na finalidade'
      });
    }

    return violations;
  }

  /**
   * Validação ANVISA
   */
  private async validateANVISACompliance(document: BaseDocument): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = [];

    // RDC 302/2005 - Documentação e registros
    if (document.type === DocumentType.TREATMENT_PLAN || 
        document.type === DocumentType.MEDICAL_REPORT) {
      
      if (!document.metadata.approvedBy) {
        violations.push({
          regulation: 'ANVISA',
          severity: 'medium',
          code: 'ANVISA-302-001',
          description: 'Documentos clínicos devem ter aprovação de responsável técnico',
          requirement: 'RDC 302/2005',
          impact: 'Documentação sem supervisão adequada',
          remediation: 'Adicionar aprovação do responsável técnico'
        });
      }
    }

    // Rastreabilidade de equipamentos
    if (document.content.includes('equipamento') || document.content.includes('dispositivo')) {
      if (!document.content.includes('registro ANVISA') && !document.content.includes('certificação')) {
        violations.push({
          regulation: 'ANVISA',
          severity: 'low',
          code: 'ANVISA-GEN-001',
          description: 'Equipamentos médicos devem ter certificação ANVISA mencionada',
          requirement: 'Regulamentação sanitária',
          impact: 'Uso de equipamentos não rastreáveis',
          remediation: 'Incluir informações de registro/certificação dos equipamentos'
        });
      }
    }

    return violations;
  }

  /**
   * ============== MÉTODOS AUXILIARES ==============
   */

  private containsHealthData(content: string): boolean {
    const healthTerms = [
      'diagnóstico', 'sintoma', 'tratamento', 'medicamento', 'exame',
      'patologia', 'doença', 'lesão', 'fisioterapia', 'reabilitação',
      'dor', 'mobilidade', 'funcional', 'capacidade física'
    ];

    return healthTerms.some(term => 
      content.toLowerCase().includes(term.toLowerCase())
    );
  }

  private validateConsent(document: BaseDocument): boolean {
    const content = document.content.toLowerCase();
    
    // Critérios para consentimento válido
    const hasSpecificPurpose = content.includes('finalidade') || content.includes('objetivo');
    const hasWithdrawalInfo = content.includes('revogar') || content.includes('retirar');
    const hasDataCategories = content.includes('dados') && content.includes('pessoais');
    
    return hasSpecificPurpose && hasWithdrawalInfo && hasDataCategories;
  }

  private generateRecommendations(
    document: BaseDocument, 
    violations: ComplianceViolation[]
  ): ComplianceRecommendation[] {
    const recommendations: ComplianceRecommendation[] = [];

    // Recomendação para melhoria de compliance
    if (violations.length > 3) {
      recommendations.push({
        type: 'improvement',
        description: 'Revisar template do documento para compliance automático',
        benefit: 'Reduzir violações futuras e melhorar padronização',
        implementation: 'Atualizar template com seções obrigatórias de compliance',
        priority: 'high'
      });
    }

    // Recomendação para assinatura digital
    if (document.signatures.length === 0) {
      recommendations.push({
        type: 'best_practice',
        description: 'Implementar assinatura digital para todos os documentos',
        benefit: 'Maior segurança jurídica e rastreabilidade',
        implementation: 'Configurar fluxo de assinatura obrigatória',
        priority: 'medium'
      });
    }

    // Recomendação para auditoria
    if (!document.compliance.auditTrail.length) {
      recommendations.push({
        type: 'optimization',
        description: 'Ativar logging detalhado de auditoria',
        benefit: 'Melhor rastreabilidade para auditorias regulatórias',
        implementation: 'Configurar logs automáticos de todas as ações',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  private calculateComplianceScore(violations: ComplianceViolation[]): number {
    if (violations.length === 0) return 100;

    const weights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5
    };

    const totalPenalty = violations.reduce((sum, violation) => 
      sum + weights[violation.severity], 0
    );

    return Math.max(0, 100 - totalPenalty);
  }

  private isCacheValid(result: ComplianceValidationResult): boolean {
    const cacheAge = Date.now() - new Date(result.auditTrail[0]?.timestamp || 0).getTime();
    return cacheAge < 24 * 60 * 60 * 1000; // 24 horas
  }

  /**
   * ============== COMPLIANCE AUTOMÁTICO ==============
   */

  /**
   * Aplica correções automáticas de compliance
   */
  async autoFixCompliance(document: BaseDocument): Promise<BaseDocument> {
    const fixedDocument = { ...document };

    // Auto-fix LGPD
    if (!fixedDocument.compliance.lgpd.legalBasis) {
      fixedDocument.compliance.lgpd.legalBasis = this.determineLegalBasis(fixedDocument);
    }

    if (!fixedDocument.compliance.lgpd.retentionPeriod) {
      fixedDocument.compliance.lgpd.retentionPeriod = this.determineRetentionPeriod(fixedDocument.type);
    }

    // Auto-fix CFM
    if (!fixedDocument.compliance.cfm.resolutionNumber) {
      fixedDocument.compliance.cfm.resolutionNumber = this.determineCFMResolution(fixedDocument.type);
    }

    // Auto-fix COFFITO
    if (!fixedDocument.compliance.coffito.resolutionNumber) {
      fixedDocument.compliance.coffito.resolutionNumber = this.determineCOFFITOResolution(fixedDocument.type);
    }

    // Log da correção
    this.logAuditEvent(fixedDocument.id, 'AUTO_FIX_APPLIED', 
      'Applied automatic compliance fixes'
    );

    return fixedDocument;
  }

  private determineLegalBasis(document: BaseDocument): LGPDLegalBasis {
    if (this.containsHealthData(document.content)) {
      return LGPDLegalBasis.HEALTH_PROTECTION;
    }

    if (document.type.includes('contract') || document.type.includes('payment')) {
      return LGPDLegalBasis.CONTRACT;
    }

    return LGPDLegalBasis.CONSENT;
  }

  private determineRetentionPeriod(documentType: DocumentType): number {
    const retentionMap = {
      [DocumentType.CONSENT_TREATMENT]: 20, // CFM exige 20 anos
      [DocumentType.MEDICAL_REPORT]: 20,
      [DocumentType.TREATMENT_PLAN]: 20,
      [DocumentType.EXERCISE_PRESCRIPTION]: 5,
      [DocumentType.PAYMENT_RECEIPT]: 5,
      [DocumentType.SERVICE_INVOICE]: 5,
      // Outros tipos - padrão 5 anos
    };

    return retentionMap[documentType] || 5;
  }

  private determineCFMResolution(documentType: DocumentType): string {
    const resolutionMap = {
      [DocumentType.CONSENT_TELEMEDICINE]: 'CFM-2314/2022',
      [DocumentType.MEDICAL_REPORT]: 'CFM-1931/2009',
      [DocumentType.CONSENT_TREATMENT]: 'CFM-2217/2018',
    };

    return resolutionMap[documentType] || 'CFM-2217/2018'; // Código de Ética
  }

  private determineCOFFITOResolution(documentType: DocumentType): string {
    const resolutionMap = {
      [DocumentType.TREATMENT_PLAN]: 'COFFITO-402/2011',
      [DocumentType.EXERCISE_PRESCRIPTION]: 'COFFITO-481/2019',
      [DocumentType.PHYSICAL_CAPACITY_CERTIFICATE]: 'COFFITO-424/2013',
    };

    return resolutionMap[documentType] || 'COFFITO-424/2013'; // Código de Ética
  }

  /**
   * ============== AUDITORIA E LOGS ==============
   */

  private logAuditEvent(documentId: string, action: string, details: string): void {
    const auditEntry: AuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: 'system', // Em produção, usar ID do usuário atual
      action,
      details,
      ipAddress: '127.0.0.1', // Em produção, capturar IP real
      result: 'success'
    };

    const documentAudit = this.auditTrail.get(documentId) || [];
    documentAudit.push(auditEntry);
    this.auditTrail.set(documentId, documentAudit);
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_compliance');
      if (saved) {
        const data = JSON.parse(saved);
        this.auditTrail = new Map(data.auditTrail || []);
        this.complianceCache = new Map(data.complianceCache || []);
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de compliance:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        auditTrail: Array.from(this.auditTrail.entries()),
        complianceCache: Array.from(this.complianceCache.entries())
      };
      localStorage.setItem('fisioflow_compliance', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados de compliance:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  /**
   * Gera relatório de compliance
   */
  generateComplianceReport(documents: BaseDocument[]): {
    overallScore: number;
    totalDocuments: number;
    compliantDocuments: number;
    criticalViolations: number;
    recommendationsCount: number;
    complianceByRegulation: Record<string, number>;
  } {
    let totalScore = 0;
    let compliantCount = 0;
    let criticalViolations = 0;
    let recommendationsCount = 0;

    const regulationScores = { CFM: 0, COFFITO: 0, LGPD: 0, ANVISA: 0 };
    const regulationCounts = { CFM: 0, COFFITO: 0, LGPD: 0, ANVISA: 0 };

    documents.forEach(doc => {
      const cacheKey = `${doc.id}_${doc.version}`;
      const result = this.complianceCache.get(cacheKey);
      
      if (result) {
        totalScore += result.score;
        if (result.isCompliant) compliantCount++;
        
        criticalViolations += result.violations.filter(v => v.severity === 'critical').length;
        recommendationsCount += result.recommendations.length;

        // Score por regulamentação
        ['CFM', 'COFFITO', 'LGPD', 'ANVISA'].forEach(reg => {
          const regViolations = result.violations.filter(v => v.regulation === reg);
          if (regViolations.length > 0) {
            const regScore = 100 - regViolations.reduce((sum, v) => {
              const weights = { critical: 25, high: 15, medium: 10, low: 5 };
              return sum + weights[v.severity];
            }, 0);
            regulationScores[reg] += Math.max(0, regScore);
            regulationCounts[reg]++;
          } else {
            regulationScores[reg] += 100;
            regulationCounts[reg]++;
          }
        });
      }
    });

    const complianceByRegulation = {};
    Object.keys(regulationScores).forEach(reg => {
      complianceByRegulation[reg] = regulationCounts[reg] > 0 
        ? regulationScores[reg] / regulationCounts[reg] 
        : 100;
    });

    return {
      overallScore: documents.length > 0 ? totalScore / documents.length : 100,
      totalDocuments: documents.length,
      compliantDocuments: compliantCount,
      criticalViolations,
      recommendationsCount,
      complianceByRegulation
    };
  }

  /**
   * Limpa cache de compliance
   */
  clearComplianceCache(): void {
    this.complianceCache.clear();
    this.saveToStorage();
  }

  /**
   * Obtém auditoria de um documento
   */
  getDocumentAuditTrail(documentId: string): AuditEntry[] {
    return this.auditTrail.get(documentId) || [];
  }
}

// Instância singleton
export const complianceService = new ComplianceService();

// Funções de conveniência
export async function validateCompliance(document: BaseDocument): Promise<ComplianceValidationResult> {
  return await complianceService.validateDocumentCompliance(document);
}

export async function applyAutoFix(document: BaseDocument): Promise<BaseDocument> {
  return await complianceService.autoFixCompliance(document);
}

export function getComplianceReport(documents: BaseDocument[]) {
  return complianceService.generateComplianceReport(documents);
}

export default complianceService;