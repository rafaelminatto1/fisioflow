
import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import EmptyState from './ui/EmptyState';
import { IconChartBar, IconTrendingUp, IconUsers, IconAlertTriangle, IconActivity, IconDollarSign, IconSparkles } from './icons/IconComponents';
import { useUsers } from '../hooks/useUsers';
import { useAppointments } from '../hooks/useAppointments';
import { useTransactions } from '../hooks/useTransactions';
import { useServices } from '../hooks/useServices';
import { usePatients } from '../hooks/usePatients';
import Skeleton from './ui/Skeleton';
import { UserRole } from '../types';
import { useQuery } from '@tanstack/react-query';
import { generateFinancialInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b'];

const ReportCard: React.FC<{ title: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={`bento-box flex flex-col ${className}`}>
    <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">{title}</h3>
    <div className="flex-1" style={{ width: '100%', height: 300 }}>
      {children}
    </div>
  </div>
);

const KPICard: React.FC<{ title: string, value: string, icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-800/80 p-4 rounded-lg flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center text-blue-400">
            {icon}
        </div>
        <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-slate-50">{value}</p>
        </div>
    </div>
)

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string | number }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/80 p-3 border border-slate-700 rounded-lg shadow-lg text-sm backdrop-blur-sm">
                <p className="font-bold text-slate-100">{label}</p>
                {payload.map((pld: { name: string; value: any; color: string; }) => (
                    <p key={pld.name} style={{ color: pld.color }}>
                        {`${pld.name}: ${typeof pld.value === 'number' ? `R$ ${pld.value.toFixed(2).replace('.',',')}` : pld.value}`}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const OperationalDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState(30); // 7, 30, 90 days

  const { users = [], isLoading: isLoadingUsers } = useUsers();
  const { appointments = [], isLoading: isLoadingAppointments } = useAppointments();
  const { transactions = [], isLoading: isLoadingTransactions } = useTransactions();
  const { services = [], isLoading: isLoadingServices } = useServices();
  const { patients = [], isLoading: isLoadingPatients } = usePatients();

  const isLoading = isLoadingUsers || isLoadingAppointments || isLoadingTransactions || isLoadingServices || isLoadingPatients;

  const filteredData = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - timeRange);

    const filteredAppointments = appointments.filter(a => new Date(a.start) >= startDate && new Date(a.start) <= endDate);
    const filteredTransactions = transactions.filter(t => {
      const paidDate = t.paidDate ? new Date(t.paidDate) : null;
      return paidDate && paidDate >= startDate && paidDate <= endDate;
    });

    return { filteredAppointments, filteredTransactions, startDate, endDate };
  }, [appointments, transactions, timeRange]);

  const { kpis, revenueByService, therapistPerformance, revenueEvolution, newPatientsEvolution } = useMemo(() => {
    const { filteredAppointments, filteredTransactions, startDate } = filteredData;
    
    // KPIs
    const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const attendedAppointments = filteredAppointments.filter(a => a.status === 'realizado');
    const totalBookedMinutes = attendedAppointments.reduce((sum, a) => sum + (new Date(a.end).getTime() - new Date(a.start).getTime()) / 60000, 0);
    const therapistsCount = users.filter(u => u.role === UserRole.FISIOTERAPEUTA || u.role === UserRole.ADMIN).length || 1;
    const workingDays = timeRange === 7 ? 5 : timeRange === 30 ? 22 : 66; // Approximation
    const totalAvailableMinutes = therapistsCount * workingDays * 8 * 60;
    const occupancyRate = totalAvailableMinutes > 0 ? (totalBookedMinutes / totalAvailableMinutes) * 100 : 0;
    const cancelledAppointments = filteredAppointments.filter(a => a.status === 'cancelado').length;
    const cancellationRate = filteredAppointments.length > 0 ? (cancelledAppointments / filteredAppointments.length) * 100 : 0;
    const activePatients = new Set(filteredAppointments.map(a => a.patientId)).size;

    const kpis = {
        totalRevenue: `R$ ${totalRevenue.toFixed(2)}`,
        occupancyRate: `${occupancyRate.toFixed(1)}%`,
        cancellationRate: `${cancellationRate.toFixed(1)}%`,
        activePatients: activePatients.toString(),
    };

    // Revenue by Service
    const revenueByService = services.map(service => {
        const serviceRevenue = filteredTransactions
            .filter(t => t.appointmentId && filteredAppointments.find(a => a.id === t.appointmentId && a.serviceId === service.id))
            .reduce((sum, t) => sum + t.amount, 0);
        return { name: service.name, Receita: serviceRevenue };
    }).filter(s => s.Receita > 0).sort((a,b) => b.Receita - a.Receita);

    // Therapist Performance
    const therapistPerformance = users.filter(u => u.role !== UserRole.PACIENTE).map(therapist => {
        const therapistHours = filteredAppointments
            .filter(a => a.therapistId === therapist.id && a.status === 'realizado')
            .reduce((sum, a) => sum + (new Date(a.end).getTime() - new Date(a.start).getTime()) / (60000 * 60), 0);
        return { name: therapist.name.split(' ')[0], "Horas Atendidas": therapistHours };
    }).filter(t => t['Horas Atendidas'] > 0);

    // Revenue Evolution (Monthly)
    const revenueByMonth: Record<string, number> = {};
    transactions.forEach(t => {
      if(t.status === 'pago' && t.paidDate) {
        const monthKey = new Date(t.paidDate).toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
        revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + t.amount;
      }
    });
    const revenueEvolution = Object.entries(revenueByMonth).map(([name, Receita]) => ({ name, Receita }));

    // New Patients Evolution
    const patientFirstAppointment = new Map<string, Date>();
    [...appointments].sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()).forEach(a => {
        if(!patientFirstAppointment.has(a.patientId)) {
            patientFirstAppointment.set(a.patientId, new Date(a.start));
        }
    });
    const newPatientsByMonth: Record<string, number> = {};
    patientFirstAppointment.forEach((date, patientId) => {
        const monthKey = date.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
        newPatientsByMonth[monthKey] = (newPatientsByMonth[monthKey] || 0) + 1;
    });
    const newPatientsEvolution = Object.entries(newPatientsByMonth).map(([name, Pacientes]) => ({ name, Pacientes }));


    return { kpis, revenueByService, therapistPerformance, revenueEvolution, newPatientsEvolution };
  }, [filteredData, users, services, patients, appointments, transactions, timeRange]);

  const { data: financialInsights, isLoading: isLoadingInsights } = useQuery<string, Error>({
      queryKey: ['financialInsights', timeRange, filteredData.filteredTransactions.length],
      queryFn: async () => {
          if (filteredData.filteredTransactions.length < 3) {
              return "Dados de transações insuficientes para gerar insights significativos neste período.";
          }
          const context = `Dados de transações dos últimos ${timeRange} dias: ${JSON.stringify(filteredData.filteredTransactions.slice(0, 50).map(t => ({amount: t.amount, description: t.description, status: t.status})))}`;
          return generateFinancialInsights(context);
      },
      enabled: !isLoading,
      staleTime: 1000 * 60 * 60, // 1 hour
  });

  const renderContent = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-[60vh]"/>
    }
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard title="Faturamento Total" value={kpis.totalRevenue} icon={<IconDollarSign size={24}/>} />
                <KPICard title="Taxa de Ocupação Média" value={kpis.occupancyRate} icon={<IconActivity size={24}/>} />
                <KPICard title="Taxa de Cancelamento" value={kpis.cancellationRate} icon={<IconAlertTriangle size={24}/>} />
                <KPICard title="Pacientes Ativos" value={kpis.activePatients} icon={<IconUsers size={24}/>} />
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <ReportCard title="Receita por Serviço">
                    {revenueByService.length > 0 ? (
                    <ResponsiveContainer>
                        <BarChart data={revenueByService} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis type="number" stroke="#cbd5e1" fontSize={12} tickFormatter={(value) => `R$${value}`} />
                            <YAxis type="category" dataKey="name" stroke="#cbd5e1" width={100} fontSize={10} interval={0} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
                            <Bar dataKey="Receita" fill={CHART_COLORS[0]} />
                        </BarChart>
                    </ResponsiveContainer>
                     ) : <EmptyState icon={<IconChartBar size={28}/>} title="Sem Dados" message="Nenhuma receita registrada no período."/>}
                </ReportCard>
                 <ReportCard title="Horas de Atendimento por Fisioterapeuta">
                     {therapistPerformance.length > 0 ? (
                    <ResponsiveContainer>
                        <BarChart data={therapistPerformance} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                            <YAxis stroke="#cbd5e1" fontSize={12} unit="h"/>
                             <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
                            <Bar dataKey="Horas Atendidas" fill={CHART_COLORS[1]} />
                        </BarChart>
                    </ResponsiveContainer>
                     ) : <EmptyState icon={<IconChartBar size={28}/>} title="Sem Dados" message="Nenhuma hora atendida no período."/>}
                </ReportCard>
                 <ReportCard title="Evolução do Faturamento">
                     {revenueEvolution.length > 0 ? (
                    <ResponsiveContainer>
                        <LineChart data={revenueEvolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                            <YAxis stroke="#cbd5e1" fontSize={12} tickFormatter={(value) => `R$${value/1000}k`}/>
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }}/>
                            <Line type="monotone" dataKey="Receita" stroke={CHART_COLORS[2]} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                     ) : <EmptyState icon={<IconTrendingUp size={28}/>} title="Sem Dados" message="Nenhuma receita para exibir evolução."/>}
                </ReportCard>
                <ReportCard title="Aquisição de Novos Pacientes">
                    {newPatientsEvolution.length > 0 ? (
                    <ResponsiveContainer>
                        <LineChart data={newPatientsEvolution} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12}/>
                            <YAxis stroke="#cbd5e1" fontSize={12} allowDecimals={false}/>
                             <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1 }}/>
                            <Line type="monotone" dataKey="Pacientes" stroke={CHART_COLORS[3]} strokeWidth={2}/>
                        </LineChart>
                    </ResponsiveContainer>
                     ) : <EmptyState icon={<IconUsers size={28}/>} title="Sem Dados" message="Nenhum novo paciente no período."/>}
                </ReportCard>
                <ReportCard title={<><IconSparkles className="text-blue-400 mr-2"/>Insights Financeiros (IA)</>} className="lg:col-span-2">
                    {isLoadingInsights ? <div className="p-4 text-slate-400">Gerando insights...</div> : 
                        <div className="prose prose-sm prose-invert max-w-none text-slate-300 whitespace-pre-wrap p-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{financialInsights || ''}</ReactMarkdown>
                        </div>
                    }
                </ReportCard>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-100">Dashboard de Gestão Operacional</h1>
            <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                {[7, 30, 90].map(days => (
                    <button key={days} onClick={() => setTimeRange(days)} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${timeRange === days ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>
                        {days} dias
                    </button>
                ))}
            </div>
        </header>

        {renderContent()}

    </div>
  );
};

export default OperationalDashboard;
    