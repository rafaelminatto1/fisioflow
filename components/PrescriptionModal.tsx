import React, { useState, useEffect } from 'react';

import { PrescriptionModalProps, Prescription } from '../types';

import { IconX, IconTrash } from './icons/IconComponents';

type PrescriptionErrors = {
  exerciseId?: string;
  sets?: string;
  reps?: string;
  frequency?: string;
};

const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  prescription,
  patientId,
  exercises,
}) => {
  const [editedPrescription, setEditedPrescription] =
    useState<Partial<Prescription> | null>(null);
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
    if (!editedPrescription?.exerciseId)
      newErrors.exerciseId = 'Selecione um exercício.';
    if (!editedPrescription?.sets || editedPrescription.sets <= 0)
      newErrors.sets = 'Valor inválido.';
    if (!editedPrescription?.reps || editedPrescription.reps <= 0)
      newErrors.reps = 'Valor inválido.';
    if (!editedPrescription?.frequency?.trim())
      newErrors.frequency = 'Frequência é obrigatória.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const isNumeric = ['sets', 'reps'].includes(name);

    setEditedPrescription((prev) =>
      prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null
    );
    if (errors[name as keyof PrescriptionErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
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
    if (
      editedPrescription &&
      'id' in editedPrescription &&
      window.confirm(`Tem certeza que deseja remover esta prescrição?`)
    ) {
      onDelete(editedPrescription.id!);
    }
  };

  const isNew = !prescription || !('id' in prescription);

  if (!isOpen || !editedPrescription) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isNew ? 'Prescrever Exercício' : 'Editar Prescrição'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <label
              htmlFor="exerciseId"
              className="text-sm font-medium text-slate-300"
            >
              Exercício
            </label>
            <select
              name="exerciseId"
              id="exerciseId"
              value={editedPrescription.exerciseId || ''}
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.exerciseId ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="" disabled>
                Selecione um exercício...
              </option>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
            {errors.exerciseId && (
              <p className="mt-1 text-xs text-red-400">{errors.exerciseId}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="sets"
                className="text-sm font-medium text-slate-300"
              >
                Séries
              </label>
              <input
                type="number"
                id="sets"
                name="sets"
                value={editedPrescription.sets || ''}
                onChange={handleChange}
                min="1"
                className={`w-full border bg-slate-900 ${errors.sets ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.sets && (
                <p className="mt-1 text-xs text-red-400">{errors.sets}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="reps"
                className="text-sm font-medium text-slate-300"
              >
                Repetições
              </label>
              <input
                type="number"
                id="reps"
                name="reps"
                value={editedPrescription.reps || ''}
                onChange={handleChange}
                min="1"
                className={`w-full border bg-slate-900 ${errors.reps ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.reps && (
                <p className="mt-1 text-xs text-red-400">{errors.reps}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="frequency"
                className="text-sm font-medium text-slate-300"
              >
                Frequência
              </label>
              <input
                type="text"
                id="frequency"
                name="frequency"
                value={editedPrescription.frequency || ''}
                onChange={handleChange}
                placeholder="Ex: 3x/semana"
                className={`w-full border bg-slate-900 ${errors.frequency ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.frequency && (
                <p className="mt-1 text-xs text-red-400">{errors.frequency}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className="text-sm font-medium text-slate-300"
            >
              Notas Adicionais
            </label>
            <textarea
              id="notes"
              name="notes"
              value={editedPrescription.notes || ''}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Qualquer observação para o paciente..."
            />
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <IconTrash className="mr-2" /> Remover
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isSaving ? 'Salvando...' : 'Salvar Prescrição'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PrescriptionModal;
