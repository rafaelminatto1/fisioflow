import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';
import { AppointmentLog } from '../types';

const APPOINTMENT_LOGS_QUERY_KEY = 'appointmentLogs';

export const useAppointmentLogs = (appointmentId: string) => {
    const { data: logs, isLoading, isError, error } = useQuery<AppointmentLog[], Error>({
        queryKey: [APPOINTMENT_LOGS_QUERY_KEY, appointmentId],
        queryFn: () => api.getAppointmentLogs(appointmentId),
        enabled: !!appointmentId, // Only run if appointmentId is provided
    });

    return {
        logs,
        isLoading,
        isError,
        error,
    };
};
