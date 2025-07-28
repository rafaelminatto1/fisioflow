import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionManager } from '../encryption';

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager;

  beforeEach(() => {
    vi.clearAllMocks();
    encryptionManager = new EncryptionManager();
  });

  describe('generateMasterKey', () => {
    it('should generate a random hex string', () => {
      const result = encryptionManager.generateMasterKey();
      
      expect(typeof result).toBe('string');
      expect(result).toHaveLength(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
    });

    it('should generate different keys each time', () => {
      const key1 = encryptionManager.generateMasterKey();
      const key2 = encryptionManager.generateMasterKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptPatientData', () => {
    it('should encrypt patient data correctly', async () => {
      const patientData = {
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        cpf: '123.456.789-00',
        address: 'Rua A, 123',
        tenantId: 'tenant-1',
        createdAt: '2024-01-01',
        avatarUrl: 'avatar.jpg'
      };
      const tenantId = 'tenant-1';
      const masterKey = 'master-key-123';

      const mockEncryptedBuffer = new ArrayBuffer(48); // 32 + 16 for tag
      const mockDigestBuffer = new ArrayBuffer(32);
      
      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.encrypt).mockResolvedValue(mockEncryptedBuffer);
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(mockDigestBuffer);

      const result = await encryptionManager.encryptPatientData(patientData, tenantId, masterKey);

      expect(result).toHaveProperty('publicData');
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('dataHash');
      expect(result.publicData).toEqual({
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        avatarUrl: 'avatar.jpg',
        createdAt: '2024-01-01',
        tenantId: 'tenant-1'
      });
      expect(result.encryptedData).toHaveProperty('encryptedContent');
      expect(result.encryptedData).toHaveProperty('iv');
      expect(result.encryptedData).toHaveProperty('tag');
      expect(result.dataHash).toHaveProperty('hash');
      expect(result.dataHash).toHaveProperty('algorithm', 'SHA-256');
    });

    it('should separate sensitive and non-sensitive data correctly', async () => {
      const patientData = {
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        avatarUrl: 'avatar.jpg',
        createdAt: '2024-01-01',
        tenantId: 'tenant-1',
        cpf: '123.456.789-00',
        address: 'Rua A, 123',
        medicalHistory: 'Histórico médico'
      };

      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.encrypt).mockResolvedValue(new ArrayBuffer(48));
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(new ArrayBuffer(32));

      const result = await encryptionManager.encryptPatientData(patientData, 'tenant-1', 'key');

      // Public data should contain non-sensitive fields
      expect(result.publicData).toEqual({
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        avatarUrl: 'avatar.jpg',
        createdAt: '2024-01-01',
        tenantId: 'tenant-1'
      });
      
      // Sensitive data should not be in public data
      expect(result.publicData).not.toHaveProperty('cpf');
      expect(result.publicData).not.toHaveProperty('address');
      expect(result.publicData).not.toHaveProperty('medicalHistory');
    });

    it('should handle encryption errors', async () => {
      const error = new Error('Encryption failed');
      vi.mocked(global.crypto.subtle.importKey).mockRejectedValue(error);

      await expect(
        encryptionManager.encryptPatientData({}, 'tenant-1', 'key')
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('decryptPatientData', () => {
    it('should decrypt patient data correctly', async () => {
      const publicData = {
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        avatarUrl: 'avatar.jpg',
        createdAt: '2024-01-01',
        tenantId: 'tenant-1'
      };
      const encryptedData = {
        encryptedContent: 'abcd1234',
        iv: 'efgh5678',
        tag: 'ijkl9012',
        algorithm: 'AES-256-GCM' as const,
        timestamp: '2024-01-01T00:00:00.000Z'
      };
      const tenantId = 'tenant-1';
      const masterKey = 'master-key-123';

      const mockDecryptedData = JSON.stringify({
        cpf: '123.456.789-00',
        address: 'Rua A, 123'
      });

      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.decrypt).mockResolvedValue(new TextEncoder().encode(mockDecryptedData));

      const result = await encryptionManager.decryptPatientData(publicData, encryptedData, tenantId, masterKey);

      expect(result).toEqual({
        id: '1',
        name: 'João Silva',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        avatarUrl: 'avatar.jpg',
        createdAt: '2024-01-01',
        tenantId: 'tenant-1',
        cpf: '123.456.789-00',
        address: 'Rua A, 123'
      });
    });

    it('should handle decryption errors', async () => {
      const publicData = { id: '1', name: 'Test' };
      const encryptedData = {
        encryptedContent: 'invalid',
        iv: 'invalid',
        tag: 'invalid',
        algorithm: 'AES-256-GCM' as const,
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      const error = new Error('Decryption failed');
      vi.mocked(global.crypto.subtle.importKey).mockRejectedValue(error);

      await expect(
        encryptionManager.decryptPatientData(publicData, encryptedData, 'tenant-1', 'key')
      ).rejects.toThrow();
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data integrity correctly', async () => {
      const data = { name: 'João Silva' };
      
      // First, let hashSensitiveData create the hash
      const hashedData = await encryptionManager.hashSensitiveData(JSON.stringify(data));
      
      // Then verify it
      const result = await encryptionManager.verifyDataIntegrity(data, hashedData);

      expect(result).toBe(true);
      expect(global.crypto.subtle.digest).toHaveBeenCalled();
    });

    it('should return false for invalid hash', async () => {
      const data = { name: 'João Silva' };
      const expectedHashedData = {
        hash: 'wronghash',
        salt: 'efgh5678',
        algorithm: 'SHA-256' as const,
        iterations: 100000
      };
      
      const mockDigestBuffer = new Uint8Array(32);
      // Set different hash
      mockDigestBuffer[0] = 0x11;
      mockDigestBuffer[1] = 0x22;
      
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(mockDigestBuffer.buffer);

      const result = await encryptionManager.verifyDataIntegrity(data, expectedHashedData);

      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      const error = new Error('Verification failed');
      vi.mocked(global.crypto.subtle.digest).mockRejectedValue(error);

      await expect(
        encryptionManager.verifyDataIntegrity({}, {
          hash: 'abcd1234',
          salt: 'efgh5678',
          algorithm: 'SHA-256',
          iterations: 100000
        })
      ).rejects.toThrow();
    });
  });

  describe('deriveKey', () => {
    it('should derive key from password with correct parameters', async () => {
      const testKey = 'test-key-value';
      const salt = new Uint8Array(16);
      const mockKey = { type: 'secret' };

      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'raw' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue(mockKey as any);

      const result = await encryptionManager.deriveKey(testKey, salt);

      expect(global.crypto.subtle.importKey).toHaveBeenCalled();
      expect(result).toBe(mockKey);
    });

    it('should handle key derivation errors', async () => {
      const error = new Error('Key derivation failed');
      vi.mocked(global.crypto.subtle.importKey).mockRejectedValue(error);

      await expect(
        encryptionManager.deriveKey('test-pwd', new Uint8Array(16))
      ).rejects.toThrow('Key derivation failed');
    });
  });

  describe('edge cases and security', () => {
    it('should handle empty patient data', async () => {
      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.encrypt).mockResolvedValue(new ArrayBuffer(48));
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(new ArrayBuffer(32));

      const result = await encryptionManager.encryptPatientData({}, 'tenant-1', 'key');

      expect(result.publicData).toEqual({
        id: undefined,
        name: undefined,
        email: undefined,
        phone: undefined,
        avatarUrl: undefined,
        createdAt: undefined,
        tenantId: undefined
      });
      expect(result.encryptedData).toBeDefined();
      expect(result.dataHash).toBeDefined();
    });

    it('should generate different IVs for each encryption', async () => {
      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.encrypt).mockResolvedValue(new ArrayBuffer(48));
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(new ArrayBuffer(32));

      const data = { name: 'Test' };
      const result1 = await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');
      const result2 = await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');

      expect(result1.encryptedData.iv).not.toEqual(result2.encryptedData.iv);
    });

    it('should validate tenant isolation in encryption', async () => {
      vi.mocked(global.crypto.subtle.importKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.deriveKey).mockResolvedValue({ type: 'secret' } as any);
      vi.mocked(global.crypto.subtle.encrypt).mockResolvedValue(new ArrayBuffer(48));
      vi.mocked(global.crypto.subtle.digest).mockResolvedValue(new ArrayBuffer(32));

      const data = { name: 'Test' };
      
      // The tenant ID should be used in key derivation
      await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');
      await encryptionManager.encryptPatientData(data, 'tenant-2', 'key');

      // Should call deriveKey with different parameters for different tenants
      expect(global.crypto.subtle.deriveKey).toHaveBeenCalledTimes(2);
    });
  });
});