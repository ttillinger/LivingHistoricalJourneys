export type StatEntry = { label: string; display: string };

export function StatsPanel({ entries }: { entries: StatEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col gap-2 rounded-2xl bg-neutral-900/70 px-4 py-3 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/50">
            {e.label}
          </span>
          <span className="font-mono text-lg font-semibold tabular-nums">{e.display}</span>
        </div>
      ))}
    </div>
  );
}
