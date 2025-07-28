import React, { useState, useRef, useEffect } from 'react';
import { Exercise, ExerciseVideo } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
  initialVideoId?: string;
}

const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  exercise,
  initialVideoId,
}) => {
  const { user } = useAuth();
  const { getExerciseVideos, incrementVideoView } = useData();

  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(
    initialVideoId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videos = getExerciseVideos(exercise.id);
  const selectedVideo =
    videos.find((v) => v.id === selectedVideoId) || videos[0];

  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos, selectedVideoId]);

  useEffect(() => {
    if (selectedVideo && user) {
      // Incrementar visualização após 3 segundos assistindo
      const timer = setTimeout(() => {
        incrementVideoView(selectedVideo.id, user);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [selectedVideo?.id, user, incrementVideoView]);

  const handleVideoSelect = (video: ExerciseVideo) => {
    setSelectedVideoId(video.id);
  };

  const isYouTubeVideo = (url: string): boolean => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = selectedVideo?.youtubeId;
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
    }
    return url;
  };

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoTypeIcon = (type: string): string => {
    switch (type) {
      case 'demonstration':
        return '🎯';
      case 'progression':
        return '📈';
      case 'variation':
        return '♻️';
      case 'alternative':
        return '🔀';
      default:
        return '🎥';
    }
  };

  const getVideoTypeLabel = (type: string): string => {
    switch (type) {
      case 'demonstration':
        return 'Demonstração';
      case 'progression':
        return 'Progressão';
      case 'variation':
        return 'Variação';
      case 'alternative':
        return 'Alternativa';
      default:
        return 'Vídeo';
    }
  };

  if (!selectedVideo) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Vídeos do Exercício">
        <div className="py-8 text-center">
          <div className="mb-4 text-4xl">🎥</div>
          <h3 className="mb-2 font-semibold text-slate-900">
            Nenhum vídeo disponível
          </h3>
          <p className="text-slate-600">
            Este exercício ainda não possui vídeos demonstrativos.
          </p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Vídeos do Exercício"
      size="large"
    >
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{exercise.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="aspect-video overflow-hidden rounded-lg bg-black">
              {isYouTubeVideo(selectedVideo.videoUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(selectedVideo.videoUrl)}
                  className="h-full w-full"
                  allowFullScreen
                  title={selectedVideo.title}
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <video
                  ref={videoRef}
                  controls
                  className="h-full w-full"
                  src={selectedVideo.videoUrl}
                  poster={selectedVideo.thumbnailUrl}
                  onLoadStart={() => setIsLoading(true)}
                  onCanPlay={() => setIsLoading(false)}
                >
                  Seu navegador não suporta a reprodução de vídeo.
                </video>
              )}

              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white">Carregando vídeo...</div>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">
                    {selectedVideo.title}
                  </h4>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-slate-500">
                    <span className="flex items-center">
                      {getVideoTypeIcon(selectedVideo.type)}{' '}
                      {getVideoTypeLabel(selectedVideo.type)}
                    </span>
                    {selectedVideo.duration > 0 && (
                      <span>{formatDuration(selectedVideo.duration)}</span>
                    )}
                    <span>👁 {selectedVideo.viewCount} visualizações</span>
                  </div>
                </div>
              </div>

              {selectedVideo.description && (
                <p className="mt-3 text-sm text-slate-600">
                  {selectedVideo.description}
                </p>
              )}

              {selectedVideo.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Video List */}
          <div className="lg:col-span-1">
            <h5 className="mb-3 font-medium text-slate-900">
              Vídeos Disponíveis ({videos.length})
            </h5>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {videos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                    selectedVideoId === video.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {video.thumbnailUrl ? (
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="h-12 w-16 flex-shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-16 flex-shrink-0 items-center justify-center rounded bg-slate-200">
                        🎥
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {video.title}
                      </div>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-slate-500">
                        <span className="flex items-center">
                          {getVideoTypeIcon(video.type)}{' '}
                          {getVideoTypeLabel(video.type)}
                        </span>
                        {video.duration > 0 && (
                          <span>{formatDuration(video.duration)}</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        👁 {video.viewCount} visualizações
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default VideoPlayerModal;
