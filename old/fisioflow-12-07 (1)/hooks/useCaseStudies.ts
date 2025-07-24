import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { EducationalCaseStudy } from '../types';
import { useNotification } from './useNotification';

const CASE_STUDIES_QUERY_KEY = 'caseStudies';

export const useCaseStudies = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: caseStudies, isLoading, isError, error } = useQuery<EducationalCaseStudy[], Error>({
        queryKey: [CASE_STUDIES_QUERY_KEY],
        queryFn: api.getEducationalCaseStudies,
    });

    const saveCaseStudyMutation = useMutation<EducationalCaseStudy, Error, EducationalCaseStudy>({
        mutationFn: (study) => api.saveEducationalCaseStudy(study),
        onSuccess: (savedCase) => {
            queryClient.invalidateQueries({ queryKey: [CASE_STUDIES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Caso de Estudo Salvo', message: `O caso "${savedCase.title}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteCaseStudyMutation = useMutation<any, Error, string>({
        mutationFn: (studyId) => api.deleteEducationalCaseStudy(studyId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CASE_STUDIES_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Caso de Estudo Excluído', message: 'O caso de estudo foi removido.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        caseStudies,
        isLoading,
        isError,
        error,
        saveCaseStudy: saveCaseStudyMutation.mutateAsync,
        deleteCaseStudy: deleteCaseStudyMutation.mutateAsync,
    };
};
