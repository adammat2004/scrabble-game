'use client';

import { Socket } from 'socket.io-client';
import { useState } from 'react';

type Bonus = 'TW' | 'DW' | 'TL' | 'DL' | 'NONE';
type Cell = { letter: string | null; bonus: Bonus };

type Placement = { r: number; c: number; letter: string };

type Props = {
  board: Cell[][];
  yourRack: string[];
  myTurn: boolean;
  socket: Socket | null;
  gameId: string;
};

export default function Board({ board, yourRack, myTurn, socket, gameId }: Props) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);

  // Called by Rack.tsx
  const placeLetter = (L: string) => {
    if (!selected) return;
    const { r, c } = selected;

    // Can't place if the cell is occupied
    if (board[r][c].letter) return;

    // Prevent placing more copies of a letter than in rack
    const alreadyUsed = placements.filter((p) => p.letter === L).length;
    const available = yourRack.filter((t) => t === L).length;
    if (alreadyUsed >= available) return;

    setPlacements((prev) => [...prev, { r, c, letter: L }]);
    setSelected(null);
  };

  // Expose a global function so Rack can call it
  (globalThis as any).__PLACE_LETTER__ = placeLetter;

  const onSelect = (r: number, c: number) => {
    if (!myTurn || !socket) return;
    if (board[r][c].letter) return;

    const pending = placements.find((p) => p.r === r && p.c === c);
    if (pending) {
      // Unselect removes a pending placement
      setPlacements((prev) => prev.filter((p) => !(p.r === r && p.c === c)));
      return;
    }

    setSelected({ r, c });
  };

  const submitMove = () => {
    if (!socket || placements.length === 0) return;
    socket.emit('place_tiles', { gameId, placements });
    setPlacements([]);
    setSelected(null);
  };

  const cancel = () => {
    setPlacements([]);
    setSelected(null);
  };

  const getCellView = (cell: Cell, r: number, c: number) => {
    const pending = placements.find((p) => p.r === r && p.c === c);
    const letter = pending?.letter || cell.letter;
    let bg = 'bg-amber-100';
    let label = '';

    if (!letter) {
      if (cell.bonus === 'TW') { bg = 'bg-red-500'; label = 'TW'; }
      else if (cell.bonus === 'DW') { bg = 'bg-pink-400'; label = 'DW'; }
      else if (cell.bonus === 'TL') { bg = 'bg-blue-500'; label = 'TL'; }
      else if (cell.bonus === 'DL') { bg = 'bg-cyan-400'; label = 'DL'; }
      else bg = 'bg-amber-100/80';
    }

    return { letter, label, bg };
  };

  return (
    <div className="space-y-2">
      <div
        className="grid gap-[2px] bg-slate-700 p-[3px] rounded-xl shadow-lg"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const { letter, label, bg } = getCellView(cell, r, c);

            const highlight =
              selected?.r === r && selected?.c === c
                ? 'ring-2 ring-yellow-300'
                : '';

            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onSelect(r, c)}
                className={`w-8 h-8 lg:w-9 lg:h-9 flex flex-col items-center justify-center
                  text-[11px] lg:text-xs font-semibold rounded-sm
                  border border-slate-900 ${bg} ${highlight}`}
              >
                {letter ? (
                  <span className="text-slate-900 text-[15px] font-extrabold drop-shadow-[0_0_1px_rgba(255,255,255,0.8)]">
                    {letter}
                  </span>
                ) : (
                  label && <span className="text-[9px] text-slate-900">{label}</span>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={submitMove}
          disabled={!myTurn || placements.length === 0}
          className="px-3 py-1 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-semibold disabled:opacity-40"
        >
          Submit move
        </button>

        <button
          onClick={cancel}
          className="px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-sm"
        >
          Cancel
        </button>

        {!myTurn && (
          <span className="text-xs text-slate-300">Waiting for your turn…</span>
        )}
      </div>
    </div>
  );
}
