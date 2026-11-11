import { buildRoute, positionAtKm } from "./geo";
import type { Coord, CoordinateSpace, RouteGeometry } from "./geo";
import { solarAt } from "./solar";
import type { SolarState } from "./solar";
import type {
  Journey,
  JourneyCondition,
  JourneyEpisode,
  JourneyMoment,
  JourneyTrack,
} from "./schema";

/**
 * The architectural spine (HANDOFF.md §4): every piece of derived journey state is a
 * pure function of (journeyContent, virtualTime). The frame, desktop viewer, mobile
 * remote, and email digests all call `evaluate` — one implementation, many surfaces.
 */

// --- Loaded (pre-parsed) shapes: ISO strings resolved to epoch ms once. -----------

/** `offsetMs` turns UTC into local mean time at the keyframe's position (geo only). */
type ScheduleMs = { t: number; km: number; label?: string; offsetMs: number };
type MarchWindow = { startMs: number; endMs: number };
type StatSeriesMs = {
  label: string;
  format: string;
  lapses: boolean;
  keyframes: { t: number; v: number }[];
};

export type LoadedTrack = {
  def: JourneyTrack;
  route: RouteGeometry;
  schedule: ScheduleMs[];
  /** The daily marching window, when the track declares a usable one. */
  march?: MarchWindow;
  statSeries: Record<string, StatSeriesMs>;
};

type MsMoment = JourneyMoment & { tMs: number };
type MsEpisode = JourneyEpisode & {
  startMs: number;
  endMs: number;
  beatsMs: { tMs: number; text: string }[];
};
type MsCondition = JourneyCondition & { startMs: number; endMs: number };

export type LoadedJourney = {
  manifest: Journey;
  space: CoordinateSpace;
  startMs: number;
  endMs: number;
  primaryTrackId: string;
  tracks: Record<string, LoadedTrack>;
  moments: MsMoment[];
  episodes: MsEpisode[];
  conditions: MsCondition[];
};

// --- Snapshot shapes --------------------------------------------------------------

export type ActivityState = {
  key: string;
  label: string;
  isHalted: boolean;
  weather?: string;
  /** The active condition's camera hint, if it gave one. */
  zoom?: number;
  episodeId?: string;
};

export type TrackSnapshot = {
  id: string;
  name: string;
  position: Coord;
  headingDeg: number | null;
  distanceKm: number;
  routeFraction: number;
  isHalted: boolean;
  /** False before the track `appears` or after it `leaves`. */
  isPresent: boolean;
  stats: Record<string, number>;
};

export type ActiveEpisode = {
  id: string;
  title: string;
  kind: string;
  /** Progress through the episode, 0..1. */
  progress: number;
  currentBeat: string | null;
};

export type SceneRef = {
  image: string;
  source: "episode" | "state" | "moment";
} | null;

export type JourneySnapshot = {
  virtualMs: number;
  /** Progress through the whole journey timeline, 0..1. */
  progressFraction: number;
  primaryTrackId: string;
  tracks: Record<string, TrackSnapshot>;
  activity: ActivityState;
  solar: SolarState;
  currentMoment: JourneyMoment | null;
  activeEpisode: ActiveEpisode | null;
  scene: SceneRef;
};

// --- Helpers ----------------------------------------------------------------------

const HALT_EPS_KM = 1e-6;

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

/** Linear interpolation over a sorted numeric time series; flat before/after ends. */
function interpValue(points: { t: number; v: number }[], atMs: number): number {
  const n = points.length;
  if (n === 0) return Number.NaN;
  const first = points[0]!;
  if (atMs <= first.t) return first.v;
  const last = points[n - 1]!;
  if (atMs >= last.t) return last.v;
  for (let i = 0; i < n - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    if (atMs >= a.t && atMs <= b.t) {
      const span = b.t - a.t;
      return span > 0 ? a.v + (b.v - a.v) * ((atMs - a.t) / span) : a.v;
    }
  }
  return last.v;
}

const MS_PER_DAY = 86_400_000;

/** "HH:MM" -> milliseconds after local midnight. */
function clockMs(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return ((h ?? 0) * 60 + (m ?? 0)) * 60_000;
}

/** Marching time accumulated between local midnight of day 0 and local instant `x`. */
function marchedBy(x: number, win: MarchWindow): number {
  const day = Math.floor(x / MS_PER_DAY);
  const intoDay = x - day * MS_PER_DAY;
  const span = win.endMs - win.startMs;
  return day * span + Math.max(0, Math.min(span, intoDay - win.startMs));
}

/**
 * Distance along the route and whether the track is standing still.
 *
 * A track is halted before it starts, after it arrives, and across a km plateau. With
 * a daily rhythm it also halts outside the marching window: the distance between two
 * keyframes is covered during marching hours only, so a column bivouacs at night
 * instead of creeping through it. A leg with no marching hours at all (a night march)
 * is covered at a steady pace.
 */
function motionAt(track: LoadedTrack, atMs: number): { km: number; halted: boolean } {
  const { schedule, march } = track;
  const n = schedule.length;
  const first = schedule[0]!;
  const last = schedule[n - 1]!;
  if (atMs <= first.t) return { km: first.km, halted: true };
  if (atMs >= last.t) return { km: last.km, halted: true };
  for (let i = 0; i < n - 1; i++) {
    const a = schedule[i]!;
    const b = schedule[i + 1]!;
    if (atMs < a.t || atMs > b.t) continue;
    const dKm = b.km - a.km;
    const span = b.t - a.t;
    if (dKm < HALT_EPS_KM || span <= 0) return { km: a.km, halted: true };
    if (march) {
      const from = marchedBy(a.t + a.offsetMs, march);
      const total = marchedBy(b.t + a.offsetMs, march) - from;
      if (total > 0) {
        const local = atMs + a.offsetMs;
        const intoDay = local - Math.floor(local / MS_PER_DAY) * MS_PER_DAY;
        return {
          km: a.km + dKm * ((marchedBy(local, march) - from) / total),
          halted: intoDay < march.startMs || intoDay >= march.endMs,
        };
      }
    }
    return { km: a.km + dKm * ((atMs - a.t) / span), halted: false };
  }
  return { km: last.km, halted: true };
}

const ms = (iso: string): number => Date.parse(iso);

function resolveScene(
  journey: Journey,
  activityKey: string,
  phase: string,
  episodeId: string | undefined,
  moment: JourneyMoment | null,
): SceneRef {
  const scenes = journey.scenes;
  if (scenes) {
    if (episodeId && scenes.byEpisode?.[episodeId]) {
      return { image: scenes.byEpisode[episodeId]!, source: "episode" };
    }
    const keyed =
      scenes.byState?.[`${activityKey}/${phase}`] ?? scenes.byState?.[activityKey];
    if (keyed) return { image: keyed, source: "state" };
  }
  if (moment?.image) return { image: moment.image, source: "moment" };
  return null;
}

// --- Public API -------------------------------------------------------------------

/**
 * Resolve a manifest + per-track route coordinates into an evaluatable journey.
 * Route coordinates come from the track's GeoJSON (see `coordsFromGeoJson`).
 */
export function loadJourney(
  manifest: Journey,
  routeCoords: Record<string, Coord[]>,
): LoadedJourney {
  const space = manifest.coordinateSpace;
  const startMs = ms(manifest.time.start);
  const endMs = ms(manifest.time.end);

  const tracks: Record<string, LoadedTrack> = {};
  let primaryTrackId = manifest.tracks[0]!.id;

  for (const def of manifest.tracks) {
    if (def.isPrimary) primaryTrackId = def.id;
    const coords = routeCoords[def.id];
    if (!coords) throw new Error(`loadJourney: missing route coords for track "${def.id}"`);

    const route = buildRoute(coords, space);
    const schedule = def.schedule
      .map((s) => ({
        t: ms(s.t),
        km: s.km,
        label: s.label,
        // Four minutes of clock per degree of longitude.
        offsetMs: space === "geo" ? positionAtKm(route, s.km, space).coord[0] * 240_000 : 0,
      }))
      .sort((a, b) => a.t - b.t);

    let march: MarchWindow | undefined;
    if (def.dailyRhythm) {
      const startMs = clockMs(def.dailyRhythm.marchStartLocal);
      const endMs = clockMs(def.dailyRhythm.marchEndLocal);
      if (endMs > startMs) march = { startMs, endMs };
    }

    const statSeries: Record<string, StatSeriesMs> = {};
    if (def.statSeries) {
      for (const [key, series] of Object.entries(def.statSeries)) {
        statSeries[key] = {
          label: series.label,
          format: series.format,
          lapses: series.lapses ?? false,
          keyframes: series.keyframes
            .map((k) => ({ t: ms(k.t), v: k.v }))
            .sort((a, b) => a.t - b.t),
        };
      }
    }

    tracks[def.id] = { def, route, schedule, march, statSeries };
  }

  const moments: MsMoment[] = manifest.moments
    .map((m) => ({ ...m, tMs: ms(m.t) }))
    .sort((a, b) => a.tMs - b.tMs);

  const episodes: MsEpisode[] = manifest.episodes
    .map((e) => ({
      ...e,
      startMs: ms(e.start),
      endMs: ms(e.end),
      beatsMs: (e.narrativeBeats ?? [])
        .map((b) => ({ tMs: ms(b.t), text: b.text }))
        .sort((a, b) => a.tMs - b.tMs),
    }))
    .sort((a, b) => a.startMs - b.startMs);

  const conditions: MsCondition[] = manifest.conditions
    .map((c) => ({ ...c, startMs: ms(c.start), endMs: ms(c.end) }))
    .sort((a, b) => a.startMs - b.startMs);

  return { manifest, space, startMs, endMs, primaryTrackId, tracks, moments, episodes, conditions };
}

/** Evaluate the full journey state at a virtual time. Pure and O(content size). */
export function evaluate(journey: LoadedJourney, virtualMs: number): JourneySnapshot {
  const { space } = journey;

  const tracks: Record<string, TrackSnapshot> = {};
  for (const [id, track] of Object.entries(journey.tracks)) {
    const { km: distanceKm, halted } = motionAt(track, virtualMs);
    const { coord, headingDeg } = positionAtKm(track.route, distanceKm, space);

    const stats: Record<string, number> = {};
    for (const [key, series] of Object.entries(track.statSeries)) {
      const last = series.keyframes[series.keyframes.length - 1];
      if (series.lapses && last && virtualMs > last.t) continue;
      stats[key] = interpValue(series.keyframes, virtualMs);
    }

    tracks[id] = {
      id,
      name: track.def.name,
      position: coord,
      headingDeg: halted ? null : headingDeg,
      distanceKm,
      routeFraction: track.route.totalKm > 0 ? distanceKm / track.route.totalKm : 0,
      isHalted: halted,
      isPresent:
        (!track.def.appears || virtualMs >= ms(track.def.appears)) &&
        (!track.def.leaves || virtualMs <= ms(track.def.leaves)),
      stats,
    };
  }

  const primary = tracks[journey.primaryTrackId]!;

  const cond = journey.conditions.find((c) => virtualMs >= c.startMs && virtualMs <= c.endMs);
  const episode = journey.episodes.find((e) => virtualMs >= e.startMs && virtualMs <= e.endMs);

  const activity: ActivityState = {
    key: cond?.activityKey ?? (primary.isHalted ? "halt" : "travel"),
    label: cond?.label ?? cond?.activityKey ?? (primary.isHalted ? "Halted" : "Traveling"),
    isHalted: primary.isHalted,
    weather: cond?.weather,
    zoom: cond?.zoom,
    episodeId: episode?.id,
  };

  const solar = solarAt(primary.position, new Date(virtualMs), space);

  let currentMoment: JourneyMoment | null = null;
  for (const m of journey.moments) {
    if (m.tMs <= virtualMs) currentMoment = m;
    else break;
  }

  let activeEpisode: ActiveEpisode | null = null;
  if (episode) {
    let currentBeat: string | null = null;
    for (const beat of episode.beatsMs) {
      if (beat.tMs <= virtualMs) currentBeat = beat.text;
      else break;
    }
    const dur = episode.endMs - episode.startMs;
    activeEpisode = {
      id: episode.id,
      title: episode.title,
      kind: episode.kind,
      progress: dur > 0 ? clamp01((virtualMs - episode.startMs) / dur) : 1,
      currentBeat,
    };
  }

  return {
    virtualMs,
    progressFraction: clamp01((virtualMs - journey.startMs) / (journey.endMs - journey.startMs)),
    primaryTrackId: journey.primaryTrackId,
    tracks,
    activity,
    solar,
    currentMoment,
    activeEpisode,
    scene: resolveScene(journey.manifest, activity.key, solar.phase, episode?.id, currentMoment),
  };
}

/** Moments strictly after `sinceMs` and at/before `untilMs` — for digests & catch-up. */
export function momentsSince(
  journey: LoadedJourney,
  sinceMs: number,
  untilMs: number,
): JourneyMoment[] {
  return journey.moments.filter((m) => m.tMs > sinceMs && m.tMs <= untilMs);
}
