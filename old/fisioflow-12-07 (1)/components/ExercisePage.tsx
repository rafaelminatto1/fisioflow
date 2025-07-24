import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Exercise, UserRole } from '../types.js';
import { IconSearch, IconPlus, IconPencil, IconTrash, IconActivity, IconStar, IconClock, IconTag } from './icons/IconComponents.js';
import ExerciseModal from './ExerciseModal.js';
import { EditExerciseModal } from './EditExerciseModal.js';
import { useExercises } from '../hooks/useExercises.js';
import { useNotification } from '../hooks/useNotification.js';
import Skeleton from './ui/Skeleton.js';
import EmptyState from './ui/EmptyState.js';
import { useUsers } from '../hooks/useUsers.js';

const ExerciseCard: React.FC<{ 
    exercise: Exercise; 
    onSelect: () => void; 
    onEdit: () => void; 
    onDelete: () => void; 
    canManage: boolean;
    isFavorite: boolean;
    onToggleFavorite: (e: React.MouseEvent) => void;
}> = ({ exercise, onSelect, onEdit, onDelete, canManage, isFavorite, onToggleFavorite }) => (
    <div
        className="interactive-card bg-slate-800/80 p-4 flex flex-col justify-between group"
        onClick={onSelect}
    >
        <div className="cursor-pointer">
            <div className="flex justify-between items-start">
                <h3 className="font-semibold text-slate-100 text-lg mb-2 group-hover:text-blue-400 pr-8">{exercise.name}</h3>
                {canManage && (
                     <button onClick={onToggleFavorite} className="p-1 text-slate-500 hover:text-yellow-400 z-10" title="Favoritar exercício">
                        <IconStar size={18} className={`transition-colors ${isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
                    </button>
                )}
            </div>
            <p className="text-sm text-slate-400 line-clamp-3 h-[60px]">{exercise.description}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between">
            <div className="flex gap-2 items-center">
                <span className="text-xs font-medium bg-blue-900/50 text-blue-300 px-2 py-1 rounded-full">{exercise.category}</span>
                <span className="text-xs font-medium bg-emerald-900/50 text-emerald-300 px-2 py-1 rounded-full">{exercise.bodyPart}</span>
                 {exercise.duration && (
                    <div className="flex items-center gap-1 text-xs text-slate-400" title="Duração do vídeo">
                        <IconClock size={14}/>
                        <span>{exercise.duration}s</span>
                    </div>
                )}
            </div>
            {canManage && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-400 hover:text-amber-400 rounded-md hover:bg-slate-700" title="Editar Exercício"><IconPencil size={16}/></button>
                     <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" title="Excluir Exercício"><IconTrash size={16}/></button>
                </div>
            )}
        </div>
    </div>
);


const ExercisePage: React.FC = () => {
    const { user } = useAuth();
    const { exercises = [], saveExercise, deleteExercise, isLoading, isError } = useExercises();
    const { addNotification } = useNotification();
    const { toggleFavoriteExercise } = useUsers();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [bodyPartFilter, setBodyPartFilter] = useState('all');
    const [tagFilter, setTagFilter] = useState('');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
    
    const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | Partial<Exercise> | null>(null);

    const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;

    const categories: string[] = useMemo(() => ['all', ...Array.from(new Set<string>((exercises || []).map(ex => ex.category)))], [exercises]);
    const bodyParts: string[] = useMemo(() => ['all', ...Array.from(new Set<string>((exercises || []).map(ex => ex.bodyPart)))], [exercises]);

    const filteredExercises = useMemo(() => {
        const userFavorites = user?.favoriteExerciseIds || [];
        return exercises.filter(ex => {
            if (showFavoritesOnly && !userFavorites.includes(ex.id)) {
                return false;
            }
            const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = categoryFilter === 'all' || ex.category === categoryFilter;
            const matchesBodyPart = bodyPartFilter === 'all' || ex.bodyPart === bodyPartFilter;
            const matchesTags = !tagFilter.trim() || (ex.tags && ex.tags.some(tag => tag.toLowerCase().includes(tagFilter.trim().toLowerCase())));
            return matchesSearch && matchesCategory && matchesBodyPart && matchesTags;
        });
    }, [exercises, searchTerm, categoryFilter, bodyPartFilter, showFavoritesOnly, tagFilter, user?.favoriteExerciseIds]);

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
            tags: [],
            progressions: [],
        });
        setIsEditorModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsViewerModalOpen(false);
        setIsEditorModalOpen(false);
        setSelectedExercise(null);
    };

    const handleSave = async (exerciseToSave: Exercise) => {
        try {
            await saveExercise(exerciseToSave);
            handleCloseModals();
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
        }
    };

    const handleDelete = async (exerciseId: string) => {
        try {
            await deleteExercise(exerciseId);
            handleCloseModals();
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: (error as Error).message });
        }
    };
    
    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-14 w-full rounded" />
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-1/3 rounded-full" />
                                <Skeleton className="h-6 w-1/3 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (isError) {
            return (
                <EmptyState
                    icon={<IconActivity />}
                    title="Erro ao Carregar Exercícios"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            );
        }

        if (filteredExercises.length === 0) {
            return (
                <div className="text-center py-16 text-slate-400 bg-slate-800/50 rounded-lg">
                    <p className="font-semibold">Nenhum exercício encontrado</p>
                    <p className="text-sm">Tente ajustar seus filtros de busca.</p>
                </div>
            );
        }

        return (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredExercises.map(exercise => {
                    const isFavorite = user?.favoriteExerciseIds?.includes(exercise.id) ?? false;
                    const handleToggleFavorite = async (e: React.MouseEvent) => {
                        e.stopPropagation();
                        if (!user) return;
                        try {
                            await toggleFavoriteExercise({ userId: user.id, exerciseId: exercise.id });
                        } catch(err) {
                            addNotification({type:'error', title: 'Erro', message: (err as Error).message});
                        }
                    };
                    return (
                        <ExerciseCard
                            key={exercise.id}
                            exercise={exercise}
                            onSelect={() => handleSelectExercise(exercise)}
                            onEdit={() => handleOpenEditModal(exercise)}
                            onDelete={() => handleDelete(exercise.id)}
                            canManage={canManage}
                            isFavorite={isFavorite}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    )
                })}
            </div>
        )
    }


    return (
        <div className="h-full flex flex-col">
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Biblioteca de Exercícios</h1>
                {canManage && (
                    <button onClick={handleOpenNewModal} className="w-full md:w-auto flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        <IconPlus className="mr-2" />
                        Novo Exercício
                    </button>
                )}
            </header>
            
            <div className="flex flex-col lg:flex-row items-center gap-2 mb-6">
                <div className="relative w-full lg:w-1/4 flex-grow">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar exercício..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="w-full lg:w-auto bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                    {categories.map(cat => <option key={cat} value={cat}>{cat === 'all' ? 'Todas as Categorias' : cat}</option>)}
                </select>
                <select
                    value={bodyPartFilter}
                    onChange={e => setBodyPartFilter(e.target.value)}
                    className="w-full lg:w-auto bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                >
                    {bodyParts.map(part => <option key={part} value={part}>{part === 'all' ? 'Todas as Partes' : part}</option>)}
                </select>
                <div className="relative w-full lg:w-1/4">
                    <IconTag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Filtrar por tag..."
                        value={tagFilter}
                        onChange={e => setTagFilter(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
                {canManage && (
                    <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showFavoritesOnly}
                            onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                            className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-600"
                        />
                        Apenas Favoritos
                    </label>
                )}
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
                {renderContent()}
            </div>
            
            {isViewerModalOpen && selectedExercise && 'id' in selectedExercise &&
                <ExerciseModal
                    isOpen={isViewerModalOpen}
                    onClose={handleCloseModals}
                    exercise={selectedExercise as Exercise}
                />
            }
            {isEditorModalOpen && 
                <EditExerciseModal
                    isOpen={isEditorModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    exercise={selectedExercise}
                />
            }
        </div>
    );
};

export default ExercisePage;
