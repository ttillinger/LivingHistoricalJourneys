const MS_PER_DAY = 86_400_000;

/** Virtual (in-journey) date and time, always rendered in UTC. */
export function formatVirtualDate(ms: number): { date: string; time: string } {
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    time: d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }),
  };
}

/** 1-based day number within the journey. */
export function dayNumber(startMs: number, nowMs: number): number {
  return Math.floor((nowMs - startMs) / MS_PER_DAY) + 1;
}

/** Format a stat value using the series' `format` hint. */
export function formatStat(value: number, format: string): string {
  const rounded = Math.round(value);
  switch (format) {
    case "celsius":
      return `${rounded}°C`;
    case "men":
    default:
      return rounded.toLocaleString("en-US");
  }
}

const RATE_LABELS: { threshold: number; label: (r: number) => string }[] = [
  { threshold: 1, label: () => "1× (real time)" },
  { threshold: 3600, label: (r) => `${Math.round(r / 60)} min/s` },
  { threshold: 86_400, label: (r) => `${Math.round(r / 3600)} hr/s` },
  { threshold: Infinity, label: (r) => `${Math.round(r / 86_400)} day/s` },
];

/** Human label for a playback rate multiplier. */
export function formatRate(rate: number): string {
  for (const { threshold, label } of RATE_LABELS) {
    if (rate <= threshold) return label(rate);
  }
  return `${rate}×`;
}
