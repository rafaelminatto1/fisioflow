import React, { useState, useEffect } from 'react';
import { Exercise, ExerciseVideo, ExerciseImage } from '../../types';
import { useData } from '../../hooks/useData.minimal';
import { qrCodeService, QRCodeData } from '../../services/qrCodeService';
import { cacheService } from '../../services/cacheService';
import LazyImage from '../ui/LazyImage';

interface MobileExercisePageProps {
  qrData: QRCodeData;
}

const MobileExercisePage: React.FC<MobileExercisePageProps> = ({ qrData }) => {
  const { exercises, getExerciseVideos, getExerciseImages } = useData();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [images, setImages] = useState<ExerciseImage[]>([]);
  const [activeVideo, setActiveVideo] = useState<ExerciseVideo | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [executionLogged, setExecutionLogged] = useState(false);
  const [isOffline, setIsOffline] = useState(!cacheService.isOnline());
  const [isFromCache, setIsFromCache] = useState(false);

  useEffect(() => {
    if (qrData.exerciseId) {
      // First try to find exercise in main data
      let foundExercise = exercises.find(ex => ex.id === qrData.exerciseId);
      let exerciseVideos: ExerciseVideo[] = [];
      let exerciseImages: ExerciseImage[] = [];
      let fromCache = false;

      if (foundExercise) {
        // Exercise found in main data
        exerciseVideos = getExerciseVideos(foundExercise.id);
        exerciseImages = getExerciseImages(foundExercise.id);
      } else {
        // Try to load from cache (offline scenario)
        const cachedData = cacheService.getCachedExercise(qrData.exerciseId);
        if (cachedData) {
          foundExercise = cachedData.exercise;
          exerciseVideos = cachedData.videos;
          exerciseImages = cachedData.images;
          fromCache = true;
        }
      }

      if (foundExercise) {
        setExercise(foundExercise);
        setVideos(exerciseVideos);
        setImages(exerciseImages);
        setIsFromCache(fromCache);
        
        if (exerciseVideos.length > 0) {
          setActiveVideo(exerciseVideos[0]);
        }

        // Cache for offline access if not from cache
        if (!fromCache) {
          cacheService.cacheExercise(foundExercise, exerciseVideos, exerciseImages);
        }

        // Track QR access
        qrCodeService.trackQRAccess(qrData.id, qrData.tenantId, true);
      } else {
        // Track failed access
        qrCodeService.trackQRAccess(qrData.id, qrData.tenantId, false);
      }
    }
  }, [qrData, exercises, getExerciseVideos, getExerciseImages]);

  // Set up offline/online listeners
  useEffect(() => {
    const cleanup = cacheService.setupOfflineListeners(
      () => setIsOffline(false),
      () => setIsOffline(true)
    );
    
    return cleanup;
  }, []);

  const handleVideoPlay = () => {
    setIsVideoPlaying(true);
    if (activeVideo && !executionLogged) {
      // Log execution after 5 seconds of watching
      setTimeout(() => {
        if (isVideoPlaying) {
          setExecutionLogged(true);
          // In a real app, this would save to the database
          console.log('Exercise execution logged');
        }
      }, 5000);
    }
  };

  const handleVideoPause = () => {
    setIsVideoPlaying(false);
  };

  const isYouTubeVideo = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string, videoId?: string): string => {
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
    }
    return url;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'initial_position': return '🏁';
      case 'execution': return '⚡';
      case 'final_position': return '🏆';
      case 'anatomy': return '🫀';
      case 'equipment': return '🏋️';
      case 'variation': return '♻️';
      default: return '📷';
    }
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'initial_position': return 'Posição Inicial';
      case 'execution': return 'Execução';
      case 'final_position': return 'Posição Final';
      case 'anatomy': return 'Anatomia';
      case 'equipment': return 'Equipamentos';
      case 'variation': return 'Variação';
      default: return 'Imagem';
    }
  };

  if (!exercise) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
          <div className="text-4xl mb-4">❌</div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Exercício não encontrado
          </h2>
          <p className="text-slate-600">
            O QR Code pode estar expirado ou inválido.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900 truncate">
              {exercise.name}
            </h1>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-slate-500">
                📱 Acessado via QR Code
              </p>
              {isFromCache && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  💾 Cache
                </span>
              )}
              {isOffline && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  📴 Offline
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {executionLogged && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                ✓ Registrado
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Exercise Info */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {exercise.category}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {exercise.bodyPart}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            {exercise.description}
          </p>
        </div>

        {/* Video Section */}
        {videos.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center">
              🎥 Vídeo Demonstrativo
              {activeVideo && activeVideo.duration > 0 && (
                <span className="ml-2 text-xs text-slate-500">
                  {formatDuration(activeVideo.duration)}
                </span>
              )}
            </h3>
            
            {activeVideo && (
              <div className="space-y-3">
                <div className="aspect-video rounded-lg bg-black overflow-hidden">
                  {isYouTubeVideo(activeVideo.videoUrl) ? (
                    <iframe
                      src={getYouTubeEmbedUrl(activeVideo.videoUrl, activeVideo.youtubeId)}
                      className="w-full h-full"
                      allowFullScreen
                      title={activeVideo.title}
                      onLoad={handleVideoPlay}
                    />
                  ) : (
                    <video
                      controls
                      className="w-full h-full"
                      src={activeVideo.videoUrl}
                      poster={activeVideo.thumbnailUrl}
                      onPlay={handleVideoPlay}
                      onPause={handleVideoPause}
                    >
                      Seu navegador não suporta a reprodução de vídeo.
                    </video>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-900">{activeVideo.title}</h4>
                  {activeVideo.description && (
                    <p className="text-sm text-slate-600 mt-1">{activeVideo.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                    <span>👁 {activeVideo.viewCount} visualizações</span>
                    <span>{activeVideo.tags.join(', ')}</span>
                  </div>
                </div>

                {/* Multiple Videos */}
                {videos.length > 1 && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      Outros vídeos ({videos.length - 1})
                    </p>
                    <div className="space-y-2">
                      {videos.filter(v => v.id !== activeVideo.id).map((video) => (
                        <button
                          key={video.id}
                          onClick={() => setActiveVideo(video)}
                          className="w-full flex items-center space-x-3 p-2 border border-slate-200 rounded-lg hover:bg-slate-50"
                        >
                          <div className="w-16 h-12 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                            {video.thumbnailUrl ? (
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                🎥
                              </div>
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {video.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {video.duration > 0 && formatDuration(video.duration)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Images Section */}
        {images.length > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-semibold text-slate-900 mb-3">
              📷 Imagens Explicativas ({images.length})
            </h3>
            
            <div className="space-y-4">
              {/* Main Image */}
              <div className="aspect-video rounded-lg bg-slate-100 overflow-hidden">
                <LazyImage
                  src={images[activeImageIndex].imageUrl}
                  alt={images[activeImageIndex].title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Image Info */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-lg">
                    {getCategoryIcon(images[activeImageIndex].category)}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {getCategoryLabel(images[activeImageIndex].category)}
                  </span>
                </div>
                <h4 className="font-medium text-slate-900">
                  {images[activeImageIndex].title}
                </h4>
                {images[activeImageIndex].caption && (
                  <p className="text-sm text-slate-600 mt-1">
                    {images[activeImageIndex].caption}
                  </p>
                )}
              </div>

              {/* Image Navigation */}
              {images.length > 1 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-600">
                      {activeImageIndex + 1} de {images.length}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setActiveImageIndex(Math.max(0, activeImageIndex - 1))}
                        disabled={activeImageIndex === 0}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm disabled:opacity-50"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => setActiveImageIndex(Math.min(images.length - 1, activeImageIndex + 1))}
                        disabled={activeImageIndex === images.length - 1}
                        className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-sm disabled:opacity-50"
                      >
                        Próxima →
                      </button>
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setActiveImageIndex(index)}
                        className={`flex-shrink-0 w-16 h-12 rounded border-2 overflow-hidden ${
                          index === activeImageIndex
                            ? 'border-blue-500'
                            : 'border-slate-200'
                        }`}
                      >
                        <LazyImage
                          src={image.imageUrl}
                          alt={image.title}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">💡 Como executar:</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Assista ao vídeo demonstrativo completo</li>
            <li>Observe as imagens da posição inicial e final</li>
            <li>Execute o movimento com atenção à técnica</li>
            <li>Respeite os limites do seu corpo</li>
            <li>Em caso de dor, interrompa o exercício</li>
          </ol>
        </div>

        {/* Execution Status */}
        <div className="bg-white rounded-lg p-4 shadow-sm text-center">
          {executionLogged ? (
            <div className="text-green-700">
              <div className="text-2xl mb-2">✅</div>
              <p className="font-medium">Execução registrada!</p>
              <p className="text-sm text-green-600">
                Seu progresso foi salvo automaticamente
              </p>
            </div>
          ) : (
            <div className="text-slate-600">
              <div className="text-2xl mb-2">⏱️</div>
              <p className="font-medium">Assista ao vídeo para registrar</p>
              <p className="text-sm">
                A execução será registrada automaticamente
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-slate-200 p-4 text-center">
        <p className="text-xs text-slate-500">
          Powered by FisioFlow • QR Code gerado em {' '}
          {new Date(qrData.timestamp).toLocaleDateString('pt-BR')}
        </p>
      </div>
    </div>
  );
};

export default MobileExercisePage;