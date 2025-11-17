'use client';

export default function BonusLegend() {
  const item = (label: string, desc: string, bg: string) => (
    <div className="flex items-center gap-1 text-[10px]" key={label}>
      <div className={`w-4 h-4 rounded-sm border border-slate-900 ${bg}`} />
      <span className="text-slate-200">{label}</span>
      <span className="text-slate-400">({desc})</span>
    </div>
  );

  return (
    <div className="hidden lg:flex flex-col gap-1 text-[10px] bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
      {item('TW', 'triple word', 'bg-red-500')}
      {item('DW', 'double word', 'bg-pink-400')}
      {item('TL', 'triple letter', 'bg-blue-500')}
      {item('DL', 'double letter', 'bg-cyan-400')}
    </div>
  );
}
