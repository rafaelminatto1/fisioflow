import { useCallback, useMemo } from 'react';
import { Patient } from '../../types';
import { INITIAL_PATIENTS } from '../../constants';
import { useOptimizedStorage } from './useOptimizedStorage';
import { useAuth } from '../useAuth';

export const usePatients = () => {
  const { user: currentUser } = useAuth();
  
  const [allPatients, setAllPatients] = useOptimizedStorage<Patient[]>(
    'fisioflow-all-patients',
    INITIAL_PATIENTS,
    ['name', 'email', 'phone', 'medicalHistory'],
    'tenantId'
  );

  // Filtrar pacientes por tenant
  const patients = useMemo(() => {
    if (!currentUser?.tenantId) return [];
    return allPatients.filter(patient => patient.tenantId === currentUser.tenantId);
  }, [allPatients, currentUser?.tenantId]);

  const addPatient = useCallback((patient: Omit<Patient, 'id' | 'tenantId'>) => {
    if (!currentUser?.tenantId) return;
    
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      tenantId: currentUser.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setAllPatients(prev => [...prev, newPatient]);
    return newPatient;
  }, [setAllPatients, currentUser?.tenantId]);

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setAllPatients(prev => 
      prev.map(patient => 
        patient.id === id 
          ? { ...patient, ...updates, updatedAt: new Date().toISOString() }
          : patient
      )
    );
  }, [setAllPatients]);

  const deletePatient = useCallback((id: string) => {
    setAllPatients(prev => prev.filter(patient => patient.id !== id));
  }, [setAllPatients]);

  const getPatientById = useCallback((id: string) => {
    return patients.find(patient => patient.id === id);
  }, [patients]);

  const searchPatients = useCallback((query: string) => {
    if (!query.trim()) return patients;
    
    const searchLower = query.toLowerCase();
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(searchLower) ||
      patient.email?.toLowerCase().includes(searchLower) ||
      patient.phone?.includes(query) ||
      patient.medicalHistory?.toLowerCase().includes(searchLower)
    );
  }, [patients]);

  const getActivePatients = useCallback(() => {
    return patients.filter(patient => patient.status === 'active');
  }, [patients]);

  const getPatientsByTherapist = useCallback((therapistId: string) => {
    return patients.filter(patient => patient.therapistId === therapistId);
  }, [patients]);

  return {
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatientById,
    searchPatients,
    getActivePatients,
    getPatientsByTherapist,
  };
};