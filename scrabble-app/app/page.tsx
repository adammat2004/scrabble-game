'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function getOrCreatePlayerId() {
  if (typeof window === 'undefined') return '';
  const key = 'scrabblePlayerId';
  let pid = window.sessionStorage.getItem(key);
  if (!pid) {
    pid = crypto.randomUUID();
    window.sessionStorage.setItem(key, pid);
  }
  return pid;
}


export default function HomePage() {
  const [gameId, setGameId] = useState('demo');
  const [name, setName] = useState('Player');
  const router = useRouter();
  const [playerId, setPlayerId] = useState('');

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId());
  }, []);

  const join = () => {
    if (!playerId) return;
    const url = `/game/${encodeURIComponent(gameId)}?name=${encodeURIComponent(name)}&pid=${encodeURIComponent(playerId)}`;
    router.push(url);
  };

  return (
    <main className="w-full max-w-xl mx-auto p-6 bg-slate-800 rounded-2xl shadow-xl space-y-6 border border-slate-700">
      <h1 className="text-3xl font-bold text-center">Scrabble Online</h1>
      <p className="text-center text-sm text-slate-300">
        Enter a game ID to create or join a room. Open this page in another tab with the same ID to play with yourself.
      </p>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Your name</label>
        <input
          value={name}
          onChange={e=>setName(e.target.value)}
          className="w-full border border-slate-600 rounded-md p-2 bg-slate-900 text-slate-100"
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Game ID</label>
        <input
          value={gameId}
          onChange={e=>setGameId(e.target.value)}
          className="w-full border border-slate-600 rounded-md p-2 bg-slate-900 text-slate-100"
        />
      </div>
      <button
        onClick={join}
        disabled={!playerId}
        className="w-full px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold transition disabled:opacity-40"
      >
        Join Game
      </button>
      <p className="text-xs text-slate-400 text-center">
        Tip: use a simple ID like <code>demo</code> and open in two browser windows.
      </p>
    </main>
  )
}
