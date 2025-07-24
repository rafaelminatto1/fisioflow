
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '/services/api.js';
import { SessionNoteTemplate } from '/types.js';
import { useNotification } from '/hooks/useNotification.js';

const SESSION_NOTE_TEMPLATES_QUERY_KEY = 'sessionNoteTemplates';

export const useSessionNoteTemplates = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: templates, isLoading, isError, error } = useQuery<SessionNoteTemplate[], Error>({
        queryKey: [SESSION_NOTE_TEMPLATES_QUERY_KEY],
        queryFn: api.getSessionNoteTemplates,
    });

    const saveTemplateMutation = useMutation<SessionNoteTemplate, Error, SessionNoteTemplate>({
        mutationFn: api.saveSessionNoteTemplate,
        onSuccess: (savedTemplate) => {
            queryClient.invalidateQueries({ queryKey: [SESSION_NOTE_TEMPLATES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Template Salvo', message: `O template "${savedTemplate.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteTemplateMutation = useMutation<any, Error, string>({
        mutationFn: api.deleteSessionNoteTemplate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SESSION_NOTE_TEMPLATES_QUERY_KEY] });
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