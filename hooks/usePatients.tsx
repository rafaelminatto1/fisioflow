/**
 * usePatients - Hook especializado para gerenciamento de pacientes
 * Extraído do useData.tsx monolítico para melhor manutenibilidade
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Patient, UserRole } from '../types';
import { INITIAL_PATIENTS } from '../constants';
import { useOptimizedStorage } from './useOptimizedStorage';
import { useAuth } from './useAuth';
import { useNotification } from './useNotification';

interface PatientsContextType {
  patients: Patient[];
  addPatient: (patient: Omit<Patient, 'id'>) => void;
  updatePatient: (id: string, updates: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  getPatient: (id: string) => Patient | undefined;
  searchPatients: (query: string) => Patient[];
  getPatientsByStatus: (status: string) => Patient[];
  loading: boolean;
  error: string | null;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export const PatientsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  
  const [allPatients, setAllPatients] = useOptimizedStorage<Patient[]>(
    'fisioflow-all-patients',
    INITIAL_PATIENTS,
    ['name', 'email', 'phone', 'medicalHistory'], // campos de busca otimizada
    'tenantId'
  );

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Filtra pacientes por tenant
  const patients = React.useMemo(() => {
    if (!user?.tenantId) return [];
    return allPatients.filter(patient => patient.tenantId === user.tenantId);
  }, [allPatients, user?.tenantId]);

  const addPatient = React.useCallback((patientData: Omit<Patient, 'id'>) => {
    try {
      setLoading(true);
      const newPatient: Patient = {
        ...patientData,
        id: `patient_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: user?.tenantId || 't1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAllPatients(prev => [...prev, newPatient]);
      
      addNotification({
        type: 'success',
        message: `Paciente ${newPatient.name} adicionado com sucesso`,
      });

      console.log(`👤 Novo paciente adicionado: ${newPatient.name} (${newPatient.id})`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao adicionar paciente: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, setAllPatients, addNotification]);

  const updatePatient = React.useCallback((id: string, updates: Partial<Patient>) => {
    try {
      setLoading(true);
      setAllPatients(prev => 
        prev.map(patient => 
          patient.id === id 
            ? { ...patient, ...updates, updatedAt: new Date().toISOString() }
            : patient
        )
      );

      addNotification({
        type: 'success', 
        message: 'Paciente atualizado com sucesso',
      });

      console.log(`👤 Paciente atualizado: ${id}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao atualizar paciente: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [setAllPatients, addNotification]);

  const deletePatient = React.useCallback((id: string) => {
    try {
      setLoading(true);
      const patientToDelete = patients.find(p => p.id === id);
      
      setAllPatients(prev => prev.filter(patient => patient.id !== id));
      
      addNotification({
        type: 'success',
        message: `Paciente ${patientToDelete?.name || id} removido com sucesso`,
      });

      console.log(`👤 Paciente removido: ${id}`);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMsg);
      addNotification({
        type: 'error',
        message: `Erro ao remover paciente: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  }, [patients, setAllPatients, addNotification]);

  const getPatient = React.useCallback((id: string) => {
    return patients.find(patient => patient.id === id);
  }, [patients]);

  const searchPatients = React.useCallback((query: string) => {
    if (!query.trim()) return patients;
    
    const lowerQuery = query.toLowerCase();
    return patients.filter(patient => 
      patient.name.toLowerCase().includes(lowerQuery) ||
      patient.email?.toLowerCase().includes(lowerQuery) ||
      patient.phone?.toLowerCase().includes(lowerQuery) ||
      patient.medicalHistory?.toLowerCase().includes(lowerQuery)
    );
  }, [patients]);

  const getPatientsByStatus = React.useCallback((status: string) => {
    return patients.filter(patient => patient.status === status);
  }, [patients]);

  // Limpa erros automaticamente
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const contextValue: PatientsContextType = React.useMemo(() => ({
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    getPatientsByStatus,
    loading,
    error,
  }), [
    patients,
    addPatient,
    updatePatient,
    deletePatient,
    getPatient,
    searchPatients,
    getPatientsByStatus,
    loading,
    error,
  ]);

  return (
    <PatientsContext.Provider value={contextValue}>
      {children}
    </PatientsContext.Provider>
  );
};

export const usePatients = (): PatientsContextType => {
  const context = useContext(PatientsContext);
  if (!context) {
    throw new Error('usePatients must be used within PatientsProvider');
  }
  return context;
};

// Hook para estatísticas de pacientes
export const usePatientsStats = () => {
  const { patients } = usePatients();

  return React.useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'active').length;
    const inactive = patients.filter(p => p.status === 'inactive').length;
    const newThisMonth = patients.filter(p => {
      const created = new Date(p.createdAt);
      const now = new Date();
      return created.getMonth() === now.getMonth() && 
             created.getFullYear() === now.getFullYear();
    }).length;

    return {
      total,
      active,
      inactive,
      newThisMonth,
      activePercentage: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }, [patients]);
};

export default usePatients;