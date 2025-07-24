import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Medication } from '../types';
import { useNotification } from './useNotification';

const MEDICATIONS_QUERY_KEY = 'medications';

export const useMedications = (patientId: string) => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: medications, isLoading, isError, error } = useQuery<Medication[], Error>({
        queryKey: [MEDICATIONS_QUERY_KEY, patientId],
        queryFn: () => api.getMedications(patientId),
        enabled: !!patientId,
    });

    const saveMedicationMutation = useMutation<Medication, Error, Medication>({
        mutationFn: (med) => api.saveMedication(med),
        onSuccess: (savedMedication) => {
            queryClient.invalidateQueries({ queryKey: [MEDICATIONS_QUERY_KEY, patientId] });
            addNotification({ type: 'success', title: 'Medicação Salva', message: `A medicação "${savedMedication.name}" foi salva.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteMedicationMutation = useMutation<any, Error, string>({
        mutationFn: (medicationId) => api.deleteMedication(medicationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [MEDICATIONS_QUERY_KEY, patientId] });
            addNotification({ type: 'info', title: 'Medicação Removida', message: 'A medicação foi removida do prontuário.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Remover', message: err.message });
        }
    });

    return {
        medications,
        isLoading,
        isError,
        error,
        saveMedication: saveMedicationMutation.mutateAsync,
        deleteMedication: deleteMedicationMutation.mutateAsync,
    };
};
