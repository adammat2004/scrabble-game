'use client';

type Props = {
  rack: string[];
};

export default function Rack({ rack }: Props) {
  const choose = (L: string) => {
    const fn = (globalThis as any).__PLACE_LETTER__;
    if (typeof fn === 'function') fn(L);
  };

  return (
    <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
      <div className="font-medium mb-2 text-sm">Your rack</div>

      <div className="flex flex-wrap gap-2">
        {rack.map((l, i) => (
          <button
            key={i}
            onClick={() => choose(l)}
            className="w-9 h-9 bg-amber-300 border border-amber-700 flex items-center
              justify-center rounded shadow text-sm font-extrabold text-slate-900
              active:scale-95 transition"
          >
            {l}
          </button>
        ))}

        {rack.length === 0 && (
          <span className="text-xs text-slate-400">No tiles (bag might be empty)</span>
        )}
      </div>
    </div>
  );
}
