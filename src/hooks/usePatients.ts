/**
 * Hook especializado para gerenciamento de pacientes
 *
 * Este hook substitui as funcionalidades relacionadas a pacientes do useData,
 * proporcionando melhor organização, cache otimizado e tipagem específica.
 *
 * Funcionalidades:
 * - Listagem de pacientes com filtros
 * - Criação e atualização de pacientes
 * - Exclusão de pacientes
 * - Busca por nome, email ou telefone
 * - Filtros por status, plano e data de cadastro
 * - Validações específicas para sistema freemium
 * - Cache otimizado com React Query
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';

// Tipos
export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  medicalHistory: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    surgeries: string[];
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'pro' | 'premium';
  consentGiven: boolean;
  createdAt: string;
  updatedAt: string;
  lastVisit?: string;
  totalSessions: number;
  totalAssessments: number;
  totalDocuments: number;
}

export interface CreatePatientData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  medicalHistory?: {
    conditions?: string[];
    medications?: string[];
    allergies?: string[];
    surgeries?: string[];
  };
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  consentGiven: boolean;
}

export interface UpdatePatientData extends Partial<CreatePatientData> {
  id: string;
}

export interface PatientFilters {
  status?: 'active' | 'inactive' | 'suspended';
  plan?: 'free' | 'pro' | 'premium';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface UsePatientReturn {
  // Dados
  patients: Patient[];
  loading: boolean;
  error: Error | null;

  // Mutações
  createPatient: (data: CreatePatientData, user: any) => Promise<Patient>;
  updatePatient: (data: UpdatePatientData, user: any) => Promise<Patient>;
  deletePatient: (id: string, user: any) => Promise<void>;

  // Utilitários
  getPatientById: (id: string) => Patient | undefined;
  searchPatients: (query: string) => Patient[];
  getPatientsByStatus: (
    status: 'active' | 'inactive' | 'suspended'
  ) => Patient[];
  getPatientsByPlan: (plan: 'free' | 'pro' | 'premium') => Patient[];
  getRecentPatients: (limit?: number) => Patient[];

  // Validações
  canCreatePatient: (userPlan: string) => boolean;
  getRemainingPatientSlots: (userPlan: string) => number;

  // Formatação
  formatPatientAge: (dateOfBirth: string) => number;
  formatPatientStatus: (status: string) => string;
  formatPatientPlan: (plan: string) => string;

  // Estatísticas
  getTotalPatients: () => number;
  getActivePatients: () => number;
  getPatientsByGender: () => { male: number; female: number; other: number };
}

// Configurações do plano freemium
const PLAN_LIMITS = {
  free: {
    patients: parseInt(import.meta.env.VITE_FREE_PLAN_PATIENTS || '5'),
  },
  pro: {
    patients: parseInt(import.meta.env.VITE_PRO_PLAN_PATIENTS || '50'),
  },
  premium: {
    patients: parseInt(import.meta.env.VITE_PREMIUM_PLAN_PATIENTS || '500'),
  },
};

// Simulação de API
const simulateApiDelay = () =>
  new Promise((resolve) => setTimeout(resolve, 500));

const mockPatients: Patient[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '(11) 99999-9999',
    dateOfBirth: '1985-03-15',
    gender: 'male',
    address: {
      street: 'Rua das Flores, 123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    },
    medicalHistory: {
      conditions: ['Lombalgia crônica'],
      medications: ['Ibuprofeno 600mg'],
      allergies: [],
      surgeries: [],
    },
    emergencyContact: {
      name: 'Maria Silva',
      phone: '(11) 88888-8888',
      relationship: 'Esposa',
    },
    status: 'active',
    plan: 'free',
    consentGiven: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-12-01T15:30:00Z',
    lastVisit: '2024-11-28T14:00:00Z',
    totalSessions: 12,
    totalAssessments: 3,
    totalDocuments: 5,
  },
  {
    id: '2',
    name: 'Ana Costa',
    email: 'ana.costa@email.com',
    phone: '(11) 77777-7777',
    dateOfBirth: '1990-07-22',
    gender: 'female',
    address: {
      street: 'Av. Paulista, 456',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    },
    medicalHistory: {
      conditions: ['Tendinite no ombro'],
      medications: [],
      allergies: ['Dipirona'],
      surgeries: [],
    },
    emergencyContact: {
      name: 'Carlos Costa',
      phone: '(11) 66666-6666',
      relationship: 'Pai',
    },
    status: 'active',
    plan: 'pro',
    consentGiven: true,
    createdAt: '2024-02-10T09:00:00Z',
    updatedAt: '2024-11-30T16:45:00Z',
    lastVisit: '2024-11-30T10:30:00Z',
    totalSessions: 8,
    totalAssessments: 2,
    totalDocuments: 3,
  },
];

// API simulada
const patientsApi = {
  getAll: async (): Promise<Patient[]> => {
    await simulateApiDelay();
    return [...mockPatients];
  },

  create: async (data: CreatePatientData): Promise<Patient> => {
    await simulateApiDelay();
    const newPatient: Patient = {
      ...data,
      id: Date.now().toString(),
      medicalHistory: {
        conditions: data.medicalHistory?.conditions || [],
        medications: data.medicalHistory?.medications || [],
        allergies: data.medicalHistory?.allergies || [],
        surgeries: data.medicalHistory?.surgeries || [],
      },
      status: 'active',
      plan: 'free',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSessions: 0,
      totalAssessments: 0,
      totalDocuments: 0,
    };
    mockPatients.push(newPatient);
    return newPatient;
  },

  update: async (data: UpdatePatientData): Promise<Patient> => {
    await simulateApiDelay();
    const index = mockPatients.findIndex((p) => p.id === data.id);
    if (index === -1) {
      throw new Error('Paciente não encontrado');
    }

    const updatedPatient = {
      ...mockPatients[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    mockPatients[index] = updatedPatient;
    return updatedPatient;
  },

  delete: async (id: string): Promise<void> => {
    await simulateApiDelay();
    const index = mockPatients.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('Paciente não encontrado');
    }
    mockPatients.splice(index, 1);
  },
};

export const usePatients = (): UsePatientReturn => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<PatientFilters>({});

  // Query para buscar pacientes
  const {
    data: patients = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['patients'],
    queryFn: patientsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutação para criar paciente
  const createMutation = useMutation({
    mutationFn: patientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      console.error('Erro ao criar paciente:', error);
    },
  });

  // Mutação para atualizar paciente
  const updateMutation = useMutation({
    mutationFn: patientsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar paciente:', error);
    },
  });

  // Mutação para deletar paciente
  const deleteMutation = useMutation({
    mutationFn: patientsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (error) => {
      console.error('Erro ao deletar paciente:', error);
    },
  });

  // Funções de criação, atualização e exclusão
  const createPatient = useCallback(
    async (data: CreatePatientData, user: any): Promise<Patient> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      return createMutation.mutateAsync(data);
    },
    [createMutation]
  );

  const updatePatient = useCallback(
    async (data: UpdatePatientData, user: any): Promise<Patient> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      return updateMutation.mutateAsync(data);
    },
    [updateMutation]
  );

  const deletePatient = useCallback(
    async (id: string, user: any): Promise<void> => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      return deleteMutation.mutateAsync(id);
    },
    [deleteMutation]
  );

  // Utilitários
  const getPatientById = useCallback(
    (id: string): Patient | undefined => {
      return patients.find((patient) => patient.id === id);
    },
    [patients]
  );

  const searchPatients = useCallback(
    (query: string): Patient[] => {
      if (!query.trim()) return patients;

      const searchTerm = query.toLowerCase();
      return patients.filter(
        (patient) =>
          patient.name.toLowerCase().includes(searchTerm) ||
          patient.email.toLowerCase().includes(searchTerm) ||
          patient.phone.includes(searchTerm)
      );
    },
    [patients]
  );

  const getPatientsByStatus = useCallback(
    (status: 'active' | 'inactive' | 'suspended'): Patient[] => {
      return patients.filter((patient) => patient.status === status);
    },
    [patients]
  );

  const getPatientsByPlan = useCallback(
    (plan: 'free' | 'pro' | 'premium'): Patient[] => {
      return patients.filter((patient) => patient.plan === plan);
    },
    [patients]
  );

  const getRecentPatients = useCallback(
    (limit: number = 10): Patient[] => {
      return [...patients]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit);
    },
    [patients]
  );

  // Validações para sistema freemium
  const canCreatePatient = useCallback(
    (userPlan: string): boolean => {
      const currentCount = patients.length;
      const limit =
        PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS]?.patients || 0;
      return currentCount < limit;
    },
    [patients]
  );

  const getRemainingPatientSlots = useCallback(
    (userPlan: string): number => {
      const currentCount = patients.length;
      const limit =
        PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS]?.patients || 0;
      return Math.max(0, limit - currentCount);
    },
    [patients]
  );

  // Formatação
  const formatPatientAge = useCallback((dateOfBirth: string): number => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }, []);

  const formatPatientStatus = useCallback((status: string): string => {
    const statusMap = {
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso',
    };
    return statusMap[status as keyof typeof statusMap] || status;
  }, []);

  const formatPatientPlan = useCallback((plan: string): string => {
    const planMap = {
      free: 'Gratuito',
      pro: 'Profissional',
      premium: 'Premium',
    };
    return planMap[plan as keyof typeof planMap] || plan;
  }, []);

  // Estatísticas
  const getTotalPatients = useCallback((): number => {
    return patients.length;
  }, [patients]);

  const getActivePatients = useCallback((): number => {
    return patients.filter((patient) => patient.status === 'active').length;
  }, [patients]);

  const getPatientsByGender = useCallback(() => {
    return patients.reduce(
      (acc, patient) => {
        acc[patient.gender]++;
        return acc;
      },
      { male: 0, female: 0, other: 0 }
    );
  }, [patients]);

  return {
    // Dados
    patients,
    loading,
    error: error as Error | null,

    // Mutações
    createPatient,
    updatePatient,
    deletePatient,

    // Utilitários
    getPatientById,
    searchPatients,
    getPatientsByStatus,
    getPatientsByPlan,
    getRecentPatients,

    // Validações
    canCreatePatient,
    getRemainingPatientSlots,

    // Formatação
    formatPatientAge,
    formatPatientStatus,
    formatPatientPlan,

    // Estatísticas
    getTotalPatients,
    getActivePatients,
    getPatientsByGender,
  };
};

export default usePatients;
