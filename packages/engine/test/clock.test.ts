import { describe, it, expect } from "vitest";
import {
  virtualNow,
  reanchor,
  rateToFinishBy,
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
