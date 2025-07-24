
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Automation } from '../types';
import { useNotification } from './useNotification';

const AUTOMATIONS_QUERY_KEY = 'automations';

export const useAutomations = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: automations, isLoading, isError, error } = useQuery<Automation[], Error>({
        queryKey: [AUTOMATIONS_QUERY_KEY],
        queryFn: api.getAutomations,
    });

    const saveAutomationMutation = useMutation<Automation, Error, Automation>({
        mutationFn: (automation) => api.saveAutomation(automation),
        onSuccess: (savedAutomation) => {
            queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Automação Salva', message: `A automação "${savedAutomation.name}" foi salva.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        },
    });

    const deleteAutomationMutation = useMutation<any, Error, string>({
        mutationFn: (automationId) => api.deleteAutomation(automationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Automação Excluída', message: 'A regra de automação foi excluída.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        },
    });

    return {
        automations,
        isLoading,
        isError,
        error,
        saveAutomation: saveAutomationMutation.mutateAsync,
        deleteAutomation: deleteAutomationMutation.mutateAsync,
        isSaving: saveAutomationMutation.isPending,
    };
};