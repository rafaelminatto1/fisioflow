
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { DailyLog } from '../types';
import { useNotification } from './useNotification';

const DAILY_LOGS_QUERY_KEY = 'dailyLogs';

export const useDailyLogs = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: dailyLogs, isLoading, isError, error } = useQuery<DailyLog[], Error>({
        queryKey: [DAILY_LOGS_QUERY_KEY],
        queryFn: api.getDailyLogs,
    });

    const saveDailyLogMutation = useMutation<DailyLog, Error, Omit<DailyLog, 'id'>>({
        mutationFn: api.saveDailyLog,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [DAILY_LOGS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Diário Salvo', message: 'Seu registro diário foi salvo com sucesso.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    return {
        dailyLogs,
        isLoading,
        isError,
        error,
        saveDailyLog: saveDailyLogMutation.mutateAsync,
    };
};
