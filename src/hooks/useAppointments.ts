import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuth } from './useAuth';
import { useNotification } from '../components/Notification';

// Schema para Appointment
const AppointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  professionalId: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  type: z.enum([
    'consultation',
    'therapy',
    'evaluation',
    'follow_up',
    'group_session',
  ]),
  status: z.enum([
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().min(15).max(480), // 15 min a 8 horas
  location: z.string().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
  reminderSent: z.boolean().default(false),
  paymentStatus: z.enum(['pending', 'paid', 'cancelled']).default('pending'),
  price: z.number().min(0).optional(),
  recurringPattern: z
    .object({
      type: z.enum(['none', 'daily', 'weekly', 'monthly']),
      interval: z.number().min(1).default(1),
      endDate: z.string().datetime().optional(),
      occurrences: z.number().min(1).optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

const STORAGE_KEY = 'fisioflow_appointments';
const QUERY_KEY = 'appointments';

// Simulação de API
const appointmentAPI = {
  getAll: async (tenantId: string): Promise<Appointment[]> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const appointments = JSON.parse(data) as Appointment[];
    return appointments.filter((a) => a.tenantId === tenantId);
  },

  create: async (
    appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> => {
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = localStorage.getItem(STORAGE_KEY);
    const appointments = data ? (JSON.parse(data) as Appointment[]) : [];
    appointments.push(newAppointment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));

    return newAppointment;
  },

  update: async (
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) throw new Error('Agendamento não encontrado');

    const appointments = JSON.parse(data) as Appointment[];
    const index = appointments.findIndex((a) => a.id === id);

    if (index === -1) throw new Error('Agendamento não encontrado');

    const updatedAppointment = {
      ...appointments[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    appointments[index] = updatedAppointment;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));

    return updatedAppointment;
  },

  delete: async (id: string): Promise<void> => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return;

    const appointments = JSON.parse(data) as Appointment[];
    const filtered = appointments.filter((a) => a.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },
};

export const useAppointments = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  const tenantId = user?.tenantId || 'default';

  // Query para listar agendamentos
  const {
    data: appointments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEY, tenantId],
    queryFn: () => appointmentAPI.getAll(tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Mutation para criar agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: appointmentAPI.create,
    onSuccess: (newAppointment) => {
      queryClient.setQueryData(
        [QUERY_KEY, tenantId],
        (old: Appointment[] = []) => [...old, newAppointment]
      );
      showNotification('Agendamento criado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(`Erro ao criar agendamento: ${error.message}`, 'error');
    },
  });

  // Mutation para atualizar agendamento
  const updateAppointmentMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Appointment>;
    }) => appointmentAPI.update(id, updates),
    onSuccess: (updatedAppointment) => {
      queryClient.setQueryData(
        [QUERY_KEY, tenantId],
        (old: Appointment[] = []) =>
          old.map((a) =>
            a.id === updatedAppointment.id ? updatedAppointment : a
          )
      );
      showNotification('Agendamento atualizado com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(
        `Erro ao atualizar agendamento: ${error.message}`,
        'error'
      );
    },
  });

  // Mutation para excluir agendamento
  const deleteAppointmentMutation = useMutation({
    mutationFn: appointmentAPI.delete,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(
        [QUERY_KEY, tenantId],
        (old: Appointment[] = []) => old.filter((a) => a.id !== deletedId)
      );
      showNotification('Agendamento excluído com sucesso!', 'success');
    },
    onError: (error) => {
      showNotification(
        `Erro ao excluir agendamento: ${error.message}`,
        'error'
      );
    },
  });

  // Funções de conveniência
  const createAppointment = async (
    appointmentData: Omit<
      Appointment,
      'id' | 'createdAt' | 'updatedAt' | 'tenantId'
    >
  ) => {
    // Validação de conflitos de horário
    const conflictingAppointment = appointments.find((a) => {
      const newStart = new Date(appointmentData.startTime);
      const newEnd = new Date(appointmentData.endTime);
      const existingStart = new Date(a.startTime);
      const existingEnd = new Date(a.endTime);

      return (
        a.professionalId === appointmentData.professionalId &&
        a.status !== 'cancelled' &&
        ((newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd))
      );
    });

    if (conflictingAppointment) {
      throw new Error(
        'Já existe um agendamento neste horário para este profissional'
      );
    }

    // Validação de horário
    const startTime = new Date(appointmentData.startTime);
    const endTime = new Date(appointmentData.endTime);

    if (endTime <= startTime) {
      throw new Error(
        'Horário de término deve ser posterior ao horário de início'
      );
    }

    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // em minutos
    if (duration < 15 || duration > 480) {
      throw new Error('Duração deve ser entre 15 minutos e 8 horas');
    }

    return createAppointmentMutation.mutateAsync({
      ...appointmentData,
      duration,
      tenantId,
    });
  };

  const updateAppointment = async (
    id: string,
    updates: Partial<Appointment>
  ) => {
    return updateAppointmentMutation.mutateAsync({ id, updates });
  };

  const removeAppointment = async (id: string) => {
    return deleteAppointmentMutation.mutateAsync(id);
  };

  // Funções de busca e filtro
  const searchAppointments = (query: string) => {
    if (!query.trim()) return appointments;

    const lowercaseQuery = query.toLowerCase();
    return appointments.filter(
      (a) =>
        a.title.toLowerCase().includes(lowercaseQuery) ||
        a.description?.toLowerCase().includes(lowercaseQuery) ||
        a.notes?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const getAppointmentsByStatus = (status: Appointment['status']) => {
    return appointments.filter((a) => a.status === status);
  };

  const getAppointmentsByPatient = (patientId: string) => {
    return appointments.filter((a) => a.patientId === patientId);
  };

  const getAppointmentsByProfessional = (professionalId: string) => {
    return appointments.filter((a) => a.professionalId === professionalId);
  };

  const getAppointmentsByDate = (date: string) => {
    const targetDate = date.split('T')[0]; // YYYY-MM-DD
    return appointments.filter((a) => a.startTime.startsWith(targetDate));
  };

  const getTodayAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return getAppointmentsByDate(today);
  };

  const getUpcomingAppointments = (days: number = 7) => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return appointments.filter((a) => {
      const appointmentDate = new Date(a.startTime);
      return (
        appointmentDate >= now &&
        appointmentDate <= futureDate &&
        a.status !== 'cancelled'
      );
    });
  };

  const getAppointmentStats = () => {
    const total = appointments.length;
    const today = getTodayAppointments().length;
    const upcoming = getUpcomingAppointments().length;
    const completed = appointments.filter(
      (a) => a.status === 'completed'
    ).length;
    const cancelled = appointments.filter(
      (a) => a.status === 'cancelled'
    ).length;

    return {
      total,
      today,
      upcoming,
      completed,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  };

  return {
    // Dados
    appointments,
    isLoading,
    error,

    // Ações
    createAppointment,
    updateAppointment,
    removeAppointment,
    refetch,

    // Busca e filtros
    searchAppointments,
    getAppointmentsByStatus,
    getAppointmentsByPatient,
    getAppointmentsByProfessional,
    getAppointmentsByDate,
    getTodayAppointments,
    getUpcomingAppointments,
    getAppointmentStats,

    // Estados de loading
    isCreating: createAppointmentMutation.isPending,
    isUpdating: updateAppointmentMutation.isPending,
    isDeleting: deleteAppointmentMutation.isPending,
  };
};

export default useAppointments;
