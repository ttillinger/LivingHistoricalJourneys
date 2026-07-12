import { describe, it, expect } from "vitest";
import {
  buildRoute,
  coordsFromGeoJson,
  haversineKm,
  positionAtKm,
  routeSliceTo,
} from "../src/geo";

describe("haversineKm", () => {
  it("is about 111 km per degree of latitude", () => {
    const km = haversineKm([0, 0], [0, 1]);
    expect(km).toBeGreaterThan(110);
    expect(km).toBeLessThan(112);
  });
});

describe("buildRoute + positionAtKm", () => {
  const route = buildRoute([
    [0, 0],
    [0, 1],
    [0, 2],
  ]);

  it("accumulates distance monotonically", () => {
    expect(route.cumKm[0]).toBe(0);
    expect(route.cumKm[1]).toBeGreaterThan(0);
    expect(route.totalKm).toBeCloseTo(haversineKm([0, 0], [0, 2]), 0);
  });

  it("resolves the midpoint halfway along the route", () => {
    const p = positionAtKm(route, route.totalKm / 2);
    expect(p.coord[1]).toBeCloseTo(1, 1);
    expect(p.headingDeg).not.toBeNull();
  });

  it("clamps distances beyond either end", () => {
    expect(positionAtKm(route, 99_999).coord[1]).toBeCloseTo(2, 5);
    expect(positionAtKm(route, -5).coord[1]).toBeCloseTo(0, 5);
  });
});

describe("routeSliceTo", () => {
  const route = buildRoute([
    [0, 0],
    [0, 1],
    [0, 2],
  ]);

  it("returns start-only at km 0", () => {
    expect(routeSliceTo(route, 0)).toEqual([[0, 0]]);
  });

  it("ends at the current position partway along", () => {
    const slice = routeSliceTo(route, route.totalKm / 2);
    expect(slice[0]).toEqual([0, 0]);
    expect(slice[slice.length - 1]![1]).toBeCloseTo(1, 1);
  });

  it("returns the full line at the end", () => {
    const slice = routeSliceTo(route, route.totalKm);
    expect(slice[slice.length - 1]![1]).toBeCloseTo(2, 5);
  });
});

describe("coordsFromGeoJson", () => {
  it("reads a Feature LineString", () => {
    const coords = coordsFromGeoJson({
      type: "Feature",
      geometry: { type: "LineString", coordinates: [[1, 2], [3, 4]] },
    });
    expect(coords).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});
