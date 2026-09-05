import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthHeader, setAuthToken } from '../services/api';
import { DEFAULT_ADMIN_AVATAR } from '../constants/defaultAvatar';

const defaultRootUser: User = {
  id: 'usr-admin',
  name: 'Головний Адміністратор',
  email: 'admin@crm.pro',
  role: 'super_admin',
  department: 'Керівництво',
  phone: '+380 (73) 427-71-74',
  avatar: DEFAULT_ADMIN_AVATAR,
  canViewAllDeals: true,
  canViewDeptDeals: true,
  canEditDeals: true,
  canDeleteDeals: true,
  canExportData: true,
  canManageUsers: true,
  canManageIntegrations: true
};

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithCredentials: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, partial: Partial<User>) => Promise<void>;
  updateUserAvatar: (userId: string, base64Avatar: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('crm_active_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const token = localStorage.getItem('crm_auth_token');
    if (token && token !== 'root_admin_token') return defaultRootUser;
    return null;
  });

  const [users, setUsers] = useState<User[]>([defaultRootUser]);
  
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = localStorage.getItem('crm_auth_token');
    return !!token;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Initialize Authorization header if token exists
  useEffect(() => {
    const token = localStorage.getItem('crm_auth_token');
    const userId = currentUser?.id || localStorage.getItem('crm_user_id');
    if (token) {
      setAuthToken(token, userId || undefined);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
        if (currentUser) {
          const fresh = res.data.find((u: User) => 
            u.id === currentUser.id || 
            (currentUser.role === 'super_admin' && u.role === 'super_admin') ||
            (currentUser.email && u.email && currentUser.email.toLowerCase() === u.email.toLowerCase())
          );
          if (fresh) {
            const merged = { ...currentUser, ...fresh };
            setCurrentUser(merged);
            setAuthHeader(merged.id);
            localStorage.setItem('crm_active_user', JSON.stringify(merged));
          }
        }
      }
    } catch (e) {
      console.warn('Backend user sync error:', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated]);

  const loginWithCredentials = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.post('/auth/login', { email: cleanEmail, password: pass });
      if (res.data?.user) {
        const user = res.data.user;
        const token = res.data.token;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthToken(token, user.id);
        localStorage.setItem('crm_active_user', JSON.stringify(user));
        return;
      }
      throw new Error('Не вдалося увійти. Спробуйте ще раз.');
    } catch (err: any) {
      const backendMessage = err?.response?.data?.error || err?.message || 'Помилка авторизації';
      throw new Error(backendMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_active_user');
    localStorage.removeItem('crm_user_id');
    delete api.defaults.headers.common['Authorization'];
    delete api.defaults.headers.common['x-user-id'];
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const switchUser = async (userId: string) => {
    try {
      const res = await api.post(`/auth/switch-user/${userId}`);
      if (res.data?.user && res.data?.token) {
        const user = res.data.user;
        const token = res.data.token;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setAuthToken(token, user.id);
        localStorage.setItem('crm_active_user', JSON.stringify(user));
        return;
      }
    } catch (e) {
      console.warn('switchUser backend error:', e);
    }
    // Fallback: local switch from user list
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      setAuthHeader(found.id);
      localStorage.setItem('crm_active_user', JSON.stringify(found));
    }
  };

  const updateUserPermissions = async (userId: string, partial: Partial<User>) => {
    try {
      const res = await api.put(`/users/${userId}`, partial);
      if (res.data) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...res.data } : u));
        if (currentUser?.id === userId) {
          const fresh = { ...currentUser, ...res.data };
          setCurrentUser(fresh);
          localStorage.setItem('crm_active_user', JSON.stringify(fresh));
        }
      }
    } catch (e) {
      console.error('updateUserPermissions error:', e);
    }
  };

  const updateUserAvatar = async (userId: string, base64Avatar: string): Promise<boolean> => {
    try {
      const res = await api.put(`/users/${userId}/avatar`, { avatar: base64Avatar });
      if (res.data?.success && res.data?.user) {
        const updatedUser = res.data.user;
        if (currentUser && (currentUser.id === userId || (currentUser.role === 'super_admin' && updatedUser.role === 'super_admin'))) {
          const fresh = { ...currentUser, avatar: updatedUser.avatar };
          setCurrentUser(fresh);
          localStorage.setItem('crm_active_user', JSON.stringify(fresh));
        }
        setUsers(prev => prev.map(u => 
          (u.id === userId || (u.role === 'super_admin' && updatedUser.role === 'super_admin')) 
            ? { ...u, avatar: updatedUser.avatar } 
            : u
        ));
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to update avatar in DB:', e);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isAuthenticated,
      isLoading,
      loginWithCredentials,
      logout,
      refreshUsers: fetchUsers,
      switchUser,
      updateUserPermissions,
      updateUserAvatar
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
