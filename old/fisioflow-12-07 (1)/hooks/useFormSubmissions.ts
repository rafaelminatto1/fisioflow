


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { FormSubmission } from '../types';
import { useNotification } from './useNotification';

const FORM_SUBMISSIONS_QUERY_KEY = 'formSubmissions';

export const useFormSubmissions = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: submissions, isLoading, isError, error } = useQuery<FormSubmission[], Error>({
        queryKey: [FORM_SUBMISSIONS_QUERY_KEY],
        queryFn: api.getFormSubmissions,
    });

    const saveSubmissionMutation = useMutation<FormSubmission, Error, FormSubmission>({
        mutationFn: api.saveFormSubmission,
        onSuccess: (savedSubmission) => {
            queryClient.invalidateQueries({ queryKey: [FORM_SUBMISSIONS_QUERY_KEY] });
            const message = savedSubmission.status === 'completed'
                ? 'Formulário respondido com sucesso!'
                : 'Formulário enviado ao paciente.';
            addNotification({ type: 'success', title: 'Sucesso!', message });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro', message: err.message });
        }
    });

    return {
        submissions,
        isLoading,
        isError,
        error,
        saveSubmission: saveSubmissionMutation.mutateAsync,
    };
};