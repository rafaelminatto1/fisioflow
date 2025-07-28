/**
 * Hook especializado para gerenciamento de pacientes com React Query
 * Substituí a lógica de pacientes do useData massivo para melhor performance
 * Implementa cache inteligente, invalidação automática e operações otimizadas
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Patient, User } from '../types';
import { useAuth } from './useAuth';
import { useSecureData } from './useSecureData';
import { auditLogger, AuditAction, LegalBasis } from '../services/auditLogger';

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

  const deletePatient = React.useCallback((id: string) => {
    try {
      setLoading(true);
      const patientToDelete = patients.find(p => p.id === id);
      
      setAllPatients(prev => prev.filter(patient => patient.id !== id));
      
      addNotification({
        type: 'success',
        message: `Paciente ${patientToDelete?.name || id} removido com sucesso`,
      });

      console.log(`👤 Paciente removido: ${id}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao remover paciente: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [patients, setAllPatients, addNotification]);

  const getPatient = React.useCallback((id: string) => {
    return patients.find(patient => patient.id === id);
  }, [patients]);

  const searchPatients = React.useCallback((query: string) => {
    if (!query.trim()) return patients;
    
    const lowerQuery = query.toLowerCase();
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(lowerQuery) ||
      patient.email?.toLowerCase().includes(lowerQuery) ||
      patient.phone?.toLowerCase().includes(lowerQuery) ||
      patient.medicalHistory?.toLowerCase().includes(lowerQuery)
    );
  }, [patients]);

  const getPatientsByStatus = React.useCallback((status: string) => {
    return patients.filter(patient => patient.status === status);
  }, [patients]);

  // Limpa erros automaticamente
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const contextValue: PatientsContextType = React.useMemo(() => ({
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    getPatientsByStatus,
    loading,
    error,
  }), [
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    getPatientsByStatus,
    loading,
    error,
  ]);

  return (
    <PatientsContext.Provider value={contextValue}>
      {children}
    </PatientsContext.Provider>
  );
};

export const usePatients = (): PatientsContextType => {
  const context = useContext(PatientsContext);
  if (!context) {
    throw new Error('usePatients must be used within PatientsProvider');
  }
  return context;
};

// Hook para estatísticas de pacientes
export const usePatientsStats = () => {
  const { patients } = usePatients();

  return React.useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'active').length;
    const inactive = patients.filter(p => p.status === 'inactive').length;
    const newThisMonth = patients.filter(p => {
      const created = new Date(p.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && 
             created.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      active,
      inactive,
      newThisMonth,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [patients]);
};

export default usePatients;