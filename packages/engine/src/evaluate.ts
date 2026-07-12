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

type ScheduleMs = { t: number; km: number; label?: string };
type StatSeriesMs = {
  label: string;
  format: string;
  keyframes: { t: number; v: number }[];
};

export type LoadedTrack = {
  def: JourneyTrack;
  route: RouteGeometry;
  schedule: ScheduleMs[];
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

/** Distance travelled along the route at a given time. */
function kmAt(schedule: ScheduleMs[], atMs: number): number {
  return interpValue(
    schedule.map((s) => ({ t: s.t, v: s.km })),
    atMs,
  );
}

/** A track is halted before it starts, after it arrives, or across a km plateau. */
function isHalted(schedule: ScheduleMs[], atMs: number): boolean {
  const n = schedule.length;
  const first = schedule[0]!;
  const last = schedule[n - 1]!;
  if (atMs <= first.t || atMs >= last.t) return true;
  for (let i = 0; i < n - 1; i++) {
    const a = schedule[i]!;
    const b = schedule[i + 1]!;
    if (atMs >= a.t && atMs <= b.t) return b.km - a.km < HALT_EPS_KM;
  }
  return true;
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

    const schedule = def.schedule
      .map((s) => ({ t: ms(s.t), km: s.km, label: s.label }))
      .sort((a, b) => a.t - b.t);

    const statSeries: Record<string, StatSeriesMs> = {};
    if (def.statSeries) {
      for (const [key, series] of Object.entries(def.statSeries)) {
        statSeries[key] = {
          label: series.label,
          format: series.format,
          keyframes: series.keyframes
            .map((k) => ({ t: ms(k.t), v: k.v }))
            .sort((a, b) => a.t - b.t),
        };
      }
    }

    tracks[def.id] = { def, route: buildRoute(coords, space), schedule, statSeries };
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
    const distanceKm = kmAt(track.schedule, virtualMs);
    const halted = isHalted(track.schedule, virtualMs);
    const { coord, headingDeg } = positionAtKm(track.route, distanceKm, space);

    const stats: Record<string, number> = {};
    for (const [key, series] of Object.entries(track.statSeries)) {
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
