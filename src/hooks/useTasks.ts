import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

import { useErrorHandler } from '../components/ErrorBoundary';
import {
  validateAndMigrateLocalStorageData,
  saveValidatedData,
} from '../utils/dataValidator';

import { useAuth } from './useAuth';

// Schema para Task
const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum([
    'appointment',
    'exercise',
    'evaluation',
    'follow_up',
    'administrative',
  ]),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  patientId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedDuration: z.number().min(5).max(480).optional(), // 5 min a 8 horas
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

const STORAGE_KEY = 'fisioflow_tasks';

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const handleError = useErrorHandler();

  // Carregar tasks do localStorage
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        setTasks([]);
        return;
      }

      const data = validateAndMigrateLocalStorageData(rawData);

      // Filtrar por tenant se usuário logado
      const filteredTasks = user?.tenantId
        ? data.filter((t: any) => t.tenantId === user.tenantId)
        : data;

      // Validar cada task
      const validatedTasks = filteredTasks
        .map((t: any) => {
          try {
            return TaskSchema.parse(t);
          } catch (validationError) {
            console.warn('Task inválida ignorada:', t, validationError);
            return null;
          }
        })
        .filter(Boolean) as Task[];

      setTasks(validatedTasks);
    } catch (err) {
      const errorMessage = 'Erro ao carregar tarefas';
      setError(errorMessage);
      handleError(err as Error, { context: 'loadTasks' });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, handleError]);

  // Salvar tasks
  const saveTasks = useCallback(
    async (newTasks: Task[]) => {
      try {
        // Validar todas as tasks antes de salvar
        const validatedTasks = newTasks.map((t) => TaskSchema.parse(t));

        saveValidatedData(STORAGE_KEY, validatedTasks);
        setTasks(validatedTasks);
      } catch (err) {
        const errorMessage = 'Erro ao salvar tarefas';
        setError(errorMessage);
        handleError(err as Error, { context: 'saveTasks' });
        throw err;
      }
    },
    [handleError]
  );

  // Adicionar task
  const addTask = useCallback(
    async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newTask: Task = {
          ...taskData,
          id: crypto.randomUUID(),
          tenantId: user?.tenantId || 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedTasks = [...tasks, newTask];
        await saveTasks(updatedTasks);

        return newTask;
      } catch (err) {
        handleError(err as Error, { context: 'addTask', taskData });
        throw err;
      }
    },
    [tasks, user?.tenantId, saveTasks, handleError]
  );

  // Atualizar task
  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      try {
        const updatedTasks = tasks.map((t) =>
          t.id === id
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        );

        await saveTasks(updatedTasks);
      } catch (err) {
        handleError(err as Error, { context: 'updateTask', id, updates });
        throw err;
      }
    },
    [tasks, saveTasks, handleError]
  );

  // Remover task
  const removeTask = useCallback(
    async (id: string) => {
      try {
        const updatedTasks = tasks.filter((t) => t.id !== id);
        await saveTasks(updatedTasks);
      } catch (err) {
        handleError(err as Error, { context: 'removeTask', id });
        throw err;
      }
    },
    [tasks, saveTasks, handleError]
  );

  // Marcar task como completa
  const completeTask = useCallback(
    async (id: string) => {
      try {
        await updateTask(id, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleError(err as Error, { context: 'completeTask', id });
        throw err;
      }
    },
    [updateTask, handleError]
  );

  // Buscar tasks
  const searchTasks = useCallback(
    (query: string) => {
      if (!query.trim()) return tasks;

      const lowercaseQuery = query.toLowerCase();
      return tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(lowercaseQuery) ||
          t.description?.toLowerCase().includes(lowercaseQuery) ||
          t.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
      );
    },
    [tasks]
  );

  // Filtrar tasks por status
  const getTasksByStatus = useCallback(
    (status: Task['status']) => {
      return tasks.filter((t) => t.status === status);
    },
    [tasks]
  );

  // Filtrar tasks por prioridade
  const getTasksByPriority = useCallback(
    (priority: Task['priority']) => {
      return tasks.filter((t) => t.priority === priority);
    },
    [tasks]
  );

  // Filtrar tasks por paciente
  const getTasksByPatient = useCallback(
    (patientId: string) => {
      return tasks.filter((t) => t.patientId === patientId);
    },
    [tasks]
  );

  // Filtrar tasks por usuário atribuído
  const getTasksByAssignee = useCallback(
    (userId: string) => {
      return tasks.filter((t) => t.assignedTo === userId);
    },
    [tasks]
  );

  // Obter tasks vencidas
  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    return tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    );
  }, [tasks]);

  // Obter tasks do dia
  const getTodayTasks = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate.startsWith(todayStr) &&
        t.status !== 'completed' &&
        t.status !== 'cancelled'
    );
  }, [tasks]);

  // Estatísticas das tasks
  const getTaskStats = useCallback(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const overdue = getOverdueTasks().length;

    return {
      total,
      completed,
      pending,
      inProgress,
      overdue,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks, getOverdueTasks]);

  // Carregar dados na inicialização
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    removeTask,
    completeTask,
    searchTasks,
    getTasksByStatus,
    getTasksByPriority,
    getTasksByPatient,
    getTasksByAssignee,
    getOverdueTasks,
    getTodayTasks,
    getTaskStats,
    refreshTasks: loadTasks,
  };
};
