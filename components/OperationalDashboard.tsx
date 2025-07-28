import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import {
  QualityIndicator,
  ProductivityMetric,
  Equipment,
  OperationalAlert,
  ExecutiveReport,
  KPIData,
} from '../types';
import {
  IconTrendingUp,
  IconTrendingDown,
  IconUsers,
  IconCalendar,
  IconDollarSign,
  IconHeart,
  IconClock,
  IconTool,
  IconAlert,
  IconTarget,
  IconActivity,
} from './icons/IconComponents';

interface KPICardProps {
  title: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  unit?: string;
  isGood: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  isGood,
}) => {
  const trendColor = isGood
    ? trend === 'up'
      ? 'text-green-500'
      : trend === 'down'
        ? 'text-red-500'
        : 'text-slate-400'
    : trend === 'up'
      ? 'text-red-500'
      : trend === 'down'
        ? 'text-green-500'
        : 'text-slate-400';

  const TrendIcon =
    trend === 'up'
      ? IconTrendingUp
      : trend === 'down'
        ? IconTrendingDown
        : IconActivity;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-lg bg-blue-600/20 p-3">{icon}</div>
        <div className={`flex items-center gap-1 ${trendColor}`}>
          <TrendIcon size={16} />
          <span className="text-sm font-medium">{Math.abs(change)}%</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-sm text-slate-400">{title}</p>
      </div>
    </div>
  );
};

interface MetricChartProps {
  title: string;
  data: { label: string; value: number }[];
  type: 'bar' | 'line';
}

const MetricChart: React.FC<MetricChartProps> = ({ title, data, type }) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-100">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="w-24 text-sm text-slate-300">{item.label}</span>
            <div className="mx-3 flex-1">
              <div className="h-2 rounded-full bg-slate-700">
                <div
                  className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <span className="w-12 text-right text-sm font-medium text-slate-100">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface AlertItemProps {
  alert: OperationalAlert;
  onAcknowledge: (alertId: string) => void;
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge }) => {
  const severityColors = {
    low: 'border-yellow-500 bg-yellow-500/10',
    medium: 'border-orange-500 bg-orange-500/10',
    high: 'border-red-500 bg-red-500/10',
    critical: 'border-red-600 bg-red-600/20',
  };

  const severityIcons = {
    low: <IconAlert className="text-yellow-500" size={16} />,
    medium: <IconAlert className="text-orange-500" size={16} />,
    high: <IconAlert className="text-red-500" size={16} />,
    critical: <IconAlert className="text-red-600" size={16} />,
  };

  return (
    <div
      className={`rounded-r-md border-l-4 p-3 ${severityColors[alert.severity]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {severityIcons[alert.severity]}
          <div>
            <p className="text-sm font-medium text-slate-100">{alert.title}</p>
            <p className="text-xs text-slate-400">{alert.message}</p>
            <p className="text-xs text-slate-500">
              {new Date(alert.triggeredAt).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
        {alert.isActive && !alert.acknowledgedAt && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="rounded bg-slate-600 px-2 py-1 text-xs transition-colors hover:bg-slate-500"
          >
            Confirmar
          </button>
        )}
      </div>
    </div>
  );
};

const OperationalDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    patients,
    appointments,
    tasks,
    transactions,
    users,
    qualityIndicators,
    productivityMetrics,
    equipment,
    operationalAlerts,
    executiveReports,
    acknowledgeAlert,
    resolveAlert,
    generateExecutiveReport,
  } = useData();

  const [selectedPeriod, setSelectedPeriod] = useState<
    'daily' | 'weekly' | 'monthly'
  >('weekly');
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');

  // Calculate KPIs
  const kpis = useMemo((): KPIData[] => {
    const now = new Date();
    const startOfPeriod = new Date();

    if (selectedPeriod === 'daily') {
      startOfPeriod.setHours(0, 0, 0, 0);
    } else if (selectedPeriod === 'weekly') {
      startOfPeriod.setDate(startOfPeriod.getDate() - 7);
    } else {
      startOfPeriod.setMonth(startOfPeriod.getMonth() - 1);
    }

    const periodAppointments = appointments.filter(
      (a) => new Date(a.start) >= startOfPeriod && new Date(a.start) <= now
    );
    const periodTransactions = transactions.filter(
      (t) => new Date(t.dueDate) >= startOfPeriod && new Date(t.dueDate) <= now
    );

    const totalRevenue = periodTransactions
      .filter((t) => t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAppointments = periodAppointments.length;
    const completedAppointments = periodAppointments.filter(
      (a) => new Date(a.end) < now
    ).length;

    const utilizationRate =
      totalAppointments > 0
        ? (completedAppointments / totalAppointments) * 100
        : 0;

    const avgSatisfaction =
      qualityIndicators
        .filter((qi) => qi.type === 'satisfaction')
        .reduce((sum, qi, _, arr) => sum + qi.value / arr.length, 0) || 0;

    return [
      {
        id: 'revenue',
        name: 'Receita Total',
        value: totalRevenue,
        target: 50000,
        unit: 'R$',
        trend: 'up' as const,
        change: 12.5,
        category: 'financial' as const,
        isGood: true,
      },
      {
        id: 'appointments',
        name: 'Agendamentos',
        value: totalAppointments,
        target: 200,
        unit: '',
        trend: 'up' as const,
        change: 8.3,
        category: 'operational' as const,
        isGood: true,
      },
      {
        id: 'utilization',
        name: 'Taxa de Utilização',
        value: utilizationRate,
        target: 85,
        unit: '%',
        trend: utilizationRate > 85 ? ('up' as const) : ('down' as const),
        change: 5.2,
        category: 'productivity' as const,
        isGood: utilizationRate > 75,
      },
      {
        id: 'satisfaction',
        name: 'Satisfação Média',
        value: avgSatisfaction,
        target: 4.5,
        unit: '/5',
        trend: avgSatisfaction >= 4.5 ? ('up' as const) : ('stable' as const),
        change: 2.1,
        category: 'quality' as const,
        isGood: avgSatisfaction >= 4.0,
      },
    ];
  }, [appointments, transactions, qualityIndicators, selectedPeriod]);

  // Productivity data for chart
  const productivityData = useMemo(() => {
    const therapists = users.filter((u) => u.role === 'fisio');
    return therapists.slice(0, 5).map((therapist) => {
      const therapistMetrics = productivityMetrics.filter(
        (pm) => pm.therapistId === therapist.id
      );
      const avgEfficiency =
        therapistMetrics.reduce(
          (sum, pm, _, arr) => sum + pm.efficiencyScore / arr.length,
          0
        ) || 0;

      return {
        label: therapist.name.split(' ')[0],
        value: Math.round(avgEfficiency),
      };
    });
  }, [users, productivityMetrics]);

  // Active alerts
  const activeAlerts = operationalAlerts
    .filter((alert) => alert.isActive && !alert.resolvedAt)
    .sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    })
    .slice(0, 5);

  const handleAcknowledgeAlert = (alertId: string) => {
    if (user) {
      acknowledgeAlert(alertId, user);
    }
  };

  const handleGenerateReport = () => {
    if (user) {
      const now = new Date();
      const period = selectedPeriod === 'daily' 
        ? { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(), end: now.toISOString() }
        : selectedPeriod === 'weekly'
        ? { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), end: now.toISOString() }
        : { start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString(), end: now.toISOString() };
      
      generateExecutiveReport(selectedPeriod, period, user);
    }
  };

  if (!user) return null;

  return (
    <div className="flex-1 space-y-6 overflow-auto p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Dashboard Executivo
          </h1>
          <p className="text-slate-400">
            Visão geral das operações em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) =>
              setSelectedPeriod(
                e.target.value as 'daily' | 'weekly' | 'monthly'
              )
            }
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Hoje</option>
            <option value="weekly">Últimos 7 dias</option>
            <option value="monthly">Último mês</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={kpis[0].name}
          value={`R$ ${kpis[0].value.toLocaleString('pt-BR')}`}
          change={kpis[0].change}
          trend={kpis[0].trend}
          icon={<IconDollarSign className="text-blue-400" size={24} />}
          isGood={kpis[0].isGood}
        />
        <KPICard
          title={kpis[1].name}
          value={kpis[1].value.toString()}
          change={kpis[1].change}
          trend={kpis[1].trend}
          icon={<IconCalendar className="text-blue-400" size={24} />}
          isGood={kpis[1].isGood}
        />
        <KPICard
          title={kpis[2].name}
          value={`${kpis[2].value.toFixed(1)}%`}
          change={kpis[2].change}
          trend={kpis[2].trend}
          icon={<IconTarget className="text-blue-400" size={24} />}
          isGood={kpis[2].isGood}
        />
        <KPICard
          title={kpis[3].name}
          value={`${kpis[3].value.toFixed(1)}/5`}
          change={kpis[3].change}
          trend={kpis[3].trend}
          icon={<IconHeart className="text-blue-400" size={24} />}
          isGood={kpis[3].isGood}
        />
      </div>

      {/* Charts and Metrics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MetricChart
          title="Eficiência por Fisioterapeuta"
          data={productivityData}
          type="bar"
        />

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-100">
            Status dos Equipamentos
          </h3>
          <div className="space-y-3">
            {equipment.slice(0, 5).map((eq) => {
              const statusColors = {
                active: 'text-green-500',
                maintenance: 'text-yellow-500',
                repair: 'text-red-500',
                inactive: 'text-slate-500',
                disposed: 'text-slate-600',
              };

              return (
                <div key={eq.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <IconTool className={statusColors[eq.status]} size={16} />
                    <span className="text-sm text-slate-300">{eq.name}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${statusColors[eq.status]} bg-current bg-opacity-20`}
                  >
                    {eq.status === 'active'
                      ? 'Ativo'
                      : eq.status === 'maintenance'
                        ? 'Manutenção'
                        : eq.status === 'repair'
                          ? 'Reparo'
                          : eq.status === 'inactive'
                            ? 'Inativo'
                            : 'Descartado'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-100">
            Alertas Ativos
          </h3>
          <span className="text-sm text-slate-400">
            {activeAlerts.length} alertas pendentes
          </span>
        </div>

        {activeAlerts.length > 0 ? (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledgeAlert}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400">
            <IconActivity size={48} className="mx-auto mb-2 opacity-50" />
            <p>Nenhum alerta ativo no momento</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button 
          onClick={handleGenerateReport}
          className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Gerar Relatório Executivo
        </button>
        <button className="rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition-colors hover:bg-green-700">
          Exportar Métricas
        </button>
        <button className="rounded-lg bg-orange-600 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-700">
          Configurar Alertas
        </button>
      </div>
    </div>
  );
};

export default OperationalDashboard;
