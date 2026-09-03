import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_SERVER = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
  ? (import.meta as any).env.VITE_API_URL 
  : 'https://online-crm.onrender.com';

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
  return config;
});

export const socket: Socket = io(API_SERVER, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
