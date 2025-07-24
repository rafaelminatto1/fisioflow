



import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.js';
import { RolePermissions } from '../types.js';
import { useNotification } from './useNotification.js';

const PERMISSIONS_QUERY_KEY = 'permissions';

export const usePermissions = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: permissions, isLoading, isError } = useQuery<RolePermissions, Error>({
        queryKey: [PERMISSIONS_QUERY_KEY],
        queryFn: api.getPermissions,
    });

    const savePermissionsMutation = useMutation<RolePermissions, Error, RolePermissions>({
        mutationFn: api.savePermissions,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PERMISSIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Permissões Salvas', message: 'As permissões do sistema foram atualizadas.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });
    
    return {
        permissions,
        isLoading,
        isError,
        savePermissions: savePermissionsMutation.mutateAsync,
        isSaving: savePermissionsMutation.isPending,
    };
};