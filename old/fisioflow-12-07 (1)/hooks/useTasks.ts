
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Task } from '../types';
import { useAuth } from './useAuth';

const TASKS_QUERY_KEY = 'tasks';

export const useTasks = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const { data: tasks, isLoading, isError, error } = useQuery<Task[], Error>({
        queryKey: [TASKS_QUERY_KEY],
        queryFn: api.getTasks,
    });

    const saveTaskMutation = useMutation<Task, Error, Task>({
        mutationFn: (task) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.saveTask(task, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
        },
    });

    const deleteTaskMutation = useMutation<any, Error, { taskId: string; userId: string; }>({
        mutationFn: ({ taskId, userId }) => api.deleteTask(taskId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
        },
    });

    const addTaskFeedbackMutation = useMutation<Task, Error, { taskId: string, feedback: string }>({
        mutationFn: api.addTaskFeedback,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
        }
    });

    return {
        tasks,
        isLoading,
        isError,
        error,
        saveTask: saveTaskMutation.mutateAsync,
        deleteTask: deleteTaskMutation.mutateAsync,
        addTaskFeedback: addTaskFeedbackMutation.mutateAsync,
        isSaving: saveTaskMutation.isPending,
    };
};