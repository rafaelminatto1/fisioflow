import React, { useState, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData.minimal';
import {
  Task,
  Patient,
  Prescription,
  Exercise,
  ExerciseLog,
  Appointment,
  User,
  Transaction,
} from '../types';
import PatientFeedbackModal from './PatientFeedbackModal';
import ExerciseModal from './ExerciseModal';
import ExerciseFeedbackModal from './ExerciseFeedbackModal';
import {
  IconLogout,
  IconClipboardList,
  IconActivity,
  IconVideo,
  IconEdit,
  IconCalendar,
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
  IconSparkles,
} from './icons/IconComponents';
import { Stethoscope } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import PaymentModal from './PaymentModal';
import AIAssistant from './AIAssistant';

// --- Re-usable sub-components for the new dashboard ---

const PortalMetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
}> = ({ icon, label, value, subtext, trend }) => {
  const trendIcon =
    trend === 'up' ? (
      <IconTrendingUp className="text-emerald-400" />
    ) : trend === 'down' ? (
      <IconTrendingDown className="text-emerald-400" />
    ) : null;
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-800 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-medium text-slate-300">{label}</h3>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div>
        <p className="flex items-center gap-2 text-3xl font-bold text-slate-50">
          {value} {trendIcon}
        </p>
        {subtext && <p className="text-sm text-slate-400">{subtext}</p>}
      </div>
    </div>
  );
};

const NextAppointmentCard: React.FC<{
  appointment?: Appointment;
  therapist?: User | null;
}> = ({ appointment, therapist }) => (
  <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-blue-500/50 bg-blue-900/40 p-6 md:flex-row">
    <div className="flex items-center gap-4">
      <IconCalendar size={40} className="text-blue-300" />
      <div>
        <h3 className="text-xl font-bold text-white">Próxima Sessão</h3>
        {appointment ? (
          <p className="text-lg text-blue-200">
            {new Date(appointment.start).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            })}{' '}
            às{' '}
            {new Date(appointment.start).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        ) : (
          <p className="text-blue-200">Nenhuma sessão agendada.</p>
        )}
      </div>
    </div>
    {therapist && (
      <div className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
        <img
          src={therapist.avatarUrl}
          alt={therapist.name}
          className="h-10 w-10 rounded-full"
        />
        <div>
          <p className="text-sm text-slate-400">com</p>
          <p className="font-semibold text-slate-100">{therapist.name}</p>
        </div>
      </div>
    )}
  </div>
);

const PatientExerciseCard: React.FC<{
  prescription: Prescription;
  exercise: Exercise;
  onWatchVideo: () => void;
  onLogProgress: () => void;
}> = ({ prescription, exercise, onWatchVideo, onLogProgress }) => (
  <div className="flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-800 p-5">
    <div>
      <h3 className="text-lg font-semibold text-slate-100">{exercise.name}</h3>
      <div className="my-2 space-y-1 text-sm text-slate-300">
        <p>
          <span className="font-semibold text-slate-400">Séries:</span>{' '}
          {prescription.sets}
        </p>
        <p>
          <span className="font-semibold text-slate-400">Repetições:</span>{' '}
          {prescription.reps}
        </p>
        <p>
          <span className="font-semibold text-slate-400">Frequência:</span>{' '}
          {prescription.frequency}
        </p>
        {prescription.notes && (
          <p>
            <span className="font-semibold text-slate-400">Notas:</span>{' '}
            {prescription.notes}
          </p>
        )}
      </div>
    </div>
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <button
        onClick={onWatchVideo}
        className="flex flex-1 items-center justify-center rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-600"
      >
        <IconVideo size={16} />
        <span className="ml-2">Ver Vídeo</span>
      </button>
      <button
        onClick={onLogProgress}
        className="flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700"
      >
        <IconEdit size={16} />
        <span className="ml-2">Registrar</span>
      </button>
    </div>
  </div>
);

const formatCurrency = (value: number) =>
  `R$ ${value.toFixed(2).replace('.', ',')}`;

// --- Main Patient Portal Component ---

const PatientPortal: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    patients,
    tasks,
    appointments,
    exercises,
    prescriptions,
    exerciseLogs,
    users,
    transactions,
    addTaskFeedback,
    saveExerciseLog,
    saveTransaction,
  } = useData();

  // Modal States
  const [isTaskFeedbackModalOpen, setIsTaskFeedbackModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [isExerciseFeedbackModalOpen, setIsExerciseFeedbackModalOpen] =
    useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);

  // Selected Item States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedPrescription, setSelectedPrescription] =
    useState<Prescription | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // --- Data processing with useMemo ---

  const patientProfile = useMemo(
    () => patients.find((p) => p.id === user?.patientProfileId),
    [patients, user]
  );

  const patientTasks = useMemo(
    () => tasks.filter((t) => t.patientId === patientProfile?.id),
    [tasks, patientProfile]
  );

  const patientPrescriptions = useMemo(
    () => prescriptions.filter((p) => p.patientId === patientProfile?.id),
    [prescriptions, patientProfile]
  );

  const nextAppointment = useMemo(
    () =>
      appointments
        .filter(
          (a) =>
            a.patientId === patientProfile?.id && new Date(a.start) > new Date()
        )
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        )[0],
    [appointments, patientProfile]
  );

  const therapistForNextAppointment = useMemo(
    () =>
      nextAppointment
        ? users.find((u) => u.id === nextAppointment.therapistId)
        : null,
    [users, nextAppointment]
  );

  const sevenDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date;
  }, []);

  const recentLogs = useMemo(
    () =>
      exerciseLogs
        .filter(
          (log) =>
            log.patientId === patientProfile?.id &&
            new Date(log.date) >= sevenDaysAgo
        )
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [exerciseLogs, patientProfile, sevenDaysAgo]
  );

  const dashboardMetrics = useMemo(() => {
    const completedInLast7Days = new Set(
      recentLogs.map((log) => new Date(log.date).toDateString())
    ).size;
    const avgPainLast7Days =
      recentLogs.length > 0
        ? (
            recentLogs.reduce((sum, log) => sum + log.painLevel, 0) /
            recentLogs.length
          ).toFixed(1)
        : 'N/A';
    const pendingTasks = patientTasks.filter((t) => t.status !== 'done').length;

    const painTrend: 'up' | 'down' | 'neutral' =
      recentLogs.length < 2
        ? 'neutral'
        : recentLogs[recentLogs.length - 1].painLevel < recentLogs[0].painLevel
          ? 'down'
          : recentLogs[recentLogs.length - 1].painLevel >
              recentLogs[0].painLevel
            ? 'up'
            : 'neutral';

    return { completedInLast7Days, avgPainLast7Days, pendingTasks, painTrend };
  }, [recentLogs, patientTasks]);

  const painChartData = useMemo(
    () =>
      recentLogs.map((log) => ({
        name: new Date(log.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        Dor: log.painLevel,
      })),
    [recentLogs]
  );

  const patientTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.patientId === patientProfile?.id)
        .sort(
          (a, b) =>
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        ),
    [transactions, patientProfile]
  );

  const pendingTransactions = useMemo(
    () => patientTransactions.filter((t) => t.status === 'pendente'),
    [patientTransactions]
  );
  const paidTransactions = useMemo(
    () => patientTransactions.filter((t) => t.status === 'pago'),
    [patientTransactions]
  );

  const aiAssistantData = useMemo(() => {
    if (!patientProfile) return undefined;
    return {
      patient: patientProfile,
      appointments: appointments.filter(
        (a) => a.patientId === patientProfile.id
      ),
      prescriptions: patientPrescriptions,
      exercises: exercises,
    };
  }, [patientProfile, appointments, patientPrescriptions, exercises]);

  // --- Modal Handlers ---

  const handleOpenTaskFeedbackModal = (task: Task) => {
    setSelectedTask(task);
    setIsTaskFeedbackModalOpen(true);
  };
  const handleCloseTaskFeedbackModal = () => {
    setIsTaskFeedbackModalOpen(false);
    setSelectedTask(null);
  };
  const handleSaveTaskFeedback = (taskId: string, feedback: string) => {
    addTaskFeedback(taskId, feedback);
    handleCloseTaskFeedbackModal();
  };

  const handleOpenExerciseModal = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsExerciseModalOpen(true);
  };
  const handleCloseExerciseModal = () => {
    setIsExerciseModalOpen(false);
    setSelectedExercise(null);
  };

  const handleOpenExerciseFeedbackModal = (prescription: Prescription) => {
    const exercise = exercises.find((ex) => ex.id === prescription.exerciseId);
    if (exercise) {
      setSelectedPrescription(prescription);
      setSelectedExercise(exercise);
      setIsExerciseFeedbackModalOpen(true);
    }
  };
  const handleCloseExerciseFeedbackModal = () => {
    setIsExerciseFeedbackModalOpen(false);
    setSelectedPrescription(null);
    setSelectedExercise(null);
  };

  const handleSaveExerciseLog = useCallback(
    (log: Omit<ExerciseLog, 'id' | 'tenantId'>) => {
      if (user) {
        saveExerciseLog(log, user);
      }
    },
    [user, saveExerciseLog]
  );

  const handleOpenPaymentModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsPaymentModalOpen(true);
  };
  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedTransaction(null);
  };
  const handleConfirmPayment = (transactionToPay: Transaction) => {
    if (user)
      saveTransaction(
        {
          ...transactionToPay,
          status: 'pago',
          paidDate: new Date().toISOString(),
        },
        user
      );
    handleClosePaymentModal();
  };

  if (!patientProfile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-slate-50">
        <h1 className="text-2xl">Perfil de paciente não encontrado.</h1>
        <button
          onClick={logout}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2"
        >
          Sair
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50">
      <header className="flex items-center justify-between border-b border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-center">
          <div className="mr-3 rounded-lg bg-blue-500 p-2">
            <Stethoscope className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Portal do Paciente</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="font-semibold">{patientProfile.name}</p>
            <p className="text-sm text-slate-400">Paciente</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Sair"
          >
            <IconLogout className="mr-2" />
            Sair
          </button>
        </div>
      </header>
      <main className="space-y-8 p-4 md:p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-100">
              Olá, {patientProfile.name.split(' ')[0]}!
            </h2>
            <p className="mt-1 text-slate-400">
              Bem-vindo(a) ao seu painel de acompanhamento.
            </p>
          </div>
          <button
            onClick={() => setIsAIAssistantOpen(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
            aria-label="Abrir Assistente IA"
          >
            <IconSparkles size={18} />
            <span className="hidden md:inline">Assistente IA</span>
          </button>
        </div>

        <NextAppointmentCard
          appointment={nextAppointment}
          therapist={therapistForNextAppointment}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PortalMetricCard
            icon={<IconActivity />}
            label="Sessões de Exercício"
            value={dashboardMetrics.completedInLast7Days}
            subtext="nos últimos 7 dias"
          />
          <PortalMetricCard
            icon={<IconTrendingUp />}
            label="Nível Médio de Dor"
            value={dashboardMetrics.avgPainLast7Days}
            subtext="nos últimos 7 dias"
            trend={dashboardMetrics.painTrend}
          />
          <PortalMetricCard
            icon={<IconClipboardList />}
            label="Tarefas Pendentes"
            value={dashboardMetrics.pendingTasks}
            subtext="no seu plano de tratamento"
          />
        </div>

        {painChartData.length > 1 && (
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 md:p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              Evolução do Nível de Dor
            </h2>
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <LineChart
                  data={painChartData}
                  margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} />
                  <YAxis stroke="#cbd5e1" fontSize={12} domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Dor"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-bold text-slate-100">
            Minhas Finanças
          </h2>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-5">
            <h3 className="mb-3 text-lg font-semibold text-slate-200">
              Pagamentos Pendentes
            </h3>
            {pendingTransactions.length > 0 ? (
              <ul className="divide-y divide-slate-700">
                {pendingTransactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-col items-start justify-between gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-medium text-slate-100">
                        {t.description}
                      </p>
                      <p className="text-sm text-slate-400">
                        Vencimento:{' '}
                        {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-lg font-bold text-amber-400">
                        {formatCurrency(t.amount)}
                      </p>
                      <button
                        onClick={() => handleOpenPaymentModal(t)}
                        className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white transition-colors hover:bg-emerald-700"
                      >
                        Pagar Agora
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                Você não possui pendências financeiras.
              </p>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-400 hover:text-blue-300">
                Ver histórico de pagamentos
              </summary>
              <div className="mt-3 border-t border-slate-700 pt-3">
                {paidTransactions.length > 0 ? (
                  <ul className="space-y-2">
                    {paidTransactions.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between text-sm text-slate-400"
                      >
                        <span>{t.description}</span>
                        <span className="text-slate-300">
                          {formatCurrency(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">
                    Nenhum pagamento no histórico.
                  </p>
                )}
              </div>
            </details>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-bold text-slate-100">
            Seu Programa de Exercícios
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {patientPrescriptions.length > 0 ? (
              patientPrescriptions.map((prescription) => {
                const exercise = exercises.find(
                  (ex) => ex.id === prescription.exerciseId
                );
                if (!exercise) return null;
                return (
                  <PatientExerciseCard
                    key={prescription.id}
                    prescription={prescription}
                    exercise={exercise}
                    onWatchVideo={() => handleOpenExerciseModal(exercise)}
                    onLogProgress={() =>
                      handleOpenExerciseFeedbackModal(prescription)
                    }
                  />
                );
              })
            ) : (
              <div className="col-span-full rounded-lg border border-dashed border-slate-700 bg-slate-800 py-12 text-center">
                <p className="text-slate-400">
                  Você ainda não tem exercícios prescritos.
                </p>
                <p className="text-sm text-slate-500">
                  Entre em contato com seu fisioterapeuta.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {isTaskFeedbackModalOpen && (
        <PatientFeedbackModal
          isOpen={isTaskFeedbackModalOpen}
          onClose={handleCloseTaskFeedbackModal}
          task={selectedTask}
          onSaveFeedback={handleSaveTaskFeedback}
        />
      )}
      {isExerciseModalOpen && (
        <ExerciseModal
          isOpen={isExerciseModalOpen}
          onClose={handleCloseExerciseModal}
          exercise={selectedExercise}
        />
      )}
      {isExerciseFeedbackModalOpen &&
        selectedPrescription &&
        selectedExercise && (
          <ExerciseFeedbackModal
            isOpen={isExerciseFeedbackModalOpen}
            onClose={handleCloseExerciseFeedbackModal}
            onSave={handleSaveExerciseLog}
            prescription={selectedPrescription}
            exercise={selectedExercise}
          />
        )}
      {isPaymentModalOpen && selectedTransaction && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handleClosePaymentModal}
          transaction={selectedTransaction}
          onConfirmPayment={handleConfirmPayment}
        />
      )}
      {aiAssistantData && (
        <AIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          contextType="patient"
          patientData={aiAssistantData}
        />
      )}
    </div>
  );
};

export default PatientPortal;
