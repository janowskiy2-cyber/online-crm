import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthHeader } from '../services/api';

const defaultFallbackUsers: User[] = [
  {
    id: 'usr-1',
    name: 'Александр Громов',
    email: 'ceo@crm-online.pro',
    role: 'super_admin',
    department: 'Руководство',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: true,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: true,
    canExportData: true,
    canManageUsers: true,
    canManageIntegrations: true
  }
];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithCredentials: (email: string, pass: string) => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  logout: () => void;
  updateUserPermissions: (userId: string, permissions: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('crm_active_user');
    return saved ? JSON.parse(saved) : defaultFallbackUsers[0];
  });
  const [users, setUsers] = useState<User[]>(defaultFallbackUsers);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('crm_auth_token') !== null || true;
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
        const savedUserId = localStorage.getItem('crm_active_user_id');
        const active = res.data.find((u: User) => u.id === savedUserId) || currentUser || res.data[0];
        if (active) {
          setCurrentUser(active);
          setAuthHeader(active.id);
        }
      }
    } catch (e) {
      console.warn('Using local fallback users:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const loginWithCredentials = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    if (res.data?.user) {
      setCurrentUser(res.data.user);
      setIsAuthenticated(true);
      setAuthHeader(res.data.user.id);
      localStorage.setItem('crm_auth_token', res.data.token || 'logged_in');
      localStorage.setItem('crm_active_user_id', res.data.user.id);
      localStorage.setItem('crm_active_user', JSON.stringify(res.data.user));
    }
  };

  const switchUser = async (userId: string) => {
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
      setIsAuthenticated(true);
      setAuthHeader(selected.id);
      localStorage.setItem('crm_auth_token', 'logged_in');
      localStorage.setItem('crm_active_user_id', selected.id);
      localStorage.setItem('crm_active_user', JSON.stringify(selected));
    }
    try {
      const res = await api.post('/auth/login-as', { userId });
      if (res.data?.user) {
        setCurrentUser(res.data.user);
      }
    } catch (e) {}
  };

  const logout = () => {
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_active_user_id');
    localStorage.removeItem('crm_active_user');
    setIsAuthenticated(false);
  };

  const updateUserPermissions = async (userId: string, permissions: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...permissions } : u));
    if (currentUser?.id === userId) {
      const updated = { ...currentUser, ...permissions };
      setCurrentUser(updated);
      localStorage.setItem('crm_active_user', JSON.stringify(updated));
    }
    try {
      await api.put(`/users/${userId}/permissions`, permissions);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isAuthenticated,
      isLoading,
      loginWithCredentials,
      switchUser,
      logout,
      updateUserPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
