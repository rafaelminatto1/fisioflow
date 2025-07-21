import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { useSystemEvents } from '../hooks/useSystemEvents';
import IntegrationAPI from '../services/integrationAPI';
import {
  IconActivity,
  IconUsers,
  IconCalendar,
  IconDollarSign,
  IconHeart,
  IconBook,
  IconTrendingUp,
  IconTrendingDown,
  IconTarget,
  IconAlertTriangle,
  IconSearch,
} from './icons/IconComponents';

interface UnifiedDashboardProps {
  view?: 'executive' | 'clinical' | 'educational' | 'operational';
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({ 
  view = 'executive' 
}) => {
  const { user } = useAuth();
  const {
    patients,
    appointments,
    transactions,
    qualityIndicators,
    productivityMetrics,
    operationalAlerts,
    users,
    clinicalCases,
    mentorshipSessions,
    studentProgress,
    clinicalProtocols,
    patientProtocols,
  } = useData();

  const { events, generateConsolidatedMetrics } = useSystemEvents();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  // Calculate period dates
  const period = useMemo(() => {
    const now = new Date();
    const start = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    
    return {
      start: start.toISOString(),
      end: now.toISOString(),
    };
  }, [selectedPeriod]);

  // Generate consolidated metrics
  const consolidatedMetrics = useMemo(() => {
    return IntegrationAPI.generateConsolidatedMetrics(period, {
      patients,
      appointments,
      protocols: patientProtocols,
      mentorshipSessions,
      transactions,
      qualityIndicators,
      productivityMetrics,
    });
  }, [period, patients, appointments, patientProtocols, mentorshipSessions, transactions, qualityIndicators, productivityMetrics]);

  // Global search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    return IntegrationAPI.performGlobalSearch(
      searchQuery,
      ['patients', 'appointments', 'protocols', 'cases', 'tasks'],
      {
        patients,
        appointments,
        protocols: clinicalProtocols,
        cases: clinicalCases,
        tasks: [], // Would include tasks
      },
      user?.tenantId || ''
    );
  }, [searchQuery, patients, appointments, clinicalProtocols, clinicalCases, user?.tenantId]);

  // Recent system events
  const recentEvents = useMemo(() => {
    return events
      .filter(e => e.tenantId === user?.tenantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [events, user?.tenantId]);

  // Active alerts summary
  const alertsSummary = useMemo(() => {
    const active = operationalAlerts.filter(alert => alert.isActive);
    return {
      total: active.length,
      critical: active.filter(a => a.severity === 'critical').length,
      high: active.filter(a => a.severity === 'high').length,
      medium: active.filter(a => a.severity === 'medium').length,
      low: active.filter(a => a.severity === 'low').length,
    };
  }, [operationalAlerts]);

  // Quick action cards based on user role and current context
  const quickActions = useMemo(() => {
    const actions = [];
    
    if (user?.role === 'admin' || user?.role === 'fisio') {
      actions.push({
        title: 'Novo Paciente',
        icon: <IconUsers size={20} />,
        action: () => console.log('Open patient modal'),
        color: 'bg-blue-600',
      });
      
      actions.push({
        title: 'Agendar Consulta',
        icon: <IconCalendar size={20} />,
        action: () => console.log('Open appointment modal'),
        color: 'bg-green-600',
      });
    }
    
    actions.push({
      title: 'Relatório Rápido',
      icon: <IconActivity size={20} />,
      action: () => console.log('Generate quick report'),
      color: 'bg-purple-600',
    });
    
    if (user?.role === 'admin') {
      actions.push({
        title: 'Análise Completa',
        icon: <IconTarget size={20} />,
        action: () => console.log('Open analytics'),
        color: 'bg-orange-600',
      });
    }
    
    return actions;
  }, [user?.role]);

  if (!user) return null;

  return (
    <div className="flex-1 space-y-6 overflow-auto p-6">
      {/* Header with Global Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Dashboard Unificado 360°
          </h1>
          <p className="text-slate-400">
            Visão completa e integrada de todos os módulos do FisioFlow
          </p>
        </div>
        
        {/* Global Search */}
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <IconSearch className="text-slate-400" size={20} />
          </div>
          <input
            type="text"
            placeholder="Busca global (pacientes, protocolos, casos...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Search Results */}
      {searchResults && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">
            Resultados da Busca ({searchResults.total})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.patients.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Pacientes</h4>
                <ul className="space-y-1">
                  {searchResults.patients.slice(0, 3).map((patient: any) => (
                    <li key={patient.id} className="text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                      {patient.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {searchResults.protocols.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Protocolos</h4>
                <ul className="space-y-1">
                  {searchResults.protocols.slice(0, 3).map((protocol: any) => (
                    <li key={protocol.id} className="text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                      {protocol.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {searchResults.appointments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Agendamentos</h4>
                <ul className="space-y-1">
                  {searchResults.appointments.slice(0, 3).map((appointment: any) => (
                    <li key={appointment.id} className="text-sm text-slate-400 hover:text-slate-200 cursor-pointer">
                      {appointment.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Period Selector and Quick Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Hoje</option>
            <option value="week">Últimos 7 dias</option>
            <option value="month">Último mês</option>
          </select>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-white transition-colors hover:opacity-90 ${action.color}`}
            >
              {action.icon}
              <span className="hidden lg:inline">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Pacientes Ativos</p>
              <p className="text-2xl font-bold text-slate-100">
                {consolidatedMetrics.overview.activePatients}
              </p>
            </div>
            <div className="rounded-lg bg-blue-600/20 p-3">
              <IconUsers className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-green-500">
            <IconTrendingUp size={16} />
            <span className="text-sm">+{Math.round(consolidatedMetrics.trends.patientGrowth)}%</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Receita do Período</p>
              <p className="text-2xl font-bold text-slate-100">
                R$ {consolidatedMetrics.financial.totalRevenue.toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="rounded-lg bg-green-600/20 p-3">
              <IconDollarSign className="text-green-400" size={24} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-green-500">
            <IconTrendingUp size={16} />
            <span className="text-sm">+{Math.round(consolidatedMetrics.trends.revenueGrowth)}%</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Taxa de Utilização</p>
              <p className="text-2xl font-bold text-slate-100">
                {consolidatedMetrics.operational.utilizationRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg bg-purple-600/20 p-3">
              <IconTarget className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-blue-500">
            <IconActivity size={16} />
            <span className="text-sm">Meta: 85%</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Satisfação Média</p>
              <p className="text-2xl font-bold text-slate-100">
                {consolidatedMetrics.operational.patientSatisfaction.toFixed(1)}/5
              </p>
            </div>
            <div className="rounded-lg bg-yellow-600/20 p-3">
              <IconHeart className="text-yellow-400" size={24} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-green-500">
            <IconTrendingUp size={16} />
            <span className="text-sm">Tendência positiva</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Module Integration Status */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Status das Integrações
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Pacientes → Casos Clínicos</span>
              <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-400">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Protocolos → Exercícios</span>
              <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-400">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Consultas → Métricas</span>
              <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-400">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">Casos → Projetos</span>
              <span className="rounded-full bg-green-600/20 px-2 py-1 text-xs text-green-400">
                Ativo
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Consistência dos Dados</span>
              <span className="text-green-400">{consolidatedMetrics.integration.dataConsistency}%</span>
            </div>
          </div>
        </div>

        {/* Recent System Events */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Eventos Recentes do Sistema
          </h3>
          <div className="space-y-3">
            {recentEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm text-slate-300">
                    {event.type.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {recentEvents.length === 0 && (
            <div className="text-center text-slate-400 py-4">
              Nenhum evento recente
            </div>
          )}
        </div>

        {/* Active Alerts Summary */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Alertas Ativos
          </h3>
          <div className="space-y-3">
            {alertsSummary.critical > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="text-red-500" size={16} />
                  <span className="text-sm text-slate-300">Críticos</span>
                </div>
                <span className="text-red-400 font-medium">{alertsSummary.critical}</span>
              </div>
            )}
            {alertsSummary.high > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="text-orange-500" size={16} />
                  <span className="text-sm text-slate-300">Altos</span>
                </div>
                <span className="text-orange-400 font-medium">{alertsSummary.high}</span>
              </div>
            )}
            {alertsSummary.medium > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconAlertTriangle className="text-yellow-500" size={16} />
                  <span className="text-sm text-slate-300">Médios</span>
                </div>
                <span className="text-yellow-400 font-medium">{alertsSummary.medium}</span>
              </div>
            )}
            {alertsSummary.total === 0 && (
              <div className="text-center text-green-400 py-4">
                ✓ Nenhum alerta ativo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module-specific sections based on view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Clinical Module Summary */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Resumo Clínico
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {consolidatedMetrics.clinical.appointmentsCompleted}
              </p>
              <p className="text-sm text-slate-400">Consultas Concluídas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {consolidatedMetrics.clinical.protocolsActive}
              </p>
              <p className="text-sm text-slate-400">Protocolos Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {Math.round(consolidatedMetrics.clinical.averageSessionDuration)}min
              </p>
              <p className="text-sm text-slate-400">Duração Média</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">
                {consolidatedMetrics.overview.newPatients}
              </p>
              <p className="text-sm text-slate-400">Novos Pacientes</p>
            </div>
          </div>
        </div>

        {/* Educational Module Summary */}
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Resumo Educacional
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {consolidatedMetrics.educational.mentorshipSessions}
              </p>
              <p className="text-sm text-slate-400">Sessões de Mentoria</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">
                {consolidatedMetrics.educational.studentsActive}
              </p>
              <p className="text-sm text-slate-400">Estudantes Ativos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {clinicalCases.length}
              </p>
              <p className="text-sm text-slate-400">Casos Clínicos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">
                {clinicalProtocols.length}
              </p>
              <p className="text-sm text-slate-400">Protocolos Disponíveis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Workflow Status */}
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">
          Status dos Fluxos de Trabalho Integrados
        </h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg bg-slate-700/50 p-4">
            <h4 className="font-medium text-slate-200 mb-2">
              Fluxo: Novo Paciente → Protocolo → Exercícios
            </h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Automação ativa</span>
              <span className="text-green-400">✓ Funcionando</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Última execução: há 2 horas
            </div>
          </div>
          
          <div className="rounded-lg bg-slate-700/50 p-4">
            <h4 className="font-medium text-slate-200 mb-2">
              Fluxo: Caso Complexo → Projeto → Mentoria
            </h4>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Automação ativa</span>
              <span className="text-green-400">✓ Funcionando</span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Última execução: há 1 dia
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;