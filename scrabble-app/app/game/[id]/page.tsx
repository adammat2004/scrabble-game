'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSocket } from '../../../lib/socket';
import Board from '../../../components/Board';
import Rack from '../../../components/Rack';
import Scoreboard from '../../../components/Scoreboard';
import Chat from '../../../components/Chat';
import BonusLegend from '../../../components/BonusLegend';

type Bonus = 'TW'|'DW'|'TL'|'DL'|null;
type Cell = { letter: string | null; bonus: Bonus };

type PublicPlayer = { socketId: string; playerId: string; name: string; rackCount: number };

export default function GamePage({ params }: { params: { id: string }}) {
  const gameId = params.id;
  const sp = useSearchParams();
  const name = sp.get('name') || 'Player';
  const playerId = sp.get('pid') || '';

  const socket = useSocket();
  const [board, setBoard] = useState<Cell[][]>([]);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [yourRack, setYourRack] = useState<string[]>([]);
  const [bagCount, setBagCount] = useState<number>(0);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!socket || !playerId) return;
    const onConnect = () => {
      socket.emit('join_game', { gameId, name, playerId });
    };
    const onGameState = (state: any) => {
      setBoard(state.board);
      setPlayers(state.players);
      setScores(state.scores);
      setCurrentPlayerId(state.currentPlayerId || null);
      setBagCount(state.bagCount);
    };
    const onYourRack = (rack: string[]) => setYourRack(rack);
    const onSystem = (msg: any) => setLog(l => [`🛈 ${msg.message}`, ...l]);
    const onMovePlayed = (d: any) => {
      const words = (d.words || []).join(', ');
      setLog(l => [`▶ ${d.by} scored ${d.scoreDelta} (${words || 'no words?'})`, ...l]);
    };
    const onChat = (m: any) => setLog(l => [`💬 ${m.name}: ${m.message}`, ...l]);
    const onError = (e: any) => setLog(l => [`⚠ ${e.message}`, ...l]);

    socket.on('connected', onConnect);
    socket.on('game_state', onGameState);
    socket.on('your_rack', onYourRack);
    socket.on('system', onSystem);
    socket.on('move_played', onMovePlayed);
    socket.on('chat_message', onChat);
    socket.on('error_msg', onError);

    return () => {
      socket.off('connected', onConnect);
      socket.off('game_state', onGameState);
      socket.off('your_rack', onYourRack);
      socket.off('system', onSystem);
      socket.off('move_played', onMovePlayed);
      socket.off('chat_message', onChat);
      socket.off('error_msg', onError);
    };
  }, [socket, gameId, name, playerId]);

  const me = useMemo(
    () => players.find(p => p.playerId === playerId),
    [players, playerId]
  );
  const myTurn = !!(playerId && currentPlayerId === playerId);

  return (
    <main className="w-full max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-4">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Game: {gameId}</h1>
            <p className="text-xs text-slate-300">
              {myTurn ? 'It is your turn.' : 'Waiting for other players.'} Bag: {bagCount}
            </p>
          </div>
          <BonusLegend />
        </div>
        <Board board={board} yourRack={yourRack} myTurn={myTurn} socket={socket} gameId={gameId} />
        <Rack rack={yourRack} />
      </section>
      <aside className="space-y-4">
        <Scoreboard
          players={players}
          scores={scores}
          currentPlayerId={currentPlayerId}
          mePlayerId={playerId}
        />
        <Chat socket={socket} gameId={gameId} />
        <div className="bg-slate-800 rounded-xl p-3 h-64 overflow-auto border border-slate-700 text-sm">
          <div className="font-medium mb-2">Activity</div>
          <ul className="space-y-1">
            {log.map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </div>
      </aside>
    </main>
  )
}
