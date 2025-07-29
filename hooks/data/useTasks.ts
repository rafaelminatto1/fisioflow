import { useCallback, useMemo } from 'react';
import { Task } from '../../types';
import { INITIAL_TASKS } from '../../constants';
import { useOptimizedStorage } from './useOptimizedStorage';
import { useAuth } from '../useAuth';

export const useTasks = () => {
  const { user: currentUser } = useAuth();
  
  const [allTasks, setAllTasks] = useOptimizedStorage<Task[]>(
    'fisioflow-all-tasks',
    INITIAL_TASKS,
    ['title', 'description', 'status'],
    'tenantId'
  );

  // Filtrar tarefas por tenant
  const tasks = useMemo(() => {
    if (!currentUser?.tenantId) return [];
    return allTasks.filter(task => task.tenantId === currentUser.tenantId);
  }, [allTasks, currentUser?.tenantId]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'tenantId'>) => {
    if (!currentUser?.tenantId) return;
    
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      tenantId: currentUser.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setAllTasks(prev => [...prev, newTask]);
    return newTask;
  }, [setAllTasks, currentUser?.tenantId]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setAllTasks(prev => 
      prev.map(task => 
        task.id === id 
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      )
    );
  }, [setAllTasks]);

  const deleteTask = useCallback((id: string) => {
    setAllTasks(prev => prev.filter(task => task.id !== id));
  }, [setAllTasks]);

  const getTaskById = useCallback((id: string) => {
    return tasks.find(task => task.id === id);
  }, [tasks]);

  const getTasksByStatus = useCallback((status: string) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const getTasksByPatient = useCallback((patientId: string) => {
    return tasks.filter(task => task.patientId === patientId);
  }, [tasks]);

  const getTasksByAssignee = useCallback((assigneeId: string) => {
    return tasks.filter(task => task.assignedTo === assigneeId);
  }, [tasks]);

  const getPendingTasks = useCallback(() => {
    return tasks.filter(task => task.status === 'pending');
  }, [tasks]);

  const getOverdueTasks = useCallback(() => {
    const now = new Date();
    return tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < now &&
      task.status !== 'completed'
    );
  }, [tasks]);

  const completeTask = useCallback((id: string) => {
    updateTask(id, { 
      status: 'completed', 
      completedAt: new Date().toISOString() 
    });
  }, [updateTask]);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    getTaskById,
    getTasksByStatus,
    getTasksByPatient,
    getTasksByAssignee,
    getPendingTasks,
    getOverdueTasks,
    completeTask,
  };
};