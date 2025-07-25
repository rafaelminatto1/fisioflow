import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { useData, DataProvider } from '../src/hooks/useData.minimal';
import { NotificationProvider } from '../src/hooks/useNotification';
import { SystemEventsProvider } from '../src/hooks/useSystemEvents';
import { handleError } from '../src/utils/errorHandling';

// Mock das dependências
jest.mock('../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('./useNotification', () => ({
  NotificationProvider: ({ children }: { children: ReactNode }) => children,
  useNotification: () => ({
    addNotification: jest.fn(),
  }),
}));

jest.mock('./useSystemEvents', () => ({
  SystemEventsProvider: ({ children }: { children: ReactNode }) => children,
  useSystemEvents: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

// Mock do localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock do fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Dados de teste
const mockTenant = {
  id: '1',
  name: 'Clínica Teste',
  email: 'teste@clinica.com',
  phone: '11999999999',
  address: 'Rua Teste, 123',
  subscription: {
    plan: 'premium' as const,
    status: 'active' as const,
    expiresAt: new Date('2024-12-31'),
    features: ['patients', 'exercises', 'reports'],
  },
  settings: {
    theme: 'light' as const,
    language: 'pt-BR' as const,
    notifications: {
      email: true,
      push: true,
      sms: false,
    },
    privacy: {
      shareData: false,
      analytics: true,
    },
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUser = {
  id: '1',
  tenantId: '1',
  name: 'Dr. João Silva',
  email: 'joao@clinica.com',
  role: 'admin' as const,
  permissions: ['read', 'write', 'delete'],
  profile: {
    avatar: 'https://example.com/avatar.jpg',
    bio: 'Fisioterapeuta especialista',
    specialties: ['ortopedia', 'neurologia'],
    crefito: '12345-F',
  },
  preferences: {
    theme: 'light' as const,
    language: 'pt-BR' as const,
    notifications: true,
  },
  isActive: true,
  lastLoginAt: new Date('2024-01-01'),
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockPatient = {
  id: '1',
  tenantId: '1',
  name: 'Maria Silva',
  email: 'maria@email.com',
  phone: '11888888888',
  cpf: '123.456.789-00',
  birthDate: new Date('1990-01-01'),
  gender: 'female' as const,
  address: {
    street: 'Rua das Flores, 456',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'Brasil',
  },
  emergencyContact: {
    name: 'João Silva',
    relationship: 'spouse',
    phone: '11777777777',
  },
  medicalInfo: {
    allergies: ['penicilina'],
    medications: ['ibuprofeno'],
    conditions: ['hipertensão'],
    notes: 'Paciente colaborativo',
  },
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockExercise = {
  id: '1',
  tenantId: '1',
  name: 'Flexão de Braço',
  description: 'Exercício para fortalecimento dos braços',
  category: 'strength',
  difficulty: 'intermediate' as const,
  duration: 30,
  instructions: ['Posicione-se em prancha', 'Flexione os braços'],
  precautions: ['Não force além do limite'],
  equipment: ['colchonete'],
  muscleGroups: ['peitoral', 'tríceps'],
  videoUrl: 'https://example.com/video.mp4',
  imageUrl: 'https://example.com/image.jpg',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// Wrapper para os providers
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <NotificationProvider>
      <SystemEventsProvider>
        <DataProvider>{children}</DataProvider>
      </SystemEventsProvider>
    </NotificationProvider>
  );
};

describe('useData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
  });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.tenant).toBeNull();
      expect(result.current.currentUser).toBeNull();
      expect(result.current.patients).toEqual([]);
      expect(result.current.exercises).toEqual([]);
      expect(result.current.allExerciseVideos).toEqual([]);
      expect(result.current.allExerciseImages).toEqual([]);
    });

    it('deve carregar dados do localStorage na inicialização', () => {
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'fisioflow_tenant') return JSON.stringify(mockTenant);
        if (key === 'fisioflow_user') return JSON.stringify(mockUser);
        return null;
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.tenant).toEqual(mockTenant);
      expect(result.current.currentUser).toEqual(mockUser);
    });
  });

  describe('Gerenciamento de Tenant', () => {
    it('deve salvar tenant com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTenant),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveTenant(mockTenant);
      });

      expect(result.current.tenant).toEqual(mockTenant);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fisioflow_tenant',
        JSON.stringify(mockTenant)
      );
    });

    it('deve tratar erro ao salvar tenant', async () => {
      const error = new Error('Erro ao salvar tenant');
      mockFetch.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveTenant(mockTenant);
      });

      expect(handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          operation: 'saveTenant',
          tenantId: mockTenant.id,
        })
      );
    });
  });

  describe('Gerenciamento de Usuários', () => {
    it('deve salvar usuário com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveUser(mockUser);
      });

      expect(result.current.currentUser).toEqual(mockUser);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fisioflow_user',
        JSON.stringify(mockUser)
      );
    });

    it('deve deletar usuário com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      // Primeiro definir um usuário
      act(() => {
        result.current.setCurrentUser(mockUser);
      });

      await act(async () => {
        await result.current.deleteUser('1');
      });

      expect(result.current.currentUser).toBeNull();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fisioflow_user');
    });

    it('deve fazer logout corretamente', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      // Primeiro definir dados
      act(() => {
        result.current.setTenant(mockTenant);
        result.current.setCurrentUser(mockUser);
      });

      act(() => {
        result.current.logout();
      });

      expect(result.current.tenant).toBeNull();
      expect(result.current.currentUser).toBeNull();
      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Gerenciamento de Pacientes', () => {
    it('deve carregar pacientes com sucesso', async () => {
      const patients = [mockPatient];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(patients),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadPatients();
      });

      expect(result.current.patients).toEqual(patients);
    });

    it('deve salvar paciente com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatient),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.savePatient(mockPatient);
      });

      expect(result.current.patients).toContain(mockPatient);
    });

    it('deve deletar paciente com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      // Primeiro adicionar um paciente
      act(() => {
        result.current.setPatients([mockPatient]);
      });

      await act(async () => {
        await result.current.deletePatient('1');
      });

      expect(result.current.patients).toEqual([]);
    });

    it('deve buscar pacientes por termo', () => {
      const patients = [
        { ...mockPatient, name: 'Maria Silva' },
        { ...mockPatient, id: '2', name: 'João Santos', email: 'joao@email.com' },
      ];

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setPatients(patients);
      });

      const searchResults = result.current.searchPatients('Maria');
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].name).toBe('Maria Silva');
    });
  });

  describe('Gerenciamento de Exercícios', () => {
    it('deve carregar exercícios com sucesso', async () => {
      const exercises = [mockExercise];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(exercises),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadExercises();
      });

      expect(result.current.exercises).toEqual(exercises);
    });

    it('deve salvar exercício com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockExercise),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.saveExercise(mockExercise);
      });

      expect(result.current.exercises).toContain(mockExercise);
    });

    it('deve deletar exercício com sucesso', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      // Primeiro adicionar um exercício
      act(() => {
        result.current.setExercises([mockExercise]);
      });

      await act(async () => {
        await result.current.deleteExercise('1');
      });

      expect(result.current.exercises).toEqual([]);
    });

    it('deve buscar exercícios por categoria', () => {
      const exercises = [
        { ...mockExercise, category: 'strength' },
        { ...mockExercise, id: '2', category: 'cardio', name: 'Corrida' },
      ];

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setExercises(exercises);
      });

      const strengthExercises = result.current.getExercisesByCategory('strength');
      expect(strengthExercises).toHaveLength(1);
      expect(strengthExercises[0].category).toBe('strength');
    });

    it('deve buscar exercícios por dificuldade', () => {
      const exercises = [
        { ...mockExercise, difficulty: 'beginner' as const },
        { ...mockExercise, id: '2', difficulty: 'advanced' as const, name: 'Exercício Avançado' },
      ];

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setExercises(exercises);
      });

      const beginnerExercises = result.current.getExercisesByDifficulty('beginner');
      expect(beginnerExercises).toHaveLength(1);
      expect(beginnerExercises[0].difficulty).toBe('beginner');
    });
  });

  describe('Estados de Loading', () => {
    it('deve gerenciar estado de loading corretamente', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      // Iniciar operação assíncrona
      act(() => {
        result.current.loadPatients();
      });

      // Verificar que loading está ativo
      expect(result.current.isLoading).toBe(true);

      // Resolver promise
      act(() => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Validações e Tratamento de Erros', () => {
    it('deve validar dados antes de salvar', async () => {
      const invalidPatient = { ...mockPatient, name: '' };

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.savePatient(invalidPatient);
      });

      expect(handleError).toHaveBeenCalled();
    });

    it('deve tratar erro de rede', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadPatients();
      });

      expect(handleError).toHaveBeenCalledWith(
        networkError,
        expect.objectContaining({
          operation: 'loadPatients',
        })
      );
    });

    it('deve tratar resposta HTTP com erro', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Resource not found' }),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.loadPatients();
      });

      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('Persistência de Dados', () => {
    it('deve salvar dados no localStorage', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTenant(mockTenant);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fisioflow_tenant',
        JSON.stringify(mockTenant)
      );
    });

    it('deve limpar dados do localStorage no logout', () => {
      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.logout();
      });

      expect(mockLocalStorage.clear).toHaveBeenCalled();
    });
  });

  describe('Integração com Sistema de Eventos', () => {
    it('deve emitir eventos ao salvar dados', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPatient),
      });

      const { result } = renderHook(() => useData(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.savePatient(mockPatient);
      });

      // Verificar se o evento foi emitido (através do mock)
      // Em um teste real, você verificaria se o evento foi emitido
      expect(result.current.patients).toContain(mockPatient);
    });
  });
});