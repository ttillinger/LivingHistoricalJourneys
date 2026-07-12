import Link from "next/link";
import { MAP_STYLES, STYLE_IDS, type StyleId } from "@/components/map/styles";
import { formatRate } from "@/lib/format";

const RATE_PRESETS = [
  { label: "1×", value: 1 },
  { label: "1 hr/s", value: 3_600 },
  { label: "6 hr/s", value: 21_600 },
  { label: "1 day/s", value: 86_400 },
  { label: "3 day/s", value: 259_200 },
];

export function Controls({
  title,
  paused,
  rate,
  onToggle,
  onSetRate,
  virtualMs,
  startMs,
  endMs,
  onSeek,
  styleId,
  onSetStyle,
}: {
  title: string;
  paused: boolean;
  rate: number;
  onToggle: () => void;
  onSetRate: (rate: number) => void;
  virtualMs: number;
  startMs: number;
  endMs: number;
  onSeek: (ms: number) => void;
  styleId: StyleId;
  onSetStyle: (id: StyleId) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-neutral-950/90 to-transparent px-4 pb-4 pt-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        <input
          type="range"
          aria-label="Seek"
          min={startMs}
          max={endMs}
          step={3_600_000}
          value={virtualMs}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full accent-amber-400"
        />

        <div className="flex flex-wrap items-center justify-between gap-3 text-white">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20"
            >
              ← Journeys
            </Link>
            <span className="truncate text-sm font-medium text-white/90">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-lg text-neutral-900 shadow-lg transition-transform hover:scale-105"
              aria-label={paused ? "Play" : "Pause"}
            >
              {paused ? "▶" : "❚❚"}
            </button>
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              {RATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => onSetRate(preset.value)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                    rate === preset.value
                      ? "bg-white text-neutral-900"
                      : "text-white/70 hover:bg-white/10"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <span className="hidden w-24 text-xs text-white/50 sm:inline">{formatRate(rate)}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            {STYLE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onSetStyle(id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  styleId === id ? "bg-white text-neutral-900" : "text-white/70 hover:bg-white/10"
                }`}
              >
                {MAP_STYLES[id].label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
