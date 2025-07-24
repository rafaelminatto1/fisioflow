
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '/services/api.js';
import { Service } from '/types.js';
import { useNotification } from '/hooks/useNotification.js';

const SERVICES_QUERY_KEY = 'services';

export const useServices = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: services, isLoading, isError, error } = useQuery<Service[], Error>({
        queryKey: [SERVICES_QUERY_KEY],
        queryFn: api.getServices,
    });

    const saveServiceMutation = useMutation<Service, Error, Service>({
        mutationFn: (service) => api.saveService(service),
        onSuccess: (savedService) => {
            queryClient.invalidateQueries({ queryKey: [SERVICES_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Serviço Salvo', message: `O serviço "${savedService.name}" foi salvo com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteServiceMutation = useMutation<any, Error, string>({
        mutationFn: (serviceId) => api.deleteService(serviceId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SERVICES_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Serviço Excluído', message: 'O serviço foi excluído.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        services,
        isLoading,
        isError,
        error,
        saveService: saveServiceMutation.mutateAsync,
        deleteService: deleteServiceMutation.mutateAsync,
    };
};