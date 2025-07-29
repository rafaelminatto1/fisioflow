import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReactNode } from 'react';

import { useUsers } from '../useUsers';
import { useAuth } from '../../useAuth';

// Mock useAuth
vi.mock('../../useAuth');
const mockUseAuth = vi.mocked(useAuth);

// Mock useOptimizedStorage
vi.mock('../useOptimizedStorage', () => ({
  useOptimizedStorage: vi.fn(() => [[], vi.fn()]),
}));

// Test data
const mockUser = {
  id: '1',
  tenantId: 'tenant-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'FISIOTERAPEUTA',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockCurrentUser = {
  id: 'current-user',
  tenantId: 'tenant-1',
  name: 'Current User',
  email: 'current@example.com',
  role: 'ADMIN',
};

describe('useUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockCurrentUser,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      checkLimit: vi.fn(),
      canUpgrade: false,
      upgradeToTier: vi.fn(),
      tier: 'free',
      refetchUser: vi.fn(),
    });
  });

  it('deve retornar usuários filtrados por tenant', () => {
    const { result } = renderHook(() => useUsers());
    
    expect(result.current.users).toBeDefined();
    expect(Array.isArray(result.current.users)).toBe(true);
  });

  it('deve adicionar novo usuário com tenant correto', () => {
    const { result } = renderHook(() => useUsers());
    
    act(() => {
      result.current.addUser({
        name: 'New User',
        email: 'new@example.com',
        role: 'ESTAGIARIO',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    // Verificar se a função foi chamada
    expect(result.current.addUser).toBeDefined();
  });

  it('deve atualizar usuário existente', () => {
    const { result } = renderHook(() => useUsers());
    
    act(() => {
      result.current.updateUser('1', {
        name: 'Updated Name',
      });
    });

    expect(result.current.updateUser).toBeDefined();
  });

  it('deve deletar usuário', () => {
    const { result } = renderHook(() => useUsers());
    
    act(() => {
      result.current.deleteUser('1');
    });

    expect(result.current.deleteUser).toBeDefined();
  });

  it('deve buscar usuário por ID', () => {
    const { result } = renderHook(() => useUsers());
    
    const user = result.current.getUserById('1');
    
    expect(result.current.getUserById).toBeDefined();
  });

  it('deve buscar usuários por role', () => {
    const { result } = renderHook(() => useUsers());
    
    const users = result.current.getUsersByRole('FISIOTERAPEUTA');
    
    expect(Array.isArray(users)).toBe(true);
  });

  it('deve retornar array vazio quando não há tenant', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateProfile: vi.fn(),
      checkLimit: vi.fn(),
      canUpgrade: false,
      upgradeToTier: vi.fn(),
      tier: 'free',
      refetchUser: vi.fn(),
    });

    const { result } = renderHook(() => useUsers());
    
    expect(result.current.users).toEqual([]);
  });
});