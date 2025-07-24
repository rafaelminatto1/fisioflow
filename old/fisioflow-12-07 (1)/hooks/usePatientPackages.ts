import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { PatientPackage } from '../types';
import { useNotification } from './useNotification';

const PATIENT_PACKAGES_QUERY_KEY = 'patientPackages';

export const usePatientPackages = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: patientPackages, isLoading, isError, error } = useQuery<PatientPackage[], Error>({
        queryKey: [PATIENT_PACKAGES_QUERY_KEY],
        queryFn: api.getPatientPackages,
    });

    const assignPackageMutation = useMutation<PatientPackage, Error, { patientId: string; packageId: string; }>({
        mutationFn: api.assignPackageToPatient,
        onSuccess: (savedPatientPackage) => {
            queryClient.invalidateQueries({ queryKey: [PATIENT_PACKAGES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Invalidate transactions because a new one is created
            addNotification({ type: 'success', title: 'Pacote Vendido', message: `O pacote foi vendido com sucesso.` });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Vender Pacote', message: err.message });
        }
    });

    return {
        patientPackages,
        isLoading,
        isError,
        error,
        assignPackage: assignPackageMutation.mutateAsync,
    };
};
