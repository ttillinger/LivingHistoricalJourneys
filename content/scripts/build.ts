import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoute, JourneySchema, type Coord } from "@living-journeys/engine";

/**
 * Content build: turns authoring sources into validated journey manifests.
 *
 * Input is a hand-authored `authoring.json` with per-track `vertices` ([lon,lat] +
 * optional date/label). Dated vertices become schedule keyframes; km is computed from
 * the route geometry so schedule and geometry can never drift. When a `roads.json`
 * (from `scripts/trace-roads.ts`) sits beside it, each leg between two vertices
 * follows the traced line instead of a straight one.
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
  lapses?: boolean;
  keyframes: { t: string; v: number }[];
};

type AuthoringTrack = {
  id: string;
  name: string;
  kind: string;
  color?: string;
  isPrimary?: boolean;
  dailyRhythm?: { marchStartLocal: string; marchEndLocal: string };
  appears?: string;
  leaves?: string;
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
  mapDefaults?: { bounds?: number[]; styles?: string[]; followZoom?: number };
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

function buildJourney(slug: string): void {
  const dir = join(journeysDir, slug);
  const authoringPath = join(dir, "authoring.json");
  if (!existsSync(authoringPath)) throw new Error(`${slug}: no authoring.json found`);
  const authoring = JSON.parse(readFileSync(authoringPath, "utf8")) as AuthoringJourney;

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

const SLUGS = ["napoleon-1812", "oregon-trail-1843", "rubruck-1253", "shackleton-1914"];

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
