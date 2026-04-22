import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/config/axios.config';

interface SocketContextData {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextData>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Derive base url from API_BASE_URL
    const socketUrl = API_BASE_URL.replace(/\/api\/?$/, '');
    
    // Create socket connection
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Prefer websocket
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected!', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected!');
      setConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('[Socket] Connection Error:', err);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
