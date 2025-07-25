/**
 * Hooks especializados para o FisioFlow
 *
 * Este arquivo centraliza a exportação de todos os hooks especializados
 * que substituem o useData monolítico, proporcionando:
 *
 * - Melhor organização do código
 * - Cache otimizado com React Query
 * - Tipagem mais específica
 * - Melhor performance
 * - Facilidade de manutenção
 */

// Hooks de autenticação
export { useAuth } from './useAuth';

// Hooks especializados para entidades
export { useAssessments } from './useAssessments';
export { useDocuments } from './useDocuments';
export { usePrescriptions } from './usePrescriptions';
export { useUsers } from './useUsers';
export { useTasks } from './useTasks';
export { useAppointments } from './useAppointments';
export { useReports } from './useReports';

// Hook legado (manter durante a migração)
export { useData } from './useData';

// Re-exportar tipos para conveniência
export type { UseAssessmentsReturn } from './useAssessments';

export type { UseDocumentsReturn } from './useDocuments';

export type { UsePrescriptionsReturn } from './usePrescriptions';

export type { UseUsersReturn } from './useUsers';
