/**
 * Hook especializado para gerenciamento de avaliações com React Query
 * Extraído do useData massivo para melhor performance e manutenibilidade
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { Assessment, User } from '../types';
import { useAuth } from './useAuth';
import { useSecureData } from './useSecureData';
import { auditLogger, AuditAction, LegalBasis } from '../services/auditLogger';

// Chaves de cache organizadas para avaliações
export const assessmentKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentKeys.all, 'list'] as const,
  list: (tenantId: string) => [...assessmentKeys.lists(), tenantId] as const,
  details: () => [...assessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
  byPatient: (patientId: string) => [...assessmentKeys.all, 'patient', patientId] as const,
  byTherapist: (therapistId: string) => [...assessmentKeys.all, 'therapist', therapistId] as const,
  byDate: (date: string) => [...assessmentKeys.all, 'date', date] as const,
};

// Hook principal para listar avaliações
export const useAssessments = () => {
  const { currentTenant } = useAuth();
  // TODO: Implementar getAllSecureAssessments no useSecureData
  // const { getAllSecureAssessments } = useSecureData();

  return useQuery({
    queryKey: assessmentKeys.list(currentTenant?.id || ''),
    queryFn: async () => {
      if (!currentTenant) return [];
      
      // Temporário: buscar do localStorage enquanto não implementamos o secure
      const storageKey = `fisioflow_assessments_${currentTenant.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!currentTenant,
    staleTime: 3 * 60 * 1000, // 3 minutos para avaliações
    gcTime: 8 * 60 * 1000, // 8 minutos
    retry: 3,
  });
};

// Hook para avaliação específica
export const useAssessment = (assessmentId: string) => {
  const { user, currentTenant } = useAuth();
  const { getSecureAssessment } = useSecureData();

  return useQuery({
    queryKey: assessmentKeys.detail(assessmentId),
    queryFn: async () => {
      if (!currentTenant || !assessmentId) return null;
      
      const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
      return await getSecureAssessment(assessmentId, masterKey);
    },
    enabled: !!currentTenant && !!assessmentId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};

// Hook para avaliações de um paciente específico
export const usePatientAssessments = (patientId: string) => {
  const { data: allAssessments = [] } = useAssessments();
  
  return useMemo(() => {
    return allAssessments.filter((assessment: Assessment) => 
      assessment.patientId === patientId
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAssessments, patientId]);
};

// Hook para avaliações por terapeuta
export const useTherapistAssessments = (therapistId: string) => {
  const { data: allAssessments = [] } = useAssessments();
  
  return useMemo(() => {
    return allAssessments.filter((assessment: Assessment) => 
      assessment.therapistId === therapistId
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAssessments, therapistId]);
};

// Hook para avaliações por período
export const useAssessmentsByDateRange = (startDate: string, endDate: string) => {
  const { data: allAssessments = [] } = useAssessments();
  
  return useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return allAssessments.filter((assessment: Assessment) => {
      const assessmentDate = new Date(assessment.date);
      return assessmentDate >= start && assessmentDate <= end;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allAssessments, startDate, endDate]);
};

// Mutation para salvar avaliação
export const useSaveAssessment = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();
  const { saveSecureAssessment } = useSecureData();

  return useMutation({
    mutationFn: async (assessment: Assessment) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      const masterKey = sessionStorage.getItem('masterKey') || 'temp_key';
      await saveSecureAssessment(assessment, user, masterKey);
      return assessment;
    },
    onSuccess: (assessment) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.byPatient(assessment.patientId) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.byTherapist(assessment.therapistId) });
      
      // Atualizar cache específico
      queryClient.setQueryData(assessmentKeys.detail(assessment.id), assessment);
      
      console.log('✅ Avaliação salva e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar avaliação:', error);
    },
  });
};

// Mutation para deletar avaliação
export const useDeleteAssessment = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();
  const { deleteSecureAssessment } = useSecureData();

  return useMutation({
    mutationFn: async ({ assessmentId, reason }: { assessmentId: string; reason: string }) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      await deleteSecureAssessment(assessmentId, user, reason);
      return assessmentId;
    },
    onSuccess: (assessmentId) => {
      // Remover do cache específico
      queryClient.removeQueries({ queryKey: assessmentKeys.detail(assessmentId) });
      
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
      
      console.log('✅ Avaliação removida e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao deletar avaliação:', error);
    },
  });
};

// Hook para estatísticas de avaliações
export const useAssessmentsStats = () => {
  const { data: assessments = [] } = useAssessments();

  return useMemo(() => {
    const total = assessments.length;
    const thisMonth = assessments.filter((assessment: Assessment) => {
      const assessmentDate = new Date(assessment.date);
      const now = new Date();
      return assessmentDate.getMonth() === now.getMonth() && 
             assessmentDate.getFullYear() === now.getFullYear();
    }).length;

    const thisWeek = assessments.filter((assessment: Assessment) => {
      const assessmentDate = new Date(assessment.date);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return assessmentDate >= weekAgo;
    }).length;

    // Estatísticas por tipo de avaliação
    const byType = assessments.reduce((acc: Record<string, number>, assessment: Assessment) => {
      const type = assessment.type || 'Geral';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Média de avaliações por mês (últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentAssessments = assessments.filter((assessment: Assessment) => 
      new Date(assessment.date) >= sixMonthsAgo
    );
    
    const avgPerMonth = recentAssessments.length / 6;

    return {
      total,
      thisMonth,
      thisWeek,
      byType,
      avgPerMonth: Math.round(avgPerMonth * 10) / 10,
      growthRate: total > 0 ? (thisMonth / total) * 100 : 0,
    };
  }, [assessments]);
};

// Hook para busca otimizada de avaliações
export const useAssessmentsSearch = (query: string) => {
  const { data: assessments = [] } = useAssessments();

  return useMemo(() => {
    if (!query.trim()) return assessments;
    
    const searchTerm = query.toLowerCase();
    return assessments.filter((assessment: Assessment) => 
      assessment.mainComplaint?.toLowerCase().includes(searchTerm) ||
      assessment.diagnosis?.toLowerCase().includes(searchTerm) ||
      assessment.treatmentPlan?.toLowerCase().includes(searchTerm)
    );
  }, [assessments, query]);
};

// Hook para invalidar cache de avaliações
export const useInvalidateAssessments = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: assessmentKeys.all });
  }, [queryClient]);
};

// Hook para comparação entre avaliações (evolução do paciente)
export const useAssessmentComparison = (patientId: string) => {
  const patientAssessments = usePatientAssessments(patientId);
  
  return useMemo(() => {
    if (patientAssessments.length < 2) return null;
    
    const latest = patientAssessments[0];
    const previous = patientAssessments[1];
    
    const comparison = {
      latest,
      previous,
      timeDifference: new Date(latest.date).getTime() - new Date(previous.date).getTime(),
      improvements: [] as string[],
      concerns: [] as string[],
    };
    
    // TODO: Implementar lógica de comparação específica baseada nos campos da avaliação
    // Exemplo: comparar scores de dor, mobilidade, etc.
    
    return comparison;
  }, [patientAssessments]);
};

export default {
  useAssessments,
  useAssessment,
  usePatientAssessments,
  useTherapistAssessments,
  useAssessmentsByDateRange,
  useSaveAssessment,
  useDeleteAssessment,
  useAssessmentsStats,
  useAssessmentsSearch,
  useInvalidateAssessments,
  useAssessmentComparison,
};