import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { User, UserRole, Tenant } from '../types';
import { INITIAL_USERS, INITIAL_TENANTS } from '../constants';

interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

interface AuthContextType {
  user: User | null;
  currentTenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2FA: boolean;
  login: (
    credentials: LoginCredentials
  ) => Promise<{ success: boolean; requires2FA?: boolean; error?: string }>;
  loginWithRole: (role: UserRole, userId?: string) => void; // Para demonstração
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  enable2FA: () => Promise<{
    success: boolean;
    qrCode?: string;
    secret?: string;
  }>;
  disable2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Usar dados do constants.tsx e adicionar usuários para todos os perfis
  const allUsers = [
    ...Object.values(INITIAL_USERS),
    {
      id: '4',
      name: 'João Silva',
      email: 'joao.silva@demo.com',
      role: UserRole.PACIENTE,
      avatarUrl: 'https://picsum.photos/seed/joao/100/100',
      tenantId: 't1',
    },
    {
      id: '5',
      name: 'Nova Clínica',
      email: 'admin@novaClinica.com',
      role: UserRole.ADMIN,
      avatarUrl: 'https://picsum.photos/seed/nova/100/100',
      tenantId: null, // Para trigger do onboarding
    },
  ];

  const tenants = INITIAL_TENANTS;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  // Carregar sessão salva no localStorage
  useEffect(() => {
    const savedUserId = localStorage.getItem('fisioflow_user_id');
    const savedSession = localStorage.getItem('fisioflow_session');

    if (savedUserId && savedSession) {
      const session = JSON.parse(savedSession);
      const now = Date.now();

      // Verificar se a sessão não expirou (24 horas)
      if (session.expiresAt > now) {
        setCurrentUserId(savedUserId);
      } else {
        localStorage.removeItem('fisioflow_user_id');
        localStorage.removeItem('fisioflow_session');
      }
    }

    setIsLoading(false);
  }, []);

  // Salvar sessão no localStorage
  const saveSession = (userId: string) => {
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 horas
    localStorage.setItem('fisioflow_user_id', userId);
    localStorage.setItem('fisioflow_session', JSON.stringify({ expiresAt }));
  };

  // Limpar sessão
  const clearSession = () => {
    localStorage.removeItem('fisioflow_user_id');
    localStorage.removeItem('fisioflow_session');
  };

  // Login com email/senha
  const login = useCallback(
    async (
      credentials: LoginCredentials
    ): Promise<{ success: boolean; requires2FA?: boolean; error?: string }> => {
      setIsLoading(true);

      try {
        // Simular delay de rede
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const user = allUsers.find((u: User) => u.email === credentials.email);

        if (!user) {
          return { success: false, error: 'Email não encontrado' };
        }

        // Simular verificação de senha (em produção, usar hash)
        const defaultPasswords: Record<string, string> = {
          'admin@fisioflow.com': 'admin123',
          'dr.silva@clinic.com': 'senha123',
          'estagiario@clinic.com': 'estagio123',
          'joao.silva@demo.com': 'paciente123',
        };

        const expectedPassword =
          defaultPasswords[credentials.email] || 'demo123';

        if (credentials.password !== expectedPassword) {
          return { success: false, error: 'Senha incorreta' };
        }

        // Verificar se usuário tem 2FA habilitado (simular)
        const has2FA = user.role === UserRole.ADMIN; // Admin sempre tem 2FA

        if (has2FA && !credentials.twoFactorCode) {
          setPendingUserId(user.id);
          setRequires2FA(true);
          return { success: false, requires2FA: true };
        }

        if (has2FA && credentials.twoFactorCode) {
          // Verificar código 2FA (simular)
          if (credentials.twoFactorCode !== '123456') {
            return { success: false, error: 'Código 2FA inválido' };
          }
        }

        // Login bem-sucedido
        setCurrentUserId(user.id);
        saveSession(user.id);
        setRequires2FA(false);
        setPendingUserId(null);

        return { success: true };
      } catch (error) {
        return { success: false, error: 'Erro interno do servidor' };
      } finally {
        setIsLoading(false);
      }
    },
    [allUsers]
  );

  // Login por papel (para demonstração - manter compatibilidade)
  const loginWithRole = useCallback(
    (role: UserRole, userId?: string) => {
      let loggedInUser: User | undefined;
      if (userId) {
        loggedInUser = allUsers.find((u: User) => u.id === userId);
      } else {
        loggedInUser = allUsers.find(
          (u: User) => u.role === role && !!u.tenantId
        );
      }

      if (loggedInUser) {
        setCurrentUserId(loggedInUser.id);
        saveSession(loggedInUser.id);
      }
    },
    [allUsers]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setRequires2FA(false);
    setPendingUserId(null);
    clearSession();
  }, []);

  const updateProfile = useCallback((updates: Partial<User>) => {
    if (!user) return;

    // Em produção, fazer chamada para API
    console.log('Atualizando perfil:', updates);

    // Simular atualização local
    const updatedUsers = allUsers.map((u) =>
      u.id === user.id ? { ...u, ...updates } : u
    );

    // Aqui você atualizaria o estado global ou faria requisição à API
  }, []);

  const changePassword = useCallback(
    async (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: 'Usuário não autenticado' };

      // Simular verificação de senha atual
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Em produção, verificar senha atual e atualizar
      console.log('Alterando senha para usuário:', user.id);

      return { success: true };
    },
    []
  );

  const enable2FA = useCallback(async (): Promise<{
    success: boolean;
    qrCode?: string;
    secret?: string;
  }> => {
    if (!user) return { success: false };

    // Simular geração de QR code e secret
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const secret = 'EXAMPLE_SECRET_KEY'; // Exemplo para demonstração
    const qrCode = `otpauth://totp/FisioFlow:${user.email}?secret=${secret}&issuer=FisioFlow`;

    return { success: true, qrCode, secret };
  }, []);

  const disable2FA = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: 'Usuário não autenticado' };

      // Simular verificação do código
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (code !== '123456') {
        return { success: false, error: 'Código inválido' };
      }

      return { success: true };
    },
    []
  );

  const user = useMemo(() => {
    return allUsers.find((u: User) => u.id === currentUserId) || null;
  }, [currentUserId, allUsers]);

  const isAuthenticated = useMemo(() => {
    return !!user && !requires2FA;
  }, [user, requires2FA]);

  const currentTenant = useMemo(() => {
    if (!user || !user.tenantId) return null;
    return tenants.find((t: Tenant) => t.id === user.tenantId) || null;
  }, [user, tenants]);

  return (
    <AuthContext.Provider
      value={{
        user,
        currentTenant,
        isLoading,
        isAuthenticated,
        requires2FA,
        login,
        loginWithRole,
        logout,
        updateProfile,
        changePassword,
        enable2FA,
        disable2FA,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
