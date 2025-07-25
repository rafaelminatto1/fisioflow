import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Assessment, User } from '../../types';

// Simulação de API - substituir por chamadas reais
const assessmentsApi = {
  getAll: async (): Promise<Assessment[]> => {
    // Simular delay de rede
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorage.getItem('fisioflow_assessments');
    return stored ? JSON.parse(stored) : [];
  },

  save: async (assessment: Assessment, user: User): Promise<Assessment> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = localStorage.getItem('fisioflow_assessments');
    const assessments: Assessment[] = stored ? JSON.parse(stored) : [];

    const now = new Date().toISOString();
    const savedAssessment: Assessment = {
      ...assessment,
      id:
        assessment.id ||
        `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      updatedAt: now,
      createdAt: assessment.createdAt || now,
    };

    const existingIndex = assessments.findIndex(
      (a) => a.id === savedAssessment.id
    );
    if (existingIndex >= 0) {
      assessments[existingIndex] = savedAssessment;
    } else {
      assessments.push(savedAssessment);
    }

    localStorage.setItem('fisioflow_assessments', JSON.stringify(assessments));
    return savedAssessment;
  },

  delete: async (assessmentId: string, user: User): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const stored = localStorage.getItem('fisioflow_assessments');
    const assessments: Assessment[] = stored ? JSON.parse(stored) : [];

    const filtered = assessments.filter((a) => a.id !== assessmentId);
    localStorage.setItem('fisioflow_assessments', JSON.stringify(filtered));
  },

  getByPatientId: async (patientId: string): Promise<Assessment[]> => {
    const all = await assessmentsApi.getAll();
    return all.filter((assessment) => assessment.patientId === patientId);
  },

  getByTherapistId: async (therapistId: string): Promise<Assessment[]> => {
    const all = await assessmentsApi.getAll();
    return all.filter((assessment) => assessment.therapistId === therapistId);
  },
};

export interface UseAssessmentsReturn {
  // Data
  assessments: Assessment[];
  loading: boolean;
  error: Error | null;

  // Actions
  addAssessment: (
    assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>,
    user: User
  ) => Promise<void>;
  updateAssessment: (assessment: Assessment, user: User) => Promise<void>;
  removeAssessment: (assessmentId: string, user: User) => Promise<void>;

  // Queries
  getAssessmentsByPatient: (patientId: string) => Assessment[];
  getAssessmentsByTherapist: (therapistId: string) => Assessment[];

  // Utils
  refetch: () => void;
  invalidate: () => void;
}

/**
 * Hook para gerenciar avaliações de pacientes
 *
 * Funcionalidades:
 * - Listagem de avaliações
 * - Criação de novas avaliações
 * - Atualização de avaliações existentes
 * - Exclusão de avaliações
 * - Filtros por paciente e terapeuta
 * - Cache otimizado com React Query
 *
 * @returns {UseAssessmentsReturn} Objeto com dados e funções para gerenciar avaliações
 */
export const useAssessments = (): UseAssessmentsReturn => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Query para buscar todas as avaliações
  const {
    data: assessments = [],
    isLoading: loading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // Mutation para adicionar avaliação
  const addMutation = useMutation({
    mutationFn: ({
      assessment,
      user,
    }: {
      assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>;
      user: User;
    }) => assessmentsApi.save(assessment as Assessment, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao adicionar avaliação:', error);
    },
  });

  // Mutation para atualizar avaliação
  const updateMutation = useMutation({
    mutationFn: ({
      assessment,
      user,
    }: {
      assessment: Assessment;
      user: User;
    }) => assessmentsApi.save(assessment, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao atualizar avaliação:', error);
    },
  });

  // Mutation para remover avaliação
  const removeMutation = useMutation({
    mutationFn: ({
      assessmentId,
      user,
    }: {
      assessmentId: string;
      user: User;
    }) => assessmentsApi.delete(assessmentId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao remover avaliação:', error);
    },
  });

  // Actions
  const addAssessment = useCallback(
    async (
      assessment: Omit<Assessment, 'id' | 'createdAt' | 'updatedAt'>,
      user: User
    ) => {
      await addMutation.mutateAsync({ assessment, user });
    },
    [addMutation]
  );

  const updateAssessment = useCallback(
    async (assessment: Assessment, user: User) => {
      await updateMutation.mutateAsync({ assessment, user });
    },
    [updateMutation]
  );

  const removeAssessment = useCallback(
    async (assessmentId: string, user: User) => {
      await removeMutation.mutateAsync({ assessmentId, user });
    },
    [removeMutation]
  );

  // Queries
  const getAssessmentsByPatient = useCallback(
    (patientId: string): Assessment[] => {
      return assessments.filter(
        (assessment) => assessment.patientId === patientId
      );
    },
    [assessments]
  );

  const getAssessmentsByTherapist = useCallback(
    (therapistId: string): Assessment[] => {
      return assessments.filter(
        (assessment) => assessment.therapistId === therapistId
      );
    },
    [assessments]
  );

  // Utils
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['assessments'] });
  }, [queryClient]);

  // Sync error states
  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  return {
    // Data
    assessments,
    loading:
      loading ||
      addMutation.isPending ||
      updateMutation.isPending ||
      removeMutation.isPending,
    error,

    // Actions
    addAssessment,
    updateAssessment,
    removeAssessment,

    // Queries
    getAssessmentsByPatient,
    getAssessmentsByTherapist,

    // Utils
    refetch,
    invalidate,
  };
};

export default useAssessments;
