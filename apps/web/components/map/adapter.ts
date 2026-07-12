import type { Coord } from "@living-journeys/engine";

/** Rendered coordinate the map understands: [lng, lat] for MapLibre. */
export type LngLat = [number, number];

/**
 * Coordinate adapter (HANDOFF.md §7.1). The engine emits positions in a journey's
 * declared coordinate space; the map resolves them through an adapter. For geo
 * journeys this is the identity; a future ImageAdapter maps pixel coords for
 * fictional maps, and everything above it (markers, routes, camera) is shared.
 */
export interface MapAdapter {
  toRender(coord: Coord): LngLat;
}

export const geoAdapter: MapAdapter = {
  toRender: (coord) => [coord[0], coord[1]],
};
