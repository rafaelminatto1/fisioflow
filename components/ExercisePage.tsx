import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { Exercise, UserRole } from '../types';

import {
  IconSearch,
  IconPlus,
  IconPencil,
  IconTrash,
} from './icons/IconComponents';
import { Button } from './ui/Button';
import PageLoader from './ui/PageLoader';
import PageShell from './ui/PageShell';

// Lazy load modais para reduzir bundle inicial
const ExerciseModal = lazy(() => import('./ExerciseModal'));
const EditExerciseModal = lazy(() => import('./EditExerciseModal'));
const ExerciseRatingModal = lazy(
  () => import('./exercises/ExerciseRatingModal')
);
const ExerciseStatsModal = lazy(() => import('./exercises/ExerciseStatsModal'));
const VideoUploadModal = lazy(() => import('./exercises/VideoUploadModal'));
const ImageUploadModal = lazy(() => import('./exercises/ImageUploadModal'));
const VideoPlayerModal = lazy(() => import('./exercises/VideoPlayerModal'));
const ImageGalleryModal = lazy(() => import('./exercises/ImageGalleryModal'));
const QRGeneratorModal = lazy(() => import('./qr/QRGeneratorModal'));
const QRAnalyticsModal = lazy(() => import('./qr/QRAnalyticsModal'));
const ExercisePDFModal = lazy(() => import('./exercises/ExercisePDFModal'));
const CacheManagementModal = lazy(
  () => import('./exercises/CacheManagementModal')
);
const ImageSearchModal = lazy(() => import('./exercises/ImageSearchModal'));

const ExerciseCard: React.FC<{
  exercise: Exercise;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onRate: () => void;
  onViewStats: () => void;
  onUploadVideo: () => void;
  onUploadImage: () => void;
  onViewVideos: () => void;
  onViewImages: () => void;
  onGenerateQR: () => void;
  onGeneratePDF: () => void;
  canManage: boolean;
  isPatient: boolean;
  isTherapist: boolean;
  isFavorited: boolean;
  videoCount: number;
  imageCount: number;
}> = ({
  exercise,
  onSelect,
  onEdit,
  onDelete,
  onFavorite,
  onRate,
  onViewStats,
  onUploadVideo,
  onUploadImage,
  onViewVideos,
  onViewImages,
  onGenerateQR,
  onGeneratePDF,
  canManage,
  isPatient,
  isTherapist,
  isFavorited,
  videoCount,
  imageCount,
}) => (
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
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Video and Image buttons - visible to all users */}
        {videoCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewVideos();
            }}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
            title={`Ver Vídeos (${videoCount})`}
          >
            🎥
          </button>
        )}

        {imageCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewImages();
            }}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-green-400"
            title={`Ver Imagens (${imageCount})`}
          >
            📷
          </button>
        )}

        {/* Upload buttons for therapists */}
        {isTherapist && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadVideo();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
              title="Adicionar Vídeo"
            >
              📹
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUploadImage();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-green-400"
              title="Adicionar Imagem"
            >
              📸
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateQR();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-purple-400"
              title="Gerar QR Code"
            >
              📱
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGeneratePDF();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
              title="Gerar PDF"
            >
              📄
            </button>
          </>
        )}

        {/* Favorite button for therapists */}
        {(canManage || isTherapist) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavorite();
            }}
            className={`rounded-md p-2 transition-colors ${
              isFavorited
                ? 'text-yellow-400 hover:bg-slate-700 hover:text-yellow-300'
                : 'text-slate-400 hover:bg-slate-700 hover:text-yellow-400'
            }`}
            title={
              isFavorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'
            }
          >
            {isFavorited ? '⭐' : '☆'}
          </button>
        )}

        {/* Rate button for patients */}
        {isPatient && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRate();
            }}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-green-400"
            title="Avaliar Exercício"
          >
            😊
          </button>
        )}

        {/* Stats button for therapists */}
        {isTherapist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewStats();
            }}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-blue-400"
            title="Ver Estatísticas"
          >
            📊
          </button>
        )}

        {/* Management buttons */}
        {canManage && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
              title="Editar Exercício"
            >
              <IconPencil size={16} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
              title="Excluir Exercício"
            >
              <IconTrash size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  </div>
);

const ExercisePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const {
    exercises,
    saveExercise,
    deleteExercise,
    toggleExerciseFavorite,
    getExerciseFavorites,
    getExerciseVideos,
    getExerciseImages,
  } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [bodyPartFilter, setBodyPartFilter] = useState('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isVideoUploadModalOpen, setIsVideoUploadModalOpen] = useState(false);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [isVideoPlayerModalOpen, setIsVideoPlayerModalOpen] = useState(false);
  const [isImageGalleryModalOpen, setIsImageGalleryModalOpen] = useState(false);
  const [isQRGeneratorModalOpen, setIsQRGeneratorModalOpen] = useState(false);
  const [isQRAnalyticsModalOpen, setIsQRAnalyticsModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [isCacheModalOpen, setIsCacheModalOpen] = useState(false);
  const [isImageSearchModalOpen, setIsImageSearchModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<
    Exercise | Partial<Exercise> | null
  >(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const canManage =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FISIOTERAPEUTA;
  const isPatient = user?.role === UserRole.PACIENTE;
  const isTherapist =
    user?.role === UserRole.FISIOTERAPEUTA || user?.role === UserRole.ADMIN;

  const userFavorites = useMemo(() => {
    if (!user?.id) return [];
    return getExerciseFavorites(user.id);
  }, [user?.id, getExerciseFavorites]);

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
      const matchesFavorites =
        !favoritesOnly || userFavorites.some((fav) => fav.exerciseId === ex.id);

      return (
        matchesSearch && matchesCategory && matchesBodyPart && matchesFavorites
      );
    });
  }, [
    exercises,
    searchTerm,
    categoryFilter,
    bodyPartFilter,
    favoritesOnly,
    userFavorites,
  ]);

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
    setIsRatingModalOpen(false);
    setIsStatsModalOpen(false);
    setIsVideoUploadModalOpen(false);
    setIsImageUploadModalOpen(false);
    setIsVideoPlayerModalOpen(false);
    setIsImageGalleryModalOpen(false);
    setIsQRGeneratorModalOpen(false);
    setIsQRAnalyticsModalOpen(false);
    setIsPDFModalOpen(false);
    setIsCacheModalOpen(false);
    setIsImageSearchModalOpen(false);
    setSelectedExercise(null);
  };

  const handleFavorite = (exercise: Exercise) => {
    if (!user) return;
    toggleExerciseFavorite(exercise.id, user);
  };

  const handleRate = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsRatingModalOpen(true);
  };

  const handleViewStats = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsStatsModalOpen(true);
  };

  const handleUploadVideo = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsVideoUploadModalOpen(true);
  };

  const handleUploadImage = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsImageUploadModalOpen(true);
  };

  const handleViewVideos = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsVideoPlayerModalOpen(true);
  };

  const handleViewImages = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsImageGalleryModalOpen(true);
  };

  const handleGenerateQR = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsQRGeneratorModalOpen(true);
  };

  const handleGeneratePDF = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setIsPDFModalOpen(true);
  };

  const handleViewQRAnalytics = () => {
    setIsQRAnalyticsModalOpen(true);
  };

  const handleViewCacheManagement = () => {
    setIsCacheModalOpen(true);
  };

  const handleOpenImageSearch = () => {
    setIsImageSearchModalOpen(true);
  };

  const isExerciseFavorited = (exerciseId: string) => {
    return userFavorites.some((fav) => fav.exerciseId === exerciseId);
  };

  const getVideoCount = (exerciseId: string) => {
    return getExerciseVideos(exerciseId).length;
  };

  const getImageCount = (exerciseId: string) => {
    return getExerciseImages(exerciseId).length;
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
        <div className="flex space-x-2">
          {isTherapist && (
            <>
              <Button
                variant="secondary"
                onClick={handleOpenImageSearch}
                className="text-sm"
              >
                🔍 Buscar Imagens
              </Button>
              <Button
                variant="secondary"
                onClick={handleViewCacheManagement}
                className="text-sm"
              >
                💾 Cache Offline
              </Button>
              <Button
                variant="secondary"
                onClick={handleViewQRAnalytics}
                className="text-sm"
              >
                📊 QR Analytics
              </Button>
            </>
          )}
          {canManage && (
            <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
              Novo Exercício
            </Button>
          )}
        </div>
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

        {/* Favorites filter for therapists */}
        {isTherapist && (
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              favoritesOnly
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {favoritesOnly ? '⭐ Favoritos' : '☆ Mostrar Favoritos'}
          </button>
        )}
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
              onFavorite={() => handleFavorite(exercise)}
              onRate={() => handleRate(exercise)}
              onViewStats={() => handleViewStats(exercise)}
              onUploadVideo={() => handleUploadVideo(exercise)}
              onUploadImage={() => handleUploadImage(exercise)}
              onViewVideos={() => handleViewVideos(exercise)}
              onViewImages={() => handleViewImages(exercise)}
              onGenerateQR={() => handleGenerateQR(exercise)}
              onGeneratePDF={() => handleGeneratePDF(exercise)}
              canManage={canManage}
              isPatient={isPatient}
              isTherapist={isTherapist}
              isFavorited={isExerciseFavorited(exercise.id)}
              videoCount={getVideoCount(exercise.id)}
              imageCount={getImageCount(exercise.id)}
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

      {/* Modais com Suspense para lazy loading */}
      <Suspense fallback={<PageLoader />}>
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
        {isRatingModalOpen && selectedExercise && 'id' in selectedExercise && (
          <ExerciseRatingModal
            isOpen={isRatingModalOpen}
            onClose={handleCloseModals}
            exercise={selectedExercise as Exercise}
          />
        )}
        {isStatsModalOpen && selectedExercise && 'id' in selectedExercise && (
          <ExerciseStatsModal
            isOpen={isStatsModalOpen}
            onClose={handleCloseModals}
            exercise={selectedExercise as Exercise}
          />
        )}
        {isVideoUploadModalOpen &&
          selectedExercise &&
          'id' in selectedExercise && (
            <VideoUploadModal
              isOpen={isVideoUploadModalOpen}
              onClose={handleCloseModals}
              exercise={selectedExercise as Exercise}
            />
          )}
        {isImageUploadModalOpen &&
          selectedExercise &&
          'id' in selectedExercise && (
            <ImageUploadModal
              isOpen={isImageUploadModalOpen}
              onClose={handleCloseModals}
              exercise={selectedExercise as Exercise}
            />
          )}
        {isVideoPlayerModalOpen &&
          selectedExercise &&
          'id' in selectedExercise && (
            <VideoPlayerModal
              isOpen={isVideoPlayerModalOpen}
              onClose={handleCloseModals}
              exercise={selectedExercise as Exercise}
            />
          )}
        {isImageGalleryModalOpen &&
          selectedExercise &&
          'id' in selectedExercise && (
            <ImageGalleryModal
              isOpen={isImageGalleryModalOpen}
              onClose={handleCloseModals}
              exercise={selectedExercise as Exercise}
            />
          )}
        {isQRGeneratorModalOpen &&
          selectedExercise &&
          'id' in selectedExercise && (
            <QRGeneratorModal
              isOpen={isQRGeneratorModalOpen}
              onClose={handleCloseModals}
              type="exercise"
              exercise={selectedExercise as Exercise}
            />
          )}
        {isQRAnalyticsModalOpen && (
          <QRAnalyticsModal
            isOpen={isQRAnalyticsModalOpen}
            onClose={handleCloseModals}
          />
        )}
        {isPDFModalOpen && selectedExercise && 'id' in selectedExercise && (
          <ExercisePDFModal
            isOpen={isPDFModalOpen}
            onClose={handleCloseModals}
            exercise={selectedExercise as Exercise}
          />
        )}
        {isCacheModalOpen && (
          <CacheManagementModal
            isOpen={isCacheModalOpen}
            onClose={handleCloseModals}
          />
        )}
        {isImageSearchModalOpen && (
          <ImageSearchModal
            isOpen={isImageSearchModalOpen}
            onClose={handleCloseModals}
            onSelectImage={(image, exercise) => {
              if (exercise) {
                handleViewImages(exercise);
              }
              handleCloseModals();
            }}
          />
        )}
      </Suspense>
    </PageShell>
  );
};

export default ExercisePage;
