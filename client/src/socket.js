import { io } from 'socket.io-client';

// Use same host or fallback to port 5000 in dev mode
const SOCKET_URL = window.location.hostname === 'localhost' && window.location.port === '3000'
  ? 'http://localhost:5000'
  : '/';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
