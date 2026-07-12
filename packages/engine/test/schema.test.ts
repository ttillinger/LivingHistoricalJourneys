import { describe, it, expect } from "vitest";
import { JourneySchema, parseJourney } from "../src/schema";

const minimalValidJourney = {
  id: "sample",
  version: 1,
  title: "A Sample Journey",
  tier: "free",
  time: { start: "1812-06-24T03:00:00Z", end: "1812-12-14T12:00:00Z" },
  tracks: [
    {
      id: "primary",
      name: "Primary",
      kind: "army",
      isPrimary: true,
      route: "routes/primary.geojson",
      schedule: [
        { t: "1812-06-24T03:00:00Z", km: 0 },
        { t: "1812-06-28T18:00:00Z", km: 97 },
      ],
    },
  ],
};

describe("JourneySchema", () => {
  it("accepts a minimal valid journey and applies defaults", () => {
    const parsed = parseJourney(minimalValidJourney);
    expect(parsed.coordinateSpace).toBe("geo");
    expect(parsed.moments).toEqual([]);
    expect(parsed.episodes).toEqual([]);
    expect(parsed.tracks[0]?.schedule.length).toBe(2);
  });

  it("rejects a track with fewer than two schedule keyframes", () => {
    const bad = {
      ...minimalValidJourney,
      tracks: [
        {
          ...minimalValidJourney.tracks[0],
          schedule: [{ t: "1812-06-24T03:00:00Z", km: 0 }],
        },
      ],
    };
    expect(JourneySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown top-level key (strict content)", () => {
    const bad = { ...minimalValidJourney, madeUpField: true };
    expect(JourneySchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a non-RFC3339 timestamp", () => {
    const bad = {
      ...minimalValidJourney,
      time: { start: "June 24, 1812", end: "1812-12-14T12:00:00Z" },
    };
    expect(JourneySchema.safeParse(bad).success).toBe(false);
  });
});
