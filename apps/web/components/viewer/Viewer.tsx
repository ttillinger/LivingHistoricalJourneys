"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { evaluate, loadJourney } from "@living-journeys/engine";
import type { JourneyBundle } from "@living-journeys/content";
import { formatStat } from "@/lib/format";
import type { StyleId } from "@/components/map/styles";
import { DateBar } from "@/components/overlays/DateBar";
import { Legend, type LegendTrack } from "@/components/overlays/Legend";
import { MomentCard } from "@/components/overlays/MomentCard";
import { StatsPanel, type StatEntry } from "@/components/overlays/StatsPanel";
import { Controls } from "./Controls";
import { useLocalClock } from "./useLocalClock";

// MapLibre touches the DOM, so the map is client-only.
const MapView = dynamic(() => import("@/components/map/MapView"), { ssr: false });

const DEFAULT_RATE = 86_400; // 1 day per second

export function Viewer({ bundle }: { bundle: JourneyBundle }) {
  const loaded = useMemo(() => loadJourney(bundle.manifest, bundle.routeCoords), [bundle]);
  const clock = useLocalClock(loaded.startMs, loaded.endMs, DEFAULT_RATE);
  const snapshot = useMemo(() => evaluate(loaded, clock.virtualMs), [loaded, clock.virtualMs]);

  const [styleId, setStyleId] = useState<StyleId>("modern");
  const [followId, setFollowId] = useState(loaded.primaryTrackId);
  const [follow, setFollow] = useState(true);

  const breakFollow = useCallback(() => setFollow(false), []);
  const followTrack = useCallback((id: string) => {
    setFollowId(id);
    setFollow(true);
  }, []);

  const legendTracks: LegendTrack[] = loaded.manifest.tracks.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color ?? "#b23b2e",
  }));

  const shownTrack = loaded.tracks[followId] ?? loaded.tracks[loaded.primaryTrackId];
  const shownSnap = snapshot.tracks[followId] ?? snapshot.tracks[loaded.primaryTrackId];
  const statEntries: StatEntry[] = shownTrack
    ? Object.entries(shownTrack.statSeries).map(([key, series]) => ({
        label: series.label,
        display: formatStat(shownSnap?.stats[key] ?? 0, series.format),
      }))
    : [];

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neutral-950">
      <MapView
        journey={loaded}
        snapshot={snapshot}
        styleId={styleId}
        follow={follow}
        followTrackId={followId}
        onBreakFollow={breakFollow}
      />

      <DateBar
        virtualMs={clock.virtualMs}
        startMs={loaded.startMs}
        activity={snapshot.activity}
        solar={snapshot.solar}
      />
      <StatsPanel entries={statEntries} />
      <Legend tracks={legendTracks} followId={followId} onFollow={followTrack} />
      <MomentCard moment={snapshot.currentMoment} />

      {!follow ? (
        <button
          type="button"
          onClick={() => setFollow(true)}
          className="pointer-events-auto absolute bottom-28 right-4 z-10 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-900 shadow-lg transition-colors hover:bg-white"
        >
          Return to track
        </button>
      ) : null}

      <Controls
        title={loaded.manifest.title}
        paused={clock.paused}
        rate={clock.rate}
        onToggle={clock.toggle}
        onSetRate={clock.setRate}
        virtualMs={clock.virtualMs}
        startMs={loaded.startMs}
        endMs={loaded.endMs}
        onSeek={clock.seek}
        styleId={styleId}
        onSetStyle={setStyleId}
      />
    </div>
  );
}
