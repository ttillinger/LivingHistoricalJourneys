/**
 * The run clock — the heart of "real time across months and devices".
 *
 * A clock is a compact, server-anchored state. Any client computes the current
 * virtual time in O(1) from it, with no ticking process anywhere. `anchorRealMs`
 * MUST be server wall-clock time (Postgres `now()`); client time is only ever used
 * for intra-frame animation, never persisted (see HANDOFF.md §6, §14.2).
 */
export type ClockState = {
  /** Virtual (in-journey) time at the anchor, in epoch milliseconds. */
  anchorVirtualMs: number;
  /** Server wall-clock time at the anchor, in epoch milliseconds. */
  anchorRealMs: number;
  /** Playback rate. 1 = the original pace of the journey. Must be > 0. */
  rate: number;
  /** When paused, virtual time is frozen at `anchorVirtualMs`. */
  paused: boolean;
};

/** The current virtual (in-journey) time for a clock, given server time now. */
export function virtualNow(clock: ClockState, serverNowMs: number): number {
  if (clock.paused) return clock.anchorVirtualMs;
  return clock.anchorVirtualMs + (serverNowMs - clock.anchorRealMs) * clock.rate;
}

/**
 * Re-anchor a clock when rate/pause changes, preserving the current virtual time
 * so the marker never jumps. This is the "speed-change math" the POC got right
 * (HANDOFF.md §2) — generalized and made pure.
 */
export function reanchor(
  clock: ClockState,
  serverNowMs: number,
  next: Partial<Pick<ClockState, "rate" | "paused">>,
): ClockState {
  return {
    anchorVirtualMs: virtualNow(clock, serverNowMs),
    anchorRealMs: serverNowMs,
    rate: next.rate ?? clock.rate,
    paused: next.paused ?? clock.paused,
  };
}

/**
 * Compute the rate that finishes the remaining journey by a target real-world date
 * ("finish by" UI, HANDOFF.md §6). Returns a positive rate, or `Infinity` if the
 * target is not in the future.
 */
export function rateToFinishBy(
  clock: ClockState,
  serverNowMs: number,
  journeyEndVirtualMs: number,
  targetRealMs: number,
): number {
  const remainingVirtual = journeyEndVirtualMs - virtualNow(clock, serverNowMs);
  const remainingReal = targetRealMs - serverNowMs;
  if (remainingReal <= 0) return Infinity;
  return remainingVirtual / remainingReal;
}
