'use client';

type PublicPlayer = { socketId: string; playerId: string; name: string; rackCount: number };

type Props = {
  players: PublicPlayer[];
  scores: Record<string, number>;
  currentPlayerId: string | null;
  mePlayerId: string;
};

export default function Scoreboard({ players, scores, currentPlayerId, mePlayerId }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
      <div className="font-medium mb-2">Players</div>
      <ul className="space-y-1 text-sm">
        {players.map(p => {
          const isMe = p.playerId === mePlayerId;
          const isTurn = p.playerId === currentPlayerId;
          const score = scores[p.playerId] ?? 0;
          return (
            <li
              key={p.playerId}
              className={`flex justify-between items-center px-2 py-1 rounded-md ${isTurn ? 'bg-emerald-600/20' : ''}`}
            >
              <span>
                {p.name}{isMe ? ' (you)' : ''}
                {isTurn && <span className="text-xs text-emerald-300 ml-1">• turn</span>}
              </span>
              <span className="text-xs text-slate-300">
                {score} pts • {p.rackCount} tiles
              </span>
            </li>
          );
        })}
        {players.length === 0 && (
          <li className="text-xs text-slate-400">Waiting for players…</li>
        )}
      </ul>
    </div>
  );
}
