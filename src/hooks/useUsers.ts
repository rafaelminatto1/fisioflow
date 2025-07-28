import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

import { User } from '../../types';

// Simulação de API - substituir por chamadas reais
const usersApi = {
  getAll: async (): Promise<User[]> => {
    // Simular delay de rede
    await new Promise((resolve) => setTimeout(resolve, 100));

    const stored = localStorage.getItem('fisioflow_users');
    return stored ? JSON.parse(stored) : [];
  },

  getById: async (userId: string): Promise<User | null> => {
    const users = await usersApi.getAll();
    return users.find((user) => user.id === userId) || null;
  },

  save: async (
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = localStorage.getItem('fisioflow_users');
    const users: User[] = stored ? JSON.parse(stored) : [];

    const now = new Date().toISOString();
    const savedUser: User = {
      ...user,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    users.push(savedUser);
    localStorage.setItem('fisioflow_users', JSON.stringify(users));
    return savedUser;
  },

  update: async (userId: string, updates: Partial<User>): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = localStorage.getItem('fisioflow_users');
    const users: User[] = stored ? JSON.parse(stored) : [];

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) {
      throw new Error('Usuário não encontrado');
    }

    const updatedUser = {
      ...users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updatedUser;
    localStorage.setItem('fisioflow_users', JSON.stringify(users));
    return updatedUser;
  },

  delete: async (userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 150));

    const stored = localStorage.getItem('fisioflow_users');
    const users: User[] = stored ? JSON.parse(stored) : [];

    const filtered = users.filter((u) => u.id !== userId);
    localStorage.setItem('fisioflow_users', JSON.stringify(filtered));
  },

  getByRole: async (role: string): Promise<User[]> => {
    const all = await usersApi.getAll();
    return all.filter((user) => user.role === role);
  },

  getByStatus: async (status: string): Promise<User[]> => {
    const all = await usersApi.getAll();
    return all.filter((user) => user.status === status);
  },

  search: async (query: string): Promise<User[]> => {
    const all = await usersApi.getAll();
    const searchTerm = query.toLowerCase();
    return all.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.phone && user.phone.includes(searchTerm))
    );
  },
};

export interface UseUsersReturn {
  // Data
  users: User[];
  loading: boolean;
  error: Error | null;

  // Actions
  createUser: (
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<User>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;

  // Queries
  getUserById: (userId: string) => User | undefined;
  getUsersByRole: (role: string) => User[];
  getUsersByStatus: (status: string) => User[];
  getActiveUsers: () => User[];
  getInactiveUsers: () => User[];
  getProfessionals: () => User[];
  getPatients: () => User[];
  searchUsers: (query: string) => User[];

  // Utils
  isUserActive: (user: User) => boolean;
  getUserDisplayName: (user: User) => string;
  getUserInitials: (user: User) => string;
  formatUserRole: (role: string) => string;
  refetch: () => void;
  invalidate: () => void;
}

/**
 * Hook para gerenciar usuários do sistema
 *
 * Funcionalidades:
 * - Listagem de usuários
 * - Criação de novos usuários
 * - Atualização de usuários existentes
 * - Exclusão de usuários
 * - Filtros por role, status
 * - Busca por nome, email ou telefone
 * - Utilitários para formatação e validação
 * - Cache otimizado com React Query
 *
 * @returns {UseUsersReturn} Objeto com dados e funções para gerenciar usuários
 */
export const useUsers = (): UseUsersReturn => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Query para buscar todos os usuários
  const {
    data: users = [],
    isLoading: loading,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // Mutation para criar usuário
  const createMutation = useMutation({
    mutationFn: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
      usersApi.save(user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao criar usuário:', error);
    },
  });

  // Mutation para atualizar usuário
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<User>;
    }) => usersApi.update(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao atualizar usuário:', error);
    },
  });

  // Mutation para deletar usuário
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => usersApi.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setError(null);
    },
    onError: (error: Error) => {
      setError(error);
      console.error('Erro ao deletar usuário:', error);
    },
  });

  // Actions
  const createUser = useCallback(
    async (
      user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<User> => {
      return await createMutation.mutateAsync(user);
    },
    [createMutation]
  );

  const updateUser = useCallback(
    async (userId: string, updates: Partial<User>): Promise<User> => {
      return await updateMutation.mutateAsync({ userId, updates });
    },
    [updateMutation]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await deleteMutation.mutateAsync(userId);
    },
    [deleteMutation]
  );

  // Queries
  const getUserById = useCallback(
    (userId: string): User | undefined => {
      return users.find((user) => user.id === userId);
    },
    [users]
  );

  const getUsersByRole = useCallback(
    (role: string): User[] => {
      return users.filter((user) => user.role === role);
    },
    [users]
  );

  const getUsersByStatus = useCallback(
    (status: string): User[] => {
      return users.filter((user) => user.status === status);
    },
    [users]
  );

  const getActiveUsers = useCallback((): User[] => {
    return users.filter((user) => user.status === 'active');
  }, [users]);

  const getInactiveUsers = useCallback((): User[] => {
    return users.filter((user) => user.status === 'inactive');
  }, [users]);

  const getProfessionals = useCallback((): User[] => {
    return users.filter(
      (user) =>
        user.role === 'admin' ||
        user.role === 'physiotherapist' ||
        user.role === 'doctor' ||
        user.role === 'nurse'
    );
  }, [users]);

  const getPatients = useCallback((): User[] => {
    return users.filter((user) => user.role === 'patient');
  }, [users]);

  const searchUsers = useCallback(
    (query: string): User[] => {
      if (!query.trim()) return users;

      const searchTerm = query.toLowerCase();
      return users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          (user.phone && user.phone.includes(searchTerm))
      );
    },
    [users]
  );

  // Utils
  const isUserActive = useCallback((user: User): boolean => {
    return user.status === 'active';
  }, []);

  const getUserDisplayName = useCallback((user: User): string => {
    return user.name || user.email || 'Usuário sem nome';
  }, []);

  const getUserInitials = useCallback(
    (user: User): string => {
      const name = getUserDisplayName(user);
      const words = name.split(' ');
      if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
      }
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    },
    [getUserDisplayName]
  );

  const formatUserRole = useCallback((role: string): string => {
    const roleMap: Record<string, string> = {
      admin: 'Administrador',
      physiotherapist: 'Fisioterapeuta',
      doctor: 'Médico',
      nurse: 'Enfermeiro',
      patient: 'Paciente',
      receptionist: 'Recepcionista',
      manager: 'Gerente',
    };
    return roleMap[role] || role;
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }, [queryClient]);

  // Sync error states
  useEffect(() => {
    if (queryError) {
      setError(queryError as Error);
    }
  }, [queryError]);

  return {
    // Data
    users,
    loading:
      loading ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
    error,

    // Actions
    createUser,
    updateUser,
    deleteUser,

    // Queries
    getUserById,
    getUsersByRole,
    getUsersByStatus,
    getActiveUsers,
    getInactiveUsers,
    getProfessionals,
    getPatients,
    searchUsers,

    // Utils
    isUserActive,
    getUserDisplayName,
    getUserInitials,
    formatUserRole,
    refetch,
    invalidate,
  };
};

export default useUsers;
