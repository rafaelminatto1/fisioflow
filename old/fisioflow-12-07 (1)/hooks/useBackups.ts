
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Backup } from '../types';
import { useNotification } from './useNotification';
import { useAuth } from './useAuth';

const BACKUPS_QUERY_KEY = 'backups';

export const useBackups = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();
    const { user } = useAuth();

    const { data: backups, isLoading, isError, error } = useQuery<Backup[], Error>({
        queryKey: [BACKUPS_QUERY_KEY],
        queryFn: api.getBackups,
    });

    const createBackupMutation = useMutation<Backup, Error, void, { previousBackups?: Backup[] }>({
        mutationFn: () => {
             if (!user) throw new Error("Usuário não autenticado.");
            return api.createManualBackup(user.id);
        },
        onMutate: async () => {
            // Optimistically show the 'in_progress' state
             await queryClient.cancelQueries({ queryKey: [BACKUPS_QUERY_KEY] });
            const previousBackups = queryClient.getQueryData<Backup[]>([BACKUPS_QUERY_KEY]);
            queryClient.setQueryData<Backup[]>([BACKUPS_QUERY_KEY], (old = []) => [
                { id: 'temp', status: 'in_progress', timestamp: new Date().toISOString(), version: '...' },
                ...old,
            ]);
            return { previousBackups };
        },
        onSuccess: () => {
            addNotification({ type: 'success', title: 'Backup Concluído', message: 'O backup manual foi criado com sucesso.' });
        },
        onError: (err, newBackup, context) => {
             if (context?.previousBackups) {
                queryClient.setQueryData([BACKUPS_QUERY_KEY], context.previousBackups);
            }
            addNotification({ type: 'error', title: 'Falha no Backup', message: err.message });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [BACKUPS_QUERY_KEY] });
        },
    });

    const restoreBackupMutation = useMutation<any, Error, string>({
        mutationFn: (backupId: string) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.restoreFromBackup(backupId, user.id);
        },
        onSuccess: () => {
            addNotification({ type: 'success', title: 'Restauração Iniciada', message: 'O sistema está sendo restaurado. Isso pode levar alguns minutos.' });
            // In a real app, you might want to force a reload or show an overlay
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Falha na Restauração', message: err.message });
        },
    });
    
    const deleteBackupMutation = useMutation<any, Error, string>({
        mutationFn: (backupId: string) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deleteBackup(backupId, user.id);
        },
        onSuccess: () => {
            addNotification({ type: 'info', title: 'Backup Excluído', message: 'O backup selecionado foi excluído.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Falha ao Excluir', message: err.message });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [BACKUPS_QUERY_KEY] });
        }
    });

    return {
        backups,
        isLoading,
        isError,
        error,
        createBackup: createBackupMutation.mutateAsync,
        isCreating: createBackupMutation.isPending,
        restoreBackup: restoreBackupMutation.mutateAsync,
        isRestoring: restoreBackupMutation.isPending,
        deleteBackup: deleteBackupMutation.mutateAsync,
        isDeleting: deleteBackupMutation.isPending,
    };
};