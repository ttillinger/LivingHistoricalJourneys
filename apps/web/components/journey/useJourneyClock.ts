"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reanchor, virtualNow, type ClockState } from "@living-journeys/engine";

export type JourneyClock = {
  virtualMs: number;
  paused: boolean;
  rate: number;
  /** True while following a run anchored to a real-world start (`?began=`). */
  live: boolean;
  toggle: () => void;
  setRate: (rate: number) => void;
  seek: (virtualMs: number) => void;
  /** Return to the live run after scrubbing away from it. */
  goLive: (() => void) | null;
};

export type ClockInit = {
  /** Real-world instant a live run began; virtual time is derived from it. */
  beganMs?: number;
  /** Virtual instant to open at, paused. */
  atMs?: number;
  rate: number;
};

/**
 * The viewer's clock. Until accounts exist there is no server to anchor to, so a
 * "live" run is anchored by its link: `?began=<real start>` fixes the anchor for
 * every device that opens it, and a reload months later lands in the right place.
 * Scrubbing or pausing detaches into a local clock; the engine math is the same.
 */
export function useJourneyClock(startMs: number, endMs: number, init: ClockInit): JourneyClock {
  const liveClock = useCallback(
    (): ClockState => ({
      anchorVirtualMs: startMs,
      anchorRealMs: init.beganMs ?? Date.now(),
      rate: init.rate,
      paused: false,
    }),
    [startMs, init.beganMs, init.rate],
  );

  const [clock, setClock] = useState<ClockState>(() =>
    init.atMs !== undefined
      ? { anchorVirtualMs: init.atMs, anchorRealMs: Date.now(), rate: init.rate, paused: true }
      : liveClock(),
  );
  const [live, setLive] = useState(init.beganMs !== undefined && init.atMs === undefined);
  const clamp = useCallback(
    (v: number) => (v < startMs ? startMs : v > endMs ? endMs : v),
    [startMs, endMs],
  );
  const [virtualMs, setVirtualMs] = useState(() => clamp(virtualNow(clock, Date.now())));
  const clockRef = useRef(clock);
  clockRef.current = clock;

  useEffect(() => {
    setVirtualMs(clamp(virtualNow(clock, Date.now())));
  }, [clock, clamp]);

  // Advance while playing. Fast paces want smooth motion; real time moves metres a
  // minute, so a slow tick is plenty (and kind to a display that runs for months).
  useEffect(() => {
    if (clock.paused) return;
    const interval = clock.rate >= 600 ? 33 : 1000;
    const id = setInterval(() => {
      const c = clockRef.current;
      const now = Date.now();
      const v = virtualNow(c, now);
      if (v >= endMs) {
        setClock({ ...c, anchorVirtualMs: endMs, anchorRealMs: now, paused: true });
      } else {
        setVirtualMs(clamp(v));
      }
    }, interval);
    return () => clearInterval(id);
  }, [clock.paused, clock.rate, endMs, clamp]);

  const detach = useCallback(() => setLive(false), []);

  const toggle = useCallback(() => {
    detach();
    setClock((c) => {
      const now = Date.now();
      // Pressing play at the very end starts the journey over.
      if (c.paused && virtualNow(c, now) >= endMs) {
        return { anchorVirtualMs: startMs, anchorRealMs: now, rate: c.rate, paused: false };
      }
      return reanchor(c, now, { paused: !c.paused });
    });
  }, [detach, startMs, endMs]);

  const setRate = useCallback(
    (rate: number) => {
      detach();
      setClock((c) => reanchor(c, Date.now(), { rate }));
    },
    [detach],
  );

  const seek = useCallback(
    (v: number) => {
      detach();
      setClock((c) => ({
        anchorVirtualMs: v,
        anchorRealMs: Date.now(),
        rate: c.rate,
        paused: c.paused,
      }));
    },
    [detach],
  );

  const goLive = useCallback(() => {
    setClock(liveClock());
    setLive(true);
  }, [liveClock]);

  return {
    virtualMs,
    paused: clock.paused,
    rate: clock.rate,
    live,
    toggle,
    setRate,
    seek,
    goLive: init.beganMs !== undefined && !live ? goLive : null,
  };
}
