/**
 * Sistema de Alertas Inteligentes
 * Monitora dados e gera alertas automáticos baseados em IA
 */

import { multiAI } from './multiProviderAIService';
import { mlService } from './mlService';
import type {
  SmartAlert,
  AlertType,
  SuggestedAction,
  TreatmentPrediction
} from '../types/analytics';
import type { Patient, Assessment, Appointment, User } from '../types';

class AlertsService {
  private alerts: SmartAlert[] = [];
  private alertHistory: SmartAlert[] = [];
  private alertRules: Map<AlertType, Function> = new Map();
  
  constructor() {
    this.initializeAlertRules();
    this.loadAlertHistory();
  }

  /**
   * Inicializa regras de alertas
   */
  private initializeAlertRules(): void {
    this.alertRules.set(AlertType.ABANDONMENT_RISK, this.checkAbandonmentRisk.bind(this));
    this.alertRules.set(AlertType.SPECIAL_ATTENTION, this.checkSpecialAttention.bind(this));
    this.alertRules.set(AlertType.TREATMENT_IMPROVEMENT, this.checkTreatmentImprovement.bind(this));
    this.alertRules.set(AlertType.CONCERNING_TREND, this.checkConcerningTrend.bind(this));
    this.alertRules.set(AlertType.OPERATIONAL_OPTIMIZATION, this.checkOperationalOptimization.bind(this));
  }

  /**
   * Carrega histórico de alertas
   */
  private loadAlertHistory(): void {
    try {
      const saved = localStorage.getItem('smart_alerts_history');
      if (saved) {
        this.alertHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Erro ao carregar histórico de alertas:', error);
    }
  }

  /**
   * Salva histórico de alertas
   */
  private saveAlertHistory(): void {
    try {
      localStorage.setItem('smart_alerts_history', JSON.stringify(this.alertHistory));
    } catch (error) {
      console.warn('Erro ao salvar histórico de alertas:', error);
    }
  }

  /**
   * ============== ANÁLISE E GERAÇÃO DE ALERTAS ==============
   */

  /**
   * Analisa dados e gera alertas inteligentes
   */
  async analyzeAndGenerateAlerts(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[]
  ): Promise<SmartAlert[]> {
    const newAlerts: SmartAlert[] = [];

    try {
      // Gera predições primeiro para usar nas análises
      const predictions = await this.generatePredictionsForAlerts(patients, appointments, assessments);

      // Executa todas as regras de alerta em paralelo
      const alertChecks = Array.from(this.alertRules.entries()).map(([type, rule]) =>
        rule(patients, appointments, assessments, users, predictions)
      );

      const alertResults = await Promise.all(alertChecks);

      // Consolida todos os alertas
      alertResults.forEach(alerts => {
        if (Array.isArray(alerts)) {
          newAlerts.push(...alerts);
        }
      });

      // Filtra alertas duplicados e já existentes
      const uniqueAlerts = this.filterUniqueAlerts(newAlerts);
      
      // Adiciona aos alertas ativos
      this.alerts.push(...uniqueAlerts);
      
      // Remove alertas antigos (mais de 7 dias)
      this.cleanupOldAlerts();

      // Salva no histórico
      this.alertHistory.push(...uniqueAlerts);
      this.saveAlertHistory();

      return uniqueAlerts;

    } catch (error) {
      console.error('Erro na análise de alertas:', error);
      return [];
    }
  }

  /**
   * Gera predições para usar nos alertas
   */
  private async generatePredictionsForAlerts(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[]
  ): Promise<TreatmentPrediction[]> {
    // Seleciona pacientes ativos para análise
    const activePatients = patients.filter(p => {
      const recentAppointments = appointments.filter(apt => 
        apt.patientId === p.id && 
        new Date(apt.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      return recentAppointments.length > 0;
    }).slice(0, 10); // Limita para performance

    return await mlService.batchPredict(activePatients, (patientId) => ({
      assessments: assessments.filter(a => a.patientId === patientId),
      appointments: appointments.filter(a => a.patientId === patientId),
      prescriptions: [] // Seria carregado de verdade em produção
    }));
  }

  /**
   * ============== REGRAS DE ALERTAS ==============
   */

  /**
   * Verifica risco de abandono de pacientes
   */
  private async checkAbandonmentRisk(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[],
    predictions: TreatmentPrediction[]
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Pacientes com alto risco de abandono nas predições
    const highRiskPredictions = predictions.filter(p => p.abandonmentRisk === 'HIGH');

    for (const prediction of highRiskPredictions) {
      const patient = patients.find(p => p.id === prediction.patientId);
      if (!patient) continue;

      // Análise adicional com IA
      const analysisPrompt = `
Analise o risco de abandono deste paciente:

**Paciente:** ${patient.name}
**Patologia:** ${prediction.pathology}
**Risco Atual:** ${prediction.abandonmentRisk}
**Probabilidade de Sucesso:** ${Math.round(prediction.successProbability * 100)}%

Forneça ações específicas em JSON:
{
  "severity": "HIGH" | "MEDIUM" | "LOW",
  "urgency": "IMMEDIATE" | "THIS_WEEK" | "THIS_MONTH",
  "actions": [
    {
      "action": "ação específica",
      "priority": 1-5,
      "estimatedImpact": "HIGH" | "MEDIUM" | "LOW",
      "resourcesRequired": ["recursos necessários"]
    }
  ]
}`;

      try {
        const result = await multiAI.generateText(analysisPrompt, {
          type: 'assessment',
          maxTokens: 800,
          temperature: 0.3
        });

        let analysis: any;
        try {
          analysis = JSON.parse(result.content);
        } catch {
          analysis = this.getDefaultAbandonmentActions();
        }

        alerts.push({
          id: `abandonment_${prediction.patientId}_${Date.now()}`,
          type: AlertType.ABANDONMENT_RISK,
          severity: analysis.severity || 'HIGH',
          title: `Risco de Abandono - ${patient.name}`,
          description: `Paciente ${patient.name} com ${prediction.pathology} tem alto risco de abandono do tratamento. Probabilidade de sucesso atual: ${Math.round(prediction.successProbability * 100)}%.`,
          affectedEntities: [prediction.patientId],
          suggestedActions: analysis.actions || this.getDefaultAbandonmentActions().actions,
          createdAt: new Date().toISOString(),
          isRead: false,
          isResolved: false
        });

      } catch (error) {
        console.error('Erro na análise de abandono:', error);
        // Alerta padrão em caso de erro
        alerts.push(this.createDefaultAbandonmentAlert(patient, prediction));
      }
    }

    return alerts;
  }

  /**
   * Verifica casos que precisam de atenção especial
   */
  private async checkSpecialAttention(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[],
    predictions: TreatmentPrediction[]
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Pacientes com risco de complicações
    const complicationRisks = predictions.filter(p => p.complicationRisk > 0.7);

    // Pacientes sem consulta há muito tempo
    const now = new Date();
    const longTimePatients = patients.filter(patient => {
      const lastAppointment = appointments
        .filter(apt => apt.patientId === patient.id && apt.status === 'COMPLETED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (!lastAppointment) return false;

      const daysSinceLastAppointment = Math.floor(
        (now.getTime() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24)
      );

      return daysSinceLastAppointment > 14; // Mais de 2 semanas
    });

    // Alertas para complicações
    for (const prediction of complicationRisks) {
      const patient = patients.find(p => p.id === prediction.patientId);
      if (!patient) continue;

      alerts.push({
        id: `complication_${prediction.patientId}_${Date.now()}`,
        type: AlertType.SPECIAL_ATTENTION,
        severity: 'HIGH',
        title: `Risco de Complicações - ${patient.name}`,
        description: `Paciente ${patient.name} apresenta ${Math.round(prediction.complicationRisk * 100)}% de risco de complicações. Monitoramento especial recomendado.`,
        affectedEntities: [prediction.patientId],
        suggestedActions: [
          {
            action: 'Agendar consulta de reavaliação urgente',
            priority: 5,
            estimatedImpact: 'HIGH',
            resourcesRequired: ['fisioterapeuta', 'sala de avaliação']
          },
          {
            action: 'Revisar plano de tratamento atual',
            priority: 4,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['fisioterapeuta']
          }
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        isResolved: false
      });
    }

    // Alertas para pacientes sem consulta
    for (const patient of longTimePatients.slice(0, 5)) { // Limita para não sobrecarregar
      alerts.push({
        id: `longterm_${patient.id}_${Date.now()}`,
        type: AlertType.SPECIAL_ATTENTION,
        severity: 'MEDIUM',
        title: `Paciente Inativo - ${patient.name}`,
        description: `Paciente ${patient.name} não tem consultas há mais de 2 semanas. Verificar necessidade de retorno.`,
        affectedEntities: [patient.id!],
        suggestedActions: [
          {
            action: 'Entrar em contato para verificar situação',
            priority: 3,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['recepção']
          },
          {
            action: 'Reagendar consulta se necessário',
            priority: 2,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['agenda']
          }
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        isResolved: false
      });
    }

    return alerts;
  }

  /**
   * Identifica oportunidades de melhoria no tratamento
   */
  private async checkTreatmentImprovement(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[],
    predictions: TreatmentPrediction[]
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Pacientes com baixa probabilidade de sucesso mas ainda tratáveis
    const improvablePatients = predictions.filter(p => 
      p.successProbability < 0.6 && p.successProbability > 0.3
    );

    for (const prediction of improvablePatients) {
      const patient = patients.find(p => p.id === prediction.patientId);
      if (!patient) continue;

      // Analisa fatores específicos que podem ser melhorados
      const improvementFactors = prediction.factors.filter(f => f.impact < 0);

      if (improvementFactors.length > 0) {
        alerts.push({
          id: `improvement_${prediction.patientId}_${Date.now()}`,
          type: AlertType.TREATMENT_IMPROVEMENT,
          severity: 'MEDIUM',
          title: `Oportunidade de Melhoria - ${patient.name}`,
          description: `Tratamento de ${patient.name} pode ser otimizado. Fatores identificados: ${improvementFactors.map(f => f.name).join(', ')}.`,
          affectedEntities: [prediction.patientId],
          suggestedActions: [
            {
              action: 'Revisar e ajustar plano de tratamento',
              priority: 3,
              estimatedImpact: 'HIGH',
              resourcesRequired: ['fisioterapeuta']
            },
            {
              action: 'Discutir motivação e aderência com paciente',
              priority: 3,
              estimatedImpact: 'MEDIUM',
              resourcesRequired: ['fisioterapeuta']
            }
          ],
          createdAt: new Date().toISOString(),
          isRead: false,
          isResolved: false
        });
      }
    }

    return alerts;
  }

  /**
   * Detecta tendências preocupantes
   */
  private async checkConcerningTrend(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[],
    predictions: TreatmentPrediction[]
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Análise de tendências nos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAppointments = appointments.filter(apt => new Date(apt.date) >= thirtyDaysAgo);

    // Taxa de cancelamento alta
    const cancelledAppointments = recentAppointments.filter(apt => apt.status === 'CANCELLED');
    const cancellationRate = cancelledAppointments.length / Math.max(1, recentAppointments.length);

    if (cancellationRate > 0.3) { // Mais de 30% de cancelamentos
      alerts.push({
        id: `trend_cancellation_${Date.now()}`,
        type: AlertType.CONCERNING_TREND,
        severity: 'HIGH',
        title: 'Alta Taxa de Cancelamentos',
        description: `Taxa de cancelamento de ${Math.round(cancellationRate * 100)}% nos últimos 30 dias (${cancelledAppointments.length} de ${recentAppointments.length} consultas).`,
        affectedEntities: [],
        suggestedActions: [
          {
            action: 'Investigar principais motivos de cancelamento',
            priority: 4,
            estimatedImpact: 'HIGH',
            resourcesRequired: ['gestão', 'recepção']
          },
          {
            action: 'Implementar política de confirmação de consultas',
            priority: 3,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['sistema', 'recepção']
          }
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        isResolved: false
      });
    }

    // Diminuição de novos pacientes
    const thisMonth = new Date().getMonth();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    
    const thisMonthPatients = patients.filter(p => 
      new Date(p.createdAt || '').getMonth() === thisMonth
    ).length;
    
    const lastMonthPatients = patients.filter(p => 
      new Date(p.createdAt || '').getMonth() === lastMonth
    ).length;

    if (lastMonthPatients > 0 && thisMonthPatients < lastMonthPatients * 0.7) {
      alerts.push({
        id: `trend_new_patients_${Date.now()}`,
        type: AlertType.CONCERNING_TREND,
        severity: 'MEDIUM',
        title: 'Redução de Novos Pacientes',
        description: `Redução de ${Math.round((1 - thisMonthPatients / lastMonthPatients) * 100)}% em novos pacientes este mês (${thisMonthPatients} vs ${lastMonthPatients}).`,
        affectedEntities: [],
        suggestedActions: [
          {
            action: 'Revisar estratégias de marketing e captação',
            priority: 3,
            estimatedImpact: 'HIGH',
            resourcesRequired: ['marketing', 'gestão']
          },
          {
            action: 'Analisar feedback de pacientes atuais',
            priority: 2,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['atendimento']
          }
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        isResolved: false
      });
    }

    return alerts;
  }

  /**
   * Sugere otimizações operacionais
   */
  private async checkOperationalOptimization(
    patients: Patient[],
    appointments: Appointment[],
    assessments: Assessment[],
    users: User[],
    predictions: TreatmentPrediction[]
  ): Promise<SmartAlert[]> {
    const alerts: SmartAlert[] = [];

    // Análise de distribuição de carga de trabalho
    const therapists = users.filter(u => u.role === 'fisio' || u.role === 'FISIOTERAPEUTA');
    const workloadByTherapist = therapists.map(therapist => {
      const therapistAppointments = appointments.filter(apt => apt.therapistId === therapist.id);
      return {
        therapist,
        appointmentCount: therapistAppointments.length,
        patientCount: new Set(therapistAppointments.map(apt => apt.patientId)).size
      };
    });

    // Identifica desequilíbrio de carga
    if (workloadByTherapist.length > 1) {
      const maxWorkload = Math.max(...workloadByTherapist.map(w => w.appointmentCount));
      const minWorkload = Math.min(...workloadByTherapist.map(w => w.appointmentCount));

      if (maxWorkload > minWorkload * 2) { // Diferença muito grande
        const overloadedTherapist = workloadByTherapist.find(w => w.appointmentCount === maxWorkload);
        const underloadedTherapist = workloadByTherapist.find(w => w.appointmentCount === minWorkload);

        alerts.push({
          id: `optimization_workload_${Date.now()}`,
          type: AlertType.OPERATIONAL_OPTIMIZATION,
          severity: 'MEDIUM',
          title: 'Desequilíbrio de Carga de Trabalho',
          description: `${overloadedTherapist?.therapist.name} tem ${maxWorkload} consultas vs ${underloadedTherapist?.therapist.name} com ${minWorkload}. Considere redistribuição.`,
          affectedEntities: [overloadedTherapist?.therapist.id!, underloadedTherapist?.therapist.id!],
          suggestedActions: [
            {
              action: 'Redistribuir pacientes entre fisioterapeutas',
              priority: 2,
              estimatedImpact: 'MEDIUM',
              resourcesRequired: ['gestão', 'agenda']
            },
            {
              action: 'Analisar especialidades e preferências dos terapeutas',
              priority: 1,
              estimatedImpact: 'LOW',
              resourcesRequired: ['gestão']
            }
          ],
          createdAt: new Date().toISOString(),
          isRead: false,
          isResolved: false
        });
      }
    }

    // Análise de horários ociosos
    const appointmentsByHour = appointments.reduce((acc, apt) => {
      const hour = new Date(apt.date).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    const peakHours = Object.entries(appointmentsByHour)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    const lowHours = Object.entries(appointmentsByHour)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 2)
      .map(([hour]) => parseInt(hour));

    if (lowHours.length > 0) {
      alerts.push({
        id: `optimization_schedule_${Date.now()}`,
        type: AlertType.OPERATIONAL_OPTIMIZATION,
        severity: 'LOW',
        title: 'Otimização de Horários',
        description: `Horários com baixa demanda identificados: ${lowHours.join('h, ')}h. Considere ajustar agenda ou promoções.`,
        affectedEntities: [],
        suggestedActions: [
          {
            action: 'Oferecer desconto para horários de baixa demanda',
            priority: 2,
            estimatedImpact: 'MEDIUM',
            resourcesRequired: ['marketing', 'financeiro']
          },
          {
            action: 'Ajustar horários de funcionamento',
            priority: 1,
            estimatedImpact: 'LOW',
            resourcesRequired: ['gestão']
          }
        ],
        createdAt: new Date().toISOString(),
        isRead: false,
        isResolved: false
      });
    }

    return alerts;
  }

  /**
   * ============== UTILIDADES ==============
   */

  private getDefaultAbandonmentActions(): any {
    return {
      severity: 'HIGH',
      actions: [
        {
          action: 'Entrar em contato imediatamente com o paciente',
          priority: 5,
          estimatedImpact: 'HIGH',
          resourcesRequired: ['fisioterapeuta', 'recepção']
        },
        {
          action: 'Revisar plano de tratamento e expectativas',
          priority: 4,
          estimatedImpact: 'HIGH',
          resourcesRequired: ['fisioterapeuta']
        },
        {
          action: 'Discutir preocupações e barreiras do paciente',
          priority: 4,
          estimatedImpact: 'MEDIUM',
          resourcesRequired: ['fisioterapeuta']
        }
      ]
    };
  }

  private createDefaultAbandonmentAlert(patient: Patient, prediction: TreatmentPrediction): SmartAlert {
    return {
      id: `abandonment_${prediction.patientId}_${Date.now()}`,
      type: AlertType.ABANDONMENT_RISK,
      severity: 'HIGH',
      title: `Risco de Abandono - ${patient.name}`,
      description: `Paciente ${patient.name} com alto risco de abandono do tratamento.`,
      affectedEntities: [prediction.patientId],
      suggestedActions: this.getDefaultAbandonmentActions().actions,
      createdAt: new Date().toISOString(),
      isRead: false,
      isResolved: false
    };
  }

  private filterUniqueAlerts(alerts: SmartAlert[]): SmartAlert[] {
    const seen = new Set();
    return alerts.filter(alert => {
      const key = `${alert.type}_${alert.affectedEntities.join('_')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private cleanupOldAlerts(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.createdAt) > sevenDaysAgo && !alert.isResolved
    );
  }

  /**
   * ============== API PÚBLICA ==============
   */

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts(): SmartAlert[] {
    return [...this.alerts].sort((a, b) => {
      // Ordena por severidade e data
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
      
      if (aSeverity !== bSeverity) return bSeverity - aSeverity;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  /**
   * Marca alerta como lido
   */
  markAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isRead = true;
    }
  }

  /**
   * Marca alerta como resolvido
   */
  markAsResolved(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.isResolved = true;
    }
  }

  /**
   * Obtém estatísticas de alertas
   */
  getAlertStats(): {
    total: number;
    byType: { [key in AlertType]: number };
    bySeverity: { [key: string]: number };
    unread: number;
    resolved: number;
  } {
    const byType = Object.values(AlertType).reduce((acc, type) => {
      acc[type] = this.alerts.filter(a => a.type === type).length;
      return acc;
    }, {} as { [key in AlertType]: number });

    const bySeverity = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].reduce((acc, severity) => {
      acc[severity] = this.alerts.filter(a => a.severity === severity).length;
      return acc;
    }, {} as { [key: string]: number });

    return {
      total: this.alerts.length,
      byType,
      bySeverity,
      unread: this.alerts.filter(a => !a.isRead).length,
      resolved: this.alerts.filter(a => a.isResolved).length
    };
  }
}

// Instância singleton
export const alertsService = new AlertsService();

// Funções de conveniência
export async function generateSmartAlerts(
  patients: Patient[],
  appointments: Appointment[],
  assessments: Assessment[],
  users: User[]
): Promise<SmartAlert[]> {
  return await alertsService.analyzeAndGenerateAlerts(patients, appointments, assessments, users);
}

export function getActiveAlerts(): SmartAlert[] {
  return alertsService.getActiveAlerts();
}