/**
 * Hook especializado para gerenciamento de exercícios com React Query
 * Extraído do useData massivo para melhor performance e manutenibilidade
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { Exercise, ExerciseLog, Prescription } from '../types';

import { useAuth } from './useAuth';

// Chaves de cache organizadas para exercícios
export const exerciseKeys = {
  all: ['exercises'] as const,
  lists: () => [...exerciseKeys.all, 'list'] as const,
  list: (tenantId: string) => [...exerciseKeys.lists(), tenantId] as const,
  details: () => [...exerciseKeys.all, 'detail'] as const,
  detail: (id: string) => [...exerciseKeys.details(), id] as const,
  byCategory: (category: string) => [...exerciseKeys.all, 'category', category] as const,
  byDifficulty: (difficulty: string) => [...exerciseKeys.all, 'difficulty', difficulty] as const,
  prescriptions: () => [...exerciseKeys.all, 'prescriptions'] as const,
  logs: () => [...exerciseKeys.all, 'logs'] as const,
  favorites: (userId: string) => [...exerciseKeys.all, 'favorites', userId] as const,
};

// Hook principal para listar exercícios
export const useExercises = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: exerciseKeys.list(currentTenant?.id || ''),
    queryFn: async () => {
      if (!currentTenant) return [];
      
      // Buscar exercícios do localStorage
      const storageKey = `fisioflow_exercises_${currentTenant.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000, // 10 minutos - exercícios mudam pouco
    gcTime: 30 * 60 * 1000, // 30 minutos
    retry: 2,
  });
};

// Hook para exercício específico
export const useExercise = (exerciseId: string) => {
  const { data: allExercises = [] } = useExercises();
  
  return useMemo(() => {
    return allExercises.find((exercise: Exercise) => exercise.id === exerciseId) || null;
  }, [allExercises, exerciseId]);
};

// Hook para exercícios por categoria
export const useExercisesByCategory = (category: string) => {
  const { data: allExercises = [] } = useExercises();
  
  return useMemo(() => {
    if (!category) return allExercises;
    
    return allExercises.filter((exercise: Exercise) => 
      exercise.category.toLowerCase() === category.toLowerCase()
    );
  }, [allExercises, category]);
};

// Hook para exercícios por dificuldade
export const useExercisesByDifficulty = (difficulty: string) => {
  const { data: allExercises = [] } = useExercises();
  
  return useMemo(() => {
    if (!difficulty) return allExercises;
    
    return allExercises.filter((exercise: Exercise) => 
      exercise.difficulty?.toLowerCase() === difficulty.toLowerCase()
    );
  }, [allExercises, difficulty]);
};

// Hook para prescrições de exercícios
export const usePrescriptions = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: [...exerciseKeys.prescriptions(), currentTenant?.id || ''],
    queryFn: async () => {
      if (!currentTenant) return [];
      
      const storageKey = `fisioflow_prescriptions_${currentTenant.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 15 * 60 * 1000,
  });
};

// Hook para prescrições de um paciente
export const usePatientPrescriptions = (patientId: string) => {
  const { data: allPrescriptions = [] } = usePrescriptions();
  
  return useMemo(() => {
    return allPrescriptions
      .filter((prescription: Prescription) => prescription.patientId === patientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allPrescriptions, patientId]);
};

// Hook para logs de exercícios
export const useExerciseLogs = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: [...exerciseKeys.logs(), currentTenant?.id || ''],
    queryFn: async () => {
      if (!currentTenant) return [];
      
      const storageKey = `fisioflow_exerciseLogs_${currentTenant.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!currentTenant,
    staleTime: 2 * 60 * 1000, // 2 minutos - logs são mais dinâmicos
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para logs de exercícios de um paciente
export const usePatientExerciseLogs = (patientId: string) => {
  const { data: allLogs = [] } = useExerciseLogs();
  
  return useMemo(() => {
    return allLogs
      .filter((log: ExerciseLog) => log.patientId === patientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allLogs, patientId]);
};

// Hook para exercícios favoritos
export const useFavoriteExercises = () => {
  const { user, currentTenant } = useAuth();
  
  return useQuery({
    queryKey: exerciseKeys.favorites(user?.id || ''),
    queryFn: async () => {
      if (!user || !currentTenant) return [];
      
      const storageKey = `fisioflow_exerciseFavorites_${user.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

// Mutation para salvar exercício
export const useSaveExercise = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (exercise: Exercise) => {
      if (!currentTenant) {
        throw new Error('Tenant não definido');
      }

      // Salvar no localStorage (temporário)
      const storageKey = `fisioflow_exercises_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const updated = exercise.id 
        ? existing.map((ex: Exercise) => ex.id === exercise.id ? exercise : ex)
        : [...existing, { ...exercise, id: `exercise_${Date.now()}` }];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return exercise;
    },
    onSuccess: (exercise) => {
      // Invalidar cache de lista
      queryClient.invalidateQueries({ queryKey: exerciseKeys.lists() });
      
      // Invalidar por categoria se aplicável
      if (exercise.category) {
        queryClient.invalidateQueries({ 
          queryKey: exerciseKeys.byCategory(exercise.category) 
        });
      }
      
      console.log('✅ Exercício salvo e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar exercício:', error);
    },
  });
};

// Mutation para prescrever exercício
export const usePrescribeExercise = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (prescription: Omit<Prescription, 'id' | 'createdAt' | 'tenantId'>) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      const newPrescription: Prescription = {
        ...prescription,
        id: `prescription_${Date.now()}`,
        createdAt: new Date().toISOString(),
        tenantId: currentTenant.id,
      };

      // Salvar no localStorage
      const storageKey = `fisioflow_prescriptions_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [...existing, newPrescription];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return newPrescription;
    },
    onSuccess: (prescription) => {
      // Invalidar cache de prescrições
      queryClient.invalidateQueries({ queryKey: exerciseKeys.prescriptions() });
      
      console.log('✅ Exercício prescrito com sucesso');
    },
    onError: (error) => {
      console.error('❌ Erro ao prescrever exercício:', error);
    },
  });
};

// Mutation para registrar log de exercício
export const useLogExercise = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (log: Omit<ExerciseLog, 'id' | 'tenantId'>) => {
      if (!currentTenant) {
        throw new Error('Tenant não definido');
      }

      const newLog: ExerciseLog = {
        ...log,
        id: `log_${Date.now()}`,
        tenantId: currentTenant.id,
      };

      // Salvar no localStorage
      const storageKey = `fisioflow_exerciseLogs_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [...existing, newLog];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return newLog;
    },
    onSuccess: () => {
      // Invalidar cache de logs
      queryClient.invalidateQueries({ queryKey: exerciseKeys.logs() });
      
      console.log('✅ Log de exercício registrado');
    },
    onError: (error) => {
      console.error('❌ Erro ao registrar log:', error);
    },
  });
};

// Mutation para favoritar exercício
export const useToggleFavoriteExercise = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (exerciseId: string) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const storageKey = `fisioflow_exerciseFavorites_${user.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const isFavorite = existing.includes(exerciseId);
      const updated = isFavorite 
        ? existing.filter((id: string) => id !== exerciseId)
        : [...existing, exerciseId];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return { exerciseId, isFavorite: !isFavorite };
    },
    onSuccess: () => {
      // Invalidar cache de favoritos
      queryClient.invalidateQueries({ queryKey: exerciseKeys.favorites(user?.id || '') });
    },
    onError: (error) => {
      console.error('❌ Erro ao favoritar exercício:', error);
    },
  });
};

// Hook para estatísticas de exercícios
export const useExercisesStats = () => {
  const { data: exercises = [] } = useExercises();
  const { data: logs = [] } = useExerciseLogs();
  const { data: prescriptions = [] } = usePrescriptions();

  return useMemo(() => {
    const totalExercises = exercises.length;
    
    // Categorias mais usadas
    const categoryStats = exercises.reduce((acc: Record<string, number>, exercise: Exercise) => {
      acc[exercise.category] = (acc[exercise.category] || 0) + 1;
      return acc;
    }, {});

    // Exercícios mais prescritos
    const prescriptionStats = prescriptions.reduce((acc: Record<string, number>, prescription: Prescription) => {
      prescription.exercises?.forEach(ex => {
        acc[ex.exerciseId] = (acc[ex.exerciseId] || 0) + 1;
      });
      return acc;
    }, {});

    // Logs recentes (última semana)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentLogs = logs.filter((log: ExerciseLog) => 
      new Date(log.date) >= weekAgo
    );

    return {
      totalExercises,
      categoriesCount: Object.keys(categoryStats).length,
      categoryStats,
      prescriptionStats,
      recentLogsCount: recentLogs.length,
      totalPrescriptions: prescriptions.length,
      totalLogs: logs.length,
    };
  }, [exercises, logs, prescriptions]);
};

// Hook para busca de exercícios
export const useExercisesSearch = (query: string) => {
  const { data: exercises = [] } = useExercises();

  return useMemo(() => {
    if (!query.trim()) return exercises;
    
    const searchTerm = query.toLowerCase();
    return exercises.filter((exercise: Exercise) => 
      exercise.name.toLowerCase().includes(searchTerm) ||
      exercise.description?.toLowerCase().includes(searchTerm) ||
      exercise.category.toLowerCase().includes(searchTerm) ||
      exercise.instructions?.toLowerCase().includes(searchTerm)
    );
  }, [exercises, query]);
};

// Hook para invalidar cache de exercícios
export const useInvalidateExercises = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: exerciseKeys.all });
  }, [queryClient]);
};

export default {
  useExercises,
  useExercise,
  useExercisesByCategory,
  useExercisesByDifficulty,
  usePrescriptions,
  usePatientPrescriptions,
  useExerciseLogs,
  usePatientExerciseLogs,
  useFavoriteExercises,
  useSaveExercise,
  usePrescribeExercise,
  useLogExercise,
  useToggleFavoriteExercise,
  useExercisesStats,
  useExercisesSearch,
  useInvalidateExercises,
};