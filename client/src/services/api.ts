import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_SERVER = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
  ? (import.meta as any).env.VITE_API_URL
  : 'https://online-crm.onrender.com';

/** Fired when the backend rejects the session (401). AuthContext listens and logs the user out. */
export const UNAUTHORIZED_EVENT = 'crm:unauthorized';

export const api = axios.create({
  baseURL: `${API_SERVER}/api`,
});

export const setAuthToken = (token: string, userId?: string) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try { localStorage.setItem('crm_auth_token', token); } catch (e) {}
  }
  if (userId) {
    api.defaults.headers.common['x-user-id'] = userId;
    try { localStorage.setItem('crm_user_id', userId); } catch (e) {}
  }
};

export const setAuthHeader = (userId: string) => {
  api.defaults.headers.common['x-user-id'] = userId;
  try { localStorage.setItem('crm_user_id', userId); } catch (e) {}
};

/** Clears every client-side credential (token, user, elevated admin PIN). */
export const clearAuth = () => {
  try {
    localStorage.removeItem('crm_auth_token');
    localStorage.removeItem('crm_active_user');
    localStorage.removeItem('crm_user_id');
    localStorage.removeItem('crm_admin_pin');
    sessionStorage.removeItem('crm_admin_pin');
  } catch (e) {}
  delete api.defaults.headers.common['Authorization'];
  delete api.defaults.headers.common['x-user-id'];
  delete api.defaults.headers.common['x-admin-pin'];
};

api.interceptors.request.use((config) => {
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('crm_auth_token');
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    const savedId = localStorage.getItem('crm_user_id');
    if (savedId && !config.headers['x-user-id']) {
      config.headers['x-user-id'] = savedId;
    }
  }
  // Elevated admin PIN lives only for the current browser tab (sessionStorage), never in localStorage
  if (typeof sessionStorage !== 'undefined') {
    const adminPin = sessionStorage.getItem('crm_admin_pin');
    if (adminPin && !config.headers['x-admin-pin']) {
      config.headers['x-admin-pin'] = adminPin;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url || '';
    if (status === 401 && !url.includes('/auth/login') && !url.includes('/users/verify-admin-pin')) {
      clearAuth();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
      }
    }
    return Promise.reject(error);
  }
);

export const socket: Socket = io(API_SERVER, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
