import type { Coord, CoordinateSpace } from "./geo";

/**
 * Day/night at a position and instant — the fix for the POC's crude UTC-hour night
 * detection (HANDOFF.md §2). Winter-retreat nights at high latitude come out
 * properly long. Self-contained (no dependency): a low-precision solar-position
 * algorithm (after NOAA/Meeus), accurate to well within the ~1° needed to classify
 * day / civil-twilight / night, and valid across the historical centuries we cover.
 */

export type SolarPhase = "dawn" | "day" | "dusk" | "night";

export type SolarState = {
  phase: SolarPhase;
  isNight: boolean;
  /** Sun altitude above the horizon, in degrees. */
  altitudeDeg: number;
};

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;
const norm360 = (deg: number): number => ((deg % 360) + 360) % 360;

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86_400_000;

/** Sun altitude in degrees at a geographic position and time. */
export function sunAltitudeDeg(lat: number, lon: number, date: Date): number {
  const d = (date.getTime() - J2000_MS) / MS_PER_DAY;

  const meanLon = norm360(280.46 + 0.9856474 * d);
  const meanAnom = toRad(norm360(357.528 + 0.9856003 * d));
  const eclLon = toRad(
    meanLon + 1.915 * Math.sin(meanAnom) + 0.02 * Math.sin(2 * meanAnom),
  );
  const obliquity = toRad(23.439 - 0.0000004 * d);

  const rightAsc = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclLon),
    Math.cos(eclLon),
  );
  const decl = Math.asin(Math.sin(obliquity) * Math.sin(eclLon));

  const gmst = norm360(280.46061837 + 360.98564736629 * d);
  const hourAngle = toRad(norm360(gmst + lon) - toDeg(rightAsc));

  const latRad = toRad(lat);
  const altitude = Math.asin(
    Math.sin(latRad) * Math.sin(decl) +
      Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle),
  );
  return toDeg(altitude);
}

function classify(altitudeDeg: number, rising: boolean): SolarPhase {
  if (altitudeDeg > -0.833) return "day"; // sun's upper limb at/above horizon
  if (altitudeDeg > -6) return rising ? "dawn" : "dusk"; // civil twilight
  return "night";
}

/**
 * Solar state at a track's current position. For image-space (fictional) journeys
 * there is no real sun, so a neutral synthetic day/night cycle from UTC hour is used.
 */
export function solarAt(
  coord: Coord,
  date: Date,
  space: CoordinateSpace = "geo",
): SolarState {
  if (space !== "geo") {
    const h = date.getUTCHours() + date.getUTCMinutes() / 60;
    const phase: SolarPhase =
      h < 5 || h >= 21 ? "night" : h < 7 ? "dawn" : h < 19 ? "day" : "dusk";
    return { phase, isNight: phase === "night", altitudeDeg: 0 };
  }

  const [lon, lat] = coord;
  const altitudeDeg = sunAltitudeDeg(lat, lon, date);
  const rising = sunAltitudeDeg(lat, lon, new Date(date.getTime() + 600_000)) > altitudeDeg;
  const phase = classify(altitudeDeg, rising);
  return { phase, isNight: phase === "night", altitudeDeg };
}
