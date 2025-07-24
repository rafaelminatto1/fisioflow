
import { useQuery } from '@tanstack/react-query';
import { usePatients } from '/hooks/usePatients.js';
import { useAssessments } from '/hooks/useAssessments.js';
import { useExerciseLogs } from '/hooks/useExerciseLogs.js';
import { useTherapistGoals } from '/hooks/useTherapistGoals.js';

const POPOVER_DATA_QUERY_KEY = 'patientPopoverData';

export const usePatientPopoverData = (patientId: string, enabled: boolean) => {
    const { patients } = usePatients();
    const { assessments } = useAssessments();
    const { exerciseLogs } = useExerciseLogs();
    const { goals } = useTherapistGoals();

    const { data, isLoading } = useQuery({
        queryKey: [POPOVER_DATA_QUERY_KEY, patientId],
        queryFn: async () => {
            const patient = patients?.find(p => p.id === patientId);
            
            const patientAssessments = assessments?.filter(a => a.patientId === patientId)
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latestAssessment = patientAssessments?.[0];

            const patientLogs = exerciseLogs?.filter(l => l.patientId === patientId)
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const lastPainLevel = patientLogs?.[0]?.painLevel ?? null;
            
            const mainGoal = goals?.find(g => g.patientId === patientId)?.description;

            return {
                patientName: patient?.name,
                diagnosticHypothesis: latestAssessment?.diagnosticHypothesis,
                lastPainLevel,
                mainGoal
            };
        },
        enabled: enabled && !!patientId, // Only fetch when the popover is open
        staleTime: 1000 * 60, // Cache for 1 minute
    });

    return { data, isLoading };
};