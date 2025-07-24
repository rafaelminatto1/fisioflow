
import { useMemo } from 'react';
import { useAssessments } from '/hooks/useAssessments.js';
import { useSessionNotes } from '/hooks/useSessionNotes.js';
import { usePatients } from '/hooks/usePatients.js';
import { useDailyLogs } from '/hooks/useDailyLogs.js';

export const usePatientDetailData = (patientId: string | null) => {
    const { patients = [] } = usePatients();
    const { assessments = [] } = useAssessments();
    const { sessionNotes = [] } = useSessionNotes();
    const { dailyLogs = [] } = useDailyLogs();

    const patient = useMemo(() => 
        patientId ? patients.find(p => p.id === patientId) : null,
        [patients, patientId]
    );

    const patientAssessments = useMemo(() =>
        patientId ? assessments.filter(a => a.patientId === patientId) : [],
        [assessments, patientId]
    );

    const patientSessionNotes = useMemo(() =>
        patientId ? sessionNotes.filter(sn => sn.patientId === patientId) : [],
        [sessionNotes, patientId]
    );

    const patientDailyLogs = useMemo(() =>
        patientId ? dailyLogs.filter(log => log.patientId === patientId) : [],
        [dailyLogs, patientId]
    );

    return {
        patient,
        patientAssessments,
        patientSessionNotes,
        patientDailyLogs,
    };
};