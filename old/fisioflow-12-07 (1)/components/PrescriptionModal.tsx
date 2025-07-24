
import React, { useState, useEffect } from 'react';
import { PrescriptionModalProps, Prescription } from '/types.js';
import { IconTrash } from '/components/icons/IconComponents.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import FormField from '/components/ui/FormField.js';

type PrescriptionErrors = {
  exerciseId?: string;
  sets?: string;
  reps?: string;
  frequency?: string;
};

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({ isOpen, onClose, onSave, onDelete, prescription, patientId, exercises }) => {
  const [editedPrescription, setEditedPrescription] = useState<Partial<Prescription> | null>(null);
  const [errors, setErrors] = useState<PrescriptionErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (prescription) {
        setEditedPrescription({ ...prescription, patientId });
    }
    setErrors({});
  }, [prescription, patientId]);
  
  const validate = (): boolean => {
    const newErrors: PrescriptionErrors = {};
    if (!editedPrescription?.exerciseId) newErrors.exerciseId = 'Selecione um exercício.';
    if (!editedPrescription?.sets || editedPrescription.sets <= 0) newErrors.sets = 'Valor inválido.';
    if (!editedPrescription?.reps || editedPrescription.reps <= 0) newErrors.reps = 'Valor inválido.';
    if (!editedPrescription?.frequency?.trim()) newErrors.frequency = 'Frequência é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['sets', 'reps'].includes(name);

    setEditedPrescription(prev => prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null);
    if (errors[name as keyof PrescriptionErrors]) {
        setErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editedPrescription) {
        setIsSaving(true);
        setTimeout(() => {
            onSave(editedPrescription as Prescription);
            setIsSaving(false);
        }, 300);
    }
  };

  const handleDelete = () => {
    if (editedPrescription && 'id' in editedPrescription && window.confirm(`Tem certeza que deseja remover esta prescrição?`)) {
      onDelete(editedPrescription.id!);
    }
  };

  const isNew = !prescription || !('id' in prescription);

  if (!isOpen || !editedPrescription) return null;

  const footer = (
       <>
          <div>
            {!isNew && (
                <Button variant="ghost" onClick={handleDelete} icon={<IconTrash/>}>
                    Remover
                </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar Prescrição'}
            </Button>
          </div>
        </>
  );

  return (
    <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={isNew ? 'Prescrever Exercício' : 'Editar Prescrição'}
        footer={footer}
    >
        <div className="space-y-4">
            <FormField
                as="select"
                label="Exercício"
                name="exerciseId"
                id="exerciseId"
                value={editedPrescription.exerciseId || ''}
                onChange={handleChange}
                error={errors.exerciseId}
            >
                <option value="" disabled>Selecione um exercício...</option>
                {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
            </FormField>

            <div className="grid grid-cols-3 gap-4">
                <FormField
                    label="Séries"
                    name="sets"
                    id="sets"
                    type="number"
                    value={String(editedPrescription.sets || '')}
                    onChange={handleChange}
                    min="1"
                    error={errors.sets}
                />
                <FormField
                    label="Repetições"
                    name="reps"
                    id="reps"
                    type="number"
                    value={String(editedPrescription.reps || '')}
                    onChange={handleChange}
                    min="1"
                    error={errors.reps}
                />
                <FormField
                    label="Frequência"
                    name="frequency"
                    id="frequency"
                    value={editedPrescription.frequency || ''}
                    onChange={handleChange}
                    placeholder="Ex: 3x/semana"
                    error={errors.frequency}
                />
            </div>
            <FormField
                as="textarea"
                label="Notas Adicionais"
                name="notes"
                id="notes"
                value={editedPrescription.notes || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Qualquer observação para o paciente..."
            />
        </div>
    </BaseModal>
  );
};

export default PrescriptionModal;