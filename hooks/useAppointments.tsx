/**
 * Hook especializado para gerenciamento de agendamentos com React Query
 * Extraído do useData massivo para melhor performance e manutenibilidade
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { Appointment } from '../types';

import { useAuth } from './useAuth';

// Chaves de cache organizadas para agendamentos
export const appointmentKeys = {
  all: ['appointments'] as const,
  lists: () => [...appointmentKeys.all, 'list'] as const,
  list: (tenantId: string) => [...appointmentKeys.lists(), tenantId] as const,
  details: () => [...appointmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...appointmentKeys.details(), id] as const,
  byPatient: (patientId: string) => [...appointmentKeys.all, 'patient', patientId] as const,
  byTherapist: (therapistId: string) => [...appointmentKeys.all, 'therapist', therapistId] as const,
  byDate: (date: string) => [...appointmentKeys.all, 'date', date] as const,
  byDateRange: (start: string, end: string) => [...appointmentKeys.all, 'dateRange', start, end] as const,
  byStatus: (status: string) => [...appointmentKeys.all, 'status', status] as const,
};

// Hook principal para listar agendamentos
export const useAppointments = () => {
  const { currentTenant } = useAuth();

  return useQuery({
    queryKey: appointmentKeys.list(currentTenant?.id || ''),
    queryFn: async () => {
      if (!currentTenant) return [];
      
      const storageKey = `fisioflow_appointments_${currentTenant.id}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    },
    enabled: !!currentTenant,
    staleTime: 2 * 60 * 1000, // 2 minutos - agendamentos são dinâmicos
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
};

// Hook para agendamento específico
export const useAppointment = (appointmentId: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    return allAppointments.find((appointment: Appointment) => 
      appointment.id === appointmentId
    ) || null;
  }, [allAppointments, appointmentId]);
};

// Hook para agendamentos de um paciente
export const usePatientAppointments = (patientId: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    return allAppointments
      .filter((appointment: Appointment) => appointment.patientId === patientId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [allAppointments, patientId]);
};

// Hook para agendamentos de um terapeuta
export const useTherapistAppointments = (therapistId: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    return allAppointments
      .filter((appointment: Appointment) => appointment.therapistId === therapistId)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allAppointments, therapistId]);
};

// Hook para agendamentos por data
export const useAppointmentsByDate = (date: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    if (!date) return [];
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
    
    return allAppointments
      .filter((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.startTime);
        return appointmentDate >= startOfDay && appointmentDate <= endOfDay;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allAppointments, date]);
};

// Hook para agendamentos por período
export const useAppointmentsByDateRange = (startDate: string, endDate: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    if (!startDate || !endDate) return [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return allAppointments
      .filter((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.startTime);
        return appointmentDate >= start && appointmentDate <= end;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allAppointments, startDate, endDate]);
};

// Hook para agendamentos por status
export const useAppointmentsByStatus = (status: string) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    if (!status) return allAppointments;
    
    return allAppointments
      .filter((appointment: Appointment) => appointment.status === status)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [allAppointments, status]);
};

// Hook para próximos agendamentos (hoje e futuros)
export const useUpcomingAppointments = (limit?: number) => {
  const { data: allAppointments = [] } = useAppointments();
  
  return useMemo(() => {
    const now = new Date();
    
    const upcoming = allAppointments
      .filter((appointment: Appointment) => {
        const appointmentDate = new Date(appointment.startTime);
        return appointmentDate >= now && appointment.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return limit ? upcoming.slice(0, limit) : upcoming;
  }, [allAppointments, limit]);
};

// Hook para agendamentos de hoje
export const useTodayAppointments = () => {
  const today = new Date().toISOString().split('T')[0];
  return useAppointmentsByDate(today);
};

// Mutation para salvar agendamento
export const useSaveAppointment = () => {
  const queryClient = useQueryClient();
  const { user, currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (appointment: Appointment) => {
      if (!user || !currentTenant) {
        throw new Error('Usuário ou tenant não autenticado');
      }

      // Salvar no localStorage
      const storageKey = `fisioflow_appointments_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const updated = appointment.id 
        ? existing.map((app: Appointment) => app.id === appointment.id ? appointment : app)
        : [...existing, { 
            ...appointment, 
            id: `appointment_${Date.now()}`,
            tenantId: currentTenant.id 
          }];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return appointment;
    },
    onSuccess: (appointment) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byPatient(appointment.patientId) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byTherapist(appointment.therapistId) });
      
      const appointmentDate = new Date(appointment.startTime).toISOString().split('T')[0];
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byDate(appointmentDate) });
      
      console.log('✅ Agendamento salvo e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao salvar agendamento:', error);
    },
  });
};

// Mutation para deletar agendamento
export const useDeleteAppointment = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!currentTenant) {
        throw new Error('Tenant não definido');
      }

      const storageKey = `fisioflow_appointments_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = existing.filter((app: Appointment) => app.id !== appointmentId);
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return appointmentId;
    },
    onSuccess: (appointmentId) => {
      // Remover do cache específico
      queryClient.removeQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      
      // Invalidar listas
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      
      console.log('✅ Agendamento removido e cache atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao deletar agendamento:', error);
    },
  });
};

// Mutation para atualizar status do agendamento
export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useAuth();

  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      if (!currentTenant) {
        throw new Error('Tenant não definido');
      }

      const storageKey = `fisioflow_appointments_${currentTenant.id}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      const updated = existing.map((app: Appointment) => 
        app.id === appointmentId 
          ? { ...app, status, updatedAt: new Date().toISOString() }
          : app
      );
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return { appointmentId, status };
    },
    onSuccess: ({ appointmentId, status }) => {
      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.detail(appointmentId) });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.byStatus(status) });
      
      console.log('✅ Status do agendamento atualizado');
    },
    onError: (error) => {
      console.error('❌ Erro ao atualizar status:', error);
    },
  });
};

// Hook para estatísticas de agendamentos
export const useAppointmentsStats = () => {
  const { data: appointments = [] } = useAppointments();

  return useMemo(() => {
    const total = appointments.length;
    const now = new Date();
    
    // Agendamentos de hoje
    const today = appointments.filter((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate.toDateString() === now.toDateString();
    }).length;

    // Agendamentos desta semana
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const thisWeek = appointments.filter((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.startTime);
      return appointmentDate >= weekStart;
    }).length;

    // Por status
    const byStatus = appointments.reduce((acc: Record<string, number>, appointment: Appointment) => {
      acc[appointment.status] = (acc[appointment.status] || 0) + 1;
      return acc;
    }, {});

    // Taxa de comparecimento (últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAppointments = appointments.filter((appointment: Appointment) => 
      new Date(appointment.startTime) >= thirtyDaysAgo
    );
    
    const completed = recentAppointments.filter(app => app.status === 'completed').length;
    const cancelled = recentAppointments.filter(app => app.status === 'cancelled').length;
    const noShow = recentAppointments.filter(app => app.status === 'no-show').length;
    
    const attendanceRate = recentAppointments.length > 0 
      ? ((completed / recentAppointments.length) * 100)
      : 0;
    
    const cancellationRate = recentAppointments.length > 0
      ? (((cancelled + noShow) / recentAppointments.length) * 100)
      : 0;

    return {
      total,
      today,
      thisWeek,
      byStatus,
      attendanceRate: Math.round(attendanceRate),
      cancellationRate: Math.round(cancellationRate),
      recentAppointments: recentAppointments.length,
    };
  }, [appointments]);
};

// Hook para conflitos de horário
export const useScheduleConflicts = (
  therapistId: string, 
  startTime: string, 
  endTime: string, 
  excludeAppointmentId?: string
) => {
  const { data: appointments = [] } = useAppointments();
  
  return useMemo(() => {
    const newStart = new Date(startTime);
    const newEnd = new Date(endTime);
    
    return appointments.filter((appointment: Appointment) => {
      if (appointment.id === excludeAppointmentId) return false;
      if (appointment.therapistId !== therapistId) return false;
      if (appointment.status === 'cancelled') return false;
      
      const existingStart = new Date(appointment.startTime);
      const existingEnd = new Date(appointment.endTime);
      
      // Verificar sobreposição
      return (newStart < existingEnd && newEnd > existingStart);
    });
  }, [appointments, therapistId, startTime, endTime, excludeAppointmentId]);
};

// Hook para busca de agendamentos
export const useAppointmentsSearch = (query: string) => {
  const { data: appointments = [] } = useAppointments();

  return useMemo(() => {
    if (!query.trim()) return appointments;
    
    const searchTerm = query.toLowerCase();
    return appointments.filter((appointment: Appointment) => 
      appointment.patientName?.toLowerCase().includes(searchTerm) ||
      appointment.therapistName?.toLowerCase().includes(searchTerm) ||
      appointment.notes?.toLowerCase().includes(searchTerm) ||
      appointment.type?.toLowerCase().includes(searchTerm)
    );
  }, [appointments, query]);
};

// Hook para invalidar cache de agendamentos
export const useInvalidateAppointments = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
  }, [queryClient]);
};

export default {
  useAppointments,
  useAppointment,
  usePatientAppointments,
  useTherapistAppointments,
  useAppointmentsByDate,
  useAppointmentsByDateRange,
  useAppointmentsByStatus,
  useUpcomingAppointments,
  useTodayAppointments,
  useSaveAppointment,
  useDeleteAppointment,
  useUpdateAppointmentStatus,
  useAppointmentsStats,
  useScheduleConflicts,
  useAppointmentsSearch,
  useInvalidateAppointments,
};