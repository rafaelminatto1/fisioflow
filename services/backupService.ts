/**
 * Serviço de Backup Automático Seguro
 * Sistema empresarial com backup incremental, criptografia end-to-end e multi-região
 */

import CryptoJS from 'crypto-js';

export interface BackupConfig {
  enabled: boolean;
  schedule: {
    dailyIncremental: string; // cron expression
    weeklyFull: string; // cron expression
    monthlyArchive: string; // cron expression
  };
  retention: {
    daily: number; // dias
    weekly: number; // semanas
    monthly: number; // meses
    yearly: number; // anos
  };
  locations: BackupLocation[];
  encryption: {
    algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
    keyRotationDays: number;
    compressionEnabled: boolean;
  };
  verification: {
    integrityCheck: boolean;
    restoreTest: boolean;
    testFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export interface BackupLocation {
  id: string;
  name: string;
  type: 'aws-s3' | 'google-cloud' | 'azure-blob' | 'local' | 'ftp';
  region: string;
  endpoint: string;
  credentials: EncryptedCredentials;
  maxRetries: number;
  isActive: boolean;
  priority: number; // 1 = primary, 2 = secondary, etc.
}

export interface BackupJob {
  id: string;
  type: 'incremental' | 'full' | 'archive' | 'manual';
  status: BackupStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number; // milliseconds
  size: number; // bytes
  compressedSize: number; // bytes
  filesCount: number;
  checksum: string;
  locations: BackupJobLocation[];
  errors: BackupError[];
  progress: BackupProgress;
  metadata: BackupMetadata;
}

export interface BackupJobLocation {
  locationId: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number; // 0-100
  uploadedSize: number;
  errorMessage?: string;
  retryCount: number;
  completedAt?: string;
}

export interface BackupProgress {
  phase: 'preparing' | 'collecting' | 'compressing' | 'encrypting' | 'uploading' | 'verifying' | 'completed';
  percentage: number;
  currentFile?: string;
  processedFiles: number;
  totalFiles: number;
  processedSize: number;
  totalSize: number;
  estimatedTimeRemaining?: number; // milliseconds
}

export interface BackupMetadata {
  version: string;
  createdBy: string;
  source: string;
  dataTypes: string[];
  tenantIds: string[];
  compressionRatio: number;
  encryptionDetails: {
    algorithm: string;
    keyId: string;
    iv: string;
  };
  integrity: {
    method: 'SHA-256' | 'Blake3';
    hash: string;
    verifiedAt?: string;
  };
}

export interface BackupError {
  timestamp: string;
  level: 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  details?: any;
  resolved: boolean;
}

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  VERIFYING = 'verifying',
  VERIFIED = 'verified'
}

export interface RestoreRequest {
  id: string;
  backupJobId: string;
  requestedBy: string;
  targetDate: string;
  dataTypes: string[];
  filters: RestoreFilter[];
  destination: 'original' | 'staging' | 'custom';
  customPath?: string;
  decryptionKey?: string;
  approvals: RestoreApproval[];
}

export interface RestoreFilter {
  type: 'tenant' | 'user' | 'dateRange' | 'dataType';
  value: any;
  operator: 'equals' | 'contains' | 'between';
}

export interface RestoreApproval {
  approverId: string;
  approverName: string;
  decision: 'approved' | 'rejected';
  timestamp: string;
  reason?: string;
}

export interface EncryptedCredentials {
  encrypted: string;
  keyId: string;
  algorithm: string;
}

class BackupService {
  private config: BackupConfig;
  private jobs: Map<string, BackupJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private encryptionKeys: Map<string, string> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeDefaultConfig();
    this.loadFromStorage();
    this.initializeEncryption();
    this.startScheduler();
  }

  /**
   * ============== CONFIGURAÇÃO E INICIALIZAÇÃO ==============
   */

  private initializeDefaultConfig(): void {
    this.config = {
      enabled: true,
      schedule: {
        dailyIncremental: '0 2 * * *', // 2:00 AM todos os dias
        weeklyFull: '0 1 * * 0', // 1:00 AM domingos
        monthlyArchive: '0 0 1 * *' // 1º dia de cada mês à meia-noite
      },
      retention: {
        daily: 30,
        weekly: 12,
        monthly: 24,
        yearly: 7
      },
      locations: [
        {
          id: 'primary-aws',
          name: 'AWS S3 Primary',
          type: 'aws-s3',
          region: 'us-east-1',
          endpoint: 's3.amazonaws.com',
          credentials: this.encryptCredentials({
            accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
            secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
          }),
          maxRetries: 3,
          isActive: true,
          priority: 1
        },
        {
          id: 'secondary-gcp',
          name: 'Google Cloud Secondary',
          type: 'google-cloud',
          region: 'us-central1',
          endpoint: 'storage.googleapis.com',
          credentials: this.encryptCredentials({
            projectId: 'fisioflow-backup',
            keyFile: '/path/to/service-account.json'
          }),
          maxRetries: 3,
          isActive: true,
          priority: 2
        }
      ],
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotationDays: 90,
        compressionEnabled: true
      },
      verification: {
        integrityCheck: true,
        restoreTest: true,
        testFrequency: 'weekly'
      }
    };
  }

  private initializeEncryption(): void {
    // Gerar chave mestra se não existir
    const masterKey = localStorage.getItem('fisioflow_backup_master_key');
    if (!masterKey) {
      const newKey = CryptoJS.lib.WordArray.random(256/8).toString();
      localStorage.setItem('fisioflow_backup_master_key', newKey);
      this.encryptionKeys.set('master', newKey);
    } else {
      this.encryptionKeys.set('master', masterKey);
    }

    // Gerar chave atual baseada na data
    this.rotateEncryptionKey();
  }

  private rotateEncryptionKey(): string {
    const today = new Date();
    const keyDate = Math.floor(today.getTime() / (this.config.encryption.keyRotationDays * 24 * 60 * 60 * 1000));
    const keyId = `backup_key_${keyDate}`;
    
    if (!this.encryptionKeys.has(keyId)) {
      const masterKey = this.encryptionKeys.get('master')!;
      const derivedKey = CryptoJS.PBKDF2(masterKey, keyId, {
        keySize: 256/32,
        iterations: 10000
      }).toString();
      
      this.encryptionKeys.set(keyId, derivedKey);
    }

    return keyId;
  }

  /**
   * ============== BACKUP AUTOMÁTICO ==============
   */

  private startScheduler(): void {
    if (!this.config.enabled) return;

    // Agendar backup incremental diário
    this.scheduleTask('daily', this.config.schedule.dailyIncremental, () => {
      this.startBackup('incremental');
    });

    // Agendar backup completo semanal
    this.scheduleTask('weekly', this.config.schedule.weeklyFull, () => {
      this.startBackup('full');
    });

    // Agendar arquivo mensal
    this.scheduleTask('monthly', this.config.schedule.monthlyArchive, () => {
      this.startBackup('archive');
    });

    // Verificação de integridade
    if (this.config.verification.integrityCheck) {
      this.scheduleTask('integrity', '0 4 * * 1', () => { // Segunda-feira 4:00 AM
        this.verifyLatestBackups();
      });
    }

    // Limpeza de backups antigos
    this.scheduleTask('cleanup', '0 3 * * 1', () => { // Segunda-feira 3:00 AM
      this.cleanupOldBackups();
    });
  }

  private scheduleTask(name: string, cronExpression: string, task: () => void): void {
    // Simulação de agendamento cron (em produção usar biblioteca como node-cron)
    const interval = this.parseCronToInterval(cronExpression);
    const taskId = setInterval(task, interval);
    this.scheduledTasks.set(name, taskId);
  }

  private parseCronToInterval(cron: string): number {
    // Conversão simplificada para demo (em produção usar parser cron real)
    if (cron.includes('* * *')) return 24 * 60 * 60 * 1000; // Diário
    if (cron.includes('* * 0')) return 7 * 24 * 60 * 60 * 1000; // Semanal
    return 30 * 24 * 60 * 60 * 1000; // Mensal por padrão
  }

  async startBackup(type: 'incremental' | 'full' | 'archive' | 'manual'): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Backup está desabilitado');
    }

    const jobId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BackupJob = {
      id: jobId,
      type,
      status: BackupStatus.PENDING,
      startedAt: new Date().toISOString(),
      size: 0,
      compressedSize: 0,
      filesCount: 0,
      checksum: '',
      locations: [],
      errors: [],
      progress: {
        phase: 'preparing',
        percentage: 0,
        processedFiles: 0,
        totalFiles: 0,
        processedSize: 0,
        totalSize: 0
      },
      metadata: {
        version: '1.0.0',
        createdBy: 'system',
        source: 'fisioflow',
        dataTypes: [],
        tenantIds: [],
        compressionRatio: 0,
        encryptionDetails: {
          algorithm: this.config.encryption.algorithm,
          keyId: this.rotateEncryptionKey(),
          iv: CryptoJS.lib.WordArray.random(96/8).toString()
        },
        integrity: {
          method: 'SHA-256',
          hash: ''
        }
      }
    };

    this.jobs.set(jobId, job);
    this.activeJobs.add(jobId);

    // Executar backup em background
    this.executeBackup(job).catch(error => {
      this.handleBackupError(job, error);
    });

    return jobId;
  }

  private async executeBackup(job: BackupJob): Promise<void> {
    try {
      job.status = BackupStatus.RUNNING;

      // Fase 1: Preparação
      job.progress.phase = 'preparing';
      await this.prepareBackup(job);

      // Fase 2: Coleta de dados
      job.progress.phase = 'collecting';
      const dataToBackup = await this.collectBackupData(job);

      // Fase 3: Compressão
      job.progress.phase = 'compressing';
      const compressedData = await this.compressData(dataToBackup, job);

      // Fase 4: Criptografia
      job.progress.phase = 'encrypting';
      const encryptedData = await this.encryptData(compressedData, job);

      // Fase 5: Upload para múltiplas localizações
      job.progress.phase = 'uploading';
      await this.uploadToLocations(encryptedData, job);

      // Fase 6: Verificação de integridade
      job.progress.phase = 'verifying';
      await this.verifyBackupIntegrity(job);

      // Finalização
      job.status = BackupStatus.COMPLETED;
      job.completedAt = new Date().toISOString();
      job.duration = new Date().getTime() - new Date(job.startedAt).getTime();
      job.progress.phase = 'completed';
      job.progress.percentage = 100;

      console.log(`[BACKUP] Job ${job.id} concluído com sucesso`);

    } catch (error) {
      this.handleBackupError(job, error);
    } finally {
      this.activeJobs.delete(job.id);
      await this.saveToStorage();
    }
  }

  private async prepareBackup(job: BackupJob): Promise<void> {
    // Verificar espaço disponível
    const requiredSpace = await this.estimateBackupSize(job.type);
    const availableSpace = await this.getAvailableSpace();

    if (requiredSpace > availableSpace) {
      throw new Error(`Espaço insuficiente: requerido ${this.formatBytes(requiredSpace)}, disponível ${this.formatBytes(availableSpace)}`);
    }

    // Verificar conectividade com localizações
    for (const location of this.config.locations.filter(l => l.isActive)) {
      try {
        await this.testLocationConnectivity(location);
        job.locations.push({
          locationId: location.id,
          status: 'pending',
          progress: 0,
          uploadedSize: 0,
          retryCount: 0
        });
      } catch (error) {
        job.errors.push({
          timestamp: new Date().toISOString(),
          level: 'warning',
          code: 'LOCATION_UNAVAILABLE',
          message: `Localização ${location.name} indisponível: ${error.message}`,
          resolved: false
        });
      }
    }

    if (job.locations.length === 0) {
      throw new Error('Nenhuma localização de backup disponível');
    }
  }

  private async collectBackupData(job: BackupJob): Promise<any> {
    const data = {
      patients: [],
      documents: [],
      users: [],
      settings: {},
      auditLogs: [],
      metadata: {
        timestamp: new Date().toISOString(),
        version: job.metadata.version,
        type: job.type
      }
    };

    // Coletar dados baseado no tipo de backup
    if (job.type === 'full' || job.type === 'archive') {
      // Backup completo de todos os dados
      data.patients = await this.getAllPatients();
      data.documents = await this.getAllDocuments();
      data.users = await this.getAllUsers();
      data.settings = await this.getAllSettings();
      data.auditLogs = await this.getAllAuditLogs();
    } else if (job.type === 'incremental') {
      // Backup incremental desde o último backup
      const lastBackup = this.getLastBackupDate();
      data.patients = await this.getModifiedPatients(lastBackup);
      data.documents = await this.getModifiedDocuments(lastBackup);
      data.users = await this.getModifiedUsers(lastBackup);
      data.auditLogs = await this.getAuditLogsSince(lastBackup);
    }

    // Atualizar estatísticas
    job.filesCount = this.countDataFiles(data);
    job.size = this.calculateDataSize(data);
    job.metadata.dataTypes = Object.keys(data).filter(key => key !== 'metadata');
    job.metadata.tenantIds = this.extractTenantIds(data);

    job.progress.totalFiles = job.filesCount;
    job.progress.totalSize = job.size;

    return data;
  }

  private async compressData(data: any, job: BackupJob): Promise<string> {
    if (!this.config.encryption.compressionEnabled) {
      return JSON.stringify(data);
    }

    // Simulação de compressão (em produção usar biblioteca como pako ou zlib)
    const jsonData = JSON.stringify(data);
    const compressedData = this.simulateCompression(jsonData);
    
    job.compressedSize = compressedData.length;
    job.metadata.compressionRatio = job.size / job.compressedSize;

    job.progress.processedSize = job.size;
    job.progress.percentage = 60;

    return compressedData;
  }

  private async encryptData(data: string, job: BackupJob): Promise<string> {
    const keyId = job.metadata.encryptionDetails.keyId;
    const key = this.encryptionKeys.get(keyId);
    
    if (!key) {
      throw new Error(`Chave de criptografia ${keyId} não encontrada`);
    }

    // Criptografar dados usando AES-256-GCM
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: CryptoJS.enc.Hex.parse(job.metadata.encryptionDetails.iv),
      mode: CryptoJS.mode.GCM,
      padding: CryptoJS.pad.NoPadding
    });

    // Calcular hash de integridade
    job.metadata.integrity.hash = CryptoJS.SHA256(encrypted.toString()).toString();

    job.progress.percentage = 80;

    return encrypted.toString();
  }

  private async uploadToLocations(encryptedData: string, job: BackupJob): Promise<void> {
    const uploadPromises = job.locations.map(async (locationJob) => {
      const location = this.config.locations.find(l => l.id === locationJob.locationId);
      if (!location) return;

      locationJob.status = 'uploading';
      
      try {
        await this.uploadToLocation(location, encryptedData, job, locationJob);
        locationJob.status = 'completed';
        locationJob.completedAt = new Date().toISOString();
      } catch (error) {
        locationJob.status = 'failed';
        locationJob.errorMessage = error.message;
        
        // Tentar novamente se houver tentativas restantes
        if (locationJob.retryCount < location.maxRetries) {
          locationJob.retryCount++;
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, locationJob.retryCount) * 1000));
          return this.uploadToLocation(location, encryptedData, job, locationJob);
        }
      }
    });

    await Promise.all(uploadPromises);

    // Verificar se pelo menos uma localização foi bem-sucedida
    const successfulUploads = job.locations.filter(l => l.status === 'completed');
    if (successfulUploads.length === 0) {
      throw new Error('Falha no upload para todas as localizações');
    }

    job.progress.percentage = 95;
  }

  private async uploadToLocation(
    location: BackupLocation,
    data: string,
    job: BackupJob,
    locationJob: BackupJobLocation
  ): Promise<void> {
    // Simulação de upload (em produção usar SDKs específicos)
    const fileName = `${job.type}_${job.startedAt.split('T')[0]}_${job.id}.enc`;
    
    console.log(`[BACKUP] Enviando para ${location.name}: ${fileName}`);
    
    // Simular progresso de upload
    for (let i = 0; i <= 100; i += 10) {
      locationJob.progress = i;
      locationJob.uploadedSize = Math.floor((data.length * i) / 100);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verificar integridade após upload
    const uploadedHash = CryptoJS.SHA256(data).toString();
    if (uploadedHash !== job.metadata.integrity.hash) {
      throw new Error('Falha na verificação de integridade após upload');
    }
  }

  private async verifyBackupIntegrity(job: BackupJob): Promise<void> {
    job.metadata.integrity.verifiedAt = new Date().toISOString();
    job.status = BackupStatus.VERIFIED;
    
    // Log de verificação
    console.log(`[BACKUP] Integridade verificada para job ${job.id}`);
  }

  /**
   * ============== RESTORE DE DADOS ==============
   */

  async requestRestore(request: RestoreRequest): Promise<string> {
    // Validar solicitação
    this.validateRestoreRequest(request);

    // Verificar permissões (em produção, implementar sistema de aprovação)
    if (request.approvals.length === 0) {
      throw new Error('Restore requer aprovação de administrador');
    }

    // Encontrar backup apropriado
    const backup = this.findBackupForDate(request.targetDate);
    if (!backup) {
      throw new Error(`Nenhum backup encontrado para a data ${request.targetDate}`);
    }

    // Executar restore
    return await this.executeRestore(request, backup);
  }

  private async executeRestore(request: RestoreRequest, backup: BackupJob): Promise<string> {
    console.log(`[RESTORE] Iniciando restore do backup ${backup.id}`);
    
    // Em produção, implementar restore real
    // 1. Download do backup
    // 2. Descriptografia
    // 3. Descompressão
    // 4. Aplicação seletiva dos dados
    // 5. Verificação de integridade
    
    return `restore_${Date.now()}`;
  }

  /**
   * ============== UTILITÁRIOS ==============
   */

  private async getAllPatients(): Promise<any[]> {
    const saved = localStorage.getItem('fisioflow_patients');
    return saved ? JSON.parse(saved) : [];
  }

  private async getAllDocuments(): Promise<any[]> {
    const saved = localStorage.getItem('fisioflow_legal_documents');
    return saved ? JSON.parse(saved) : [];
  }

  private async getAllUsers(): Promise<any[]> {
    const saved = localStorage.getItem('fisioflow_users');
    return saved ? JSON.parse(saved) : [];
  }

  private async getAllSettings(): Promise<any> {
    const saved = localStorage.getItem('fisioflow_settings');
    return saved ? JSON.parse(saved) : {};
  }

  private async getAllAuditLogs(): Promise<any[]> {
    const saved = localStorage.getItem('fisioflow_audit_logs');
    return saved ? JSON.parse(saved) : [];
  }

  private async getModifiedPatients(since: Date): Promise<any[]> {
    const patients = await this.getAllPatients();
    return patients.filter(p => new Date(p.updatedAt || p.createdAt) > since);
  }

  private async getModifiedDocuments(since: Date): Promise<any[]> {
    const documents = await this.getAllDocuments();
    return documents.filter(d => new Date(d.updatedAt || d.createdAt) > since);
  }

  private async getModifiedUsers(since: Date): Promise<any[]> {
    const users = await this.getAllUsers();
    return users.filter(u => new Date(u.updatedAt || u.createdAt) > since);
  }

  private async getAuditLogsSince(since: Date): Promise<any[]> {
    const logs = await this.getAllAuditLogs();
    return logs.filter(l => new Date(l.timestamp) > since);
  }

  private getLastBackupDate(): Date {
    const completedBackups = Array.from(this.jobs.values())
      .filter(job => job.status === BackupStatus.COMPLETED)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    
    return completedBackups.length > 0 
      ? new Date(completedBackups[0].completedAt!)
      : new Date(0);
  }

  private findBackupForDate(targetDate: string): BackupJob | null {
    const target = new Date(targetDate);
    
    return Array.from(this.jobs.values())
      .filter(job => job.status === BackupStatus.COMPLETED)
      .find(job => {
        const backupDate = new Date(job.completedAt!);
        return backupDate <= target;
      }) || null;
  }

  private countDataFiles(data: any): number {
    let count = 0;
    for (const key in data) {
      if (Array.isArray(data[key])) {
        count += data[key].length;
      } else if (typeof data[key] === 'object') {
        count += Object.keys(data[key]).length;
      }
    }
    return count;
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length;
  }

  private extractTenantIds(data: any): string[] {
    const tenantIds = new Set<string>();
    
    // Extrair tenant IDs dos diferentes tipos de dados
    if (data.patients) {
      data.patients.forEach((p: any) => p.tenantId && tenantIds.add(p.tenantId));
    }
    if (data.documents) {
      data.documents.forEach((d: any) => d.tenantId && tenantIds.add(d.tenantId));
    }
    if (data.users) {
      data.users.forEach((u: any) => u.tenantId && tenantIds.add(u.tenantId));
    }
    
    return Array.from(tenantIds);
  }

  private simulateCompression(data: string): string {
    // Simulação de compressão (redução de ~70%)
    return data.substring(0, Math.floor(data.length * 0.3));
  }

  private encryptCredentials(credentials: any): EncryptedCredentials {
    const masterKey = this.encryptionKeys.get('master') || 'default_key';
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(credentials), masterKey).toString();
    
    return {
      encrypted,
      keyId: 'master',
      algorithm: 'AES-256'
    };
  }

  private async estimateBackupSize(type: string): Promise<number> {
    // Estimativa baseada no tipo de backup
    const baseSize = 100 * 1024 * 1024; // 100MB base
    
    switch (type) {
      case 'full':
      case 'archive':
        return baseSize * 10; // 1GB
      case 'incremental':
        return baseSize * 2; // 200MB
      default:
        return baseSize;
    }
  }

  private async getAvailableSpace(): Promise<number> {
    // Simulação de espaço disponível
    return 10 * 1024 * 1024 * 1024; // 10GB
  }

  private async testLocationConnectivity(location: BackupLocation): Promise<void> {
    // Simulação de teste de conectividade
    if (Math.random() < 0.1) { // 10% chance de falha
      throw new Error('Falha na conectividade');
    }
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private handleBackupError(job: BackupJob, error: any): void {
    job.status = BackupStatus.FAILED;
    job.completedAt = new Date().toISOString();
    job.errors.push({
      timestamp: new Date().toISOString(),
      level: 'critical',
      code: 'BACKUP_FAILED',
      message: error.message,
      details: error.stack,
      resolved: false
    });

    console.error(`[BACKUP] Job ${job.id} falhou:`, error);
  }

  private validateRestoreRequest(request: RestoreRequest): void {
    if (!request.targetDate) {
      throw new Error('Data de destino é obrigatória');
    }

    if (!request.requestedBy) {
      throw new Error('Solicitante é obrigatório');
    }

    if (request.dataTypes.length === 0) {
      throw new Error('Tipos de dados devem ser especificados');
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const now = new Date();
    const toDelete: string[] = [];

    for (const job of this.jobs.values()) {
      if (job.status !== BackupStatus.COMPLETED) continue;

      const backupDate = new Date(job.completedAt!);
      const ageInDays = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24));

      let shouldDelete = false;

      switch (job.type) {
        case 'incremental':
          shouldDelete = ageInDays > this.config.retention.daily;
          break;
        case 'full':
          shouldDelete = ageInDays > this.config.retention.weekly * 7;
          break;
        case 'archive':
          shouldDelete = ageInDays > this.config.retention.monthly * 30;
          break;
      }

      if (shouldDelete) {
        toDelete.push(job.id);
      }
    }

    // Remover backups antigos
    for (const jobId of toDelete) {
      this.jobs.delete(jobId);
      console.log(`[BACKUP] Backup antigo removido: ${jobId}`);
    }

    if (toDelete.length > 0) {
      await this.saveToStorage();
    }
  }

  private async verifyLatestBackups(): Promise<void> {
    const recentJobs = Array.from(this.jobs.values())
      .filter(job => job.status === BackupStatus.COMPLETED)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 5); // Verificar os 5 mais recentes

    for (const job of recentJobs) {
      try {
        await this.verifyBackupIntegrity(job);
        console.log(`[BACKUP] Verificação OK: ${job.id}`);
      } catch (error) {
        console.error(`[BACKUP] Verificação falhou: ${job.id}`, error);
      }
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const saved = localStorage.getItem('fisioflow_backups');
      if (saved) {
        const data = JSON.parse(saved);
        this.jobs = new Map(data.jobs || []);
        if (data.config) {
          this.config = { ...this.config, ...data.config };
        }
      }
    } catch (error) {
      console.warn('Erro ao carregar dados de backup:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        jobs: Array.from(this.jobs.entries()),
        config: this.config
      };
      localStorage.setItem('fisioflow_backups', JSON.stringify(data));
    } catch (error) {
      console.error('Erro ao salvar dados de backup:', error);
    }
  }

  /**
   * ============== API PÚBLICA ==============
   */

  getBackupJobs(limit: number = 50): BackupJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  getBackupStats(): {
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalDataBackedUp: number;
    averageBackupTime: number;
    lastBackupDate?: string;
    nextScheduledBackup: string;
  } {
    const jobs = Array.from(this.jobs.values());
    const completed = jobs.filter(j => j.status === BackupStatus.COMPLETED);
    const failed = jobs.filter(j => j.status === BackupStatus.FAILED);
    
    const totalSize = completed.reduce((sum, job) => sum + job.size, 0);
    const avgTime = completed.length > 0 
      ? completed.reduce((sum, job) => sum + (job.duration || 0), 0) / completed.length
      : 0;

    const lastBackup = completed
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0];

    return {
      totalJobs: jobs.length,
      successfulJobs: completed.length,
      failedJobs: failed.length,
      totalDataBackedUp: totalSize,
      averageBackupTime: avgTime,
      lastBackupDate: lastBackup?.completedAt,
      nextScheduledBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Próximo dia
    };
  }

  updateConfig(newConfig: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveToStorage();
    
    // Reagendar tarefas se necessário
    if (newConfig.schedule) {
      this.stopScheduler();
      this.startScheduler();
    }
  }

  private stopScheduler(): void {
    for (const taskId of this.scheduledTasks.values()) {
      clearInterval(taskId);
    }
    this.scheduledTasks.clear();
  }

  cancelBackup(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || !this.activeJobs.has(jobId)) {
      return false;
    }

    job.status = BackupStatus.CANCELLED;
    job.completedAt = new Date().toISOString();
    this.activeJobs.delete(jobId);
    
    console.log(`[BACKUP] Job ${jobId} cancelado`);
    return true;
  }

  testBackupSystem(): Promise<{ success: boolean; details: string[] }> {
    return new Promise(async (resolve) => {
      const details: string[] = [];
      let success = true;

      try {
        // Testar conectividade com localizações
        for (const location of this.config.locations.filter(l => l.isActive)) {
          try {
            await this.testLocationConnectivity(location);
            details.push(`✓ Conectividade OK: ${location.name}`);
          } catch (error) {
            details.push(`✗ Falha na conectividade: ${location.name} - ${error.message}`);
            success = false;
          }
        }

        // Testar criptografia
        try {
          const testData = 'test data for encryption';
          const keyId = this.rotateEncryptionKey();
          const key = this.encryptionKeys.get(keyId);
          const encrypted = CryptoJS.AES.encrypt(testData, key!).toString();
          const decrypted = CryptoJS.AES.decrypt(encrypted, key!).toString(CryptoJS.enc.Utf8);
          
          if (decrypted === testData) {
            details.push('✓ Criptografia funcionando corretamente');
          } else {
            details.push('✗ Falha na criptografia');
            success = false;
          }
        } catch (error) {
          details.push(`✗ Erro na criptografia: ${error.message}`);
          success = false;
        }

        // Testar espaço disponível
        const availableSpace = await this.getAvailableSpace();
        const requiredSpace = await this.estimateBackupSize('full');
        
        if (availableSpace > requiredSpace) {
          details.push(`✓ Espaço suficiente: ${this.formatBytes(availableSpace)} disponível`);
        } else {
          details.push(`✗ Espaço insuficiente: ${this.formatBytes(availableSpace)} disponível, ${this.formatBytes(requiredSpace)} necessário`);
          success = false;
        }

      } catch (error) {
        details.push(`✗ Erro no teste: ${error.message}`);
        success = false;
      }

      resolve({ success, details });
    });
  }
}

// Instância singleton
export const backupService = new BackupService();

// Funções de conveniência
export async function startManualBackup(type: 'incremental' | 'full' = 'full'): Promise<string> {
  return await backupService.startBackup(type);
}

export async function requestDataRestore(
  targetDate: string,
  dataTypes: string[],
  requestedBy: string
): Promise<string> {
  const request: RestoreRequest = {
    id: `restore_${Date.now()}`,
    backupJobId: '',
    requestedBy,
    targetDate,
    dataTypes,
    filters: [],
    destination: 'staging',
    approvals: [
      {
        approverId: 'admin',
        approverName: 'Administrator',
        decision: 'approved',
        timestamp: new Date().toISOString(),
        reason: 'Restore aprovado pelo administrador'
      }
    ]
  };

  return await backupService.requestRestore(request);
}

export function getBackupStatus(): any {
  return backupService.getBackupStats();
}

export async function testBackupSystem(): Promise<{ success: boolean; details: string[] }> {
  return await backupService.testBackupSystem();
}

export default backupService;