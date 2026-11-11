const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

/** "7 September 1812" — the virtual date, in UTC. */
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "24 June 2027" — a real-world date, on the reader's own calendar. */
export function formatRealDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Local mean time at a longitude — 1812 had no time zones, so the clock an officer
 * carried read the sun's time where he stood (4 minutes per degree east).
 */
export function formatLocalTime(ms: number, lon: number): string {
  const local = new Date(ms + (lon / 15) * MS_PER_HOUR);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  const suffix = h < 12 ? "in the morning" : h < 18 ? "in the afternoon" : "in the evening";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const night = h >= 22 || h < 4;
  return `${hour12}:${String(m).padStart(2, "0")} ${night ? "at night" : suffix}`;
}

/** 1-based day number within the journey. */
export function dayNumber(startMs: number, nowMs: number): number {
  return Math.floor((nowMs - startMs) / MS_PER_DAY) + 1;
}

/** Format a stat value using the series' `format` hint. */
export function formatStat(value: number, format: string): string {
  const rounded = Math.round(value);
  if (format === "celsius") return `${rounded < 0 ? "−" : ""}${Math.abs(rounded)}°C`;
  return rounded.toLocaleString("en-US");
}

/** The unit word that follows a stat value, if any. */
export function statUnit(format: string): string {
  return format === "men" ? "men" : "";
}

export const PACES: { label: string; rate: number }[] = [
  { label: "Real time", rate: 1 },
  { label: "1 hour a second", rate: 3_600 },
  { label: "6 hours a second", rate: 21_600 },
  { label: "1 day a second", rate: 86_400 },
  { label: "1 week a second", rate: 604_800 },
];
