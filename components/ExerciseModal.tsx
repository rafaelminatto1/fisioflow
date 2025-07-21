import React from 'react';
import { ExerciseModalProps } from '../types';
import { IconX } from './icons/IconComponents';

const ExerciseModal: React.FC<ExerciseModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  if (!isOpen || !exercise) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-xl font-semibold text-slate-100">
            {exercise.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="space-y-4 overflow-y-auto p-6">
          <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            <iframe
              className="h-full w-full"
              src={exercise.videoUrl}
              title={exercise.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>

          <div className="space-y-1">
            <h3 className="font-semibold text-slate-200">Descrição</h3>
            <p className="whitespace-pre-wrap text-slate-300">
              {exercise.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-900/50 px-3 py-1 text-sm font-medium text-blue-300">
              {exercise.category}
            </span>
            <span className="rounded-full bg-emerald-900/50 px-3 py-1 text-sm font-medium text-emerald-300">
              {exercise.bodyPart}
            </span>
          </div>
        </main>

        <footer className="flex flex-shrink-0 items-center justify-end border-t border-slate-700 bg-slate-800 p-4">
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

export default ExerciseModal;
