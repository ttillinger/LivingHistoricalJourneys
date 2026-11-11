import { describe, it, expect } from "vitest";
import { evaluate } from "../src/index";
import { at, loadContentJourney } from "./helpers";

describe("Shackleton's Endurance expedition", () => {
  const journey = loadContentJourney("shackleton-1914");
  const snap = (iso: string) => evaluate(journey, at(iso));
  const shackleton = (iso: string) => snap(iso).tracks.shackleton!;

  it("is beset in the far south of the Weddell Sea in February 1915", () => {
    const s = shackleton("1915-02-22T12:00:00Z");
    expect(s.position[1]).toBeLessThan(-76.5);
    expect(s.stats.men).toBe(28);
    expect(snap("1915-02-22T12:00:00Z").activity.key).toBe("beset");
  });

  it("drifts north with the ice through 1915", () => {
    const june = shackleton("1915-06-15T12:00:00Z").position[1];
    const october = shackleton("1915-10-20T12:00:00Z").position[1];
    expect(june).toBeGreaterThan(-76);
    expect(october).toBeGreaterThan(june);
    expect(october).toBeCloseTo(-69.3, 0);
  });

  it("zooms in for the crossing of South Georgia and out for the open sea", () => {
    expect(snap("1916-05-19T18:00:00Z").activity.zoom).toBeGreaterThan(10);
    expect(snap("1916-05-01T12:00:00Z").activity.zoom).toBeLessThan(7);
  });

  it("shows the Elephant Island party only while it is on its own", () => {
    const island = (iso: string) => snap(iso).tracks["elephant-island"]!;
    expect(island("1916-03-01T12:00:00Z").isPresent).toBe(false);
    expect(island("1916-06-22T12:00:00Z").isPresent).toBe(true);
    expect(island("1916-06-22T12:00:00Z").stats.men).toBe(22);
    expect(island("1916-09-01T12:00:00Z").isPresent).toBe(false);
  });

  it("counts the men with Shackleton through each parting and the rescue", () => {
    expect(shackleton("1916-05-01T12:00:00Z").stats.men).toBe(6);
    expect(shackleton("1916-05-19T18:00:00Z").stats.men).toBe(3);
    expect(shackleton("1916-09-02T12:00:00Z").stats.men).toBe(25);
  });

  it("stops reporting a stat once its record ends", () => {
    expect(shackleton("1915-06-01T12:00:00Z").stats.dogs).toBeGreaterThan(40);
    expect(shackleton("1916-06-01T12:00:00Z").stats.dogs).toBeUndefined();
    expect(shackleton("1916-08-01T12:00:00Z").stats.temperature).toBeUndefined();
  });

  it("is back at Elephant Island on 30 August 1916", () => {
    const s = shackleton("1916-08-30T16:30:00Z");
    expect(s.position[0]).toBeCloseTo(-54.87, 1);
    expect(s.position[1]).toBeCloseTo(-61.1, 1);
  });
});
