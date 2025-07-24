import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Assessment } from '../types';
import { useNotification } from './useNotification';
import { ACHIEVEMENTS_LIST } from '../constants';
import { useAuth } from './useAuth';

const ASSESSMENTS_QUERY_KEY = 'assessments';

export const useAssessments = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();
    const { user } = useAuth();

    const { data: assessments, isLoading, isError, error } = useQuery<Assessment[], Error>({
        queryKey: [ASSESSMENTS_QUERY_KEY],
        queryFn: api.getAssessments,
    });

    const saveAssessmentMutation = useMutation<Assessment, Error, Assessment>({
        mutationFn: (assessment) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.saveAssessment(assessment, user.id)
        },
        onSuccess: (savedAssessment) => {
            queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
            
            // This is a client-side check, ideally backend would return this info
            const patientAssessments = queryClient.getQueryData<Assessment[]>([ASSESSMENTS_QUERY_KEY]) || [];
            const isFirstAssessmentForPatient = patientAssessments.filter(a => a.patientId === savedAssessment.patientId).length === 1;

            if (isFirstAssessmentForPatient) {
                const achievement = ACHIEVEMENTS_LIST.find(a => a.id === 'first-assessment');
                 if(achievement){
                    addNotification({type: 'achievement', title: 'Conquista Desbloqueada!', message: `Você ganhou: ${achievement.title}`});
                    // Invalidate patients to update their achievement list
                    queryClient.invalidateQueries({ queryKey: ['patients'] });
                }
            }

            addNotification({ type: 'success', title: 'Avaliação Salva', message: 'A avaliação do paciente foi salva com sucesso.' });
        },
    });

    const deleteAssessmentMutation = useMutation<any, Error, string>({
        mutationFn: (assessmentId) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deleteAssessment(assessmentId, user.id)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ASSESSMENTS_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Avaliação Excluída', message: 'A avaliação foi excluída.' });
        },
    });

    return {
        assessments,
        isLoading,
        isError,
        error,
        saveAssessment: saveAssessmentMutation.mutateAsync,
        deleteAssessment: deleteAssessmentMutation.mutateAsync,
    };
};
