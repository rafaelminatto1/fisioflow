import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { User, UserRole, Tenant } from '../types';
// import { DataContext } from './useData';

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
  // Versão simplificada sem dependência do DataContext
  const allUsers = [
    {
      id: '1',
      name: 'Dr. Admin',
      email: 'admin@demo.com',
      role: 'ADMIN' as UserRole,
      tenantId: 't1'
    }
  ];
  
  const tenants = [
    {
      id: 't1',
      name: 'Clínica Demo',
      plan: 'free'
    }
  ];

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
