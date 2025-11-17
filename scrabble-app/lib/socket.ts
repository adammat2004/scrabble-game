'use client';

import { io, Socket } from 'socket.io-client';
import { useEffect, useState } from 'react';

let singleton: Socket | null = null;

export function useSocket() {
  const [sock, setSock] = useState<Socket | null>(null);

  useEffect(() => {
    if (!singleton) {
      const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      singleton = io(url, { autoConnect: true });
    }
    setSock(singleton);
    return () => {};
  }, []);

  return sock;
}
