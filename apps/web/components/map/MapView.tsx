"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { JourneySnapshot, LoadedJourney } from "@living-journeys/engine";
import { geoAdapter } from "./adapter";
import { OverlayManager } from "./overlayManager";
import { MAP_STYLES, type StyleId } from "./styles";

type Props = {
  journey: LoadedJourney;
  snapshot: JourneySnapshot;
  styleId: StyleId;
  follow: boolean;
  followTrackId: string;
  onBreakFollow: () => void;
};

export default function MapView({
  journey,
  snapshot,
  styleId,
  follow,
  followTrackId,
  onBreakFollow,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MlMap | null>(null);
  const overlayRef = useRef<OverlayManager | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const styleRef = useRef(styleId);

  // Initialise the map once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const primary = snapshotRef.current.tracks[snapshotRef.current.primaryTrackId]!;
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLES[styleRef.current].url,
      center: geoAdapter.toRender(primary.position),
      zoom: 5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const overlay = new OverlayManager(map, geoAdapter, journey);
    overlayRef.current = overlay;

    map.on("load", () => overlay.ensure(snapshotRef.current));
    // A style switch wipes custom layers; re-add them whenever the style settles.
    map.on("styledata", () => {
      if (map.isStyleLoaded()) overlay.ensure(snapshotRef.current);
    });
    // User pan/zoom breaks follow mode (programmatic easeTo does not fire these).
    map.on("dragstart", onBreakFollow);
    map.on("wheel", onBreakFollow);

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, [journey, onBreakFollow]);

  // Switch base style on demand.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || styleRef.current === styleId) return;
    styleRef.current = styleId;
    map.setStyle(MAP_STYLES[styleId].url);
  }, [styleId]);

  // Update overlays + follow the marker on every snapshot.
  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;
    overlay.update(snapshot);
    if (follow) {
      const t = snapshot.tracks[followTrackId] ?? snapshot.tracks[snapshot.primaryTrackId];
      if (t) {
        map.easeTo({ center: geoAdapter.toRender(t.position), duration: 350, essential: true });
      }
    }
  }, [snapshot, follow, followTrackId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
