import type { JourneyMoment } from "@living-journeys/engine";

export function MomentCard({ moment }: { moment: JourneyMoment | null }) {
  if (!moment) return null;
  const major = (moment.significance ?? 1) >= 3;

  return (
    <div className="pointer-events-none absolute bottom-28 left-4 z-10 max-w-sm rounded-2xl bg-neutral-900/75 px-4 py-3 text-white shadow-xl ring-1 ring-white/10 backdrop-blur">
      <div className="flex items-center gap-2">
        {major ? (
          <span className="rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
            Key moment
          </span>
        ) : null}
        <h3 className="text-sm font-semibold">{moment.title}</h3>
      </div>
      {moment.body ? (
        <p className="mt-1 text-sm leading-snug text-white/75">{moment.body}</p>
      ) : null}
    </div>
  );
}
