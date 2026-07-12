import type { ActivityState, SolarState } from "@living-journeys/engine";
import { dayNumber, formatVirtualDate } from "@/lib/format";

const PHASE_ICON: Record<SolarState["phase"], string> = {
  dawn: "🌅",
  day: "☀️",
  dusk: "🌆",
  night: "🌙",
};

export function DateBar({
  virtualMs,
  startMs,
  activity,
  solar,
}: {
  virtualMs: number;
  startMs: number;
  activity: ActivityState;
  solar: SolarState;
}) {
  const { date, time } = formatVirtualDate(virtualMs);
  const day = dayNumber(startMs, virtualMs);

  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-neutral-900/70 px-5 py-2.5 text-center text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight">{date}</span>
        <span className="font-mono text-sm text-white/60">{time} UTC</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-white/70">
        <span className="font-medium text-white/90">Day {day}</span>
        <span aria-hidden>·</span>
        <span>{activity.label}</span>
        {activity.weather ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-white/60">{activity.weather}</span>
          </>
        ) : null}
        <span aria-hidden className="ml-1" title={solar.phase}>
          {PHASE_ICON[solar.phase]}
        </span>
      </div>
    </div>
  );
}
