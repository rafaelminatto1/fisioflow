import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useData.minimal';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  IconFilter,
  IconUsers,
  IconChartPie,
  IconActivity,
  IconDollarSign,
} from './icons/IconComponents';
import PageLoader from './ui/PageLoader';

// --- Reusable Components for this Page ---

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3 text-sm shadow-lg backdrop-blur-sm">
        <p className="font-bold text-slate-100">{label}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.fill || pld.stroke }}>
            {`${pld.name}: ${pld.dataKey.toLowerCase().includes('receita') ? `R$ ${pld.value.toFixed(2)}` : pld.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const KpiCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  value: string;
}> = ({ icon, title, value }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-800 p-5">
    <div className="flex items-center gap-4">
      <div className="rounded-lg bg-slate-900/50 p-3 text-blue-400">{icon}</div>
      <div>
        <h3 className="text-base font-medium text-slate-400">{title}</h3>
        <p className="text-2xl font-bold text-slate-50">{value}</p>
      </div>
    </div>
  </div>
);

const ReportCard: React.FC<{
  title: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, children, className }) => (
  <div
    className={`rounded-lg border border-slate-700 bg-slate-800 p-4 md:p-6 ${className}`}
  >
    <h2 className="mb-4 text-lg font-semibold text-slate-100">{title}</h2>
    <div style={{ width: '100%', height: 300 }}>{children}</div>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="text-center text-slate-500">
      <IconChartPie className="mx-auto mb-2" size={32} />
      <p>{message}</p>
    </div>
  </div>
);

const TabButton: React.FC<{
  tabId: string;
  activeTab: string;
  label: string;
  onClick: (tabId: string) => void;
}> = ({ tabId, activeTab, label, onClick }) => (
  <button
    onClick={() => onClick(tabId)}
    role="tab"
    aria-selected={activeTab === tabId}
    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tabId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
  >
    {label}
  </button>
);

// --- Main Reports Page Component ---

type TimeRange = 'all' | 'last7' | 'last30' | 'last90';

const ReportsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { users, appointments, transactions, prescriptions, exercises } =
    useData();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500); // Simulate loading
    return () => clearTimeout(timer);
  }, []);

  // --- Filtered Data ---
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0); // Epoch for 'all'

    if (timeRange !== 'all') {
      const daysToSubtract = { last7: 7, last30: 30, last90: 90 }[timeRange];
      startDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysToSubtract
      );
    }

    const filteredAppointments = appointments.filter(
      (a) => new Date(a.start) >= startDate
    );
    const filteredTransactions = transactions.filter(
      (t) => t.paidDate && new Date(t.paidDate) >= startDate
    );

    return { filteredAppointments, filteredTransactions };
  }, [timeRange, appointments, transactions]);

  // --- KPI Calculations ---
  const kpis = useMemo(() => {
    const totalSessions = filteredData.filteredAppointments.length;
    const totalRevenue = filteredData.filteredTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const activePatients = new Set(
      filteredData.filteredAppointments.map((a) => a.patientId)
    ).size;
    return { totalSessions, totalRevenue, activePatients };
  }, [filteredData]);

  // --- Chart Data Calculations ---
  const therapistProductivityData = useMemo(() => {
    const therapistApptCounts = filteredData.filteredAppointments.reduce(
      (acc, a) => {
        if (a.therapistId) acc[a.therapistId] = (acc[a.therapistId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(therapistApptCounts)
      .map(([therapistId, count]) => ({
        name:
          users.find((u) => u.id === therapistId)?.name.split(' ')[0] || 'N/A',
        Sessões: count,
      }))
      .sort((a, b) => b.Sessões - a.Sessões);
  }, [filteredData.filteredAppointments, users]);

  const appointmentStatusData = useMemo(() => {
    const now = new Date();
    const statusCounts = filteredData.filteredAppointments.reduce(
      (acc, appt) => {
        if (new Date(appt.end) < now) acc.concluido = (acc.concluido || 0) + 1;
        else acc.agendado = (acc.agendado || 0) + 1;
        return acc;
      },
      { concluido: 0, agendado: 0 }
    );

    return [
      { name: 'Concluídos', value: statusCounts.concluido },
      { name: 'Agendados', value: statusCounts.agendado },
    ];
  }, [filteredData.filteredAppointments]);

  const monthlyRevenueData = useMemo(() => {
    const revenueByMonth: Record<string, number> = {};
    filteredData.filteredTransactions.forEach((t) => {
      const date = new Date(t.paidDate!);
      const key = date.toLocaleString('pt-BR', {
        month: 'short',
        year: '2-digit',
      });
      revenueByMonth[key] = (revenueByMonth[key] || 0) + t.amount;
    });

    return Object.entries(revenueByMonth)
      .map(([name, Receita]) => ({ name, Receita }))
      .reverse(); // To show most recent first if needed, though recharts handles it.
  }, [filteredData.filteredTransactions]);

  const exercisePopularityData = useMemo(() => {
    const exerciseCounts = prescriptions.reduce(
      (acc, p) => {
        acc[p.exerciseId] = (acc[p.exerciseId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.entries(exerciseCounts)
      .map(([exerciseId, count]) => ({
        name: exercises.find((e) => e.id === exerciseId)?.name || 'Excluído',
        Prescrições: count,
      }))
      .sort((a, b) => b.Prescrições - a.Prescrições)
      .slice(0, 10);
  }, [prescriptions, exercises]);

  if (isLoading) {
    return <PageLoader message="Gerando relatórios..." />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">
            Relatórios e Analytics
          </h1>
          <p className="mt-1 text-slate-400">
            Analise o desempenho da sua clínica.
          </p>
        </div>
        <div className="relative">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="w-full appearance-none rounded-md border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 md:w-auto"
          >
            <option value="all">Período Completo</option>
            <option value="last7">Últimos 7 dias</option>
            <option value="last30">Últimos 30 dias</option>
            <option value="last90">Últimos 90 dias</option>
          </select>
          <IconFilter
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          icon={<IconActivity size={24} />}
          title="Sessões Realizadas"
          value={kpis.totalSessions.toString()}
        />
        <KpiCard
          icon={<IconDollarSign size={24} />}
          title="Receita (Pago)"
          value={`R$ ${kpis.totalRevenue.toFixed(2)}`}
        />
        <KpiCard
          icon={<IconUsers size={24} />}
          title="Pacientes Atendidos"
          value={kpis.activePatients.toString()}
        />
      </section>

      <nav className="flex space-x-2 rounded-lg bg-slate-800 p-1">
        <TabButton
          tabId="overview"
          activeTab={activeTab}
          label="Visão Geral"
          onClick={setActiveTab}
        />
        <TabButton
          tabId="clinical"
          activeTab={activeTab}
          label="Análise Clínica"
          onClick={setActiveTab}
        />
      </nav>

      <section>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportCard title="Receita no Período">
              {monthlyRevenueData.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart
                    data={monthlyRevenueData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                    <YAxis
                      stroke="#cbd5e1"
                      fontSize={12}
                      tickFormatter={(value) => `R$${value / 1000}k`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: '#475569', strokeWidth: 1 }}
                    />
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS[1]}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS[1]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="Receita"
                      stroke={COLORS[1]}
                      fill="url(#colorRevenue)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Sem dados de receita no período." />
              )}
            </ReportCard>
            <ReportCard title="Produtividade por Terapeuta">
              {therapistProductivityData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={therapistProductivityData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                    <YAxis stroke="#cbd5e1" fontSize={12} />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                    />
                    <Bar
                      dataKey="Sessões"
                      fill={COLORS[0]}
                      name="Sessões"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Sem dados de produtividade no período." />
              )}
            </ReportCard>
          </div>
        )}
        {activeTab === 'clinical' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ReportCard title="Exercícios Mais Prescritos (Top 10)">
              {exercisePopularityData.length > 0 ? (
                <ResponsiveContainer>
                  <BarChart
                    data={exercisePopularityData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis type="number" stroke="#cbd5e1" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#cbd5e1"
                      width={120}
                      fontSize={12}
                      interval={0}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
                    />
                    <Bar
                      dataKey="Prescrições"
                      fill={COLORS[2]}
                      name="Prescrições"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Nenhum exercício prescrito." />
              )}
            </ReportCard>
            <ReportCard title="Status dos Agendamentos">
              {appointmentStatusData.some((d) => d.value > 0) ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={appointmentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      paddingAngle={5}
                    >
                      {appointmentStatusData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Sem agendamentos no período." />
              )}
            </ReportCard>
          </div>
        )}
      </section>
    </div>
  );
};

export default ReportsPage;
