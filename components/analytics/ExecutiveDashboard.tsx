/**
 * Dashboard Executivo com Analytics Preditivo
 * Visualizações interativas usando D3.js e componentes customizados
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  AlertTriangle,
  Target,
  Brain,
  Zap,
  RefreshCw,
  Settings,
  Download,
  Filter,
  Bell,
  X,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useData } from '../../hooks/useData';
import { useAuth } from '../../hooks/useAuth';
import { useNotification } from '../../hooks/useNotification';
import { analyticsService, generateDashboard } from '../../services/analyticsService';
import { mlService } from '../../services/mlService';
import type { 
  ExecutiveDashboard as DashboardData, 
  TreatmentPrediction,
  ClinicalInsight 
} from '../../types/analytics';

// Componentes de visualização
import { KPICard } from './components/KPICard';
import { TrendChart } from './components/TrendChart';
import { SuccessRateChart } from './components/SuccessRateChart';
import { TherapistPerformanceTable } from './components/TherapistPerformanceTable';
import { PatientPredictions } from './components/PatientPredictions';
import { ClinicalInsightsPanel } from './components/ClinicalInsightsPanel';

interface ExecutiveDashboardProps {
  isOpen?: boolean;
  onClose?: () => void;
}

// Interface para configurações do dashboard
interface DashboardConfig {
  showPredictions: boolean;
  showInsights: boolean;
  showPerformance: boolean;
  refreshInterval: number;
  compactMode: boolean;
  notifications: boolean;
}

// Interface para filtros
interface DashboardFilters {
  therapistIds: string[];
  pathologies: string[];
  riskLevels: ('LOW' | 'MEDIUM' | 'HIGH')[];
  dateRange: { start: Date; end: Date };
}

export function ExecutiveDashboard({ isOpen = true, onClose }: ExecutiveDashboardProps) {
  const { currentUser } = useAuth();
  const { showNotification } = useNotification();
  const {
    patients,
    users,
    appointments,
    assessments,
    transactions,
    prescriptions,
    exercises
  } = useData();

  // Estados principais
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [predictions, setPredictions] = useState<TreatmentPrediction[]>([]);
  const [insights, setInsights] = useState<ClinicalInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Estados de UI e configuração
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'predictions' | 'insights' | 'performance'>('overview');
  
  // Configurações do dashboard (salvas no localStorage)
  const [config, setConfig] = useState<DashboardConfig>(() => {
    const saved = localStorage.getItem('dashboard_config');
    return saved ? JSON.parse(saved) : {
      showPredictions: true,
      showInsights: true,
      showPerformance: true,
      refreshInterval: 60000,
      compactMode: false,
      notifications: true
    };
  });
  
  // Filtros aplicados
  const [filters, setFilters] = useState<DashboardFilters>({
    therapistIds: [],
    pathologies: [],
    riskLevels: ['HIGH', 'MEDIUM', 'LOW'],
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  });

  // Salva configurações no localStorage
  useEffect(() => {
    localStorage.setItem('dashboard_config', JSON.stringify(config));
  }, [config]);
  
  // Auto-refresh com intervalo configurável
  useEffect(() => {
    if (isOpen && autoRefresh) {
      const interval = setInterval(loadDashboardData, config.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isOpen, autoRefresh, config.refreshInterval, selectedTimeRange, filters]);
  
  // Carrega dados iniciais
  useEffect(() => {
    if (isOpen) {
      loadDashboardData();
    }
  }, [isOpen, selectedTimeRange, filters]);

  // Funções de callback para configurações
  const updateConfig = useCallback((updates: Partial<DashboardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  const updateFilters = useCallback((updates: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Função para exportar relatório
  const exportReport = useCallback(async (format: 'pdf' | 'excel' | 'csv') => {
    if (!dashboardData) return;
    
    try {
      const reportData = {
        generated: new Date().toISOString(),
        timeRange: selectedTimeRange,
        filters,
        kpis: dashboardData.kpis,
        trends: dashboardData.trends,
        predictions: predictions.length,
        insights: insights.length
      };
      
      let content: string;
      let filename: string;
      let mimeType: string;
      
      switch (format) {
        case 'csv':
          content = generateCSVReport(reportData);
          filename = `dashboard_${selectedTimeRange}_${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'excel':
          // Implementação simplificada para Excel
          content = generateCSVReport(reportData);
          filename = `dashboard_${selectedTimeRange}_${Date.now()}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        default: // PDF
          content = generatePDFReport(reportData);
          filename = `dashboard_${selectedTimeRange}_${Date.now()}.pdf`;
          mimeType = 'application/pdf';
      }
      
      // Download do arquivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showNotification('Relatório exportado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      showNotification('Erro ao exportar relatório', 'error');
    }
  }, [dashboardData, predictions, insights, selectedTimeRange, filters, showNotification]);
  
  // Função otimizada para carregar dados com filtros
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Aplica filtros nos dados
      const filteredPatients = patients.filter(patient => {
        const matchesTherapist = filters.therapistIds.length === 0 || 
          appointments.some(apt => apt.patientId === patient.id && filters.therapistIds.includes(apt.therapistId || ''));
        // Adicionar mais filtros conforme necessário
        return matchesTherapist;
      });
      
      // Carrega dados em paralelo para performance
      const [dashboard, patientPredictions, clinicalInsights] = await Promise.all([
        generateDashboard(filteredPatients, users, appointments, assessments, transactions),
        config.showPredictions ? mlService.batchPredict(filteredPatients.slice(0, 20), (patientId) => ({
          assessments: assessments.filter(a => a.patientId === patientId),
          appointments: appointments.filter(a => a.patientId === patientId),
          prescriptions: prescriptions.filter(p => p.patientId === patientId)
        })) : Promise.resolve([]),
        config.showInsights ? analyticsService.generateClinicalInsights(
          filteredPatients, 
          appointments, 
          assessments, 
          exercises
        ) : Promise.resolve([])
      ]);

      setDashboardData(dashboard);
      setPredictions(patientPredictions);
      setInsights(clinicalInsights);
      setLastUpdate(new Date());

      // Notificações inteligentes
      if (config.notifications) {
        checkForImportantAlerts(patientPredictions, dashboard);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      showNotification('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [patients, users, appointments, assessments, transactions, prescriptions, exercises, filters, config, showNotification]);

  // Função para verificar alertas importantes
  const checkForImportantAlerts = useCallback((predictions: TreatmentPrediction[], dashboard: DashboardData) => {
    const highRiskPatients = predictions.filter(p => p.abandonmentRisk === 'HIGH');
    const lowSuccessRate = dashboard.kpis.treatmentSuccessRate < 0.7;
    
    if (highRiskPatients.length > 0) {
      showNotification(
        `${highRiskPatients.length} paciente(s) com alto risco de abandono detectado(s)`,
        'warning'
      );
    }
    
    if (lowSuccessRate) {
      showNotification(
        `Taxa de sucesso abaixo do esperado: ${Math.round(dashboard.kpis.treatmentSuccessRate * 100)}%`,
        'warning'
      );
    }
  }, [showNotification]);

  // Funções utilitárias para exportação
  const generateCSVReport = (data: any): string => {
    const headers = ['Métrica', 'Valor', 'Tendência'];
    const rows = [
      ['Total de Pacientes', data.kpis.totalPatients, data.trends.patientGrowth > 0 ? 'Crescimento' : 'Decline'],
      ['Taxa de Sucesso', `${Math.round(data.kpis.treatmentSuccessRate * 100)}%`, 'Estável'],
      ['Satisfação', `${data.kpis.averagePatientSatisfaction.toFixed(1)}/5`, 'Boa'],
      ['Receita Total', `R$ ${data.kpis.totalRevenue.toLocaleString()}`, 'Crescendo']
    ];
    
    return [headers, ...rows].map(row => row.join(',')).join('\\n');
  };

  const generatePDFReport = (data: any): string => {
    // Implementação simplificada - em produção usaria bibliotecas como jsPDF
    return `Dashboard FisioFlow - Relatório
Gerado em: ${new Date().toLocaleString('pt-BR')}

KPIs Principais:
- Total de Pacientes: ${data.kpis.totalPatients}
- Taxa de Sucesso: ${Math.round(data.kpis.treatmentSuccessRate * 100)}%
- Satisfação Média: ${data.kpis.averagePatientSatisfaction.toFixed(1)}/5
- Receita Total: R$ ${data.kpis.totalRevenue.toLocaleString()}

Predições: ${data.predictions} casos analisados
Insights: ${data.insights} insights gerados
    `;
  };


  // Métricas calculadas
  const kpiMetrics = useMemo(() => {
    if (!dashboardData) return null;

    const { clinicKPIs, treatmentSuccess, patientSatisfaction, financialMetrics } = dashboardData;

    return [
      {
        title: 'Pacientes Ativos',
        value: clinicKPIs.activePatients.toString(),
        change: `+${clinicKPIs.newPatientsThisMonth}`,
        changeType: 'positive' as const,
        icon: Users,
        color: 'blue'
      },
      {
        title: 'Taxa de Sucesso',
        value: `${Math.round(clinicKPIs.overallSuccessRate * 100)}%`,
        change: '+5.2%',
        changeType: 'positive' as const,
        icon: Target,
        color: 'green'
      },
      {
        title: 'Sessões por Paciente',
        value: clinicKPIs.averageSessionsPerPatient.toString(),
        change: '+0.8',
        changeType: 'positive' as const,
        icon: Calendar,
        color: 'purple'
      },
      {
        title: 'NPS de Satisfação',
        value: patientSatisfaction.overallNPS.toString(),
        change: '+12',
        changeType: 'positive' as const,
        icon: TrendingUp,
        color: 'orange'
      },
      {
        title: 'Receita Total',
        value: `R$ ${(financialMetrics.totalRevenue / 1000).toFixed(0)}k`,
        change: '+18.5%',
        changeType: 'positive' as const,
        icon: DollarSign,
        color: 'green'
      },
      {
        title: 'Margem de Lucro',
        value: `${Math.round(financialMetrics.profitMargin * 100)}%`,
        change: '+2.1%',
        changeType: 'positive' as const,
        icon: BarChart3,
        color: 'blue'
      }
    ];
  }, [dashboardData]);

  // Alertas críticos
  const criticalAlerts = useMemo(() => {
    if (!predictions) return [];

    return predictions
      .filter(p => p.abandonmentRisk === 'HIGH' || p.complicationRisk > 0.7)
      .slice(0, 3)
      .map(p => ({
        id: p.patientId,
        type: p.abandonmentRisk === 'HIGH' ? 'abandonment' : 'complication',
        message: p.abandonmentRisk === 'HIGH' 
          ? `Paciente ${p.patientId} com alto risco de abandono`
          : `Paciente ${p.patientId} com risco de complicações`,
        severity: 'high' as const
      }));
  }, [predictions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-bold">Dashboard Executivo</h1>
              <p className="text-blue-100 text-sm">Analytics Preditivo e Insights Clínicos</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Controles de tempo */}
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-1 rounded bg-white bg-opacity-20 text-white border border-white border-opacity-30"
            >
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
              <option value="90d">90 dias</option>
              <option value="1y">1 ano</option>
            </select>

            {/* Auto refresh */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded ${autoRefresh ? 'bg-green-500' : 'bg-gray-500'} bg-opacity-30`}
              title={autoRefresh ? 'Auto-refresh ativo' : 'Auto-refresh inativo'}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            </button>

            {/* Botão manual de refresh */}
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="p-2 rounded bg-white bg-opacity-20 hover:bg-opacity-30 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Fechar */}
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando analytics preditivo...</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Alertas Críticos */}
              {criticalAlerts.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                    <h3 className="font-semibold text-red-900">Alertas Críticos</h3>
                  </div>
                  <div className="space-y-2">
                    {criticalAlerts.map(alert => (
                      <div key={alert.id} className="flex items-center justify-between bg-white p-3 rounded">
                        <span className="text-sm">{alert.message}</span>
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700">
                          Ver Detalhes
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* KPIs Principais */}
              {kpiMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {kpiMetrics.map((metric, index) => (
                    <KPICard key={index} {...metric} />
                  ))}
                </div>
              )}

              {/* Gráficos e Análises */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Tendências de Sucesso */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Tendências de Sucesso
                  </h3>
                  {dashboardData?.treatmentSuccess && (
                    <TrendChart data={dashboardData.treatmentSuccess.overallTrends} />
                  )}
                </div>

                {/* Taxa de Sucesso por Patologia */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-blue-600" />
                    Sucesso por Patologia
                  </h3>
                  {dashboardData?.treatmentSuccess && (
                    <SuccessRateChart data={dashboardData.treatmentSuccess.byPathology} />
                  )}
                </div>
              </div>

              {/* Performance dos Fisioterapeutas */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-600" />
                  Performance dos Fisioterapeutas
                </h3>
                {dashboardData?.therapistMetrics && (
                  <TherapistPerformanceTable therapists={dashboardData.therapistMetrics} />
                )}
              </div>

              {/* Predições de Pacientes */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-indigo-600" />
                  Predições de Tratamento (IA)
                </h3>
                <PatientPredictions predictions={predictions} patients={patients} />
              </div>

              {/* Insights Clínicos */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-yellow-600" />
                  Insights Clínicos
                </h3>
                <ClinicalInsightsPanel insights={insights} />
              </div>
            </div>
          )}
        </div>

        {/* Footer com estatísticas */}
        <div className="border-t bg-gray-50 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Última atualização: {dashboardData?.generatedAt 
                ? new Date(dashboardData.generatedAt).toLocaleString('pt-BR')
                : 'Carregando...'
              }
            </div>
            <div className="flex items-center space-x-4">
              <span>💰 Economia com IA: R$ 0,00/mês</span>
              <span>🎯 Pacientes analisados: {patients.length}</span>
              <span>🧠 Predições ativas: {predictions.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}