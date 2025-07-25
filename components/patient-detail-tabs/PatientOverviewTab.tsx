import React from 'react';
import { Patient, Appointment, Assessment, Task } from '../../types';
import {
  IconCalendar,
  IconAlertTriangle,
  IconClipboardCheck,
  IconCrosshair,
  IconTrash,
} from '../icons/IconComponents';
import { Button } from '../ui/Button';

// A helper component for displaying stats
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
}> = ({ icon, label, value }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
    <div className="mb-1 flex items-center gap-2 text-slate-400">
      {icon}
      <span className="text-xs font-semibold uppercase">{label}</span>
    </div>
    <p className="truncate text-lg font-bold text-slate-100">{value}</p>
  </div>
);

// Define the error type specifically for this component
type PatientErrors = {
  name?: string;
  email?: string;
};

interface PatientOverviewTabProps {
  patient: Patient;
  isEditing: boolean;
  editedPatient: Patient;
  errors: PatientErrors;
  futureAppointments: Appointment[];
  overdueTasksCount: number;
  latestAssessment: Assessment | null;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  handleDelete: () => void;
}

export const PatientOverviewTab: React.FC<PatientOverviewTabProps> = ({
  patient,
  isEditing,
  editedPatient,
  errors,
  futureAppointments,
  overdueTasksCount,
  latestAssessment,
  handleChange,
  handleDelete,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <SummaryCard
        icon={<IconCalendar size={16} />}
        label="Próxima Sessão"
        value={
          futureAppointments.length > 0
            ? new Date(futureAppointments[0].start).toLocaleDateString('pt-BR')
            : 'Nenhuma'
        }
      />
      <SummaryCard
        icon={<IconAlertTriangle size={16} />}
        label="Tarefas Atrasadas"
        value={overdueTasksCount}
      />
      <SummaryCard
        icon={<IconClipboardCheck size={16} />}
        label="Última Avaliação"
        value={
          latestAssessment
            ? new Date(latestAssessment.date).toLocaleDateString('pt-BR')
            : 'Nenhuma'
        }
      />
      <SummaryCard
        icon={<IconCrosshair size={16} />}
        label="Status"
        value={patient.consent?.given ? 'Ativo' : 'Pendente'}
      />
    </div>

    <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-slate-300">
            Nome Completo
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={editedPatient.name || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className={`w-full border bg-slate-900 ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-400">{errors.name}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={editedPatient.email || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className={`w-full border bg-slate-900 ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-400">{errors.email}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-slate-300">
            Telefone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={editedPatient.phone || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800"
          />
        </div>
      </div>
      <div className="space-y-4 pt-4 md:pt-0">
        <div className="flex h-full flex-col space-y-2">
          <label
            htmlFor="medicalHistory"
            className="text-sm font-medium text-slate-300"
          >
            Histórico Clínico Resumido
          </label>
          <textarea
            id="medicalHistory"
            name="medicalHistory"
            value={editedPatient.medicalHistory || ''}
            onChange={handleChange}
            disabled={!isEditing}
            className="w-full flex-1 rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-800"
          />
        </div>
        {isEditing && (
          <Button variant="danger" onClick={handleDelete} icon={<IconTrash />}>
            Excluir Paciente
          </Button>
        )}
      </div>
    </div>
  </div>
);
