import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthHeader } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  switchUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);

      const savedUserId = localStorage.getItem('crm_active_user_id');
      const activeUser = res.data.find((u: User) => u.id === savedUserId) || res.data[0];

      if (activeUser) {
        setCurrentUser(activeUser);
        setAuthHeader(activeUser.id);
        localStorage.setItem('crm_active_user_id', activeUser.id);
      }
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const switchUser = async (userId: string) => {
    try {
      const res = await api.post('/auth/login-as', { userId });
      setCurrentUser(res.data.user);
      setAuthHeader(res.data.user.id);
      localStorage.setItem('crm_active_user_id', res.data.user.id);
    } catch (e) {
      console.error('Failed to switch user:', e);
    }
  };

  const updateUserPermissions = async (userId: string, permissions: Partial<User>) => {
    try {
      const res = await api.put(`/users/${userId}/permissions`, permissions);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...res.data } : u));
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? { ...prev, ...res.data } : null);
      }
    } catch (e) {
      console.error('Failed to update permissions:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, isLoading, switchUser, updateUserPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
