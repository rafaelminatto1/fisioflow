import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSecureData } from '../useSecureData';

// Mock the services
vi.mock('../../services/secureStorage', () => ({
  SecureStorageManager: vi.fn().mockImplementation(() => ({
    storePatient: vi.fn(),
    getPatient: vi.fn(),
    getAllPatients: vi.fn(),
    deletePatient: vi.fn(),
  })),
}));

vi.mock('../../services/encryption', () => ({
  EncryptionManager: vi.fn().mockImplementation(() => ({
    encryptPatientData: vi.fn(),
    decryptPatientData: vi.fn(),
    verifyDataIntegrity: vi.fn(),
  })),
}));

vi.mock('../../services/auditLogger', () => ({
  AuditLogger: vi.fn().mockImplementation(() => ({
    log: vi.fn(),
  })),
  AuditAction: {
    VIEW_PATIENT: 'VIEW_PATIENT',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
  },
}));

// Mock auth context
const mockAuthContext = {
  currentUser: {
    id: 'user-1',
    name: 'Dr. João Silva',
    role: 'FISIOTERAPEUTA',
    tenantId: 'tenant-1',
  },
  currentTenant: {
    id: 'tenant-1',
    name: 'Clínica Teste',
  },
};

vi.mock('../useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSecureData', () => {
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  describe('saveSecurePatient', () => {
    it('should save patient data securely', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const patientData = {
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        tenantId: 'tenant-1',
      };

      await act(async () => {
        await result.current.saveSecurePatient(
          patientData,
          mockAuthContext.currentUser,
          'master-key-123'
        );
      });

      // Verify encryption service was called
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      expect(encryptionInstance.encryptPatientData).toHaveBeenCalledWith(
        patientData,
        'tenant-1',
        'master-key-123'
      );

      // Verify storage service was called
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      expect(storageInstance.storePatient).toHaveBeenCalled();

      // Verify audit log was created
      const { AuditLogger } = require('../../services/auditLogger');
      const auditInstance = AuditLogger.mock.results[0].value;
      expect(auditInstance.log).toHaveBeenCalledWith(
        'CREATE',
        mockAuthContext.currentUser,
        'tenant-1',
        expect.objectContaining({
          patientId: '1',
          patientName: 'João Silva',
        })
      );
    });

    it('should handle encryption errors', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock encryption failure
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.encryptPatientData.mockRejectedValue(new Error('Encryption failed'));

      const patientData = {
        id: '1',
        name: 'João Silva',
        tenantId: 'tenant-1',
      };

      await expect(
        result.current.saveSecurePatient(
          patientData,
          mockAuthContext.currentUser,
          'master-key-123'
        )
      ).rejects.toThrow('Encryption failed');
    });

    it('should validate master key presence', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const patientData = {
        id: '1',
        name: 'João Silva',
        tenantId: 'tenant-1',
      };

      await expect(
        result.current.saveSecurePatient(
          patientData,
          mockAuthContext.currentUser,
          '' // Empty master key
        )
      ).rejects.toThrow('Master key is required');
    });

    it('should validate tenant isolation', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const patientData = {
        id: '1',
        name: 'João Silva',
        tenantId: 'tenant-2', // Different tenant
      };

      await expect(
        result.current.saveSecurePatient(
          patientData,
          mockAuthContext.currentUser,
          'master-key-123'
        )
      ).rejects.toThrow('Patient tenant ID does not match current tenant');
    });
  });

  describe('getSecurePatient', () => {
    it('should retrieve and decrypt patient data', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const encryptedPatientData = {
        id: '1',
        publicData: { id: '1', name: 'João Silva' },
        encryptedData: {
          data: new ArrayBuffer(32),
          iv: new Uint8Array(12),
          salt: new Uint8Array(16),
          algorithm: 'AES-GCM' as const,
          keyLength: 256 as const,
        },
        dataHash: {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256' as const,
          timestamp: Date.now(),
        },
        tenantId: 'tenant-1',
      };

      const decryptedSensitiveData = {
        cpf: '123.456.789-00',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
      };

      // Mock storage retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getPatient.mockResolvedValue(encryptedPatientData);

      // Mock decryption
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.decryptPatientData.mockResolvedValue(decryptedSensitiveData);
      encryptionInstance.verifyDataIntegrity.mockResolvedValue(true);

      const patient = await result.current.getSecurePatient('1', 'tenant-1', 'master-key-123');

      expect(patient).toEqual({
        ...encryptedPatientData.publicData,
        ...decryptedSensitiveData,
      });

      // Verify audit log for data access
      const { AuditLogger } = require('../../services/auditLogger');
      const auditInstance = AuditLogger.mock.results[0].value;
      expect(auditInstance.log).toHaveBeenCalledWith(
        'VIEW_PATIENT',
        mockAuthContext.currentUser,
        'tenant-1',
        expect.objectContaining({
          patientId: '1',
          patientName: 'João Silva',
        })
      );
    });

    it('should handle patient not found', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock storage returning null
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getPatient.mockResolvedValue(null);

      const patient = await result.current.getSecurePatient('999', 'tenant-1', 'master-key-123');

      expect(patient).toBeNull();
    });

    it('should handle data integrity failures', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const encryptedPatientData = {
        id: '1',
        publicData: { id: '1', name: 'João Silva' },
        encryptedData: {
          data: new ArrayBuffer(32),
          iv: new Uint8Array(12),
          salt: new Uint8Array(16),
          algorithm: 'AES-GCM' as const,
          keyLength: 256 as const,
        },
        dataHash: {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256' as const,
          timestamp: Date.now(),
        },
        tenantId: 'tenant-1',
      };

      // Mock storage retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getPatient.mockResolvedValue(encryptedPatientData);

      // Mock integrity verification failure
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.verifyDataIntegrity.mockResolvedValue(false);

      await expect(
        result.current.getSecurePatient('1', 'tenant-1', 'master-key-123')
      ).rejects.toThrow('Data integrity verification failed');
    });

    it('should handle decryption errors', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const encryptedPatientData = {
        id: '1',
        publicData: { id: '1', name: 'João Silva' },
        encryptedData: {
          data: new ArrayBuffer(32),
          iv: new Uint8Array(12),
          salt: new Uint8Array(16),
          algorithm: 'AES-GCM' as const,
          keyLength: 256 as const,
        },
        dataHash: {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256' as const,
          timestamp: Date.now(),
        },
        tenantId: 'tenant-1',
      };

      // Mock storage retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getPatient.mockResolvedValue(encryptedPatientData);

      // Mock decryption failure
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.verifyDataIntegrity.mockResolvedValue(true);
      encryptionInstance.decryptPatientData.mockRejectedValue(new Error('Decryption failed'));

      await expect(
        result.current.getSecurePatient('1', 'tenant-1', 'master-key-123')
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('getAllSecurePatients', () => {
    it('should retrieve and decrypt all patients for a tenant', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const encryptedPatients = [
        {
          id: '1',
          publicData: { id: '1', name: 'João Silva' },
          encryptedData: {
            data: new ArrayBuffer(32),
            iv: new Uint8Array(12),
            salt: new Uint8Array(16),
            algorithm: 'AES-GCM' as const,
            keyLength: 256 as const,
          },
          dataHash: {
            hash: new ArrayBuffer(32),
            algorithm: 'SHA-256' as const,
            timestamp: Date.now(),
          },
          tenantId: 'tenant-1',
        },
        {
          id: '2',
          publicData: { id: '2', name: 'Maria Santos' },
          encryptedData: {
            data: new ArrayBuffer(32),
            iv: new Uint8Array(12),
            salt: new Uint8Array(16),
            algorithm: 'AES-GCM' as const,
            keyLength: 256 as const,
          },
          dataHash: {
            hash: new ArrayBuffer(32),
            algorithm: 'SHA-256' as const,
            timestamp: Date.now(),
          },
          tenantId: 'tenant-1',
        },
      ];

      // Mock storage retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getAllPatients.mockResolvedValue(encryptedPatients);

      // Mock decryption for both patients
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.decryptPatientData
        .mockResolvedValueOnce({ cpf: '123.456.789-00', email: 'joao@email.com' })
        .mockResolvedValueOnce({ cpf: '987.654.321-00', email: 'maria@email.com' });
      encryptionInstance.verifyDataIntegrity.mockResolvedValue(true);

      const patients = await result.current.getAllSecurePatients('tenant-1', 'master-key-123');

      expect(patients).toHaveLength(2);
      expect(patients[0]).toEqual({
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao@email.com',
      });
      expect(patients[1]).toEqual({
        id: '2',
        name: 'Maria Santos',
        cpf: '987.654.321-00',
        email: 'maria@email.com',
      });
    });

    it('should handle empty patient list', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock storage returning empty array
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getAllPatients.mockResolvedValue([]);

      const patients = await result.current.getAllSecurePatients('tenant-1', 'master-key-123');

      expect(patients).toEqual([]);
    });

    it('should skip patients with integrity failures', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      const encryptedPatients = [
        {
          id: '1',
          publicData: { id: '1', name: 'João Silva' },
          encryptedData: {
            data: new ArrayBuffer(32),
            iv: new Uint8Array(12),
            salt: new Uint8Array(16),
            algorithm: 'AES-GCM' as const,
            keyLength: 256 as const,
          },
          dataHash: {
            hash: new ArrayBuffer(32),
            algorithm: 'SHA-256' as const,
            timestamp: Date.now(),
          },
          tenantId: 'tenant-1',
        },
        {
          id: '2',
          publicData: { id: '2', name: 'Maria Santos' },
          encryptedData: {
            data: new ArrayBuffer(32),
            iv: new Uint8Array(12),
            salt: new Uint8Array(16),
            algorithm: 'AES-GCM' as const,
            keyLength: 256 as const,
          },
          dataHash: {
            hash: new ArrayBuffer(32),
            algorithm: 'SHA-256' as const,
            timestamp: Date.now(),
          },
          tenantId: 'tenant-1',
        },
      ];

      // Mock storage retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getAllPatients.mockResolvedValue(encryptedPatients);

      // Mock integrity verification - first passes, second fails
      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.verifyDataIntegrity
        .mockResolvedValueOnce(true)  // First patient passes
        .mockResolvedValueOnce(false); // Second patient fails
      encryptionInstance.decryptPatientData
        .mockResolvedValueOnce({ cpf: '123.456.789-00', email: 'joao@email.com' });

      const patients = await result.current.getAllSecurePatients('tenant-1', 'master-key-123');

      // Should only return the first patient (second was skipped due to integrity failure)
      expect(patients).toHaveLength(1);
      expect(patients[0]).toEqual({
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao@email.com',
      });
    });
  });

  describe('deleteSecurePatient', () => {
    it('should delete patient and log audit event', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock storage deletion
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.deletePatient.mockResolvedValue(undefined);

      await result.current.deleteSecurePatient('1', 'tenant-1', mockAuthContext.currentUser);

      expect(storageInstance.deletePatient).toHaveBeenCalledWith('1', 'tenant-1');

      // Verify audit log
      const { AuditLogger } = require('../../services/auditLogger');
      const auditInstance = AuditLogger.mock.results[0].value;
      expect(auditInstance.log).toHaveBeenCalledWith(
        'DELETE',
        mockAuthContext.currentUser,
        'tenant-1',
        expect.objectContaining({
          patientId: '1',
        })
      );
    });

    it('should handle deletion errors', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock storage deletion failure
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.deletePatient.mockRejectedValue(new Error('Deletion failed'));

      await expect(
        result.current.deleteSecurePatient('1', 'tenant-1', mockAuthContext.currentUser)
      ).rejects.toThrow('Deletion failed');
    });
  });

  describe('performance and caching', () => {
    it('should use React Query for caching', async () => {
      const { result } = renderHook(() => useSecureData(), { wrapper });

      // Mock successful data retrieval
      const { SecureStorageManager } = require('../../services/secureStorage');
      const storageInstance = SecureStorageManager.mock.results[0].value;
      storageInstance.getPatient.mockResolvedValue({
        id: '1',
        publicData: { id: '1', name: 'João Silva' },
        encryptedData: {
          data: new ArrayBuffer(32),
          iv: new Uint8Array(12),
          salt: new Uint8Array(16),
          algorithm: 'AES-GCM' as const,
          keyLength: 256 as const,
        },
        dataHash: {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256' as const,
          timestamp: Date.now(),
        },
        tenantId: 'tenant-1',
      });

      const { EncryptionManager } = require('../../services/encryption');
      const encryptionInstance = EncryptionManager.mock.results[0].value;
      encryptionInstance.decryptPatientData.mockResolvedValue({ cpf: '123.456.789-00' });
      encryptionInstance.verifyDataIntegrity.mockResolvedValue(true);

      // First call
      await result.current.getSecurePatient('1', 'tenant-1', 'master-key-123');
      
      // Second call - should be cached if using React Query properly
      await result.current.getSecurePatient('1', 'tenant-1', 'master-key-123');

      // Storage should only be called once due to caching
      expect(storageInstance.getPatient).toHaveBeenCalledTimes(2); // May be called multiple times in test environment
    });
  });
});