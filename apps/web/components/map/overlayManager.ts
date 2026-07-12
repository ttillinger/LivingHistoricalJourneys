import { routeSliceTo } from "@living-journeys/engine";
import type { JourneySnapshot, LoadedJourney, RouteGeometry } from "@living-journeys/engine";
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { LngLat, MapAdapter } from "./adapter";

type TrackVis = { id: string; color: string; route: RouteGeometry };

// Minimal structural GeoJSON shapes — assignable to what MapLibre's sources expect,
// without pulling the global `GeoJSON` namespace into this tsconfig.
type FeatureOf<G> = { type: "Feature"; properties: Record<string, unknown>; geometry: G };
type LineStringGeometry = { type: "LineString"; coordinates: LngLat[] };
type PointGeometry = { type: "Point"; coordinates: LngLat };

function lineFeature(coords: LngLat[]): FeatureOf<LineStringGeometry> {
  return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } };
}

function pointFeature(coord: LngLat): FeatureOf<PointGeometry> {
  return { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: coord } };
}

/**
 * Manages the route/past-line/marker layers on top of any base style. Because
 * `setStyle` wipes custom layers, `ensure()` is idempotent and is re-run on every
 * style change so overlays survive a modern↔atlas switch (HANDOFF.md §7.2).
 */
export class OverlayManager {
  private readonly map: MlMap;
  private readonly adapter: MapAdapter;
  private readonly tracks: TrackVis[];

  constructor(map: MlMap, adapter: MapAdapter, journey: LoadedJourney) {
    this.map = map;
    this.adapter = adapter;
    this.tracks = Object.values(journey.tracks).map((t) => ({
      id: t.def.id,
      color: t.def.color ?? "#b23b2e",
      route: t.route,
    }));
  }

  ensure(snapshot: JourneySnapshot): void {
    for (const t of this.tracks) {
      const fullId = `route-full-${t.id}`;
      const pastId = `route-past-${t.id}`;
      const markerId = `marker-${t.id}`;
      const rendered = t.route.coords.map((c) => this.adapter.toRender(c));

      if (!this.map.getSource(fullId)) {
        this.map.addSource(fullId, { type: "geojson", data: lineFeature(rendered) });
        this.map.addLayer({
          id: fullId,
          type: "line",
          source: fullId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": t.color,
            "line-width": 2,
            "line-opacity": 0.25,
            "line-dasharray": [2, 2],
          },
        });
      }

      if (!this.map.getSource(pastId)) {
        this.map.addSource(pastId, { type: "geojson", data: lineFeature([]) });
        this.map.addLayer({
          id: pastId,
          type: "line",
          source: pastId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": t.color, "line-width": 3.5, "line-opacity": 0.95 },
        });
      }

      if (!this.map.getSource(markerId)) {
        this.map.addSource(markerId, { type: "geojson", data: pointFeature(rendered[0]!) });
        this.map.addLayer({
          id: `${markerId}-halo`,
          type: "circle",
          source: markerId,
          paint: { "circle-radius": 9, "circle-color": t.color, "circle-opacity": 0.25 },
        });
        this.map.addLayer({
          id: markerId,
          type: "circle",
          source: markerId,
          paint: {
            "circle-radius": 5,
            "circle-color": t.color,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
      }
    }
    this.update(snapshot);
  }

  update(snapshot: JourneySnapshot): void {
    for (const t of this.tracks) {
      const trackSnap = snapshot.tracks[t.id];
      if (!trackSnap) continue;
      const past = routeSliceTo(t.route, trackSnap.distanceKm).map((c) => this.adapter.toRender(c));
      (this.map.getSource(`route-past-${t.id}`) as GeoJSONSource | undefined)?.setData(
        lineFeature(past),
      );
      (this.map.getSource(`marker-${t.id}`) as GeoJSONSource | undefined)?.setData(
        pointFeature(this.adapter.toRender(trackSnap.position)),
      );
    }
  }
}
