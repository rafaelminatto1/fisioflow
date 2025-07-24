



import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { ExerciseLog, Patient } from '../types';
import { useNotification } from './useNotification';
import { ACHIEVEMENTS_LIST } from '../constants';

const EXERCISE_LOGS_QUERY_KEY = 'exerciseLogs';

export const useExerciseLogs = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: exerciseLogs, isLoading, isError, error } = useQuery<ExerciseLog[], Error>({
        queryKey: [EXERCISE_LOGS_QUERY_KEY],
        queryFn: api.getExerciseLogs,
    });
    
    const saveExerciseLogMutation = useMutation<{ newLog: ExerciseLog; updatedPatient: Patient | null }, Error, Omit<ExerciseLog, 'id'>, { previousPatients: Patient[] | undefined }>({
        mutationFn: api.saveExerciseLog,
        
        onMutate: async (newLogData) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            await queryClient.cancelQueries({ queryKey: ['patients'] });

            // Snapshot the previous value
            const previousPatients = queryClient.getQueryData<Patient[]>(['patients']);

            // Return a context object with the snapshotted value
            return { previousPatients };
        },

        onSuccess: (data, variables, context) => {
            const { newLog, updatedPatient } = data;
            
            // Invalidate logs so it refetches
            queryClient.invalidateQueries({ queryKey: [EXERCISE_LOGS_QUERY_KEY] });
            
            // Invalidate tasks to show pain alerts
            if (newLog.painLevel >= 8) {
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }

            // Manually update the patients query cache to avoid a refetch race condition
            // and have the UI update instantly.
            if (updatedPatient) {
                queryClient.setQueryData<Patient[]>(['patients'], (oldData) => 
                    oldData?.map(p => p.id === updatedPatient.id ? updatedPatient : p) || []
                );
            } else {
                 queryClient.invalidateQueries({ queryKey: ['patients'] });
            }

            const oldPatient = context?.previousPatients?.find(p => p.id === newLog.patientId);
            
            if (oldPatient && updatedPatient) {
                // Check for level up
                if (updatedPatient.gamification.level > oldPatient.gamification.level) {
                     addNotification({ 
                        type: 'achievement', 
                        title: 'Subiu de Nível!', 
                        message: `Parabéns, você alcançou o nível ${updatedPatient.gamification.level}!`
                    });
                }
                 // Check for new achievements
                const oldAchievements = new Set(oldPatient.unlockedAchievements.map(a => a.achievementId));
                const newAchievements = updatedPatient.unlockedAchievements.filter(a => !oldAchievements.has(a.achievementId));
                
                newAchievements.forEach(ach => {
                    const achievementDetails = ACHIEVEMENTS_LIST.find(item => item.id === ach.achievementId);
                    if (achievementDetails) {
                        addNotification({
                            type: 'achievement',
                            title: 'Conquista Desbloqueada!',
                            message: `Você ganhou: ${achievementDetails.title}`
                        });
                    }
                });
            }
             addNotification({ type: 'success', title: 'Progresso Salvo!', message: 'Seu registro de exercício foi salvo.' });
        },
        onError: (error, variables, context) => {
            addNotification({type: 'error', title: 'Erro ao Salvar', message: error.message});
            // Rollback on error
            if (context?.previousPatients) {
                queryClient.setQueryData(['patients'], context.previousPatients);
            }
        },
    });

    return {
        exerciseLogs,
        isLoading,
        isError,
        error,
        saveExerciseLog: saveExerciseLogMutation.mutateAsync,
    };
};