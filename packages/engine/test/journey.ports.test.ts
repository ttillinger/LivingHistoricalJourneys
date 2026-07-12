import { describe, it, expect } from "vitest";
import { evaluate } from "../src/index";
import { loadContentJourney } from "./helpers";

const SLUGS = ["oregon-trail-1843", "shackleton-1914", "silk-road-1300"];

describe.each(SLUGS)("ported journey: %s", (slug) => {
  const journey = loadContentJourney(slug);

  it("loads with at least one track and a valid timeline", () => {
    expect(Object.keys(journey.tracks).length).toBeGreaterThan(0);
    expect(journey.endMs).toBeGreaterThan(journey.startMs);
  });

  it("evaluates to a finite position partway through", () => {
    const snap = evaluate(journey, (journey.startMs + journey.endMs) / 2);
    const primary = snap.tracks[journey.primaryTrackId]!;
    expect(Number.isFinite(primary.position[0])).toBe(true);
    expect(Number.isFinite(primary.position[1])).toBe(true);
    expect(snap.progressFraction).toBeGreaterThan(0);
    expect(snap.progressFraction).toBeLessThan(1);
  });

  it("moves forward along its route over time", () => {
    const early = evaluate(journey, journey.startMs).tracks[journey.primaryTrackId]!;
    const late = evaluate(journey, journey.endMs).tracks[journey.primaryTrackId]!;
    expect(late.distanceKm).toBeGreaterThan(early.distanceKm);
  });
});
