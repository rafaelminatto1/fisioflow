import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import type { 
  Exercise, 
  ExerciseSchema, 
  ApiResponse, 
  PaginatedResponse, 
  BaseFilters,
  CreateData,
  UpdateData 
} from '../types';

import { useAuth } from './useAuth';

// ============================================================================
// TIPOS E SCHEMAS ESPECÍFICOS
// ============================================================================

// Filtros específicos para exercícios
export interface ExerciseFilters extends BaseFilters {
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  bodyParts?: string[];
  equipment?: string[];
  isCustom?: boolean;
  createdBy?: string;
  tags?: string[];
}

// Schema para criação de exercício
const CreateExerciseSchema = ExerciseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema para atualização de exercício
const UpdateExerciseSchema = CreateExerciseSchema.partial();

type CreateExerciseData = z.infer<typeof CreateExerciseSchema>;
type UpdateExerciseData = z.infer<typeof UpdateExerciseSchema>;

// ============================================================================
// SIMULAÇÃO DE API (substituir por chamadas reais)
// ============================================================================

const API_BASE = '/api/exercises';

// Simular delay de rede
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data para desenvolvimento
const mockExercises: Exercise[] = [
  {
    id: '1',
    name: 'Alongamento de Pescoço',
    description: 'Exercício para alívio de tensão no pescoço',
    instructions: '1. Sente-se ereto\n2. Incline a cabeça para a direita\n3. Mantenha por 15 segundos\n4. Repita para o outro lado',
    duration: 5,
    repetitions: 3,
    sets: 2,
    difficulty: 'beginner',
    category: 'Alongamento',
    tags: ['pescoço', 'tensão', 'escritório'],
    bodyParts: ['pescoço', 'trapézio'],
    equipment: [],
    isCustom: false,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Fortalecimento de Core',
    description: 'Exercício para fortalecimento do core',
    instructions: '1. Deite-se de costas\n2. Flexione os joelhos\n3. Levante o tronco\n4. Mantenha por 10 segundos',
    duration: 10,
    repetitions: 15,
    sets: 3,
    difficulty: 'intermediate',
    category: 'Fortalecimento',
    tags: ['core', 'abdômen', 'estabilidade'],
    bodyParts: ['abdômen', 'core'],
    equipment: ['tapete'],
    isCustom: false,
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

// Funções de API simuladas
const exerciseApi = {
  // Buscar exercícios com filtros
  getExercises: async (filters: ExerciseFilters = {}): Promise<PaginatedResponse<Exercise>> => {
    await delay(500);
    
    let filteredExercises = [...mockExercises];
    
    // Aplicar filtros
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.name.toLowerCase().includes(search) ||
        exercise.description.toLowerCase().includes(search) ||
        exercise.category.toLowerCase().includes(search) ||
        exercise.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }
    
    if (filters.category) {
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.category === filters.category
      );
    }
    
    if (filters.difficulty) {
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.difficulty === filters.difficulty
      );
    }
    
    if (filters.bodyParts?.length) {
      filteredExercises = filteredExercises.filter(exercise => 
        filters.bodyParts!.some(part => exercise.bodyParts.includes(part))
      );
    }
    
    if (filters.equipment?.length) {
      filteredExercises = filteredExercises.filter(exercise => 
        filters.equipment!.every(equip => exercise.equipment?.includes(equip))
      );
    }
    
    if (typeof filters.isCustom === 'boolean') {
      filteredExercises = filteredExercises.filter(exercise => 
        exercise.isCustom === filters.isCustom
      );
    }
    
    // Paginação
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredExercises.slice(startIndex, endIndex);
    
    return {
      data: paginatedData,
      meta: {
        total: filteredExercises.length,
        page,
        limit,
        totalPages: Math.ceil(filteredExercises.length / limit),
        hasNext: endIndex < filteredExercises.length,
        hasPrev: page > 1,
      },
    };
  },
  
  // Buscar exercício por ID
  getExercise: async (id: string): Promise<Exercise> => {
    await delay(300);
    const exercise = mockExercises.find(e => e.id === id);
    if (!exercise) {
      throw new Error('Exercício não encontrado');
    }
    return exercise;
  },
  
  // Criar exercício
  createExercise: async (data: CreateExerciseData): Promise<Exercise> => {
    await delay(800);
    
    const newExercise: Exercise = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockExercises.push(newExercise);
    return newExercise;
  },
  
  // Atualizar exercício
  updateExercise: async (id: string, data: UpdateExerciseData): Promise<Exercise> => {
    await delay(600);
    
    const index = mockExercises.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Exercício não encontrado');
    }
    
    const updatedExercise = {
      ...mockExercises[index],
      ...data,
      updatedAt: new Date(),
    };
    
    mockExercises[index] = updatedExercise;
    return updatedExercise;
  },
  
  // Deletar exercício
  deleteExercise: async (id: string): Promise<void> => {
    await delay(400);
    
    const index = mockExercises.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Exercício não encontrado');
    }
    
    mockExercises.splice(index, 1);
  },
  
  // Duplicar exercício
  duplicateExercise: async (id: string): Promise<Exercise> => {
    await delay(500);
    
    const original = mockExercises.find(e => e.id === id);
    if (!original) {
      throw new Error('Exercício não encontrado');
    }
    
    const duplicated: Exercise = {
      ...original,
      id: Date.now().toString(),
      name: `${original.name} (Cópia)`,
      isCustom: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockExercises.push(duplicated);
    return duplicated;
  },
  
  // Buscar categorias disponíveis
  getCategories: async (): Promise<string[]> => {
    await delay(200);
    const categories = [...new Set(mockExercises.map(e => e.category))];
    return categories.sort();
  },
  
  // Buscar partes do corpo disponíveis
  getBodyParts: async (): Promise<string[]> => {
    await delay(200);
    const bodyParts = [...new Set(mockExercises.flatMap(e => e.bodyParts))];
    return bodyParts.sort();
  },
  
  // Buscar equipamentos disponíveis
  getEquipment: async (): Promise<string[]> => {
    await delay(200);
    const equipment = [...new Set(mockExercises.flatMap(e => e.equipment || []))];
    return equipment.sort();
  },
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export const useExercises = (filters: ExerciseFilters = {}) => {
  const { checkLimit, tier } = useAuth();
  const queryClient = useQueryClient();
  
  // Query para buscar exercícios
  const exercisesQuery = useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => exerciseApi.getExercises(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
  
  // Query para categorias
  const categoriesQuery = useQuery({
    queryKey: ['exercise-categories'],
    queryFn: exerciseApi.getCategories,
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
  
  // Query para partes do corpo
  const bodyPartsQuery = useQuery({
    queryKey: ['exercise-body-parts'],
    queryFn: exerciseApi.getBodyParts,
    staleTime: 30 * 60 * 1000,
  });
  
  // Query para equipamentos
  const equipmentQuery = useQuery({
    queryKey: ['exercise-equipment'],
    queryFn: exerciseApi.getEquipment,
    staleTime: 30 * 60 * 1000,
  });
  
  // Mutation para criar exercício
  const createMutation = useMutation({
    mutationFn: (data: CreateExerciseData) => {
      // Verificar limite antes de criar
      if (!checkLimit('exercises')) {
        throw new Error('Limite de exercícios atingido para seu plano');
      }
      
      // Validar dados
      const validatedData = CreateExerciseSchema.parse(data);
      return exerciseApi.createExercise(validatedData);
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-categories'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-body-parts'] });
      queryClient.invalidateQueries({ queryKey: ['exercise-equipment'] });
    },
  });
  
  // Mutation para atualizar exercício
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExerciseData }) => {
      const validatedData = UpdateExerciseSchema.parse(data);
      return exerciseApi.updateExercise(id, validatedData);
    },
    onSuccess: (updatedExercise) => {
      // Atualizar cache específico
      queryClient.setQueryData(['exercise', updatedExercise.id], updatedExercise);
      // Invalidar lista
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
  
  // Mutation para deletar exercício
  const deleteMutation = useMutation({
    mutationFn: exerciseApi.deleteExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
  
  // Mutation para duplicar exercício
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => {
      if (!checkLimit('exercises')) {
        throw new Error('Limite de exercícios atingido para seu plano');
      }
      return exerciseApi.duplicateExercise(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
  
  // Funções auxiliares
  const canCreateCustomExercises = tier !== 'free';
  const canUseAdvancedFilters = tier === 'enterprise';
  
  return {
    // Dados
    exercises: exercisesQuery.data?.data || [],
    meta: exercisesQuery.data?.meta,
    categories: categoriesQuery.data || [],
    bodyParts: bodyPartsQuery.data || [],
    equipment: equipmentQuery.data || [],
    
    // Estados de loading
    isLoading: exercisesQuery.isLoading,
    isError: exercisesQuery.isError,
    error: exercisesQuery.error,
    
    // Mutations
    createExercise: createMutation.mutate,
    updateExercise: updateMutation.mutate,
    deleteExercise: deleteMutation.mutate,
    duplicateExercise: duplicateMutation.mutate,
    
    // Estados das mutations
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isDuplicating: duplicateMutation.isPending,
    
    // Capacidades baseadas no tier
    canCreateCustomExercises,
    canUseAdvancedFilters,
    
    // Funções utilitárias
    refetch: exercisesQuery.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
  };
};

// ============================================================================
// HOOK PARA EXERCÍCIO ESPECÍFICO
// ============================================================================

export const useExercise = (id: string) => {
  const queryClient = useQueryClient();
  
  const exerciseQuery = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseApi.getExercise(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
  
  return {
    exercise: exerciseQuery.data,
    isLoading: exerciseQuery.isLoading,
    isError: exerciseQuery.isError,
    error: exerciseQuery.error,
    refetch: exerciseQuery.refetch,
  };
};

// ============================================================================
// HOOKS AUXILIARES
// ============================================================================

// Hook para buscar exercícios por categoria
export const useExercisesByCategory = (category: string) => {
  return useExercises({ category });
};

// Hook para buscar exercícios por dificuldade
export const useExercisesByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced') => {
  return useExercises({ difficulty });
};

// Hook para buscar exercícios customizados
export const useCustomExercises = () => {
  return useExercises({ isCustom: true });
};

// Hook para estatísticas de exercícios
export const useExerciseStats = () => {
  const { exercises } = useExercises();
  
  const stats = React.useMemo(() => {
    const total = exercises.length;
    const byDifficulty = exercises.reduce((acc, exercise) => {
      acc[exercise.difficulty] = (acc[exercise.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCategory = exercises.reduce((acc, exercise) => {
      acc[exercise.category] = (acc[exercise.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const customCount = exercises.filter(e => e.isCustom).length;
    
    return {
      total,
      byDifficulty,
      byCategory,
      customCount,
      standardCount: total - customCount,
    };
  }, [exercises]);
  
  return stats;
};

export default useExercises;