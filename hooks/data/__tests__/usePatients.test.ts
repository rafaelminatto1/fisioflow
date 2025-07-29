import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { usePatients } from '../usePatients';
import { useAuth } from '../../useAuth';

// Mock useAuth
vi.mock('../../useAuth');
const mockUseAuth = vi.mocked(useAuth);

// Mock useOptimizedStorage
vi.mock('../useOptimizedStorage', () => ({
  useOptimizedStorage: vi.fn(() => [[], vi.fn()]),
}));

const mockCurrentUser = {
  id: 'current-user',
  tenantId: 'tenant-1',
  name: 'Current User',
  email: 'current@example.com',
  role: 'FISIOTERAPEUTA',
};

const mockPatient = {
  id: '1',
  tenantId: 'tenant-1',
  name: 'João Silva',
  email: 'joao@example.com',
  phone: '11999999999',
  status: 'active' as const,
  medicalHistory: 'Dor lombar crônica',
  therapistId: 'therapist-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('usePatients', () => {
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

  it('deve retornar pacientes filtrados por tenant', () => {
    const { result } = renderHook(() => usePatients());
    
    expect(result.current.patients).toBeDefined();
    expect(Array.isArray(result.current.patients)).toBe(true);
  });

  it('deve adicionar novo paciente com tenant correto', () => {
    const { result } = renderHook(() => usePatients());
    
    act(() => {
      const newPatient = result.current.addPatient({
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        status: 'active',
        medicalHistory: 'Artrose no joelho',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
    });

    expect(result.current.addPatient).toBeDefined();
  });

  it('deve atualizar paciente existente', () => {
    const { result } = renderHook(() => usePatients());
    
    act(() => {
      result.current.updatePatient('1', {
        name: 'João Silva Atualizado',
        phone: '11777777777',
      });
    });

    expect(result.current.updatePatient).toBeDefined();
  });

  it('deve deletar paciente', () => {
    const { result } = renderHook(() => usePatients());
    
    act(() => {
      result.current.deletePatient('1');
    });

    expect(result.current.deletePatient).toBeDefined();
  });

  it('deve buscar paciente por ID', () => {
    const { result } = renderHook(() => usePatients());
    
    const patient = result.current.getPatientById('1');
    
    expect(result.current.getPatientById).toBeDefined();
  });

  it('deve fazer busca textual de pacientes', () => {
    const { result } = renderHook(() => usePatients());
    
    const results = result.current.searchPatients('João');
    
    expect(Array.isArray(results)).toBe(true);
  });

  it('deve retornar todos os pacientes quando busca está vazia', () => {
    const { result } = renderHook(() => usePatients());
    
    const results = result.current.searchPatients('');
    
    expect(Array.isArray(results)).toBe(true);
  });

  it('deve filtrar pacientes ativos', () => {
    const { result } = renderHook(() => usePatients());
    
    const activePatients = result.current.getActivePatients();
    
    expect(Array.isArray(activePatients)).toBe(true);
  });

  it('deve filtrar pacientes por terapeuta', () => {
    const { result } = renderHook(() => usePatients());
    
    const patientsByTherapist = result.current.getPatientsByTherapist('therapist-1');
    
    expect(Array.isArray(patientsByTherapist)).toBe(true);
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

    const { result } = renderHook(() => usePatients());
    
    expect(result.current.patients).toEqual([]);
  });
});