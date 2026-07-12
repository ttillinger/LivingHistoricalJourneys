import { z } from "zod";

/**
 * Journey content schema (HANDOFF.md §5). Authored as files in `content/journeys/`
 * and validated in CI. This is an intentionally partial-but-real subset for Phase 0;
 * later phases extend it (episodes beats, conditions, scenes manifest, labels, ...).
 */

export const IsoDateTime = z.string().datetime({ offset: true });

export const CoordinateSpaceSchema = z.enum(["geo", "image"]);
export const Tier = z.enum(["free", "premium"]);

export const ScheduleKeyframe = z.object({
  /** Timestamp of this keyframe. */
  t: IsoDateTime,
  /** Kilometres travelled along the route at time `t`. Plateaus model halts. */
  km: z.number().nonnegative(),
  label: z.string().optional(),
});

export const StatKeyframe = z.object({ t: IsoDateTime, v: z.number() });

export const StatSeries = z.object({
  label: z.string(),
  /** Display format hint, e.g. "men" | "celsius". Renderers stay generic. */
  format: z.string(),
  initial: z.number().optional(),
  keyframes: z.array(StatKeyframe).min(1),
});

export const DailyRhythm = z.object({
  marchStartLocal: z.string(),
  marchEndLocal: z.string(),
});

export const Track = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  /** Renderer hint only; the engine ignores it. */
  color: z.string().optional(),
  isPrimary: z.boolean().default(false),
  /** Path (relative to the journey dir) to a dense route LineString GeoJSON. */
  route: z.string().min(1),
  /** time -> km-along-route keyframes; the schedule is separate from the geometry. */
  schedule: z.array(ScheduleKeyframe).min(2),
  dailyRhythm: DailyRhythm.optional(),
  /** Generic per-track stats (strength, temperature, oxen, drift, ...). */
  statSeries: z.record(z.string(), StatSeries).optional(),
});

export const Moment = z.object({
  t: IsoDateTime,
  title: z.string().min(1),
  body: z.string().optional(),
  tags: z.array(z.string()).default([]),
  significance: z.number().int().min(1).max(3).optional(),
  image: z.string().optional(),
});

export const NarrativeBeat = z.object({ t: IsoDateTime, text: z.string().min(1) });

export const Episode = z.object({
  id: z.string().min(1),
  start: IsoDateTime,
  end: IsoDateTime,
  kind: z.string().min(1),
  title: z.string().min(1),
  narrativeBeats: z.array(NarrativeBeat).optional(),
});

/** Weather/ambient periods (the POC's `paceSegments`, generalized). */
export const Condition = z.object({
  start: IsoDateTime,
  end: IsoDateTime,
  /** Activity key, e.g. "march" | "camp" | "retreat" | "battle" | "disaster". */
  activityKey: z.string().min(1),
  label: z.string().optional(),
  weather: z.string().optional(),
});

/**
 * Scene imagery manifest (HANDOFF.md §9). Curated stills, not sprites. Full
 * resolution lands in Phase 5; the shape is here so the engine can already resolve a
 * scene ref when assets exist.
 */
export const SceneManifest = z.object({
  /** Keyed by "activityKey" or "activityKey/solarPhase" -> image path. */
  byState: z.record(z.string(), z.string()).optional(),
  /** Keyed by episode id -> image path. */
  byEpisode: z.record(z.string(), z.string()).optional(),
});

export const MapDefaults = z.object({
  bounds: z.array(z.number()).optional(),
  styles: z.array(z.string()).optional(),
});

export const JourneySchema = z
  .object({
    id: z.string().min(1),
    /** Bump on content edits; runs pin a version so they don't shift underfoot. */
    version: z.number().int().positive(),
    title: z.string().min(1),
    description: z.string().optional(),
    tier: Tier,
    coordinateSpace: CoordinateSpaceSchema.default("geo"),
    time: z.object({ start: IsoDateTime, end: IsoDateTime }),
    mapDefaults: MapDefaults.optional(),
    tracks: z.array(Track).min(1),
    moments: z.array(Moment).default([]),
    episodes: z.array(Episode).default([]),
    conditions: z.array(Condition).default([]),
    scenes: SceneManifest.optional(),
    labelsOverlay: z.string().optional(),
    attribution: z.array(z.string()).default([]),
    sources: z.array(z.string()).default([]),
  })
  .strict();

export type Journey = z.infer<typeof JourneySchema>;
export type JourneyTrack = z.infer<typeof Track>;
export type JourneyMoment = z.infer<typeof Moment>;
export type JourneyEpisode = z.infer<typeof Episode>;
export type JourneyCondition = z.infer<typeof Condition>;

/** Parse and validate raw journey content, throwing on any schema violation. */
export function parseJourney(raw: unknown): Journey {
  return JourneySchema.parse(raw);
}
