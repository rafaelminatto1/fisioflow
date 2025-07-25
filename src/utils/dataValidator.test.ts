import {
  validateAndMigrateLocalStorageData,
  calculateChecksum,
} from './dataValidator';
import {
  PatientSchema,
  SessionSchema,
  TenantSchema,
  UserSchema,
} from '../schemas';

// Mock do console.warn para testes
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('dataValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('calculateChecksum', () => {
    it('deve calcular checksum consistente para os mesmos dados', () => {
      const data = { name: 'Test', value: 123 };
      const checksum1 = calculateChecksum(data);
      const checksum2 = calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe('string');
      expect(checksum1.length).toBeGreaterThan(0);
    });

    it('deve calcular checksums diferentes para dados diferentes', () => {
      const data1 = { name: 'Test1', value: 123 };
      const data2 = { name: 'Test2', value: 456 };

      const checksum1 = calculateChecksum(data1);
      const checksum2 = calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('deve tratar dados nulos e undefined', () => {
      expect(() => calculateChecksum(null)).not.toThrow();
      expect(() => calculateChecksum(undefined)).not.toThrow();
      expect(calculateChecksum(null)).toBe(calculateChecksum(null));
    });
  });

  describe('validateAndMigrateLocalStorageData', () => {
    const validPatients = [
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

    const validStorageData = {
      version: '2.0',
      timestamp: Date.now(),
      checksum: calculateChecksum(validPatients),
      data: validPatients,
    };

    it('deve validar e retornar dados válidos', () => {
      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(validStorageData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual(validPatients);
      expect(mockConsoleWarn).not.toHaveBeenCalled();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('deve retornar array vazio para dados nulos', () => {
      const result = validateAndMigrateLocalStorageData(
        null,
        PatientSchema,
        'patients'
      );

      expect(result).toEqual([]);
    });

    it('deve retornar array vazio para JSON inválido', () => {
      const result = validateAndMigrateLocalStorageData(
        'invalid json',
        PatientSchema,
        'patients'
      );

      expect(result).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Erro ao fazer parse dos dados do localStorage:',
        expect.any(Error)
      );
    });

    it('deve migrar dados da versão 1.0 para 2.0', () => {
      const oldData = {
        version: '1.0',
        data: validPatients,
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(oldData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual(validPatients);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Migrando dados da versão 1.0 para 2.0'
      );
    });

    it('deve tratar dados sem versão como versão 1.0', () => {
      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(validPatients),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual(validPatients);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Dados sem versão encontrados, assumindo versão 1.0'
      );
    });

    it('deve detectar corrupção de dados via checksum', () => {
      const corruptedData = {
        ...validStorageData,
        checksum: 'checksum-incorreto',
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(corruptedData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Dados corrompidos detectados (checksum inválido), usando fallback'
      );
    });

    it('deve filtrar itens inválidos e manter válidos', () => {
      const mixedData = {
        ...validStorageData,
        data: [
          validPatients[0], // Válido
          {
            id: 'invalid-patient',
            name: '', // Nome vazio - inválido
            email: 'invalid-email', // Email inválido
            tenantId: 'tenant-123',
          },
          {
            ...validPatients[0],
            id: 'patient-2',
            name: 'Maria Santos', // Válido
          },
        ],
        checksum: calculateChecksum([
          validPatients[0],
          {
            id: 'invalid-patient',
            name: '',
            email: 'invalid-email',
            tenantId: 'tenant-123',
          },
          {
            ...validPatients[0],
            id: 'patient-2',
            name: 'Maria Santos',
          },
        ]),
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(mixedData),
        PatientSchema,
        'patients'
      );

      expect(result).toHaveLength(2); // Apenas os válidos
      expect(result[0].name).toBe('João Silva');
      expect(result[1].name).toBe('Maria Santos');
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Item inválido removido dos patients:',
        expect.any(Object)
      );
    });

    it('deve validar dados de sessões', () => {
      const validSessions = [
        {
          id: 'session-1',
          patientId: 'patient-1',
          therapistId: 'user-123',
          date: '2024-01-15T10:00:00.000Z',
          duration: 60,
          type: 'individual',
          status: 'scheduled',
          notes: 'Sessão de fisioterapia',
          objectives: ['Melhorar mobilidade'],
          exercises: [],
          vitals: {},
          assessment: {},
          attachments: [],
          billing: {
            amount: 100,
            paid: false,
            method: 'cash',
          },
          tenantId: 'tenant-123',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const sessionData = {
        version: '2.0',
        timestamp: Date.now(),
        checksum: calculateChecksum(validSessions),
        data: validSessions,
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(sessionData),
        SessionSchema,
        'sessions'
      );

      expect(result).toEqual(validSessions);
    });

    it('deve validar dados de usuários', () => {
      const validUsers = [
        {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'therapist',
          tenantId: 'tenant-123',
          isActive: true,
          subscription: {
            plan: 'free',
            status: 'active',
            expiresAt: '2024-12-31T23:59:59.000Z',
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const userData = {
        version: '2.0',
        timestamp: Date.now(),
        checksum: calculateChecksum(validUsers),
        data: validUsers,
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(userData),
        UserSchema,
        'users'
      );

      expect(result).toEqual(validUsers);
    });

    it('deve validar dados de tenants', () => {
      const validTenants = [
        {
          id: 'tenant-1',
          name: 'Clínica Teste',
          domain: 'clinica-teste',
          settings: {
            theme: 'light',
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
          },
          subscription: {
            plan: 'pro',
            status: 'active',
            expiresAt: '2024-12-31T23:59:59.000Z',
          },
          isActive: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      const tenantData = {
        version: '2.0',
        timestamp: Date.now(),
        checksum: calculateChecksum(validTenants),
        data: validTenants,
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(tenantData),
        TenantSchema,
        'tenants'
      );

      expect(result).toEqual(validTenants);
    });

    it('deve tratar dados muito antigos (mais de 30 dias)', () => {
      const oldTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 dias atrás
      const oldData = {
        ...validStorageData,
        timestamp: oldTimestamp,
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(oldData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual(validPatients);
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        'Dados muito antigos detectados (mais de 30 dias), considere atualizar'
      );
    });

    it('deve tratar arrays vazios corretamente', () => {
      const emptyData = {
        version: '2.0',
        timestamp: Date.now(),
        checksum: calculateChecksum([]),
        data: [],
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(emptyData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual([]);
    });

    it('deve tratar dados que não são arrays', () => {
      const invalidData = {
        version: '2.0',
        timestamp: Date.now(),
        data: 'not an array',
      };

      const result = validateAndMigrateLocalStorageData(
        JSON.stringify(invalidData),
        PatientSchema,
        'patients'
      );

      expect(result).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Dados não são um array válido, usando fallback'
      );
    });
  });
});
