import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_SERVER = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) 
  ? (import.meta as any).env.VITE_API_URL 
  : 'https://online-crm.onrender.com';

export const api = axios.create({
  baseURL: `${API_SERVER}/api`,
});

export const setAuthHeader = (userId: string) => {
  api.defaults.headers.common['x-user-id'] = userId;
  try { localStorage.setItem('crm_user_id', userId); } catch (e) {}
};

api.interceptors.request.use((config) => {
  if (!config.headers['x-user-id']) {
    const savedId = typeof localStorage !== 'undefined' ? localStorage.getItem('crm_user_id') : null;
    config.headers['x-user-id'] = savedId || 'usr-admin';
  }
  return config;
});

export const socket: Socket = io(API_SERVER, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
