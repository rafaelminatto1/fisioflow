// Hooks de armazenamento otimizado
export { useOptimizedStorage, useLocalStorage } from './useOptimizedStorage';

// Hooks de domínio específico
export { useUsers } from './useUsers';
export { usePatients } from './usePatients';
export { useTasks } from './useTasks';

// Store centralizado
export { 
  DataStoreProvider, 
  useDataStore, 
  useUsersData, 
  usePatientsData, 
  useTasksData 
} from './useDataStore';

// Re-exportar tipos se necessário
export type { } from '../../types';