import type { LoadedJourney } from "@living-journeys/engine";
import { PACES } from "@/lib/format";
import { MAP_STYLES, type StyleId } from "@/lib/mapStyles";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** First-of-month marks between two instants, for the timeline's scale. */
function monthMarks(startMs: number, endMs: number): { ms: number; label: string }[] {
  const marks: { ms: number; label: string }[] = [];
  const d = new Date(startMs);
  let cursor = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  while (cursor < endMs) {
    marks.push({ ms: cursor, label: MONTHS[new Date(cursor).getUTCMonth()]! });
    const c = new Date(cursor);
    cursor = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
  }
  return marks;
}

export function Timeline({
  journey,
  virtualMs,
  paused,
  rate,
  styleId,
  onToggle,
  onSeek,
  onSetRate,
  onSetStyle,
  onOverview,
  onSources,
}: {
  journey: LoadedJourney;
  virtualMs: number;
  paused: boolean;
  rate: number;
  styleId: StyleId;
  onToggle: () => void;
  onSeek: (ms: number) => void;
  onSetRate: (rate: number) => void;
  onSetStyle: (id: StyleId) => void;
  onOverview: () => void;
  onSources: () => void;
}) {
  const { startMs, endMs } = journey;
  const span = endMs - startMs;
  const pct = (ms: number) => `${((ms - startMs) / span) * 100}%`;
  const nextStyle: StyleId = styleId === "period" ? "modern" : "period";

  return (
    <div className="card flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={paused ? "Play" : "Pause"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/40 text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        {paused ? (
          <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M3 1.5v13l11-6.5z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
            <path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" />
          </svg>
        )}
      </button>

      <div className="relative h-9 min-w-[220px] flex-1">
        {/* The scale: a hairline, the journey so far, episodes, month marks. */}
        <div className="absolute inset-x-0 top-[8px] h-px bg-ink/35" />
        <div
          className="absolute left-0 top-[7px] h-[3px] bg-carmine"
          style={{ width: pct(virtualMs) }}
        />
        {journey.episodes.map((e) => (
          <div
            key={e.id}
            title={e.title}
            className="absolute top-[3px] h-[11px] border-x border-ink/50 bg-ink/15"
            style={{ left: pct(e.startMs), width: `max(2px, ${((e.endMs - e.startMs) / span) * 100}%)` }}
          />
        ))}
        {monthMarks(startMs, endMs).map((m) => (
          <div key={m.ms} className="absolute top-[8px]" style={{ left: pct(m.ms) }}>
            <div className="h-[5px] w-px bg-ink/45" />
            <div className="caps -translate-x-1/2 pt-0.5 text-[11px] leading-none text-ink-soft">
              {m.label}
            </div>
          </div>
        ))}
        <input
          type="range"
          aria-label="Seek"
          className="seek absolute inset-x-0 top-0"
          min={startMs}
          max={endMs}
          step={600_000}
          value={virtualMs}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </div>

      <label className="flex items-center gap-2">
        <span className="caps text-[12px] text-ink-soft">Pace</span>
        <select
          aria-label="Pace"
          value={rate}
          onChange={(e) => onSetRate(Number(e.target.value))}
          className="cursor-pointer border-b border-ink/40 bg-transparent py-0.5 text-[15px] italic text-ink focus:outline-none"
        >
          {PACES.some((p) => p.rate === rate) ? null : <option value={rate}>Custom</option>}
          {PACES.map((p) => (
            <option key={p.rate} value={p.rate}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center gap-4 text-[15px] italic">
        <button type="button" onClick={onOverview} className="text-ink-soft hover:text-ink">
          Whole campaign
        </button>
        <button
          type="button"
          onClick={() => onSetStyle(nextStyle)}
          className="text-ink-soft hover:text-ink"
        >
          {MAP_STYLES[nextStyle].label}
        </button>
        <button type="button" onClick={onSources} className="text-ink-soft hover:text-ink">
          Sources
        </button>
      </div>
    </div>
  );
}
