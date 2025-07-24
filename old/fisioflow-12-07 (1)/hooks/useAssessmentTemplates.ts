import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { AssessmentTemplate } from '../types';
import { useNotification } from './useNotification';

const ASSESSMENT_TEMPLATES_QUERY_KEY = 'assessmentTemplates';

export const useAssessmentTemplates = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: templates, isLoading, isError, error } = useQuery<AssessmentTemplate[], Error>({
        queryKey: [ASSESSMENT_TEMPLATES_QUERY_KEY],
        queryFn: api.getAssessmentTemplates,
    });

    const saveTemplateMutation = useMutation<AssessmentTemplate, Error, AssessmentTemplate>({
        mutationFn: api.saveAssessmentTemplate,
        onSuccess: (savedTemplate) => {
            queryClient.invalidateQueries({ queryKey: [ASSESSMENT_TEMPLATES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Template Salvo', message: `O template "${savedTemplate.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteTemplateMutation = useMutation<any, Error, string>({
        mutationFn: api.deleteAssessmentTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ASSESSMENT_TEMPLATES_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Template Excluído', message: 'O template foi excluído.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        templates,
        isLoading,
        isError,
        error,
        saveTemplate: saveTemplateMutation.mutateAsync,
        deleteTemplate: deleteTemplateMutation.mutateAsync,
    };
};
