
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Appointment, Task, FormSubmission, AutomationTriggerType, AutomationActionType } from '../types';
import { useAuth } from './useAuth';
import { useAutomations } from './useAutomations';
import { useTasks } from './useTasks';
import { useFormSubmissions } from './useFormSubmissions';

const APPOINTMENTS_QUERY_KEY = 'appointments';

export const useAppointments = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    
    // Hooks for automation actions
    const { automations } = useAutomations();
    const { saveTask } = useTasks();
    const { saveSubmission } = useFormSubmissions();

    const { data: appointments, isLoading, isError, error } = useQuery<Appointment[], Error>({
        queryKey: [APPOINTMENTS_QUERY_KEY],
        queryFn: api.getAppointments,
    });

    const saveAppointmentMutation = useMutation<Appointment, Error, Partial<Appointment>, { previousAppointments?: Appointment[] }>({
        mutationFn: (appointment) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.saveAppointment(appointment, user.id);
        },
        onMutate: async (updatedAppointment) => {
            await queryClient.cancelQueries({ queryKey: [APPOINTMENTS_QUERY_KEY] });
            const previousAppointments = queryClient.getQueryData<Appointment[]>([APPOINTMENTS_QUERY_KEY]);
            return { previousAppointments };
        },
        onSuccess: (savedAppointment, variables, context) => {
            const previousAppointment = context?.previousAppointments?.find(a => a.id === savedAppointment.id);

            if (savedAppointment.status === 'realizado' && previousAppointment?.status !== 'realizado' && automations) {
                const allAppointments = [...(context?.previousAppointments || []), savedAppointment];
                const completedSessionsCount = allAppointments.filter(
                    a => a.patientId === savedAppointment.patientId && a.status === 'realizado'
                ).length;
                
                const sessionAutomations = automations.filter(a => 
                    a.trigger.type === AutomationTriggerType.SESSIONS_COMPLETED &&
                    a.trigger.value === completedSessionsCount
                );

                sessionAutomations.forEach(auto => {
                     console.log(`Running automation: ${auto.name}`);
                    if (auto.action.type === AutomationActionType.CREATE_TASK) {
                        saveTask({
                            projectId: 'proj-1',
                            title: auto.action.value,
                            patientId: savedAppointment.patientId,
                            assigneeId: auto.action.assigneeId || user?.id,
                            status: 'todo',
                            priority: 'medium'
                        } as Task);
                    } else if (auto.action.type === AutomationActionType.SEND_FORM) {
                         saveSubmission({
                            patientId: savedAppointment.patientId,
                            formTemplateId: auto.action.value,
                            submissionDate: new Date().toISOString(),
                            status: 'pending',
                            answers: [],
                        } as FormSubmission)
                    }
                });
            }
        },
        onError: (err, newAppointment, context) => {
            if (context?.previousAppointments) {
                queryClient.setQueryData([APPOINTMENTS_QUERY_KEY], context.previousAppointments);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['appointmentLogs'] });
        },
    });

    const deleteAppointmentMutation = useMutation<any, Error, string>({
        mutationFn: (appointmentId: string) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deleteAppointment(appointmentId, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['appointmentLogs'] });
        },
    });

    const deleteAppointmentSeriesMutation = useMutation<any, Error, string>({
        mutationFn: (appointmentId: string) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deleteAppointmentSeries(appointmentId, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [APPOINTMENTS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['appointmentLogs'] });
        },
    });

    return {
        appointments,
        isLoading,
        isError,
        error,
        saveAppointment: saveAppointmentMutation.mutateAsync,
        deleteAppointment: deleteAppointmentMutation.mutateAsync,
        deleteAppointmentSeries: deleteAppointmentSeriesMutation.mutateAsync,
        isSaving: saveAppointmentMutation.isPending,
    };
};