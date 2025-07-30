// services/ai-economica/monitoringService.ts
// Sistema de monitoramento em tempo real para IA econômica

import {
  PremiumProvider,
  ResponseSource,
  UsageStatus,
} from '../../types/ai-economica.types';
import { aiEconomicaLogger } from './logger';
import { AI_ECONOMICA_CONFIG } from '../../config/ai-economica.config';

export interface SystemMetrics {
  totalQueries: number;
  queriesBySource: Record<ResponseSource, number>;
  queriesByProvider: Record<PremiumProvider, number>;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  costSavings: number;
  lastUpdated: Date;
}

export interface AlertConfig {
  type:
    | 'usage_warning'
    | 'usage_critical'
    | 'error_rate'
    | 'slow_response'
    | 'cost_threshold';
  threshold: number;
  enabled: boolean;
  channels: ('email' | 'dashboard' | 'webhook')[];
}

export interface Alert {
  id: string;
  type: AlertConfig['type'];
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  data?: any;
}

export class MonitoringService {
  private metrics: SystemMetrics;
  private alerts: Alert[] = [];
  private alertConfigs: AlertConfig[] = [];
  private metricsHistory: SystemMetrics[] = [];

  constructor() {
    this.metrics = this.initializeMetrics();
    this.setupDefaultAlerts();
    this.startMetricsCollection();
  }

  private initializeMetrics(): SystemMetrics {
    return {
      totalQueries: 0,
      queriesBySource: {
        [ResponseSource.INTERNAL]: 0,
        [ResponseSource.CACHE]: 0,
        [ResponseSource.PREMIUM]: 0,
      },
      queriesByProvider: {
        [PremiumProvider.CHATGPT_PLUS]: 0,
        [PremiumProvider.GEMINI_PRO]: 0,
        [PremiumProvider.CLAUDE_PRO]: 0,
        [PremiumProvider.PERPLEXITY_PRO]: 0,
        [PremiumProvider.MARS_AI_PRO]: 0,
      },
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      costSavings: 0,
      lastUpdated: new Date(),
    };
  }

  private setupDefaultAlerts(): void {
    this.alertConfigs = [
      {
        type: 'usage_warning',
        threshold: AI_ECONOMICA_CONFIG.USAGE_ALERTS.WARNING_THRESHOLD,
        enabled: true,
        channels: ['dashboard', 'email'],
      },
      {
        type: 'usage_critical',
        threshold: AI_ECONOMICA_CONFIG.USAGE_ALERTS.CRITICAL_THRESHOLD,
        enabled: true,
        channels: ['dashboard', 'email', 'webhook'],
      },
      {
        type: 'error_rate',
        threshold: 0.1, // 10% de erro
        enabled: true,
        channels: ['dashboard', 'email'],
      },
      {
        type: 'slow_response',
        threshold: 10000, // 10 segundos
        enabled: true,
        channels: ['dashboard'],
      },
      {
        type: 'cost_threshold',
        threshold: 100, // R$ 100 de economia por dia
        enabled: true,
        channels: ['dashboard'],
      },
    ];
  }

  // Coleta de métricas
  recordQuery(
    source: ResponseSource,
    provider?: PremiumProvider,
    responseTime?: number
  ): void {
    this.metrics.totalQueries++;
    this.metrics.queriesBySource[source]++;

    if (provider) {
      this.metrics.queriesByProvider[provider]++;
    }

    if (responseTime) {
      // Calcular média móvel do tempo de resposta
      const currentAvg = this.metrics.averageResponseTime;
      const totalQueries = this.metrics.totalQueries;
      this.metrics.averageResponseTime =
        (currentAvg * (totalQueries - 1) + responseTime) / totalQueries;

      // Verificar alerta de resposta lenta
      this.checkSlowResponseAlert(responseTime);
    }

    this.updateCacheHitRate();
    this.metrics.lastUpdated = new Date();

    aiEconomicaLogger.logQuery('', 'GENERAL_QUESTION', source);
  }

  recordError(source: ResponseSource, error: Error): void {
    const totalQueries = this.metrics.totalQueries || 1;
    this.metrics.errorRate =
      (this.metrics.errorRate * (totalQueries - 1) + 1) / totalQueries;

    this.checkErrorRateAlert();
    aiEconomicaLogger.logQueryError('', error);
  }

  recordCostSaving(amount: number): void {
    this.metrics.costSavings += amount;
    aiEconomicaLogger.logCostSaving(amount, ResponseSource.INTERNAL);
  }

  private updateCacheHitRate(): void {
    const cacheHits = this.metrics.queriesBySource[ResponseSource.CACHE];
    const totalQueries = this.metrics.totalQueries;
    this.metrics.cacheHitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;
  }

  // Sistema de alertas
  private checkSlowResponseAlert(responseTime: number): void {
    const config = this.alertConfigs.find((c) => c.type === 'slow_response');
    if (config && config.enabled && responseTime > config.threshold) {
      this.createAlert({
        type: 'slow_response',
        message: `Resposta lenta detectada: ${responseTime}ms (limite: ${config.threshold}ms)`,
        severity: 'medium',
        data: { responseTime, threshold: config.threshold },
      });
    }
  }

  private checkErrorRateAlert(): void {
    const config = this.alertConfigs.find((c) => c.type === 'error_rate');
    if (config && config.enabled && this.metrics.errorRate > config.threshold) {
      this.createAlert({
        type: 'error_rate',
        message: `Taxa de erro alta: ${(this.metrics.errorRate * 100).toFixed(1)}%`,
        severity: 'high',
        data: {
          errorRate: this.metrics.errorRate,
          threshold: config.threshold,
        },
      });
    }
  }

  checkUsageAlert(provider: PremiumProvider, usageStatus: UsageStatus): void {
    const usagePercentage = usageStatus.currentUsage / usageStatus.monthlyLimit;

    const warningConfig = this.alertConfigs.find(
      (c) => c.type === 'usage_warning'
    );
    const criticalConfig = this.alertConfigs.find(
      (c) => c.type === 'usage_critical'
    );

    if (
      criticalConfig &&
      criticalConfig.enabled &&
      usagePercentage >= criticalConfig.threshold
    ) {
      this.createAlert({
        type: 'usage_critical',
        message: `${provider} atingiu ${(usagePercentage * 100).toFixed(1)}% do limite mensal`,
        severity: 'critical',
        data: { provider, usagePercentage, usageStatus },
      });
    } else if (
      warningConfig &&
      warningConfig.enabled &&
      usagePercentage >= warningConfig.threshold
    ) {
      this.createAlert({
        type: 'usage_warning',
        message: `${provider} atingiu ${(usagePercentage * 100).toFixed(1)}% do limite mensal`,
        severity: 'medium',
        data: { provider, usagePercentage, usageStatus },
      });
    }
  }

  private createAlert(
    alertData: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>
  ): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      acknowledged: false,
      ...alertData,
    };

    this.alerts.push(alert);

    // Manter apenas os últimos 1000 alertas
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }

    // Enviar notificações
    this.sendAlertNotifications(alert);

    aiEconomicaLogger.log('WARN', 'ALERT_CREATED', alert.message, alert.data);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sendAlertNotifications(alert: Alert): void {
    const config = this.alertConfigs.find((c) => c.type === alert.type);
    if (!config) return;

    config.channels.forEach((channel) => {
      switch (channel) {
        case 'dashboard':
          // Notificação será exibida no dashboard
          break;
        case 'email':
          this.sendEmailAlert(alert);
          break;
        case 'webhook':
          this.sendWebhookAlert(alert);
          break;
      }
    });
  }

  private sendEmailAlert(alert: Alert): void {
    // TODO: Implementar envio de email
    console.log(`📧 Email alert: ${alert.message}`);
  }

  private sendWebhookAlert(alert: Alert): void {
    // TODO: Implementar webhook
    console.log(`🔗 Webhook alert: ${alert.message}`);
  }

  // Métodos públicos para acessar dados
  getCurrentMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  getAllAlerts(limit = 100): Alert[] {
    return this.alerts.slice(-limit);
  }

  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  getMetricsHistory(hours = 24): SystemMetrics[] {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    return this.metricsHistory.filter((m) => m.lastUpdated >= cutoff);
  }

  // Dashboard data
  getDashboardData() {
    return {
      metrics: this.getCurrentMetrics(),
      activeAlerts: this.getActiveAlerts(),
      recentHistory: this.getMetricsHistory(24),
      systemHealth: this.calculateSystemHealth(),
    };
  }

  private calculateSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(
      (a) => a.severity === 'critical'
    );
    const highAlerts = activeAlerts.filter((a) => a.severity === 'high');

    if (criticalAlerts.length > 0) return 'critical';
    if (highAlerts.length > 0 || this.metrics.errorRate > 0.05)
      return 'warning';
    return 'healthy';
  }

  // Coleta periódica de métricas
  private startMetricsCollection(): void {
    setInterval(
      () => {
        // Salvar snapshot das métricas atuais
        this.metricsHistory.push({ ...this.metrics });

        // Manter apenas as últimas 24 horas de histórico
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 24);
        this.metricsHistory = this.metricsHistory.filter(
          (m) => m.lastUpdated >= cutoff
        );
      },
      5 * 60 * 1000
    ); // A cada 5 minutos
  }

  // Configuração de alertas
  updateAlertConfig(
    type: AlertConfig['type'],
    config: Partial<AlertConfig>
  ): void {
    const index = this.alertConfigs.findIndex((c) => c.type === type);
    if (index >= 0) {
      this.alertConfigs[index] = { ...this.alertConfigs[index], ...config };
    } else {
      this.alertConfigs.push({
        type,
        threshold: 0,
        enabled: true,
        channels: ['dashboard'],
        ...config,
      } as AlertConfig);
    }
  }

  getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }
}

// Instância singleton do serviço de monitoramento
export const monitoringService = new MonitoringService();
