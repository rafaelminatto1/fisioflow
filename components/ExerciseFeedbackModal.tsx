import React, { useState } from 'react';
import { ExerciseFeedbackModalProps, ExerciseLog } from '../types';
import { IconX } from './icons/IconComponents';

const Slider: React.FC<{
  label: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minLabel: string;
  maxLabel: string;
}> = ({ label, value, onChange, minLabel, maxLabel }) => {
  const getSliderColor = (value: number) => {
    const percentage = value * 10;
    let colorFrom = '#3b82f6';
    const colorTo = '#ef4444';

    // Green to Yellow to Red for Pain
    if (label.toLowerCase().includes('dor')) {
      if (percentage <= 50) {
        const r = Math.round(74 + (239 - 74) * (percentage / 50)); // 4a -> ef
        const g = Math.round(222 - (239 - 222) * (percentage / 50)); // de -> af
        const b = Math.round(129 - (129 - 80) * (percentage / 50)); // 81 -> 50
        colorFrom = `rgb(${r},${g},${b})`;
      } else {
        const r = 239;
        const g = Math.round(239 - (239 - 68) * ((percentage - 50) / 50));
        const b = Math.round(80 - (80 - 68) * ((percentage - 50) / 50));
        colorFrom = `rgb(${r},${g},${b})`;
      }
      return `linear-gradient(90deg, ${colorFrom} ${percentage}%, #475569 ${percentage}%)`;
    }

    return `linear-gradient(90deg, #3b82f6 ${percentage}%, #475569 ${percentage}%)`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <span className="rounded bg-slate-700 px-2 py-0.5 text-sm font-bold text-slate-100">
          {value}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={onChange}
        className="range-thumb:bg-white h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700"
        style={{ background: getSliderColor(value) }}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
};

const ExerciseFeedbackModal: React.FC<ExerciseFeedbackModalProps> = ({
  isOpen,
  onClose,
  onSave,
  prescription,
  exercise,
}) => {
  const [painLevel, setPainLevel] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaving(true);
    const newLog: Omit<ExerciseLog, 'id' | 'tenantId'> = {
      prescriptionId: prescription.id,
      patientId: prescription.patientId,
      date: new Date().toISOString(),
      painLevel,
      difficultyLevel,
      notes,
    };
    // Simulate async operation
    setTimeout(() => {
      onSave(newLog);
      setIsSaving(false);
      onClose(); // Close modal on save
    }, 300);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex w-full max-w-lg flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Registrar Progresso
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>
        <main className="space-y-6 p-6">
          <div>
            <p className="text-sm text-slate-400">Exercício:</p>
            <p className="text-lg font-semibold text-slate-200">
              {exercise.name}
            </p>
          </div>
          <Slider
            label="Nível de Dor"
            value={painLevel}
            onChange={(e) => setPainLevel(Number(e.target.value))}
            minLabel="Sem Dor"
            maxLabel="Dor Máxima"
          />
          <Slider
            label="Nível de Dificuldade"
            value={difficultyLevel}
            onChange={(e) => setDifficultyLevel(Number(e.target.value))}
            minLabel="Muito Fácil"
            maxLabel="Muito Difícil"
          />
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Senti um estalo no ombro, consegui completar todas as séries, etc."
            />
          </div>
        </main>
        <footer className="flex items-center justify-end space-x-3 border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {isSaving ? 'Salvando...' : 'Salvar Progresso'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ExerciseFeedbackModal;
