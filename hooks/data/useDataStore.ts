import { createContext, useContext, ReactNode } from 'react';
import { useUsers } from './useUsers';
import { usePatients } from './usePatients';
import { useTasks } from './useTasks';

// Tipos para o contexto de dados
interface DataStoreContextType {
  users: ReturnType<typeof useUsers>;
  patients: ReturnType<typeof usePatients>;
  tasks: ReturnType<typeof useTasks>;
}

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

// Provider que combina todos os hooks de domínio
export const DataStoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const users = useUsers();
  const patients = usePatients();
  const tasks = useTasks();

  const value: DataStoreContextType = {
    users,
    patients,
    tasks,
  };

  return (
    <DataStoreContext.Provider value={value}>
      {children}
    </DataStoreContext.Provider>
  );
};

// Hook para acessar o store de dados
export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (context === undefined) {
    throw new Error('useDataStore must be used within a DataStoreProvider');
  }
  return context;
};

// Hooks de conveniência para acessar domínios específicos
export const useUsersData = () => useDataStore().users;
export const usePatientsData = () => useDataStore().patients;
export const useTasksData = () => useDataStore().tasks;