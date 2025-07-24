import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Package } from '../types';
import { useNotification } from './useNotification';

const PACKAGES_QUERY_KEY = 'packages';

export const usePackages = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: packages, isLoading, isError, error } = useQuery<Package[], Error>({
        queryKey: [PACKAGES_QUERY_KEY],
        queryFn: api.getPackages,
    });

    const savePackageMutation = useMutation<Package, Error, Package>({
        mutationFn: (pkg) => api.savePackage(pkg),
        onSuccess: (savedPackage) => {
            queryClient.invalidateQueries({ queryKey: [PACKAGES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Pacote Salvo', message: `O pacote "${savedPackage.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deletePackageMutation = useMutation<any, Error, string>({
        mutationFn: (packageId) => api.deletePackage(packageId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PACKAGES_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Pacote Excluído', message: 'O pacote foi excluído.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        packages,
        isLoading,
        isError,
        error,
        savePackage: savePackageMutation.mutateAsync,
        deletePackage: deletePackageMutation.mutateAsync,
    };
};
