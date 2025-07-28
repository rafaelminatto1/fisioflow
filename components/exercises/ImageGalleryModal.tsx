import React, { useState, useEffect } from 'react';
import {
  Exercise,
  ExerciseImage,
  ImageCategory,
  ImageAnnotation,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';
import LazyImage from '../ui/LazyImage';
import InteractiveImageAnnotation from './InteractiveImageAnnotation';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exercise: Exercise;
  initialImageId?: string;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  isOpen,
  onClose,
  exercise,
  initialImageId,
}) => {
  const { user } = useAuth();
  const {
    getExerciseImages,
    getExerciseImagesByCategory,
    updateExerciseImage,
  } = useData();

  const [selectedImageId, setSelectedImageId] = useState<string | null>(
    initialImageId || null
  );
  const [selectedCategory, setSelectedCategory] = useState<
    ImageCategory | 'all'
  >('all');
  const [isZoomed, setIsZoomed] = useState(false);

  const allImages = getExerciseImages(exercise.id);
  const filteredImages =
    selectedCategory === 'all'
      ? allImages
      : getExerciseImagesByCategory(exercise.id, selectedCategory);

  const selectedImage =
    allImages.find((img) => img.id === selectedImageId) || filteredImages[0];

  const handleUpdateAnnotations = (annotations: ImageAnnotation[]) => {
    if (!user || !selectedImage) return;

    updateExerciseImage(
      selectedImage.id,
      { annotationPoints: annotations },
      user
    );
  };

  const categories = [
    { value: 'all' as const, label: 'Todas', icon: '📋' },
    {
      value: 'initial_position' as ImageCategory,
      label: 'Posição Inicial',
      icon: '🏁',
    },
    { value: 'execution' as ImageCategory, label: 'Execução', icon: '⚡' },
    {
      value: 'final_position' as ImageCategory,
      label: 'Posição Final',
      icon: '🏆',
    },
    { value: 'anatomy' as ImageCategory, label: 'Anatomia', icon: '🫀' },
    { value: 'equipment' as ImageCategory, label: 'Equipamentos', icon: '🏋️' },
    { value: 'variation' as ImageCategory, label: 'Variações', icon: '♻️' },
  ];

  useEffect(() => {
    if (filteredImages.length > 0 && !selectedImageId) {
      setSelectedImageId(filteredImages[0].id);
    } else if (filteredImages.length === 0) {
      setSelectedImageId(null);
    }
  }, [filteredImages, selectedImageId]);

  const handleImageSelect = (image: ExerciseImage) => {
    setSelectedImageId(image.id);
    setIsZoomed(false);
  };

  const handlePreviousImage = () => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(
      (img) => img.id === selectedImage.id
    );
    const previousIndex =
      currentIndex > 0 ? currentIndex - 1 : filteredImages.length - 1;
    setSelectedImageId(filteredImages[previousIndex].id);
    setIsZoomed(false);
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = filteredImages.findIndex(
      (img) => img.id === selectedImage.id
    );
    const nextIndex =
      currentIndex < filteredImages.length - 1 ? currentIndex + 1 : 0;
    setSelectedImageId(filteredImages[nextIndex].id);
    setIsZoomed(false);
  };

  const getCategoryLabel = (category: ImageCategory): string => {
    const categoryInfo = categories.find((cat) => cat.value === category);
    return categoryInfo ? categoryInfo.label : category;
  };

  const getCategoryIcon = (category: ImageCategory): string => {
    const categoryInfo = categories.find((cat) => cat.value === category);
    return categoryInfo ? categoryInfo.icon : '📷';
  };

  const currentImageIndex = selectedImage
    ? filteredImages.findIndex((img) => img.id === selectedImage.id) + 1
    : 0;

  if (allImages.length === 0) {
    return (
      <BaseModal isOpen={isOpen} onClose={onClose} title="Galeria de Imagens">
        <div className="py-8 text-center">
          <div className="mb-4 text-4xl">📷</div>
          <h3 className="mb-2 font-semibold text-slate-900">
            Nenhuma imagem disponível
          </h3>
          <p className="text-slate-600">
            Este exercício ainda não possui imagens demonstrativas.
          </p>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Galeria de Imagens"
      size="large"
    >
      <div className="space-y-6">
        {/* Exercise Info */}
        <div className="rounded-lg bg-slate-50 p-4">
          <h3 className="font-semibold text-slate-900">{exercise.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{exercise.description}</p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const count =
              category.value === 'all'
                ? allImages.length
                : getExerciseImagesByCategory(
                    exercise.id,
                    category.value as ImageCategory
                  ).length;

            if (count === 0 && category.value !== 'all') return null;

            return (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  selectedCategory === category.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.label}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {filteredImages.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="mb-2 font-semibold text-slate-900">
              Nenhuma imagem nesta categoria
            </h3>
            <p className="text-slate-600">
              Não há imagens disponíveis para a categoria selecionada.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Image Display */}
            <div className="lg:col-span-2">
              {selectedImage && (
                <div className="space-y-4">
                  {/* Image Container */}
                  <div
                    className={`relative overflow-hidden rounded-lg bg-slate-100 transition-all duration-200 ${
                      isZoomed
                        ? 'fixed inset-4 z-50 bg-black bg-opacity-90'
                        : 'aspect-video'
                    }`}
                  >
                    <div
                      className={`h-full w-full ${!isZoomed ? 'cursor-pointer' : ''}`}
                      onClick={!isZoomed ? () => setIsZoomed(true) : undefined}
                    >
                      <InteractiveImageAnnotation
                        image={selectedImage}
                        onUpdateAnnotations={handleUpdateAnnotations}
                        readOnly={isZoomed}
                        className={`h-full w-full transition-all duration-200 ${
                          isZoomed ? 'object-contain' : 'object-cover'
                        }`}
                      />
                    </div>

                    {/* Navigation Arrows */}
                    {filteredImages.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviousImage();
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white transition-all hover:bg-opacity-75"
                        >
                          ←
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextImage();
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white transition-all hover:bg-opacity-75"
                        >
                          →
                        </button>
                      </>
                    )}

                    {/* Image Counter */}
                    <div className="absolute bottom-2 left-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
                      {currentImageIndex} / {filteredImages.length}
                    </div>

                    {/* Zoom Indicator */}
                    <div className="absolute bottom-2 right-2 rounded bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
                      {isZoomed
                        ? '🔍 Clique para diminuir'
                        : '🔍 Clique para ampliar'}
                    </div>

                    {/* Close button when zoomed */}
                    {isZoomed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomed(false);
                        }}
                        className="absolute right-4 top-4 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-75"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Image Info */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-slate-900">
                          {selectedImage.title}
                        </h4>
                        <div className="mt-1 flex items-center space-x-3 text-sm text-slate-500">
                          <span className="flex items-center">
                            {getCategoryIcon(selectedImage.category)}{' '}
                            {getCategoryLabel(selectedImage.category)}
                          </span>
                          <span>
                            📅{' '}
                            {new Date(
                              selectedImage.uploadedAt
                            ).toLocaleDateString('pt-BR')}
                          </span>
                          {selectedImage.annotationPoints &&
                            selectedImage.annotationPoints.length > 0 && (
                              <span className="flex items-center">
                                📍 {selectedImage.annotationPoints.length}{' '}
                                marcaç
                                {selectedImage.annotationPoints.length === 1
                                  ? 'ão'
                                  : 'ões'}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {selectedImage.caption && (
                      <p className="mt-3 text-sm text-slate-600">
                        {selectedImage.caption}
                      </p>
                    )}

                    {selectedImage.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedImage.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Image Thumbnails */}
            <div className="lg:col-span-1">
              <h5 className="mb-3 font-medium text-slate-900">
                Imagens ({filteredImages.length})
              </h5>
              <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-1">
                {filteredImages.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => handleImageSelect(image)}
                    className={`group relative overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                      selectedImageId === image.id
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-video bg-slate-100">
                      <LazyImage
                        src={image.imageUrl}
                        alt={image.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Overlay with info */}
                    <div className="absolute inset-0 flex items-end bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-50">
                      <div className="w-full translate-y-full transform bg-black bg-opacity-75 p-2 text-white transition-transform duration-200 group-hover:translate-y-0">
                        <div className="truncate text-xs font-medium">
                          {image.title}
                        </div>
                        <div className="text-xs opacity-75">
                          {getCategoryIcon(image.category)}{' '}
                          {getCategoryLabel(image.category)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ImageGalleryModal;
