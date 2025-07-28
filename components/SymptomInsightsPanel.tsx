import React, { useState, useEffect } from 'react';

import { SymptomAnalysisService } from '../services/symptomAnalysisService';
import {
  SymptomDiaryEntry,
  SymptomAnalysis,
  SymptomInsight,
  SymptomAlert,
  SymptomTrend,
  Patient,
} from '../types';

interface SymptomInsightsPanelProps {
  entries: SymptomDiaryEntry[];
  patient: Patient;
  onAlertAction?: (
    alertId: string,
    action: 'acknowledge' | 'dismiss' | 'schedule_followup'
  ) => void;
}

const AlertIcon: React.FC<{ severity: 'low' | 'medium' | 'high' }> = ({
  severity,
}) => {
  const icons = {
    low: '🔵',
    medium: '🟡',
    high: '🔴',
  };
  return <span className="text-lg">{icons[severity]}</span>;
};

const TrendIcon: React.FC<{
  direction: 'increasing' | 'decreasing' | 'stable';
}> = ({ direction }) => {
  const icons = {
    increasing: '📈',
    decreasing: '📉',
    stable: '➡️',
  };
  const colors = {
    increasing: 'text-red-600',
    decreasing: 'text-green-600',
    stable: 'text-blue-600',
  };
  return (
    <span className={`text-lg ${colors[direction]}`}>{icons[direction]}</span>
  );
};

const InsightTypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: Record<string, string> = {
    pattern: '🔍',
    correlation: '🔗',
    medication: '💊',
    exercise: '🏃‍♂️',
    pain_location: '📍',
    trend: '📊',
  };
  return <span className="text-lg">{icons[type] || '💡'}</span>;
};

const ProgressRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ percentage, size = 40, strokeWidth = 4, color = '#3B82F6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90 transform">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#E5E7EB"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
};

export const SymptomInsightsPanel: React.FC<SymptomInsightsPanelProps> = ({
  entries,
  patient,
  onAlertAction,
}) => {
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'trends' | 'insights' | 'alerts'
  >('overview');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (entries.length > 0) {
      performAnalysis();
    } else {
      setLoading(false);
    }
  }, [entries, patient]);

  const performAnalysis = async () => {
    setLoading(true);
    try {
      // Simular delay de processamento
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = SymptomAnalysisService.performCompleteAnalysis(
        entries,
        patient.id,
        patient.tenantId
      );
      setAnalysis(result);
    } catch (error) {
      console.error('Erro na análise de sintomas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = (
    alertId: string,
    action: 'acknowledge' | 'dismiss' | 'schedule_followup'
  ) => {
    if (action === 'dismiss') {
      setDismissedAlerts((prev) => new Set([...prev, alertId]));
    }

    if (onAlertAction) {
      onAlertAction(alertId, action);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      improving: 'text-green-600 bg-green-50',
      stable: 'text-blue-600 bg-blue-50',
      concerning: 'text-yellow-600 bg-yellow-50',
      critical: 'text-red-600 bg-red-50',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-red-600',
    };
    return colors[level as keyof typeof colors] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Analisando dados de sintomas...</span>
        </div>
      </div>
    );
  }

  if (!analysis || entries.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <div className="mb-4 text-6xl text-gray-400">📊</div>
        <h3 className="mb-2 text-lg font-medium text-gray-900">
          Dados Insuficientes
        </h3>
        <p className="text-gray-600">
          São necessários pelo menos alguns registros de sintomas para gerar
          insights automáticos.
        </p>
      </div>
    );
  }

  const activeAlerts = analysis.alerts.filter(
    (alert) => !dismissedAlerts.has(alert.id)
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Insights Automáticos
            </h2>
            <p className="text-sm text-gray-600">
              Análise baseada em {analysis.statistics.totalEntries} registros
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div
              className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(analysis.summary.overallStatus)}`}
            >
              {analysis.summary.overallStatus === 'improving' &&
                '📈 Melhorando'}
              {analysis.summary.overallStatus === 'stable' && '➡️ Estável'}
              {analysis.summary.overallStatus === 'concerning' &&
                '⚠️ Preocupante'}
              {analysis.summary.overallStatus === 'critical' && '🚨 Crítico'}
            </div>
            <button
              onClick={performAnalysis}
              className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
            >
              🔄 Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'overview', label: 'Visão Geral', icon: '📋' },
            { id: 'trends', label: 'Tendências', icon: '📈' },
            { id: 'insights', label: 'Padrões', icon: '🔍' },
            {
              id: 'alerts',
              label: 'Alertas',
              icon: '🚨',
              badge: activeAlerts.length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Aba Visão Geral */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Estatísticas Principais */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center">
                  <ProgressRing
                    percentage={(10 - analysis.statistics.avgPain) * 10}
                    color="#DC2626"
                  />
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {analysis.statistics.avgPain.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Dor Média</div>
              </div>

              <div className="text-center">
                <div className="mb-2 flex items-center justify-center">
                  <ProgressRing
                    percentage={analysis.statistics.avgEnergy * 20}
                    color="#F59E0B"
                  />
                </div>
                <div className="text-2xl font-bold text-yellow-600">
                  {analysis.statistics.avgEnergy.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Energia Média</div>
              </div>

              <div className="text-center">
                <div className="mb-2 flex items-center justify-center">
                  <ProgressRing
                    percentage={analysis.statistics.avgSleep * 20}
                    color="#3B82F6"
                  />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {analysis.statistics.avgSleep.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Sono Médio</div>
              </div>

              <div className="text-center">
                <div className="mb-2 flex items-center justify-center">
                  <ProgressRing
                    percentage={analysis.statistics.avgMood * 20}
                    color="#10B981"
                  />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {analysis.statistics.avgMood.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Humor Médio</div>
              </div>
            </div>

            {/* Resumo Executivo */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 font-medium text-gray-900">
                Resumo Executivo
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nível de Risco:</span>
                  <span
                    className={`font-medium ${getRiskLevelColor(analysis.summary.riskLevel)}`}
                  >
                    {analysis.summary.riskLevel === 'low' && '🟢 Baixo'}
                    {analysis.summary.riskLevel === 'medium' && '🟡 Médio'}
                    {analysis.summary.riskLevel === 'high' && '🔴 Alto'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Período Analisado:
                  </span>
                  <span className="font-medium text-gray-900">
                    {analysis.period.totalDays} dias
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Tendências Detectadas:
                  </span>
                  <span className="font-medium text-gray-900">
                    {analysis.trends.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Padrões Identificados:
                  </span>
                  <span className="font-medium text-gray-900">
                    {analysis.insights.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Descobertas Principais */}
            {analysis.summary.keyFindings.length > 0 && (
              <div>
                <h3 className="mb-3 font-medium text-gray-900">
                  Descobertas Principais
                </h3>
                <div className="space-y-2">
                  {analysis.summary.keyFindings.map((finding, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-2 text-sm"
                    >
                      <span className="mt-1 text-blue-600">•</span>
                      <span className="text-gray-700">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recomendações */}
            {analysis.summary.recommendations.length > 0 && (
              <div>
                <h3 className="mb-3 font-medium text-gray-900">
                  Recomendações
                </h3>
                <div className="space-y-2">
                  {analysis.summary.recommendations
                    .slice(0, 5)
                    .map((recommendation, index) => (
                      <div
                        key={index}
                        className="flex items-start space-x-2 text-sm"
                      >
                        <span className="mt-1 text-green-600">✓</span>
                        <span className="text-gray-700">{recommendation}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Aba Tendências */}
        {activeTab === 'trends' && (
          <div className="space-y-4">
            {analysis.trends.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-4xl text-gray-400">📈</div>
                <p className="text-gray-600">
                  Nenhuma tendência significativa detectada
                </p>
              </div>
            ) : (
              analysis.trends.map((trend) => (
                <div key={trend.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendIcon direction={trend.direction} />
                      <h3 className="font-medium text-gray-900">
                        {trend.label}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          trend.isSignificant
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {trend.isSignificant ? 'Significativa' : 'Leve'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Confiança: {(trend.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 text-sm text-gray-700">
                    {trend.description}
                  </p>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Valor Atual:</span>
                      <div className="font-medium">
                        {trend.currentValue.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Valor Médio:</span>
                      <div className="font-medium">
                        {trend.averageValue.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Período:</span>
                      <div className="font-medium">
                        {trend.period.days} dias
                      </div>
                    </div>
                  </div>

                  {/* Projeção */}
                  {trend.projectedValues.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <h4 className="mb-2 text-xs font-medium text-gray-600">
                        Projeção (próximos 7 dias):
                      </h4>
                      <div className="flex space-x-2 text-xs">
                        {trend.projectedValues
                          .slice(0, 3)
                          .map((proj, index) => (
                            <div
                              key={index}
                              className="rounded bg-gray-50 px-2 py-1"
                            >
                              {new Date(proj.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })}
                              :
                              <span className="ml-1 font-medium">
                                {proj.value.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        <span className="text-gray-400">...</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba Insights */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            {analysis.insights.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-4xl text-gray-400">🔍</div>
                <p className="text-gray-600">
                  Nenhum padrão identificado ainda
                </p>
              </div>
            ) : (
              analysis.insights.map((insight) => (
                <div key={insight.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <InsightTypeIcon type={insight.type} />
                      <h3 className="font-medium text-gray-900">
                        {insight.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          insight.severity === 'high'
                            ? 'bg-red-100 text-red-700'
                            : insight.severity === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {insight.severity === 'high'
                          ? 'Alta Prioridade'
                          : insight.severity === 'medium'
                            ? 'Prioridade Média'
                            : 'Informativo'}
                      </span>
                      <span className="text-sm text-gray-600">
                        Confiança: {(insight.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 text-sm text-gray-700">
                    {insight.description}
                  </p>

                  <div className="rounded-lg bg-blue-50 p-3">
                    <h4 className="mb-1 text-sm font-medium text-blue-900">
                      Recomendação:
                    </h4>
                    <p className="text-sm text-blue-800">
                      {insight.recommendation}
                    </p>
                  </div>

                  <div className="mt-3 border-t pt-3 text-xs text-gray-600">
                    <span>
                      Baseado em {insight.basedOnEntries} registros •{' '}
                    </span>
                    <span>
                      Detectado em{' '}
                      {new Date(insight.detectedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Aba Alertas */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {activeAlerts.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mb-2 text-4xl text-gray-400">✅</div>
                <p className="text-gray-600">Nenhum alerta ativo no momento</p>
              </div>
            ) : (
              activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-4 ${
                    alert.severity === 'high'
                      ? 'border-red-200 bg-red-50'
                      : alert.severity === 'medium'
                        ? 'border-yellow-200 bg-yellow-50'
                        : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertIcon severity={alert.severity} />
                      <h3 className="font-medium text-gray-900">
                        {alert.title}
                      </h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.requiresAction && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                          Ação Necessária
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 text-sm text-gray-700">{alert.message}</p>

                  {alert.recommendations.length > 0 && (
                    <div className="mb-3">
                      <h4 className="mb-1 text-sm font-medium text-gray-900">
                        O que fazer:
                      </h4>
                      <ul className="space-y-1 text-sm text-gray-700">
                        {alert.recommendations.map((rec, index) => (
                          <li
                            key={index}
                            className="flex items-start space-x-1"
                          >
                            <span className="mt-1 text-gray-400">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-gray-600">
                      Condição: {alert.triggerCondition}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          handleAlertAction(alert.id, 'acknowledge')
                        }
                        className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                      >
                        Confirmar Leitura
                      </button>
                      <button
                        onClick={() => handleAlertAction(alert.id, 'dismiss')}
                        className="rounded bg-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-400"
                      >
                        Dispensar
                      </button>
                      {alert.requiresAction && (
                        <button
                          onClick={() =>
                            handleAlertAction(alert.id, 'schedule_followup')
                          }
                          className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                        >
                          Agendar Acompanhamento
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="text-center text-xs text-gray-600">
          Última análise:{' '}
          {new Date(analysis.generatedAt).toLocaleString('pt-BR')} • Versão{' '}
          {analysis.analysisVersion}
        </div>
      </div>
    </div>
  );
};

export default SymptomInsightsPanel;
