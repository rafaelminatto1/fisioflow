/**
 * Hook de Transição para Migração do useData Antigo
 *
 * Este hook mantém a API do useData original mas usa os hooks especializados
 * internamente, permitindo migração gradual sem quebrar funcionalidades.
 *
 * @author FisioFlow Team
 * @version 1.0.0
 * @since 2024-01-20
 */

import { Patient, Session, Task, User, Subscription } from '../types';

import { useAuth } from './useAuth';
import { usePatients } from './usePatients';
import { useSessions } from './useSessions';
import { useSubscription } from './useSubscription';
import { useTasks } from './useTasks';

/**
 * Interface que mantém compatibilidade com useData antigo
 */
export interface UseDataMigrationReturn {
  // === PACIENTES ===
  patients: Patient[];
  savePatient: (patient: Omit<Patient, 'id'>) => Promise<void>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Patient | undefined;

  // === SESSÕES/AGENDAMENTOS ===
  appointments: Session[];
  sessions: Session[]; // Alias para appointments
  saveAppointment: (appointment: Omit<Session, 'id'>) => Promise<void>;
  updateAppointment: (id: string, updates: Partial<Session>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getAppointment: (id: string) => Session | undefined;

  // === TAREFAS ===
  tasks: Task[];
  saveTask: (task: Omit<Task, 'id'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  getTask: (id: string) => Task | undefined;

  // === USUÁRIO/AUTH ===
  currentUser: User | null;
  user: User | null; // Alias para currentUser
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;

  // === SUBSCRIPTION/FREEMIUM ===
  subscription: Subscription | null;
  canUseFeature: (feature: string) => boolean;
  getUsageStats: () => Record<string, number>;
  checkLimits: (feature: string) => {
    canUse: boolean;
    limit: number;
    current: number;
  };

  // === FUNÇÕES DE BUSCA/FILTRO ===
  getTasksForPatient: (patientId: string) => Task[];
  getAppointmentsForPatient: (patientId: string) => Session[];
  getSessionsForPatient: (patientId: string) => Session[]; // Alias
  getPatientTasks: (patientId: string) => Task[]; // Alias
  getPatientSessions: (patientId: string) => Session[]; // Alias

  // === ESTADOS GLOBAIS ===
  loading: boolean;
  error: string | null;
  isLoading: boolean; // Alias para loading
  hasError: boolean;

  // === FUNÇÕES UTILITÁRIAS ===
  refresh: () => Promise<void>;
  clearError: () => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;

  // === ESTATÍSTICAS ===
  getStats: () => {
    totalPatients: number;
    totalSessions: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
  };
}

/**
 * Hook de migração que mantém compatibilidade com useData antigo
 * mas usa hooks especializados internamente
 */
export const useDataMigration = (): UseDataMigrationReturn => {
  // Hooks especializados
  const patientsHook = usePatients();
  const sessionsHook = useSessions();
  const tasksHook = useTasks();
  const subscriptionHook = useSubscription();
  const authHook = useAuth();

  // === FUNÇÕES DE BUSCA/FILTRO ===
  const getTasksForPatient = (patientId: string): Task[] => {
    return tasksHook.tasks.filter((task) => task.patientId === patientId);
  };

  const getAppointmentsForPatient = (patientId: string): Session[] => {
    return sessionsHook.sessions.filter(
      (session) => session.patientId === patientId
    );
  };

  const getPatient = (id: string): Patient | undefined => {
    return patientsHook.patients.find((patient) => patient.id === id);
  };

  const getAppointment = (id: string): Session | undefined => {
    return sessionsHook.sessions.find((session) => session.id === id);
  };

  const getTask = (id: string): Task | undefined => {
    return tasksHook.tasks.find((task) => task.id === id);
  };

  // === FUNÇÕES UTILITÁRIAS ===
  const refresh = async (): Promise<void> => {
    await Promise.all(
      [
        patientsHook.refreshPatients?.(),
        sessionsHook.refreshSessions?.(),
        tasksHook.refreshTasks?.(),
        subscriptionHook.refreshSubscription?.(),
      ].filter(Boolean)
    );
  };

  const clearError = (): void => {
    patientsHook.clearError?.();
    sessionsHook.clearError?.();
    tasksHook.clearError?.();
    subscriptionHook.clearError?.();
  };

  const exportData = async (): Promise<string> => {
    const data = {
      patients: patientsHook.patients,
      sessions: sessionsHook.sessions,
      tasks: tasksHook.tasks,
      user: authHook.user,
      subscription: subscriptionHook.subscription,
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
    };

    return JSON.stringify(data, null, 2);
  };

  const importData = async (jsonData: string): Promise<void> => {
    try {
      const data = JSON.parse(jsonData);

      // Importar dados para cada hook especializado
      if (data.patients && patientsHook.importPatients) {
        await patientsHook.importPatients(data.patients);
      }

      if (data.sessions && sessionsHook.importSessions) {
        await sessionsHook.importSessions(data.sessions);
      }

      if (data.tasks && tasksHook.importTasks) {
        await tasksHook.importTasks(data.tasks);
      }
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw new Error('Formato de dados inválido');
    }
  };

  // === ESTATÍSTICAS ===
  const getStats = () => {
    const completedTasks = tasksHook.tasks.filter(
      (task) => task.status === 'completed'
    ).length;
    const pendingTasks = tasksHook.tasks.filter(
      (task) => task.status === 'pending'
    ).length;

    return {
      totalPatients: patientsHook.patients.length,
      totalSessions: sessionsHook.sessions.length,
      totalTasks: tasksHook.tasks.length,
      completedTasks,
      pendingTasks,
    };
  };

  // === ESTADOS COMBINADOS ===
  const loading =
    patientsHook.loading ||
    sessionsHook.loading ||
    tasksHook.loading ||
    subscriptionHook.loading;
  const error =
    patientsHook.error ||
    sessionsHook.error ||
    tasksHook.error ||
    subscriptionHook.error;

  // === RETORNO COM COMPATIBILIDADE TOTAL ===
  return {
    // Pacientes
    patients: patientsHook.patients,
    savePatient: patientsHook.addPatient,
    updatePatient: patientsHook.updatePatient,
    deletePatient: patientsHook.removePatient,
    getPatient,

    // Sessões/Agendamentos
    appointments: sessionsHook.sessions,
    sessions: sessionsHook.sessions, // Alias
    saveAppointment: sessionsHook.addSession,
    updateAppointment: sessionsHook.updateSession,
    deleteAppointment: sessionsHook.removeSession,
    getAppointment,

    // Tarefas
    tasks: tasksHook.tasks,
    saveTask: tasksHook.addTask,
    updateTask: tasksHook.updateTask,
    deleteTask: tasksHook.removeTask,
    getTask,

    // Auth
    currentUser: authHook.user,
    user: authHook.user, // Alias
    login: authHook.login,
    logout: authHook.logout,
    updateUser: authHook.updateUser,

    // Subscription
    subscription: subscriptionHook.subscription,
    canUseFeature: subscriptionHook.canUseFeature,
    getUsageStats: subscriptionHook.getUsageStats,
    checkLimits: subscriptionHook.checkLimits,

    // Funções de busca
    getTasksForPatient,
    getAppointmentsForPatient,
    getSessionsForPatient: getAppointmentsForPatient, // Alias
    getPatientTasks: getTasksForPatient, // Alias
    getPatientSessions: getAppointmentsForPatient, // Alias

    // Estados
    loading,
    error,
    isLoading: loading, // Alias
    hasError: !!error,

    // Utilitárias
    refresh,
    clearError,
    exportData,
    importData,
    getStats,
  };
};

/**
 * Hook para componentes que precisam apenas de dados específicos
 * Otimização para evitar re-renders desnecessários
 */
export const useDataMigrationOptimized = (dependencies: string[] = []) => {
  const fullData = useDataMigration();

  // Retornar apenas os dados solicitados
  const optimizedData: Partial<UseDataMigrationReturn> = {};

  dependencies.forEach((dep) => {
    if (dep in fullData) {
      (optimizedData as any)[dep] = (fullData as any)[dep];
    }
  });

  return optimizedData;
};

/**
 * Utilitário para debug durante migração
 */
export const useDataMigrationDebug = () => {
  const data = useDataMigration();

  // Log de debug em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    console.group('🔄 useDataMigration Debug');
    console.log('Patients:', data.patients.length);
    console.log('Sessions:', data.sessions.length);
    console.log('Tasks:', data.tasks.length);
    console.log('Loading:', data.loading);
    console.log('Error:', data.error);
    console.log('User:', data.currentUser?.name || 'Not logged in');
    console.log('Subscription:', data.subscription?.plan || 'No subscription');
    console.groupEnd();
  }

  return data;
};

export default useDataMigration;
