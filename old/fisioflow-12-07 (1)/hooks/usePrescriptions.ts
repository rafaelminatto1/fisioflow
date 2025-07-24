import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Prescription } from '../types';
import { useNotification } from './useNotification';

const PRESCRIPTIONS_QUERY_KEY = 'prescriptions';

export const usePrescriptions = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: prescriptions, isLoading, isError, error } = useQuery<Prescription[], Error>({
        queryKey: [PRESCRIPTIONS_QUERY_KEY],
        queryFn: api.getPrescriptions,
    });

    const savePrescriptionMutation = useMutation<Prescription, Error, Prescription>({
        mutationFn: (prescription) => api.savePrescription(prescription),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRESCRIPTIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Prescrição Salva', message: 'O exercício foi prescrito com sucesso.' });
        },
    });

    const deletePrescriptionMutation = useMutation<any, Error, string>({
        mutationFn: (prescriptionId) => api.deletePrescription(prescriptionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PRESCRIPTIONS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
            addNotification({ type: 'info', title: 'Prescrição Removida', message: 'A prescrição foi removida do plano do paciente.' });
        },
    });

    return {
        prescriptions,
        isLoading,
        isError,
        error,
        savePrescription: savePrescriptionMutation.mutateAsync,
        deletePrescription: deletePrescriptionMutation.mutateAsync,
    };
};
