import React from 'react';
import { ExerciseHistoryModalProps } from '../types';
import { IconX } from './icons/IconComponents';

const ExerciseHistoryModal: React.FC<ExerciseHistoryModalProps> = ({
  isOpen,
  onClose,
  exercise,
  logs,
}) => {
  if (!isOpen) return null;

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Histórico de Progresso
            </h2>
            <p className="text-sm text-slate-400">{exercise.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {sortedLogs.length > 0 ? (
            <ul className="space-y-4">
              {sortedLogs.map((log) => (
                <li
                  key={log.id}
                  className="rounded-md border border-slate-700 bg-slate-900/70 p-4"
                >
                  <p className="mb-2 font-semibold text-slate-200">
                    {new Date(log.date).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  <div className="mb-2 grid grid-cols-2 gap-4">
                    <div className="text-sm">
                      <span className="text-slate-400">Dor: </span>
                      <span className="font-bold text-slate-100">
                        {log.painLevel}/10
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-400">Dificuldade: </span>
                      <span className="font-bold text-slate-100">
                        {log.difficultyLevel}/10
                      </span>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="whitespace-pre-wrap rounded-md bg-slate-800 p-2 text-sm text-slate-300">
                      "{log.notes}"
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center">
              <p className="text-slate-400">
                Nenhum registro de progresso encontrado para este exercício.
              </p>
            </div>
          )}
        </main>
        <footer className="flex items-center justify-end border-t border-slate-700 bg-slate-800 p-4">
          <button
            onClick={onClose}
            className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ExerciseHistoryModal;
