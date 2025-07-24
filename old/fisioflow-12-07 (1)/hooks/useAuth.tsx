
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as api from '/services/api.js';
import { User, UserRole } from '/types.js';

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: users = [] } = useQuery<User[], Error>({
      queryKey: ['users'],
      queryFn: api.getUsers,
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const login = useCallback((role: UserRole) => {
    // Demo login: find the first user with the given role
    const loggedInUser = users.find(u => u.role === role);
    if (loggedInUser) {
      setCurrentUserId(loggedInUser.id);
    }
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  const user = useMemo(() => {
    return users.find(u => u.id === currentUserId) || null;
  }, [currentUserId, users]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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