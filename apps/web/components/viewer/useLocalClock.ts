"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reanchor, virtualNow, type ClockState } from "@living-journeys/engine";

export type LocalClock = {
  virtualMs: number;
  paused: boolean;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setRate: (rate: number) => void;
  seek: (virtualMs: number) => void;
};

/**
 * A purely client-side clock for the anonymous Phase 2 viewer. It anchors to
 * `Date.now()` — fine for local-only playback. Phase 3 replaces this with the
 * server-anchored, event-sourced run clock; the engine math (virtualNow / reanchor)
 * is identical, so the swap is transparent to the UI.
 *
 * Ticking uses `setInterval` (not requestAnimationFrame) so playback keeps advancing
 * in a backgrounded tab, and control changes are reflected immediately.
 */
export function useLocalClock(startMs: number, endMs: number, initialRate: number): LocalClock {
  const [clock, setClock] = useState<ClockState>(() => ({
    anchorVirtualMs: startMs,
    anchorRealMs: Date.now(),
    rate: initialRate,
    paused: true,
  }));
  const [virtualMs, setVirtualMs] = useState(startMs);
  const clockRef = useRef(clock);
  clockRef.current = clock;

  // Reflect control changes (seek / pause / rate) immediately, even in a hidden tab.
  useEffect(() => {
    const v = virtualNow(clock, Date.now());
    setVirtualMs(v < startMs ? startMs : v > endMs ? endMs : v);
  }, [clock, startMs, endMs]);

  // Advance while playing.
  useEffect(() => {
    const id = setInterval(() => {
      const c = clockRef.current;
      if (c.paused) return;
      const now = Date.now();
      const v = virtualNow(c, now);
      if (v >= endMs) {
        setClock((prev) =>
          prev.paused ? prev : { ...prev, anchorVirtualMs: endMs, anchorRealMs: now, paused: true },
        );
        setVirtualMs(endMs);
      } else {
        setVirtualMs(v < startMs ? startMs : v);
      }
    }, 50);
    return () => clearInterval(id);
  }, [startMs, endMs]);

  const play = useCallback(() => setClock((c) => reanchor(c, Date.now(), { paused: false })), []);
  const pause = useCallback(() => setClock((c) => reanchor(c, Date.now(), { paused: true })), []);
  const toggle = useCallback(
    () => setClock((c) => reanchor(c, Date.now(), { paused: !c.paused })),
    [],
  );
  const setRate = useCallback((rate: number) => setClock((c) => reanchor(c, Date.now(), { rate })), []);
  const seek = useCallback(
    (v: number) =>
      setClock((c) => ({ anchorVirtualMs: v, anchorRealMs: Date.now(), rate: c.rate, paused: c.paused })),
    [],
  );

  return { virtualMs, paused: clock.paused, rate: clock.rate, play, pause, toggle, setRate, seek };
}
