import React, { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import {
  Exercise,
  ExerciseVideo,
  VideoType,
  VideoQuality,
  UserRole,
} from '../../types';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  const { user } = useAuth();
  const { saveExerciseVideo } = useData();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [type, setType] = useState<VideoType>('demonstration');
  const [quality, setQuality] = useState<VideoQuality>('auto');
  const [tags, setTags] = useState('');
  const [order, setOrder] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoTypes = [
    {
      value: 'demonstration' as VideoType,
      label: 'Demonstração',
      description: 'Vídeo principal demonstrando o exercício',
    },
    {
      value: 'progression' as VideoType,
      label: 'Progressão',
      description: 'Variação mais avançada do exercício',
    },
    {
      value: 'variation' as VideoType,
      label: 'Variação',
      description: 'Forma alternativa de executar o exercício',
    },
    {
      value: 'alternative' as VideoType,
      label: 'Alternativa',
      description: 'Exercício alternativo ou adaptação',
    },
  ];

  const qualityOptions = [
    {
      value: 'auto' as VideoQuality,
      label: 'Automática',
      description: 'Qualidade ajustada automaticamente',
    },
    {
      value: 'high' as VideoQuality,
      label: 'Alta (HD)',
      description: 'Melhor qualidade, maior consumo de dados',
    },
    {
      value: 'medium' as VideoQuality,
      label: 'Média',
      description: 'Equilíbrio entre qualidade e dados',
    },
    {
      value: 'low' as VideoQuality,
      label: 'Baixa',
      description: 'Menor qualidade, menor consumo de dados',
    },
  ];

  const extractYouTubeId = (url: string): string | null => {
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const validateVideoUrl = (url: string): boolean => {
    // Aceita URLs do YouTube ou arquivos de vídeo
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)/;
    const videoFileRegex = /\.(mp4|avi|mov|wmv|flv|webm)$/i;

    return (
      youtubeRegex.test(url) ||
      videoFileRegex.test(url) ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    );
  };

  const handleSubmit = async () => {
    if (!title.trim() || !videoUrl.trim() || !user) return;

    if (!validateVideoUrl(videoUrl)) {
      alert('Por favor, insira uma URL válida do YouTube ou arquivo de vídeo.');
      return;
    }

    setIsSubmitting(true);

    try {
      const youtubeId = extractYouTubeId(videoUrl);
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      const videoData: Omit<ExerciseVideo, 'id'> = {
        exerciseId: exercise.id,
        title: title.trim(),
        description: description.trim() || undefined,
        videoUrl,
        type,
        quality,
        uploadedById: user.id,
        order,
        tags: tagArray,
        isActive: true,
        youtubeId,
        viewCount: 0,
        duration: 0, // TODO: Implementar detecção automática de duração
        tenantId: user.tenantId || '',
      };

      saveExerciseVideo(videoData, user);

      // Reset form
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setType('demonstration');
      setQuality('auto');
      setTags('');
      setOrder(1);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar vídeo:', error);
      alert('Erro ao salvar vídeo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setType('demonstration');
    setQuality('auto');
    setTags('');
    setOrder(1);
    onClose();
  };

  // Only allow therapists and admins to upload videos
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Adicionar Vídeo">
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Adicionando vídeo ao exercício
          </p>
        </div>

        {/* Video Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Título do Vídeo *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ex: Demonstração do exercício"
            required
          />
        </div>

        {/* Video URL */}
        <div>
          <label
            htmlFor="videoUrl"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            URL do Vídeo *
          </label>
          <input
            id="videoUrl"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://youtube.com/watch?v=... ou arquivo de vídeo"
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Aceita URLs do YouTube ou arquivos de vídeo (MP4, AVI, MOV, etc.)
          </p>
        </div>

        {/* Video Type */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            Tipo de Vídeo
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {videoTypes.map((option) => (
              <button
                key={option.value}
                onClick={() => setType(option.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                  type === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <label
            htmlFor="quality"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Qualidade do Vídeo
          </label>
          <select
            id="quality"
            value={quality}
            onChange={(e) => setQuality(e.target.value as VideoQuality)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {qualityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Adicione detalhes sobre o vídeo..."
          />
        </div>

        {/* Tags and Order */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="tags"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Tags (opcional)
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="iniciante, avançado, casa"
            />
            <p className="mt-1 text-xs text-slate-500">
              Separe as tags por vírgula
            </p>
          </div>

          <div>
            <label
              htmlFor="order"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Ordem de Exibição
            </label>
            <input
              id="order"
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !videoUrl.trim() || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Salvando...' : 'Adicionar Vídeo'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default VideoUploadModal;
