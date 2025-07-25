import { renderHook, act } from '@testing-library/react';
import { useSubscription } from './useSubscription';
import { useAuth } from './useAuth';
import { usePatients } from './usePatients';
import { useSessions } from './useSessions';

// Mock das dependências
jest.mock('./useAuth');
jest.mock('./usePatients');
jest.mock('./useSessions');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUsePatients = usePatients as jest.MockedFunction<typeof usePatients>;
const mockUseSessions = useSessions as jest.MockedFunction<typeof useSessions>;

describe('useSubscription', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    name: 'Test User',
    subscription: {
      plan: 'free',
      status: 'active',
      expiresAt: '2024-12-31T23:59:59.000Z',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUsePatients.mockReturnValue({ patients: [] } as any);
    mockUseSessions.mockReturnValue({ sessions: [] } as any);
  });

  describe('Plano Free', () => {
    it('deve retornar limites corretos para plano free', () => {
      const { result } = renderHook(() => useSubscription());

      expect(result.current.plan).toBe('free');
      expect(result.current.limits.patients).toBe(5);
      expect(result.current.limits.sessions).toBe(20);
      expect(result.current.limits.users).toBe(1);
      expect(result.current.limits.aiReports).toBe(3);
    });

    it('deve permitir adicionar pacientes quando dentro do limite', () => {
      mockUsePatients.mockReturnValue({
        patients: [
          { id: '1', name: 'Paciente 1', tenantId: 'tenant-123' },
          { id: '2', name: 'Paciente 2', tenantId: 'tenant-123' },
        ],
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddPatient()).toBe(true);
      expect(result.current.usage.patients).toBe(2);
      expect(result.current.usage.patientsPercentage).toBe(40); // 2/5 * 100
    });

    it('deve bloquear adição de pacientes quando limite atingido', () => {
      mockUsePatients.mockReturnValue({
        patients: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Paciente ${i + 1}`,
          tenantId: 'tenant-123',
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddPatient()).toBe(false);
      expect(result.current.usage.patients).toBe(5);
      expect(result.current.usage.patientsPercentage).toBe(100);
    });

    it('deve permitir adicionar sessões quando dentro do limite', () => {
      mockUseSessions.mockReturnValue({
        sessions: Array.from({ length: 15 }, (_, i) => ({
          id: `${i + 1}`,
          patientId: 'patient-1',
          tenantId: 'tenant-123',
          date: new Date().toISOString(),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddSession()).toBe(true);
      expect(result.current.usage.sessions).toBe(15);
      expect(result.current.usage.sessionsPercentage).toBe(75); // 15/20 * 100
    });

    it('deve bloquear adição de sessões quando limite atingido', () => {
      mockUseSessions.mockReturnValue({
        sessions: Array.from({ length: 20 }, (_, i) => ({
          id: `${i + 1}`,
          patientId: 'patient-1',
          tenantId: 'tenant-123',
          date: new Date().toISOString(),
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddSession()).toBe(false);
      expect(result.current.usage.sessions).toBe(20);
      expect(result.current.usage.sessionsPercentage).toBe(100);
    });

    it('deve bloquear relatórios AI quando limite atingido', () => {
      // Simular que já foram usados 3 relatórios AI este mês
      const mockLocalStorage = {
        getItem: jest.fn().mockReturnValue(
          JSON.stringify({
            month: new Date().getMonth(),
            year: new Date().getFullYear(),
            count: 3,
          })
        ),
      };
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
      });

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canUseAI()).toBe(false);
      expect(result.current.usage.aiReports).toBe(3);
      expect(result.current.usage.aiReportsPercentage).toBe(100);
    });
  });

  describe('Plano Pro', () => {
    beforeEach(() => {
      const proUser = {
        ...mockUser,
        subscription: {
          plan: 'pro',
          status: 'active',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      };
      mockUseAuth.mockReturnValue({ user: proUser } as any);
    });

    it('deve retornar limites corretos para plano pro', () => {
      const { result } = renderHook(() => useSubscription());

      expect(result.current.plan).toBe('pro');
      expect(result.current.limits.patients).toBe(50);
      expect(result.current.limits.sessions).toBe(500);
      expect(result.current.limits.users).toBe(5);
      expect(result.current.limits.aiReports).toBe(50);
    });

    it('deve permitir mais pacientes no plano pro', () => {
      mockUsePatients.mockReturnValue({
        patients: Array.from({ length: 30 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Paciente ${i + 1}`,
          tenantId: 'tenant-123',
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddPatient()).toBe(true);
      expect(result.current.usage.patients).toBe(30);
      expect(result.current.usage.patientsPercentage).toBe(60); // 30/50 * 100
    });
  });

  describe('Plano Enterprise', () => {
    beforeEach(() => {
      const enterpriseUser = {
        ...mockUser,
        subscription: {
          plan: 'enterprise',
          status: 'active',
          expiresAt: '2024-12-31T23:59:59.000Z',
        },
      };
      mockUseAuth.mockReturnValue({ user: enterpriseUser } as any);
    });

    it('deve retornar limites ilimitados para plano enterprise', () => {
      const { result } = renderHook(() => useSubscription());

      expect(result.current.plan).toBe('enterprise');
      expect(result.current.limits.patients).toBe(Infinity);
      expect(result.current.limits.sessions).toBe(Infinity);
      expect(result.current.limits.users).toBe(Infinity);
      expect(result.current.limits.aiReports).toBe(Infinity);
    });

    it('deve sempre permitir adições no plano enterprise', () => {
      mockUsePatients.mockReturnValue({
        patients: Array.from({ length: 1000 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Paciente ${i + 1}`,
          tenantId: 'tenant-123',
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddPatient()).toBe(true);
      expect(result.current.canAddSession()).toBe(true);
      expect(result.current.canUseAI()).toBe(true);
    });
  });

  describe('Assinatura Expirada', () => {
    beforeEach(() => {
      const expiredUser = {
        ...mockUser,
        subscription: {
          plan: 'pro',
          status: 'expired',
          expiresAt: '2023-01-01T00:00:00.000Z', // Data no passado
        },
      };
      mockUseAuth.mockReturnValue({ user: expiredUser } as any);
    });

    it('deve tratar assinatura expirada como plano free', () => {
      const { result } = renderHook(() => useSubscription());

      expect(result.current.plan).toBe('free');
      expect(result.current.limits.patients).toBe(5);
      expect(result.current.isExpired).toBe(true);
    });

    it('deve bloquear funcionalidades quando expirado', () => {
      mockUsePatients.mockReturnValue({
        patients: Array.from({ length: 10 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Paciente ${i + 1}`,
          tenantId: 'tenant-123',
        })),
      } as any);

      const { result } = renderHook(() => useSubscription());

      expect(result.current.canAddPatient()).toBe(false);
      expect(result.current.usage.patients).toBe(10);
    });
  });

  describe('Incremento de Uso de AI', () => {
    it('deve incrementar contador de uso de AI', () => {
      const mockSetItem = jest.fn();
      const mockGetItem = jest.fn().mockReturnValue(
        JSON.stringify({
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          count: 1,
        })
      );

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: mockSetItem,
        },
      });

      const { result } = renderHook(() => useSubscription());

      act(() => {
        result.current.incrementAIUsage();
      });

      expect(mockSetItem).toHaveBeenCalledWith(
        'aiUsage_tenant-123',
        JSON.stringify({
          month: new Date().getMonth(),
          year: new Date().getFullYear(),
          count: 2,
        })
      );
    });

    it('deve resetar contador quando mês muda', () => {
      const mockSetItem = jest.fn();
      const mockGetItem = jest.fn().mockReturnValue(
        JSON.stringify({
          month: new Date().getMonth() - 1, // Mês anterior
          year: new Date().getFullYear(),
          count: 10,
        })
      );

      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: mockGetItem,
          setItem: mockSetItem,
        },
      });

      const { result } = renderHook(() => useSubscription());

      expect(result.current.usage.aiReports).toBe(0);
    });
  });

  describe('Sem Usuário Logado', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ user: null } as any);
    });

    it('deve retornar valores padrão quando não há usuário', () => {
      const { result } = renderHook(() => useSubscription());

      expect(result.current.plan).toBe('free');
      expect(result.current.canAddPatient()).toBe(false);
      expect(result.current.canAddSession()).toBe(false);
      expect(result.current.canUseAI()).toBe(false);
    });
  });
});
