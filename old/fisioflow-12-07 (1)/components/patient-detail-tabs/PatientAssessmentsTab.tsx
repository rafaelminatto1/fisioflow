
import React from 'react';
import { Assessment } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { IconPlus, IconClipboardCheck, IconBody } from '../icons/IconComponents';

interface PatientAssessmentsTabProps {
    assessments: Assessment[];
    onOpenNewModal: () => void;
    onOpenViewModal: (assessment: Assessment) => void;
}

export const PatientAssessmentsTab: React.FC<PatientAssessmentsTabProps> = ({
    assessments,
    onOpenNewModal,
    onOpenViewModal,
}) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-200">Histórico de Avaliações</h3>
            <Button onClick={onOpenNewModal} icon={<IconPlus />} size="sm">Nova Avaliação</Button>
        </div>
        {assessments.length > 0 ? (
            <ul className="space-y-2">
                {assessments.map(ass => (
                    <li key={ass.id}>
                        <button onClick={() => onOpenViewModal(ass)} className="w-full text-left p-3 rounded-md bg-slate-900/50 hover:bg-slate-700/50 transition-colors">
                             <p className="font-semibold text-slate-200 flex items-center gap-2">
                                Avaliação de {new Date(ass.date).toLocaleDateString('pt-BR', {day: '2-digit', month:'long', year:'numeric'})}
                                {ass.bodyChartData && ass.bodyChartData.length > 0 && <IconBody size={14} className="text-blue-400" title="Contém mapa corporal"/>}
                            </p>
                            <p className="text-xs text-slate-400 truncate">Hipótese: {ass.diagnosticHypothesis}</p>
                        </button>
                    </li>
                ))}
            </ul>
        ) : <EmptyState icon={<IconClipboardCheck/>} title="Nenhuma Avaliação" message="Nenhuma avaliação foi registrada para este paciente." />}
    </div>
);