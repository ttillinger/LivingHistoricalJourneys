import { describe, it, expect } from "vitest";
import { evaluate, loadJourney, parseJourney } from "../src/index";
import type { Coord } from "../src/index";
import { at } from "./helpers";

// Two days along the Greenwich meridian (local mean time = UTC), 100 km in all.
const coords: Coord[] = [
  [0, 50],
  [0, 50.9],
];

function journey(dailyRhythm?: { marchStartLocal: string; marchEndLocal: string }) {
  const manifest = parseJourney({
    id: "rhythm",
    version: 1,
    title: "Rhythm",
    tier: "free",
    time: { start: "1812-07-01T00:00:00Z", end: "1812-07-03T00:00:00Z" },
    tracks: [
      {
        id: "column",
        name: "Column",
        kind: "army",
        isPrimary: true,
        route: "routes/column.geojson",
        schedule: [
          { t: "1812-07-01T00:00:00Z", km: 0 },
          { t: "1812-07-03T00:00:00Z", km: 100 },
          // A night march: no marching hours fall inside this leg.
          { t: "1812-07-03T04:00:00Z", km: 100.05 },
        ],
        ...(dailyRhythm ? { dailyRhythm } : {}),
      },
    ],
  });
  return loadJourney(manifest, { column: coords });
}

const column = (j: ReturnType<typeof journey>, iso: string) => evaluate(j, at(iso)).tracks.column!;

describe("daily rhythm", () => {
  const marching = journey({ marchStartLocal: "06:00", marchEndLocal: "18:00" });

  it("stands still before the day's march begins", () => {
    const dawn = column(marching, "1812-07-01T05:00:00Z");
    expect(dawn.distanceKm).toBe(0);
    expect(dawn.isHalted).toBe(true);
  });

  it("covers the leg during marching hours only", () => {
    const noon = column(marching, "1812-07-01T12:00:00Z");
    expect(noon.distanceKm).toBeCloseTo(25, 6);
    expect(noon.isHalted).toBe(false);
  });

  it("bivouacs overnight without moving", () => {
    const evening = column(marching, "1812-07-01T19:00:00Z");
    const beforeDawn = column(marching, "1812-07-02T05:30:00Z");
    expect(evening.distanceKm).toBeCloseTo(50, 6);
    expect(beforeDawn.distanceKm).toBeCloseTo(50, 6);
    expect(beforeDawn.isHalted).toBe(true);
  });

  it("still arrives at the keyframe on time", () => {
    expect(column(marching, "1812-07-02T18:00:00Z").distanceKm).toBeCloseTo(100, 6);
  });

  it("covers a leg that lies wholly outside marching hours at a steady pace", () => {
    const night = column(marching, "1812-07-03T02:00:00Z");
    expect(night.distanceKm).toBeCloseTo(100.025, 6);
    expect(night.isHalted).toBe(false);
  });

  it("uses local mean time at the track's position, not UTC", () => {
    // 30°E is two hours ahead: 04:30 UTC is 06:30 local, already on the road.
    const east = loadJourney(marching.manifest, {
      column: [
        [30, 50],
        [30, 50.9],
      ],
    });
    expect(column(east, "1812-07-01T04:30:00Z").isHalted).toBe(false);
    expect(column(marching, "1812-07-01T04:30:00Z").isHalted).toBe(true);
  });

  it("interpolates evenly when the track declares no rhythm", () => {
    expect(column(journey(), "1812-07-01T06:00:00Z").distanceKm).toBeCloseTo(12.5, 6);
  });
});
