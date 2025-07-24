import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Exercise } from '../types';
import { useNotification } from './useNotification';

const EXERCISES_QUERY_KEY = 'exercises';

export const useExercises = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: exercises, isLoading, isError, error } = useQuery<Exercise[], Error>({
        queryKey: [EXERCISES_QUERY_KEY],
        queryFn: api.getExercises,
    });

    const saveExerciseMutation = useMutation<Exercise, Error, Exercise>({
        mutationFn: (exercise) => api.saveExercise(exercise),
        onSuccess: (savedExercise) => {
            queryClient.invalidateQueries({ queryKey: [EXERCISES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Exercício Salvo', message: `O exercício "${savedExercise.name}" foi salvo.` });
        },
    });

    const deleteExerciseMutation = useMutation<any, Error, string>({
        mutationFn: (exerciseId) => api.deleteExercise(exerciseId),
        onSuccess: (data, exerciseId) => {
            queryClient.invalidateQueries({ queryKey: [EXERCISES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
            addNotification({ type: 'info', title: 'Exercício Excluído', message: 'O exercício foi excluído da biblioteca.' });
        },
    });

    return {
        exercises,
        isLoading,
        isError,
        error,
        saveExercise: saveExerciseMutation.mutateAsync,
        deleteExercise: deleteExerciseMutation.mutateAsync,
    };
};
