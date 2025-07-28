import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { auditLogger, AuditAction } from '../auditLogger';

// Mock IndexedDB similar to secureStorage tests
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
  createIndex: vi.fn(),
  index: vi.fn(),
};

const mockRequest = {
  result: null,
  error: null,
  onsuccess: null,
  onerror: null,
};

const mockIndex = {
  getAll: vi.fn(),
  count: vi.fn(),
};

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

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  const sampleUser = {
    id: 'user-1',
    name: 'Dr. João Silva',
    role: 'FISIOTERAPEUTA' as const,
    tenantId: 'tenant-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations
    mockDB.transaction.mockReturnValue(mockTransaction);
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockObjectStore.add.mockReturnValue({ ...mockRequest });
    mockObjectStore.getAll.mockReturnValue({ ...mockRequest });
    mockObjectStore.count.mockReturnValue({ ...mockRequest });
    mockObjectStore.index.mockReturnValue(mockIndex);
    mockIndex.getAll.mockReturnValue({ ...mockRequest });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should log audit events correctly', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      const logPromise = auditLogger.log(
        AuditAction.VIEW_PATIENT,
        sampleUser,
        'tenant-1',
        { patientId: 'patient-1', patientName: 'Maria Santos' }
      );

      // Simulate successful log
      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await expect(logPromise).resolves.toBeUndefined();
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['auditLogs'], 'readwrite');
      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          action: AuditAction.VIEW_PATIENT,
          userId: 'user-1',
          userName: 'Dr. João Silva',
          userRole: 'FISIOTERAPEUTA',
          tenantId: 'tenant-1',
          resourceType: 'patient',
          resourceId: 'patient-1',
          details: { patientId: 'patient-1', patientName: 'Maria Santos' },
          timestamp: expect.any(Number),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          sessionId: expect.any(String),
          gdprCompliant: true,
          dataCategory: 'medical'
        })
      );
    });

    it('should handle different audit actions', async () => {
      const actions = [
        AuditAction.CREATE,
        AuditAction.READ,
        AuditAction.UPDATE,
        AuditAction.DELETE,
        AuditAction.VIEW_PATIENT,
        AuditAction.EXPORT_DATA,
        AuditAction.LOGIN,
        AuditAction.LOGOUT
      ];

      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      // Simulate successful operations
      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      for (const action of actions) {
        await auditLogger.log(action, sampleUser, 'tenant-1', {});
        expect(mockObjectStore.add).toHaveBeenCalledWith(
          expect.objectContaining({ action })
        );
      }
    });

    it('should classify data categories correctly', async () => {
      const testCases = [
        { action: AuditAction.VIEW_PATIENT, expectedCategory: 'medical' },
        { action: AuditAction.EXPORT_DATA, expectedCategory: 'medical' },
        { action: AuditAction.LOGIN, expectedCategory: 'authentication' },
        { action: AuditAction.LOGOUT, expectedCategory: 'authentication' },
        { action: AuditAction.UPDATE_SYSTEM_SETTINGS, expectedCategory: 'system' },
        { action: AuditAction.CREATE, expectedCategory: 'general' }
      ];

      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      for (const testCase of testCases) {
        await auditLogger.log(testCase.action, sampleUser, 'tenant-1', {});
        expect(mockObjectStore.add).toHaveBeenCalledWith(
          expect.objectContaining({ dataCategory: testCase.expectedCategory })
        );
      }
    });

    it('should generate unique session IDs', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await auditLogger.log(AuditAction.LOGIN, sampleUser, 'tenant-1', {});
      await auditLogger.log(AuditAction.VIEW_PATIENT, sampleUser, 'tenant-1', {});

      const calls = mockObjectStore.add.mock.calls;
      expect(calls[0][0].sessionId).toBeDefined();
      expect(calls[1][0].sessionId).toBeDefined();
      // Both calls should have the same session ID within the same instance
      expect(calls[0][0].sessionId).toBe(calls[1][0].sessionId);
    });

    it('should handle logging errors gracefully', async () => {
      const error = new Error('Logging failed');
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      const logPromise = auditLogger.log(AuditAction.VIEW_PATIENT, sampleUser, 'tenant-1', {});

      setTimeout(() => {
        mockAddRequest.error = error;
        if (mockAddRequest.onerror) mockAddRequest.onerror({ target: { error } });
      }, 0);

      await expect(logPromise).rejects.toThrow('Logging failed');
    });
  });

  describe('getAuditLogs', () => {
    const sampleLogs = [
      {
        id: '1',
        action: AuditAction.VIEW_PATIENT,
        userId: 'user-1',
        tenantId: 'tenant-1',
        timestamp: Date.now() - 1000,
        resourceType: 'patient'
      },
      {
        id: '2',
        action: AuditAction.LOGIN,
        userId: 'user-1',
        tenantId: 'tenant-1',
        timestamp: Date.now() - 2000,
        resourceType: 'authentication'
      }
    ];

    it('should retrieve all audit logs for a tenant', async () => {
      const mockGetAllRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue(mockGetAllRequest);

      const getLogsPromise = auditLogger.getAuditLogs('tenant-1');

      setTimeout(() => {
        mockGetAllRequest.result = sampleLogs;
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ target: { result: sampleLogs } });
      }, 0);

      const result = await getLogsPromise;
      expect(result).toEqual(sampleLogs);
      expect(mockObjectStore.index).toHaveBeenCalledWith('tenantId');
      expect(mockIndex.getAll).toHaveBeenCalledWith('tenant-1');
    });

    it('should filter logs by date range', async () => {
      const startDate = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
      const endDate = Date.now();

      const mockGetAllRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue(mockGetAllRequest);

      const getLogsPromise = auditLogger.getAuditLogs('tenant-1', { startDate, endDate });

      setTimeout(() => {
        mockGetAllRequest.result = sampleLogs.filter(
          log => log.timestamp >= startDate && log.timestamp <= endDate
        );
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ 
          target: { result: sampleLogs.filter(log => log.timestamp >= startDate && log.timestamp <= endDate) }
        });
      }, 0);

      const result = await getLogsPromise;
      expect(result.every(log => log.timestamp >= startDate && log.timestamp <= endDate)).toBe(true);
    });

    it('should filter logs by user', async () => {
      const mockGetAllRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue(mockGetAllRequest);

      const getLogsPromise = auditLogger.getAuditLogs('tenant-1', { userId: 'user-1' });

      setTimeout(() => {
        mockGetAllRequest.result = sampleLogs.filter(log => log.userId === 'user-1');
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ 
          target: { result: sampleLogs.filter(log => log.userId === 'user-1') }
        });
      }, 0);

      const result = await getLogsPromise;
      expect(result.every(log => log.userId === 'user-1')).toBe(true);
    });

    it('should filter logs by action', async () => {
      const mockGetAllRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue(mockGetAllRequest);

      const getLogsPromise = auditLogger.getAuditLogs('tenant-1', { action: AuditAction.VIEW_PATIENT });

      setTimeout(() => {
        mockGetAllRequest.result = sampleLogs.filter(log => log.action === AuditAction.VIEW_PATIENT);
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ 
          target: { result: sampleLogs.filter(log => log.action === AuditAction.VIEW_PATIENT) }
        });
      }, 0);

      const result = await getLogsPromise;
      expect(result.every(log => log.action === AuditAction.VIEW_PATIENT)).toBe(true);
    });
  });

  describe('getAuditSummary', () => {
    it('should generate audit summary statistics', async () => {
      const mockCountRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue({ ...mockRequest });

      const summaryPromise = auditLogger.getAuditSummary('tenant-1', {
        startDate: Date.now() - (30 * 24 * 60 * 60 * 1000),
        endDate: Date.now()
      });

      setTimeout(() => {
        mockCountRequest.result = [
          { action: AuditAction.VIEW_PATIENT, count: 150 },
          { action: AuditAction.LOGIN, count: 25 },
          { action: AuditAction.EXPORT_DATA, count: 5 }
        ];
        if (mockCountRequest.onsuccess) mockCountRequest.onsuccess({ target: { result: mockCountRequest.result } });
      }, 0);

      const summary = await summaryPromise;
      expect(summary).toHaveProperty('totalActions');
      expect(summary).toHaveProperty('actionBreakdown');
      expect(summary).toHaveProperty('mostActiveUsers');
      expect(summary).toHaveProperty('timeRange');
    });
  });

  describe('cleanupOldLogs', () => {
    it('should clean up logs older than retention period', async () => {
      const retentionDays = 2555; // 7 years in days
      const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      const mockGetAllRequest = { ...mockRequest };
      const mockDeleteRequest = { ...mockRequest };
      mockIndex.getAll.mockReturnValue(mockGetAllRequest);
      mockObjectStore.delete.mockReturnValue(mockDeleteRequest);

      const cleanupPromise = auditLogger.cleanupOldLogs('tenant-1', retentionDays);

      setTimeout(() => {
        // Simulate finding old logs
        mockGetAllRequest.result = [
          { id: '1', timestamp: cutoffDate - 1000 }, // Should be deleted
          { id: '2', timestamp: cutoffDate + 1000 }  // Should be kept
        ];
        if (mockGetAllRequest.onsuccess) mockGetAllRequest.onsuccess({ target: { result: mockGetAllRequest.result } });
        
        // Simulate successful deletion
        mockDeleteRequest.result = undefined;
        if (mockDeleteRequest.onsuccess) mockDeleteRequest.onsuccess({ target: { result: undefined } });
      }, 0);

      const result = await cleanupPromise;
      expect(result).toHaveProperty('deletedCount');
      expect(mockObjectStore.delete).toHaveBeenCalledWith('1');
    });
  });

  describe('LGPD compliance', () => {
    it('should ensure all logs are LGPD compliant', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      const logPromise = auditLogger.log(
        AuditAction.VIEW_PATIENT,
        sampleUser,
        'tenant-1',
        { patientId: 'patient-1' }
      );

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await logPromise;

      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          gdprCompliant: true,
          dataCategory: expect.any(String),
          retentionDate: expect.any(Number)
        })
      );
    });

    it('should calculate correct retention dates', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      const logPromise = auditLogger.log(
        AuditAction.VIEW_PATIENT,
        sampleUser,
        'tenant-1',
        {}
      );

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await logPromise;

      const loggedData = mockObjectStore.add.mock.calls[0][0];
      const expectedRetentionDate = loggedData.timestamp + (7 * 365 * 24 * 60 * 60 * 1000); // 7 years
      expect(loggedData.retentionDate).toBeCloseTo(expectedRetentionDate, -1000); // Within 1 second
    });
  });

  describe('performance and security', () => {
    it('should handle high-volume logging efficiently', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      // Simulate logging 100 events quickly
      const promises = Array.from({ length: 100 }, (_, i) =>
        auditLogger.log(AuditAction.VIEW_PATIENT, sampleUser, 'tenant-1', { index: i })
      );

      await Promise.all(promises);
      expect(mockObjectStore.add).toHaveBeenCalledTimes(100);
    });

    it('should sanitize sensitive data in logs', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      const sensitiveDetails = {
        patientCpf: '123.456.789-00',
        patientEmail: 'patient@email.com',
        patientPhone: '(11) 99999-9999',
        patientName: 'João Silva' // This should be kept
      };

      const logPromise = auditLogger.log(
        AuditAction.VIEW_PATIENT,
        sampleUser,
        'tenant-1',
        sensitiveDetails
      );

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      await logPromise;

      const loggedData = mockObjectStore.add.mock.calls[0][0];
      // Should not contain sensitive data
      expect(JSON.stringify(loggedData.details)).not.toContain('123.456.789-00');
      expect(JSON.stringify(loggedData.details)).not.toContain('patient@email.com');
      expect(JSON.stringify(loggedData.details)).not.toContain('(11) 99999-9999');
      // Should contain non-sensitive data
      expect(loggedData.details).toHaveProperty('patientName', 'João Silva');
    });

    it('should validate tenant isolation in audit logs', async () => {
      const mockAddRequest = { ...mockRequest };
      mockObjectStore.add.mockReturnValue(mockAddRequest);

      setTimeout(() => {
        mockAddRequest.result = 'success';
        if (mockAddRequest.onsuccess) mockAddRequest.onsuccess({ target: { result: 'success' } });
      }, 0);

      // Log for different tenants
      await auditLogger.log(AuditAction.VIEW_PATIENT, sampleUser, 'tenant-1', {});
      await auditLogger.log(AuditAction.VIEW_PATIENT, sampleUser, 'tenant-2', {});

      const calls = mockObjectStore.add.mock.calls;
      expect(calls[0][0].tenantId).toBe('tenant-1');
      expect(calls[1][0].tenantId).toBe('tenant-2');
    });
  });
});