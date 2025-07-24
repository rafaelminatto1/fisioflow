
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '/services/api.js';
import { ClinicSettings } from '/types.js';
import { useNotification } from '/hooks/useNotification.js';

const SETTINGS_QUERY_KEY = 'settings';

export const useSettings = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: settings, isLoading, isError, error } = useQuery<ClinicSettings, Error>({
        queryKey: [SETTINGS_QUERY_KEY],
        queryFn: api.getSettings,
    });

    const saveSettingsMutation = useMutation<ClinicSettings, Error, ClinicSettings>({
        mutationFn: api.saveSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Configurações Salvas', message: 'As informações da clínica foram atualizadas.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    return {
        settings,
        isLoading,
        isError,
        error,
        saveSettings: saveSettingsMutation.mutateAsync,
        isSaving: saveSettingsMutation.isPending,
    };
};