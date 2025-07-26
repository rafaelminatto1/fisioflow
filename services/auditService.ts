/**
 * Serviço de Auditoria e Trilha Completa
 * Sistema empresarial de logging e monitoramento para compliance legal
 */

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  category: AuditCategory;
  severity: AuditSeverity;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  sessionId: string;
  tenantId: string;
  resourceType: string;
  resourceId: string;
  action: string;
  description: string;
  metadata: AuditMetadata;
  context: AuditContext;
  result: AuditResult;
  changes?: DataChange[];
  riskScore: number;
  tags: string[];
  correlationId?: string;
  parentEventId?: string;
}

export interface AuditMetadata {
  source: string;
  version: string;
  traceId: string;
  fingerprint: string;
  checksum: string;
  retention: {
    category: 'legal' | 'operational' | 'security';
    years: number;
    archiveAfter: number;
  };
}

export interface AuditContext {
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;
  device: DeviceInfo;
  network: NetworkInfo;
  application: ApplicationInfo;
  environment: 'development' | 'staging' | 'production';
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet' | 'server';
  os: string;
  browser: string;
  screenResolution?: string;
  isMobile: boolean;
  isBot: boolean;
}

export interface NetworkInfo {
  provider: string;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  vpnDetected: boolean;
  proxyDetected: boolean;
  threatLevel: 'low' | 'medium' | 'high';
}

export interface ApplicationInfo {
  module: string;
  component: string;
  feature: string;
  version: string;
  buildNumber: string;
}

export interface AuditResult {
  status: 'success' | 'failure' | 'warning' | 'blocked';
  statusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  duration: number; // milliseconds
  bytesProcessed?: number;
  recordsAffected?: number;
}

export interface DataChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: 'create' | 'update' | 'delete' | 'access';
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  encryptedOldValue?: string;
  encryptedNewValue?: string;
}

export enum AuditEventType {
  // Autenticação e Autorização
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_TIMEOUT = 'session_timeout',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_DENIED = 'permission_denied',
  
  // Dados de Pacientes
  PATIENT_CREATED = 'patient_created',
  PATIENT_UPDATED = 'patient_updated',
  PATIENT_DELETED = 'patient_deleted',
  PATIENT_ACCESSED = 'patient_accessed',
  PATIENT_EXPORTED = 'patient_exported',
  PATIENT_MERGED = 'patient_merged',
  
  // Documentos Legais
  DOCUMENT_CREATED = 'document_created',
  DOCUMENT_UPDATED = 'document_updated',
  DOCUMENT_SIGNED = 'document_signed',
  DOCUMENT_DELETED = 'document_deleted',
  DOCUMENT_ACCESSED = 'document_accessed',
  DOCUMENT_DOWNLOADED = 'document_downloaded',
  DOCUMENT_SHARED = 'document_shared',
  
  // Sistema e Segurança
  SYSTEM_LOGIN = 'system_login',
  ADMIN_ACTION = 'admin_action',
  CONFIG_CHANGED = 'config_changed',
  BACKUP_CREATED = 'backup_created',
  BACKUP_RESTORED = 'backup_restored',
  SECURITY_ALERT = 'security_alert',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  
  // Integrações
  API_ACCESS = 'api_access',
  EXTERNAL_INTEGRATION = 'external_integration',
  DATA_IMPORT = 'data_import',
  DATA_EXPORT = 'data_export',
  WEBHOOK_TRIGGERED = 'webhook_triggered'
}

export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  SYSTEM_ADMIN = 'system_admin',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  INTEGRATION = 'integration',
  BACKUP = 'backup'
}

export enum AuditSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AuditQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
  tenantId?: string;
  eventTypes?: AuditEventType[];
  categories?: AuditCategory[];
  severities?: AuditSeverity[];
  resourceTypes?: string[];
  minRiskScore?: number;
  searchTerm?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'riskScore';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditAnalytics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsByCategory: Record<AuditCategory, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  uniqueUsers: number;
  failedLogins: number;
  securityIncidents: number;
  complianceViolations: number;
  topUsers: Array<{ userId: string; userName: string; eventCount: number }>;
  riskTrends: Array<{ date: string; averageRisk: number; eventCount: number }>;
  geographicDistribution: Array<{ country: string; eventCount: number }>;
  timelineData: Array<{ timestamp: string; eventCount: number; categories: Record<AuditCategory, number> }>;
}

class AuditService {
  private events: Map<string, AuditEvent> = new Map();
  private indices: {
    byUser: Map<string, Set<string>>;
    byTenant: Map<string, Set<string>>;
    byType: Map<AuditEventType, Set<string>>;
    byDate: Map<string, Set<string>>;
    byRisk: Map<number, Set<string>>;
  };
  private alertRules: AuditAlertRule[] = [];
  private encryptionKey: string;
  private isEnabled = true;
  private bufferSize = 1000;
  private flushInterval = 30000; // 30 segundos
  private eventBuffer: AuditEvent[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.indices = {
      byUser: new Map(),
      byTenant: new Map(),
      byType: new Map(),
      byDate: new Map(),
      byRisk: new Map()
    };
    
    this.initializeEncryption();
    this.loadFromStorage();
    this.initializeAlertRules();
    this.startPeriodicTasks();
  }

  /**
   * ============== INICIALIZAÇÃO ==============
   */

  private initializeEncryption(): void {
    this.encryptionKey = localStorage.getItem('fisioflow_audit_key') || this.generateEncryptionKey();
    localStorage.setItem('fisioflow_audit_key', this.encryptionKey);
  }

  private generateEncryptionKey(): string {
    return Array.from({length: 32}, () => Math.floor(Math.random() * 256)).map(x => x.toString(16).padStart(2, '0')).join('');
  }

  private initializeAlertRules(): void {
    this.alertRules = [
      {
        id: 'multiple_failed_logins',
        name: 'Múltiplas tentativas de login falharam',
        conditions: {
          eventType: AuditEventType.LOGIN_FAILURE,
          count: 5,
          timeWindow: 15 * 60 * 1000, // 15 minutos
          groupBy: 'userId'
        },
        severity: AuditSeverity.HIGH,
        action: 'block_user'
      },
      {
        id: 'suspicious_location',
        name: 'Acesso de localização suspeita',
        conditions: {
          eventType: AuditEventType.LOGIN_SUCCESS,
          customCheck: this.checkSuspiciousLocation.bind(this)
        },
        severity: AuditSeverity.MEDIUM,
        action: 'notify_admin'
      },
      {
        id: 'bulk_data_access',
        name: 'Acesso em massa a dados sensíveis',
        conditions: {
          eventType: AuditEventType.PATIENT_ACCESSED,
          count: 50,
          timeWindow: 60 * 60 * 1000, // 1 hora
          groupBy: 'userId'
        },
        severity: AuditSeverity.HIGH,
        action: 'require_justification'
      },
      {
        id: 'after_hours_access',
        name: 'Acesso fora do horário comercial',
        conditions: {
          customCheck: this.checkAfterHoursAccess.bind(this)
        },
        severity: AuditSeverity.MEDIUM,
        action: 'log_warning'
      }
    ];
  }

  /**
   * ============== LOGGING DE EVENTOS ==============
   */

  async logEvent(
    eventType: AuditEventType,
    userId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    context: Partial<AuditContext> = {},
    metadata: Partial<AuditMetadata> = {},
    changes?: DataChange[]
  ): Promise<string> {
    if (!this.isEnabled) return '';

    const eventId = this.generateEventId();
    const timestamp = new Date().toISOString();
    
    // Coletar contexto automático
    const fullContext = await this.enrichContext(context);
    
    // Calcular score de risco
    const riskScore = this.calculateRiskScore(eventType, fullContext, changes);
    
    // Criar evento
    const event: AuditEvent = {
      id: eventId,
      timestamp,
      eventType,
      category: this.getCategoryFromEventType(eventType),
      severity: this.getSeverityFromRiskScore(riskScore),
      userId,
      userEmail: await this.getUserEmail(userId),
      userName: await this.getUserName(userId),
      userRole: await this.getUserRole(userId),
      sessionId: this.getCurrentSessionId(),
      tenantId: await this.getCurrentTenantId(),
      resourceType,
      resourceId,
      action,
      description: this.generateDescription(eventType, action, resourceType),
      metadata: this.enrichMetadata(metadata),
      context: fullContext,
      result: {
        status: 'success',
        duration: 0
      },
      changes: changes || [],
      riskScore,
      tags: this.generateTags(eventType, fullContext),
      correlationId: this.generateCorrelationId()
    };

    // Adicionar ao buffer
    this.eventBuffer.push(event);
    
    // Flush se buffer estiver cheio
    if (this.eventBuffer.length >= this.bufferSize) {
      await this.flushEvents();
    }

    // Verificar alertas em tempo real
    await this.checkAlerts(event);

    return eventId;
  }

  private async enrichContext(context: Partial<AuditContext>): Promise<AuditContext> {
    return {
      ipAddress: context.ipAddress || await this.detectClientIP(),
      userAgent: context.userAgent || this.detectUserAgent(),
      location: context.location || await this.detectGeoLocation(context.ipAddress),
      device: context.device || this.detectDeviceInfo(),
      network: context.network || await this.analyzeNetwork(context.ipAddress),
      application: context.application || this.getApplicationInfo(),
      environment: context.environment || 'production'
    };
  }

  private enrichMetadata(metadata: Partial<AuditMetadata>): AuditMetadata {
    const traceId = this.generateTraceId();
    
    return {
      source: metadata.source || 'fisioflow-web',
      version: metadata.version || '1.0.0',
      traceId,
      fingerprint: this.generateFingerprint(traceId),
      checksum: this.generateChecksum(),
      retention: metadata.retention || {
        category: 'legal',
        years: 7,
        archiveAfter: 1
      }
    };
  }

  private calculateRiskScore(
    eventType: AuditEventType,
    context: AuditContext,
    changes?: DataChange[]
  ): number {
    let score = 0;

    // Score base por tipo de evento
    const baseScores = {
      [AuditEventType.LOGIN_FAILURE]: 30,
      [AuditEventType.PATIENT_ACCESSED]: 20,
      [AuditEventType.DOCUMENT_DOWNLOADED]: 25,
      [AuditEventType.ADMIN_ACTION]: 40,
      [AuditEventType.CONFIG_CHANGED]: 50,
      [AuditEventType.SECURITY_ALERT]: 80,
      [AuditEventType.COMPLIANCE_VIOLATION]: 90
    };
    
    score += baseScores[eventType] || 10;

    // Fatores de contexto
    if (context.network.vpnDetected) score += 15;
    if (context.network.proxyDetected) score += 10;
    if (context.network.threatLevel === 'high') score += 30;
    if (context.device.isBot) score += 25;

    // Horário suspeito (fora do comercial)
    const hour = new Date().getHours();
    if (hour < 7 || hour > 19) score += 10;

    // Localização suspeita
    if (context.location && this.isSuspiciousLocation(context.location)) {
      score += 20;
    }

    // Mudanças em dados sensíveis
    if (changes) {
      const sensitiveChanges = changes.filter(c => c.sensitivity === 'confidential' || c.sensitivity === 'restricted');
      score += sensitiveChanges.length * 5;
    }

    return Math.min(score, 100);
  }

  /**
   * ============== PROCESSAMENTO EM LOTE ==============
   */

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToProcess = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Processar eventos em lote
      for (const event of eventsToProcess) {
        // Criptografar dados sensíveis
        if (event.changes) {
          event.changes = await this.encryptSensitiveChanges(event.changes);
        }

        // Armazenar evento
        this.events.set(event.id, event);
        
        // Atualizar índices
        this.updateIndices(event);
      }

      // Salvar no storage
      await this.saveToStorage();

      console.log(`[AUDIT] Processados ${eventsToProcess.length} eventos`);

    } catch (error) {
      console.error('[AUDIT] Erro ao processar eventos:', error);
      // Recolocar eventos no buffer em caso de erro
      this.eventBuffer.unshift(...eventsToProcess);
    }
  }

  private async encryptSensitiveChanges(changes: DataChange[]): Promise<DataChange[]> {
    return changes.map(change => {
      if (change.sensitivity === 'confidential' || change.sensitivity === 'restricted') {
        return {
          ...change,
          encryptedOldValue: this.encrypt(JSON.stringify(change.oldValue)),
          encryptedNewValue: this.encrypt(JSON.stringify(change.newValue)),
          oldValue: '[ENCRYPTED]',
          newValue: '[ENCRYPTED]'
        };
      }
      return change;
    });
  }

  private updateIndices(event: AuditEvent): void {
    // Índice por usuário
    if (!this.indices.byUser.has(event.userId)) {
      this.indices.byUser.set(event.userId, new Set());
    }
    this.indices.byUser.get(event.userId)!.add(event.id);

    // Índice por tenant
    if (!this.indices.byTenant.has(event.tenantId)) {
      this.indices.byTenant.set(event.tenantId, new Set());
    }
    this.indices.byTenant.get(event.tenantId)!.add(event.id);

    // Índice por tipo
    if (!this.indices.byType.has(event.eventType)) {
      this.indices.byType.set(event.eventType, new Set());
    }
    this.indices.byType.get(event.eventType)!.add(event.id);

    // Índice por data
    const dateKey = event.timestamp.split('T')[0];
    if (!this.indices.byDate.has(dateKey)) {
      this.indices.byDate.set(dateKey, new Set());
    }
    this.indices.byDate.get(dateKey)!.add(event.id);

    // Índice por risco
    const riskBucket = Math.floor(event.riskScore / 10) * 10;
    if (!this.indices.byRisk.has(riskBucket)) {
      this.indices.byRisk.set(riskBucket, new Set());
    }
    this.indices.byRisk.get(riskBucket)!.add(event.id);
  }

  /**
   * ============== CONSULTAS E ANÁLISES ==============
   */

  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    let eventIds = new Set<string>();

    // Aplicar filtros usando índices
    if (query.userId) {
      const userEvents = this.indices.byUser.get(query.userId);
      if (userEvents) {
        eventIds = new Set([...eventIds].filter(id => userEvents.has(id)) || [...userEvents]);
      } else {
        return [];
      }
    }

    if (query.tenantId) {
      const tenantEvents = this.indices.byTenant.get(query.tenantId);
      if (tenantEvents) {
        eventIds = eventIds.size > 0 
          ? new Set([...eventIds].filter(id => tenantEvents.has(id)))
          : tenantEvents;
      } else {
        return [];
      }
    }

    if (query.eventTypes && query.eventTypes.length > 0) {
      const typeEvents = new Set<string>();
      for (const type of query.eventTypes) {
        const events = this.indices.byType.get(type);
        if (events) {
          events.forEach(id => typeEvents.add(id));
        }
      }
      eventIds = eventIds.size > 0 
        ? new Set([...eventIds].filter(id => typeEvents.has(id)))
        : typeEvents;
    }

    // Converter IDs para eventos
    let events = Array.from(eventIds).map(id => this.events.get(id)).filter(Boolean) as AuditEvent[];

    // Filtros adicionais que não podem usar índices
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      events = events.filter(e => new Date(e.timestamp) >= startDate);
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      events = events.filter(e => new Date(e.timestamp) <= endDate);
    }

    if (query.categories && query.categories.length > 0) {
      events = events.filter(e => query.categories!.includes(e.category));
    }

    if (query.severities && query.severities.length > 0) {
      events = events.filter(e => query.severities!.includes(e.severity));
    }

    if (query.minRiskScore !== undefined) {
      events = events.filter(e => e.riskScore >= query.minRiskScore!);
    }

    if (query.searchTerm) {
      const term = query.searchTerm.toLowerCase();
      events = events.filter(e => 
        e.description.toLowerCase().includes(term) ||
        e.action.toLowerCase().includes(term) ||
        e.userName.toLowerCase().includes(term)
      );
    }

    // Ordenação
    const sortBy = query.sortBy || 'timestamp';
    const sortOrder = query.sortOrder || 'desc';
    
    events.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'timestamp':
          valueA = new Date(a.timestamp).getTime();
          valueB = new Date(b.timestamp).getTime();
          break;
        case 'severity':
          const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
          valueA = severityOrder[a.severity];
          valueB = severityOrder[b.severity];
          break;
        case 'riskScore':
          valueA = a.riskScore;
          valueB = b.riskScore;
          break;
        default:
          valueA = a.timestamp;
          valueB = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    // Paginação
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return events.slice(offset, offset + limit);
  }

  async generateAnalytics(query: AuditQuery): Promise<AuditAnalytics> {
    const events = await this.queryEvents({ ...query, limit: 10000 }); // Limite alto para analytics

    const analytics: AuditAnalytics = {
      totalEvents: events.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsByCategory: {} as Record<AuditCategory, number>,
      eventsBySeverity: {} as Record<AuditSeverity, number>,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      failedLogins: events.filter(e => e.eventType === AuditEventType.LOGIN_FAILURE).length,
      securityIncidents: events.filter(e => e.category === AuditCategory.SECURITY).length,
      complianceViolations: events.filter(e => e.eventType === AuditEventType.COMPLIANCE_VIOLATION).length,
      topUsers: [],
      riskTrends: [],
      geographicDistribution: [],
      timelineData: []
    };

    // Contar eventos por tipo
    Object.values(AuditEventType).forEach(type => {
      analytics.eventsByType[type] = events.filter(e => e.eventType === type).length;
    });

    // Contar eventos por categoria
    Object.values(AuditCategory).forEach(category => {
      analytics.eventsByCategory[category] = events.filter(e => e.category === category).length;
    });

    // Contar eventos por severidade
    Object.values(AuditSeverity).forEach(severity => {
      analytics.eventsBySeverity[severity] = events.filter(e => e.severity === severity).length;
    });

    // Top usuários
    const userCounts = new Map<string, { name: string; count: number }>();
    events.forEach(event => {
      const existing = userCounts.get(event.userId) || { name: event.userName, count: 0 };
      existing.count++;
      userCounts.set(event.userId, existing);
    });

    analytics.topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, userName: data.name, eventCount: data.count }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    // Tendências de risco (últimos 30 dias)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentEvents = events.filter(e => new Date(e.timestamp) >= thirtyDaysAgo);
    
    const dailyRisk = new Map<string, { total: number; count: number }>();
    recentEvents.forEach(event => {
      const date = event.timestamp.split('T')[0];
      const existing = dailyRisk.get(date) || { total: 0, count: 0 };
      existing.total += event.riskScore;
      existing.count++;
      dailyRisk.set(date, existing);
    });

    analytics.riskTrends = Array.from(dailyRisk.entries())
      .map(([date, data]) => ({
        date,
        averageRisk: data.count > 0 ? data.total / data.count : 0,
        eventCount: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Distribuição geográfica
    const countryCounts = new Map<string, number>();
    events.forEach(event => {
      if (event.context.location) {
        const country = event.context.location.country;
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      }
    });

    analytics.geographicDistribution = Array.from(countryCounts.entries())
      .map(([country, eventCount]) => ({ country, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount);

    return analytics;
  }

  /**
   * ============== ALERTAS E MONITORAMENTO ==============
   */

  private async checkAlerts(event: AuditEvent): Promise<void> {
    for (const rule of this.alertRules) {
      try {
        if (await this.evaluateAlertRule(rule, event)) {
          await this.triggerAlert(rule, event);
        }
      } catch (error) {
        console.error(`[AUDIT] Erro ao avaliar regra ${rule.id}:`, error);
      }
    }
  }

  private async evaluateAlertRule(rule: AuditAlertRule, event: AuditEvent): Promise<boolean> {
    const conditions = rule.conditions;

    // Verificar tipo de evento
    if (conditions.eventType && event.eventType !== conditions.eventType) {
      return false;
    }

    // Verificar check customizado
    if (conditions.customCheck) {
      return await conditions.customCheck(event);
    }

    // Verificar contagem em janela de tempo
    if (conditions.count && conditions.timeWindow && conditions.groupBy) {
      const since = new Date(Date.now() - conditions.timeWindow);
      const query: AuditQuery = {
        startDate: since.toISOString(),
        eventTypes: conditions.eventType ? [conditions.eventType] : undefined
      };

      if (conditions.groupBy === 'userId') {
        query.userId = event.userId;
      }

      const recentEvents = await this.queryEvents(query);
      return recentEvents.length >= conditions.count;
    }

    return true;
  }

  private async triggerAlert(rule: AuditAlertRule, event: AuditEvent): Promise<void> {
    console.warn(`[AUDIT ALERT] ${rule.name} - Event: ${event.id}`);

    // Executar ação baseada na regra
    switch (rule.action) {
      case 'block_user':
        await this.blockUser(event.userId);
        break;
      case 'notify_admin':
        await this.notifyAdmin(rule, event);
        break;
      case 'require_justification':
        await this.requireJustification(event);
        break;
      case 'log_warning':
        await this.logEvent(
          AuditEventType.SECURITY_ALERT,
          'system',
          'alert_triggered',
          'security_rule',
          rule.id,
          event.context,
          { source: 'audit_service' }
        );
        break;
    }
  }

  private checkSuspiciousLocation(event: AuditEvent): boolean {
    if (!event.context.location) return false;
    return this.isSuspiciousLocation(event.context.location);
  }

  private checkAfterHoursAccess(event: AuditEvent): boolean {
    const hour = new Date(event.timestamp).getHours();
    return hour < 7 || hour > 19; // Fora do horário comercial
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  private generateFingerprint(traceId: string): string {
    // Simulação de fingerprint baseado em trace ID
    return btoa(traceId).substr(0, 16);
  }

  private generateChecksum(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  private async detectClientIP(): Promise<string> {
    // Em produção, obter IP real do cliente
    return '192.168.1.100';
  }

  private detectUserAgent(): string {
    return navigator.userAgent || 'Unknown';
  }

  private async detectGeoLocation(ip?: string): Promise<GeoLocation | undefined> {
    // Em produção, usar serviço de geolocalização por IP
    return {
      country: 'Brasil',
      region: 'São Paulo',
      city: 'São Paulo',
      latitude: -23.5505,
      longitude: -46.6333,
      timezone: 'America/Sao_Paulo'
    };
  }

  private detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    return {
      type: /Mobile|Android|iPhone|iPad/.test(userAgent) ? 'mobile' : 'desktop',
      os: this.detectOS(userAgent),
      browser: this.detectBrowser(userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
      isBot: /bot|crawler|spider/i.test(userAgent)
    };
  }

  private detectOS(userAgent: string): string {
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iPhone|iPad/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  private detectBrowser(userAgent: string): string {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    return 'Unknown';
  }

  private async analyzeNetwork(ip?: string): Promise<NetworkInfo> {
    // Em produção, usar serviços de análise de rede
    return {
      provider: 'Unknown ISP',
      connectionType: 'unknown',
      vpnDetected: false,
      proxyDetected: false,
      threatLevel: 'low'
    };
  }

  private getApplicationInfo(): ApplicationInfo {
    return {
      module: 'legal-documents',
      component: 'audit-service',
      feature: 'event-logging',
      version: '1.0.0',
      buildNumber: '20241201.1'
    };
  }

  private isSuspiciousLocation(location: GeoLocation): boolean {
    // Lista de países considerados suspeitos (exemplo)
    const suspiciousCountries = ['Unknown', 'VPN', 'Proxy'];
    return suspiciousCountries.includes(location.country);
  }

  private getCategoryFromEventType(eventType: AuditEventType): AuditCategory {
    const categoryMap = {
      [AuditEventType.LOGIN_SUCCESS]: AuditCategory.AUTHENTICATION,
      [AuditEventType.LOGIN_FAILURE]: AuditCategory.AUTHENTICATION,
      [AuditEventType.LOGOUT]: AuditCategory.AUTHENTICATION,
      [AuditEventType.PERMISSION_DENIED]: AuditCategory.AUTHORIZATION,
      [AuditEventType.PATIENT_ACCESSED]: AuditCategory.DATA_ACCESS,
      [AuditEventType.PATIENT_UPDATED]: AuditCategory.DATA_MODIFICATION,
      [AuditEventType.DOCUMENT_CREATED]: AuditCategory.DATA_MODIFICATION,
      [AuditEventType.ADMIN_ACTION]: AuditCategory.SYSTEM_ADMIN,
      [AuditEventType.SECURITY_ALERT]: AuditCategory.SECURITY,
      [AuditEventType.COMPLIANCE_VIOLATION]: AuditCategory.COMPLIANCE,
      [AuditEventType.BACKUP_CREATED]: AuditCategory.BACKUP
    };

    return categoryMap[eventType] || AuditCategory.DATA_ACCESS;
  }

  private getSeverityFromRiskScore(riskScore: number): AuditSeverity {
    if (riskScore >= 80) return AuditSeverity.CRITICAL;
    if (riskScore >= 60) return AuditSeverity.HIGH;
    if (riskScore >= 40) return AuditSeverity.MEDIUM;
    if (riskScore >= 20) return AuditSeverity.LOW;
    return AuditSeverity.INFO;
  }

  private generateDescription(eventType: AuditEventType, action: string, resourceType: string): string {
    const descriptions = {
      [AuditEventType.LOGIN_SUCCESS]: 'Usuário fez login com sucesso',
      [AuditEventType.LOGIN_FAILURE]: 'Tentativa de login falhou',
      [AuditEventType.PATIENT_ACCESSED]: `Acesso aos dados do paciente`,
      [AuditEventType.DOCUMENT_CREATED]: `Documento ${resourceType} criado`,
      [AuditEventType.DOCUMENT_SIGNED]: `Documento ${resourceType} assinado`,
      [AuditEventType.ADMIN_ACTION]: `Ação administrativa: ${action}`
    };

    return descriptions[eventType] || `${action} em ${resourceType}`;
  }

  private generateTags(eventType: AuditEventType, context: AuditContext): string[] {
    const tags = [];

    // Tags baseadas no tipo
    if (eventType.includes('login')) tags.push('authentication');
    if (eventType.includes('patient')) tags.push('patient-data');
    if (eventType.includes('document')) tags.push('document');
    if (eventType.includes('admin')) tags.push('admin');

    // Tags baseadas no contexto
    if (context.device.isMobile) tags.push('mobile');
    if (context.network.vpnDetected) tags.push('vpn');
    if (context.network.threatLevel === 'high') tags.push('threat');

    return tags;
  }

  private getCurrentSessionId(): string {
    return sessionStorage.getItem('fisioflow_session_id') || 'unknown';
  }

  private async getCurrentTenantId(): Promise<string> {
    // Em produção, obter do contexto atual
    return 'default_tenant';
  }

  private async getUserEmail(userId: string): Promise<string> {
    // Em produção, buscar do banco de dados
    return `user${userId}@example.com`;
  }

  private async getUserName(userId: string): Promise<string> {
    // Em produção, buscar do banco de dados
    return `User ${userId}`;
  }

  private async getUserRole(userId: string): Promise<string> {
    // Em produção, buscar do banco de dados
    return 'FISIOTERAPEUTA';
  }

  private encrypt(data: string): string {
    // Simulação de criptografia (em produção usar biblioteca real)
    return btoa(data);
  }

  private decrypt(encryptedData: string): string {
    // Simulação de descriptografia
    return atob(encryptedData);
  }

  private async blockUser(userId: string): Promise<void> {
    console.warn(`[AUDIT] Usuário ${userId} bloqueado por atividade suspeita`);
    // Em produção, implementar bloqueio real
  }

  private async notifyAdmin(rule: AuditAlertRule, event: AuditEvent): Promise<void> {
    console.warn(`[AUDIT] Notificando admin sobre: ${rule.name}`);
    // Em produção, enviar notificação real
  }

  private async requireJustification(event: AuditEvent): Promise<void> {
    console.warn(`[AUDIT] Justificativa requerida para evento: ${event.id}`);
    // Em produção, solicitar justificativa do usuário
  }

  private startPeriodicTasks(): void {
    // Flush automático do buffer
    this.flushTimer = setInterval(() => {
      this.flushEvents();
    }, this.flushInterval);

    // Limpeza de eventos antigos (executar diariamente)
    setInterval(() => {
      this.cleanupOldEvents();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupOldEvents(): Promise<void> {
    const retentionPeriods = {
      legal: 7 * 365 * 24 * 60 * 60 * 1000, // 7 anos
      operational: 2 * 365 * 24 * 60 * 60 * 1000, // 2 anos
      security: 5 * 365 * 24 * 60 * 60 * 1000 // 5 anos
    };

    const now = Date.now();
    const toDelete: string[] = [];

    for (const event of this.events.values()) {
      const eventTime = new Date(event.timestamp).getTime();
      const retention = retentionPeriods[event.metadata.retention.category];
      
      if (now - eventTime > retention) {
        toDelete.push(event.id);
      }
    }

    // Remove eventos expirados
    for (const eventId of toDelete) {
      this.events.delete(eventId);
      // Remover de todos os índices
      this.removeFromIndices(eventId);
    }

    if (toDelete.length > 0) {
      console.log(`[AUDIT] Removidos ${toDelete.length} eventos expirados`);
      await this.saveToStorage();
    }
  }

  private removeFromIndices(eventId: string): void {
    // Remover de todos os índices (implementação simplificada)
    for (const index of Object.values(this.indices)) {
      for (const eventSet of index.values()) {
        eventSet.delete(eventId);
      }
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_audit_events');
      if (saved) {
        const data = JSON.parse(saved);
        this.events = new Map(data.events || []);
        
        // Reconstruir índices
        for (const event of this.events.values()) {
          this.updateIndices(event);
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar eventos de auditoria:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        events: Array.from(this.events.entries())
      };
      localStorage.setItem('fisioflow_audit_events', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar eventos de auditoria:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isActive(): boolean {
    return this.isEnabled;
  }

  async getEventById(eventId: string): Promise<AuditEvent | null> {
    return this.events.get(eventId) || null;
  }

  async getEventsForUser(userId: string, limit: number = 100): Promise<AuditEvent[]> {
    return this.queryEvents({ userId, limit });
  }

  async getSecurityEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.queryEvents({ 
      categories: [AuditCategory.SECURITY], 
      severities: [AuditSeverity.HIGH, AuditSeverity.CRITICAL],
      limit 
    });
  }

  async exportEvents(query: AuditQuery, format: 'json' | 'csv' = 'json'): Promise<string> {
    const events = await this.queryEvents({ ...query, limit: 10000 });
    
    if (format === 'csv') {
      return this.convertToCSV(events);
    }
    
    return JSON.stringify(events, null, 2);
  }

  private convertToCSV(events: AuditEvent[]): string {
    if (events.length === 0) return '';

    const headers = [
      'id', 'timestamp', 'eventType', 'category', 'severity', 
      'userId', 'userName', 'action', 'resourceType', 'resourceId',
      'riskScore', 'ipAddress', 'userAgent', 'result'
    ];

    const rows = events.map(event => [
      event.id,
      event.timestamp,
      event.eventType,
      event.category,
      event.severity,
      event.userId,
      event.userName,
      event.action,
      event.resourceType,
      event.resourceId,
      event.riskScore,
      event.context.ipAddress,
      event.context.userAgent,
      event.result.status
    ]);

    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  getStats(): {
    totalEvents: number;
    eventsToday: number;
    highRiskEvents: number;
    uniqueUsers: number;
    averageRiskScore: number;
  } {
    const events = Array.from(this.events.values());
    const today = new Date().toISOString().split('T')[0];
    const todayEvents = events.filter(e => e.timestamp.startsWith(today));
    const highRiskEvents = events.filter(e => e.riskScore >= 70);
    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const avgRisk = events.length > 0 
      ? events.reduce((sum, e) => sum + e.riskScore, 0) / events.length 
      : 0;

    return {
      totalEvents: events.length,
      eventsToday: todayEvents.length,
      highRiskEvents: highRiskEvents.length,
      uniqueUsers,
      averageRiskScore: Math.round(avgRisk)
    };
  }
}

interface AuditAlertRule {
  id: string;
  name: string;
  conditions: {
    eventType?: AuditEventType;
    count?: number;
    timeWindow?: number; // milliseconds
    groupBy?: 'userId' | 'tenantId' | 'ipAddress';
    customCheck?: (event: AuditEvent) => Promise<boolean> | boolean;
  };
  severity: AuditSeverity;
  action: 'block_user' | 'notify_admin' | 'require_justification' | 'log_warning';
}

// Instância singleton
export const auditService = new AuditService();

// Funções de conveniência
export async function logUserAction(
  eventType: AuditEventType,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  changes?: DataChange[]
): Promise<string> {
  return await auditService.logEvent(eventType, userId, action, resourceType, resourceId, {}, {}, changes);
}

export async function logSecurityEvent(
  eventType: AuditEventType,
  userId: string,
  description: string,
  context?: Partial<AuditContext>
): Promise<string> {
  return await auditService.logEvent(eventType, userId, description, 'security', 'system', context);
}

export async function getAuditTrail(resourceType: string, resourceId: string): Promise<AuditEvent[]> {
  return await auditService.queryEvents({
    resourceTypes: [resourceType],
    searchTerm: resourceId,
    limit: 1000,
    sortBy: 'timestamp',
    sortOrder: 'desc'
  });
}

export async function generateComplianceReport(startDate: string, endDate: string): Promise<AuditAnalytics> {
  return await auditService.generateAnalytics({
    startDate,
    endDate,
    categories: [AuditCategory.COMPLIANCE, AuditCategory.DATA_ACCESS, AuditCategory.DATA_MODIFICATION]
  });
}

export default auditService;