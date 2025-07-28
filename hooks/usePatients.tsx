/**
 * Hook especializado para gerenciamento de pacientes com React Query
 * Substitui a lógica de pacientes do useData massivo para melhor performance
 * Implementa cache inteligente, invalidação automática e operações otimizadas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { auditLogger, AuditAction, LegalBasis } from '../services/auditLogger';
import { Patient, User } from '../types';

import { useAuth } from './useAuth';
import { useSecureData } from './useSecureData';

// Chaves de cache organizadas para React Query
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (tenantId: string) => [...patientKeys.lists(), tenantId] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
  search: (query: string) => [...patientKeys.all, 'search', query] as const,
  filtered: (filters: any) => [...patientKeys.all, 'filtered', filters] as const,
};

// Hook principal para listar pacientes com cache inteligente
export const usePatients = () => {
  const { currentTenant } = useAuth();
  const { getAllSecurePatients } = useSecureData();

  return useQuery({
    queryKey: patientKeys.list(currentTenant?.id || ''),
    queryFn: async () => {
      if (!currentTenant) return [];
      
      // TODO: Implementar masterKey management seguro
      const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
      return await getAllSecurePatients(currentTenant.id, masterKey);
    },
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutos - dados ficam "fresh"
    gcTime: 10 * 60 * 1000, // 10 minutos - dados permanecem no cache
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // backoff exponencial
  });
};

// Hook para paciente específico com cache individual
export const usePatient = (patientId: string) => {
  const { user, currentTenant } = useAuth();
  const { getSecurePatient } = useSecureData();

  return useQuery({
    queryKey: patientKeys.detail(patientId),
    queryFn: async () => {
      if (!currentTenant || !patientId) return null;
      
      const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
      return await getSecurePatient(patientId, masterKey, user);
    },
    enabled: !!currentTenant && !!patientId,
    staleTime: 2 * 60 * 1000, // 2 minutos para dados específicos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para busca de pacientes com memoização
export const usePatientsSearch = (query: string) => {
  const { data: patients = [] } = usePatients();

  return useMemo(() => {
    if (!query.trim()) return patients;
    
    const searchTerm = query.toLowerCase();
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(searchTerm) ||
      patient.email?.toLowerCase().includes(searchTerm) ||
      patient.phone?.includes(searchTerm)
    );
  }, [patients, query]);
};

// Mutation para salvar paciente com invalidação automática de cache
export const useSavePatient = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();
  const { saveSecurePatient } = useSecureData();

  return useMutation({
    mutationFn: async (patient: Patient) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
      await saveSecurePatient(patient, user, masterKey);
      return patient;
    },
    onSuccess: (patient) => {
      // Invalidar cache de lista para recarregar dados
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      // Atualizar cache específico do paciente
      queryClient.setQueryData(patientKeys.detail(patient.id), patient);
      
      console.log('✅ Paciente salvo e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar paciente:', error);
    },
  });
};

// Mutation para deletar paciente
export const useDeletePatient = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();
  const { deleteSecurePatient } = useSecureData();

  return useMutation({
    mutationFn: async ({ patientId, reason }: { patientId: string; reason: string }) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      await deleteSecurePatient(patientId, user, reason);
      return patientId;
    },
    onSuccess: (patientId) => {
      // Remover do cache específico
      queryClient.removeQueries({ queryKey: patientKeys.detail(patientId) });
      
      // Invalidar lista para atualizar
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      
      console.log('✅ Paciente removido e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao deletar paciente:', error);
    },
  });
};

// Hook para pacientes filtrados por status
export const usePatientsFiltered = (filters: {
  status?: string;
  therapist?: string;
  dateRange?: { start: string; end: string };
}) => {
  const { data: patients = [] } = usePatients();

  return useMemo(() => {
    return patients.filter(patient => {
      if (filters.status && patient.status !== filters.status) return false;
      if (filters.therapist && patient.assignedTherapist !== filters.therapist) return false;
      
      if (filters.dateRange) {
        const patientDate = new Date(patient.createdAt);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (patientDate < startDate || patientDate > endDate) return false;
      }
      
      return true;
    });
  }, [patients, filters]);
};

// Hook para estatísticas otimizadas de pacientes
export const usePatientsStats = () => {
  const { data: patients = [] } = usePatients();

  return useMemo(() => {
    const totalPatients = patients.length;
    const activePatients = patients.filter(p => p.status === 'active').length;
    const newThisMonth = patients.filter(p => {
      const patientDate = new Date(p.createdAt);
      const now = new Date();
      return patientDate.getMonth() === now.getMonth() && 
             patientDate.getFullYear() === now.getFullYear();
    }).length;

    const statusBreakdown = patients.reduce((acc, patient) => {
      acc[patient.status] = (acc[patient.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPatients,
      activePatients,
      newThisMonth,
      statusBreakdown,
      inactivePatients: totalPatients - activePatients,
      growthRate: totalPatients > 0 ? (newThisMonth / totalPatients) * 100 : 0
    };
  }, [patients]);
};

// Hook para prefetch de paciente (otimização)
export const usePrefetchPatient = () => {
  const queryClient = useQueryClient();
  const { getSecurePatient } = useSecureData();
  const { user, currentTenant } = useAuth();

  return useCallback(
    (patientId: string) => {
      queryClient.prefetchQuery({
        queryKey: patientKeys.detail(patientId),
        queryFn: async () => {
          if (!currentTenant) return null;
          const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
          return await getSecurePatient(patientId, masterKey, user);
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    [queryClient, getSecurePatient, user, currentTenant]
  );
};

// Hook otimizado para listagem com paginação
export const usePatientsWithPagination = (
  page: number = 1, 
  pageSize: number = 20,
  filters?: any
) => {
  const { data: allPatients = [], isLoading, error } = usePatients();
  
  return useMemo(() => {
    let filteredPatients = allPatients;
    
    // Aplicar filtros se fornecidos
    if (filters) {
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredPatients = filteredPatients.filter(patient =>
          patient.name.toLowerCase().includes(searchTerm) ||
          patient.email?.toLowerCase().includes(searchTerm)
        );
      }
      
      if (filters.status) {
        filteredPatients = filteredPatients.filter(p => p.status === filters.status);
      }
    }

    // Calcular paginação
    const totalItems = filteredPatients.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedPatients = filteredPatients.slice(startIndex, endIndex);

    return {
      patients: paginatedPatients,
      pagination: {
        currentPage: page,
        pageSize,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
      isLoading,
      error,
    };
  }, [allPatients, page, pageSize, filters, isLoading, error]);
};

// Hook para invalidar cache de pacientes
export const useInvalidatePatients = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: patientKeys.all });
  }, [queryClient]);
};

// Compatibilidade: Hook que simula a interface antiga para não quebrar componentes existentes
export const usePatientsLegacy = () => {
  const { data: patients = [], isLoading, error } = usePatients();
  const savePatient = useSavePatient();
  const deletePatient = useDeletePatient();

  return {
    patients,
    addPatient: (patient: Omit<Patient, 'id'>) => {
      const newPatient = {
        ...patient,
        id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Patient;
      savePatient.mutate(newPatient);
    },
    updatePatient: (id: string, updates: Partial<Patient>) => {
      // TODO: Implementar update mutation
      console.log('Update patient not implemented yet');
    },
    deletePatient: (id: string) => {
      deletePatient.mutate({ patientId: id, reason: 'Remoção solicitada pelo usuário' });
    },
    getPatient: (id: string) => patients.find(p => p.id === id),
    searchPatients: (query: string) => {
      if (!query.trim()) return patients;
      const searchTerm = query.toLowerCase();
      return patients.filter(patient => 
        patient.name.toLowerCase().includes(searchTerm) ||
        patient.email?.toLowerCase().includes(searchTerm)
      );
    },
    getPatientsByStatus: (status: string) => patients.filter(p => p.status === status),
    loading: isLoading,
    error: error?.message || null,
  };
};

export default usePatientsLegacy;