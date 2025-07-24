import React from 'react';
import { Medication } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { IconPlus, IconFilePlus, IconPencil } from '../icons/IconComponents';

interface PatientMedicationsTabProps {
    patientId: string;
    medications: Medication[];
    onOpenModal: (medication: Partial<Medication> | null) => void;
}

export const PatientMedicationsTab: React.FC<PatientMedicationsTabProps> = ({
    patientId,
    medications,
    onOpenModal,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-200">Medicações Prescritas</h3>
                <Button onClick={() => onOpenModal({ patientId })} icon={<IconPlus />} size="sm">
                    Adicionar Medicação
                </Button>
            </div>
            {medications.length > 0 ? (
                <div className="space-y-3">
                    {medications.map(med => (
                        <div key={med.id} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-slate-100">{med.name}</p>
                                <p className="text-xs text-slate-400">
                                    {med.dosage} - {med.frequency}
                                </p>
                                <p className="text-xs text-slate-500">
                                    Início: {new Date(med.startDate).toLocaleDateString('pt-BR')}
                                    {med.endDate && ` | Fim: ${new Date(med.endDate).toLocaleDateString('pt-BR')}`}
                                </p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => onOpenModal(med)} icon={<IconPencil />} />
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState
                    icon={<IconFilePlus />}
                    title="Nenhuma Medicação"
                    message="Nenhuma medicação foi prescrita para este paciente."
                />
            )}
        </div>
    );
};