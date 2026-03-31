'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

let socketInstance: Socket | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    // Create socket instance if not exists
    if (!socketInstance) {
      socketInstance = io(window.location.origin, {
        transports: ['websocket', 'polling'],
        auth: { token: 'session-auth' },
      });
    }

    const socket = socketInstance;
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      // Identify ourselves to server
      socket.emit('player:identify', {
        userId: session.user.id,
        username: session.user.username,
      });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    if (socket.connected) {
      onConnect();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [session]);

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    if (handler) {
      socketRef.current?.off(event, handler);
    } else {
      socketRef.current?.off(event);
    }
  }, []);

  return { socket: socketRef.current, isConnected, emit, on, off };
}

export function getSocket() {
  return socketInstance;
}
