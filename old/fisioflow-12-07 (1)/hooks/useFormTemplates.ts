import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { FormTemplate } from '../types';
import { useNotification } from './useNotification';

const FORM_TEMPLATES_QUERY_KEY = 'formTemplates';

export const useFormTemplates = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: templates, isLoading, isError, error } = useQuery<FormTemplate[], Error>({
        queryKey: [FORM_TEMPLATES_QUERY_KEY],
        queryFn: api.getFormTemplates,
    });

    const saveTemplateMutation = useMutation<FormTemplate, Error, FormTemplate>({
        mutationFn: (template) => api.saveFormTemplate(template),
        onSuccess: (savedTemplate) => {
            queryClient.invalidateQueries({ queryKey: [FORM_TEMPLATES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Template Salvo', message: `O formulário "${savedTemplate.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteTemplateMutation = useMutation<any, Error, string>({
        mutationFn: (templateId) => api.deleteFormTemplate(templateId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [FORM_TEMPLATES_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Template Excluído', message: 'O formulário foi excluído.' });
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
