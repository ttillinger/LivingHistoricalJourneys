import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { haversineKm, type Coord } from "@living-journeys/engine";

/**
 * Road tracing: turns a track's sparse authored vertices into a dense, road-following
 * route (HANDOFF.md §5, §12 — "200+ vertices following actual roads").
 *
 * For each pair of consecutive vertices it asks the public OSRM server for the road
 * path between them, simplifies it, and writes `roads.json` next to `authoring.json`.
 * The file is committed; `content:build` reads it, so builds stay offline and
 * deterministic. Re-run only when vertices move:
 *
 *   pnpm --filter @living-journeys/content trace napoleon-1812
 *
 * Modern roads stand in for period ones. A leg falls back to a straight line when the
 * vertex is marked `"straight": true` (a ford or pontoon bridge with no modern
 * crossing) or when the road path is an implausible detour.
 *
 * A journey that has a surveyed line of its own puts it beside `authoring.json` as
 * `trail.geojson` (LineString or MultiLineString). Legs are then cut from that line
 * instead of asked of OSRM, and a leg whose ends are not both near it is straight.
 */

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const journeysDir = resolve(scriptDir, "..", "journeys");

const OSRM = "https://router.project-osrm.org/route/v1/driving";
const SIMPLIFY_KM = 0.12;
const MAX_DETOUR = 1.7;
/** A vertex further than this from the surveyed trail is not on it. */
const TRAIL_SNAP_KM = 12;
/** Ends of two trail pieces closer than this are the same place. */
const TRAIL_JOIN_KM = 0.6;

type Vertex = { lon: number; lat: number; straight?: boolean };
type Authoring = { tracks: { id: string; vertices: Vertex[] }[] };
export type RoadsFile = Record<string, Record<string, Coord[]>>;

const key = (a: Vertex, b: Vertex): string => `${a.lon},${a.lat};${b.lon},${b.lat}`;

/** Perpendicular distance from p to segment a-b, in km (small-area planar approximation). */
function offsetKm(p: Coord, a: Coord, b: Coord): number {
  const kx = 111.32 * Math.cos((p[1] * Math.PI) / 180);
  const ky = 110.57;
  const ax = (a[0] - p[0]) * kx;
  const ay = (a[1] - p[1]) * ky;
  const bx = (b[0] - p[0]) * kx;
  const by = (b[1] - p[1]) * ky;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const f = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
  return Math.hypot(ax + dx * f, ay + dy * f);
}

/** Douglas–Peucker simplification. */
function simplify(coords: Coord[], toleranceKm: number): Coord[] {
  if (coords.length < 3) return coords;
  const keep = new Uint8Array(coords.length);
  keep[0] = 1;
  keep[coords.length - 1] = 1;
  const stack: [number, number][] = [[0, coords.length - 1]];
  while (stack.length > 0) {
    const [lo, hi] = stack.pop()!;
    let worst = 0;
    let index = -1;
    for (let i = lo + 1; i < hi; i++) {
      const d = offsetKm(coords[i]!, coords[lo]!, coords[hi]!);
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (index >= 0 && worst > toleranceKm) {
      keep[index] = 1;
      stack.push([lo, index], [index, hi]);
    }
  }
  return coords.filter((_, i) => keep[i] === 1);
}

const lengthKm = (coords: Coord[]): number =>
  coords.reduce((sum, c, i) => (i === 0 ? 0 : sum + haversineKm(coords[i - 1]!, c)), 0);

async function roadLeg(a: Vertex, b: Vertex): Promise<Coord[] | null> {
  const url = `${OSRM}/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson`;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const body = (await res.json()) as { routes?: { geometry: { coordinates: Coord[] } }[] };
        return body.routes?.[0]?.geometry.coordinates ?? null;
      }
    } catch {
      // fall through to retry
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return null;
}

type Trail = { points: Coord[]; edges: [number, number][][] };

/** Load a surveyed trail as a graph: every point a node, joined along and between pieces. */
function loadTrail(path: string): Trail {
  const geo = JSON.parse(readFileSync(path, "utf8")) as {
    features: { geometry: { type: string; coordinates: Coord[] | Coord[][] } }[];
  };
  const pieces = geo.features.flatMap((f) =>
    f.geometry.type === "MultiLineString"
      ? (f.geometry.coordinates as Coord[][])
      : [f.geometry.coordinates as Coord[]],
  );
  const points: Coord[] = [];
  const edges: [number, number][][] = [];
  const link = (a: number, b: number) => {
    const km = haversineKm(points[a]!, points[b]!);
    edges[a]!.push([b, km]);
    edges[b]!.push([a, km]);
  };
  const ends: number[] = [];
  for (const piece of pieces) {
    piece.forEach((c, i) => {
      points.push(c);
      edges.push([]);
      if (i > 0) link(points.length - 2, points.length - 1);
    });
    ends.push(points.length - piece.length, points.length - 1);
  }
  // A piece's end joins the nearest point of any other piece that passes close by.
  for (const end of ends) {
    for (let i = 0; i < points.length; i++) {
      if (i !== end && haversineKm(points[end]!, points[i]!) < TRAIL_JOIN_KM) link(end, i);
    }
  }
  return { points, edges };
}

function nearest(trail: Trail, v: Vertex): { index: number; km: number } {
  let index = 0;
  let km = Infinity;
  trail.points.forEach((p, i) => {
    const d = haversineKm(p, [v.lon, v.lat]);
    if (d < km) {
      km = d;
      index = i;
    }
  });
  return { index, km };
}

/** Shortest way along the trail between two of its points (Dijkstra), or null. */
function alongTrail(trail: Trail, from: number, to: number): Coord[] | null {
  const dist = new Float64Array(trail.points.length).fill(Infinity);
  const prev = new Int32Array(trail.points.length).fill(-1);
  const done = new Uint8Array(trail.points.length);
  dist[from] = 0;
  const queue: number[] = [from];
  while (queue.length > 0) {
    let best = 0;
    for (let i = 1; i < queue.length; i++) if (dist[queue[i]!]! < dist[queue[best]!]!) best = i;
    const node = queue.splice(best, 1)[0]!;
    if (done[node]) continue;
    done[node] = 1;
    if (node === to) break;
    for (const [next, km] of trail.edges[node]!) {
      if (dist[node]! + km < dist[next]!) {
        dist[next] = dist[node]! + km;
        prev[next] = node;
        queue.push(next);
      }
    }
  }
  if (!done[to]) return null;
  const path: Coord[] = [];
  for (let n = to; n !== -1; n = prev[n]!) path.push(trail.points[n]!);
  return path.reverse();
}

function trailLeg(trail: Trail, a: Vertex, b: Vertex): Coord[] | null {
  const from = nearest(trail, a);
  const to = nearest(trail, b);
  if (from.km > TRAIL_SNAP_KM || to.km > TRAIL_SNAP_KM) return null;
  return alongTrail(trail, from.index, to.index);
}

async function trace(slug: string): Promise<void> {
  const dir = join(journeysDir, slug);
  const authoring = JSON.parse(readFileSync(join(dir, "authoring.json"), "utf8")) as Authoring;
  const roadsPath = join(dir, "roads.json");
  const previous: RoadsFile = existsSync(roadsPath)
    ? (JSON.parse(readFileSync(roadsPath, "utf8")) as RoadsFile)
    : {};
  const out: RoadsFile = {};
  const trailPath = join(dir, "trail.geojson");
  const trail = existsSync(trailPath) ? loadTrail(trailPath) : null;

  for (const track of authoring.tracks) {
    const legs: Record<string, Coord[]> = {};
    let vertexCount = 0;
    for (let i = 0; i < track.vertices.length - 1; i++) {
      const a = track.vertices[i]!;
      const b = track.vertices[i + 1]!;
      if (a.lon === b.lon && a.lat === b.lat) continue;
      if (b.straight) continue;
      const k = key(a, b);

      const cached = previous[track.id]?.[k];
      if (cached) {
        legs[k] = cached;
        vertexCount += cached.length;
        continue;
      }

      const straightKm = haversineKm([a.lon, a.lat], [b.lon, b.lat]);
      const road = trail ? trailLeg(trail, a, b) : await roadLeg(a, b);
      if (!trail) await new Promise((r) => setTimeout(r, 400));
      if (!road) {
        console.warn(`  ! ${track.id} leg ${i}: no ${trail ? "trail" : "road"} path, using a straight line`);
        continue;
      }
      const detour = lengthKm(road) / straightKm;
      if (detour > MAX_DETOUR) {
        console.warn(
          `  ! ${track.id} leg ${i}: road is ${detour.toFixed(2)}x the straight line, using a straight line`,
        );
        continue;
      }
      const simplified = simplify(road, SIMPLIFY_KM).map(
        (c) => [Number(c[0].toFixed(4)), Number(c[1].toFixed(4))] as Coord,
      );
      legs[k] = simplified;
      vertexCount += simplified.length;
      console.log(
        `  ${track.id} leg ${i}: ${straightKm.toFixed(0)} km straight, x${detour.toFixed(2)} by road, ${simplified.length} pts`,
      );
    }
    out[track.id] = legs;
    console.log(`✓ ${slug}/${track.id}: ${Object.keys(legs).length} road legs, ${vertexCount} vertices`);
  }

  writeFileSync(roadsPath, JSON.stringify(out) + "\n");
}

const slugs = process.argv.slice(2);
if (slugs.length === 0) {
  console.error("usage: trace-roads <journey-slug> [...]");
  process.exit(1);
}
for (const slug of slugs) await trace(slug);
