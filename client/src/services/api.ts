import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_SERVER = import.meta.env.VITE_API_URL || 'https://online-crm.onrender.com';

export const api = axios.create({
  baseURL: `${API_SERVER}/api`,
});

export const setAuthHeader = (userId: string) => {
  api.defaults.headers.common['x-user-id'] = userId;
};

export const socket: Socket = io(API_SERVER, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
