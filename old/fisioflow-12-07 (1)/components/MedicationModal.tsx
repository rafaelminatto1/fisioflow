import React, { useState, useEffect } from 'react';
import { MedicationModalProps, Medication } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import FormField from './ui/FormField';
import { IconPlus, IconTrash } from './icons/IconComponents';

type MedicationErrors = {
    name?: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
};

export const MedicationModal: React.FC<MedicationModalProps> = ({ isOpen, onClose, onSave, onDelete, medication, patientId }) => {
    const [editedMedication, setEditedMedication] = useState<Partial<Medication>>({ patientId, ...medication, reminderTimes: medication?.reminderTimes || [] });
    const [errors, setErrors] = useState<MedicationErrors>({});

    useEffect(() => {
        setEditedMedication({ patientId, ...medication, reminderTimes: medication?.reminderTimes || [] });
        setErrors({});
    }, [medication, patientId]);

    if (!isOpen || !editedMedication) return null;

    const validate = (): boolean => {
        const newErrors: MedicationErrors = {};
        if (!editedMedication.name?.trim()) newErrors.name = 'O nome é obrigatório.';
        if (!editedMedication.dosage?.trim()) newErrors.dosage = 'A dosagem é obrigatória.';
        if (!editedMedication.frequency?.trim()) newErrors.frequency = 'A frequência é obrigatória.';
        if (!editedMedication.startDate) newErrors.startDate = 'A data de início é obrigatória.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setEditedMedication(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };

    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...(editedMedication.reminderTimes || [])];
        newTimes[index] = value;
        setEditedMedication(prev => prev ? {...prev, reminderTimes: newTimes} : null);
    };

    const addTime = () => {
         setEditedMedication(prev => prev ? {...prev, reminderTimes: [...(prev.reminderTimes || []), '09:00']} : null);
    };

    const removeTime = (index: number) => {
        setEditedMedication(prev => prev ? {...prev, reminderTimes: (prev.reminderTimes || []).filter((_, i) => i !== index)} : null);
    };

    const handleSave = () => {
        if (validate()) {
            onSave(editedMedication as Medication);
        }
    };
    
    const handleDelete = () => {
        if (editedMedication.id && onDelete) {
            onDelete(editedMedication.id);
        }
    };

    const footer = (
        <>
            <div>
                {editedMedication.id && onDelete && <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />}>Remover</Button>}
            </div>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Medicação</Button>
            </div>
        </>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedMedication.id ? 'Editar Medicação' : 'Adicionar Medicação'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome da Medicação" name="name" id="name"
                    value={editedMedication.name || ''} onChange={handleChange}
                    error={errors.name} placeholder="Ex: Paracetamol"
                />
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Dosagem" name="dosage" id="dosage"
                        value={editedMedication.dosage || ''} onChange={handleChange}
                        error={errors.dosage} placeholder="Ex: 500mg"
                    />
                    <FormField
                        label="Frequência" name="frequency" id="frequency"
                        value={editedMedication.frequency || ''} onChange={handleChange}
                        error={errors.frequency} placeholder="Ex: A cada 8 horas"
                    />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        label="Data de Início" name="startDate" id="startDate" type="date"
                        value={editedMedication.startDate ? new Date(editedMedication.startDate).toISOString().split('T')[0] : ''} 
                        onChange={handleChange} error={errors.startDate}
                    />
                    <FormField
                        label="Data de Fim (Opcional)" name="endDate" id="endDate" type="date"
                        value={editedMedication.endDate ? new Date(editedMedication.endDate).toISOString().split('T')[0] : ''} 
                        onChange={handleChange}
                    />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Horários dos Lembretes</h4>
                     <div className="space-y-2">
                        {(editedMedication.reminderTimes || []).map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input type="time" value={time} onChange={e => handleTimeChange(index, e.target.value)} className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100" />
                                <button onClick={() => removeTime(index)} className="p-1 text-red-400"><IconTrash size={16}/></button>
                            </div>
                        ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={addTime} icon={<IconPlus/>} className="mt-2">Adicionar horário</Button>
                </div>
            </div>
        </BaseModal>
    );
};