/**
 * Geometry: route geometry (dense polyline) is kept separate from the schedule
 * (time → km), which is the fix for the POC's straight-line movement (HANDOFF.md §5).
 * All functions are pure and isomorphic (no DOM, no Node).
 */

/** [x, y] — [lng, lat] in geo space, or [px, py] in image space. */
export type Coord = [number, number];

export type CoordinateSpace = "geo" | "image";

export type RouteGeometry = {
  coords: Coord[];
  /** Cumulative distance to each vertex; `cumKm[0] === 0`. */
  cumKm: number[];
  totalKm: number;
};

export type PointOnRoute = {
  coord: Coord;
  /** Bearing along the route in degrees [0,360), or null at a halt / zero-length segment. */
  headingDeg: number | null;
  segmentIndex: number;
};

const EARTH_RADIUS_KM = 6371.0088;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Great-circle distance between two [lng, lat] points, in km. */
export function haversineKm(a: Coord, b: Coord): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLat = lat2 - lat1;
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Straight-line distance in image (pixel) space; the unit is arbitrary but monotonic. */
export function euclideanKm(a: Coord, b: Coord): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Initial bearing from a to b, degrees [0,360). */
export function bearingDeg(a: Coord, b: Coord): number {
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLon = toRad(b[0] - a[0]);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Angle of the a→b vector in image space, degrees [0,360) (y grows downward). */
export function imageAngleDeg(a: Coord, b: Coord): number {
  return (toDeg(Math.atan2(b[1] - a[1], b[0] - a[0])) + 360) % 360;
}

/** Build cumulative-distance geometry from an ordered list of vertices. */
export function buildRoute(coords: Coord[], space: CoordinateSpace = "geo"): RouteGeometry {
  if (coords.length < 2) {
    throw new Error(`route needs at least 2 vertices, got ${coords.length}`);
  }
  const dist = space === "geo" ? haversineKm : euclideanKm;
  const cumKm: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumKm.push(cumKm[i - 1]! + dist(coords[i - 1]!, coords[i]!));
  }
  return { coords, cumKm, totalKm: cumKm[cumKm.length - 1]! };
}

/** Resolve a position (and heading) at a given distance along the route. */
export function positionAtKm(
  route: RouteGeometry,
  km: number,
  space: CoordinateSpace = "geo",
): PointOnRoute {
  const { coords, cumKm, totalKm } = route;
  const clamped = Math.max(0, Math.min(km, totalKm));

  let i = 0;
  while (i < coords.length - 2 && cumKm[i + 1]! < clamped) i++;

  const a = coords[i]!;
  const b = coords[i + 1]!;
  const segLen = cumKm[i + 1]! - cumKm[i]!;
  const f = segLen > 0 ? (clamped - cumKm[i]!) / segLen : 0;
  const coord: Coord = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

  const headingDeg =
    segLen > 0 ? (space === "geo" ? bearingDeg(a, b) : imageAngleDeg(a, b)) : null;

  return { coord, headingDeg, segmentIndex: i };
}

type GeoJsonish = {
  type?: string;
  coordinates?: unknown;
  geometry?: { type?: string; coordinates?: unknown };
  features?: { geometry?: { type?: string; coordinates?: unknown } }[];
};

/** Extract a LineString's coordinates from a GeoJSON Geometry, Feature, or FeatureCollection. */
export function coordsFromGeoJson(geojson: unknown): Coord[] {
  const g = geojson as GeoJsonish;
  const raw =
    g.coordinates ??
    g.geometry?.coordinates ??
    g.features?.find((f) => f.geometry?.type === "LineString")?.geometry?.coordinates;

  if (!Array.isArray(raw)) {
    throw new Error("coordsFromGeoJson: no LineString coordinates found");
  }
  return raw.map((p) => {
    const pair = p as number[];
    return [pair[0]!, pair[1]!] as Coord;
  });
}
