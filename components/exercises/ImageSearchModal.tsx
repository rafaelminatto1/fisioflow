import React, { useState, useEffect, useMemo } from 'react';
import { Exercise, ExerciseImage, ImageCategory, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import { 
  imageSearchService, 
  ImageSearchFilters, 
  ImageSearchResult, 
  SearchSuggestion 
} from '../../services/imageSearchService';
import BaseModal from '../ui/BaseModal';
import Button from '../ui/Button';
import LazyImage from '../ui/LazyImage';

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage?: (image: ExerciseImage, exercise?: Exercise) => void;
}

const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
}) => {
  const { user } = useAuth();
  const { exercises, getExerciseImages } = useData();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ImageSearchFilters>({
    category: 'all',
    hasAnnotations: undefined,
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Only allow therapists and admins to search images
  if (user?.role !== UserRole.FISIOTERAPEUTA && user?.role !== UserRole.ADMIN) {
    return null;
  }

  const allImages = useMemo(() => {
    return exercises.flatMap(exercise => 
      getExerciseImages(exercise.id)
    );
  }, [exercises, getExerciseImages]);

  const searchResults = useMemo(() => {
    const searchFilters: ImageSearchFilters = {
      ...filters,
      query: searchQuery.trim() || undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined,
      exerciseIds: selectedExercises.length > 0 ? selectedExercises : undefined,
    };

    return imageSearchService.searchImages(allImages, exercises, searchFilters);
  }, [allImages, exercises, searchQuery, filters, selectedTags, selectedExercises]);

  const searchStats = useMemo(() => {
    return imageSearchService.getSearchStats(allImages);
  }, [allImages]);

  // Generate suggestions when query changes
  useEffect(() => {
    if (searchQuery.length > 1) {
      const newSuggestions = imageSearchService.generateSearchSuggestions(
        allImages,
        exercises,
        searchQuery
      );
      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, allImages, exercises]);

  const categories = [
    { value: 'all' as const, label: 'Todas as Categorias', icon: '📋' },
    { value: 'initial_position' as ImageCategory, label: 'Posição Inicial', icon: '🏁' },
    { value: 'execution' as ImageCategory, label: 'Execução', icon: '⚡' },
    { value: 'final_position' as ImageCategory, label: 'Posição Final', icon: '🏆' },
    { value: 'anatomy' as ImageCategory, label: 'Anatomia', icon: '🫀' },
    { value: 'equipment' as ImageCategory, label: 'Equipamentos', icon: '🏋️' },
    { value: 'variation' as ImageCategory, label: 'Variações', icon: '♻️' },
  ];

  const handleApplySuggestion = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'tag') {
      if (!selectedTags.includes(suggestion.text)) {
        setSelectedTags([...selectedTags, suggestion.text]);
      }
    } else if (suggestion.type === 'exercise') {
      const exercise = exercises.find(ex => ex.name === suggestion.text);
      if (exercise && !selectedExercises.includes(exercise.id)) {
        setSelectedExercises([...selectedExercises, exercise.id]);
      }
    } else if (suggestion.type === 'category') {
      const category = categories.find(cat => cat.label === suggestion.text);
      if (category) {
        setFilters(prev => ({ ...prev, category: category.value }));
      }
    } else {
      setSearchQuery(suggestion.text);
    }
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleRemoveExercise = (exerciseToRemove: string) => {
    setSelectedExercises(selectedExercises.filter(id => id !== exerciseToRemove));
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ category: 'all', hasAnnotations: undefined });
    setSelectedTags([]);
    setSelectedExercises([]);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'tag': return '🏷️';
      case 'category': return '📂';
      case 'exercise': return '💪';
      case 'annotation': return '📍';
      default: return '🔍';
    }
  };

  const getMatchedFieldsDisplay = (result: ImageSearchResult) => {
    const fieldLabels: Record<string, string> = {
      'title': 'Título',
      'caption': 'Legenda',
      'tags': 'Tags',
      'exerciseName': 'Exercício',
      'exerciseDescription': 'Descrição',
      'annotations': 'Anotações',
      'category': 'Categoria',
    };

    return result.matchedFields
      .map(field => fieldLabels[field] || field)
      .join(', ');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Busca Avançada de Imagens" size="large">
      <div className="space-y-6">
        {/* Search Header */}
        <div className="space-y-4">
          {/* Main Search Bar */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar por título, descrição, tags, anotações..."
                className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                🔍
              </div>
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleApplySuggestion(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span>{getSuggestionIcon(suggestion.type)}</span>
                      <span className="text-sm">{suggestion.text}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {suggestion.count} imagem{suggestion.count !== 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.category || 'all'}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as ImageCategory | 'all' }))}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filters.hasAnnotations === undefined ? 'all' : filters.hasAnnotations ? 'yes' : 'no'}
              onChange={(e) => {
                const value = e.target.value === 'all' ? undefined : e.target.value === 'yes';
                setFilters(prev => ({ ...prev, hasAnnotations: value }));
              }}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📍 Todas as Imagens</option>
              <option value="yes">📍 Com Anotações</option>
              <option value="no">📍 Sem Anotações</option>
            </select>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              ⚙️ {showAdvancedFilters ? 'Ocultar' : 'Filtros Avançados'}
            </button>

            {(searchQuery || filters.category !== 'all' || filters.hasAnnotations !== undefined || selectedTags.length > 0 || selectedExercises.length > 0) && (
              <button
                onClick={handleClearFilters}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                🗑️ Limpar Filtros
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {(selectedTags.length > 0 || selectedExercises.length > 0) && (
            <div className="space-y-2">
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-slate-600">Tags:</span>
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      <span>🏷️ {tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-blue-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {selectedExercises.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-sm text-slate-600">Exercícios:</span>
                  {selectedExercises.map(exerciseId => {
                    const exercise = exercises.find(ex => ex.id === exerciseId);
                    return exercise ? (
                      <span
                        key={exerciseId}
                        className="inline-flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                      >
                        <span>💪 {exercise.name}</span>
                        <button
                          onClick={() => handleRemoveExercise(exerciseId)}
                          className="hover:text-green-600"
                        >
                          ×
                        </button>
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="bg-slate-50 rounded-lg p-4 space-y-4">
            <h4 className="font-medium text-slate-900">Filtros Avançados</h4>
            
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data Inicial
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const start = e.target.value ? new Date(e.target.value) : undefined;
                    setFilters(prev => ({
                      ...prev,
                      dateRange: start ? { ...prev.dateRange, start } : undefined
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data Final
                </label>
                <input
                  type="date"
                  onChange={(e) => {
                    const end = e.target.value ? new Date(e.target.value) : undefined;
                    setFilters(prev => ({
                      ...prev,
                      dateRange: end ? { ...prev.dateRange, end } : undefined
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* File Size Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tamanho Mínimo (KB)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  onChange={(e) => {
                    const min = e.target.value ? parseInt(e.target.value) * 1024 : undefined;
                    setFilters(prev => ({
                      ...prev,
                      fileSize: { ...prev.fileSize, min }
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tamanho Máximo (KB)
                </label>
                <input
                  type="number"
                  placeholder="10000"
                  onChange={(e) => {
                    const max = e.target.value ? parseInt(e.target.value) * 1024 : undefined;
                    setFilters(prev => ({
                      ...prev,
                      fileSize: { ...prev.fileSize, max }
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Search Stats */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{searchResults.length}</div>
              <div className="text-xs text-blue-600">Resultados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{searchStats.totalImages}</div>
              <div className="text-xs text-blue-600">Total de Imagens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{searchStats.annotatedImages}</div>
              <div className="text-xs text-blue-600">Com Anotações</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">
                {imageSearchService.formatFileSize(searchStats.totalSize)}
              </div>
              <div className="text-xs text-blue-600">Tamanho Total</div>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-900">
              Resultados da Busca ({searchResults.length})
            </h4>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <div className="text-4xl mb-2">🔍</div>
              <p className="font-medium">Nenhuma imagem encontrada</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 max-h-96 overflow-y-auto">
              {searchResults.map((result, index) => (
                <div
                  key={result.image.id}
                  className="group relative bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onSelectImage?.(result.image, result.exercise)}
                >
                  <div className="aspect-video bg-slate-100">
                    <LazyImage
                      src={result.image.thumbnailUrl || result.image.imageUrl}
                      alt={result.image.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="p-3">
                    <h5 className="font-medium text-sm text-slate-900 truncate">
                      {result.image.title}
                    </h5>
                    
                    <div className="mt-1 text-xs text-slate-500">
                      <div>📁 {result.exercise?.name || 'Exercício removido'}</div>
                      {result.matchedFields.length > 0 && (
                        <div className="mt-1 text-xs text-blue-600">
                          Matches: {getMatchedFieldsDisplay(result)}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                        Score: {result.relevanceScore}
                      </span>
                      
                      {result.image.annotationPoints && result.image.annotationPoints.length > 0 && (
                        <span className="text-xs text-blue-600">
                          📍 {result.image.annotationPoints.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default ImageSearchModal;