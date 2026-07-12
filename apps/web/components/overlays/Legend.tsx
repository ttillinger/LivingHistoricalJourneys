export type LegendTrack = { id: string; name: string; color: string };

export function Legend({
  tracks,
  followId,
  onFollow,
}: {
  tracks: LegendTrack[];
  followId: string;
  onFollow: (id: string) => void;
}) {
  return (
    <div className="absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-2xl bg-neutral-900/70 px-3 py-2 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
      {tracks.map((t) => {
        const active = t.id === followId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onFollow(t.id)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition-colors ${
              active ? "bg-white/15" : "hover:bg-white/10"
            }`}
            aria-label={`Follow ${t.name}`}
            aria-pressed={active}
            title={`Follow ${t.name}`}
          >
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/40"
              style={{ backgroundColor: t.color }}
            />
            <span className={active ? "font-medium" : "text-white/80"}>{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}
