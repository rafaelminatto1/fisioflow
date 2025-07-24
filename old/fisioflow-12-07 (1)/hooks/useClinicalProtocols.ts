import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { ClinicalProtocol } from '../types';
import { useNotification } from './useNotification';

const PROTOCOLS_QUERY_KEY = 'clinicalProtocols';

export const useClinicalProtocols = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: protocols, isLoading, isError, error } = useQuery<ClinicalProtocol[], Error>({
        queryKey: [PROTOCOLS_QUERY_KEY],
        queryFn: api.getClinicalProtocols,
    });

    const saveProtocolMutation = useMutation<ClinicalProtocol, Error, ClinicalProtocol>({
        mutationFn: api.saveClinicalProtocol,
        onSuccess: (savedProtocol) => {
            queryClient.invalidateQueries({ queryKey: [PROTOCOLS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Protocolo Salvo', message: `O protocolo "${savedProtocol.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteProtocolMutation = useMutation<any, Error, string>({
        mutationFn: api.deleteClinicalProtocol,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PROTOCOLS_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Protocolo Excluído', message: 'O protocolo foi excluído.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        protocols,
        isLoading,
        isError,
        error,
        saveProtocol: saveProtocolMutation.mutateAsync,
        deleteProtocol: deleteProtocolMutation.mutateAsync,
    };
};
