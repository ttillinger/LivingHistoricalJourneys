import { describe, it, expect } from "vitest";
import { evaluate, haversineKm, momentsSince } from "../src/index";
import { at, loadContentJourney } from "./helpers";

const napoleon = loadContentJourney("napoleon-1812");
const BORODINO: [number, number] = [35.82, 55.52];
const MOSCOW: [number, number] = [37.62, 55.75];

describe("Napoleon 1812 — position & movement", () => {
  it("stands at Borodino on the morning of 7 September 1812", () => {
    const snap = evaluate(napoleon, at("1812-09-07T10:00:00Z"));
    const armee = snap.tracks["grande-armee"]!;
    expect(haversineKm(armee.position, BORODINO)).toBeLessThan(15);
    expect(armee.isHalted).toBe(false);
  });

  it("advances measurably along the route through the summer", () => {
    const june = evaluate(napoleon, at("1812-06-25T12:00:00Z")).tracks["grande-armee"]!;
    const september = evaluate(napoleon, at("1812-09-10T12:00:00Z")).tracks["grande-armee"]!;
    expect(june.distanceKm).toBeGreaterThan(0);
    expect(september.distanceKm).toBeGreaterThan(june.distanceKm);
  });

  it("sits still in Moscow during the occupation", () => {
    const snap = evaluate(napoleon, at("1812-10-01T12:00:00Z"));
    const armee = snap.tracks["grande-armee"]!;
    expect(armee.isHalted).toBe(true);
    expect(armee.headingDeg).toBeNull();
    expect(haversineKm(armee.position, MOSCOW)).toBeLessThan(5);
  });
});

describe("Napoleon 1812 — activity & episodes", () => {
  it("reports the battle activity and the active Borodino episode", () => {
    const snap = evaluate(napoleon, at("1812-09-07T10:00:00Z"));
    expect(snap.activity.key).toBe("battle");
    expect(snap.activeEpisode?.id).toBe("borodino");
    expect(snap.activeEpisode?.currentBeat).toContain("Bagration");
  });

  it("reports the encampment during the occupation of Moscow", () => {
    const snap = evaluate(napoleon, at("1812-10-01T12:00:00Z"));
    expect(snap.activity.key).toBe("camp");
    expect(snap.activeEpisode?.id).toBe("moscow-occupation");
  });

  it("reports the disaster activity at the Berezina", () => {
    const snap = evaluate(napoleon, at("1812-11-27T12:00:00Z"));
    expect(snap.activity.key).toBe("disaster");
    expect(snap.activeEpisode?.id).toBe("berezina");
  });
});

describe("Napoleon 1812 — stats (after Minard)", () => {
  it("interpolates army strength to about 130,000 at Borodino", () => {
    const armee = evaluate(napoleon, at("1812-09-07T10:00:00Z")).tracks["grande-armee"]!;
    expect(armee.stats.strength).toBeGreaterThan(120_000);
    expect(armee.stats.strength).toBeLessThan(131_000);
  });

  it("collapses to roughly 10,000 by the recrossing of the Niemen", () => {
    const armee = evaluate(napoleon, at("1812-12-14T08:00:00Z")).tracks["grande-armee"]!;
    expect(armee.stats.strength).toBeLessThanOrEqual(10_000);
  });

  it("is warm in July and brutally cold in December", () => {
    const july = evaluate(napoleon, at("1812-07-16T12:00:00Z")).tracks["grande-armee"]!;
    const december = evaluate(napoleon, at("1812-12-06T06:00:00Z")).tracks["grande-armee"]!;
    expect(july.stats.temperature).toBeGreaterThan(15);
    expect(december.stats.temperature).toBeLessThan(-30);
  });
});

describe("Napoleon 1812 — solar (day/night at position)", () => {
  it("is daylight over the summer advance", () => {
    const snap = evaluate(napoleon, at("1812-07-16T10:00:00Z"));
    expect(snap.solar.isNight).toBe(false);
    expect(snap.solar.phase).toBe("day");
  });

  it("is deep night during the December retreat", () => {
    const snap = evaluate(napoleon, at("1812-12-06T03:00:00Z"));
    expect(snap.solar.isNight).toBe(true);
  });
});

describe("Napoleon 1812 — timeline plumbing", () => {
  it("runs progressFraction from 0 to 1 across the campaign", () => {
    expect(evaluate(napoleon, napoleon.startMs).progressFraction).toBeCloseTo(0, 5);
    expect(evaluate(napoleon, napoleon.endMs).progressFraction).toBeCloseTo(1, 5);
  });

  it("exposes the most recent moment", () => {
    const snap = evaluate(napoleon, at("1812-09-08T00:00:00Z"));
    expect(snap.currentMoment).not.toBeNull();
  });

  it("collects the moments within a digest window", () => {
    const since = at("1812-09-01T00:00:00Z");
    const until = at("1812-09-15T00:00:00Z");
    const window = momentsSince(napoleon, since, until);
    expect(window.some((m) => m.title.includes("Borodino"))).toBe(true);
    expect(window.every((m) => Date.parse(m.t) > since && Date.parse(m.t) <= until)).toBe(true);
  });
});
