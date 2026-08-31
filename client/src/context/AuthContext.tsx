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
  },
  {
    id: 'usr-3',
    name: 'Елена Смирнова',
    email: 'rop@crm-online.pro',
    role: 'sales_director',
    department: 'Отдел продаж',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: true,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: true,
    canExportData: true,
    canManageUsers: false,
    canManageIntegrations: false
  },
  {
    id: 'usr-6',
    name: 'Иван Соколов',
    email: 'senior.b2b@crm-online.pro',
    role: 'senior_sales_rep',
    department: 'B2B Продажи',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
    canViewAllDeals: false,
    canViewDeptDeals: true,
    canEditDeals: true,
    canDeleteDeals: false,
    canExportData: false,
    canManageUsers: false,
    canManageIntegrations: false
  }
];

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isLoading: boolean;
  switchUser: (userId: string) => Promise<void>;
  updateUserPermissions: (userId: string, permissions: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(defaultFallbackUsers[0]);
  const [users, setUsers] = useState<User[]>(defaultFallbackUsers);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      if (res.data && res.data.length > 0) {
        setUsers(res.data);
        const savedUserId = localStorage.getItem('crm_active_user_id');
        const activeUser = res.data.find((u: User) => u.id === savedUserId) || res.data[0];
        if (activeUser) {
          setCurrentUser(activeUser);
          setAuthHeader(activeUser.id);
        }
      }
    } catch (e) {
      console.warn('Backend loading, using fallback offline user state:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const switchUser = async (userId: string) => {
    const selected = users.find(u => u.id === userId);
    if (selected) {
      setCurrentUser(selected);
      setAuthHeader(selected.id);
      localStorage.setItem('crm_active_user_id', selected.id);
    }
    try {
      const res = await api.post('/auth/login-as', { userId });
      if (res.data?.user) {
        setCurrentUser(res.data.user);
      }
    } catch (e) {
      console.warn('Switch user offline mode:', e);
    }
  };

  const updateUserPermissions = async (userId: string, permissions: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...permissions } : u));
    if (currentUser?.id === userId) {
      setCurrentUser(prev => prev ? { ...prev, ...permissions } : null);
    }
    try {
      await api.put(`/users/${userId}/permissions`, permissions);
    } catch (e) {}
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
