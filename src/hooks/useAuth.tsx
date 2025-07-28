import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { z } from 'zod';

import { api } from '../services/api';
import { User, SubscriptionPlan } from '../types';

type AuthTier = 'free' | 'premium' | 'enterprise';

interface TierLimits {
  maxPatients: number;
  maxSessions: number;
  maxUsers: number;
  maxStorage: number; // em MB
  aiRequestsPerMonth: number;
  hasAdvancedAnalytics: boolean;
  hasCustomReports: boolean;
  hasPrioritySupport: boolean;
}

const TIER_LIMITS: Record<AuthTier, TierLimits> = {
  free: {
    maxPatients: 10,
    maxSessions: 50,
    maxUsers: 1,
    maxStorage: 100,
    aiRequestsPerMonth: 10,
    hasAdvancedAnalytics: false,
    hasCustomReports: false,
    hasPrioritySupport: false,
  },
  premium: {
    maxPatients: 100,
    maxSessions: 1000,
    maxUsers: 5,
    maxStorage: 1000,
    aiRequestsPerMonth: 100,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
  },
  enterprise: {
    maxPatients: -1, // Ilimitado
    maxSessions: -1,
    maxUsers: -1,
    maxStorage: -1,
    aiRequestsPerMonth: -1,
    hasAdvancedAnalytics: true,
    hasCustomReports: true,
    hasPrioritySupport: true,
  },
};

interface AuthUser extends User {
  tier: AuthTier;
  limits: TierLimits;
  usage: {
    patients: number;
    sessions: number;
    users: number;
    storage: number;
    aiRequests: number;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: any) => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  checkLimit: (resource: keyof TierLimits, amount?: number) => boolean;
  canUpgrade: boolean;
  upgradeToTier: (tier: AuthTier) => Promise<void>;
  tier: AuthTier;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);

  // Query para verificar autenticação
  const authQuery = useQuery({
    queryKey: ['auth', 'current-user'],
    queryFn: async () => {
      const token = localStorage.getItem('fisioflow-token');
      if (!token) return null;
      
      const userData = await api.verifyToken(token);
      const usage = await api.getUserUsage(userData.id);
      
      return {
        ...userData,
        limits: TIER_LIMITS[userData.tier || 'free'],
        usage,
      };
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Sincronizar user state com query
  useEffect(() => {
    if (authQuery.data) {
      setUser(authQuery.data);
    } else if (authQuery.isError) {
      localStorage.removeItem('fisioflow-token');
      setUser(null);
    }
  }, [authQuery.data, authQuery.isError]);

  // Mutation para login
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await api.login(email, password);
      localStorage.setItem('fisioflow-token', response.token);
      
      const usage = await api.getUserUsage(response.user.id);
      return {
        ...response.user,
        limits: TIER_LIMITS[response.user.tier || 'free'],
        usage,
      };
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.setQueryData(['auth', 'current-user'], userData);
    },
  });

  const login = useCallback(async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  }, [loginMutation]);

  const logout = useCallback(() => {
    localStorage.removeItem('fisioflow-token');
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Mutation para registro
  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await api.register(userData);
      localStorage.setItem('fisioflow-token', response.token);
      
      return {
        ...response.user,
        tier: 'free' as AuthTier,
        limits: TIER_LIMITS.free,
        usage: {
          patients: 0,
          sessions: 0,
          users: 1,
          storage: 0,
          aiRequests: 0,
        },
      };
    },
    onSuccess: (userData) => {
      setUser(userData);
      queryClient.setQueryData(['auth', 'current-user'], userData);
    },
  });

  const register = useCallback(async (userData: any) => {
    return registerMutation.mutateAsync(userData);
  }, [registerMutation]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<AuthUser>) => {
      if (!user) throw new Error('Usuário não autenticado');
      return api.updateUser(user.id, data);
    },
    onSuccess: (updatedData) => {
      if (user) {
        const updatedUser = { ...user, ...updatedData };
        setUser(updatedUser);
        queryClient.setQueryData(['auth', 'current-user'], updatedUser);
      }
    },
  });

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    return updateProfileMutation.mutateAsync(data);
  }, [updateProfileMutation]);

  const checkLimit = useCallback((resource: keyof TierLimits, amount: number = 1) => {
    if (!user) return false;
    
    const limit = user.limits[resource];
    if (limit === -1) return true; // Ilimitado
    
    const currentUsage = user.usage[resource as keyof typeof user.usage] || 0;
    return (currentUsage + amount) <= limit;
  }, [user]);

  const canUpgrade = user?.tier !== 'enterprise';

  // Mutation para upgrade de tier
  const upgradeTierMutation = useMutation({
    mutationFn: async (tier: AuthTier) => {
      if (!user) throw new Error('Usuário não autenticado');
      await api.upgradeTier(user.id, tier);
      return tier;
    },
    onSuccess: (tier) => {
      if (user) {
        const updatedUser = {
          ...user,
          tier,
          limits: TIER_LIMITS[tier],
        };
        setUser(updatedUser);
        queryClient.setQueryData(['auth', 'current-user'], updatedUser);
        // Invalidar outras queries que dependem do tier
        queryClient.invalidateQueries({ queryKey: ['exercises'] });
        queryClient.invalidateQueries({ queryKey: ['patients'] });
      }
    },
  });

  const upgradeToTier = useCallback(async (tier: AuthTier) => {
    return upgradeTierMutation.mutateAsync(tier);
  }, [upgradeTierMutation]);

  const value: AuthContextType = {
    user,
    loading: authQuery.isLoading || loginMutation.isPending || registerMutation.isPending,
    login,
    logout,
    register,
    updateProfile,
    checkLimit,
    canUpgrade,
    upgradeToTier,
    tier: user?.tier || 'free',
    refetchUser: authQuery.refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export default useAuth;
