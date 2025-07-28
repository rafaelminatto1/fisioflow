import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';

import { INITIAL_USERS, INITIAL_TENANTS } from '../constants';
import { User, UserRole, Tenant } from '../types';

interface AuthContextType {
  user: User | null;
  currentTenant: Tenant | null;
  login: (role: UserRole, userId?: string) => void;
  logout: () => void;
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
    }
  ];
  
  const tenants = INITIAL_TENANTS;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const login = useCallback(
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
      }
    },
    [allUsers]
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  const user = useMemo(() => {
    return allUsers.find((u: User) => u.id === currentUserId) || null;
  }, [currentUserId, allUsers]);

  const currentTenant = useMemo(() => {
    if (!user || !user.tenantId) return null;
    return tenants.find((t: Tenant) => t.id === user.tenantId) || null;
  }, [user, tenants]);

  return (
    <AuthContext.Provider value={{ user, currentTenant, login, logout }}>
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
