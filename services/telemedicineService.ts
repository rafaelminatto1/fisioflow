/**
 * Serviço de Telemedicina Integrada
 * Videochamadas, consultas remotas, monitoramento e prescrição digital
 */

import { encryption } from './encryption';
import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { intelligentNotificationService } from './intelligentNotificationService';
import { mobileAppService } from './mobileAppService';

// === INTERFACES ===
interface TeleconsultSession {
  id: string;
  
  // Participantes
  patientId: string;
  therapistId: string;
  patientName: string;
  therapistName: string;
  
  // Agendamento
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  duration?: number; // minutos
  
  // Tipo de consulta
  type: 'initial_consultation' | 'follow_up' | 'assessment' | 'therapy_session' | 'emergency';
  specialty: string;
  
  // Status
  status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  
  // Conexão
  connectionId?: string;
  roomId?: string;
  
  // Qualidade da chamada
  connectionQuality?: {
    patientConnection: 'excellent' | 'good' | 'fair' | 'poor';
    therapistConnection: 'excellent' | 'good' | 'fair' | 'poor';
    averageLatency: number; // ms
    packetLoss: number; // %
    resolution: string;
    bandwidth: number; // kbps
  };
  
  // Conteúdo da consulta
  chiefComplaint?: string;
  symptoms?: string[];
  vitalSigns?: VitalSigns;
  assessment?: string;
  diagnosis?: string[];
  treatmentPlan?: string;
  prescriptions?: TelePrescription[];
  followUpRequired: boolean;
  nextAppointment?: string;
  
  // Arquivos e mídia
  attachments: SessionAttachment[];
  recordings?: SessionRecording[];
  
  // Consentimento e compliance
  consentSigned: boolean;
  consentTimestamp?: string;
  gdprCompliant: boolean;
  
  // Cobrança
  billable: boolean;
  amount?: number;
  insuranceCovered?: boolean;
  
  // Avaliação
  patientRating?: number; // 1-5
  therapistRating?: number; // 1-5
  feedback?: string;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
  tenantId: string;
}

interface VitalSigns {
  heartRate?: number; // bpm
  bloodPressure?: {
    systolic: number;
    diastolic: number;
  };
  temperature?: number; // celsius
  respiratoryRate?: number; // rpm
  oxygenSaturation?: number; // %
  weight?: number; // kg
  height?: number; // cm
  
  // Sinais específicos para fisioterapia
  painLevel?: number; // 0-10
  rangeOfMotion?: {
    joint: string;
    measurement: number;
    unit: 'degrees' | 'cm';
  }[];
  functionalCapacity?: number; // 0-100%
  
  measuredAt: string;
  measuredBy: 'patient' | 'therapist' | 'device';
}

interface TelePrescription {
  id: string;
  
  // Medicamento ou tratamento
  type: 'medication' | 'exercise' | 'therapy_protocol' | 'device_prescription';
  name: string;
  description: string;
  
  // Dosagem/Frequência
  dosage?: string;
  frequency: string;
  duration: string;
  
  // Instruções
  instructions: string;
  warnings?: string[];
  contraindications?: string[];
  
  // Digital signature
  digitalSignature: string;
  prescribedAt: string;
  validUntil: string;
  
  // Status
  status: 'active' | 'completed' | 'cancelled' | 'expired';
  adherence?: {
    completedSessions: number;
    totalSessions: number;
    lastUpdate: string;
  };
}

interface SessionAttachment {
  id: string;
  
  // Arquivo
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  
  // Tipo de conteúdo
  category: 'image' | 'video' | 'document' | 'audio' | 'xray' | 'lab_result';
  description?: string;
  
  // Segurança
  encrypted: boolean;
  accessKey?: string;
  
  // Metadados
  uploadedBy: 'patient' | 'therapist';
  uploadedAt: string;
  
  // Anotações
  annotations?: Array<{
    x: number;
    y: number;
    type: 'arrow' | 'circle' | 'text' | 'measurement';
    content: string;
    author: string;
  }>;
}

interface SessionRecording {
  id: string;
  
  // Arquivo
  fileName: string;
  duration: number; // segundos
  fileSize: number;
  url: string;
  
  // Qualidade
  resolution: string;
  bitrate: number;
  codec: string;
  
  // Segurança
  encrypted: boolean;
  encryptionKey: string;
  
  // Compliance
  consentForRecording: boolean;
  retentionPeriod: number; // dias
  autoDeleteAt: string;
  
  // Metadados
  recordedAt: string;
  recordedBy: string;
}

interface VideoCallConfig {
  // Qualidade de vídeo
  videoQuality: 'low' | 'medium' | 'high' | 'hd';
  audioQuality: 'low' | 'medium' | 'high';
  
  // Recursos
  enableScreenShare: boolean;
  enableRecording: boolean;
  enableChat: boolean;
  enableFileShare: boolean;
  enableWhiteboard: boolean;
  
  // Limites
  maxParticipants: number;
  maxDuration: number; // minutos
  
  // Segurança
  endToEndEncryption: boolean;
  requirePassword: boolean;
  allowGuests: boolean;
  
  // Região do servidor
  preferredRegion: 'us-east' | 'us-west' | 'eu-west' | 'sa-east';
}

interface TelemedicineProvider {
  id: string;
  name: string;
  type: 'webrtc' | 'third_party';
  
  // Configuração
  config: {
    apiKey?: string;
    appId?: string;
    serverUrl?: string;
    iceServers?: RTCIceServer[];
    credentials?: Record<string, string>;
  };
  
  // Recursos suportados
  supportedFeatures: {
    videoCall: boolean;
    screenShare: boolean;
    recording: boolean;
    chat: boolean;
    fileTransfer: boolean;
    virtualBackground: boolean;
    noiseReduction: boolean;
  };
  
  // Limites
  maxParticipants: number;
  maxDuration: number;
  qualityOptions: string[];
  
  // Status
  isActive: boolean;
  priority: number; // 1-10, maior = mais prioritário
}

interface RemoteMonitoring {
  id: string;
  patientId: string;
  therapistId: string;
  
  // Configuração do monitoramento
  type: 'vital_signs' | 'exercise_compliance' | 'pain_tracking' | 'movement_analysis';
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
  duration: number; // dias
  
  // Dispositivos conectados
  devices: ConnectedDevice[];
  
  // Dados coletados
  measurements: MonitoringMeasurement[];
  
  // Alertas
  alertRules: MonitoringAlertRule[];
  triggeredAlerts: MonitoringAlert[];
  
  // Status
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: string;
  endDate?: string;
  
  // Análise
  insights: string[];
  trends: {
    metric: string;
    trend: 'improving' | 'stable' | 'declining';
    confidence: number;
  }[];
  
  createdAt: string;
  tenantId: string;
}

interface ConnectedDevice {
  id: string;
  name: string;
  type: 'wearable' | 'sensor' | 'mobile_app' | 'medical_device';
  manufacturer: string;
  model: string;
  
  // Conectividade
  connectionType: 'bluetooth' | 'wifi' | 'cellular' | 'usb';
  isConnected: boolean;
  lastSync: string;
  batteryLevel?: number;
  
  // Dados que coleta
  measuredParameters: string[];
  accuracy: string;
  calibrationDate?: string;
  
  // Status
  isActive: boolean;
  firmwareVersion?: string;
}

interface MonitoringMeasurement {
  id: string;
  deviceId: string;
  parameter: string;
  value: number;
  unit: string;
  
  // Contexto
  timestamp: string;
  location?: { latitude: number; longitude: number };
  activity?: string; // o que o paciente estava fazendo
  
  // Qualidade do dado
  reliability: 'high' | 'medium' | 'low';
  confidence: number; // 0-1
  
  // Flags
  isAnomaly: boolean;
  needsReview: boolean;
  
  // Metadados
  rawData?: any;
  processedAt: string;
}

interface MonitoringAlertRule {
  id: string;
  parameter: string;
  condition: 'above' | 'below' | 'equals' | 'change' | 'missing';
  threshold: number;
  
  // Configuração
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  
  // Ações
  actions: {
    notifyTherapist: boolean;
    notifyPatient: boolean;
    createTask: boolean;
    scheduleCall: boolean;
    emergencyProtocol: boolean;
  };
  
  createdAt: string;
}

interface MonitoringAlert {
  id: string;
  ruleId: string;
  measurement: MonitoringMeasurement;
  
  // Detalhes
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Status
  status: 'active' | 'acknowledged' | 'resolved' | 'false_positive';
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  
  // Ações tomadas
  actionsTaken: string[];
}

// === CLASSE PRINCIPAL ===
class TelemedicineService {
  private sessions: Map<string, TeleconsultSession> = new Map();
  private monitoringPrograms: Map<string, RemoteMonitoring> = new Map();
  private providers: Map<string, TelemedicineProvider> = new Map();
  
  private currentSession: TeleconsultSession | null = null;
  private mediaStream: MediaStream | null = null;
  private peerConnection: RTCPeerConnection | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o serviço
   */
  async initialize(): Promise<void> {
    await this.loadStoredData();
    this.setupDefaultProviders();
    this.startMonitoringLoop();
    
    console.log('🏥 Telemedicine Service inicializado');
  }

  // === CONSULTAS REMOTAS ===

  /**
   * Criar sessão de teleconsulta
   */
  async createTeleconsultSession(
    session: Omit<TeleconsultSession, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'attachments' | 'consentSigned' | 'gdprCompliant' | 'followUpRequired'>
  ): Promise<string> {
    const sessionId = this.generateId('session');
    
    const fullSession: TeleconsultSession = {
      ...session,
      id: sessionId,
      status: 'scheduled',
      attachments: [],
      consentSigned: false,
      gdprCompliant: true,
      followUpRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, fullSession);
    await this.saveSessions();

    // Notificar participantes
    await this.notifySessionCreated(fullSession);

    // Log de auditoria
    await auditLogger.logAction(
      session.tenantId,
      session.therapistId,
      'USER',
      AuditAction.CREATE,
      'teleconsult_session',
      sessionId,
      {
        entityName: `Teleconsult: ${session.patientName}`,
        legalBasis: LegalBasis.MEDICAL_CARE,
        dataAccessed: ['patient_data', 'session_data'],
        metadata: {
          type: session.type,
          specialty: session.specialty,
          scheduledStart: session.scheduledStart,
        },
      }
    );

    console.log(`🎥 Teleconsulta criada: ${sessionId} (${session.type})`);
    return sessionId;
  }

  /**
   * Iniciar teleconsulta
   */
  async startTeleconsult(
    sessionId: string,
    userId: string,
    tenantId: string
  ): Promise<{
    roomId: string;
    accessToken: string;
    config: VideoCallConfig;
    session: TeleconsultSession;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new Error('Sessão não encontrada');
    }

    if (session.status !== 'scheduled' && session.status !== 'waiting') {
      throw new Error('Sessão não pode ser iniciada neste momento');
    }

    try {
      // Verificar consentimento
      if (!session.consentSigned) {
        throw new Error('Consentimento não assinado');
      }

      // Obter provider disponível
      const provider = this.getBestProvider();
      if (!provider) {
        throw new Error('Nenhum provider de videoconferência disponível');
      }

      // Criar sala virtual
      const roomId = await this.createVirtualRoom(session, provider);
      const accessToken = await this.generateAccessToken(userId, roomId, provider);

      // Configuração da chamada
      const config: VideoCallConfig = {
        videoQuality: 'high',
        audioQuality: 'high',
        enableScreenShare: true,
        enableRecording: session.type !== 'emergency',
        enableChat: true,
        enableFileShare: true,
        enableWhiteboard: true,
        maxParticipants: 2,
        maxDuration: 120, // 2 horas
        endToEndEncryption: true,
        requirePassword: false,
        allowGuests: false,
        preferredRegion: 'sa-east',
      };

      // Atualizar sessão
      session.status = 'in_progress';
      session.actualStart = new Date().toISOString();
      session.roomId = roomId;
      session.connectionId = this.generateId('conn');
      session.updatedAt = new Date().toISOString();

      await this.saveSessions();
      this.currentSession = session;

      // Iniciar monitoramento de qualidade
      this.startQualityMonitoring(session);

      console.log(`🎥 Teleconsulta iniciada: ${sessionId}`);
      return { roomId, accessToken, config, session };
    } catch (error) {
      console.error('❌ Erro ao iniciar teleconsulta:', error);
      throw error;
    }
  }

  /**
   * Finalizar teleconsulta
   */
  async endTeleconsult(
    sessionId: string,
    summary: {
      assessment?: string;
      diagnosis?: string[];
      treatmentPlan?: string;
      prescriptions?: Omit<TelePrescription, 'id' | 'digitalSignature' | 'prescribedAt'>[];
      followUpRequired: boolean;
      nextAppointment?: string;
    },
    userId: string,
    tenantId: string
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      throw new Error('Sessão não encontrada');
    }

    try {
      // Processar prescrições
      const prescriptions: TelePrescription[] = [];
      if (summary.prescriptions) {
        for (const prescData of summary.prescriptions) {
          const prescription: TelePrescription = {
            ...prescData,
            id: this.generateId('prescription'),
            digitalSignature: await this.createDigitalSignature(prescData, userId),
            prescribedAt: new Date().toISOString(),
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
            status: 'active',
          };
          prescriptions.push(prescription);
        }
      }

      // Atualizar sessão
      session.status = 'completed';
      session.actualEnd = new Date().toISOString();
      session.duration = session.actualStart 
        ? Math.round((new Date().getTime() - new Date(session.actualStart).getTime()) / 60000)
        : undefined;
      
      session.assessment = summary.assessment;
      session.diagnosis = summary.diagnosis;
      session.treatmentPlan = summary.treatmentPlan;
      session.prescriptions = prescriptions;
      session.followUpRequired = summary.followUpRequired;
      session.nextAppointment = summary.nextAppointment;
      session.updatedAt = new Date().toISOString();

      await this.saveSessions();

      // Parar monitoramento
      this.stopQualityMonitoring();

      // Limpar recursos
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.currentSession = null;

      // Notificar finalização
      await this.notifySessionCompleted(session);

      console.log(`✅ Teleconsulta finalizada: ${sessionId} (${session.duration} min)`);
    } catch (error) {
      console.error('❌ Erro ao finalizar teleconsulta:', error);
      throw error;
    }
  }

  // === MONITORAMENTO REMOTO ===

  /**
   * Criar programa de monitoramento remoto
   */
  async createRemoteMonitoring(
    monitoring: Omit<RemoteMonitoring, 'id' | 'measurements' | 'triggeredAlerts' | 'status' | 'insights' | 'trends' | 'createdAt'>
  ): Promise<string> {
    const monitoringId = this.generateId('monitoring');
    
    const fullMonitoring: RemoteMonitoring = {
      ...monitoring,
      id: monitoringId,
      measurements: [],
      triggeredAlerts: [],
      status: 'active',
      insights: [],
      trends: [],
      createdAt: new Date().toISOString(),
    };

    this.monitoringPrograms.set(monitoringId, fullMonitoring);
    await this.saveMonitoringPrograms();

    // Configurar dispositivos
    await this.setupMonitoringDevices(fullMonitoring);

    console.log(`📊 Monitoramento remoto criado: ${monitoringId} (${monitoring.type})`);
    return monitoringId;
  }

  /**
   * Processar medição de dispositivo
   */
  async processMeasurement(
    monitoringId: string,
    measurement: Omit<MonitoringMeasurement, 'id' | 'processedAt' | 'isAnomaly' | 'needsReview'>
  ): Promise<void> {
    const monitoring = this.monitoringPrograms.get(monitoringId);
    if (!monitoring) {
      throw new Error('Programa de monitoramento não encontrado');
    }

    try {
      // Processar medição
      const processedMeasurement: MonitoringMeasurement = {
        ...measurement,
        id: this.generateId('measurement'),
        processedAt: new Date().toISOString(),
        isAnomaly: await this.detectAnomaly(measurement, monitoring),
        needsReview: false,
      };

      // Verificar se precisa de revisão
      if (processedMeasurement.reliability === 'low' || processedMeasurement.isAnomaly) {
        processedMeasurement.needsReview = true;
      }

      // Adicionar à lista de medições
      monitoring.measurements.push(processedMeasurement);

      // Manter apenas últimas 1000 medições
      if (monitoring.measurements.length > 1000) {
        monitoring.measurements = monitoring.measurements.slice(-1000);
      }

      // Verificar regras de alerta
      await this.checkAlertRules(monitoring, processedMeasurement);

      // Atualizar insights e tendências
      await this.updateMonitoringInsights(monitoring);

      await this.saveMonitoringPrograms();

      console.log(`📊 Medição processada: ${measurement.parameter} = ${measurement.value} ${measurement.unit}`);
    } catch (error) {
      console.error('❌ Erro ao processar medição:', error);
      throw error;
    }
  }

  // === ANÁLISE DE SINAIS VITAIS ===

  /**
   * Analisar sinais vitais em tempo real
   */
  async analyzeVitalSigns(
    vitalSigns: VitalSigns,
    patientId: string,
    sessionId?: string
  ): Promise<{
    analysis: string;
    alerts: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      parameter: string;
      value: number;
      normalRange: string;
      recommendation: string;
    }>;
    riskScore: number; // 0-100
  }> {
    const alerts = [];
    let riskScore = 0;

    // Análise de frequência cardíaca
    if (vitalSigns.heartRate) {
      if (vitalSigns.heartRate < 60 || vitalSigns.heartRate > 100) {
        alerts.push({
          severity: vitalSigns.heartRate < 50 || vitalSigns.heartRate > 120 ? 'high' : 'medium',
          parameter: 'Frequência Cardíaca',
          value: vitalSigns.heartRate,
          normalRange: '60-100 bpm',
          recommendation: vitalSigns.heartRate < 60 
            ? 'Avaliar causa de bradicardia' 
            : 'Avaliar causa de taquicardia',
        });
        riskScore += vitalSigns.heartRate < 50 || vitalSigns.heartRate > 120 ? 20 : 10;
      }
    }

    // Análise de pressão arterial
    if (vitalSigns.bloodPressure) {
      const { systolic, diastolic } = vitalSigns.bloodPressure;
      if (systolic >= 140 || diastolic >= 90) {
        alerts.push({
          severity: systolic >= 160 || diastolic >= 100 ? 'high' : 'medium',
          parameter: 'Pressão Arterial',
          value: systolic,
          normalRange: '<140/90 mmHg',
          recommendation: 'Avaliar hipertensão arterial',
        });
        riskScore += systolic >= 160 || diastolic >= 100 ? 25 : 15;
      }
    }

    // Análise de temperatura
    if (vitalSigns.temperature) {
      if (vitalSigns.temperature >= 37.8 || vitalSigns.temperature < 35.0) {
        alerts.push({
          severity: vitalSigns.temperature >= 39.0 || vitalSigns.temperature < 34.0 ? 'high' : 'medium',
          parameter: 'Temperatura',
          value: vitalSigns.temperature,
          normalRange: '35.0-37.5°C',
          recommendation: vitalSigns.temperature >= 37.8 
            ? 'Investigar processo infeccioso' 
            : 'Avaliar hipotermia',
        });
        riskScore += vitalSigns.temperature >= 39.0 || vitalSigns.temperature < 34.0 ? 20 : 10;
      }
    }

    // Análise de saturação de oxigênio
    if (vitalSigns.oxygenSaturation) {
      if (vitalSigns.oxygenSaturation < 95) {
        alerts.push({
          severity: vitalSigns.oxygenSaturation < 90 ? 'critical' : 'high',
          parameter: 'Saturação de Oxigênio',
          value: vitalSigns.oxygenSaturation,
          normalRange: '95-100%',
          recommendation: 'Avaliar função respiratória urgentemente',
        });
        riskScore += vitalSigns.oxygenSaturation < 90 ? 40 : 25;
      }
    }

    // Análise de dor (específico para fisioterapia)
    if (vitalSigns.painLevel && vitalSigns.painLevel >= 7) {
      alerts.push({
        severity: vitalSigns.painLevel >= 9 ? 'high' : 'medium',
        parameter: 'Nível de Dor',
        value: vitalSigns.painLevel,
        normalRange: '0-3',
        recommendation: 'Considerar ajuste no plano de tratamento',
      });
      riskScore += vitalSigns.painLevel >= 9 ? 15 : 10;
    }

    // Gerar análise textual
    let analysis = 'Sinais vitais dentro dos parâmetros normais.';
    
    if (alerts.length > 0) {
      const highRiskAlerts = alerts.filter(a => a.severity === 'high' || a.severity === 'critical');
      
      if (highRiskAlerts.length > 0) {
        analysis = `Identificadas ${highRiskAlerts.length} alterações significativas que requerem atenção imediata.`;
      } else {
        analysis = `Identificadas ${alerts.length} alterações leves que devem ser monitoradas.`;
      }
    }

    // Salvar análise se for parte de uma sessão
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session) {
        session.vitalSigns = vitalSigns;
        session.updatedAt = new Date().toISOString();
        await this.saveSessions();
      }
    }

    return {
      analysis,
      alerts,
      riskScore: Math.min(100, riskScore),
    };
  }

  // === MÉTODOS PRIVADOS ===

  private getBestProvider(): TelemedicineProvider | null {
    const activeProviders = Array.from(this.providers.values())
      .filter(p => p.isActive)
      .sort((a, b) => b.priority - a.priority);
    
    return activeProviders[0] || null;
  }

  private async createVirtualRoom(session: TeleconsultSession, provider: TelemedicineProvider): Promise<string> {
    // Simular criação de sala virtual
    const roomId = `room_${session.id}_${Date.now()}`;
    
    // Em produção, faria chamada para API do provider
    console.log(`🏠 Sala virtual criada: ${roomId} (provider: ${provider.name})`);
    
    return roomId;
  }

  private async generateAccessToken(userId: string, roomId: string, provider: TelemedicineProvider): Promise<string> {
    // Simular geração de token de acesso
    const token = await encryption.hashSensitiveData(`${userId}_${roomId}_${Date.now()}`);
    return token.hash.substring(0, 32);
  }

  private startQualityMonitoring(session: TeleconsultSession): void {
    // Simular monitoramento de qualidade
    const qualityInterval = setInterval(() => {
      if (!this.currentSession || this.currentSession.id !== session.id) {
        clearInterval(qualityInterval);
        return;
      }

      // Simular métricas de qualidade
      const quality = {
        patientConnection: this.getRandomConnection(),
        therapistConnection: this.getRandomConnection(),
        averageLatency: Math.floor(Math.random() * 100) + 50, // 50-150ms
        packetLoss: Math.random() * 2, // 0-2%
        resolution: '1280x720',
        bandwidth: Math.floor(Math.random() * 500) + 500, // 500-1000 kbps
      };

      session.connectionQuality = quality;
      
      // Alertar se qualidade ruim
      if (quality.averageLatency > 200 || quality.packetLoss > 5) {
        console.warn('⚠️ Qualidade de conexão degradada');
      }
    }, 10000); // A cada 10 segundos
  }

  private stopQualityMonitoring(): void {
    // O interval será limpo automaticamente no startQualityMonitoring
  }

  private getRandomConnection(): 'excellent' | 'good' | 'fair' | 'poor' {
    const rand = Math.random();
    if (rand > 0.8) return 'excellent';
    if (rand > 0.6) return 'good';
    if (rand > 0.3) return 'fair';
    return 'poor';
  }

  private async createDigitalSignature(prescription: any, userId: string): Promise<string> {
    const dataToSign = JSON.stringify({
      ...prescription,
      userId,
      timestamp: Date.now(),
    });
    
    const signature = await encryption.hashSensitiveData(dataToSign);
    return signature.hash;
  }

  private async notifySessionCreated(session: TeleconsultSession): Promise<void> {
    // Notificar paciente
    await intelligentNotificationService.sendNotification(
      session.patientId,
      'patient',
      {
        title: 'Teleconsulta Agendada',
        message: `Sua teleconsulta foi agendada para ${new Date(session.scheduledStart).toLocaleString('pt-BR')}`,
        category: 'appointment',
        priority: 'medium',
        data: { sessionId: session.id, type: 'teleconsult' },
      },
      session.tenantId
    );

    // Notificar terapeuta
    await intelligentNotificationService.sendNotification(
      session.therapistId,
      'user',
      {
        title: 'Nova Teleconsulta',
        message: `Teleconsulta agendada com ${session.patientName} para ${new Date(session.scheduledStart).toLocaleString('pt-BR')}`,
        category: 'appointment',
        priority: 'medium',
        data: { sessionId: session.id, type: 'teleconsult' },
      },
      session.tenantId
    );
  }

  private async notifySessionCompleted(session: TeleconsultSession): Promise<void> {
    // Notificar paciente
    await intelligentNotificationService.sendNotification(
      session.patientId,
      'patient',
      {
        title: 'Teleconsulta Finalizada',
        message: 'Sua teleconsulta foi finalizada. Verifique suas prescrições e orientações.',
        category: 'appointment',
        priority: 'medium',
        data: { sessionId: session.id, completed: true },
      },
      session.tenantId
    );
  }

  private async setupMonitoringDevices(monitoring: RemoteMonitoring): Promise<void> {
    // Configurar dispositivos de monitoramento
    for (const device of monitoring.devices) {
      try {
        // Simular configuração de dispositivo
        console.log(`🔧 Configurando dispositivo: ${device.name}`);
        
        // Em produção, faria configuração real via API/Bluetooth
        device.isConnected = true;
        device.lastSync = new Date().toISOString();
      } catch (error) {
        console.error(`❌ Erro ao configurar dispositivo ${device.name}:`, error);
      }
    }
  }

  private async detectAnomaly(measurement: Omit<MonitoringMeasurement, 'id' | 'processedAt' | 'isAnomaly' | 'needsReview'>, monitoring: RemoteMonitoring): Promise<boolean> {
    // Simular detecção de anomalia usando histórico
    const recentMeasurements = monitoring.measurements
      .filter(m => m.parameter === measurement.parameter)
      .slice(-10); // Últimas 10 medições

    if (recentMeasurements.length < 3) {
      return false; // Não há dados suficientes
    }

    const values = recentMeasurements.map(m => m.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    // Considerar anomalia se estiver a mais de 2 desvios padrão da média
    const zScore = Math.abs(measurement.value - mean) / stdDev;
    
    return zScore > 2;
  }

  private async checkAlertRules(monitoring: RemoteMonitoring, measurement: MonitoringMeasurement): Promise<void> {
    for (const rule of monitoring.alertRules) {
      if (!rule.enabled || rule.parameter !== measurement.parameter) {
        continue;
      }

      let shouldAlert = false;

      switch (rule.condition) {
        case 'above':
          shouldAlert = measurement.value > rule.threshold;
          break;
        case 'below':
          shouldAlert = measurement.value < rule.threshold;
          break;
        case 'equals':
          shouldAlert = Math.abs(measurement.value - rule.threshold) < 0.01;
          break;
        // Implementar outras condições...
      }

      if (shouldAlert) {
        const alert: MonitoringAlert = {
          id: this.generateId('alert'),
          ruleId: rule.id,
          measurement,
          message: `${rule.parameter} ${rule.condition} ${rule.threshold}`,
          severity: rule.severity,
          status: 'active',
          triggeredAt: new Date().toISOString(),
          actionsTaken: [],
        };

        monitoring.triggeredAlerts.push(alert);

        // Executar ações do alerta
        await this.executeAlertActions(alert, rule, monitoring);
      }
    }
  }

  private async executeAlertActions(alert: MonitoringAlert, rule: MonitoringAlertRule, monitoring: RemoteMonitoring): Promise<void> {
    const actions = [];

    if (rule.actions.notifyTherapist) {
      await intelligentNotificationService.sendNotification(
        monitoring.therapistId,
        'user',
        {
          title: `Alerta: ${alert.message}`,
          message: `Paciente ${monitoring.patientId} - ${rule.parameter}: ${alert.measurement.value}`,
          category: 'alert',
          priority: alert.severity === 'critical' ? 'urgent' : 'high',
          data: { alertId: alert.id, monitoringId: monitoring.id },
        },
        monitoring.tenantId
      );
      actions.push('Terapeuta notificado');
    }

    if (rule.actions.notifyPatient) {
      await intelligentNotificationService.sendNotification(
        monitoring.patientId,
        'patient',
        {
          title: 'Alerta de Monitoramento',
          message: `Atenção: ${alert.message}. Entre em contato com seu terapeuta.`,
          category: 'alert',
          priority: 'medium',
          data: { alertId: alert.id },
        },
        monitoring.tenantId
      );
      actions.push('Paciente notificado');
    }

    alert.actionsTaken = actions;
  }

  private async updateMonitoringInsights(monitoring: RemoteMonitoring): Promise<void> {
    // Simular geração de insights
    const insights = [
      'Tendência de melhora nos últimos 7 dias',
      'Aderência ao tratamento: 85%',
      'Picos de dor correlacionados com atividade física intensa',
    ];

    monitoring.insights = insights;

    // Simular análise de tendências
    const trends = [
      {
        metric: 'pain_level',
        trend: 'improving' as const,
        confidence: 0.8,
      },
      {
        metric: 'mobility',
        trend: 'stable' as const,
        confidence: 0.9,
      },
    ];

    monitoring.trends = trends;
  }

  private setupDefaultProviders(): void {
    const defaultProviders: TelemedicineProvider[] = [
      {
        id: 'webrtc_native',
        name: 'WebRTC Nativo',
        type: 'webrtc',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:turn.fisioflow.com:3478', username: 'user', credential: 'pass' },
          ],
        },
        supportedFeatures: {
          videoCall: true,
          screenShare: true,
          recording: true,
          chat: true,
          fileTransfer: false,
          virtualBackground: false,
          noiseReduction: false,
        },
        maxParticipants: 2,
        maxDuration: 180,
        qualityOptions: ['low', 'medium', 'high', 'hd'],
        isActive: true,
        priority: 8,
      },
    ];

    defaultProviders.forEach(provider => {
      this.providers.set(provider.id, provider);
    });

    console.log('🎥 Providers de telemedicina configurados');
  }

  private startMonitoringLoop(): void {
    // Loop para processar medições de dispositivos
    setInterval(async () => {
      for (const monitoring of this.monitoringPrograms.values()) {
        if (monitoring.status !== 'active') continue;

        // Simular recebimento de dados de dispositivos
        for (const device of monitoring.devices) {
          if (!device.isConnected) continue;

          // Simular medição aleatória
          if (Math.random() > 0.7) { // 30% de chance
            const measurement = this.generateSimulatedMeasurement(device, monitoring.type);
            await this.processMeasurement(monitoring.id, measurement);
          }
        }
      }
    }, 60000); // A cada minuto
  }

  private generateSimulatedMeasurement(device: ConnectedDevice, monitoringType: string): Omit<MonitoringMeasurement, 'id' | 'processedAt' | 'isAnomaly' | 'needsReview'> {
    // Simular medição baseada no tipo de monitoramento
    let parameter = 'heart_rate';
    let value = 70 + Math.random() * 30; // 70-100 bpm
    let unit = 'bpm';

    switch (monitoringType) {
      case 'vital_signs':
        const vitals = ['heart_rate', 'blood_pressure', 'temperature'];
        parameter = vitals[Math.floor(Math.random() * vitals.length)];
        break;
      case 'pain_tracking':
        parameter = 'pain_level';
        value = Math.floor(Math.random() * 10); // 0-10
        unit = 'scale';
        break;
      case 'exercise_compliance':
        parameter = 'exercise_duration';
        value = Math.floor(Math.random() * 60); // 0-60 min
        unit = 'minutes';
        break;
    }

    return {
      deviceId: device.id,
      parameter,
      value,
      unit,
      timestamp: new Date().toISOString(),
      reliability: 'high',
      confidence: 0.9 + Math.random() * 0.1,
    };
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Carregar sessões
      const sessionsData = localStorage.getItem('fisioflow_teleconsult_sessions');
      if (sessionsData) {
        const sessions = JSON.parse(sessionsData);
        sessions.forEach((session: TeleconsultSession) => {
          this.sessions.set(session.id, session);
        });
      }

      // Carregar programas de monitoramento
      const monitoringData = localStorage.getItem('fisioflow_remote_monitoring');
      if (monitoringData) {
        const programs = JSON.parse(monitoringData);
        programs.forEach((program: RemoteMonitoring) => {
          this.monitoringPrograms.set(program.id, program);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados de telemedicina:', error);
    }
  }

  private async saveSessions(): Promise<void> {
    try {
      const sessions = Array.from(this.sessions.values());
      localStorage.setItem('fisioflow_teleconsult_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('❌ Erro ao salvar sessões:', error);
    }
  }

  private async saveMonitoringPrograms(): Promise<void> {
    try {
      const programs = Array.from(this.monitoringPrograms.values());
      localStorage.setItem('fisioflow_remote_monitoring', JSON.stringify(programs));
    } catch (error) {
      console.error('❌ Erro ao salvar programas de monitoramento:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const telemedicineService = new TelemedicineService();

// === HOOKS REACT ===
export const useTelemedicine = () => {
  const [currentSession, setCurrentSession] = React.useState<TeleconsultSession | null>(null);

  const createSession = React.useCallback(async (
    sessionData: any
  ) => {
    return await telemedicineService.createTeleconsultSession(sessionData);
  }, []);

  const startSession = React.useCallback(async (
    sessionId: string,
    userId: string,
    tenantId: string
  ) => {
    const result = await telemedicineService.startTeleconsult(sessionId, userId, tenantId);
    setCurrentSession(result.session);
    return result;
  }, []);

  const endSession = React.useCallback(async (
    sessionId: string,
    summary: any,
    userId: string,
    tenantId: string
  ) => {
    await telemedicineService.endTeleconsult(sessionId, summary, userId, tenantId);
    setCurrentSession(null);
  }, []);

  return {
    currentSession,
    createSession,
    startSession,
    endSession,
    createRemoteMonitoring: telemedicineService.createRemoteMonitoring.bind(telemedicineService),
    processMeasurement: telemedicineService.processMeasurement.bind(telemedicineService),
    analyzeVitalSigns: telemedicineService.analyzeVitalSigns.bind(telemedicineService),
  };
};

export default telemedicineService;

// Adicionar import do React
import React from 'react';