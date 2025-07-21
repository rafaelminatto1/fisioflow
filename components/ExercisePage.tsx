import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Exercise, UserRole } from '../types';
import {
  IconSearch,
  IconPlus,
  IconPencil,
  IconTrash,
} from './icons/IconComponents';
import ExerciseModal from './ExerciseModal';
import EditExerciseModal from './EditExerciseModal';
import PageShell from './ui/PageShell';
import PageLoader from './ui/PageLoader';
import Button from './ui/Button';

const ExerciseCard: React.FC<{
  exercise: Exercise;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canManage: boolean;
}> = ({ exercise, onSelect, onEdit, onDelete, canManage }) => (
  <div className="group flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-800 p-4 transition-all duration-200">
    <div onClick={onSelect} className="cursor-pointer">
      <h3 className="mb-2 truncate text-lg font-semibold text-slate-100 group-hover:text-blue-400">
        {exercise.name}
      </h3>
      <p className="line-clamp-3 h-[60px] text-sm text-slate-400">
        {exercise.description}
      </p>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between">
      <div className="flex gap-2">
        <span className="rounded-full bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-300">
          {exercise.category}
        </span>
        <span className="rounded-full bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-300">
          {exercise.bodyPart}
        </span>
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
            title="Editar Exercício"
          >
            <IconPencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
            title="Excluir Exercício"
          >
            <IconTrash size={16} />
          </button>
        </div>
      )}
    </div>
  </div>
);

const ExercisePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { exercises, saveExercise, deleteExercise } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bodyPartFilter, setBodyPartFilter] = useState('all');

  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<
    Exercise | Partial<Exercise> | null
  >(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const canManage =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(exercises.map((ex) => ex.category)))],
    [exercises]
  );
  const bodyParts = useMemo(
    () => ['all', ...Array.from(new Set(exercises.map((ex) => ex.bodyPart)))],
    [exercises]
  );

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch = ex.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' || ex.category === categoryFilter;
      const matchesBodyPart =
        bodyPartFilter === 'all' || ex.bodyPart === bodyPartFilter;
      return matchesSearch && matchesCategory && matchesBodyPart;
    });
  }, [exercises, searchTerm, categoryFilter, bodyPartFilter]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsViewerModalOpen(true);
  };

  const handleOpenEditModal = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsEditorModalOpen(true);
  };

  const handleOpenNewModal = () => {
    setSelectedExercise({
      name: '',
      description: '',
      category: 'Fortalecimento',
      bodyPart: 'Geral',
      videoUrl: '',
    });
    setIsEditorModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsViewerModalOpen(false);
    setIsEditorModalOpen(false);
    setSelectedExercise(null);
  };

  const handleSave = (exerciseToSave: Exercise) => {
    if (!user) return;
    saveExercise(exerciseToSave, user);
    handleCloseModals();
  };

  const handleDelete = (exerciseId: string) => {
    if (!user) return;
    deleteExercise(exerciseId, user);
    handleCloseModals();
  };

  if (isLoading) {
    return <PageLoader message="Carregando biblioteca de exercícios..." />;
  }

  return (
    <PageShell
      title="Biblioteca de Exercícios"
      action={
        canManage && (
          <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
            Novo Exercício
          </Button>
        )
      }
    >
      <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
        <div className="relative w-full flex-grow md:w-auto">
          <IconSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 py-2 pl-10 pr-4 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 md:w-auto"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'Todas as Categorias' : cat}
            </option>
          ))}
        </select>
        <select
          value={bodyPartFilter}
          onChange={(e) => setBodyPartFilter(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500 md:w-auto"
        >
          {bodyParts.map((part) => (
            <option key={part} value={part}>
              {part === 'all' ? 'Todas as Partes' : part}
            </option>
          ))}
        </select>
      </div>

      <div className="-mr-2 flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredExercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onSelect={() => handleSelectExercise(exercise)}
              onEdit={() => handleOpenEditModal(exercise)}
              onDelete={() => handleDelete(exercise.id)}
              canManage={canManage}
            />
          ))}
        </div>
        {filteredExercises.length === 0 && (
          <div className="rounded-lg bg-slate-800/50 py-16 text-center text-slate-400">
            <p className="font-semibold">Nenhum exercício encontrado</p>
            <p className="text-sm">Tente ajustar seus filtros de busca.</p>
          </div>
        )}
      </div>

      {isViewerModalOpen && selectedExercise && 'id' in selectedExercise && (
        <ExerciseModal
          isOpen={isViewerModalOpen}
          onClose={handleCloseModals}
          exercise={selectedExercise as Exercise}
        />
      )}
      {isEditorModalOpen && (
        <EditExerciseModal
          isOpen={isEditorModalOpen}
          onClose={handleCloseModals}
          onSave={handleSave}
          onDelete={handleDelete}
          exercise={selectedExercise}
        />
      )}
    </PageShell>
  );
};

export default ExercisePage;
