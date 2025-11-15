// Socket.IO connection
import { io } from 'socket.io-client';

export const socket = io();

// Debug socket connection
socket.on('connect', () => {
  console.log('[Socket] Connected to server, socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('[Socket] Connection error:', error);
});
