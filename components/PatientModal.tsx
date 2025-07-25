import React, { useState, useEffect, useRef } from 'react';
import {
  PatientModalProps,
  Patient,
  Exercise,
  ExerciseLog,
  Prescription,
  UserRole,
  Assessment,
  Transaction,
  Task,
  Appointment,
  User,
  Document,
} from '../types';
import { useAuth } from '../hooks/useAuth';
// import { useAssessments } from '../hooks/useAssessments'; // Hook removido
// import { useDocuments } from '../hooks/useDocuments'; // Hook removido
// import { usePrescriptions } from '../hooks/usePrescriptions'; // Hook removido
// import { useUsers } from '../hooks/useUsers'; // Hook removido
import { TASK_STATUS_COLORS, TASK_STATUSES } from '../constants';
import {
  IconX,
  IconTrash,
  IconSparkles,
  IconHistory,
  IconPlus,
  IconPencil,
  IconClipboardCheck,
  IconUser,
  IconClipboardList,
  IconActivity,
  IconDollarSign,
  IconCalendar,
  IconAlertTriangle,
  IconPaperclip,
  IconUpload,
  IconFile,
} from './icons/IconComponents';
import { generatePatientReport } from '../services/geminiService';
import ExerciseHistoryModal from './ExerciseHistoryModal';
import PrescriptionModal from './PrescriptionModal';
import AssessmentModal from './AssessmentModal';
import { SymptomDiaryIntegration } from './SymptomDiaryIntegration';

// --- SUB-COMPONENTS TO MODULARIZE THE MODAL ---

const ReadOnlyDisplay: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={className}>
    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
      {label}
    </p>
    <div className="mt-1 text-sm leading-relaxed text-slate-100">
      {children}
    </div>
  </div>
);

const SummaryCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-4">
    <div className="mb-2 flex items-center gap-3">
      <div className="text-blue-400">{icon}</div>
      <h4 className="font-semibold text-slate-200">{title}</h4>
    </div>
    <div className="text-sm text-slate-300">{children}</div>
  </div>
);

const PatientSummaryTab: React.FC<{
  patient: Partial<Patient>;
  tasks: Task[];
  appointments: Appointment[];
  assessments: Assessment[];
}> = ({ patient, tasks, appointments, assessments }) => {
  const nextAppointment = appointments
    .filter((a) => a.patientId === patient.id && new Date(a.start) > new Date())
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    )[0];

  const latestAssessment = assessments
    .filter((a) => a.patientId === patient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const pendingTasks = tasks.filter(
    (t) => t.patientId === patient.id && t.status !== 'done'
  );

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <SummaryCard icon={<IconCalendar size={20} />} title="Próxima Sessão">
          {nextAppointment ? (
            <div>
              <p className="font-bold text-slate-100">
                {new Date(nextAppointment.start).toLocaleString('pt-BR', {
                  dateStyle: 'full',
                  timeStyle: 'short',
                })}
              </p>
              <p className="text-slate-400">{nextAppointment.title}</p>
            </div>
          ) : (
            <p>Nenhuma sessão futura agendada.</p>
          )}
        </SummaryCard>

        <SummaryCard
          icon={<IconClipboardList size={20} />}
          title="Tarefas Pendentes"
        >
          {pendingTasks.length > 0 ? (
            <p>
              <span className="font-bold text-slate-100">
                {pendingTasks.length}
              </span>{' '}
              tarefa(s) em andamento ou a fazer.
            </p>
          ) : (
            <p>Nenhuma tarefa pendente.</p>
          )}
        </SummaryCard>
      </div>
      <div className="space-y-4">
        <SummaryCard
          icon={<IconClipboardCheck size={20} />}
          title="Última Avaliação"
        >
          {latestAssessment ? (
            <div className="space-y-2">
              <p className="text-slate-400">
                Realizada em:{' '}
                {new Date(latestAssessment.date).toLocaleDateString('pt-BR')}
              </p>
              <div>
                <h5 className="font-semibold text-slate-200">
                  Hipótese Diagnóstica:
                </h5>
                <p className="italic text-slate-300">
                  "{latestAssessment.diagnosticHypothesis}"
                </p>
              </div>
            </div>
          ) : (
            <p>Nenhuma avaliação registrada.</p>
          )}
        </SummaryCard>
        {!patient.consent?.given && (
          <SummaryCard
            icon={<IconAlertTriangle size={20} />}
            title="Ação Necessária"
          >
            <p className="font-bold text-amber-300">
              Consentimento para tratamento de dados está pendente.
            </p>
            <p className="text-amber-400/80">
              Edite os dados do paciente para registrar o consentimento.
            </p>
          </SummaryCard>
        )}
      </div>
    </div>
  );
};

const PatientDetailsTab: React.FC<{
  isEditing: boolean;
  editedPatient: Partial<Patient>;
  errors: { name?: string; email?: string; consent?: string };
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleConsentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({
  isEditing,
  editedPatient,
  errors,
  handleChange,
  handleConsentChange,
}) => {
  return (
    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <img
            src={editedPatient.avatarUrl}
            alt={editedPatient.name}
            className="h-20 w-20 rounded-full border-2 border-slate-600"
          />
          <div className="w-full space-y-2">
            {isEditing ? (
              <>
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-300"
                >
                  Nome Completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={editedPatient.name || ''}
                  onChange={handleChange}
                  className={`w-full border bg-slate-900 ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                )}
              </>
            ) : (
              <ReadOnlyDisplay label="Nome">
                <p className="text-xl font-bold">{editedPatient.name}</p>
              </ReadOnlyDisplay>
            )}
          </div>
        </div>
        {isEditing ? (
          <>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-300"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={editedPatient.email || ''}
                onChange={handleChange}
                className={`w-full border bg-slate-900 ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-slate-300"
              >
                Telefone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={editedPatient.phone || ''}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <ReadOnlyDisplay label="Email">
              {editedPatient.email}
            </ReadOnlyDisplay>
            <ReadOnlyDisplay label="Telefone">
              {editedPatient.phone || 'Não informado'}
            </ReadOnlyDisplay>
          </div>
        )}
      </div>
      <div className="flex flex-col space-y-4 pt-4 md:pt-0">
        <div className="flex h-full flex-1 flex-col space-y-2">
          <label
            htmlFor="medicalHistory"
            className="text-sm font-medium text-slate-300"
          >
            Histórico Clínico Resumido
          </label>
          {isEditing ? (
            <textarea
              id="medicalHistory"
              name="medicalHistory"
              value={editedPatient.medicalHistory || ''}
              onChange={handleChange}
              rows={10}
              className="w-full flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <div className="min-h-[100px] flex-1 whitespace-pre-wrap rounded-md border border-slate-700 bg-slate-900/50 p-3 text-slate-300">
              {editedPatient.medicalHistory || (
                <span className="italic text-slate-500">
                  Nenhum histórico informado.
                </span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {isEditing ? (
            <div className="mt-2 rounded-md border border-slate-600 bg-slate-900/50 p-3">
              <label className="flex cursor-pointer items-center space-x-3">
                <input
                  type="checkbox"
                  name="consent"
                  checked={editedPatient.consent?.given || false}
                  onChange={handleConsentChange}
                  className="h-5 w-5 rounded border-gray-300 border-slate-500 bg-slate-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-200">
                  Confirmo que obtive o consentimento do paciente para o
                  tratamento de seus dados.
                </span>
              </label>
              {errors.consent && (
                <p className="mt-2 text-xs text-red-400">{errors.consent}</p>
              )}
            </div>
          ) : (
            <ReadOnlyDisplay label="Consentimento de Dados">
              {editedPatient.consent?.given ? (
                <span className="text-emerald-400">
                  Consentimento fornecido em{' '}
                  {editedPatient.consent.timestamp
                    ? new Date(
                        editedPatient.consent.timestamp
                      ).toLocaleDateString('pt-BR')
                    : ''}
                </span>
              ) : (
                <span className="text-amber-400">Consentimento pendente</span>
              )}
            </ReadOnlyDisplay>
          )}
        </div>
      </div>
    </div>
  );
};

const PatientAssessmentsTab: React.FC<{
  assessments: Assessment[];
  canManage: boolean;
  isEditing: boolean;
  patientId: string;
  therapistId: string;
}> = ({ assessments, canManage, isEditing, patientId, therapistId }) => {
  const { user } = useAuth();
  // const { createAssessment, deleteAssessment: removeAssessment } = useAssessments(); // Hook removido
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<
    Assessment | Partial<Assessment> | null
  >(null);
  const [isAssessmentReadOnly, setIsAssessmentReadOnly] = useState(false);

  const handleOpenNewAssessmentModal = () => {
    setSelectedAssessment({
      patientId: patientId,
      therapistId: therapistId,
      date: new Date().toISOString(),
      painLevel: 0,
      rangeOfMotion: [],
      muscleStrength: [],
      functionalTests: [],
    });
    setIsAssessmentReadOnly(false);
    setIsAssessmentModalOpen(true);
  };

  const handleOpenViewAssessmentModal = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsAssessmentReadOnly(true);
    setIsAssessmentModalOpen(true);
  };

  const handleCloseAssessmentModal = () => {
    setIsAssessmentModalOpen(false);
    setSelectedAssessment(null);
  };

  const handleSaveAssessment = async (assessmentToSave: Assessment) => {
    try {
      if (user) {
        await createAssessment(assessmentToSave, user);
        handleCloseAssessmentModal();
      }
    } catch (error) {
      console.error('Erro ao salvar avaliação:', error);
    }
  };

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta avaliação?')) {
      try {
        if (user) {
          await removeAssessment(assessmentId, user);
          handleCloseAssessmentModal();
        }
      } catch (error) {
        console.error('Erro ao excluir avaliação:', error);
      }
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">
            Histórico de Avaliações
          </h3>
          {canManage && isEditing && (
            <button
              onClick={handleOpenNewAssessmentModal}
              className="flex items-center justify-center rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-600/40"
            >
              <IconPlus className="mr-2" size={16} />
              Nova Avaliação
            </button>
          )}
        </div>
        {assessments.length > 0 ? (
          <ul className="space-y-3">
            {[...assessments]
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )
              .map((assessment) => (
                <li
                  key={assessment.id}
                  onClick={() => handleOpenViewAssessmentModal(assessment)}
                  className="cursor-pointer rounded-md border border-slate-700 bg-slate-900/70 p-3 hover:bg-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        {new Date(assessment.date).toLocaleDateString('pt-BR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {assessment.mainComplaint}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              Nenhuma avaliação registrada para este paciente.
            </p>
            {canManage && isEditing && (
              <p className="mt-1 text-xs text-slate-500">
                Clique em "Nova Avaliação" para começar.
              </p>
            )}
          </div>
        )}
      </div>
      {isAssessmentModalOpen && patientId && therapistId && (
        <AssessmentModal
          isOpen={isAssessmentModalOpen}
          onClose={handleCloseAssessmentModal}
          onSave={handleSaveAssessment}
          onDelete={handleDeleteAssessment}
          assessment={selectedAssessment}
          patientId={patientId}
          therapistId={therapistId}
          isReadOnly={isAssessmentReadOnly}
        />
      )}
    </>
  );
};

const PatientActivitiesTab: React.FC<{
  tasks: Task[];
  appointments: Appointment[];
  aiReport: string;
  isGeneratingReport: boolean;
  handleGenerateReport: () => void;
}> = ({
  tasks,
  appointments,
  aiReport,
  isGeneratingReport,
  handleGenerateReport,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-200">
          Relatório de Progresso com IA
        </h3>
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport || !tasks || tasks.length === 0}
          className="flex w-full max-w-sm items-center justify-center rounded-md bg-blue-600/20 px-3 py-2 text-sm font-medium text-blue-300 transition-all hover:bg-blue-600/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconSparkles className="mr-2" />
          {isGeneratingReport ? 'Gerando Relatório...' : 'Gerar com IA'}
        </button>
        {aiReport && (
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-700 bg-slate-900 p-3">
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-slate-300">
              {aiReport}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-200">
          Tarefas Associadas
        </h3>
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                key={task.id}
                className="rounded-md border border-slate-700 bg-slate-900/70 p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-200">
                    {task.title}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${TASK_STATUS_COLORS[task.status]} text-white`}
                  >
                    {TASK_STATUSES[task.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">Nenhuma tarefa associada.</p>
        )}
      </div>
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-200">
          Próximos Agendamentos
        </h3>
        {appointments.length > 0 ? (
          <ul className="space-y-2">
            {appointments
              .filter((a) => new Date(a.start) > new Date())
              .sort(
                (a, b) =>
                  new Date(a.start).getTime() - new Date(b.start).getTime()
              )
              .map((appt) => (
                <li
                  key={appt.id}
                  className="rounded-md border border-slate-700 bg-slate-900/70 p-3"
                >
                  <p className="text-sm font-medium text-slate-200">
                    {appt.title}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(appt.start).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            {appointments.filter((a) => new Date(a.start) > new Date())
              .length === 0 && (
              <p className="text-sm text-slate-400">
                Nenhum agendamento futuro.
              </p>
            )}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">
            Nenhum agendamento encontrado.
          </p>
        )}
      </div>
    </div>
  );
};

const PatientExercisesTab: React.FC<{
  prescribedExercises: Prescription[];
  exercises: Exercise[];
  exerciseLogs: ExerciseLog[];
  canManage: boolean;
  isEditing: boolean;
  patientId: string;
}> = ({
  prescribedExercises,
  exercises,
  exerciseLogs,
  canManage,
  isEditing,
  patientId,
}) => {
  const { user } = useAuth();
  // const { createPrescription, deletePrescription: removePrescription } = usePrescriptions(); // Hook removido
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [selectedExerciseForHistory, setSelectedExerciseForHistory] =
    useState<Exercise | null>(null);
  const [selectedLogs, setSelectedLogs] = useState<ExerciseLog[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<
    Prescription | Partial<Prescription> | null
  >(null);

  const handleOpenHistoryModal = (
    exercise: Exercise,
    prescriptionId: string
  ) => {
    setSelectedExerciseForHistory(exercise);
    setSelectedLogs(
      exerciseLogs.filter((log) => log.prescriptionId === prescriptionId)
    );
    setIsHistoryModalOpen(true);
  };

  const handleOpenNewPrescriptionModal = () => {
    setSelectedPrescription({
      patientId: patientId,
      exerciseId: '',
      sets: 3,
      reps: 10,
      frequency: '3x por semana',
    });
    setIsPrescriptionModalOpen(true);
  };

  const handleOpenEditPrescriptionModal = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setIsPrescriptionModalOpen(true);
  };

  const handleClosePrescriptionModal = () => {
    setIsPrescriptionModalOpen(false);
    setSelectedPrescription(null);
  };

  const handleSavePrescription = async (prescriptionToSave: Prescription) => {
    try {
      if (user) {
        await createPrescription(prescriptionToSave, user);
        handleClosePrescriptionModal();
      }
    } catch (error) {
      console.error('Erro ao salvar prescrição:', error);
    }
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta prescrição?')) {
      try {
        if (user) {
          await removePrescription(prescriptionId, user);
          handleClosePrescriptionModal();
        }
      } catch (error) {
        console.error('Erro ao excluir prescrição:', error);
      }
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200">
            Exercícios Prescritos
          </h3>
          {canManage && isEditing && (
            <button
              onClick={handleOpenNewPrescriptionModal}
              className="flex items-center justify-center rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-600/40"
            >
              <IconPlus className="mr-2" size={16} /> Prescrever Exercício
            </button>
          )}
        </div>
        {prescribedExercises.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Exercício
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Prescrição
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Logs
                  </th>
                  <th scope="col" className="px-4 py-3 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {prescribedExercises.map((prescription) => {
                  const exercise = exercises.find(
                    (ex) => ex.id === prescription.exerciseId
                  );
                  if (!exercise) return null;
                  const logCount = exerciseLogs.filter(
                    (log) => log.prescriptionId === prescription.id
                  ).length;
                  return (
                    <tr key={prescription.id} className="hover:bg-slate-700/50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-100">
                        {exercise.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{`${prescription.sets}x${prescription.reps} - ${prescription.frequency}`}</td>
                      <td className="px-4 py-3 text-center">{logCount}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              handleOpenHistoryModal(exercise, prescription.id)
                            }
                            className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-blue-400"
                            title="Ver Histórico de Progresso"
                          >
                            <IconHistory size={18} />
                          </button>
                          {canManage && isEditing && (
                            <>
                              <button
                                onClick={() =>
                                  handleOpenEditPrescriptionModal(prescription)
                                }
                                className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
                                title="Editar Prescrição"
                              >
                                <IconPencil size={18} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeletePrescription(prescription.id)
                                }
                                className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                                title="Remover Prescrição"
                              >
                                <IconTrash size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center">
            <p className="text-sm text-slate-400">
              Nenhum exercício prescrito para este paciente.
            </p>
            {canManage && isEditing && (
              <p className="mt-1 text-xs text-slate-500">
                Clique em "Prescrever Exercício" para começar.
              </p>
            )}
          </div>
        )}
      </div>
      {selectedExerciseForHistory && (
        <ExerciseHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          exercise={selectedExerciseForHistory}
          logs={selectedLogs}
        />
      )}
      {isPrescriptionModalOpen && patientId && (
        <PrescriptionModal
          isOpen={isPrescriptionModalOpen}
          onClose={handleClosePrescriptionModal}
          onSave={handleSavePrescription}
          onDelete={handleDeletePrescription}
          prescription={selectedPrescription}
          patientId={patientId}
          exercises={exercises}
        />
      )}
    </>
  );
};

const PatientFinancialTab: React.FC<{ transactions: Transaction[] }> = ({
  transactions,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-slate-200">
        Histórico Financeiro
      </h3>
      {transactions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Descrição
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Valor
                </th>
                <th scope="col" className="px-4 py-3">
                  Vencimento
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {transactions
                .sort(
                  (a, b) =>
                    new Date(b.dueDate).getTime() -
                    new Date(a.dueDate).getTime()
                )
                .map((transaction) => {
                  const isOverdue =
                    transaction.status === 'pendente' &&
                    new Date(transaction.dueDate) < new Date();
                  return (
                    <tr key={transaction.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3 font-medium text-slate-100">
                        {transaction.description}
                      </td>
                      <td className="px-4 py-3 text-right">
                        R$ {transaction.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(transaction.dueDate).toLocaleDateString(
                          'pt-BR'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                            transaction.status === 'pago'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isOverdue
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isOverdue ? 'Atrasado' : transaction.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhum registro financeiro para este paciente.
          </p>
        </div>
      )}
    </div>
  );
};

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const PatientDocumentsTab: React.FC<{
  documents: Document[];
  patientId: string;
  isEditing: boolean;
  canManage: boolean;
}> = ({ documents, patientId, isEditing, canManage }) => {
  const { user } = useAuth();
  // const { users } = useUsers(); // Hook removido
  // const { uploadDocument, removeDocument } = useDocuments(); // Hook removido
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user && user.tenantId) {
      try {
        const newDoc = {
          patientId: patientId,
          title: file.name,
          description: `Documento enviado em ${new Date().toLocaleDateString()}`,
          category: 'general',
          tenantId: user.tenantId,
        };
        await uploadDocument(newDoc, file, user);
      } catch (error) {
        console.error('Erro ao fazer upload do documento:', error);
      }
    }
    // Reset file input
    if (e.target) e.target.value = '';
  };

  const handleDelete = async (docId: string) => {
    if (
      user &&
      window.confirm('Tem certeza que deseja excluir este documento?')
    ) {
      try {
        await removeDocument(docId, user);
      } catch (error) {
        console.error('Erro ao excluir documento:', error);
      }
    }
  };

  const sortedDocuments = [...documents].sort(
    (a, b) =>
      new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-200">
          Documentos Anexados
        </h3>
        {canManage && isEditing && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm font-bold text-blue-300 transition-colors hover:bg-blue-600/40"
            >
              <IconUpload className="mr-2" size={16} /> Upload de Documento
            </button>
          </>
        )}
      </div>
      {sortedDocuments.length > 0 ? (
        <ul className="space-y-3">
          {sortedDocuments.map((doc) => {
            const uploader = users.find((u) => u.id === doc.uploadedById);
            return (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 rounded-md border border-slate-700 bg-slate-900/70 p-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <IconFile
                    size={24}
                    className="flex-shrink-0 text-slate-400"
                  />
                  <div className="overflow-hidden">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatBytes(doc.fileSize)} -{' '}
                      {new Date(doc.uploadDate).toLocaleDateString('pt-BR')} por{' '}
                      {uploader?.name || 'Desconhecido'}
                    </p>
                  </div>
                </div>
                {canManage && isEditing && (
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                    title="Excluir Documento"
                  >
                    <IconTrash size={18} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhum documento anexado para este paciente.
          </p>
          {canManage && isEditing && (
            <p className="mt-1 text-xs text-slate-500">
              Clique em "Upload de Documento" para começar.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN MODAL COMPONENT ---

type PatientErrors = {
  name?: string;
  email?: string;
  consent?: string;
};

type ActiveTab =
  | 'summary'
  | 'details'
  | 'assessments'
  | 'documents'
  | 'activities'
  | 'exercises'
  | 'sintomas'
  | 'financeiro';

const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  patient,
  tasks,
  appointments,
  prescribedExercises,
  exercises,
  exerciseLogs,
  assessments,
  transactions,
  documents,
}) => {
  const { user } = useAuth();
  const isNewPatient = !patient || !('id' in patient);

  const [editedPatient, setEditedPatient] = useState<
    Patient | Partial<Patient> | null
  >(patient);
  const [errors, setErrors] = useState<PatientErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [isEditing, setIsEditing] = useState(isNewPatient);

  const canManage =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;

  useEffect(() => {
    setEditedPatient(patient);
    setErrors({});
    setAiReport('');
    setActiveTab('summary');
    setIsEditing(isNewPatient);
  }, [patient, isNewPatient]);

  const validate = (): boolean => {
    const newErrors: PatientErrors = {};
    if (!editedPatient?.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!editedPatient?.email?.trim()) {
      newErrors.email = 'O email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(editedPatient.email)) {
      newErrors.email = 'O formato do email é inválido.';
    }
    if (isEditing && !editedPatient?.consent?.given) {
      newErrors.consent =
        'O consentimento do paciente é obrigatório para salvar.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedPatient((prev) => (prev ? { ...prev, [name]: value } : null));
    if (errors[name as keyof PatientErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setEditedPatient((prev) =>
      prev ? { ...prev, consent: { ...prev.consent, given: checked } } : null
    );
    if (errors.consent) {
      setErrors((prev) => ({ ...prev, consent: undefined }));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editedPatient && user) {
      setIsSaving(true);
      setTimeout(() => {
        onSave(editedPatient as Patient);
        setIsSaving(false);
        if (!isNewPatient) {
          setIsEditing(false);
        }
      }, 300);
    }
  };

  const handleDelete = () => {
    if (
      editedPatient &&
      'id' in editedPatient &&
      user &&
      window.confirm(
        `Tem certeza que deseja excluir o paciente "${editedPatient.name}"? Esta ação não pode ser desfeita.`
      )
    ) {
      onDelete(editedPatient.id!);
    }
  };

  const handleGenerateReport = async () => {
    if (!editedPatient || !('id' in editedPatient)) return;
    setIsGeneratingReport(true);
    setAiReport('');
    try {
      const report = await generatePatientReport(
        editedPatient as Patient,
        tasks
      );
      setAiReport(report);
    } catch (error) {
      console.error(error);
      setAiReport('Erro ao gerar o relatório.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const isFormInvalid = Object.values(errors).some(Boolean);

  if (!isOpen || !editedPatient) return null;

  const TabButton: React.FC<{
    tabId: ActiveTab;
    label: string;
    icon: React.ReactNode;
  }> = ({ tabId, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex items-center gap-2 rounded-t-md px-3 py-2 text-sm font-medium transition-colors ${activeTab === tabId ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}
    >
      {icon} {label}
    </button>
  );

  const patientId = 'id' in editedPatient ? editedPatient.id : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isNewPatient ? 'Novo Paciente' : 'Detalhes do Paciente'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <div className="flex-shrink-0 overflow-x-auto border-b border-slate-700 px-4 pt-2">
          <nav className="flex space-x-1">
            <TabButton
              tabId="summary"
              label="Resumo"
              icon={<IconUser size={16} />}
            />
            <TabButton
              tabId="details"
              label="Dados"
              icon={<IconUser size={16} />}
            />
            <TabButton
              tabId="assessments"
              label="Avaliações"
              icon={<IconClipboardCheck size={16} />}
            />
            <TabButton
              tabId="documents"
              label="Documentos"
              icon={<IconPaperclip size={16} />}
            />
            <TabButton
              tabId="activities"
              label="Atividades"
              icon={<IconClipboardList size={16} />}
            />
            <TabButton
              tabId="exercises"
              label="Exercícios"
              icon={<IconActivity size={16} />}
            />
            <TabButton
              tabId="sintomas"
              label="Diário de Sintomas"
              icon={<IconClipboardCheck size={16} />}
            />
            <TabButton
              tabId="financeiro"
              label="Financeiro"
              icon={<IconDollarSign size={16} />}
            />
          </nav>
        </div>

        <main className="flex-1 overflow-y-auto bg-slate-800 p-6">
          {activeTab === 'summary' && (
            <PatientSummaryTab
              patient={editedPatient}
              tasks={tasks}
              appointments={appointments}
              assessments={assessments}
            />
          )}
          {activeTab === 'details' && (
            <PatientDetailsTab
              isEditing={isEditing}
              editedPatient={editedPatient}
              errors={errors}
              handleChange={handleChange}
              handleConsentChange={handleConsentChange}
            />
          )}
          {activeTab === 'assessments' && patientId && user?.id && (
            <PatientAssessmentsTab
              assessments={assessments}
              canManage={canManage}
              isEditing={isEditing}
              patientId={patientId}
              therapistId={user.id}
            />
          )}
          {activeTab === 'documents' && patientId && (
            <PatientDocumentsTab
              documents={documents}
              patientId={patientId}
              isEditing={isEditing}
              canManage={canManage}
            />
          )}
          {activeTab === 'activities' && (
            <PatientActivitiesTab
              tasks={tasks}
              appointments={appointments}
              aiReport={aiReport}
              isGeneratingReport={isGeneratingReport}
              handleGenerateReport={handleGenerateReport}
            />
          )}
          {activeTab === 'exercises' && patientId && (
            <PatientExercisesTab
              prescribedExercises={prescribedExercises}
              exercises={exercises}
              exerciseLogs={exerciseLogs}
              canManage={canManage}
              isEditing={isEditing}
              patientId={patientId}
            />
          )}
          {activeTab === 'sintomas' && editedPatient && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-700 p-4">
                <h3 className="mb-4 text-lg font-semibold text-white">
                  📊 Diário de Sintomas e Evolução
                </h3>
                <p className="mb-4 text-sm text-slate-300">
                  Acompanhe a evolução dos sintomas, dor, energia, sono e humor
                  do paciente com registros detalhados e análises automáticas.
                </p>
                <SymptomDiaryIntegration patient={editedPatient as Patient} />
              </div>
            </div>
          )}
          {activeTab === 'financeiro' && (
            <PatientFinancialTab transactions={transactions} />
          )}
        </main>

        <footer className="flex flex-shrink-0 items-center justify-end border-t border-slate-700 bg-slate-900 p-4">
          {isEditing ? (
            <div className="flex w-full items-center justify-between">
              <div>
                {!isNewPatient && canManage && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Excluir Paciente"
                  >
                    <IconTrash className="mr-2" /> Excluir
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (isNewPatient) onClose();
                    else {
                      setIsEditing(false);
                      setEditedPatient(patient);
                      setErrors({});
                      setActiveTab('summary');
                    }
                  }}
                  className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || isFormInvalid}
                  className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
              >
                Fechar
              </button>
              {canManage && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setActiveTab('details');
                  }}
                  className="flex items-center rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <IconPencil className="mr-2" size={16} /> Editar
                </button>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PatientModal;
