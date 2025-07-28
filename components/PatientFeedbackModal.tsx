import React, { useState } from 'react';

import { PatientFeedbackModalProps } from '../types';

import { IconX } from './icons/IconComponents';

const PatientFeedbackModal: React.FC<PatientFeedbackModalProps> = ({
  isOpen,
  onClose,
  task,
  onSaveFeedback,
}) => {
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !task) return null;

  const handleSave = () => {
    if (feedback.trim()) {
      setIsSaving(true);
      setTimeout(() => {
        onSaveFeedback(task.id, feedback);
        setIsSaving(false);
        setFeedback('');
      }, 300);
    }
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
            Registrar Feedback
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>
        <main className="space-y-4 p-6">
          <div>
            <p className="text-sm text-slate-400">Tarefa:</p>
            <p className="font-semibold text-slate-200">{task.title}</p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="feedback"
              className="text-sm font-medium text-slate-300"
            >
              Como você se sentiu ao realizar esta tarefa? (ex: dor,
              dificuldade, facilidade)
            </label>
            <textarea
              id="feedback"
              name="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Descreva seu progresso ou qualquer observação importante..."
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
            disabled={isSaving || !feedback.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
          >
            {isSaving ? 'Salvando...' : 'Salvar Feedback'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PatientFeedbackModal;
