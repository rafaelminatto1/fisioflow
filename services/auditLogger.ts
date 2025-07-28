/**
 * Sistema de Auditoria LGPD
 * Logs conformes com LGPD para dados médicos sensíveis
 */

import { encryption } from './encryption';
import { secureStorage } from './secureStorage';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  tenantId: string;
  userId: string;
  userRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  entityName?: string; // Nome ofuscado para identificação
  dataAccessed: string[]; // Campos acessados
  ipAddress?: string;
  userAgent?: string;
  sessionId: string;
  consentId?: string; // ID do consentimento LGPD
  legalBasis: LegalBasis;
  result: 'SUCCESS' | 'FAILED' | 'DENIED';
  errorMessage?: string;
  dataSnapshot?: any; // Snapshot dos dados antes/depois (criptografado)
  retentionDate: string; // Data de expiração do log
}

export enum AuditAction {
  // Operações CRUD
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  
  // Operações específicas de saúde
  VIEW_PATIENT = 'VIEW_PATIENT',
  VIEW_ASSESSMENT = 'VIEW_ASSESSMENT',
  VIEW_MEDICAL_HISTORY = 'VIEW_MEDICAL_HISTORY',
  EXPORT_PATIENT_DATA = 'EXPORT_PATIENT_DATA',
  PRINT_REPORT = 'PRINT_REPORT',
  
  // Operações de sistema
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_REVOKED = 'CONSENT_REVOKED',
  DATA_PORTABILITY = 'DATA_PORTABILITY',
  DATA_ERASURE = 'DATA_ERASURE',
  
  // Operações administrativas
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  ENCRYPTION_KEY_ROTATED = 'ENCRYPTION_KEY_ROTATED',
  AUDIT_LOG_ACCESSED = 'AUDIT_LOG_ACCESSED'
}

export enum LegalBasis {
  CONSENT = 'CONSENT', // Art. 7º, I - Consentimento
  CONTRACT = 'CONTRACT', // Art. 7º, V - Execução de contrato
  LEGAL_OBLIGATION = 'LEGAL_OBLIGATION', // Art. 7º, II - Obrigação legal
  VITAL_INTERESTS = 'VITAL_INTERESTS', // Art. 7º, IV - Proteção da vida
  PUBLIC_INTEREST = 'PUBLIC_INTEREST', // Art. 7º, III - Interesse público
  LEGITIMATE_INTEREST = 'LEGITIMATE_INTEREST', // Art. 7º, IX - Interesse legítimo
  HEALTH_PROTECTION = 'HEALTH_PROTECTION' // Art. 11º, II - Proteção da saúde
}

export interface AuditQueryFilter {
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
  legalBasis?: LegalBasis;
  result?: 'SUCCESS' | 'FAILED' | 'DENIED';
}

export interface AuditSummary {
  totalEntries: number;
  uniqueUsers: number;
  commonActions: Array<{ action: string; count: number }>;
  dataTypesAccessed: Array<{ type: string; count: number }>;
  complianceStatus: {
    consentCoverage: number; // % de ações com consentimento válido
    retentionCompliance: number; // % de logs dentro do prazo
    accessFrequency: number; // Acessos por usuário
  };
}

class AuditLogger {
  private readonly AUDIT_RETENTION_DAYS = 2555; // 7 anos (LGPD Art. 16)
  private readonly MAX_LOGS_PER_QUERY = 1000;
  
  /**
   * Registrar ação no log de auditoria
   */
  async logAction(
    tenantId: string,
    userId: string,
    userRole: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
    options: {
      entityName?: string;
      dataAccessed?: string[];
      consentId?: string;
      legalBasis?: LegalBasis;
      dataSnapshot?: any;
      sessionId?: string;
      result?: 'SUCCESS' | 'FAILED' | 'DENIED';
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    try {
      const logId = `audit_${tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const retentionDate = new Date(now.getTime() + (this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000));
      
      // Obter informações do cliente (simulado)
      const clientInfo = this.getClientInfo();
      
      const auditEntry: AuditLogEntry = {
        id: logId,
        timestamp: now.toISOString(),
        tenantId,
        userId,
        userRole,
        action,
        entityType,
        entityId,
        entityName: options.entityName ? this.obfuscateName(options.entityName) : undefined,
        dataAccessed: options.dataAccessed || [],
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        sessionId: options.sessionId || this.getCurrentSessionId(),
        consentId: options.consentId,
        legalBasis: options.legalBasis || this.determineLegalBasis(action, entityType),
        result: options.result || 'SUCCESS',
        errorMessage: options.errorMessage,
        dataSnapshot: options.dataSnapshot ? await this.encryptDataSnapshot(options.dataSnapshot, tenantId) : undefined,
        retentionDate: retentionDate.toISOString()
      };
      
      // Salvar log no storage seguro
      await secureStorage.save(
        'auditLogs',
        logId,
        auditEntry,
        tenantId,
        true // Sempre criptografar logs de auditoria
      );
      
      // Log para console (desenvolvimento)
      console.log(`📋 Audit: ${userId} ${action} ${entityType}:${entityId} (${auditEntry.result})`);
      
      // Verificar se precisa limpar logs antigos
      await this.cleanupExpiredLogs(tenantId);
      
    } catch (error) {
      console.error('❌ Erro ao registrar log de auditoria:', error);
      // Não relançar erro para não interromper operação principal
    }
  }
  
  /**
   * Buscar logs de auditoria com filtros
   */
  async queryLogs(
    tenantId: string,
    filters: AuditQueryFilter = {},
    requestingUserId: string,
    requestingUserRole: string
  ): Promise<AuditLogEntry[]> {
    try {
      // Log do acesso aos logs de auditoria
      await this.logAction(
        tenantId,
        requestingUserId,
        requestingUserRole,
        AuditAction.AUDIT_LOG_ACCESSED,
        'auditLogs',
        'query',
        {
          legalBasis: LegalBasis.LEGAL_OBLIGATION,
          dataAccessed: Object.keys(filters)
        }
      );
      
      // Recuperar todos os logs do tenant
      const allLogs = await secureStorage.getAll('auditLogs', tenantId);
      
      // Aplicar filtros
      let filteredLogs = allLogs.filter((log: AuditLogEntry) => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.entityType && log.entityType !== filters.entityType) return false;
        if (filters.entityId && log.entityId !== filters.entityId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.legalBasis && log.legalBasis !== filters.legalBasis) return false;
        if (filters.result && log.result !== filters.result) return false;
        
        if (filters.dateFrom) {
          const logDate = new Date(log.timestamp);
          const fromDate = new Date(filters.dateFrom);
          if (logDate < fromDate) return false;
        }
        
        if (filters.dateTo) {
          const logDate = new Date(log.timestamp);
          const toDate = new Date(filters.dateTo);
          if (logDate > toDate) return false;
        }
        
        return true;
      });
      
      // Ordenar por timestamp (mais recente primeiro)
      filteredLogs = filteredLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      // Limitar resultados
      return filteredLogs.slice(0, this.MAX_LOGS_PER_QUERY);
      
    } catch (error) {
      console.error('❌ Erro ao consultar logs de auditoria:', error);
      return [];
    }
  }
  
  /**
   * Gerar relatório de conformidade LGPD
   */
  async generateComplianceReport(
    tenantId: string,
    requestingUserId: string,
    dateFrom: string,
    dateTo: string
  ): Promise<AuditSummary> {
    try {
      const logs = await this.queryLogs(
        tenantId,
        { dateFrom, dateTo },
        requestingUserId,
        'ADMIN'
      );
      
      const totalEntries = logs.length;
      const uniqueUsers = new Set(logs.map(log => log.userId)).size;
      
      // Ações mais comuns
      const actionCounts = logs.reduce((acc, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const commonActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Tipos de dados acessados
      const typeCounts = logs.reduce((acc, log) => {
        acc[log.entityType] = (acc[log.entityType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dataTypesAccessed = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      
      // Análise de conformidade
      const logsWithConsent = logs.filter(log => log.consentId || 
        log.legalBasis !== LegalBasis.CONSENT).length;
      const consentCoverage = totalEntries > 0 ? (logsWithConsent / totalEntries) * 100 : 100;
      
      const now = new Date();
      const logsWithinRetention = logs.filter(log => 
        new Date(log.retentionDate) > now).length;
      const retentionCompliance = totalEntries > 0 ? (logsWithinRetention / totalEntries) * 100 : 100;
      
      const accessFrequency = uniqueUsers > 0 ? totalEntries / uniqueUsers : 0;
      
      const summary: AuditSummary = {
        totalEntries,
        uniqueUsers,
        commonActions,
        dataTypesAccessed,
        complianceStatus: {
          consentCoverage: Math.round(consentCoverage),
          retentionCompliance: Math.round(retentionCompliance),
          accessFrequency: Math.round(accessFrequency * 100) / 100
        }
      };
      
      // Log da geração do relatório
      await this.logAction(
        tenantId,
        requestingUserId,
        'ADMIN',
        AuditAction.READ,
        'complianceReport',
        `${dateFrom}_${dateTo}`,
        {
          legalBasis: LegalBasis.LEGAL_OBLIGATION,
          dataAccessed: ['auditLogs', 'complianceMetrics']
        }
      );
      
      return summary;
      
    } catch (error) {
      console.error('❌ Erro ao gerar relatório de conformidade:', error);
      throw error;
    }
  }
  
  /**
   * Exportar logs para auditoria externa
   */
  async exportAuditLogs(
    tenantId: string,
    filters: AuditQueryFilter,
    requestingUserId: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    try {
      const logs = await this.queryLogs(tenantId, filters, requestingUserId, 'ADMIN');
      
      // Log da exportação
      await this.logAction(
        tenantId,
        requestingUserId,
        'ADMIN',
        AuditAction.EXPORT_PATIENT_DATA,
        'auditLogs',
        'export',
        {
          legalBasis: LegalBasis.LEGAL_OBLIGATION,
          dataAccessed: ['auditLogs']
        }
      );
      
      if (format === 'csv') {
        return this.convertLogsToCSV(logs);
      }
      
      return JSON.stringify(logs, null, 2);
      
    } catch (error) {
      console.error('❌ Erro ao exportar logs de auditoria:', error);
      throw error;
    }
  }
  
  /**
   * Limpar logs expirados
   */
  private async cleanupExpiredLogs(tenantId: string): Promise<void> {
    try {
      const now = new Date();
      const allLogs = await secureStorage.getAll('auditLogs', tenantId);
      
      let deletedCount = 0;
      
      for (const log of allLogs) {
        const retentionDate = new Date(log.retentionDate);
        if (retentionDate <= now) {
          await secureStorage.delete('auditLogs', log.id, tenantId);
          deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 Limpeza de auditoria: ${deletedCount} logs expirados removidos`);
      }
      
    } catch (error) {
      console.error('❌ Erro na limpeza de logs expirados:', error);
    }
  }
  
  /**
   * Determinar base legal automaticamente
   */
  private determineLegalBasis(action: AuditAction, entityType: string): LegalBasis {
    // Dados de saúde geralmente usam proteção da saúde
    if (entityType === 'patients' || entityType === 'assessments' || entityType === 'medicalHistory') {
      return LegalBasis.HEALTH_PROTECTION;
    }
    
    // Operações de sistema usam obrigação legal
    if (action === AuditAction.LOGIN || action === AuditAction.LOGOUT) {
      return LegalBasis.LEGAL_OBLIGATION;
    }
    
    // Operações de backup/segurança usam interesse legítimo
    if (action === AuditAction.BACKUP_CREATED || action === AuditAction.ENCRYPTION_KEY_ROTATED) {
      return LegalBasis.LEGITIMATE_INTEREST;
    }
    
    // Padrão para outras operações
    return LegalBasis.CONSENT;
  }
  
  /**
   * Obfuscar nome para proteção de privacidade
   */
  private obfuscateName(name: string): string {
    if (name.length <= 3) return name;
    return name.substring(0, 2) + '*'.repeat(name.length - 2);
  }
  
  /**
   * Criptografar snapshot de dados
   */
  private async encryptDataSnapshot(data: any, tenantId: string): Promise<string> {
    try {
      const key = await encryption.generateKey();
      const encrypted = await encryption.encryptSensitiveData(data, key);
      return JSON.stringify(encrypted);
    } catch (error) {
      console.warn('Erro ao criptografar snapshot:', error);
      return 'encrypted_data_unavailable';
    }
  }
  
  /**
   * Obter informações do cliente (simulado)
   */
  private getClientInfo(): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: '127.0.0.1', // TODO: Implementar detecção real de IP
      userAgent: navigator.userAgent
    };
  }
  
  /**
   * Obter ID da sessão atual
   */
  private getCurrentSessionId(): string {
    // TODO: Integrar com sistema de sessão real
    return sessionStorage.getItem('sessionId') || 'unknown_session';
  }
  
  /**
   * Converter logs para CSV
   */
  private convertLogsToCSV(logs: AuditLogEntry[]): string {
    if (logs.length === 0) return '';
    
    const headers = [
      'ID', 'Timestamp', 'UserId', 'UserRole', 'Action', 'EntityType', 
      'EntityId', 'LegalBasis', 'Result', 'IPAddress'
    ];
    
    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.userId,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId,
      log.legalBasis,
      log.result,
      log.ipAddress || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Instância singleton
export const auditLogger = new AuditLogger();

// Funções de conveniência para ações comuns
export const logPatientAccess = (
  tenantId: string,
  userId: string,
  userRole: string,
  patientId: string,
  patientName: string,
  consentId?: string
) => auditLogger.logAction(
  tenantId,
  userId,
  userRole,
  AuditAction.VIEW_PATIENT,
  'patients',
  patientId,
  {
    entityName: patientName,
    legalBasis: LegalBasis.HEALTH_PROTECTION,
    consentId,
    dataAccessed: ['name', 'medicalHistory', 'assessments']
  }
);

export const logDataExport = (
  tenantId: string,
  userId: string,
  userRole: string,
  exportType: string,
  entityIds: string[]
) => auditLogger.logAction(
  tenantId,
  userId,
  userRole,
  AuditAction.EXPORT_PATIENT_DATA,
  exportType,
  entityIds.join(','),
  {
    legalBasis: LegalBasis.DATA_PORTABILITY,
    dataAccessed: ['patientData', 'assessments', 'reports']
  }
);

export default auditLogger;