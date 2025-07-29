import { useCallback, useMemo } from 'react';
import { User } from '../../types';
import { INITIAL_USERS } from '../../constants';
import { useOptimizedStorage } from './useOptimizedStorage';
import { useAuth } from '../useAuth';

export const useUsers = () => {
  const { user: currentUser } = useAuth();
  
  const [allUsers, setAllUsers] = useOptimizedStorage<User[]>(
    'fisioflow-all-users',
    Object.values(INITIAL_USERS),
    ['name', 'email', 'role'],
    'tenantId'
  );

  // Filtrar usuários por tenant
  const users = useMemo(() => {
    if (!currentUser?.tenantId) return [];
    return allUsers.filter(user => user.tenantId === currentUser.tenantId);
  }, [allUsers, currentUser?.tenantId]);

  const addUser = useCallback((user: Omit<User, 'id' | 'tenantId'>) => {
    if (!currentUser?.tenantId) return;
    
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      tenantId: currentUser.tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setAllUsers(prev => [...prev, newUser]);
  }, [setAllUsers, currentUser?.tenantId]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    setAllUsers(prev => 
      prev.map(user => 
        user.id === id 
          ? { ...user, ...updates, updatedAt: new Date().toISOString() }
          : user
      )
    );
  }, [setAllUsers]);

  const deleteUser = useCallback((id: string) => {
    setAllUsers(prev => prev.filter(user => user.id !== id));
  }, [setAllUsers]);

  const getUserById = useCallback((id: string) => {
    return users.find(user => user.id === id);
  }, [users]);

  const getUsersByRole = useCallback((role: string) => {
    return users.filter(user => user.role === role);
  }, [users]);

  return {
    users,
    addUser,
    updateUser,
    deleteUser,
    getUserById,
    getUsersByRole,
  };
};