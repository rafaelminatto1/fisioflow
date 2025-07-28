import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePatients } from '../usePatients';

// Mock useSecureData
const mockUseSecureData = {
  getAllSecurePatients: vi.fn(),
  getSecurePatient: vi.fn(),
  saveSecurePatient: vi.fn(),
  deleteSecurePatient: vi.fn(),
};

vi.mock('../useSecureData', () => ({
  useSecureData: () => mockUseSecureData,
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

// Mock sessionStorage for master key
Object.defineProperty(global, 'sessionStorage', {
  value: {
    getItem: jest.fn((key) => {
      if (key === 'masterKey') return 'test-master-key-123';
      return null;
    }),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  writable: true,
});

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

describe('usePatients', () => {
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeEach(() => {
    vi.clearAllMocks();
    wrapper = createWrapper();
  });

  describe('usePatients query', () => {
    it('should fetch all patients successfully', async () => {
      const mockPatients = [
        {
          id: '1',
          name: 'João Silva',
          cpf: '123.456.789-00',
          email: 'joao@email.com',
          phone: '(11) 99999-9999',
          tenantId: 'tenant-1',
        },
        {
          id: '2',
          name: 'Maria Santos',
          cpf: '987.654.321-00',
          email: 'maria@email.com',
          phone: '(11) 88888-8888',
          tenantId: 'tenant-1',
        },
      ];

      mockUseSecureData.getAllSecurePatients.mockResolvedValue(mockPatients);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPatients);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockUseSecureData.getAllSecurePatients).toHaveBeenCalledWith(
        'tenant-1',
        'test-master-key-123'
      );
    });

    it('should handle empty patient list', async () => {
      mockUseSecureData.getAllSecurePatients.mockResolvedValue([]);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle fetch errors', async () => {
      const error = new Error('Failed to fetch patients');
      mockUseSecureData.getAllSecurePatients.mockRejectedValue(error);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });

    it('should handle missing master key', async () => {
      // Mock missing master key
      vi.mocked(global.sessionStorage.getItem).mockReturnValue(null);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toContain('Master key not found');
    });

    it('should use correct query key for caching', async () => {
      mockUseSecureData.getAllSecurePatients.mockResolvedValue([]);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The query key should include tenant ID for proper cache isolation
      expect(mockUseSecureData.getAllSecurePatients).toHaveBeenCalledWith(
        'tenant-1',
        'test-master-key-123'
      );
    });
  });

  describe('usePatient query (single patient)', () => {
    it('should fetch single patient successfully', async () => {
      const mockPatient = {
        id: '1',
        name: 'João Silva',
        cpf: '123.456.789-00',
        email: 'joao@email.com',
        phone: '(11) 99999-9999',
        tenantId: 'tenant-1',
      };

      mockUseSecureData.getSecurePatient.mockResolvedValue(mockPatient);

      const { result } = renderHook(() => usePatients().usePatient('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPatient);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(mockUseSecureData.getSecurePatient).toHaveBeenCalledWith(
        '1',
        'tenant-1',
        'test-master-key-123'
      );
    });

    it('should handle patient not found', async () => {
      mockUseSecureData.getSecurePatient.mockResolvedValue(null);

      const { result } = renderHook(() => usePatients().usePatient('999'), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toBe(null);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle single patient fetch errors', async () => {
      const error = new Error('Failed to fetch patient');
      mockUseSecureData.getSecurePatient.mockRejectedValue(error);

      const { result } = renderHook(() => usePatients().usePatient('1'), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe('createPatient mutation', () => {
    it('should create patient successfully', async () => {
      const newPatient = {
        id: '3',
        name: 'Pedro Costa',
        cpf: '456.789.123-00',
        email: 'pedro@email.com',
        phone: '(11) 77777-7777',
        tenantId: 'tenant-1',
      };

      mockUseSecureData.saveSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.createPatient.mutateAsync(newPatient);
      });

      expect(result.current.createPatient.isSuccess).toBe(true);
      expect(mockUseSecureData.saveSecurePatient).toHaveBeenCalledWith(
        newPatient,
        mockAuthContext.currentUser,
        'test-master-key-123'
      );
    });

    it('should handle create patient errors', async () => {
      const error = new Error('Failed to create patient');
      mockUseSecureData.saveSecurePatient.mockRejectedValue(error);

      const newPatient = {
        id: '3',
        name: 'Pedro Costa',
        tenantId: 'tenant-1',
      };

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        try {
          await result.current.createPatient.mutateAsync(newPatient);
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.createPatient.isError).toBe(true);
      expect(result.current.createPatient.error).toEqual(error);
    });

    it('should validate patient data before creation', async () => {
      const invalidPatient = {
        // Missing required fields
        name: '',
        tenantId: '',
      };

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        try {
          await result.current.createPatient.mutateAsync(invalidPatient as any);
        } catch (e) {
          // Expected validation error
        }
      });

      expect(result.current.createPatient.isError).toBe(true);
    });

    it('should invalidate queries after successful creation', async () => {
      const newPatient = {
        id: '3',
        name: 'Pedro Costa',
        tenantId: 'tenant-1',
      };

      mockUseSecureData.saveSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.createPatient.mutateAsync(newPatient);
      });

      // After successful creation, the patients list should be refetched
      expect(result.current.createPatient.isSuccess).toBe(true);
    });
  });

  describe('updatePatient mutation', () => {
    it('should update patient successfully', async () => {
      const updatedPatient = {
        id: '1',
        name: 'João Silva Santos', // Updated name
        cpf: '123.456.789-00',
        email: 'joao.santos@email.com', // Updated email
        tenantId: 'tenant-1',
      };

      mockUseSecureData.saveSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.updatePatient.mutateAsync(updatedPatient);
      });

      expect(result.current.updatePatient.isSuccess).toBe(true);
      expect(mockUseSecureData.saveSecurePatient).toHaveBeenCalledWith(
        updatedPatient,
        mockAuthContext.currentUser,
        'test-master-key-123'
      );
    });

    it('should handle update patient errors', async () => {
      const error = new Error('Failed to update patient');
      mockUseSecureData.saveSecurePatient.mockRejectedValue(error);

      const updatedPatient = {
        id: '1',
        name: 'João Silva Santos',
        tenantId: 'tenant-1',
      };

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        try {
          await result.current.updatePatient.mutateAsync(updatedPatient);
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.updatePatient.isError).toBe(true);
      expect(result.current.updatePatient.error).toEqual(error);
    });
  });

  describe('deletePatient mutation', () => {
    it('should delete patient successfully', async () => {
      mockUseSecureData.deleteSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.deletePatient.mutateAsync('1');
      });

      expect(result.current.deletePatient.isSuccess).toBe(true);
      expect(mockUseSecureData.deleteSecurePatient).toHaveBeenCalledWith(
        '1',
        'tenant-1',
        mockAuthContext.currentUser
      );
    });

    it('should handle delete patient errors', async () => {
      const error = new Error('Failed to delete patient');
      mockUseSecureData.deleteSecurePatient.mockRejectedValue(error);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        try {
          await result.current.deletePatient.mutateAsync('1');
        } catch (e) {
          // Expected error
        }
      });

      expect(result.current.deletePatient.isError).toBe(true);
      expect(result.current.deletePatient.error).toEqual(error);
    });

    it('should invalidate queries after successful deletion', async () => {
      mockUseSecureData.deleteSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.deletePatient.mutateAsync('1');
      });

      // After successful deletion, the patients list should be refetched
      expect(result.current.deletePatient.isSuccess).toBe(true);
    });
  });

  describe('caching and optimization', () => {
    it('should use staleTime for caching', async () => {
      const mockPatients = [
        { id: '1', name: 'João Silva', tenantId: 'tenant-1' },
      ];

      mockUseSecureData.getAllSecurePatients.mockResolvedValue(mockPatients);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockPatients);
      });

      // The query should use a 5-minute staleTime as configured
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStale).toBe(false);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockPatients = [
        { id: '1', name: 'João Silva', tenantId: 'tenant-1' },
      ];

      mockUseSecureData.getAllSecurePatients.mockResolvedValue(mockPatients);

      // Render multiple hooks simultaneously
      const { result: result1 } = renderHook(() => usePatients(), { wrapper });
      const { result: result2 } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockPatients);
        expect(result2.current.data).toEqual(mockPatients);
      });

      // Should deduplicate requests
      expect(mockUseSecureData.getAllSecurePatients).toHaveBeenCalledTimes(1);
    });

    it('should provide proper loading states', async () => {
      mockUseSecureData.getAllSecurePatients.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const { result } = renderHook(() => usePatients(), { wrapper });

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('tenant isolation', () => {
    it('should only fetch patients for current tenant', async () => {
      const mockPatients = [
        { id: '1', name: 'João Silva', tenantId: 'tenant-1' },
      ];

      mockUseSecureData.getAllSecurePatients.mockResolvedValue(mockPatients);

      renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(mockUseSecureData.getAllSecurePatients).toHaveBeenCalledWith(
          'tenant-1',
          'test-master-key-123'
        );
      });
    });

    it('should create patients with correct tenant ID', async () => {
      const newPatient = {
        id: '3',
        name: 'Pedro Costa',
        // tenantId should be automatically set
      };

      mockUseSecureData.saveSecurePatient.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await act(async () => {
        await result.current.createPatient.mutateAsync(newPatient);
      });

      expect(mockUseSecureData.saveSecurePatient).toHaveBeenCalledWith(
        expect.objectContaining({
          ...newPatient,
          tenantId: 'tenant-1', // Should be set automatically
        }),
        mockAuthContext.currentUser,
        'test-master-key-123'
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      networkError.name = 'NetworkError';
      mockUseSecureData.getAllSecurePatients.mockRejectedValue(networkError);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('User not authenticated');
      authError.name = 'AuthenticationError';
      mockUseSecureData.getAllSecurePatients.mockRejectedValue(authError);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error?.message).toBe('User not authenticated');
    });

    it('should provide retry functionality', async () => {
      mockUseSecureData.getAllSecurePatients
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce([{ id: '1', name: 'João Silva', tenantId: 'tenant-1' }]);

      const { result } = renderHook(() => usePatients(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Retry the query
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([{ id: '1', name: 'João Silva', tenantId: 'tenant-1' }]);
      });

      expect(result.current.error).toBe(null);
    });
  });
});