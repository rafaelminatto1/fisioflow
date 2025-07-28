import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

import { Prescription, User } from '../../types';

// Simulação de API - substituir por chamadas reais
const prescriptionsApi = {
  getAll: async (): Promise<Prescription[]> => {
    // Simular delay de rede
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorage.getItem('fisioflow_prescriptions');
    return stored ? JSON.parse(stored) : [];
  },

  save: async (
    prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>,
    user: User
  ): Promise<Prescription> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = localStorage.getItem('fisioflow_prescriptions');
    const prescriptions: Prescription[] = stored ? JSON.parse(stored) : [];

    const now = new Date().toISOString();
    const savedPrescription: Prescription = {
      ...prescription,
      id: `presc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
      createdById: user.id,
    };

    prescriptions.push(savedPrescription);
    localStorage.setItem(
      'fisioflow_prescriptions',
      JSON.stringify(prescriptions)
    );
    return savedPrescription;
  },

  update: async (
    prescriptionId: string,
    updates: Partial<Prescription>,
    user: User
  ): Promise<Prescription> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = localStorage.getItem('fisioflow_prescriptions');
    const prescriptions: Prescription[] = stored ? JSON.parse(stored) : [];

    const index = prescriptions.findIndex((p) => p.id === prescriptionId);
    if (index === -1) {
      throw new Error('Prescrição não encontrada');
    }

    const updatedPrescription = {
      ...prescriptions[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedById: user.id,
    };

    prescriptions[index] = updatedPrescription;
    localStorage.setItem(
      'fisioflow_prescriptions',
      JSON.stringify(prescriptions)
    );
    return updatedPrescription;
  },

  delete: async (prescriptionId: string, user: User): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const stored = localStorage.getItem('fisioflow_prescriptions');
    const prescriptions: Prescription[] = stored ? JSON.parse(stored) : [];

    const filtered = prescriptions.filter((p) => p.id !== prescriptionId);
    localStorage.setItem('fisioflow_prescriptions', JSON.stringify(filtered));
  },

  getByPatientId: async (patientId: string): Promise<Prescription[]> => {
    const all = await prescriptionsApi.getAll();
    return all.filter((prescription) => prescription.patientId === patientId);
  },

  getByStatus: async (status: string): Promise<Prescription[]> => {
    const all = await prescriptionsApi.getAll();
    return all.filter((prescription) => prescription.status === status);
  },

  getByDateRange: async (
    startDate: string,
    endDate: string
  ): Promise<Prescription[]> => {
    const all = await prescriptionsApi.getAll();
    return all.filter((prescription) => {
      const prescDate = new Date(prescription.createdAt);
      const start = new Date(startDate);
      const end = new Date(endDate);
      return prescDate >= start && prescDate <= end;
    });
  },
};

export interface UsePrescriptionsReturn {
  // Data
  prescriptions: Prescription[];
  loading: boolean;
  error: Error | null;

  // Actions
  createPrescription: (
    prescription: Omit<
      Prescription,
      'id' | 'createdAt' | 'updatedAt' | 'createdById'
    >,
    user: User
  ) => Promise<Prescription>;
  updatePrescription: (
    prescriptionId: string,
    updates: Partial<Prescription>,
    user: User
  ) => Promise<Prescription>;
  deletePrescription: (prescriptionId: string, user: User) => Promise<void>;

  // Queries
  getPrescriptionsByPatient: (patientId: string) => Prescription[];
  getPrescriptionsByStatus: (status: string) => Prescription[];
  getActivePrescriptions: () => Prescription[];
  getExpiredPrescriptions: () => Prescription[];

  // Utils
  isPrescriptionExpired: (prescription: Prescription) => boolean;
  getDaysUntilExpiry: (prescription: Prescription) => number;
  formatPrescriptionDuration: (prescription: Prescription) => string;
  refetch: () => void;
  invalidate: () => void;
}

/**
 * Hook para gerenciar prescrições de pacientes
 *
 * Funcionalidades:
 * - Listagem de prescrições
 * - Criação de novas prescrições
 * - Atualização de prescrições existentes
 * - Exclusão de prescrições
 * - Filtros por paciente, status e data
 * - Verificação de expiração
 * - Cálculo de duração
 * - Cache otimizado com React Query
 *
 * @returns {UsePrescriptionsReturn} Objeto com dados e funções para gerenciar prescrições
 */
export const usePrescriptions = (): UsePrescriptionsReturn => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Query para buscar todas as prescrições
  const {
    data: prescriptions = [],
    isLoading: loading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['prescriptions'],
    queryFn: prescriptionsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // Mutation para criar prescrição
  const createMutation = useMutation({
    mutationFn: ({
      prescription,
      user,
    }: {
      prescription: Omit<
        Prescription,
        'id' | 'createdAt' | 'updatedAt' | 'createdById'
      >;
      user: User;
    }) => prescriptionsApi.save(prescription, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao criar prescrição:', error);
    },
  });

  // Mutation para atualizar prescrição
  const updateMutation = useMutation({
    mutationFn: ({
      prescriptionId,
      updates,
      user,
    }: {
      prescriptionId: string;
      updates: Partial<Prescription>;
      user: User;
    }) => prescriptionsApi.update(prescriptionId, updates, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao atualizar prescrição:', error);
    },
  });

  // Mutation para deletar prescrição
  const deleteMutation = useMutation({
    mutationFn: ({
      prescriptionId,
      user,
    }: {
      prescriptionId: string;
      user: User;
    }) => prescriptionsApi.delete(prescriptionId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao deletar prescrição:', error);
    },
  });

  // Actions
  const createPrescription = useCallback(
    async (
      prescription: Omit<
        Prescription,
        'id' | 'createdAt' | 'updatedAt' | 'createdById'
      >,
      user: User
    ): Promise<Prescription> => {
      return await createMutation.mutateAsync({ prescription, user });
    },
    [createMutation]
  );

  const updatePrescription = useCallback(
    async (
      prescriptionId: string,
      updates: Partial<Prescription>,
      user: User
    ): Promise<Prescription> => {
      return await updateMutation.mutateAsync({
        prescriptionId,
        updates,
        user,
      });
    },
    [updateMutation]
  );

  const deletePrescription = useCallback(
    async (prescriptionId: string, user: User) => {
      await deleteMutation.mutateAsync({ prescriptionId, user });
    },
    [deleteMutation]
  );

  // Queries
  const getPrescriptionsByPatient = useCallback(
    (patientId: string): Prescription[] => {
      return prescriptions.filter(
        (prescription) => prescription.patientId === patientId
      );
    },
    [prescriptions]
  );

  const getPrescriptionsByStatus = useCallback(
    (status: string): Prescription[] => {
      return prescriptions.filter(
        (prescription) => prescription.status === status
      );
    },
    [prescriptions]
  );

  const getActivePrescriptions = useCallback((): Prescription[] => {
    return prescriptions.filter(
      (prescription) =>
        prescription.status === 'active' && !isPrescriptionExpired(prescription)
    );
  }, [prescriptions]);

  const getExpiredPrescriptions = useCallback((): Prescription[] => {
    return prescriptions.filter((prescription) =>
      isPrescriptionExpired(prescription)
    );
  }, [prescriptions]);

  // Utils
  const isPrescriptionExpired = useCallback(
    (prescription: Prescription): boolean => {
      if (!prescription.endDate) return false;
      return new Date(prescription.endDate) < new Date();
    },
    []
  );

  const getDaysUntilExpiry = useCallback(
    (prescription: Prescription): number => {
      if (!prescription.endDate) return Infinity;
      const today = new Date();
      const endDate = new Date(prescription.endDate);
      const diffTime = endDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    },
    []
  );

  const formatPrescriptionDuration = useCallback(
    (prescription: Prescription): string => {
      if (!prescription.startDate || !prescription.endDate) {
        return 'Duração indefinida';
      }

      const start = new Date(prescription.startDate);
      const end = new Date(prescription.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) return '1 dia';
      if (diffDays < 7) return `${diffDays} dias`;
      if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        const remainingDays = diffDays % 7;
        if (remainingDays === 0) {
          return weeks === 1 ? '1 semana' : `${weeks} semanas`;
        }
        return `${weeks} semana${weeks > 1 ? 's' : ''} e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
      }

      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (remainingDays === 0) {
        return months === 1 ? '1 mês' : `${months} meses`;
      }
      return `${months} mês${months > 1 ? 'es' : ''} e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
    },
    []
  );

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
  }, [queryClient]);

  // Sync error states
  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  return {
    // Data
    prescriptions,
    loading:
      loading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error,

    // Actions
    createPrescription,
    updatePrescription,
    deletePrescription,

    // Queries
    getPrescriptionsByPatient,
    getPrescriptionsByStatus,
    getActivePrescriptions,
    getExpiredPrescriptions,

    // Utils
    isPrescriptionExpired,
    getDaysUntilExpiry,
    formatPrescriptionDuration,
    refetch,
    invalidate,
  };
};

export default usePrescriptions;
