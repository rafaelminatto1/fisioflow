import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { User, UserRole, Tenant } from '../types';
import { DataContext } from './useData';

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
  const rawDataContext = useContext(DataContext);
  if (!rawDataContext) {
    throw new Error(
      'AuthProvider must be used within a DataProvider. Check the component tree in App.tsx.'
    );
  }
  const { allUsers, tenants } = rawDataContext;

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
