/**
 * useTasks - Hook especializado para gerenciamento de tarefas/kanban
 * Extraído do useData.tsx para melhor organização
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Task, UserRole } from '../types';
import { INITIAL_TASKS } from '../constants';
import { useOptimizedStorage } from './useOptimizedStorage';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

interface TasksContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getTasksByUser: (userId: string) => Task[];
  moveTaskToStatus: (id: string, newStatus: TaskStatus) => void;
  searchTasks: (query: string) => Task[];
  loading: boolean;
  error: string | null;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [allTasks, setAllTasks] = useOptimizedStorage<Task[]>(
    'fisioflow-all-tasks',
    INITIAL_TASKS,
    ['title', 'description', 'status', 'priority'], // campos de busca
    'tenantId'
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filtra tarefas por tenant
  const tasks = React.useMemo(() => {
    if (!user?.tenantId) return [];
    return allTasks.filter(task => task.tenantId === user.tenantId);
  }, [allTasks, user?.tenantId]);

  const addTask = React.useCallback((taskData: Omit<Task, 'id'>) => {
    try {
      setLoading(true);
      const newTask: Task = {
        ...taskData,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: user?.tenantId || 't1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAllTasks(prev => [...prev, newTask]);
      
      addNotification({
        type: 'success',
        message: `Tarefa "${newTask.title}" criada com sucesso`,
      });

      console.log(`📋 Nova tarefa criada: ${newTask.title} (${newTask.id})`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao criar tarefa: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, setAllTasks, addNotification]);

  const updateTask = React.useCallback((id: string, updates: Partial<Task>) => {
    try {
      setLoading(true);
      setAllTasks(prev => 
        prev.map(task => 
          task.id === id 
            ? { ...task, ...updates, updatedAt: new Date().toISOString() }
            : task
        )
      );

      addNotification({
        type: 'success', 
        message: 'Tarefa atualizada com sucesso',
      });

      console.log(`📋 Tarefa atualizada: ${id}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao atualizar tarefa: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [setAllTasks, addNotification]);

  const deleteTask = React.useCallback((id: string) => {
    try {
      setLoading(true);
      const taskToDelete = tasks.find(t => t.id === id);
      
      setAllTasks(prev => prev.filter(task => task.id !== id));
      
      addNotification({
        type: 'success',
        message: `Tarefa "${taskToDelete?.title || id}" removida com sucesso`,
      });

      console.log(`📋 Tarefa removida: ${id}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao remover tarefa: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [tasks, setAllTasks, addNotification]);

  const getTask = React.useCallback((id: string) => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  const getTasksByStatus = React.useCallback((status: TaskStatus) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const getTasksByPriority = React.useCallback((priority: TaskPriority) => {
    return tasks.filter(task => task.priority === priority);
  }, [tasks]);

  const getTasksByUser = React.useCallback((userId: string) => {
    return tasks.filter(task => task.assignedTo === userId);
  }, [tasks]);

  const moveTaskToStatus = React.useCallback((id: string, newStatus: TaskStatus) => {
    updateTask(id, { status: newStatus });
    
    const task = getTask(id);
    if (task) {
      console.log(`📋 Tarefa movida: "${task.title}" → ${newStatus}`);
    }
  }, [updateTask, getTask]);

  const searchTasks = React.useCallback((query: string) => {
    if (!query.trim()) return tasks;
    
    const lowerQuery = query.toLowerCase();
    return tasks.filter(task => 
      task.title.toLowerCase().includes(lowerQuery) ||
      task.description?.toLowerCase().includes(lowerQuery)
    );
  }, [tasks]);

  // Limpa erros automaticamente
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const contextValue: TasksContextType = React.useMemo(() => ({
    tasks,
    addTask,
    updateTask,
    deleteTask,
    getTask,
    getTasksByStatus,
    getTasksByPriority,
    getTasksByUser,
    moveTaskToStatus,
    searchTasks,
    loading,
    error,
  }), [
    tasks,
    addTask,
    updateTask,
    deleteTask,
    getTask,
    getTasksByStatus,
    getTasksByPriority,
    getTasksByUser,
    moveTaskToStatus,
    searchTasks,
    loading,
    error,
  ]);

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = (): TasksContextType => {
  const context = useContext(TasksContext);
  if (!context) {
    throw new Error('useTasks must be used within TasksProvider');
  }
  return context;
};

// Hook para estatísticas de tarefas (KanBan)
export const useTasksStats = () => {
  const { tasks } = useTasks();

  return React.useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const review = tasks.filter(t => t.status === 'review').length;
    const done = tasks.filter(t => t.status === 'done').length;
    
    const highPriority = tasks.filter(t => t.priority === 'high').length;
    const overdue = tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date() && t.status !== 'done';
    }).length;

    return {
      total,
      todo,
      inProgress,
      review,
      done,
      highPriority,
      overdue,
      completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [tasks]);
};

// Constantes para status de tarefas
export const TASK_STATUSES = {
  todo: 'A Fazer',
  in_progress: 'Em Progresso',
  review: 'Revisão',
  done: 'Concluído',
} as const;

export const TASK_STATUS_COLORS = {
  todo: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  review: 'bg-yellow-500',
  done: 'bg-green-500',
} as const;

export default useTasks;