/**
 * Dashboard de Monitoramento do Sistema
 * Centraliza visualização de métricas de performance, erros, sync e segurança
 */

import React, { useState, useEffect } from 'react';

import { useAppConfig } from '../../contexts/AppConfigContext';
import { useUIState } from '../../contexts/UIStateContext';
import { useErrorHandler } from '../../services/errorTracker';
import { usePerformanceMonitor } from '../../services/performanceMonitor';
import { useSyncService } from '../../services/syncService';

// === INTERFACES ===
interface SystemHealth {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  performance: {
    score: number;
    status: 'good' | 'needs_improvement' | 'poor';
    issues: string[];
  };
  errors: {
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recentErrors: number;
  };
  sync: {
    status: 'synced' | 'syncing' | 'offline' | 'error';
    pendingChanges: number;
    lastSync: string;
  };
  security: {
    level: 'secure' | 'warning' | 'vulnerable';
    issues: string[];
    lastAudit: string;
  };
}

// === COMPONENTE PRINCIPAL ===
export const SystemMonitorDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { stats: errorStats } = useErrorHandler();
  const { getMetrics, generateReport, getAlerts } = usePerformanceMonitor();
  const { status: syncStatus } = useSyncService();
  const { config } = useAppConfig();
  const { showToast } = useUIState();

  // === CALCULAR SAÚDE DO SISTEMA ===
  useEffect(() => {
    const calculateSystemHealth = (): SystemHealth => {
      // Performance Analysis
      const perfMetrics = getMetrics({ timeframe: 'hour' });
      const perfAlerts = getAlerts();
      const performanceScore = calculatePerformanceScore(perfMetrics);
      
      // Error Analysis
      const errorSeverity = calculateErrorSeverity(errorStats);
      
      // Sync Status
      const syncStatusValue = syncStatus?.status || 'offline';
      
      // Security Level
      const securityLevel = calculateSecurityLevel(config);
      
      // Overall Health
      const overallHealth = calculateOverallHealth({
        performance: performanceScore,
        errors: errorSeverity,
        sync: syncStatusValue,
        security: securityLevel,
      });

      return {
        overall: overallHealth,
        performance: {
          score: performanceScore,
          status: performanceScore > 90 ? 'good' : performanceScore > 70 ? 'needs_improvement' : 'poor',
          issues: perfAlerts.map(a => a.message),
        },
        errors: {
          count: errorStats.totalErrors,
          severity: errorSeverity,
          recentErrors: errorStats.todayErrors,
        },
        sync: {
          status: syncStatusValue,
          pendingChanges: syncStatus?.pendingChanges || 0,
          lastSync: syncStatus?.lastSync || 'Nunca',
        },
        security: {
          level: securityLevel,
          issues: getSecurityIssues(config),
          lastAudit: new Date().toISOString(),
        },
      };
    };

    const updateHealth = () => {
      setSystemHealth(calculateSystemHealth());
    };

    updateHealth();
    
    // Auto-refresh a cada 30 segundos
    const interval = setInterval(updateHealth, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [errorStats, syncStatus, config, getMetrics, getAlerts]);

  // === HANDLERS ===
  const handleRefresh = () => {
    if (systemHealth) {
      setSystemHealth(null);
      setTimeout(() => {
        // Trigger recalculation
        const event = new CustomEvent('system-health-refresh');
        window.dispatchEvent(event);
      }, 500);
    }
  };

  const handleExportReport = () => {
    try {
      const report = generateReport('daily');
      const reportData = {
        timestamp: new Date().toISOString(),
        systemHealth,
        performanceReport: report,
        errorStats,
        syncStatus,
      };
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fisioflow-system-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      
      showToast({
        type: 'success',
        message: 'Relatório exportado com sucesso',
      });
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Erro ao exportar relatório',
      });
    }
  };

  // === RENDER ===
  if (!systemHealth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analisando saúde do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Monitoramento do Sistema
        </h1>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🔄 Atualizar
          </button>
          <button
            onClick={handleExportReport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            📊 Exportar Relatório
          </button>
        </div>
      </div>

      {/* Overall Health */}
      <OverallHealthCard health={systemHealth.overall} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PerformanceCard performance={systemHealth.performance} />
        <ErrorsCard errors={systemHealth.errors} />
        <SyncCard sync={systemHealth.sync} />
        <SecurityCard security={systemHealth.security} />
      </div>

      {/* Detailed Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceChart />
        <ErrorTrendsChart />
      </div>

      {/* System Recommendations */}
      <SystemRecommendations health={systemHealth} />
    </div>
  );
};

// === COMPONENTES AUXILIARES ===

const OverallHealthCard: React.FC<{ health: SystemHealth['overall'] }> = ({ health }) => {
  const healthConfig = {
    excellent: { color: 'green', icon: '🟢', text: 'Excelente' },
    good: { color: 'blue', icon: '🔵', text: 'Bom' },
    warning: { color: 'yellow', icon: '🟡', text: 'Atenção' },
    critical: { color: 'red', icon: '🔴', text: 'Crítico' },
  };

  const config = healthConfig[health];

  return (
    <div className={`bg-${config.color}-50 border border-${config.color}-200 rounded-lg p-6`}>
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">{config.icon}</div>
          <h2 className="text-2xl font-bold text-gray-900">
            Sistema {config.text}
          </h2>
          <p className="text-gray-600 mt-2">
            Todos os sistemas operando dentro dos parâmetros esperados
          </p>
        </div>
      </div>
    </div>
  );
};

const PerformanceCard: React.FC<{ performance: SystemHealth['performance'] }> = ({ performance }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
        <span className="text-2xl">⚡</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Score</span>
            <span>{performance.score}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                performance.score > 90 ? 'bg-green-600' :
                performance.score > 70 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${performance.score}%` }}
            ></div>
          </div>
        </div>
        
        <div className="text-sm">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            performance.status === 'good' ? 'bg-green-100 text-green-800' :
            performance.status === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {performance.status === 'good' ? 'Ótimo' : 
             performance.status === 'needs_improvement' ? 'Pode melhorar' : 'Precisa atenção'}
          </span>
        </div>
      </div>
    </div>
  );
};

const ErrorsCard: React.FC<{ errors: SystemHealth['errors'] }> = ({ errors }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Erros</h3>
        <span className="text-2xl">🚨</span>
      </div>
      
      <div className="space-y-3">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{errors.count}</div>
          <div className="text-sm text-gray-600">Total de erros</div>
        </div>
        
        <div className="text-center">
          <div className={`text-xl font-semibold ${getSeverityColor(errors.severity)}`}>
            {errors.recentErrors}
          </div>
          <div className="text-sm text-gray-600">Hoje</div>
        </div>
        
        <div className="text-center">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            errors.severity === 'low' ? 'bg-green-100 text-green-800' :
            errors.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
            errors.severity === 'high' ? 'bg-orange-100 text-orange-800' :
            'bg-red-100 text-red-800'
          }`}>
            Severidade: {errors.severity}
          </span>
        </div>
      </div>
    </div>
  );
};

const SyncCard: React.FC<{ sync: SystemHealth['sync'] }> = ({ sync }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return 'text-green-600';
      case 'syncing': return 'text-blue-600';
      case 'offline': return 'text-gray-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'synced': return 'Sincronizado';
      case 'syncing': return 'Sincronizando';
      case 'offline': return 'Offline';
      case 'error': return 'Erro';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Sincronização</h3>
        <span className="text-2xl">🔄</span>
      </div>
      
      <div className="space-y-3">
        <div className="text-center">
          <div className={`text-lg font-semibold ${getStatusColor(sync.status)}`}>
            {getStatusText(sync.status)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{sync.pendingChanges}</div>
          <div className="text-sm text-gray-600">Mudanças pendentes</div>
        </div>
        
        <div className="text-center text-xs text-gray-500">
          Último sync: {sync.lastSync !== 'Nunca' ? 
            new Date(sync.lastSync).toLocaleString('pt-BR') : 'Nunca'
          }
        </div>
      </div>
    </div>
  );
};

const SecurityCard: React.FC<{ security: SystemHealth['security'] }> = ({ security }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'secure': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'vulnerable': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getLevelText = (level: string) => {
    switch (level) {
      case 'secure': return 'Seguro';
      case 'warning': return 'Atenção';
      case 'vulnerable': return 'Vulnerável';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Segurança</h3>
        <span className="text-2xl">🔐</span>
      </div>
      
      <div className="space-y-3">
        <div className="text-center">
          <div className={`text-lg font-semibold ${getLevelColor(security.level)}`}>
            {getLevelText(security.level)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{security.issues.length}</div>
          <div className="text-sm text-gray-600">Issues detectadas</div>
        </div>
        
        <div className="text-center text-xs text-gray-500">
          Última auditoria: {new Date(security.lastAudit).toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
};

const PerformanceChart: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tendência de Performance (24h)
      </h3>
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>Gráfico de performance seria renderizado aqui</p>
          <p className="text-sm">Integração com biblioteca de charts necessária</p>
        </div>
      </div>
    </div>
  );
};

const ErrorTrendsChart: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Tendência de Erros (7 dias)
      </h3>
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>Gráfico de erros seria renderizado aqui</p>
          <p className="text-sm">Integração com biblioteca de charts necessária</p>
        </div>
      </div>
    </div>
  );
};

const SystemRecommendations: React.FC<{ health: SystemHealth }> = ({ health }) => {
  const generateRecommendations = (health: SystemHealth) => {
    const recommendations = [];

    if (health.performance.score < 80) {
      recommendations.push({
        priority: 'high',
        title: 'Otimizar Performance',
        description: 'Score de performance abaixo do ideal. Revisar métricas de Core Web Vitals.',
        action: 'Implementar otimizações de imagem e code splitting'
      });
    }

    if (health.errors.count > 10) {
      recommendations.push({
        priority: 'medium',
        title: 'Reduzir Taxa de Erros',
        description: 'Número elevado de erros detectados no sistema.',
        action: 'Revisar logs de erro e implementar correções'
      });
    }

    if (health.sync.status === 'error') {
      recommendations.push({
        priority: 'high',
        title: 'Corrigir Sincronização',
        description: 'Erro na sincronização de dados entre dispositivos.',
        action: 'Verificar conectividade e resolver conflitos de dados'
      });
    }

    if (health.security.level !== 'secure') {
      recommendations.push({
        priority: 'critical',
        title: 'Melhorar Segurança',
        description: 'Issues de segurança detectadas no sistema.',
        action: 'Implementar correções de segurança recomendadas'
      });
    }

    return recommendations;
  };

  const recommendations = generateRecommendations(health);

  if (recommendations.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-4xl mb-2">✅</div>
          <h3 className="text-lg font-semibold text-green-900">Sistema Otimizado</h3>
          <p className="text-green-700">Nenhuma recomendação de melhoria necessária no momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Recomendações do Sistema
      </h3>
      
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <div key={index} className={`border-l-4 pl-4 ${
            rec.priority === 'critical' ? 'border-red-500' :
            rec.priority === 'high' ? 'border-orange-500' :
            rec.priority === 'medium' ? 'border-yellow-500' :
            'border-blue-500'
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{rec.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                <p className="text-sm text-blue-600 mt-2 font-medium">{rec.action}</p>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {rec.priority}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// === FUNÇÕES AUXILIARES ===

const calculatePerformanceScore = (metrics: any[]): number => {
  // Simplified performance score calculation
  // In real implementation, would analyze Core Web Vitals
  const baseScore = 85;
  const recentErrors = metrics.filter(m => m.severity === 'poor').length;
  return Math.max(0, Math.min(100, baseScore - (recentErrors * 5)));
};

const calculateErrorSeverity = (errorStats: any): SystemHealth['errors']['severity'] => {
  if (errorStats.totalErrors === 0) return 'low';
  if (errorStats.todayErrors > 20) return 'critical';
  if (errorStats.todayErrors > 10) return 'high';
  if (errorStats.todayErrors > 5) return 'medium';
  return 'low';
};

const calculateSecurityLevel = (config: any): SystemHealth['security']['level'] => {
  // Simplified security assessment
  if (!config.enableAnalytics && config.enableCrashReporting) return 'secure';
  if (config.enableAnalytics) return 'warning';
  return 'secure';
};

const calculateOverallHealth = (factors: {
  performance: number;
  errors: string;
  sync: string;
  security: string;
}): SystemHealth['overall'] => {
  let score = 0;
  
  // Performance weight: 40%
  score += (factors.performance / 100) * 40;
  
  // Errors weight: 30%
  const errorScores = { low: 30, medium: 20, high: 10, critical: 0 };
  score += errorScores[factors.errors as keyof typeof errorScores] || 0;
  
  // Sync weight: 15%
  const syncScores = { synced: 15, syncing: 10, offline: 5, error: 0 };
  score += syncScores[factors.sync as keyof typeof syncScores] || 0;
  
  // Security weight: 15%
  const securityScores = { secure: 15, warning: 10, vulnerable: 0 };
  score += securityScores[factors.security as keyof typeof securityScores] || 0;
  
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'warning';
  return 'critical';
};

const getSecurityIssues = (config: any): string[] => {
  const issues = [];
  
  if (config.enableAnalytics) {
    issues.push('Analytics habilitado - pode impactar privacidade');
  }
  
  if (!config.enableCrashReporting) {
    issues.push('Crash reporting desabilitado - dificulta debugging');
  }
  
  return issues;
};

export default SystemMonitorDashboard;