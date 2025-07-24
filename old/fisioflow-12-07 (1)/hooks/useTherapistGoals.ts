import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { TherapistGoal } from '../types';
import { useNotification } from './useNotification';

const THERAPIST_GOALS_QUERY_KEY = 'therapistGoals';

export const useTherapistGoals = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: goals, isLoading, isError, error } = useQuery<TherapistGoal[], Error>({
        queryKey: [THERAPIST_GOALS_QUERY_KEY],
        queryFn: api.getTherapistGoals,
    });

    const saveGoalMutation = useMutation<TherapistGoal, Error, TherapistGoal>({
        mutationFn: (goal) => api.saveTherapistGoal(goal),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [THERAPIST_GOALS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Meta Clínica Salva', message: 'A meta foi salva com sucesso.' });
        },
    });

    const deleteGoalMutation = useMutation<any, Error, string>({
        mutationFn: (goalId) => api.deleteTherapistGoal(goalId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [THERAPIST_GOALS_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Meta Clínica Removida', message: 'A meta foi removida.' });
        },
    });

    return {
        goals,
        isLoading,
        isError,
        error,
        saveGoal: saveGoalMutation.mutateAsync,
        deleteGoal: deleteGoalMutation.mutateAsync,
    };
};
