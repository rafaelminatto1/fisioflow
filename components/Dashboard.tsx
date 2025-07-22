import React, { useState, useMemo, useEffect } from 'react';
import MetricCard from './MetricCard';
import {
  IconClock,
  IconUsers,
  IconCheckCircle,
  IconTrendingUp,
  IconSparkles,
  IconAlertTriangle,
} from './icons/IconComponents';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { predictAbandonmentRisk } from '../services/geminiService';
import type { AbandonmentRiskPrediction } from '../types';
import Button from './ui/Button';
import PageLoader from './ui/PageLoader';
import OnboardingChecklist from './OnboardingChecklist';

const productivityData = [
  { name: 'Dr. Ana', produtividade: 85 },
  { name: 'Carlos', produtividade: 92 },
  { name: 'Beatriz', produtividade: 78 },
  { name: 'Equipe', produtividade: 87 },
];

const PredictiveInsightsCard: React.FC = () => {
  const { patients, appointments, exerciseLogs, transactions } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<
    AbandonmentRiskPrediction[] | null
  >(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setPredictions(null);

    try {
      const anonymizedData = patients.map((p) => {
        const patientAppointments = appointments
          .filter((a) => a.patientId === p.id)
          .sort(
            (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
          );
        const patientLogs = exerciseLogs.filter((l) => l.patientId === p.id);
        const lastAppointment = patientAppointments[0];
        const daysSinceLastAppointment = lastAppointment
          ? Math.floor(
              (new Date().getTime() -
                new Date(lastAppointment.start).getTime()) /
                (1000 * 3600 * 24)
            )
          : 999;

        return {
          patientId: p.id,
          totalAppointments: patientAppointments.length,
          daysSinceLastAppointment,
          exerciseAdherence: patientLogs.length,
          pendingPayments: transactions.filter(
            (t) => t.patientId === p.id && t.status === 'pendente'
          ).length,
        };
      });

      const results = await predictAbandonmentRisk(anonymizedData);
      const highRiskPatients = results
        .filter((r) => r.riskLevel === 'Alto')
        .map((r) => ({
          ...r,
          patientName:
            patients.find((p) => p.id === r.patientId)?.name || 'Desconhecido',
        }));

      setPredictions(highRiskPatients);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.'
      );
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6 lg:col-span-2">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="flex items-center text-xl font-semibold text-slate-100">
            <IconSparkles className="mr-2 text-amber-400" />
            Insights Preditivos (Platinum)
          </h2>
          <p className="text-sm text-slate-400">
            Análise de risco de abandono de tratamento.
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          isLoading={isLoading}
          disabled={isLoading}
        >
          Analisar
        </Button>
      </div>

      <div className="min-h-[150px]">
        {predictions && predictions.length > 0 && (
          <div className="space-y-3">
            {predictions.map((p) => (
              <div
                key={p.patientId}
                className="rounded-md border border-amber-500/30 bg-amber-900/40 p-3"
              >
                <p className="font-bold text-amber-300">{p.patientName}</p>
                <p className="text-sm text-amber-400">{p.reason}</p>
              </div>
            ))}
          </div>
        )}
        {predictions && predictions.length === 0 && (
          <div className="p-4 text-center text-emerald-400">
            <IconCheckCircle className="mx-auto mb-2" />
            <p>Nenhum paciente com alto risco de abandono detectado.</p>
          </div>
        )}
        {error && (
          <div className="p-4 text-center text-red-400">
            <IconAlertTriangle className="mx-auto mb-2" />
            <p>{error}</p>
          </div>
        )}
        {!predictions && !isLoading && !error && (
          <div className="p-4 text-center text-slate-500">
            <p>
              Clique em "Analisar" para que a IA identifique pacientes com risco
              de abandonar o tratamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { patients, tasks } = useData();
  const { currentTenant } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400); // Simulate loading
    return () => clearTimeout(timer);
  }, []);

  const activePatients = patients.length;
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((t) => t.status !== 'done').length;
  const completedTasks = totalTasks - pendingTasks;
  const completionRate =
    totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(0) : '0';

  // Show onboarding checklist for new users (simulated by having few tasks)
  const isNewUser = useMemo(
    () => tasks.length < 5 && patients.length < 2,
    [tasks, patients]
  );

  if (isLoading) {
    return <PageLoader message="Carregando dashboard..." />;
  }

  return (
    <div className="space-y-6">
      {isNewUser && <OnboardingChecklist />}

      <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<IconUsers size={24} />}
          title="Pacientes Ativos"
          value={String(activePatients)}
          change={`${patients.length > 0 ? 'Monitorando' : 'Nenhum paciente'}`}
        />
        <MetricCard
          icon={<IconClock />}
          title="Tarefas Pendentes"
          value={String(pendingTasks)}
          change={`${completedTasks} concluídas`}
        />
        <MetricCard
          icon={<IconCheckCircle />}
          title="Tarefas Concluídas"
          value={String(completedTasks)}
          change={`${totalTasks} no total`}
        />
        <MetricCard
          icon={<IconTrendingUp />}
          title="Taxa de Conclusão"
          value={`${completionRate}%`}
          change="de todas as tarefas"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-xl font-semibold text-slate-100">
            Produtividade da Equipe
          </h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={productivityData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#cbd5e1" />
                <YAxis stroke="#cbd5e1" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#475569',
                    color: '#f8fafc',
                  }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Bar
                  dataKey="produtividade"
                  fill="#3b82f6"
                  name="Produtividade (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {currentTenant?.plan === 'platinum' && <PredictiveInsightsCard />}
      </div>
    </div>
  );
};

export default Dashboard;
