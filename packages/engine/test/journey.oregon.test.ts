import { describe, it, expect } from "vitest";
import { evaluate } from "../src/index";
import { at, loadContentJourney } from "./helpers";

describe("The Oregon emigration of 1843", () => {
  const journey = loadContentJourney("oregon-trail-1843");
  const snap = (iso: string) => evaluate(journey, at(iso));
  const wagons = (iso: string) => snap(iso).tracks.wagons!;

  it("waits at the rendezvous until the start on 22 May", () => {
    const s = wagons("1843-05-20T18:00:00Z");
    expect(s.isHalted).toBe(true);
    expect(s.distanceKm).toBe(0);
  });

  it("is at Fort Laramie in mid-July and Fort Hall at the end of August", () => {
    const laramie = wagons("1843-07-15T18:00:00Z").position;
    expect(laramie[0]).toBeCloseTo(-104.56, 1);
    expect(laramie[1]).toBeCloseTo(42.2, 1);
    const hall = wagons("1843-08-30T18:00:00Z").position;
    expect(hall[0]).toBeCloseTo(-112.63, 1);
  });

  it("rolls by day and corrals at night", () => {
    // 16 June on the Little Blue, about 98°W: local time is some 6.5 hours behind UTC.
    expect(wagons("1843-06-16T19:00:00Z").isHalted).toBe(false);
    expect(wagons("1843-06-17T08:00:00Z").isHalted).toBe(true);
  });

  it("follows the surveyed trail, not straight lines between camps", () => {
    expect(journey.tracks.wagons!.route.coords.length).toBeGreaterThan(1500);
    // Roughly two thousand miles from the Missouri frontier to the Willamette.
    expect(journey.tracks.wagons!.route.totalKm).toBeGreaterThan(3000);
    expect(journey.tracks.wagons!.route.totalKm).toBeLessThan(3400);
  });

  it("keeps the count of deaths the sources name", () => {
    expect(wagons("1843-07-01T12:00:00Z").stats.deaths).toBe(0);
    expect(wagons("1843-08-20T12:00:00Z").stats.deaths).toBe(4);
    expect(wagons("1843-11-20T12:00:00Z").stats.deaths).toBe(11);
  });

  it("ends at Oregon City", () => {
    const end = wagons("1843-11-20T12:00:00Z").position;
    expect(end[0]).toBeCloseTo(-122.61, 1);
    expect(end[1]).toBeCloseTo(45.36, 1);
  });
});
