import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE = '/api';

export const api = axios.create({
  baseURL: API_BASE,
});

export const setAuthHeader = (userId: string) => {
  api.defaults.headers.common['x-user-id'] = userId;
};

export const socket: Socket = io({
  autoConnect: true,
});
