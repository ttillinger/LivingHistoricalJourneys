import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoute, JourneySchema, type Coord } from "@living-journeys/engine";

/**
 * Content build: turns authoring sources into validated journey manifests.
 *
 * Two input modes, both producing the same output (`journey.json` + `routes/*.geojson`):
 *   - "authoring": a hand-authored `authoring.json` with per-track `vertices`
 *     ([lon,lat] + optional date/label). Dated vertices become schedule keyframes;
 *     km is computed from the route geometry so schedule and geometry can never drift.
 *     When a `roads.json` (from `scripts/trace-roads.ts`) sits beside it, each leg
 *     between two vertices follows the traced road instead of a straight line.
 *   - "poc": a legacy POC `poc-seed.json`, mechanically ported (HANDOFF.md §13, Phase 1).
 *
 * Run with `pnpm --filter @living-journeys/content build`. Outputs are committed.
 */

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const journeysDir = resolve(scriptDir, "..", "journeys");

type Vertex = { lon: number; lat: number; t?: string; label?: string; straight?: boolean };

/** Traced road geometry per track, keyed by "lon,lat;lon,lat" of the leg's two vertices. */
type Roads = Record<string, Record<string, Coord[]>>;

type StatSeries = {
  label: string;
  format: string;
  initial?: number;
  keyframes: { t: string; v: number }[];
};

type AuthoringTrack = {
  id: string;
  name: string;
  kind: string;
  color?: string;
  isPrimary?: boolean;
  dailyRhythm?: { marchStartLocal: string; marchEndLocal: string };
  vertices: Vertex[];
  statSeries?: Record<string, StatSeries>;
};

type AuthoringJourney = {
  id: string;
  version: number;
  title: string;
  description?: string;
  tier: "free" | "premium";
  coordinateSpace?: "geo" | "image";
  time: { start: string; end: string };
  mapDefaults?: { bounds?: number[]; styles?: string[] };
  tracks: AuthoringTrack[];
  moments?: unknown[];
  episodes?: unknown[];
  conditions?: unknown[];
  scenes?: unknown;
  labelsOverlay?: string;
  attribution?: string[];
  sources?: string[];
  bibliography?: unknown[];
  notes?: string[];
};

const round = (n: number, dp = 2): number => Number(n.toFixed(dp));

function assembleTrack(track: AuthoringTrack, space: "geo" | "image", roads: Roads) {
  // Dense geometry: each authored vertex, with the traced road (if any) between it
  // and the next. `vertexIndex[i]` is where authored vertex i sits in `coords`.
  const coords: Coord[] = [];
  const vertexIndex: number[] = [];
  track.vertices.forEach((v, i) => {
    vertexIndex.push(coords.length);
    coords.push([v.lon, v.lat]);
    const next = track.vertices[i + 1];
    if (!next) return;
    const leg = roads[track.id]?.[`${v.lon},${v.lat};${next.lon},${next.lat}`];
    if (leg) coords.push(...leg);
  });
  const { cumKm } = buildRoute(coords, space);
  const schedule = track.vertices
    .map((v, i) =>
      v.t ? { t: v.t, km: round(cumKm[vertexIndex[i]!] ?? 0), label: v.label } : null,
    )
    .filter((s): s is { t: string; km: number; label: string | undefined } => s !== null);

  if (schedule.length < 2) {
    throw new Error(`track "${track.id}" needs >= 2 dated vertices, got ${schedule.length}`);
  }

  const { vertices: _vertices, ...rest } = track;
  return {
    manifestTrack: { ...rest, isPrimary: track.isPrimary ?? false, route: `routes/${track.id}.geojson`, schedule },
    coords,
  };
}

function toGeoJson(coords: Coord[], name: string): string {
  return JSON.stringify(
    {
      type: "Feature",
      properties: { name },
      geometry: { type: "LineString", coordinates: coords },
    },
    null,
    2,
  );
}

/** Map a legacy POC seed into the authoring shape. */
function fromPoc(slug: string, poc: PocJourney): AuthoringJourney {
  const sw = poc.mapBounds?.southWest;
  const ne = poc.mapBounds?.northEast;
  return {
    id: slug,
    version: 1,
    title: poc.name,
    description: poc.description,
    tier: "premium", // Napoleon is the only free journey; the rest are premium.
    coordinateSpace: "geo",
    time: poc.time,
    mapDefaults: {
      ...(sw && ne ? { bounds: [sw[1], sw[0], ne[1], ne[0]] } : {}),
      styles: ["modern", "atlas"],
    },
    tracks: poc.tracks.map((t, i) => ({
      id: t.id.replace(/_/g, "-"),
      name: t.name,
      kind: t.type,
      ...(t.style?.color ? { color: t.style.color } : {}),
      isPrimary: i === 0,
      vertices: t.points.map((p) => ({ lon: p.lon, lat: p.lat, t: p.time, label: p.label })),
    })),
    moments: (poc.moments ?? []).map((m) => ({
      t: m.time,
      title: m.title,
      body: m.text,
      tags: [],
      significance: 2,
    })),
    conditions: (poc.paceSegments ?? []).map((s) => ({
      start: s.start,
      end: s.end,
      activityKey: s.key,
      label: s.activity,
      ...(s.weather ? { weather: s.weather } : {}),
    })),
    episodes: [],
    attribution: ["Living Historical Journeys — mechanically ported from the proof of concept."],
    sources: [],
  };
}

type PocJourney = {
  name: string;
  description?: string;
  time: { start: string; end: string };
  mapBounds?: { southWest: [number, number]; northEast: [number, number] };
  moments?: { time: string; title: string; text: string }[];
  paceSegments?: { start: string; end: string; activity: string; key: string; weather?: string }[];
  tracks: {
    id: string;
    name: string;
    type: string;
    style?: { color?: string };
    points: { time: string; lat: number; lon: number; label?: string }[];
  }[];
};

function buildJourney(slug: string): void {
  const dir = join(journeysDir, slug);
  const authoringPath = join(dir, "authoring.json");
  const pocPath = join(dir, "poc-seed.json");

  let authoring: AuthoringJourney;
  if (existsSync(authoringPath)) {
    authoring = JSON.parse(readFileSync(authoringPath, "utf8")) as AuthoringJourney;
  } else if (existsSync(pocPath)) {
    authoring = fromPoc(slug, JSON.parse(readFileSync(pocPath, "utf8")) as PocJourney);
  } else {
    throw new Error(`${slug}: no authoring.json or poc-seed.json found`);
  }

  const space = authoring.coordinateSpace ?? "geo";
  const roadsPath = join(dir, "roads.json");
  const roads: Roads = existsSync(roadsPath)
    ? (JSON.parse(readFileSync(roadsPath, "utf8")) as Roads)
    : {};
  const labelsPath = join(dir, "labels.json");
  const labels: unknown = existsSync(labelsPath)
    ? JSON.parse(readFileSync(labelsPath, "utf8"))
    : [];
  const manifestTracks = [];
  const geojsonByTrack: Record<string, string> = {};
  const routeCoords: Record<string, Coord[]> = {};
  for (const track of authoring.tracks) {
    const { manifestTrack, coords } = assembleTrack(track, space, roads);
    manifestTracks.push(manifestTrack);
    geojsonByTrack[track.id] = toGeoJson(coords, `${authoring.title} — ${track.name}`);
    routeCoords[track.id] = coords;
  }

  const { tracks: _authoringTracks, ...journeyRest } = authoring;
  // Fail the build on any schema violation, so committed manifests are always valid.
  // The parsed form is what gets written, so schema defaults are always present.
  const manifest = JourneySchema.parse({
    ...journeyRest,
    coordinateSpace: space,
    tracks: manifestTracks,
  });

  writeFileSync(join(dir, "journey.json"), JSON.stringify(manifest, null, 2) + "\n");
  const routesDir = join(dir, "routes");
  mkdirSync(routesDir, { recursive: true });
  for (const [trackId, geojson] of Object.entries(geojsonByTrack)) {
    writeFileSync(join(routesDir, `${trackId}.geojson`), geojson + "\n");
  }

  // App-facing bundle: manifest + resolved route coordinates, ready for loadJourney().
  writeFileSync(join(dir, "bundle.json"), JSON.stringify({ manifest, routeCoords, labels }) + "\n");

  const primary = manifestTracks.find((t) => t.isPrimary) ?? manifestTracks[0];
  console.log(
    `✓ ${slug}: ${manifestTracks.length} track(s), ` +
      `${primary?.schedule.length ?? 0} schedule keyframes (primary), ` +
      `${Object.values(routeCoords).reduce((n, c) => n + c.length, 0)} route vertices, ` +
      `${manifest.moments.length} moments`,
  );
}

const SLUGS = ["napoleon-1812", "oregon-trail-1843", "shackleton-1914", "silk-road-1300"];

let built = 0;
for (const slug of SLUGS) {
  const dir = join(journeysDir, slug);
  if (!existsSync(dir)) {
    console.warn(`- ${slug}: directory missing, skipped`);
    continue;
  }
  buildJourney(slug);
  built++;
}
console.log(`\ncontent: built ${built} journey(s).`);
