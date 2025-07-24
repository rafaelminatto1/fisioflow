
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Notebook } from '../types';

const NOTEBOOKS_QUERY_KEY = 'notebooks';

export const useNotebooks = () => {
    const queryClient = useQueryClient();
    
    const { data, isLoading, isError, error } = useQuery<Notebook[], Error>({
        queryKey: [NOTEBOOKS_QUERY_KEY],
        queryFn: api.getNotebooks,
    });

    const savePageMutation = useMutation<any, Error, { pageId: string, content: string }>({
        mutationFn: (data) => api.savePage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [NOTEBOOKS_QUERY_KEY] });
        },
    });

    return {
        data,
        isLoading,
        isError,
        error,
        savePage: savePageMutation.mutateAsync
    }
};