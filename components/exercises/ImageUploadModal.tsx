import React, { useState } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import {
  Exercise,
  ExerciseImage,
  ImageCategory,
  UserRole,
  ImageAnnotation,
} from '../../types';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  exercise,
}) => {
  const { user } = useAuth();
  const { saveExerciseImage } = useData();

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<ImageCategory>('execution');
  const [tags, setTags] = useState('');
  const [order, setOrder] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const imageCategories = [
    {
      value: 'initial_position' as ImageCategory,
      label: 'Posição Inicial',
      description: 'Como começar o exercício',
    },
    {
      value: 'execution' as ImageCategory,
      label: 'Execução',
      description: 'Durante a realização do exercício',
    },
    {
      value: 'final_position' as ImageCategory,
      label: 'Posição Final',
      description: 'Como terminar o exercício',
    },
    {
      value: 'anatomy' as ImageCategory,
      label: 'Anatomia',
      description: 'Músculos e estruturas envolvidas',
    },
    {
      value: 'equipment' as ImageCategory,
      label: 'Equipamentos',
      description: 'Materiais necessários',
    },
    {
      value: 'variation' as ImageCategory,
      label: 'Variação',
      description: 'Formas alternativas de execução',
    },
  ];

  const validateImageUrl = (url: string): boolean => {
    // Aceita URLs de imagem ou arquivos de imagem
    const imageUrlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const dataUrlRegex = /^data:image\/(jpg|jpeg|png|gif|webp|svg);base64,/i;
    const blobUrlRegex = /^blob:/i;

    return (
      imageUrlRegex.test(url) ||
      dataUrlRegex.test(url) ||
      blobUrlRegex.test(url)
    );
  };

  const resizeImage = (
    file: File,
    maxWidth: number = 1920,
    maxHeight: number = 1080,
    quality: number = 0.8
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular novas dimensões mantendo proporção
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Redimensionar e comprimir
        ctx?.drawImage(img, 0, 0, width, height);

        // Converter para WebP se suportado, senão JPEG
        const format = canvas
          .toDataURL('image/webp')
          .startsWith('data:image/webp')
          ? 'image/webp'
          : 'image/jpeg';
        const resizedDataUrl = canvas.toDataURL(format, quality);

        resolve(resizedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const processMultipleFiles = async (files: FileList) => {
    const validFiles: File[] = [];
    const newPreviewUrls: string[] = [];

    for (const file of Array.from(files)) {
      // Validar tipo de arquivo
      const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/gif',
      ];
      if (!validTypes.includes(file.type)) {
        alert(`Arquivo ${file.name} não é um formato de imagem válido.`);
        continue;
      }

      // Validar tamanho (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`Arquivo ${file.name} é muito grande. Máximo 10MB.`);
        continue;
      }

      validFiles.push(file);

      // Redimensionar e criar preview
      try {
        const resizedDataUrl = await resizeImage(file);
        newPreviewUrls.push(resizedDataUrl);
      } catch (error) {
        console.error(`Erro ao processar ${file.name}:`, error);
        alert(`Erro ao processar ${file.name}`);
      }
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);

    // Auto-preencher título se estiver vazio
    if (!title.trim() && validFiles.length > 0) {
      setTitle(validFiles[0].name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await processMultipleFiles(files);
    }
  };

  const removePreviewImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      (!imageUrl.trim() && previewUrls.length === 0) ||
      !user
    )
      return;

    setIsSubmitting(true);

    try {
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      // Se há imagens selecionadas (upload múltiplo), processar todas
      if (previewUrls.length > 0) {
        for (let i = 0; i < previewUrls.length; i++) {
          const imageUrl = previewUrls[i];
          const fileName = selectedFiles[i]?.name || `imagem-${i + 1}`;

          const imageData: Omit<ExerciseImage, 'id'> = {
            exerciseId: exercise.id,
            title:
              previewUrls.length === 1
                ? title.trim()
                : `${title.trim()} - ${i + 1}`,
            caption: caption.trim() || undefined,
            imageUrl,
            category,
            order: order + i,
            tags: tagArray,
            isActive: true,
            uploadedById: user.id,
            format: imageUrl.startsWith('data:image/webp') ? 'webp' : 'jpeg',
            width: undefined, // TODO: Extrair dimensões reais
            height: undefined,
            annotationPoints: [],
            tenantId: user.tenantId || '',
          };

          saveExerciseImage(imageData, user);
        }
      } else if (imageUrl.trim()) {
        // Processar URL única
        if (!validateImageUrl(imageUrl)) {
          alert('Por favor, insira uma URL de imagem válida.');
          return;
        }

        const imageData: Omit<ExerciseImage, 'id'> = {
          exerciseId: exercise.id,
          title: title.trim(),
          caption: caption.trim() || undefined,
          imageUrl,
          category,
          order,
          tags: tagArray,
          isActive: true,
          uploadedById: user.id,
          format: imageUrl.split('.').pop()?.toLowerCase(),
          annotationPoints: [],
          tenantId: user.tenantId || '',
        };

        saveExerciseImage(imageData, user);
      }

      // Reset form
      setTitle('');
      setCaption('');
      setImageUrl('');
      setCategory('execution');
      setTags('');
      setOrder(1);
      setSelectedFiles([]);
      setPreviewUrls([]);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar imagem:', error);
      alert('Erro ao salvar imagem. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setCaption('');
    setImageUrl('');
    setCategory('execution');
    setTags('');
    setOrder(1);
    setSelectedFiles([]);
    setPreviewUrls([]);
    onClose();
  };

  // Only allow therapists and admins to upload images
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="Adicionar Imagem">
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Adicionando imagem ao exercício
          </p>
        </div>

        {/* Image Upload */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Imagem *
          </label>
          <div className="space-y-3">
            {/* File Upload */}
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                Selecione múltiplos arquivos (JPG, PNG, WebP, GIF) - máximo 10MB
                cada
              </p>
            </div>

            {/* Or URL Input */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-slate-500">ou</span>
              </div>
            </div>

            <div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="mt-1 text-xs text-slate-500">
                Cole a URL de uma imagem externa
              </p>
            </div>
          </div>

          {/* Multiple Images Preview */}
          {previewUrls.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Imagens selecionadas ({previewUrls.length})
              </p>
              <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto md:grid-cols-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="h-24 w-full rounded-md border border-slate-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePreviewImage(index)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 truncate bg-black bg-opacity-50 p-1 text-xs text-white">
                      {selectedFiles[index]?.name || `Imagem ${index + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Image Preview (URL) */}
          {imageUrl && previewUrls.length === 0 && (
            <div className="mt-3">
              <img
                src={imageUrl}
                alt="Preview"
                className="max-h-40 w-full rounded-md border border-slate-200 object-contain"
                onError={() => {
                  alert(
                    'Erro ao carregar a imagem. Verifique a URL ou arquivo.'
                  );
                  setImageUrl('');
                }}
              />
            </div>
          )}
        </div>

        {/* Image Title */}
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Título da Imagem *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ex: Posição inicial do exercício"
            required
          />
        </div>

        {/* Image Category */}
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            Categoria da Imagem
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {imageCategories.map((option) => (
              <button
                key={option.value}
                onClick={() => setCategory(option.value)}
                className={`rounded-lg border-2 p-3 text-left transition-all duration-200 ${
                  category === option.value
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

        {/* Caption */}
        <div>
          <label
            htmlFor="caption"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Legenda (opcional)
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Adicione uma descrição detalhada da imagem..."
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
              placeholder="iniciante, casa, equipamento"
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
            disabled={
              !title.trim() ||
              (!imageUrl.trim() && previewUrls.length === 0) ||
              isSubmitting
            }
            className="min-w-[120px]"
          >
            {isSubmitting
              ? 'Salvando...'
              : previewUrls.length > 1
                ? `Adicionar ${previewUrls.length} Imagens`
                : 'Adicionar Imagem'}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ImageUploadModal;
