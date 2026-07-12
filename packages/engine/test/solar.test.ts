import { describe, it, expect } from "vitest";
import { solarAt, sunAltitudeDeg } from "../src/solar";

describe("sunAltitudeDeg", () => {
  it("puts the sun high overhead at the equator at local noon near an equinox", () => {
    const alt = sunAltitudeDeg(0, 0, new Date("2001-03-20T12:00:00Z"));
    expect(alt).toBeGreaterThan(60);
  });

  it("puts the sun well below the horizon at local midnight", () => {
    const alt = sunAltitudeDeg(0, 0, new Date("2001-03-20T00:00:00Z"));
    expect(alt).toBeLessThan(-40);
  });
});

describe("solarAt", () => {
  it("classifies equatorial noon as day", () => {
    expect(solarAt([0, 0], new Date("2001-06-21T12:00:00Z")).phase).toBe("day");
  });

  it("falls back to a synthetic day/night cycle in image space", () => {
    const night = solarAt([100, 100], new Date("2001-01-01T02:00:00Z"), "image");
    expect(night.isNight).toBe(true);
    const day = solarAt([100, 100], new Date("2001-01-01T12:00:00Z"), "image");
    expect(day.isNight).toBe(false);
  });
});
