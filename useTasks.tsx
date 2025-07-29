import { useState, useEffect, useCallback } from 'react';

import { getValidatedTasksFromStorage } from '@/services/storageService';
import { Task } from '@/types';

import { useAuth } from './useAuth';

// Supõe-se que uma função similar a esta exista no seu storageService
// para carregar e validar as tarefas do localStorage.

export const useTasks = () => {
  const { tenantId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) {
      setLoading(true);
      // Lógica para carregar tarefas do localStorage, filtrando por tenantId
      const allTasks = getValidatedTasksFromStorage();
      const tenantTasks = allTasks.filter((t) => t.tenantId === tenantId);
      setTasks(tenantTasks);
      setLoading(false);
    }
  }, [tenantId]);

  const addTask = useCallback(
    (newTask: Omit<Task, 'id' | 'tenantId'>) => {
      // Lógica para adicionar uma nova tarefa
      // ...
      console.log('Adicionando tarefa:', newTask);
    },
    [tenantId, tasks]
  );

  const updateTask = useCallback(
    (updatedTask: Task) => {
      // Lógica para atualizar uma tarefa
      // ...
      console.log('Atualizando tarefa:', updatedTask);
    },
    [tenantId, tasks]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      // Lógica para deletar uma tarefa
      // ...
      console.log('Deletando tarefa com ID:', taskId);
    },
    [tenantId, tasks]
  );

  return { tasks, loading, addTask, updateTask, deleteTask };
};
