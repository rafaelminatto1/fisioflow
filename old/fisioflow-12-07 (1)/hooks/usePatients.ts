
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Patient, PersonalGoal, Task, FormSubmission, AutomationTriggerType, AutomationActionType } from '../types';
import { useAuth } from './useAuth';
import { useAutomations } from './useAutomations';
import { useTasks } from './useTasks';
import { useFormSubmissions } from './useFormSubmissions';

const PATIENTS_QUERY_KEY = 'patients';

export const usePatients = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    
    // Hooks for automation actions
    const { automations } = useAutomations();
    const { saveTask } = useTasks();
    const { saveSubmission } = useFormSubmissions();

    const { data: patients, isLoading, isError, error } = useQuery<Patient[], Error>({
        queryKey: [PATIENTS_QUERY_KEY, user?.id],
        queryFn: () => api.getPatients(user || undefined),
        enabled: !!user, // Only run if user is logged in
    });

    const savePatientMutation = useMutation<Patient, Error, Patient>({
        mutationFn: (patient) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.savePatient(patient, user.id);
        },
        onSuccess: (savedPatient, variables) => {
            const isNew = !variables.id;
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });

            if (isNew && automations) {
                const patientCreatedAutomations = automations.filter(
                    a => a.trigger.type === AutomationTriggerType.PATIENT_CREATED
                );
                
                patientCreatedAutomations.forEach(auto => {
                    console.log(`Running automation: ${auto.name}`);
                    if (auto.action.type === AutomationActionType.CREATE_TASK) {
                        saveTask({
                            projectId: 'proj-1',
                            title: auto.action.value,
                            patientId: savedPatient.id,
                            assigneeId: auto.action.assigneeId || user?.id,
                            status: 'todo',
                            priority: 'medium'
                        } as Task);
                    } else if (auto.action.type === AutomationActionType.SEND_FORM) {
                        saveSubmission({
                            patientId: savedPatient.id,
                            formTemplateId: auto.action.value,
                            submissionDate: new Date().toISOString(),
                            status: 'pending',
                            answers: [],
                        } as FormSubmission)
                    }
                });
            }
        },
    });
    
    const deletePatientMutation = useMutation<any, Error, string>({
        mutationFn: (patientId) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deletePatient(patientId, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });
            // Invalidate other queries that might be affected
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
            queryClient.invalidateQueries({ queryKey: ['exerciseLogs'] });
            queryClient.invalidateQueries({ queryKey: ['assessments'] });
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
            queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
            queryClient.invalidateQueries({ queryKey: ['therapistGoals'] });
        },
    });

    const addPersonalGoalMutation = useMutation<PersonalGoal, Error, { patientId: string, text: string }>({
        mutationFn: api.addPersonalGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });
        }
    });

    const updatePersonalGoalMutation = useMutation<PersonalGoal, Error, { patientId: string, goalId: string, completed: boolean }>({
        mutationFn: api.updatePersonalGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });
        }
    });
    
    const deletePersonalGoalMutation = useMutation<any, Error, { patientId: string, goalId: string }>({
        mutationFn: api.deletePersonalGoal,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });
        }
    });
    
    const applyProtocolMutation = useMutation<Patient, Error, { patientId: string, protocolId: string }>({
        mutationFn: api.applyProtocolToPatient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [PATIENTS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
        },
    });

    return {
        patients,
        isLoading,
        isError,
        error,
        savePatient: savePatientMutation.mutateAsync,
        deletePatient: deletePatientMutation.mutateAsync,
        isSaving: savePatientMutation.isPending,
        addPersonalGoal: addPersonalGoalMutation.mutateAsync,
        updatePersonalGoal: updatePersonalGoalMutation.mutateAsync,
        deletePersonalGoal: deletePersonalGoalMutation.mutateAsync,
        applyProtocol: applyProtocolMutation.mutateAsync,
    };
};