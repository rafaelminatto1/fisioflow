import { useState, useCallback, createContext, useContext, ReactNode } from 'react';

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

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
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
  isAuthenticated: boolean;
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
  const [user, setUser] = useState<AuthUser | null>(() => {
    // Usuário demo para desenvolvimento
    return {
      id: 'demo-user',
      name: 'Usuário Demo',
      email: 'demo@fisioflow.com',
      role: 'FISIOTERAPEUTA',
      tenantId: 'demo-tenant',
      tier: 'free' as AuthTier,
      limits: TIER_LIMITS.free,
      usage: {
        patients: 2,
        sessions: 15,
        users: 1,
        storage: 45,
        aiRequests: 3,
      },
    };
  });
  
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simular login - aceitar qualquer credencial em dev
      const demoUser: AuthUser = {
        id: 'demo-user',
        name: 'Usuário Demo',
        email: email,
        role: 'FISIOTERAPEUTA',
        tenantId: 'demo-tenant',
        tier: 'free' as AuthTier,
        limits: TIER_LIMITS.free,
        usage: {
          patients: 2,
          sessions: 15,
          users: 1,
          storage: 45,
          aiRequests: 3,
        },
      };
      
      localStorage.setItem('fisioflow-token', 'demo-token');
      setUser(demoUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('fisioflow-token');
    setUser(null);
  }, []);

  const register = useCallback(async (userData: any) => {
    setLoading(true);
    try {
      // Simular registro
      const newUser: AuthUser = {
        id: 'demo-user-' + Date.now(),
        name: userData.name || 'Novo Usuário',
        email: userData.email,
        role: 'FISIOTERAPEUTA',
        tenantId: 'demo-tenant',
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
      
      localStorage.setItem('fisioflow-token', 'demo-token');
      setUser(newUser);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<AuthUser>) => {
    if (!user) return;
    setUser({ ...user, ...data });
  }, [user]);

  const checkLimit = useCallback((resource: keyof TierLimits, amount: number = 1): boolean => {
    if (!user) return false;
    const limit = user.limits[resource];
    if (limit === -1) return true; // Ilimitado
    const currentUsage = user.usage[resource as keyof typeof user.usage] || 0;
    return (currentUsage + amount) <= limit;
  }, [user]);

  const upgradeToTier = useCallback(async (tier: AuthTier) => {
    if (!user) return;
    setUser({
      ...user,
      tier,
      limits: TIER_LIMITS[tier],
    });
  }, [user]);

  const refetchUser = useCallback(() => {
    // No-op em modo demo
  }, []);

  const contextValue: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
    checkLimit,
    canUpgrade: user?.tier !== 'enterprise',
    upgradeToTier,
    tier: user?.tier || 'free',
    refetchUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};