import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api, setAuthHeader, setAuthToken } from '../services/api';

const defaultRootUser: User = {
  id: 'usr-admin',
  name: 'Головний Адміністратор',
  email: 'admin@crm.pro',
  role: 'super_admin',
  department: 'Керівництво',
  phone: '+380 (73) 427-71-74',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
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
          const fresh = res.data.find((u: User) => u.id === currentUser.id);
          if (fresh) {
            setCurrentUser(fresh);
            setAuthHeader(fresh.id);
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

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isAuthenticated,
      isLoading,
      loginWithCredentials,
      logout,
      refreshUsers: fetchUsers
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
