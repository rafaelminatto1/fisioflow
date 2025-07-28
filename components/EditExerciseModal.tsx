import React, { useState, useEffect } from 'react';

import { EditExerciseModalProps, Exercise } from '../types';

import { IconX, IconTrash } from './icons/IconComponents';

type ExerciseErrors = {
  name?: string;
  description?: string;
  category?: string;
  bodyPart?: string;
  videoUrl?: string;
};

const EditExerciseModal: React.FC<EditExerciseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  exercise,
}) => {
  const [editedExercise, setEditedExercise] = useState<
    Exercise | Partial<Exercise> | null
  >(exercise);
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedExercise(exercise);
    setErrors({});
  }, [exercise]);

  const validate = (): boolean => {
    const newErrors: ExerciseErrors = {};
    if (!editedExercise?.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!editedExercise?.description?.trim())
      newErrors.description = 'A descrição é obrigatória.';
    if (!editedExercise?.videoUrl?.trim()) {
      newErrors.videoUrl = 'A URL do vídeo é obrigatória.';
    } else {
      try {
        new URL(editedExercise.videoUrl);
      } catch (_) {
        newErrors.videoUrl = 'URL do vídeo inválida.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditedExercise((prev) => (prev ? { ...prev, [name]: value } : null));
    if (errors[name as keyof ExerciseErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editedExercise) {
      setIsSaving(true);
      setTimeout(() => {
        onSave(editedExercise as Exercise);
        setIsSaving(false);
      }, 300);
    }
  };

  const handleDelete = () => {
    if (
      editedExercise &&
      'id' in editedExercise &&
      window.confirm(
        `Tem certeza que deseja excluir o exercício "${editedExercise.name}"? Esta ação removerá todas as prescrições e logs associados.`
      )
    ) {
      onDelete(editedExercise.id!);
    }
  };

  const isNew = !exercise || !('id' in exercise);
  const isFormInvalid = Object.values(errors).some(Boolean);

  if (!isOpen || !editedExercise) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isNew ? 'Novo Exercício' : 'Editar Exercício'}
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
              htmlFor="name"
              className="text-sm font-medium text-slate-300"
            >
              Nome do Exercício
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={editedExercise.name || ''}
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.name ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-slate-300"
            >
              Descrição
            </label>
            <textarea
              id="description"
              name="description"
              value={editedExercise.description || ''}
              onChange={handleChange}
              rows={4}
              className={`w-full border bg-slate-900 ${errors.description ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="category"
                className="text-sm font-medium text-slate-300"
              >
                Categoria
              </label>
              <select
                name="category"
                id="category"
                value={editedExercise.category}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Fortalecimento">Fortalecimento</option>
                <option value="Mobilidade">Mobilidade</option>
                <option value="Cardio">Cardio</option>
                <option value="Equilíbrio">Equilíbrio</option>
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="bodyPart"
                className="text-sm font-medium text-slate-300"
              >
                Parte do Corpo
              </label>
              <select
                name="bodyPart"
                id="bodyPart"
                value={editedExercise.bodyPart}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ombro">Ombro</option>
                <option value="Joelho">Joelho</option>
                <option value="Coluna">Coluna</option>
                <option value="Quadril">Quadril</option>
                <option value="Tornozelo">Tornozelo</option>
                <option value="Geral">Geral</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="videoUrl"
              className="text-sm font-medium text-slate-300"
            >
              URL do Vídeo (Embed)
            </label>
            <input
              type="text"
              id="videoUrl"
              name="videoUrl"
              value={editedExercise.videoUrl || ''}
              onChange={handleChange}
              placeholder="https://www.youtube.com/embed/..."
              className={`w-full border bg-slate-900 ${errors.videoUrl ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.videoUrl && (
              <p className="mt-1 text-xs text-red-400">{errors.videoUrl}</p>
            )}
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <IconTrash className="mr-2" /> Excluir
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
              disabled={isSaving || isFormInvalid}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isSaving ? 'Salvando...' : 'Salvar Exercício'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default EditExerciseModal;
