import { renderHook, act } from '@testing-library/react';
import { usePatients } from './src/hooks/usePatients';
import { useAuth } from './src/hooks/useAuth';
import { useErrorHandler } from './src/components/ErrorBoundary';

// Mock das dependências
jest.mock('./src/hooks/useAuth');
jest.mock('./src/components/ErrorBoundary');
jest.mock('./src/utils/dataValidator');

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
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

describe('usePatients', () => {
  const mockUser = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    name: 'Test User',
  };

  const mockErrorHandler = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUseErrorHandler.mockReturnValue(mockErrorHandler);
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('deve inicializar com estado vazio quando não há dados no localStorage', async () => {
    const { result } = renderHook(() => usePatients());

    expect(result.current.loading).toBe(true);
    expect(result.current.patients).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('deve carregar pacientes do localStorage', async () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        birthDate: '1990-01-01T00:00:00.000Z',
        cpf: '12345678901',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    // Mock do validateAndMigrateLocalStorageData
    const mockValidateData =
      require('./src/utils/dataValidator').validateAndMigrateLocalStorageData;
    mockValidateData.mockReturnValue(mockPatients);

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: '2.0',
        timestamp: Date.now(),
        data: mockPatients,
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => usePatients());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.patients).toEqual(mockPatients);
    expect(result.current.error).toBe(null);
  });

  it('deve adicionar um novo paciente', async () => {
    const { result } = renderHook(() => usePatients());

    const newPatientData = {
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11888888888',
      birthDate: '1985-05-15T00:00:00.000Z',
      cpf: '98765432109',
      isActive: true,
    };

    await act(async () => {
      const patient = await result.current.addPatient(newPatientData);
      expect(patient.id).toBe('test-uuid-123');
      expect(patient.name).toBe('Maria Santos');
      expect(patient.tenantId).toBe('tenant-123');
    });
  });

  it('deve atualizar um paciente existente', async () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        birthDate: '1990-01-01T00:00:00.000Z',
        cpf: '12345678901',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    const { result } = renderHook(() => usePatients());

    // Simular pacientes carregados
    act(() => {
      result.current.patients = mockPatients;
    });

    await act(async () => {
      await result.current.updatePatient('patient-1', {
        name: 'João Santos Silva',
        phone: '11777777777',
      });
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve remover um paciente', async () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        birthDate: '1990-01-01T00:00:00.000Z',
        cpf: '12345678901',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'patient-2',
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        birthDate: '1985-05-15T00:00:00.000Z',
        cpf: '98765432109',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    const { result } = renderHook(() => usePatients());

    // Simular pacientes carregados
    act(() => {
      result.current.patients = mockPatients;
    });

    await act(async () => {
      await result.current.removePatient('patient-1');
    });

    // Verificar se o localStorage foi chamado para salvar
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deve buscar pacientes por nome', () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        birthDate: '1990-01-01T00:00:00.000Z',
        cpf: '12345678901',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'patient-2',
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        birthDate: '1985-05-15T00:00:00.000Z',
        cpf: '98765432109',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    const { result } = renderHook(() => usePatients());

    // Simular pacientes carregados
    act(() => {
      result.current.patients = mockPatients;
    });

    const searchResults = result.current.searchPatients('João');
    expect(searchResults).toHaveLength(1);
    expect(searchResults[0].name).toBe('João Silva');
  });

  it('deve tratar erros ao carregar dados', async () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('Erro no localStorage');
    });

    const { result, waitForNextUpdate } = renderHook(() => usePatients());

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Erro ao carregar pacientes');
    expect(mockErrorHandler).toHaveBeenCalled();
  });

  it('deve filtrar pacientes por tenant', async () => {
    const mockPatients = [
      {
        id: 'patient-1',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        birthDate: '1990-01-01T00:00:00.000Z',
        cpf: '12345678901',
        tenantId: 'tenant-123',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
      {
        id: 'patient-2',
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        birthDate: '1985-05-15T00:00:00.000Z',
        cpf: '98765432109',
        tenantId: 'tenant-456', // Tenant diferente
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    ];

    // Mock do validateAndMigrateLocalStorageData
    const mockValidateData =
      require('./src/utils/dataValidator').validateAndMigrateLocalStorageData;
    mockValidateData.mockReturnValue(mockPatients);

    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: '2.0',
        timestamp: Date.now(),
        data: mockPatients,
      })
    );

    const { result, waitForNextUpdate } = renderHook(() => usePatients());

    await waitForNextUpdate();

    // Deve retornar apenas o paciente do tenant correto
    expect(result.current.patients).toHaveLength(1);
    expect(result.current.patients[0].tenantId).toBe('tenant-123');
  });
});
