'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';

type Props = { socket: Socket | null; gameId: string };

export default function Chat({ socket, gameId }: Props) {
  const [val, setVal] = useState('');

  const send = () => {
    if (!socket || !val.trim()) return;
    socket.emit('chat', { gameId, message: val.trim() });
    setVal('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
      <div className="font-medium mb-2 text-sm">Chat</div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-slate-600 rounded-md p-2 bg-slate-900 text-slate-100 text-sm"
          value={val}
          onChange={e=>setVal(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Say something…"
        />
        <button
          className="px-3 py-1 rounded-md bg-slate-100 text-slate-900 text-sm font-semibold"
          onClick={send}
        >
          Send
        </button>
      </div>
    </div>
  );
}
