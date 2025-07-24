
import React from 'react';
import {
    Patient,
    ClinicalProtocol,
    PatientPermissionSet,
    Appointment,
    Assessment,
    TherapistGoal
} from '../../types';
import { IconCalendar, IconAlertTriangle, IconClipboardCheck, IconCrosshair, IconTrash } from '../icons/IconComponents';
import Button from '../ui/Button';

// A helper component for displaying stats
const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; }> = ({ icon, label, value }) => (
    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400 mb-1">
            {icon}
            <span className="text-xs font-semibold uppercase">{label}</span>
        </div>
        <p className="text-lg font-bold text-slate-100 truncate">{value}</p>
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
    therapistGoals: TherapistGoal[];
    matchingProtocol: ClinicalProtocol | null;
    currentProtocol: ClinicalProtocol | null;
    currentProtocolPhase: { phase: any, daysRemaining: number, progress: number } | null;
    permissions: PatientPermissionSet;
    handleApplyProtocol: (protocol: ClinicalProtocol) => void;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleDelete: () => void;
}

export const PatientOverviewTab: React.FC<PatientOverviewTabProps> = ({
    patient, isEditing, editedPatient, errors,
    futureAppointments, overdueTasksCount, latestAssessment, therapistGoals,
    matchingProtocol, currentProtocol, currentProtocolPhase,
    permissions, handleApplyProtocol, handleChange, handleDelete
}) => (
    <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
                icon={<IconCalendar size={16}/>}
                label="Próxima Sessão"
                value={futureAppointments.length > 0 ? new Date(futureAppointments[0].start).toLocaleDateString('pt-BR') : 'Nenhuma'}
            />
            <SummaryCard
                icon={<IconAlertTriangle size={16}/>}
                label="Tarefas Atrasadas"
                value={overdueTasksCount}
            />
            <SummaryCard
                icon={<IconClipboardCheck size={16}/>}
                label="Última Avaliação"
                value={latestAssessment ? new Date(latestAssessment.date).toLocaleDateString('pt-BR') : 'Nenhuma'}
            />
            <SummaryCard
                icon={<IconCrosshair size={16}/>}
                label="Metas Clínicas"
                value={`${therapistGoals.filter(g => g.targetValue > 0 && (g.currentValue / g.targetValue) >= 1).length} / ${therapistGoals.length}`}
            />
        </div>
        {matchingProtocol && (
            <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg flex items-center justify-between">
                <div>
                    <p className="text-sm text-blue-300 font-semibold">Protocolo Sugerido</p>
                    <p className="text-lg font-bold text-white">{matchingProtocol.name}</p>
                </div>
                <Button onClick={() => handleApplyProtocol(matchingProtocol)}>Aplicar Protocolo</Button>
            </div>
        )}
        {currentProtocol && (
            <div className="bg-emerald-900/30 border border-emerald-500/50 p-4 rounded-lg">
                <p className="text-sm text-emerald-300 font-semibold">Protocolo Ativo</p>
                <p className="text-lg font-bold text-white">{currentProtocol.name}</p>
                {currentProtocolPhase && (
                        <div className="mt-2">
                        <p className="text-sm font-semibold text-emerald-200">{currentProtocolPhase.phase.name}</p>
                        <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                            <div className="bg-emerald-400 h-1.5 rounded-full" style={{width: `${currentProtocolPhase.progress}%`}}></div>
                        </div>
                        <p className="text-xs text-emerald-300 mt-1">Próxima fase em {currentProtocolPhase.daysRemaining} dias.</p>
                        </div>
                )}
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <div className="space-y-4">
                <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome Completo</label>
                <input type="text" id="name" name="name" value={editedPatient.name || ''} onChange={handleChange} disabled={!isEditing} className={`w-full bg-slate-900 border ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-slate-800 disabled:cursor-not-allowed`} />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
                </div>
            <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-300">Email</label>
                <input type="email" id="email" name="email" value={editedPatient.email || ''} onChange={handleChange} disabled={!isEditing} className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-slate-800 disabled:cursor-not-allowed`} />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
            </div>
            <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-slate-300">Telefone</label>
                <input type="tel" id="phone" name="phone" value={editedPatient.phone || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition disabled:bg-slate-800 disabled:cursor-not-allowed" />
            </div>
            </div>
            <div className="space-y-4 pt-4 md:pt-0">
                <div className="space-y-2 h-full flex flex-col">
                <label htmlFor="medicalHistory" className="text-sm font-medium text-slate-300">Histórico Clínico Resumido</label>
                <textarea id="medicalHistory" name="medicalHistory" value={editedPatient.medicalHistory || ''} onChange={handleChange} disabled={!isEditing} className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition flex-1 disabled:bg-slate-800 disabled:cursor-not-allowed" />
            </div>
                {isEditing && permissions.delete && <Button variant="danger" onClick={handleDelete} icon={<IconTrash/>}>Excluir Paciente</Button>}
            </div>
        </div>
    </div>
);
