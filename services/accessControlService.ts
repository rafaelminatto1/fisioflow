/**
 * Serviço de Controle de Acesso Avançado
 * Sistema empresarial com MFA, sessões seguras e controle granular
 */

import { auditService, AuditEventType } from './auditService';

export interface AccessControlConfig {
  passwordPolicy: PasswordPolicy;
  mfaSettings: MFASettings;
  sessionSettings: SessionSettings;
  lockoutPolicy: LockoutPolicy;
  ipWhitelist: IPWhitelistConfig;
  threatDetection: ThreatDetectionConfig;
  complianceSettings: ComplianceSettings;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars: number;
  preventReuse: number; // últimas N senhas
  maxAge: number; // dias
  minAge: number; // dias
  complexityScore: number; // 0-100
  dictionaryCheck: boolean;
  personalInfoCheck: boolean;
}

export interface MFASettings {
  enabled: boolean;
  required: boolean;
  methods: MFAMethod[];
  backupCodes: boolean;
  gracePeriod: number; // dias
  rememberDevice: boolean;
  rememberDuration: number; // dias
}

export interface SessionSettings {
  maxDuration: number; // minutos
  idleTimeout: number; // minutos
  absoluteTimeout: number; // minutos
  maxConcurrentSessions: number;
  requireReauth: boolean;
  reauthInterval: number; // minutos
  secureOnly: boolean;
  sameSite: 'strict' | 'lax' | 'none';
}

export interface LockoutPolicy {
  enabled: boolean;
  maxAttempts: number;
  lockoutDuration: number; // minutos
  progressiveLockout: boolean;
  resetOnSuccess: boolean;
  notifyAdmin: boolean;
  whitelist: string[]; // IPs isentos
}

export interface IPWhitelistConfig {
  enabled: boolean;
  addresses: string[];
  ranges: string[];
  allowVPN: boolean;
  allowProxy: boolean;
  geoRestrictions: string[]; // códigos de país
}

export interface ThreatDetectionConfig {
  enabled: boolean;
  riskThreshold: number; // 0-100
  suspiciousActivityDetection: boolean;
  botDetection: boolean;
  bruteForceDetection: boolean;
  anomalyDetection: boolean;
  blacklistCheck: boolean;
  reputationCheck: boolean;
}

export interface ComplianceSettings {
  hipaaCompliance: boolean;
  lgpdCompliance: boolean;
  accessLogging: boolean;
  dataRetention: number; // dias
  privacyMode: boolean;
  auditFrequency: 'realtime' | 'hourly' | 'daily';
}

export interface UserSession {
  id: string;
  userId: string;
  tenantId: string;
  createdAt: string;
  lastActivity: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  location?: GeoLocation;
  mfaVerified: boolean;
  riskScore: number;
  permissions: Permission[];
  metadata: SessionMetadata;
  isActive: boolean;
}

export interface SessionMetadata {
  loginMethod: 'password' | 'sso' | 'api_key' | 'certificate';
  deviceTrusted: boolean;
  locationTrusted: boolean;
  flags: string[];
  lastReauth?: string;
  concurrentSessions: number;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: PermissionCondition[];
  granted: boolean;
  source: 'role' | 'direct' | 'group' | 'temporary';
  expiresAt?: string;
}

export interface PermissionCondition {
  type: 'time' | 'location' | 'device' | 'mfa' | 'approval';
  operator: 'equals' | 'in' | 'greater_than' | 'less_than';
  value: any;
}

export interface AccessAttempt {
  id: string;
  timestamp: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  method: 'password' | 'mfa' | 'sso';
  result: 'success' | 'failure' | 'blocked' | 'suspicious';
  failureReason?: string;
  riskScore: number;
  location?: GeoLocation;
  blocked: boolean;
  blockedReason?: string;
}

export interface UserLockout {
  userId: string;
  lockedAt: string;
  expiresAt: string;
  reason: string;
  attempts: number;
  ipAddress: string;
  unlockCode?: string;
  adminOverride: boolean;
}

export interface ThreatAssessment {
  ipAddress: string;
  riskScore: number;
  factors: ThreatFactor[];
  recommendation: 'allow' | 'challenge' | 'block';
  lastUpdated: string;
  reputation: 'good' | 'neutral' | 'bad' | 'unknown';
}

export interface ThreatFactor {
  type: 'blacklist' | 'reputation' | 'geolocation' | 'behavior' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number; // contribuição para o score total
}

export enum MFAMethod {
  SMS = 'sms',
  EMAIL = 'email',
  TOTP = 'totp',
  WEBAUTHN = 'webauthn',
  PUSH = 'push',
  BACKUP_CODES = 'backup_codes'
}

export interface GeoLocation {
  country: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

class AccessControlService {
  private config: AccessControlConfig;
  private sessions: Map<string, UserSession> = new Map();
  private accessAttempts: Map<string, AccessAttempt[]> = new Map();
  private userLockouts: Map<string, UserLockout> = new Map();
  private threatAssessments: Map<string, ThreatAssessment> = new Map();
  private passwordHistory: Map<string, string[]> = new Map();
  private trustedDevices: Map<string, Set<string>> = new Map();
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultConfig();
    this.loadFromStorage();
    this.startPeriodicTasks();
  }

  /**
   * ============== INICIALIZAÇÃO ==============
   */

  private initializeDefaultConfig(): void {
    this.config = {
      passwordPolicy: {
        minLength: 12,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        minSpecialChars: 2,
        preventReuse: 12,
        maxAge: 90,
        minAge: 1,
        complexityScore: 75,
        dictionaryCheck: true,
        personalInfoCheck: true
      },
      mfaSettings: {
        enabled: true,
        required: true,
        methods: [MFAMethod.TOTP, MFAMethod.SMS, MFAMethod.EMAIL],
        backupCodes: true,
        gracePeriod: 7,
        rememberDevice: true,
        rememberDuration: 30
      },
      sessionSettings: {
        maxDuration: 480, // 8 horas
        idleTimeout: 30,
        absoluteTimeout: 720, // 12 horas
        maxConcurrentSessions: 3,
        requireReauth: true,
        reauthInterval: 240, // 4 horas
        secureOnly: true,
        sameSite: 'strict'
      },
      lockoutPolicy: {
        enabled: true,
        maxAttempts: 5,
        lockoutDuration: 30,
        progressiveLockout: true,
        resetOnSuccess: true,
        notifyAdmin: true,
        whitelist: []
      },
      ipWhitelist: {
        enabled: false,
        addresses: [],
        ranges: [],
        allowVPN: false,
        allowProxy: false,
        geoRestrictions: []
      },
      threatDetection: {
        enabled: true,
        riskThreshold: 70,
        suspiciousActivityDetection: true,
        botDetection: true,
        bruteForceDetection: true,
        anomalyDetection: true,
        blacklistCheck: true,
        reputationCheck: true
      },
      complianceSettings: {
        hipaaCompliance: true,
        lgpdCompliance: true,
        accessLogging: true,
        dataRetention: 2555, // 7 anos
        privacyMode: true,
        auditFrequency: 'realtime'
      }
    };
  }

  /**
   * ============== AUTENTICAÇÃO ==============
   */

  async authenticateUser(
    userId: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string,
    mfaCode?: string
  ): Promise<{ success: boolean; sessionId?: string; requireMFA?: boolean; error?: string }> {
    
    const attemptId = this.generateAttemptId();
    let attempt: AccessAttempt = {
      id: attemptId,
      timestamp: new Date().toISOString(),
      userId,
      ipAddress,
      userAgent,
      method: 'password',
      result: 'failure',
      riskScore: 0,
      blocked: false
    };

    try {
      // 1. Verificar se usuário está bloqueado
      const lockout = this.userLockouts.get(userId);
      if (lockout && new Date() < new Date(lockout.expiresAt)) {
        attempt.result = 'blocked';
        attempt.blocked = true;
        attempt.blockedReason = 'User is locked out';
        this.recordAccessAttempt(attempt);
        
        await auditService.logEvent(
          AuditEventType.LOGIN_FAILURE,
          userId,
          'login_blocked_lockout',
          'authentication',
          userId,
          { ipAddress, userAgent }
        );

        return { success: false, error: 'Conta bloqueada. Tente novamente mais tarde.' };
      }

      // 2. Avaliação de ameaças
      const threatAssessment = await this.assessThreat(ipAddress, userAgent, userId);
      attempt.riskScore = threatAssessment.riskScore;

      if (threatAssessment.recommendation === 'block') {
        attempt.result = 'blocked';
        attempt.blocked = true;
        attempt.blockedReason = 'High threat score';
        this.recordAccessAttempt(attempt);

        await auditService.logEvent(
          AuditEventType.LOGIN_FAILURE,
          userId,
          'login_blocked_threat',
          'authentication',
          userId,
          { ipAddress, userAgent }
        );

        return { success: false, error: 'Acesso negado por motivos de segurança.' };
      }

      // 3. Verificar credenciais
      const passwordValid = await this.validatePassword(userId, password);
      if (!passwordValid) {
        attempt.result = 'failure';
        attempt.failureReason = 'Invalid credentials';
        this.recordAccessAttempt(attempt);
        
        // Aplicar política de bloqueio
        await this.applyLockoutPolicy(userId, ipAddress);

        await auditService.logEvent(
          AuditEventType.LOGIN_FAILURE,
          userId,
          'invalid_credentials',
          'authentication',
          userId,
          { ipAddress, userAgent }
        );

        return { success: false, error: 'Credenciais inválidas.' };
      }

      // 4. Verificar se MFA é necessário
      if (this.config.mfaSettings.required) {
        const deviceTrusted = this.isDeviceTrusted(userId, this.generateDeviceFingerprint(userAgent, ipAddress));
        
        if (!deviceTrusted && !mfaCode) {
          // Requer MFA
          return { success: false, requireMFA: true };
        }

        if (!deviceTrusted && mfaCode) {
          const mfaValid = await this.validateMFA(userId, mfaCode);
          if (!mfaValid) {
            attempt.result = 'failure';
            attempt.failureReason = 'Invalid MFA code';
            this.recordAccessAttempt(attempt);

            await auditService.logEvent(
              AuditEventType.LOGIN_FAILURE,
              userId,
              'invalid_mfa',
              'authentication',
              userId,
              { ipAddress, userAgent }
            );

            return { success: false, error: 'Código MFA inválido.' };
          }

          attempt.method = 'mfa';
        }
      }

      // 5. Criar sessão
      const sessionId = await this.createSession(userId, ipAddress, userAgent, attempt.riskScore);
      
      attempt.result = 'success';
      this.recordAccessAttempt(attempt);

      // 6. Limpar tentativas falharam após sucesso
      if (this.config.lockoutPolicy.resetOnSuccess) {
        this.clearFailedAttempts(userId);
        this.userLockouts.delete(userId);
      }

      // 7. Log de auditoria
      await auditService.logEvent(
        AuditEventType.LOGIN_SUCCESS,
        userId,
        'successful_login',
        'authentication',
        userId,
        { ipAddress, userAgent }
      );

      return { success: true, sessionId };

    } catch (error) {
      attempt.result = 'failure';
      attempt.failureReason = error.message;
      this.recordAccessAttempt(attempt);

      console.error('[ACCESS_CONTROL] Erro na autenticação:', error);
      return { success: false, error: 'Erro interno do servidor.' };
    }
  }

  private async validatePassword(userId: string, password: string): Promise<boolean> {
    // Em produção, usar hash seguro (bcrypt, Argon2, etc.)
    // Por ora, simulação
    return password.length >= this.config.passwordPolicy.minLength;
  }

  private async validateMFA(userId: string, code: string): Promise<boolean> {
    // Em produção, validar código TOTP, SMS, etc.
    // Por ora, simulação (código deve ter 6 dígitos)
    return /^\d{6}$/.test(code);
  }

  /**
   * ============== GESTÃO DE SESSÕES ==============
   */

  private async createSession(
    userId: string, 
    ipAddress: string, 
    userAgent: string, 
    riskScore: number
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.sessionSettings.maxDuration * 60 * 1000);

    // Verificar limite de sessões concorrentes
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId && s.isActive);
    if (userSessions.length >= this.config.sessionSettings.maxConcurrentSessions) {
      // Remover sessão mais antiga
      const oldestSession = userSessions.sort((a, b) => 
        new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      )[0];
      
      await this.terminateSession(oldestSession.id, 'concurrent_limit');
    }

    // Obter permissões do usuário
    const permissions = await this.getUserPermissions(userId);
    
    // Detectar localização
    const location = await this.detectLocation(ipAddress);

    const session: UserSession = {
      id: sessionId,
      userId,
      tenantId: await this.getUserTenantId(userId),
      createdAt: now.toISOString(),
      lastActivity: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent,
      deviceFingerprint: this.generateDeviceFingerprint(userAgent, ipAddress),
      location,
      mfaVerified: false, // Será atualizado após MFA
      riskScore,
      permissions,
      metadata: {
        loginMethod: 'password',
        deviceTrusted: this.isDeviceTrusted(userId, this.generateDeviceFingerprint(userAgent, ipAddress)),
        locationTrusted: this.isLocationTrusted(userId, location),
        flags: [],
        concurrentSessions: userSessions.length + 1
      },
      isActive: true
    };

    this.sessions.set(sessionId, session);
    await this.saveToStorage();

    console.log(`[ACCESS_CONTROL] Sessão criada: ${sessionId} para usuário ${userId}`);
    return sessionId;
  }

  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: UserSession; reason?: string }> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return { valid: false, reason: 'Session not found' };
    }

    if (!session.isActive) {
      return { valid: false, reason: 'Session is inactive' };
    }

    const now = new Date();
    
    // Verificar expiração absoluta
    if (now > new Date(session.expiresAt)) {
      await this.terminateSession(sessionId, 'expired');
      return { valid: false, reason: 'Session expired' };
    }

    // Verificar timeout de inatividade
    const lastActivity = new Date(session.lastActivity);
    const idleTimeout = this.config.sessionSettings.idleTimeout * 60 * 1000;
    
    if (now.getTime() - lastActivity.getTime() > idleTimeout) {
      await this.terminateSession(sessionId, 'idle_timeout');
      return { valid: false, reason: 'Session idle timeout' };
    }

    // Atualizar última atividade
    session.lastActivity = now.toISOString();
    await this.saveToStorage();

    return { valid: true, session };
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.isActive = false;
    
    await auditService.logEvent(
      AuditEventType.LOGOUT,
      session.userId,
      `session_terminated_${reason}`,
      'authentication',
      sessionId,
      { ipAddress: session.ipAddress, userAgent: session.userAgent }
    );

    console.log(`[ACCESS_CONTROL] Sessão terminada: ${sessionId} - ${reason}`);
    await this.saveToStorage();
  }

  async extendSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return false;

    const now = new Date();
    const newExpiry = new Date(now.getTime() + this.config.sessionSettings.maxDuration * 60 * 1000);
    
    session.expiresAt = newExpiry.toISOString();
    session.lastActivity = now.toISOString();
    
    await this.saveToStorage();
    return true;
  }

  /**
   * ============== CONTROLE DE ACESSO ==============
   */

  async checkPermission(
    sessionId: string, 
    resource: string, 
    action: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    
    const sessionValidation = await this.validateSession(sessionId);
    if (!sessionValidation.valid) {
      return { allowed: false, reason: sessionValidation.reason };
    }

    const session = sessionValidation.session!;
    
    // Verificar permissões específicas
    const permission = session.permissions.find(p => 
      p.resource === resource && p.action === action && p.granted
    );

    if (!permission) {
      await auditService.logEvent(
        AuditEventType.PERMISSION_DENIED,
        session.userId,
        `access_denied_${resource}_${action}`,
        'authorization',
        resource,
        { ipAddress: session.ipAddress }
      );

      return { allowed: false, reason: 'Permission denied' };
    }

    // Verificar condições da permissão
    if (permission.conditions) {
      const conditionMet = await this.evaluatePermissionConditions(permission.conditions, session);
      if (!conditionMet) {
        return { allowed: false, reason: 'Permission conditions not met' };
      }
    }

    // Verificar expiração da permissão
    if (permission.expiresAt && new Date() > new Date(permission.expiresAt)) {
      return { allowed: false, reason: 'Permission expired' };
    }

    // Log de acesso autorizado
    await auditService.logEvent(
      AuditEventType.PERMISSION_GRANTED,
      session.userId,
      `access_granted_${resource}_${action}`,
      'authorization',
      resource,
      { ipAddress: session.ipAddress }
    );

    return { allowed: true };
  }

  private async evaluatePermissionConditions(
    conditions: PermissionCondition[], 
    session: UserSession
  ): Promise<boolean> {
    
    for (const condition of conditions) {
      let conditionMet = false;

      switch (condition.type) {
        case 'time':
          conditionMet = this.evaluateTimeCondition(condition);
          break;
        case 'location':
          conditionMet = this.evaluateLocationCondition(condition, session.location);
          break;
        case 'device':
          conditionMet = this.evaluateDeviceCondition(condition, session);
          break;
        case 'mfa':
          conditionMet = session.mfaVerified;
          break;
        case 'approval':
          conditionMet = await this.checkApprovalStatus(condition.value, session.userId);
          break;
      }

      if (!conditionMet) return false;
    }

    return true;
  }

  private evaluateTimeCondition(condition: PermissionCondition): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    
    switch (condition.operator) {
      case 'greater_than':
        return currentHour >= condition.value;
      case 'less_than':
        return currentHour <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(currentHour);
      default:
        return true;
    }
  }

  private evaluateLocationCondition(condition: PermissionCondition, location?: GeoLocation): boolean {
    if (!location) return false;
    
    switch (condition.operator) {
      case 'equals':
        return location.country === condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(location.country);
      default:
        return true;
    }
  }

  private evaluateDeviceCondition(condition: PermissionCondition, session: UserSession): boolean {
    switch (condition.operator) {
      case 'equals':
        return session.metadata.deviceTrusted === condition.value;
      default:
        return true;
    }
  }

  private async checkApprovalStatus(approvalId: string, userId: string): Promise<boolean> {
    // Em produção, verificar sistema de aprovações
    return false; // Por padrão, requer aprovação
  }

  /**
   * ============== AVALIAÇÃO DE AMEAÇAS ==============
   */

  private async assessThreat(ipAddress: string, userAgent: string, userId?: string): Promise<ThreatAssessment> {
    const existingAssessment = this.threatAssessments.get(ipAddress);
    
    // Se avaliação recente existe (< 1 hora), retornar
    if (existingAssessment && 
        new Date().getTime() - new Date(existingAssessment.lastUpdated).getTime() < 60 * 60 * 1000) {
      return existingAssessment;
    }

    const factors: ThreatFactor[] = [];
    let riskScore = 0;

    // 1. Verificar blacklist
    if (this.config.threatDetection.blacklistCheck) {
      const isBlacklisted = await this.checkBlacklist(ipAddress);
      if (isBlacklisted) {
        factors.push({
          type: 'blacklist',
          severity: 'critical',
          description: 'IP está em blacklist conhecida',
          score: 50
        });
        riskScore += 50;
      }
    }

    // 2. Verificar reputação
    if (this.config.threatDetection.reputationCheck) {
      const reputation = await this.checkReputation(ipAddress);
      if (reputation === 'bad') {
        factors.push({
          type: 'reputation',
          severity: 'high',
          description: 'IP com má reputação',
          score: 30
        });
        riskScore += 30;
      }
    }

    // 3. Verificar geolocalização suspeita
    const location = await this.detectLocation(ipAddress);
    if (location && this.isSuspiciousLocation(location)) {
      factors.push({
        type: 'geolocation',
        severity: 'medium',
        description: 'Localização geográfica suspeita',
        score: 20
      });
      riskScore += 20;
    }

    // 4. Detectar bot
    if (this.config.threatDetection.botDetection) {
      const isBot = this.detectBot(userAgent);
      if (isBot) {
        factors.push({
          type: 'behavior',
          severity: 'high',
          description: 'Comportamento de bot detectado',
          score: 35
        });
        riskScore += 35;
      }
    }

    // 5. Detectar força bruta
    if (this.config.threatDetection.bruteForceDetection && userId) {
      const recentFailures = this.getRecentFailedAttempts(userId, 15 * 60 * 1000); // 15 min
      if (recentFailures >= 3) {
        factors.push({
          type: 'pattern',
          severity: 'high',
          description: 'Padrão de força bruta detectado',
          score: 40
        });
        riskScore += 40;
      }
    }

    // Determinar recomendação
    let recommendation: 'allow' | 'challenge' | 'block';
    if (riskScore >= 80) recommendation = 'block';
    else if (riskScore >= this.config.threatDetection.riskThreshold) recommendation = 'challenge';
    else recommendation = 'allow';

    const assessment: ThreatAssessment = {
      ipAddress,
      riskScore: Math.min(riskScore, 100),
      factors,
      recommendation,
      lastUpdated: new Date().toISOString(),
      reputation: this.determineReputation(riskScore)
    };

    this.threatAssessments.set(ipAddress, assessment);
    return assessment;
  }

  private async checkBlacklist(ipAddress: string): Promise<boolean> {
    // Em produção, consultar serviços de blacklist
    const knownBadIPs = ['1.2.3.4', '5.6.7.8'];
    return knownBadIPs.includes(ipAddress);
  }

  private async checkReputation(ipAddress: string): Promise<'good' | 'neutral' | 'bad' | 'unknown'> {
    // Em produção, consultar serviços de reputação
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) return 'good';
    return 'neutral';
  }

  private detectBot(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  private isSuspiciousLocation(location: GeoLocation): boolean {
    // Lista de países/regiões considerados suspeitos
    const suspiciousCountries = this.config.ipWhitelist.geoRestrictions;
    return suspiciousCountries.includes(location.country);
  }

  private determineReputation(riskScore: number): 'good' | 'neutral' | 'bad' | 'unknown' {
    if (riskScore >= 70) return 'bad';
    if (riskScore >= 40) return 'neutral';
    return 'good';
  }

  /**
   * ============== POLÍTICA DE BLOQUEIO ==============
   */

  private async applyLockoutPolicy(userId: string, ipAddress: string): Promise<void> {
    if (!this.config.lockoutPolicy.enabled) return;

    const recentAttempts = this.getRecentFailedAttempts(userId, 60 * 60 * 1000); // 1 hora
    
    if (recentAttempts >= this.config.lockoutPolicy.maxAttempts) {
      let lockoutDuration = this.config.lockoutPolicy.lockoutDuration;
      
      // Bloqueio progressivo
      if (this.config.lockoutPolicy.progressiveLockout) {
        const previousLockouts = this.countPreviousLockouts(userId);
        lockoutDuration *= Math.pow(2, previousLockouts); // Duplica a cada bloqueio
      }

      const expiresAt = new Date(Date.now() + lockoutDuration * 60 * 1000);
      
      const lockout: UserLockout = {
        userId,
        lockedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        reason: 'Too many failed login attempts',
        attempts: recentAttempts,
        ipAddress,
        unlockCode: this.generateUnlockCode(),
        adminOverride: false
      };

      this.userLockouts.set(userId, lockout);

      // Notificar admin se configurado
      if (this.config.lockoutPolicy.notifyAdmin) {
        console.warn(`[ACCESS_CONTROL] Usuário ${userId} bloqueado após ${recentAttempts} tentativas`);
      }

      // Log de auditoria
      await auditService.logEvent(
        AuditEventType.SECURITY_ALERT,
        userId,
        'user_locked_out',
        'security',
        userId,
        { ipAddress }
      );

      await this.saveToStorage();
    }
  }

  private getRecentFailedAttempts(userId: string, timeWindow: number): number {
    const userAttempts = this.accessAttempts.get(userId) || [];
    const since = new Date(Date.now() - timeWindow);
    
    return userAttempts.filter(attempt => 
      attempt.result === 'failure' && 
      new Date(attempt.timestamp) >= since
    ).length;
  }

  private countPreviousLockouts(userId: string): number {
    // Em produção, contar bloqueios históricos
    return 0;
  }

  private clearFailedAttempts(userId: string): void {
    const userAttempts = this.accessAttempts.get(userId) || [];
    const successfulAttempts = userAttempts.filter(attempt => attempt.result === 'success');
    this.accessAttempts.set(userId, successfulAttempts);
  }

  async unlockUser(userId: string, unlockCode?: string, adminOverride: boolean = false): Promise<boolean> {
    const lockout = this.userLockouts.get(userId);
    if (!lockout) return false;

    if (!adminOverride && lockout.unlockCode !== unlockCode) {
      return false;
    }

    this.userLockouts.delete(userId);
    this.clearFailedAttempts(userId);

    await auditService.logEvent(
      AuditEventType.ADMIN_ACTION,
      adminOverride ? 'admin' : userId,
      'user_unlocked',
      'security',
      userId
    );

    await this.saveToStorage();
    return true;
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private recordAccessAttempt(attempt: AccessAttempt): void {
    const userAttempts = this.accessAttempts.get(attempt.userId) || [];
    userAttempts.push(attempt);
    
    // Manter apenas últimas 100 tentativas por usuário
    if (userAttempts.length > 100) {
      userAttempts.splice(0, userAttempts.length - 100);
    }
    
    this.accessAttempts.set(attempt.userId, userAttempts);
  }

  private async detectLocation(ipAddress: string): Promise<GeoLocation | undefined> {
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

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
    // Em produção, usar algoritmo mais sofisticado
    return btoa(`${userAgent}:${ipAddress}`).substr(0, 16);
  }

  private generateUnlockCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  private isDeviceTrusted(userId: string, fingerprint: string): boolean {
    const trustedDevices = this.trustedDevices.get(userId);
    return trustedDevices ? trustedDevices.has(fingerprint) : false;
  }

  private isLocationTrusted(userId: string, location?: GeoLocation): boolean {
    // Em produção, verificar localizações confiáveis do usuário
    return true; // Por padrão, confiar em localizações
  }

  private async getUserPermissions(userId: string): Promise<Permission[]> {
    // Em produção, buscar do banco de dados baseado em roles
    return [
      {
        resource: 'patients',
        action: 'read',
        granted: true,
        source: 'role'
      },
      {
        resource: 'documents',
        action: 'create',
        granted: true,
        source: 'role'
      },
      {
        resource: 'admin',
        action: '*',
        granted: false,
        source: 'role'
      }
    ];
  }

  private async getUserTenantId(userId: string): Promise<string> {
    // Em produção, buscar do banco de dados
    return 'default_tenant';
  }

  private startPeriodicTasks(): void {
    // Limpeza de sessões expiradas a cada 15 minutos
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupExpiredLockouts();
      this.cleanupOldAttempts();
    }, 15 * 60 * 1000);
  }

  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt) || !session.isActive) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ACCESS_CONTROL] Limpeza: ${cleanedCount} sessões expiradas removidas`);
      this.saveToStorage();
    }
  }

  private cleanupExpiredLockouts(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [userId, lockout] of this.userLockouts.entries()) {
      if (now > new Date(lockout.expiresAt)) {
        this.userLockouts.delete(userId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ACCESS_CONTROL] Limpeza: ${cleanedCount} bloqueios expirados removidos`);
      this.saveToStorage();
    }
  }

  private cleanupOldAttempts(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 dias
    let cleanedCount = 0;

    for (const [userId, attempts] of this.accessAttempts.entries()) {
      const filteredAttempts = attempts.filter(attempt => 
        new Date(attempt.timestamp) > cutoff
      );
      
      if (filteredAttempts.length !== attempts.length) {
        this.accessAttempts.set(userId, filteredAttempts);
        cleanedCount += attempts.length - filteredAttempts.length;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[ACCESS_CONTROL] Limpeza: ${cleanedCount} tentativas antigas removidas`);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_access_control');
      if (saved) {
        const data = JSON.parse(saved);
        this.sessions = new Map(data.sessions || []);
        this.accessAttempts = new Map(data.accessAttempts || []);
        this.userLockouts = new Map(data.userLockouts || []);
        this.threatAssessments = new Map(data.threatAssessments || []);
        this.passwordHistory = new Map(data.passwordHistory || []);
        this.trustedDevices = new Map(
          (data.trustedDevices || []).map(([key, value]: [string, string[]]) => [key, new Set(value)])
        );
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de controle de acesso:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        sessions: Array.from(this.sessions.entries()),
        accessAttempts: Array.from(this.accessAttempts.entries()),
        userLockouts: Array.from(this.userLockouts.entries()),
        threatAssessments: Array.from(this.threatAssessments.entries()),
        passwordHistory: Array.from(this.passwordHistory.entries()),
        trustedDevices: Array.from(this.trustedDevices.entries()).map(([key, value]) => [key, Array.from(value)])
      };
      localStorage.setItem('fisioflow_access_control', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados de controle de acesso:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  getActiveSessions(userId?: string): UserSession[] {
    const sessions = Array.from(this.sessions.values()).filter(s => s.isActive);
    return userId ? sessions.filter(s => s.userId === userId) : sessions;
  }

  getAccessAttempts(userId: string, limit: number = 50): AccessAttempt[] {
    const attempts = this.accessAttempts.get(userId) || [];
    return attempts.slice(-limit).reverse();
  }

  getUserLockout(userId: string): UserLockout | null {
    return this.userLockouts.get(userId) || null;
  }

  getThreatAssessment(ipAddress: string): ThreatAssessment | null {
    return this.threatAssessments.get(ipAddress) || null;
  }

  updateConfig(newConfig: Partial<AccessControlConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[ACCESS_CONTROL] Configuração atualizada');
  }

  getConfig(): AccessControlConfig {
    return { ...this.config };
  }

  getSecurityStats(): {
    activeSessions: number;
    lockedUsers: number;
    highRiskIPs: number;
    recentFailures: number;
    totalAttempts: number;
  } {
    const activeSessions = this.getActiveSessions().length;
    const lockedUsers = this.userLockouts.size;
    const highRiskIPs = Array.from(this.threatAssessments.values()).filter(t => t.riskScore >= 70).length;
    const recentFailures = Array.from(this.accessAttempts.values())
      .flat()
      .filter(a => a.result === 'failure' && 
        new Date().getTime() - new Date(a.timestamp).getTime() < 24 * 60 * 60 * 1000
      ).length;
    const totalAttempts = Array.from(this.accessAttempts.values()).reduce((sum, attempts) => sum + attempts.length, 0);

    return {
      activeSessions,
      lockedUsers,
      highRiskIPs,
      recentFailures,
      totalAttempts
    };
  }

  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    if (!this.trustedDevices.has(userId)) {
      this.trustedDevices.set(userId, new Set());
    }
    
    this.trustedDevices.get(userId)!.add(deviceFingerprint);
    await this.saveToStorage();
    
    console.log(`[ACCESS_CONTROL] Dispositivo confiável adicionado para usuário ${userId}`);
  }

  async untrustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    const devices = this.trustedDevices.get(userId);
    if (devices) {
      devices.delete(deviceFingerprint);
      await this.saveToStorage();
    }
  }

  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }
}

// Instância singleton
export const accessControlService = new AccessControlService();

// Funções de conveniência
export async function authenticateUser(
  userId: string,
  password: string,
  ipAddress: string,
  userAgent: string,
  mfaCode?: string
) {
  return await accessControlService.authenticateUser(userId, password, ipAddress, userAgent, mfaCode);
}

export async function validateSession(sessionId: string) {
  return await accessControlService.validateSession(sessionId);
}

export async function checkPermission(sessionId: string, resource: string, action: string) {
  return await accessControlService.checkPermission(sessionId, resource, action);
}

export async function terminateSession(sessionId: string, reason: string = 'manual') {
  return await accessControlService.terminateSession(sessionId, reason);
}

export function getSecurityStats() {
  return accessControlService.getSecurityStats();
}

export default accessControlService;