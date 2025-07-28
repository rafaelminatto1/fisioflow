import { useState, useEffect, useCallback } from 'react';

import { patientService, realtimeService } from '../services/supabase';
import { Patient } from '../types';

import { useAuth } from './useAuth';
import { useNotification } from './useNotification';

interface UseSupabasePatientsReturn {
  patients: Patient[];
  loading: boolean;
  error: string | null;
  createPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient | null>;
  deletePatient: (id: string) => Promise<boolean>;
  searchPatients: (query: string) => Promise<Patient[]>;
  refreshPatients: () => Promise<void>;
}

export const useSupabasePatients = (): UseSupabasePatientsReturn => {
  const { currentTenant } = useAuth();
  const { showNotification } = useNotification();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar pacientes
  const loadPatients = useCallback(async () => {
    if (!currentTenant) {
      setPatients([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await patientService.getPatients(currentTenant.id);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Converter dados do Supabase para formato da aplicação
      const convertedPatients: Patient[] = (data || []).map(patient => ({
        id: patient.id,
        name: patient.name,
        email: patient.email || '',
        phone: patient.phone || '',
        dateOfBirth: patient.date_of_birth || '',
        gender: patient.gender as 'M' | 'F' | 'Outro' || 'Outro',
        address: patient.address || '',
        medicalHistory: patient.medical_history || '',
        currentCondition: patient.current_condition || '',
        status: patient.status as 'Ativo' | 'Inativo' | 'Alta' || 'Ativo',
        tenantId: patient.tenant_id,
        assignedTherapistId: patient.assigned_therapist_id,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
        // Campos adicionais do relacionamento
        assignedTherapist: patient.assigned_therapist ? {
          id: patient.assigned_therapist.id,
          name: patient.assigned_therapist.name,
          email: patient.assigned_therapist.email,
        } : undefined,
      }));

      setPatients(convertedPatients);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar pacientes';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTenant, showNotification]);

  // Criar paciente
  const createPatient = useCallback(async (
    patientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Patient | null> => {
    if (!currentTenant) return null;

    try {
      const supabasePatient = {
        name: patientData.name,
        email: patientData.email || null,
        phone: patientData.phone || null,
        date_of_birth: patientData.dateOfBirth || null,
        gender: patientData.gender || null,
        address: patientData.address || null,
        medical_history: patientData.medicalHistory || null,
        current_condition: patientData.currentCondition || null,
        status: patientData.status || 'Ativo',
        tenant_id: currentTenant.id,
        assigned_therapist_id: patientData.assignedTherapistId || null,
      };

      const { data, error: supabaseError } = await patientService.createPatient(supabasePatient);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data) {
        const newPatient: Patient = {
          id: data.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          dateOfBirth: data.date_of_birth || '',
          gender: data.gender as 'M' | 'F' | 'Outro' || 'Outro',
          address: data.address || '',
          medicalHistory: data.medical_history || '',
          currentCondition: data.current_condition || '',
          status: data.status as 'Ativo' | 'Inativo' | 'Alta' || 'Ativo',
          tenantId: data.tenant_id,
          assignedTherapistId: data.assigned_therapist_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        showNotification('Paciente criado com sucesso!', 'success');
        return newPatient;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar paciente';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }

    return null;
  }, [currentTenant, showNotification]);

  // Atualizar paciente
  const updatePatient = useCallback(async (
    id: string, 
    updates: Partial<Patient>
  ): Promise<Patient | null> => {
    try {
      const supabaseUpdates = {
        name: updates.name,
        email: updates.email || null,
        phone: updates.phone || null,
        date_of_birth: updates.dateOfBirth || null,
        gender: updates.gender || null,
        address: updates.address || null,
        medical_history: updates.medicalHistory || null,
        current_condition: updates.currentCondition || null,
        status: updates.status || null,
        assigned_therapist_id: updates.assignedTherapistId || null,
      };

      // Remover campos undefined
      Object.keys(supabaseUpdates).forEach(key => {
        if (supabaseUpdates[key as keyof typeof supabaseUpdates] === undefined) {
          delete supabaseUpdates[key as keyof typeof supabaseUpdates];
        }
      });

      const { data, error: supabaseError } = await patientService.updatePatient(id, supabaseUpdates);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (data) {
        const updatedPatient: Patient = {
          id: data.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          dateOfBirth: data.date_of_birth || '',
          gender: data.gender as 'M' | 'F' | 'Outro' || 'Outro',
          address: data.address || '',
          medicalHistory: data.medical_history || '',
          currentCondition: data.current_condition || '',
          status: data.status as 'Ativo' | 'Inativo' | 'Alta' || 'Ativo',
          tenantId: data.tenant_id,
          assignedTherapistId: data.assigned_therapist_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        showNotification('Paciente atualizado com sucesso!', 'success');
        return updatedPatient;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar paciente';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
    }

    return null;
  }, [showNotification]);

  // Deletar paciente
  const deletePatient = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: supabaseError } = await patientService.deletePatient(id);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      showNotification('Paciente removido com sucesso!', 'success');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover paciente';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return false;
    }
  }, [showNotification]);

  // Buscar pacientes
  const searchPatients = useCallback(async (query: string): Promise<Patient[]> => {
    if (!currentTenant) return [];

    try {
      const { data, error: supabaseError } = await patientService.searchPatients(currentTenant.id, query);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      return (data || []).map(patient => ({
        id: patient.id,
        name: patient.name,
        email: patient.email || '',
        phone: patient.phone || '',
        dateOfBirth: patient.date_of_birth || '',
        gender: patient.gender as 'M' | 'F' | 'Outro' || 'Outro',
        address: patient.address || '',
        medicalHistory: patient.medical_history || '',
        currentCondition: patient.current_condition || '',
        status: patient.status as 'Ativo' | 'Inativo' | 'Alta' || 'Ativo',
        tenantId: patient.tenant_id,
        assignedTherapistId: patient.assigned_therapist_id,
        createdAt: patient.created_at,
        updatedAt: patient.updated_at,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar pacientes';
      setError(errorMessage);
      showNotification(errorMessage, 'error');
      return [];
    }
  }, [currentTenant, showNotification]);

  // Atualizar lista de pacientes
  const refreshPatients = useCallback(async () => {
    await loadPatients();
  }, [loadPatients]);

  // Carregamento inicial
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Subscription para atualizações em tempo real
  useEffect(() => {
    if (!currentTenant) return;

    const subscription = realtimeService.subscribeToPatients(
      currentTenant.id,
      (payload) => {
        console.log('Realtime update:', payload);
        // Recarregar dados quando houver mudanças
        loadPatients();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [currentTenant, loadPatients]);

  return {
    patients,
    loading,
    error,
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    refreshPatients,
  };
};