import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureStorageManager } from '../secureStorage';

// Mock IDB
const mockDB = {
  transaction: vi.fn(),
  close: vi.fn(),
};

const mockTransaction = {
  objectStore: vi.fn(),
  oncomplete: null,
  onerror: null,
};

const mockObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  count: vi.fn(),
  clear: vi.fn(),
};

const mockRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

// Mock IndexedDB
Object.defineProperty(global, 'indexedDB', {
  value: {
    open: vi.fn().mockImplementation(() => {
      const request = { ...mockRequest };
      setTimeout(() => {
        request.result = mockDB;
        if (request.onsuccess) request.onsuccess({ target: { result: mockDB } });
      }, 0);
      return request;
    }),
    deleteDatabase: vi.fn(),
  },
  writable: true,
});

describe('SecureStorageManager', () => {
  let secureStorage: SecureStorageManager;

  beforeEach(() => {
    vi.clearAllMocks();
    secureStorage = new SecureStorageManager();
    
    // Reset mock implementations
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.add.mockReturnValue({ ...mockRequest });
    mockObjectStore.put.mockReturnValue({ ...mockRequest });
    mockObjectStore.get.mockReturnValue({ ...mockRequest });
    mockObjectStore.delete.mockReturnValue({ ...mockRequest });
    mockObjectStore.getAll.mockReturnValue({ ...mockRequest });
    mockObjectStore.count.mockReturnValue({ ...mockRequest });
    mockObjectStore.clear.mockReturnValue({ ...mockRequest });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize database with correct configuration', async () => {
      const openSpy = jest.spyOn(global.indexedDB, 'open');
      
      await secureStorage.initDB();

      expect(openSpy).toHaveBeenCalledWith('FisioFlowSecure', 1);
    });

    it('should handle database initialization errors', async () => {
      const error = new Error('DB initialization failed');
      jest.spyOn(global.indexedDB, 'open').mockImplementation(() => {
        const request = { ...mockRequest };
        setTimeout(() => {
          request.error = error;
          if (request.onerror) request.onerror({ target: { error } });
        }, 0);
        return request;
      });

      await expect(secureStorage.initDB()).rejects.toThrow('DB initialization failed');
    });
  });

  describe('storePatient', () => {
    const samplePatient = {
      id: '1',
      name: 'João Silva',
      cpf: '123.456.789-00',
      email: 'joao@email.com',
      tenantId: 'tenant-1'
    };

    it('should store patient data in IndexedDB', async () => {
      const mockPutRequest = { ...mockRequest };
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = secureStorage.storePatient(samplePatient, 'tenant-1');
      
      // Simulate successful storage
      setTimeout(() => {
        mockPutRequest.result = 'success';
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await expect(storePromise).resolves.toBeUndefined();
      expect(mockDB.transaction).toHaveBeenCalledWith(['patients'], 'readwrite');
      expect(mockObjectStore.put).toHaveBeenCalledWith({
        ...samplePatient,
        storageType: 'indexedDB',
        tenantId: 'tenant-1',
        lastModified: expect.any(Number)
      });
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage failed');
      const mockPutRequest = { ...mockRequest };
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = secureStorage.storePatient(samplePatient, 'tenant-1');
      
      // Simulate storage error
      setTimeout(() => {
        mockPutRequest.error = error;
        if (mockPutRequest.onerror) mockPutRequest.onerror({ target: { error } });
      }, 0);

      await expect(storePromise).rejects.toThrow('Storage failed');
    });

    it('should validate tenant isolation', async () => {
      const mockPutRequest = { ...mockRequest };
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const storePromise = secureStorage.storePatient(samplePatient, 'tenant-2');
      
      setTimeout(() => {
        mockPutRequest.result = 'success';
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await expect(storePromise).resolves.toBeUndefined();
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-2'
        })
      );
    });
  });

  describe('getPatient', () => {
    it('should retrieve patient data from IndexedDB', async () => {
      const samplePatient = {
        id: '1',
        name: 'João Silva',
        tenantId: 'tenant-1',
        storageType: 'indexedDB'
      };

      const mockGetRequest = { ...mockRequest };
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const getPromise = secureStorage.getPatient('1', 'tenant-1');
      
      // Simulate successful retrieval
      setTimeout(() => {
        mockGetRequest.result = samplePatient;
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: { result: samplePatient } });
      }, 0);

      const result = await getPromise;
      expect(result).toEqual(samplePatient);
      expect(mockDB.transaction).toHaveBeenCalledWith(['patients'], 'readonly');
      expect(mockObjectStore.get).toHaveBeenCalledWith('1');
    });

    it('should return null for non-existent patient', async () => {
      const mockGetRequest = { ...mockRequest };
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const getPromise = secureStorage.getPatient('999', 'tenant-1');
      
      // Simulate not found
      setTimeout(() => {
        mockGetRequest.result = undefined;
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: { result: undefined } });
      }, 0);

      const result = await getPromise;
      expect(result).toBeNull();
    });

    it('should validate tenant access', async () => {
      const samplePatient = {
        id: '1',
        name: 'João Silva',
        tenantId: 'tenant-1',
        storageType: 'indexedDB'
      };

      const mockGetRequest = { ...mockRequest };
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const getPromise = secureStorage.getPatient('1', 'tenant-2');
      
      setTimeout(() => {
        mockGetRequest.result = samplePatient;
        if (mockGetRequest.onsuccess) mockGetRequest.onsuccess({ target: { result: samplePatient } });
      }, 0);

      // Should return null because tenant doesn't match
      const result = await getPromise;
      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      const error = new Error('Retrieval failed');
      const mockGetRequest = { ...mockRequest };
      mockObjectStore.get.mockReturnValue(mockGetRequest);

      const getPromise = secureStorage.getPatient('1', 'tenant-1');
      
      setTimeout(() => {
        mockGetRequest.error = error;
        if (mockGetRequest.onerror) mockGetRequest.onerror({ target: { error } });
      }, 0);

      await expect(getPromise).rejects.toThrow('Retrieval failed');
    });
  });

  describe('getAllPatients', () => {
    it('should retrieve all patients for a tenant', async () => {
      const samplePatients = [
        { id: '1', name: 'João Silva', tenantId: 'tenant-1' },
        { id: '2', name: 'Maria Santos', tenantId: 'tenant-1' },
        { id: '3', name: 'Pedro Costa', tenantId: 'tenant-2' } // Different tenant
      ];

      const mockGetAllRequest = { ...mockRequest };
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const getAllPromise = secureStorage.getAllPatients('tenant-1');
      
      setTimeout(() => {
        mockGetAllRequest.result = samplePatients;
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ target: { result: samplePatients } });
      }, 0);

      const result = await getAllPromise;
      // Should only return patients for tenant-1
      expect(result).toHaveLength(2);
      expect(result.every(p => p.tenantId === 'tenant-1')).toBe(true);
    });

    it('should return empty array when no patients exist', async () => {
      const mockGetAllRequest = { ...mockRequest };
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const getAllPromise = secureStorage.getAllPatients('tenant-1');
      
      setTimeout(() => {
        mockGetAllRequest.result = [];
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ target: { result: [] } });
      }, 0);

      const result = await getAllPromise;
      expect(result).toEqual([]);
    });
  });

  describe('deletePatient', () => {
    it('should delete patient data', async () => {
      const mockDeleteRequest = { ...mockRequest };
      mockObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const deletePromise = secureStorage.deletePatient('1', 'tenant-1');
      
      setTimeout(() => {
        mockDeleteRequest.result = undefined;
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess({ target: { result: undefined } });
      }, 0);

      await expect(deletePromise).resolves.toBeUndefined();
      expect(mockDB.transaction).toHaveBeenCalledWith(['patients'], 'readwrite');
      expect(mockObjectStore.delete).toHaveBeenCalledWith('1');
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Deletion failed');
      const mockDeleteRequest = { ...mockRequest };
      mockObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const deletePromise = secureStorage.deletePatient('1', 'tenant-1');
      
      setTimeout(() => {
        mockDeleteRequest.error = error;
        if (mockDeleteRequest.onerror) mockDeleteRequest.onerror({ target: { error } });
      }, 0);

      await expect(deletePromise).rejects.toThrow('Deletion failed');
    });
  });

  describe('storage strategy', () => {
    it('should use IndexedDB for sensitive data types', () => {
      expect(secureStorage.shouldUseIndexedDB('patients')).toBe(true);
      expect(secureStorage.shouldUseIndexedDB('assessments')).toBe(true);
      expect(secureStorage.shouldUseIndexedDB('documents')).toBe(true);
      expect(secureStorage.shouldUseIndexedDB('exerciseLogs')).toBe(true);
    });

    it('should use localStorage for non-sensitive data types', () => {
      expect(secureStorage.shouldUseIndexedDB('userPreferences')).toBe(false);
      expect(secureStorage.shouldUseIndexedDB('appSettings')).toBe(false);
    });

    it('should use sessionStorage for temporary data types', () => {
      expect(secureStorage.shouldUseSessionStorage('searchResults')).toBe(true);
      expect(secureStorage.shouldUseSessionStorage('tempForms')).toBe(true);
    });
  });

  describe('performance and cleanup', () => {
    it('should cleanup old data based on retention policy', async () => {
      const mockClearRequest = { ...mockRequest };
      mockObjectStore.clear.mockReturnValue(mockClearRequest);

      const cleanupPromise = secureStorage.cleanupOldData('tenant-1', 30); // 30 days
      
      setTimeout(() => {
        mockClearRequest.result = undefined;
        if (mockClearRequest.onsuccess) mockClearRequest.onsuccess({ target: { result: undefined } });
      }, 0);

      await expect(cleanupPromise).resolves.toBeUndefined();
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        name: `Patient ${i}`,
        tenantId: 'tenant-1'
      }));

      const mockGetAllRequest = { ...mockRequest };
      mockObjectStore.getAll.mockReturnValue(mockGetAllRequest);

      const getAllPromise = secureStorage.getAllPatients('tenant-1');
      
      setTimeout(() => {
        mockGetAllRequest.result = largeDataset;
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ target: { result: largeDataset } });
      }, 0);

      const result = await getAllPromise;
      expect(result).toHaveLength(1000);
    });

    it('should provide storage usage statistics', async () => {
      const mockCountRequest = { ...mockRequest };
      mockObjectStore.count.mockReturnValue(mockCountRequest);

      const statsPromise = secureStorage.getStorageStats('tenant-1');
      
      setTimeout(() => {
        mockCountRequest.result = 150;
        if (mockCountRequest.onsuccess) mockCountRequest.onsuccess({ target: { result: 150 } });
      }, 0);

      const stats = await statsPromise;
      expect(stats).toHaveProperty('patientCount');
      expect(stats.patientCount).toBe(150);
    });
  });

  describe('data migration', () => {
    it('should migrate data from localStorage to IndexedDB', async () => {
      // Mock localStorage with legacy data
      const legacyData = {
        'patients_tenant-1': JSON.stringify([
          { id: '1', name: 'João Silva', tenantId: 'tenant-1' }
        ])
      };

      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn((key) => legacyData[key] || null),
          removeItem: vi.fn(),
          setItem: vi.fn(),
          clear: vi.fn(),
        },
        writable: true,
      });

      const mockPutRequest = { ...mockRequest };
      mockObjectStore.put.mockReturnValue(mockPutRequest);

      const migrationPromise = secureStorage.migrateFromLocalStorage('tenant-1');
      
      setTimeout(() => {
        mockPutRequest.result = 'success';
        if (mockPutRequest.onsuccess) mockPutRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await expect(migrationPromise).resolves.toBeUndefined();
      expect(global.localStorage.getItem).toHaveBeenCalledWith('patients_tenant-1');
      expect(global.localStorage.removeItem).toHaveBeenCalledWith('patients_tenant-1');
    });
  });
});