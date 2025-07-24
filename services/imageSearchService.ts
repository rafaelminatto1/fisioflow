import { ExerciseImage, ImageCategory, Exercise, ImageAnnotation } from '../types';

export interface ImageSearchFilters {
  query?: string;
  category?: ImageCategory | 'all';
  tags?: string[];
  hasAnnotations?: boolean;
  exerciseIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  dimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  fileSize?: {
    min?: number; // bytes
    max?: number; // bytes
  };
}

export interface ImageSearchResult {
  image: ExerciseImage;
  exercise?: Exercise;
  relevanceScore: number;
  matchedFields: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'tag' | 'category' | 'exercise' | 'annotation';
  count: number;
}

class ImageSearchService {
  /**
   * Pesquisa avançada de imagens com filtros múltiplos
   */
  searchImages(
    images: ExerciseImage[],
    exercises: Exercise[],
    filters: ImageSearchFilters
  ): ImageSearchResult[] {
    let results: ImageSearchResult[] = [];

    // Convert images to search results
    results = images.map(image => {
      const exercise = exercises.find(ex => ex.id === image.exerciseId);
      return {
        image,
        exercise,
        relevanceScore: 0,
        matchedFields: [],
      };
    });

    // Apply filters and calculate relevance scores
    results = results.filter(result => {
      let score = 0;
      const matchedFields: string[] = [];

      // Text query filter
      if (filters.query && filters.query.trim()) {
        const query = filters.query.toLowerCase().trim();
        const queryScore = this.calculateTextRelevance(result, query);
        
        if (queryScore.score === 0) {
          return false; // No text match, exclude from results
        }
        
        score += queryScore.score;
        matchedFields.push(...queryScore.fields);
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        if (result.image.category !== filters.category) {
          return false;
        }
        score += 10;
        matchedFields.push('category');
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        const matchedTags = result.image.tags.filter(tag =>
          filters.tags!.some(filterTag => 
            tag.toLowerCase().includes(filterTag.toLowerCase())
          )
        );
        
        if (matchedTags.length === 0) {
          return false;
        }
        
        score += matchedTags.length * 5;
        matchedFields.push('tags');
      }

      // Annotations filter
      if (filters.hasAnnotations !== undefined) {
        const hasAnnotations = result.image.annotationPoints && result.image.annotationPoints.length > 0;
        if (hasAnnotations !== filters.hasAnnotations) {
          return false;
        }
        
        if (hasAnnotations) {
          score += 5;
          matchedFields.push('annotations');
        }
      }

      // Exercise IDs filter
      if (filters.exerciseIds && filters.exerciseIds.length > 0) {
        if (!filters.exerciseIds.includes(result.image.exerciseId)) {
          return false;
        }
        score += 8;
        matchedFields.push('exercise');
      }

      // Date range filter
      if (filters.dateRange) {
        const imageDate = new Date(result.image.uploadedAt);
        if (imageDate < filters.dateRange.start || imageDate > filters.dateRange.end) {
          return false;
        }
        score += 3;
        matchedFields.push('date');
      }

      // Dimensions filter
      if (filters.dimensions) {
        const { width, height } = result.image;
        const { minWidth, maxWidth, minHeight, maxHeight } = filters.dimensions;
        
        if (width && height) {
          if (minWidth && width < minWidth) return false;
          if (maxWidth && width > maxWidth) return false;
          if (minHeight && height < minHeight) return false;
          if (maxHeight && height > maxHeight) return false;
          
          score += 2;
          matchedFields.push('dimensions');
        }
      }

      // File size filter
      if (filters.fileSize && result.image.fileSize) {
        const { min, max } = filters.fileSize;
        const fileSize = result.image.fileSize;
        
        if (min && fileSize < min) return false;
        if (max && fileSize > max) return false;
        
        score += 1;
        matchedFields.push('fileSize');
      }

      result.relevanceScore = score;
      result.matchedFields = [...new Set(matchedFields)];
      
      return true;
    });

    // Sort by relevance score (highest first)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results;
  }

  /**
   * Calcula relevância de texto em múltiplos campos
   */
  private calculateTextRelevance(
    result: ImageSearchResult,
    query: string
  ): { score: number; fields: string[] } {
    const fields: string[] = [];
    let score = 0;

    // Search in image title (highest priority)
    if (result.image.title.toLowerCase().includes(query)) {
      score += 20;
      fields.push('title');
    }

    // Search in image caption
    if (result.image.caption?.toLowerCase().includes(query)) {
      score += 15;
      fields.push('caption');
    }

    // Search in tags
    const matchingTags = result.image.tags.filter(tag => 
      tag.toLowerCase().includes(query)
    );
    if (matchingTags.length > 0) {
      score += matchingTags.length * 10;
      fields.push('tags');
    }

    // Search in exercise name
    if (result.exercise?.name.toLowerCase().includes(query)) {
      score += 12;
      fields.push('exerciseName');
    }

    // Search in exercise description
    if (result.exercise?.description.toLowerCase().includes(query)) {
      score += 8;
      fields.push('exerciseDescription');
    }

    // Search in annotations
    if (result.image.annotationPoints) {
      const matchingAnnotations = result.image.annotationPoints.filter(annotation =>
        annotation.title.toLowerCase().includes(query) ||
        annotation.description?.toLowerCase().includes(query)
      );
      
      if (matchingAnnotations.length > 0) {
        score += matchingAnnotations.length * 6;
        fields.push('annotations');
      }
    }

    return { score, fields };
  }

  /**
   * Gera sugestões de busca baseadas nos dados disponíveis
   */
  generateSearchSuggestions(
    images: ExerciseImage[],
    exercises: Exercise[],
    query: string = ''
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Collect all unique tags
    const tagCounts = new Map<string, number>();
    images.forEach(image => {
      image.tags.forEach(tag => {
        if (!queryLower || tag.toLowerCase().includes(queryLower)) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      });
    });

    // Add tag suggestions
    Array.from(tagCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .forEach(([tag, count]) => {
        suggestions.push({
          text: tag,
          type: 'tag',
          count,
        });
      });

    // Add category suggestions
    const categoryCounts = new Map<string, number>();
    images.forEach(image => {
      const categoryLabel = this.getCategoryLabel(image.category);
      if (!queryLower || categoryLabel.toLowerCase().includes(queryLower)) {
        categoryCounts.set(categoryLabel, (categoryCounts.get(categoryLabel) || 0) + 1);
      }
    });

    Array.from(categoryCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        suggestions.push({
          text: category,
          type: 'category',
          count,
        });
      });

    // Add exercise suggestions
    const exerciseCounts = new Map<string, number>();
    exercises.forEach(exercise => {
      if (!queryLower || exercise.name.toLowerCase().includes(queryLower)) {
        const imageCount = images.filter(img => img.exerciseId === exercise.id).length;
        if (imageCount > 0) {
          exerciseCounts.set(exercise.name, imageCount);
        }
      }
    });

    Array.from(exerciseCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([exerciseName, count]) => {
        suggestions.push({
          text: exerciseName,
          type: 'exercise',
          count,
        });
      });

    // Add annotation suggestions
    const annotationCounts = new Map<string, number>();
    images.forEach(image => {
      if (image.annotationPoints) {
        image.annotationPoints.forEach(annotation => {
          if (!queryLower || annotation.title.toLowerCase().includes(queryLower)) {
            annotationCounts.set(annotation.title, (annotationCounts.get(annotation.title) || 0) + 1);
          }
        });
      }
    });

    Array.from(annotationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .forEach(([annotationTitle, count]) => {
        suggestions.push({
          text: annotationTitle,
          type: 'annotation',
          count,
        });
      });

    return suggestions.slice(0, 20); // Limit total suggestions
  }

  /**
   * Obtém estatísticas de busca
   */
  getSearchStats(images: ExerciseImage[]): {
    totalImages: number;
    categoryCounts: Record<string, number>;
    tagCounts: Record<string, number>;
    annotatedImages: number;
    averageFileSize: number;
    totalSize: number;
  } {
    const categoryCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    let annotatedImages = 0;
    let totalSize = 0;

    images.forEach(image => {
      // Category counts
      categoryCounts[image.category] = (categoryCounts[image.category] || 0) + 1;

      // Tag counts
      image.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Annotations
      if (image.annotationPoints && image.annotationPoints.length > 0) {
        annotatedImages++;
      }

      // File size
      if (image.fileSize) {
        totalSize += image.fileSize;
      }
    });

    return {
      totalImages: images.length,
      categoryCounts,
      tagCounts,
      annotatedImages,
      averageFileSize: images.length > 0 ? totalSize / images.length : 0,
      totalSize,
    };
  }

  /**
   * Obtém label da categoria
   */
  private getCategoryLabel(category: ImageCategory): string {
    const labels: Record<ImageCategory, string> = {
      'initial_position': 'Posição Inicial',
      'execution': 'Execução',
      'final_position': 'Posição Final',
      'anatomy': 'Anatomia',
      'equipment': 'Equipamentos',
      'variation': 'Variação'
    };
    return labels[category] || category;
  }

  /**
   * Formata tamanho de arquivo
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  }

  /**
   * Extrai palavras-chave de uma query
   */
  extractKeywords(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''));
  }
}

export const imageSearchService = new ImageSearchService();