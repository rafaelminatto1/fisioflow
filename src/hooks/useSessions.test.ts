import { renderHook, act } from '@testing-library/react';
import { useSessions } from './useSessions';
import { useAuth } from './useAuth';
import { useErrorHandler } from '../components/ErrorBoundary';

// Mock das dependências
jest.mock('./useAuth');
jest.mock('../components/ErrorBoundary');
jest.mock('../utils/dataValidator');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseErrorHandler = useErrorHandler as jest.MockedFunction<
  typeof useErrorHandler
>;

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock do crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-session-uuid-123'),
  },
});

describe('useSessions', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockErrorHandler = jest.fn();

  const mockSession = {
    id: 'session-1',
    patientId: 'patient-1',
    therapistId: 'user-123',
    date: '2024-01-15T10:00:00.000Z',
    duration: 60,
    type: 'individual',
    status: 'scheduled',
    notes: 'Sessão de fisioterapia',
    objectives: ['Melhorar mobilidade'],
    exercises: [
      {
        name: 'Alongamento',
        sets: 3,
        reps: 10,
        duration: 30,
        notes: 'Alongamento suave',
      },
    ],
    vitals: {
      bloodPressure: '120/80',
      heartRate: 72,
      temperature: 36.5,
      weight: 70,
      height: 175,
    },
    assessment: {
      pain: 3,
      mobility: 7,
      strength: 6,
      balance: 8,
      notes: 'Paciente apresentou melhora',
    },
    attachments: [],
    billing: {
      amount: 100,
      paid: false,
      method: 'cash',
    },
    tenantId: 'tenant-123',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUseErrorHandler.mockReturnValue(mockErrorHandler);
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve inicializar com estado vazio quando não há dados no localStorage', async () => {
    const { result } = renderHook(() => useSessions());

    expect(result.current.loading).toBe(true);
    expect(result.current.sessions).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('deve carregar sessões do localStorage', async () => {
    const mockSessions = [mockSession];

    // Mock do validateAndMigrateLocalStorageData
    const mockValidateData =
      require('../utils/dataValidator').validateAndMigrateLocalStorageData;
    mockValidateData.mockReturnValue(mockSessions);

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: '2.0',
        timestamp: Date.now(),
        data: mockSessions,
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => useSessions());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.error).toBe(null);
  });

  it('deve adicionar uma nova sessão', async () => {
    const { result } = renderHook(() => useSessions());

    const newSessionData = {
      patientId: 'patient-2',
      therapistId: 'user-123',
      date: '2024-01-16T14:00:00.000Z',
      duration: 45,
      type: 'group' as const,
      notes: 'Sessão em grupo',
      objectives: ['Fortalecimento muscular'],
    };

    await act(async () => {
      const session = await result.current.addSession(newSessionData);
      expect(session.id).toBe('test-session-uuid-123');
      expect(session.patientId).toBe('patient-2');
      expect(session.tenantId).toBe('tenant-123');
      expect(session.status).toBe('scheduled');
    });
  });

  it('deve atualizar uma sessão existente', async () => {
    const mockSessions = [mockSession];
    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    await act(async () => {
      await result.current.updateSession('session-1', {
        notes: 'Sessão atualizada',
        duration: 90,
      });
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve remover uma sessão', async () => {
    const mockSessions = [mockSession];
    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    await act(async () => {
      await result.current.removeSession('session-1');
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve iniciar uma sessão', async () => {
    const mockSessions = [mockSession];
    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    await act(async () => {
      await result.current.startSession('session-1');
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve completar uma sessão', async () => {
    const inProgressSession = {
      ...mockSession,
      status: 'in_progress' as const,
    };
    const mockSessions = [inProgressSession];
    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    await act(async () => {
      await result.current.completeSession('session-1', {
        notes: 'Sessão concluída com sucesso',
        assessment: {
          pain: 2,
          mobility: 8,
          strength: 7,
          balance: 9,
          notes: 'Excelente progresso',
        },
      });
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve cancelar uma sessão', async () => {
    const mockSessions = [mockSession];
    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    await act(async () => {
      await result.current.cancelSession(
        'session-1',
        'Paciente não compareceu'
      );
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve buscar sessões por paciente', () => {
    const mockSessions = [
      mockSession,
      {
        ...mockSession,
        id: 'session-2',
        patientId: 'patient-2',
      },
    ];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const patientSessions = result.current.getSessionsByPatient('patient-1');
    expect(patientSessions).toHaveLength(1);
    expect(patientSessions[0].patientId).toBe('patient-1');
  });

  it('deve buscar sessões por terapeuta', () => {
    const mockSessions = [
      mockSession,
      {
        ...mockSession,
        id: 'session-2',
        therapistId: 'user-456',
      },
    ];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const therapistSessions = result.current.getSessionsByTherapist('user-123');
    expect(therapistSessions).toHaveLength(1);
    expect(therapistSessions[0].therapistId).toBe('user-123');
  });

  it('deve buscar sessões por status', () => {
    const mockSessions = [
      mockSession,
      {
        ...mockSession,
        id: 'session-2',
        status: 'completed' as const,
      },
    ];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const scheduledSessions = result.current.getSessionsByStatus('scheduled');
    expect(scheduledSessions).toHaveLength(1);
    expect(scheduledSessions[0].status).toBe('scheduled');
  });

  it('deve buscar sessões do dia', () => {
    const today = new Date();
    const todaySession = {
      ...mockSession,
      date: today.toISOString(),
    };
    const mockSessions = [todaySession];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const todaySessions = result.current.getTodaySessions();
    expect(todaySessions).toHaveLength(1);
  });

  it('deve buscar sessões da semana', () => {
    const today = new Date();
    const thisWeekSession = {
      ...mockSession,
      date: today.toISOString(),
    };
    const mockSessions = [thisWeekSession];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const weekSessions = result.current.getWeekSessions();
    expect(weekSessions).toHaveLength(1);
  });

  it('deve buscar próximas sessões', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingSession = {
      ...mockSession,
      date: tomorrow.toISOString(),
    };
    const mockSessions = [upcomingSession];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const upcomingSessions = result.current.getUpcomingSessions();
    expect(upcomingSessions).toHaveLength(1);
  });

  it('deve calcular estatísticas das sessões', () => {
    const mockSessions = [
      { ...mockSession, status: 'completed' as const },
      { ...mockSession, id: 'session-2', status: 'scheduled' as const },
      { ...mockSession, id: 'session-3', status: 'cancelled' as const },
    ];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const stats = result.current.getSessionsStats();
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.scheduled).toBe(1);
    expect(stats.cancelled).toBe(1);
    expect(stats.inProgress).toBe(0);
  });

  it('deve tratar erros ao carregar dados', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Erro no localStorage');
    });

    const { result, waitForNextUpdate } = renderHook(() => useSessions());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Erro ao carregar sessões');
    expect(mockErrorHandler).toHaveBeenCalled();
  });

  it('deve filtrar sessões por tenant', async () => {
    const mockSessions = [
      mockSession,
      {
        ...mockSession,
        id: 'session-2',
        tenantId: 'tenant-456', // Tenant diferente
      },
    ];

    // Mock do validateAndMigrateLocalStorageData
    const mockValidateData =
      require('../utils/dataValidator').validateAndMigrateLocalStorageData;
    mockValidateData.mockReturnValue(mockSessions);

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: '2.0',
        timestamp: Date.now(),
        data: mockSessions,
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => useSessions());

    await waitForNextUpdate();

    // Deve retornar apenas a sessão do tenant correto
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].tenantId).toBe('tenant-123');
  });

  it('deve buscar sessões por data específica', () => {
    const specificDate = '2024-01-15';
    const mockSessions = [
      mockSession, // Data: 2024-01-15T10:00:00.000Z
      {
        ...mockSession,
        id: 'session-2',
        date: '2024-01-16T10:00:00.000Z',
      },
    ];

    const { result } = renderHook(() => useSessions());

    // Simular sessões carregadas
    act(() => {
      result.current.sessions = mockSessions;
    });

    const dateSessions = result.current.getSessionsByDate(specificDate);
    expect(dateSessions).toHaveLength(1);
    expect(dateSessions[0].date).toContain('2024-01-15');
  });
});
