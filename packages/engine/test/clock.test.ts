import { describe, it, expect } from "vitest";
import {
  virtualNow,
  reanchor,
  rateToFinishBy,
  anniversaryStart,
  startOnDay,
  type ClockState,
} from "../src/clock";

const base: ClockState = {
  anchorVirtualMs: 1000,
  anchorRealMs: 0,
  rate: 1,
  paused: false,
};

describe("virtualNow", () => {
  it("advances one-for-one at rate 1", () => {
    expect(virtualNow(base, 5000)).toBe(6000);
  });

  it("scales elapsed real time by the rate", () => {
    expect(virtualNow({ ...base, rate: 10 }, 5000)).toBe(51000);
  });

  it("freezes at the anchor while paused", () => {
    expect(virtualNow({ ...base, paused: true }, 999_999)).toBe(1000);
  });
});

describe("reanchor", () => {
  it("preserves the current virtual time when the rate changes", () => {
    const clock: ClockState = {
      anchorVirtualMs: 0,
      anchorRealMs: 0,
      rate: 1,
      paused: false,
    };
    const at = 10_000;
    const before = virtualNow(clock, at);

    const next = reanchor(clock, at, { rate: 60 });

    // No jump at the moment of the change...
    expect(virtualNow(next, at)).toBe(before);
    // ...and the new rate takes effect afterwards (60x for the next real second).
    expect(virtualNow(next, at + 1000)).toBe(before + 60_000);
  });

  it("freezes virtual time across a pause/resume round-trip", () => {
    const at = 4_000;
    const paused = reanchor(base, at, { paused: true });
    const frozen = virtualNow(paused, at);

    expect(virtualNow(paused, at + 1_000_000)).toBe(frozen);

    const resumed = reanchor(paused, at + 1_000_000, { paused: false });
    expect(virtualNow(resumed, at + 1_000_000)).toBe(frozen);
  });
});

describe("rateToFinishBy", () => {
  it("computes the rate that finishes the remainder by the target date", () => {
    const clock: ClockState = {
      anchorVirtualMs: 0,
      anchorRealMs: 0,
      rate: 1,
      paused: false,
    };
    // 100 days of virtual journey left, to be finished in 10 real days -> 10x.
    const day = 86_400_000;
    const rate = rateToFinishBy(clock, 0, 100 * day, 10 * day);
    expect(rate).toBe(10);
  });

  it("returns Infinity when the target is not in the future", () => {
    expect(rateToFinishBy(base, 5000, 10_000, 5000)).toBe(Infinity);
  });
});

describe("anniversaryStart", () => {
  const start = Date.parse("1812-06-24T03:00:00Z");
  const end = Date.parse("1812-12-14T18:24:00Z");
  // Real-world days are the reader's own, so these read in the machine's time zone.
  const local = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h).getTime();
  const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  it("puts a run under way on the same day of the year as the journey", () => {
    const now = local(2026, 11, 11, 15);
    const began = anniversaryStart(start, end, now);
    expect(began).toBe(local(2026, 6, 24, 3));
    // Today reads as 11 November 1812.
    expect(utcDay(start + (now - began))).toBe("1812-11-11");
  });

  it("waits for the next anniversary once this year's run would be over", () => {
    expect(anniversaryStart(start, end, local(2026, 12, 20))).toBe(local(2027, 6, 24, 3));
  });

  it("looks back a year when the anniversary has not come round yet", () => {
    // A journey of nearly two years that set out in October is still going in March.
    const s = Date.parse("1914-10-26T12:00:00Z");
    const e = Date.parse("1916-09-03T12:00:00Z");
    expect(anniversaryStart(s, e, local(2027, 3, 1))).toBe(local(2026, 10, 26, 12));
  });

  it("moves the opening onto a chosen day and keeps its hour", () => {
    expect(startOnDay(start, 2027, 0, 5)).toBe(local(2027, 1, 5, 3));
  });
});
