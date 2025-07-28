import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

import { useErrorHandler } from '../components/ErrorBoundary';
import {
  validateAndMigrateLocalStorageData,
  saveValidatedData,
} from '../utils/dataValidator';

import { useAuth } from './useAuth';

// Schema para Session
const SessionSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  therapistId: z.string().uuid(),
  date: z.string().datetime(),
  duration: z.number().min(15).max(180), // 15 min a 3 horas
  type: z.enum([
    'consultation',
    'therapy',
    'evaluation',
    'follow_up',
    'group_therapy',
  ]),
  status: z.enum([
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
  ]),
  location: z.string().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().uuid(),
        sets: z.number().min(1),
        reps: z.number().min(1),
        weight: z.number().optional(),
        duration: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .default([]),
  vitals: z
    .object({
      bloodPressure: z.string().optional(),
      heartRate: z.number().optional(),
      temperature: z.number().optional(),
      oxygenSaturation: z.number().optional(),
      painLevel: z.number().min(0).max(10).optional(),
    })
    .optional(),
  assessment: z
    .object({
      subjective: z.string().optional(),
      objective: z.string().optional(),
      assessment: z.string().optional(),
      plan: z.string().optional(),
    })
    .optional(),
  attachments: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        type: z.string(),
        url: z.string(),
        size: z.number(),
      })
    )
    .default([]),
  billing: z
    .object({
      amount: z.number().min(0),
      currency: z.string().default('BRL'),
      paymentStatus: z.enum(['pending', 'paid', 'cancelled']),
      insuranceCovered: z.boolean().default(false),
    })
    .optional(),
  tenantId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Session = z.infer<typeof SessionSchema>;

const STORAGE_KEY = 'fisioflow_sessions';

export const useSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const handleError = useErrorHandler();

  // Carregar sessions do localStorage
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawData = localStorage.getItem(STORAGE_KEY);
      if (!rawData) {
        setSessions([]);
        return;
      }

      const data = validateAndMigrateLocalStorageData(rawData);

      // Filtrar por tenant se usuário logado
      const filteredSessions = user?.tenantId
        ? data.filter((s: any) => s.tenantId === user.tenantId)
        : data;

      // Validar cada session
      const validatedSessions = filteredSessions
        .map((s: any) => {
          try {
            return SessionSchema.parse(s);
          } catch (validationError) {
            console.warn('Sessão inválida ignorada:', s, validationError);
            return null;
          }
        })
        .filter(Boolean) as Session[];

      setSessions(validatedSessions);
    } catch (err) {
      const errorMessage = 'Erro ao carregar sessões';
      setError(errorMessage);
      handleError(err as Error, { context: 'loadSessions' });
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, handleError]);

  // Salvar sessions
  const saveSessions = useCallback(
    async (newSessions: Session[]) => {
      try {
        // Validar todas as sessions antes de salvar
        const validatedSessions = newSessions.map((s) =>
          SessionSchema.parse(s)
        );

        saveValidatedData(STORAGE_KEY, validatedSessions);
        setSessions(validatedSessions);
      } catch (err) {
        const errorMessage = 'Erro ao salvar sessões';
        setError(errorMessage);
        handleError(err as Error, { context: 'saveSessions' });
        throw err;
      }
    },
    [handleError]
  );

  // Adicionar session
  const addSession = useCallback(
    async (sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newSession: Session = {
          ...sessionData,
          id: crypto.randomUUID(),
          tenantId: user?.tenantId || 'default',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedSessions = [...sessions, newSession];
        await saveSessions(updatedSessions);

        return newSession;
      } catch (err) {
        handleError(err as Error, { context: 'addSession', sessionData });
        throw err;
      }
    },
    [sessions, user?.tenantId, saveSessions, handleError]
  );

  // Atualizar session
  const updateSession = useCallback(
    async (id: string, updates: Partial<Session>) => {
      try {
        const updatedSessions = sessions.map((s) =>
          s.id === id
            ? { ...s, ...updates, updatedAt: new Date().toISOString() }
            : s
        );

        await saveSessions(updatedSessions);
      } catch (err) {
        handleError(err as Error, { context: 'updateSession', id, updates });
        throw err;
      }
    },
    [sessions, saveSessions, handleError]
  );

  // Remover session
  const removeSession = useCallback(
    async (id: string) => {
      try {
        const updatedSessions = sessions.filter((s) => s.id !== id);
        await saveSessions(updatedSessions);
      } catch (err) {
        handleError(err as Error, { context: 'removeSession', id });
        throw err;
      }
    },
    [sessions, saveSessions, handleError]
  );

  // Iniciar sessão
  const startSession = useCallback(
    async (id: string) => {
      try {
        await updateSession(id, {
          status: 'in_progress',
        });
      } catch (err) {
        handleError(err as Error, { context: 'startSession', id });
        throw err;
      }
    },
    [updateSession, handleError]
  );

  // Finalizar sessão
  const completeSession = useCallback(
    async (id: string, finalNotes?: string) => {
      try {
        const updates: Partial<Session> = {
          status: 'completed',
        };

        if (finalNotes) {
          updates.notes = finalNotes;
        }

        await updateSession(id, updates);
      } catch (err) {
        handleError(err as Error, { context: 'completeSession', id });
        throw err;
      }
    },
    [updateSession, handleError]
  );

  // Cancelar sessão
  const cancelSession = useCallback(
    async (id: string, reason?: string) => {
      try {
        const updates: Partial<Session> = {
          status: 'cancelled',
        };

        if (reason) {
          updates.notes = `Cancelada: ${reason}`;
        }

        await updateSession(id, updates);
      } catch (err) {
        handleError(err as Error, { context: 'cancelSession', id });
        throw err;
      }
    },
    [updateSession, handleError]
  );

  // Buscar sessions
  const searchSessions = useCallback(
    (query: string) => {
      if (!query.trim()) return sessions;

      const lowercaseQuery = query.toLowerCase();
      return sessions.filter(
        (s) =>
          s.notes?.toLowerCase().includes(lowercaseQuery) ||
          s.type.toLowerCase().includes(lowercaseQuery) ||
          s.location?.toLowerCase().includes(lowercaseQuery)
      );
    },
    [sessions]
  );

  // Filtrar sessions por paciente
  const getSessionsByPatient = useCallback(
    (patientId: string) => {
      return sessions
        .filter((s) => s.patientId === patientId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    },
    [sessions]
  );

  // Filtrar sessions por terapeuta
  const getSessionsByTherapist = useCallback(
    (therapistId: string) => {
      return sessions
        .filter((s) => s.therapistId === therapistId)
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    },
    [sessions]
  );

  // Filtrar sessions por status
  const getSessionsByStatus = useCallback(
    (status: Session['status']) => {
      return sessions.filter((s) => s.status === status);
    },
    [sessions]
  );

  // Obter sessions do dia
  const getTodaySessions = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    return sessions
      .filter((s) => s.date.startsWith(todayStr))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  // Obter sessions da semana
  const getWeekSessions = useCallback(() => {
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(
      today.setDate(today.getDate() - today.getDay() + 6)
    );

    return sessions
      .filter((s) => {
        const sessionDate = new Date(s.date);
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  // Obter próximas sessions
  const getUpcomingSessions = useCallback(
    (limit = 10) => {
      const now = new Date();

      return sessions
        .filter(
          (s) =>
            new Date(s.date) > now &&
            (s.status === 'scheduled' || s.status === 'in_progress')
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, limit);
    },
    [sessions]
  );

  // Estatísticas das sessions
  const getSessionStats = useCallback(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === 'completed').length;
    const scheduled = sessions.filter((s) => s.status === 'scheduled').length;
    const cancelled = sessions.filter((s) => s.status === 'cancelled').length;
    const noShow = sessions.filter((s) => s.status === 'no_show').length;

    // Estatísticas do mês atual
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthSessions = sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      return (
        sessionDate.getMonth() === currentMonth &&
        sessionDate.getFullYear() === currentYear
      );
    });

    return {
      total,
      completed,
      scheduled,
      cancelled,
      noShow,
      thisMonth: thisMonthSessions.length,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      attendanceRate:
        total > 0 ? Math.round((completed / (completed + noShow)) * 100) : 0,
    };
  }, [sessions]);

  // Carregar dados na inicialização
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    loading,
    error,
    addSession,
    updateSession,
    removeSession,
    startSession,
    completeSession,
    cancelSession,
    searchSessions,
    getSessionsByPatient,
    getSessionsByTherapist,
    getSessionsByStatus,
    getTodaySessions,
    getWeekSessions,
    getUpcomingSessions,
    getSessionStats,
    refreshSessions: loadSessions,
  };
};
