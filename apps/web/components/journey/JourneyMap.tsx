"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MlMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { routeSliceTo } from "@living-journeys/engine";
import type { Coord, JourneySnapshot, LoadedJourney } from "@living-journeys/engine";
import type { MapLabel } from "@living-journeys/content";
import { MAP_STYLES, PAPER, type StyleId } from "@/lib/mapStyles";

type Props = {
  journey: LoadedJourney;
  labels: MapLabel[];
  snapshot: JourneySnapshot;
  styleId: StyleId;
  follow: boolean;
  followTrackId: string;
  /** Bump to frame the whole journey. */
  overviewNonce: number;
  onBreakFollow: () => void;
};

const FOLLOW_ZOOM = 6.4;
/** Zoom at which each label rank appears; regions fade out once you are close. */
const RANK_MIN_ZOOM: Record<number, number> = { 1: 0, 2: 5.2, 3: 6.2 };
const REGION_MAX_ZOOM = 7.2;

const line = (coords: Coord[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: coords },
});

export default function JourneyMap({
  journey,
  labels,
  snapshot,
  styleId,
  follow,
  followTrackId,
  overviewNonce,
  onBreakFollow,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const labelEls = useRef<{ el: HTMLElement; label: MapLabel }[]>([]);
  const overlaysReady = useRef(false);
  const easingUntil = useRef(0);

  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const styleRef = useRef(styleId);
  styleRef.current = styleId;
  const onBreakFollowRef = useRef(onBreakFollow);
  onBreakFollowRef.current = onBreakFollow;

  // Create the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const snap = snapshotRef.current;
    const start = snap.tracks[snap.primaryTrackId]!.position;
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLES[styleRef.current].style,
      center: start,
      zoom: FOLLOW_ZOOM,
      minZoom: 3.5,
      maxZoom: 11,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;

    const tracks = Object.values(journey.tracks);

    const drawPast = () => {
      if (!overlaysReady.current) return;
      const s = snapshotRef.current;
      for (const track of tracks) {
        const source = map.getSource(`past-${track.def.id}`) as GeoJSONSource | undefined;
        source?.setData(line(routeSliceTo(track.route, s.tracks[track.def.id]!.distanceKm)));
      }
    };

    // Route overlays live in the style, so they are re-added after every style load.
    const installOverlays = () => {
      // Primary track last, so it is drawn on top.
      const ordered = [...tracks].sort(
        (a, b) => Number(a.def.isPrimary) - Number(b.def.isPrimary),
      );
      for (const track of ordered) {
        const id = track.def.id;
        const color = track.def.color ?? "#9c3524";
        map.addSource(`route-${id}`, { type: "geojson", data: line(track.route.coords) });
        map.addSource(`past-${id}`, { type: "geojson", data: line([track.route.coords[0]!]) });
        map.addLayer({
          id: `route-${id}`,
          type: "line",
          source: `route-${id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-opacity": 0.4,
            "line-width": 1.2,
            "line-dasharray": [1, 2.5],
          },
        });
        map.addLayer({
          id: `past-casing-${id}`,
          type: "line",
          source: `past-${id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": PAPER, "line-width": track.def.isPrimary ? 6.5 : 4.5 },
        });
        map.addLayer({
          id: `past-${id}`,
          type: "line",
          source: `past-${id}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": color, "line-width": track.def.isPrimary ? 3.4 : 2.2 },
        });
      }
      overlaysReady.current = true;
      drawPast();
    };

    map.on("style.load", installOverlays);
    map.on("dragstart", () => onBreakFollowRef.current());

    // Markers: one per track.
    for (const track of tracks) {
      const el = document.createElement("div");
      el.className = "track-marker";
      el.dataset.primary = String(track.def.isPrimary);
      el.style.setProperty("--marker", track.def.color ?? "#9c3524");
      el.title = track.def.name;
      markersRef.current[track.def.id] = new maplibregl.Marker({ element: el })
        .setLngLat(snap.tracks[track.def.id]!.position)
        .addTo(map);
    }

    // Period place names.
    const applyLabelVisibility = () => {
      const zoom = map.getZoom();
      const period = styleRef.current === "period";
      for (const { el, label } of labelEls.current) {
        const visible =
          period &&
          zoom >= (RANK_MIN_ZOOM[label.rank] ?? 0) &&
          (label.kind !== "region" || zoom <= REGION_MAX_ZOOM);
        el.dataset.hidden = String(!visible);
      }
    };
    labelEls.current = labels.map((label) => {
      const el = document.createElement("div");
      el.className = "map-label";
      el.dataset.kind = label.kind;
      el.dataset.rank = String(label.rank);
      if (label.side) el.dataset.side = label.side;
      if (label.rotate) el.style.setProperty("--rot", `${label.rotate}deg`);
      if (label.kind === "town" || label.kind === "battle") {
        const pin = document.createElement("span");
        pin.className = "pin";
        el.appendChild(pin);
      }
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = label.name;
      el.appendChild(name);
      new maplibregl.Marker({ element: el }).setLngLat([label.lon, label.lat]).addTo(map);
      // Decoration, not controls: keep the names out of the accessibility tree.
      el.removeAttribute("role");
      el.removeAttribute("aria-label");
      el.setAttribute("aria-hidden", "true");
      return { el, label };
    });
    applyLabelVisibility();
    map.on("zoom", applyLabelVisibility);
    map.on("style.load", applyLabelVisibility);

    return () => {
      overlaysReady.current = false;
      markersRef.current = {};
      labelEls.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [journey, labels]);

  // Switch base style; overlays come back on the style's load event.
  const firstStyle = useRef(true);
  useEffect(() => {
    if (firstStyle.current) {
      firstStyle.current = false;
      return;
    }
    overlaysReady.current = false;
    mapRef.current?.setStyle(MAP_STYLES[styleId].style);
  }, [styleId]);

  // Push each new snapshot onto the map.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const [id, track] of Object.entries(snapshot.tracks)) {
      const marker = markersRef.current[id];
      if (!marker) continue;
      marker.setLngLat(track.position);
      marker.getElement().dataset.moving = String(!track.isHalted);
    }

    if (overlaysReady.current) {
      for (const [id, track] of Object.entries(journey.tracks)) {
        const source = map.getSource(`past-${id}`) as GeoJSONSource | undefined;
        source?.setData(line(routeSliceTo(track.route, snapshot.tracks[id]!.distanceKm)));
      }
    }

    if (follow) {
      const target = snapshot.tracks[followTrackId] ?? snapshot.tracks[snapshot.primaryTrackId]!;
      const now = performance.now();
      if (now < easingUntil.current) return;
      const from = map.project(map.getCenter());
      const to = map.project(target.position);
      if (Math.hypot(to.x - from.x, to.y - from.y) > 260) {
        // A seek or a change of perspective: glide rather than teleport.
        easingUntil.current = now + 900;
        map.easeTo({ center: target.position, duration: 900 });
      } else {
        map.jumpTo({ center: target.position });
      }
    }
  }, [snapshot, follow, followTrackId, journey]);

  // Frame the whole journey on request.
  useEffect(() => {
    const map = mapRef.current;
    const bounds = journey.manifest.mapDefaults?.bounds;
    if (!map || overviewNonce === 0 || bounds?.length !== 4) return;
    map.fitBounds(
      [
        [bounds[0]!, bounds[1]!],
        [bounds[2]!, bounds[3]!],
      ],
      { padding: 60, duration: 1200 },
    );
  }, [overviewNonce, journey]);

  return (
    <div className="absolute inset-0" style={{ background: PAPER }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
