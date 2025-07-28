import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Target,
  AlertCircle,
  BarChart3,
  LineChart,
  Download,
  RefreshCw,
} from 'lucide-react';
import React, { useState, useMemo } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { UserRole , Patient, Appointment, Transaction, User } from '../types';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

interface AnalyticsDashboardProps {
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
}) => {
  const { patients, appointments, transactions, users } = useData();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'revenue',
    'patients',
    'appointments',
    'satisfaction',
  ]);

  // Check if user has access to advanced analytics
  const hasAdvancedAnalytics = isFeatureEnabled('business_intelligence');
  const hasPredictiveAnalytics = isFeatureEnabled('predictive_analytics');

  // Filter data by tenant and date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const daysBack = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[dateRange];

    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    return {
      patients: patients.filter(
        (p) =>
          p.tenantId === user?.tenantId &&
          new Date(p.createdAt || '') >= startDate
      ),
      appointments: appointments.filter(
        (a) => a.tenantId === user?.tenantId && new Date(a.date) >= startDate
      ),
      transactions: transactions.filter(
        (t) => t.tenantId === user?.tenantId && new Date(t.date) >= startDate
      ),
      users: users.filter((u) => u.tenantId === user?.tenantId),
    };
  }, [patients, appointments, transactions, users, user?.tenantId, dateRange]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredData.transactions
      .filter((t) => t.type === 'receita')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalPatients = filteredData.patients.length;
    const totalAppointments = filteredData.appointments.length;
    const activeTherapists = filteredData.users.filter(
      (u) => u.role === UserRole.FISIOTERAPEUTA
    ).length;

    // Calculate previous period for comparison
    const prevPeriodStart = new Date();
    prevPeriodStart.setDate(
      prevPeriodStart.getDate() -
        {
          '7d': 14,
          '30d': 60,
          '90d': 180,
          '1y': 730,
        }[dateRange]
    );

    const prevPeriodEnd = new Date();
    prevPeriodEnd.setDate(
      prevPeriodEnd.getDate() -
        {
          '7d': 7,
          '30d': 30,
          '90d': 90,
          '1y': 365,
        }[dateRange]
    );

    const prevRevenue = transactions
      .filter(
        (t) =>
          t.tenantId === user?.tenantId &&
          t.type === 'receita' &&
          new Date(t.date) >= prevPeriodStart &&
          new Date(t.date) <= prevPeriodEnd
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const prevPatients = patients.filter(
      (p) =>
        p.tenantId === user?.tenantId &&
        new Date(p.createdAt || '') >= prevPeriodStart &&
        new Date(p.createdAt || '') <= prevPeriodEnd
    ).length;

    const prevAppointments = appointments.filter(
      (a) =>
        a.tenantId === user?.tenantId &&
        new Date(a.date) >= prevPeriodStart &&
        new Date(a.date) <= prevPeriodEnd
    ).length;

    // Calculate changes
    const revenueChange =
      prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const patientsChange =
      prevPatients > 0
        ? ((totalPatients - prevPatients) / prevPatients) * 100
        : 0;
    const appointmentsChange =
      prevAppointments > 0
        ? ((totalAppointments - prevAppointments) / prevAppointments) * 100
        : 0;

    // Calculate satisfaction (mock data for now)
    const satisfactionScore = 4.2 + Math.random() * 0.6; // 4.2-4.8 range
    const satisfactionChange = (Math.random() - 0.5) * 10; // -5% to +5%

    return {
      revenue: {
        value: totalRevenue,
        change: revenueChange,
        formatted: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      },
      patients: {
        value: totalPatients,
        change: patientsChange,
        formatted: totalPatients.toString(),
      },
      appointments: {
        value: totalAppointments,
        change: appointmentsChange,
        formatted: totalAppointments.toString(),
      },
      therapists: {
        value: activeTherapists,
        change: 0,
        formatted: activeTherapists.toString(),
      },
      satisfaction: {
        value: satisfactionScore,
        change: satisfactionChange,
        formatted: satisfactionScore.toFixed(1),
      },
    };
  }, [
    filteredData,
    transactions,
    patients,
    appointments,
    user?.tenantId,
    dateRange,
  ]);

  // Generate chart data
  const chartData = useMemo(() => {
    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    }[dateRange];

    const labels = [];
    const revenueData = [];
    const appointmentData = [];
    const patientData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dayRevenue = filteredData.transactions
        .filter(
          (t) =>
            t.type === 'receita' &&
            new Date(t.date).toDateString() === date.toDateString()
        )
        .reduce((sum, t) => sum + t.amount, 0);

      const dayAppointments = filteredData.appointments.filter(
        (a) => new Date(a.date).toDateString() === date.toDateString()
      ).length;

      const dayPatients = filteredData.patients.filter(
        (p) =>
          new Date(p.createdAt || '').toDateString() === date.toDateString()
      ).length;

      labels.push(
        date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
      );
      revenueData.push(dayRevenue);
      appointmentData.push(dayAppointments);
      patientData.push(dayPatients);
    }

    return {
      revenue: {
        labels,
        datasets: [
          {
            label: 'Receita (R$)',
            data: revenueData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
          },
        ],
      },
      appointments: {
        labels,
        datasets: [
          {
            label: 'Agendamentos',
            data: appointmentData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
          },
        ],
      },
      patients: {
        labels,
        datasets: [
          {
            label: 'Novos Pacientes',
            data: patientData,
            borderColor: '#8B5CF6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            borderWidth: 2,
          },
        ],
      },
    };
  }, [filteredData, dateRange]);

  const metricCards: MetricCard[] = [
    {
      title: 'Receita Total',
      value: metrics.revenue.formatted,
      change: metrics.revenue.change,
      changeType: metrics.revenue.change >= 0 ? 'increase' : 'decrease',
      icon: <DollarSign className="h-6 w-6" />,
      color: 'blue',
    },
    {
      title: 'Pacientes',
      value: metrics.patients.formatted,
      change: metrics.patients.change,
      changeType: metrics.patients.change >= 0 ? 'increase' : 'decrease',
      icon: <Users className="h-6 w-6" />,
      color: 'green',
    },
    {
      title: 'Agendamentos',
      value: metrics.appointments.formatted,
      change: metrics.appointments.change,
      changeType: metrics.appointments.change >= 0 ? 'increase' : 'decrease',
      icon: <Calendar className="h-6 w-6" />,
      color: 'purple',
    },
    {
      title: 'Satisfação',
      value: `${metrics.satisfaction.formatted}/5.0`,
      change: metrics.satisfaction.change,
      changeType: metrics.satisfaction.change >= 0 ? 'increase' : 'decrease',
      icon: <Target className="h-6 w-6" />,
      color: 'orange',
    },
  ];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const handleExport = () => {
    // Generate CSV data
    const csvData = [
      ['Métrica', 'Valor', 'Mudança (%)'],
      ...metricCards.map((card) => [
        card.title,
        card.value.toString(),
        `${card.change.toFixed(1)}%`,
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!hasAdvancedAnalytics && !isFeatureEnabled('basic_reports')) {
    return (
      <div
        className={`rounded-lg border border-slate-700 bg-slate-800 p-6 ${className}`}
      >
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-400" />
          <h3 className="mb-2 text-lg font-semibold text-white">
            Analytics Não Disponível
          </h3>
          <p className="mb-4 text-slate-400">
            Faça upgrade para acessar relatórios e analytics avançados.
          </p>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
            Ver Planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-slate-400">Métricas e insights da sua clínica</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>

          {/* Action Buttons */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-lg bg-slate-700 p-2 text-white transition-colors hover:bg-slate-600 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            onClick={handleExport}
            className="rounded-lg bg-slate-700 p-2 text-white transition-colors hover:bg-slate-600"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, index) => {
          const colorClasses = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            orange: 'bg-orange-500',
          };

          return (
            <div
              key={index}
              className="rounded-lg border border-slate-700 bg-slate-800 p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div
                  className={`rounded-lg p-3 ${colorClasses[card.color as keyof typeof colorClasses]}`}
                >
                  {card.icon}
                </div>
                <div className="flex items-center space-x-1">
                  {card.changeType === 'increase' ? (
                    <TrendingUp className="h-4 w-4 text-green-400" />
                  ) : card.changeType === 'decrease' ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : null}
                  <span
                    className={`text-sm font-medium ${
                      card.changeType === 'increase'
                        ? 'text-green-400'
                        : card.changeType === 'decrease'
                          ? 'text-red-400'
                          : 'text-slate-400'
                    }`}
                  >
                    {card.change >= 0 ? '+' : ''}
                    {card.change.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-medium text-slate-400">
                  {card.title}
                </h3>
                <p className="text-2xl font-bold text-white">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      {hasAdvancedAnalytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Receita ao Longo do Tempo
              </h3>
              <LineChart className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex h-64 items-center justify-center text-slate-400">
              {/* Chart component would go here */}
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-12 w-12" />
                <p>Gráfico de Receita</p>
                <p className="text-sm">
                  (Integração com biblioteca de gráficos)
                </p>
              </div>
            </div>
          </div>

          {/* Appointments Chart */}
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Agendamentos por Dia
              </h3>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex h-64 items-center justify-center text-slate-400">
              <div className="text-center">
                <LineChart className="mx-auto mb-2 h-12 w-12" />
                <p>Gráfico de Agendamentos</p>
                <p className="text-sm">
                  (Integração com biblioteca de gráficos)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Predictive Analytics */}
      {hasPredictiveAnalytics && (
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              Análise Preditiva
            </h3>
            <Activity className="h-5 w-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="mb-2 text-2xl font-bold text-blue-400">85%</div>
              <div className="text-sm text-slate-400">
                Taxa de Retenção Prevista
              </div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-2xl font-bold text-green-400">+12%</div>
              <div className="text-sm text-slate-400">
                Crescimento Projetado
              </div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-2xl font-bold text-orange-400">3</div>
              <div className="text-sm text-slate-400">Pacientes em Risco</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">
          Insights Rápidos
        </h3>

        <div className="space-y-3">
          <div className="flex items-center space-x-3 rounded-lg bg-slate-700 p-3">
            <div className="h-2 w-2 rounded-full bg-green-400"></div>
            <span className="text-slate-300">
              Receita cresceu {metrics.revenue.change.toFixed(1)}% no período
            </span>
          </div>

          <div className="flex items-center space-x-3 rounded-lg bg-slate-700 p-3">
            <div className="h-2 w-2 rounded-full bg-blue-400"></div>
            <span className="text-slate-300">
              Média de{' '}
              {(
                metrics.appointments.value /
                {
                  '7d': 7,
                  '30d': 30,
                  '90d': 90,
                  '1y': 365,
                }[dateRange]
              ).toFixed(1)}{' '}
              agendamentos por dia
            </span>
          </div>

          <div className="flex items-center space-x-3 rounded-lg bg-slate-700 p-3">
            <div className="h-2 w-2 rounded-full bg-purple-400"></div>
            <span className="text-slate-300">
              Taxa de satisfação de {metrics.satisfaction.formatted}/5.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
