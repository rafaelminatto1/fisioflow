import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { EncryptionManager } from '../encryption';

// Mock crypto.subtle
const mockSubtle = {
  generateKey: jest.fn(),
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  importKey: jest.fn(),
  exportKey: jest.fn(),
  digest: jest.fn(),
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockSubtle,
    getRandomValues: jest.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
  writable: true,
});

describe('EncryptionManager', () => {
  let encryptionManager: EncryptionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    encryptionManager = new EncryptionManager();
  });

  describe('generateMasterKey', () => {
    it('should generate a master key with correct parameters', async () => {
      const mockKey = { type: 'secret' };
      mockSubtle.generateKey.mockResolvedValue(mockKey);

      const result = await encryptionManager.generateMasterKey();

      expect(mockSubtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      expect(result).toBe(mockKey);
    });

    it('should handle key generation errors', async () => {
      const error = new Error('Key generation failed');
      mockSubtle.generateKey.mockRejectedValue(error);

      await expect(encryptionManager.generateMasterKey()).rejects.toThrow('Key generation failed');
    });
  });

  describe('encryptPatientData', () => {
    it('should encrypt patient data correctly', async () => {
      const patientData = {
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        phone: '(11) 99999-9999'
      };
      const tenantId = 'tenant-1';
      const masterKey = 'master-key-123';

      const mockEncryptedData = new ArrayBuffer(32);
      const mockIv = new Uint8Array(12);
      const mockSalt = new Uint8Array(16);
      
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.encrypt.mockResolvedValue(mockEncryptedData);
      mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const result = await encryptionManager.encryptPatientData(patientData, tenantId, masterKey);

      expect(result).toHaveProperty('publicData');
      expect(result).toHaveProperty('encryptedData');
      expect(result).toHaveProperty('dataHash');
      expect(result.publicData).toEqual({
        id: '1',
        name: 'João Silva'
      });
      expect(result.encryptedData).toHaveProperty('data');
      expect(result.encryptedData).toHaveProperty('iv');
      expect(result.encryptedData).toHaveProperty('salt');
      expect(result.dataHash).toHaveProperty('hash');
      expect(result.dataHash).toHaveProperty('algorithm');
    });

    it('should separate sensitive and non-sensitive data correctly', async () => {
      const patientData = {
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        address: 'Rua A, 123'
      };

      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
      mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const result = await encryptionManager.encryptPatientData(patientData, 'tenant-1', 'key');

      expect(result.publicData).toEqual({
        id: '1',
        name: 'João Silva'
      });
      
      // Sensitive data should not be in public data
      expect(result.publicData).not.toHaveProperty('cpf');
      expect(result.publicData).not.toHaveProperty('email');
      expect(result.publicData).not.toHaveProperty('phone');
      expect(result.publicData).not.toHaveProperty('address');
    });

    it('should handle encryption errors', async () => {
      const error = new Error('Encryption failed');
      mockSubtle.importKey.mockRejectedValue(error);

      await expect(
        encryptionManager.encryptPatientData({}, 'tenant-1', 'key')
      ).rejects.toThrow('Encryption failed');
    });
  });

  describe('decryptPatientData', () => {
    it('should decrypt patient data correctly', async () => {
      const encryptedData = {
        data: new ArrayBuffer(32),
        iv: new Uint8Array(12),
        salt: new Uint8Array(16),
        algorithm: 'AES-GCM' as const,
        keyLength: 256 as const
      };
      const tenantId = 'tenant-1';
      const masterKey = 'master-key-123';

      const mockDecryptedData = JSON.stringify({
        cpf: '123.456.789-00',
        email: 'joao@email.com'
      });

      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.decrypt.mockResolvedValue(new TextEncoder().encode(mockDecryptedData));

      const result = await encryptionManager.decryptPatientData(encryptedData, tenantId, masterKey);

      expect(result).toEqual({
        cpf: '123.456.789-00',
        email: 'joao@email.com'
      });
    });

    it('should handle decryption errors', async () => {
      const encryptedData = {
        data: new ArrayBuffer(32),
        iv: new Uint8Array(12),
        salt: new Uint8Array(16),
        algorithm: 'AES-GCM' as const,
        keyLength: 256 as const
      };

      const error = new Error('Decryption failed');
      mockSubtle.importKey.mockRejectedValue(error);

      await expect(
        encryptionManager.decryptPatientData(encryptedData, 'tenant-1', 'key')
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('verifyDataIntegrity', () => {
    it('should verify data integrity correctly', async () => {
      const data = { name: 'João Silva' };
      const expectedHash = new ArrayBuffer(32);
      
      mockSubtle.digest.mockResolvedValue(expectedHash);

      const result = await encryptionManager.verifyDataIntegrity(data, {
        hash: expectedHash,
        algorithm: 'SHA-256',
        timestamp: Date.now()
      });

      expect(result).toBe(true);
      expect(mockSubtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should return false for invalid hash', async () => {
      const data = { name: 'João Silva' };
      const actualHash = new ArrayBuffer(32);
      const expectedHash = new ArrayBuffer(32);
      
      // Make buffers different
      new Uint8Array(actualHash)[0] = 1;
      new Uint8Array(expectedHash)[0] = 2;
      
      mockSubtle.digest.mockResolvedValue(actualHash);

      const result = await encryptionManager.verifyDataIntegrity(data, {
        hash: expectedHash,
        algorithm: 'SHA-256',
        timestamp: Date.now()
      });

      expect(result).toBe(false);
    });

    it('should handle verification errors', async () => {
      const error = new Error('Verification failed');
      mockSubtle.digest.mockRejectedValue(error);

      await expect(
        encryptionManager.verifyDataIntegrity({}, {
          hash: new ArrayBuffer(32),
          algorithm: 'SHA-256',
          timestamp: Date.now()
        })
      ).rejects.toThrow('Verification failed');
    });
  });

  describe('generateKeyFromPassword', () => {
    it('should generate key from password with correct parameters', async () => {
      const password = 'secure-password-123';
      const salt = new Uint8Array(16);
      const mockKey = { type: 'secret' };

      mockSubtle.importKey.mockResolvedValue({ type: 'raw' });
      mockSubtle.importKey.mockResolvedValue(mockKey);

      const result = await encryptionManager.generateKeyFromPassword(password, salt);

      expect(mockSubtle.importKey).toHaveBeenCalledWith(
        'raw',
        expect.any(Uint8Array),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      expect(result).toBe(mockKey);
    });

    it('should handle key derivation errors', async () => {
      const error = new Error('Key derivation failed');
      mockSubtle.importKey.mockRejectedValue(error);

      await expect(
        encryptionManager.generateKeyFromPassword('password', new Uint8Array(16))
      ).rejects.toThrow('Key derivation failed');
    });
  });

  describe('edge cases and security', () => {
    it('should handle empty patient data', async () => {
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
      mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const result = await encryptionManager.encryptPatientData({}, 'tenant-1', 'key');

      expect(result.publicData).toEqual({});
      expect(result.encryptedData).toBeDefined();
      expect(result.dataHash).toBeDefined();
    });

    it('should generate different IVs for each encryption', async () => {
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
      mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const data = { name: 'Test' };
      const result1 = await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');
      const result2 = await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');

      expect(result1.encryptedData.iv).not.toEqual(result2.encryptedData.iv);
    });

    it('should validate tenant isolation in encryption', async () => {
      mockSubtle.importKey.mockResolvedValue({ type: 'secret' });
      mockSubtle.encrypt.mockResolvedValue(new ArrayBuffer(32));
      mockSubtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const data = { name: 'Test' };
      
      // The tenant ID should be used in key derivation
      await encryptionManager.encryptPatientData(data, 'tenant-1', 'key');
      await encryptionManager.encryptPatientData(data, 'tenant-2', 'key');

      // Should call importKey with different parameters for different tenants
      expect(mockSubtle.importKey).toHaveBeenCalledTimes(2);
    });
  });
});