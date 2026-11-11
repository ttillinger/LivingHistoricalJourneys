"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evaluate, loadJourney } from "@living-journeys/engine";
import type { JourneyBundle } from "@living-journeys/content";
import { dayNumber, formatDate, formatLocalTime, formatStat, statUnit } from "@/lib/format";
import type { StyleId } from "@/lib/mapStyles";
import { Timeline } from "./Timeline";
import { useJourneyClock, type ClockInit } from "./useJourneyClock";

const JourneyMap = dynamic(() => import("./JourneyMap"), { ssr: false });

const MS_PER_DAY = 86_400_000;
const DEFAULT_RATE = 21_600; // six hours a second: the campaign in about twelve minutes
const IDLE_MS = 3_500;

/**
 * Link parameters:
 *   ?began=<ISO>  a live run that started at that real-world instant (&pace=N, default 1)
 *   ?t=<ISO>      open paused at a moment in the journey
 *   ?frame=1      no controls at all — for a wall display
 */
function readLink(): { init: ClockInit; frame: boolean } {
  const q = new URLSearchParams(window.location.search);
  const began = Date.parse(q.get("began") ?? "");
  const at = Date.parse(q.get("t") ?? "");
  const pace = Number(q.get("pace"));
  const live = Number.isFinite(began);
  return {
    init: {
      beganMs: live ? began : undefined,
      atMs: Number.isFinite(at) ? at : undefined,
      rate: pace > 0 ? pace : live ? 1 : DEFAULT_RATE,
    },
    frame: q.get("frame") === "1",
  };
}

export default function JourneyViewer({ bundle }: { bundle: JourneyBundle }) {
  const loaded = useMemo(() => loadJourney(bundle.manifest, bundle.routeCoords), [bundle]);
  const [link] = useState(readLink);
  const clock = useJourneyClock(loaded.startMs, loaded.endMs, link.init);
  const snapshot = useMemo(() => evaluate(loaded, clock.virtualMs), [loaded, clock.virtualMs]);

  const [styleId, setStyleId] = useState<StyleId>("period");
  const [followId, setFollowId] = useState(loaded.primaryTrackId);
  const [follow, setFollow] = useState(true);
  const [overviewNonce, setOverviewNonce] = useState(0);
  const breakFollow = useCallback(() => setFollow(false), []);
  const [showSources, setShowSources] = useState(false);

  // Controls step back when nobody is touching anything.
  const [active, setActive] = useState(true);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wake = useCallback(() => {
    setActive(true);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setActive(false), IDLE_MS);
  }, []);
  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [wake]);
  const showControls = !link.frame && (active || clock.paused);

  const track = loaded.tracks[followId] ?? loaded.tracks[loaded.primaryTrackId]!;
  const trackSnap = snapshot.tracks[track.def.id]!;

  // Where the followed track last was, in the words of its own schedule.
  const place = useMemo(() => {
    let label: string | undefined;
    for (const k of track.schedule) {
      if (k.t > clock.virtualMs) break;
      if (k.label) label = k.label;
    }
    return label;
  }, [track, clock.virtualMs]);

  // Stats, each with its change over the last day of the journey.
  const stats = useMemo(() => {
    const before = evaluate(loaded, Math.max(loaded.startMs, clock.virtualMs - MS_PER_DAY));
    return Object.entries(track.statSeries).map(([key, series]) => {
      const now = trackSnap.stats[key] ?? 0;
      const delta = now - (before.tracks[track.def.id]?.stats[key] ?? now);
      const initial = series.keyframes[0]?.v ?? now;
      return { key, label: series.label, format: series.format, now, delta, initial };
    });
  }, [loaded, track, trackSnap, clock.virtualMs]);

  // Night only reads as night when a day lasts long enough to watch.
  const nightOpacity =
    clock.rate <= 3_600
      ? Math.max(0, Math.min(1, -snapshot.solar.altitudeDeg / 10)) * 0.5
      : 0;

  const moment = snapshot.currentMoment;
  const episode = snapshot.activeEpisode;
  const day = dayNumber(loaded.startMs, clock.virtualMs);

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden ${link.frame ? "cursor-none" : ""}`}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <JourneyMap
        journey={loaded}
        labels={bundle.labels}
        snapshot={snapshot}
        styleId={styleId}
        follow={follow}
        followTrackId={track.def.id}
        overviewNonce={overviewNonce}
        onBreakFollow={breakFollow}
      />
      <div className="night-veil" style={{ opacity: nightOpacity }} />
      {styleId === "period" ? <div className="paper-grain" /> : null}

      {/* Top: where you are, and whose march you follow. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-5">
        <div
          className={`pointer-events-auto transition-opacity duration-700 ${showControls ? "opacity-100" : "opacity-0"}`}
        >
          <Link href="/" className="caps text-[13px] text-ink-soft hover:text-ink">
            ← All journeys
          </Link>
          <h1 className="hidden font-display text-[22px] leading-tight text-ink sm:block">
            {loaded.manifest.title}
          </h1>
        </div>

        <div className="card pointer-events-auto w-[190px] px-4 py-3 sm:w-[250px]">
          <div className="flex flex-col gap-1">
            {loaded.manifest.tracks.map((t) => {
              const selected = t.id === track.def.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`Follow ${t.name}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setFollowId(t.id);
                    setFollow(true);
                  }}
                  className={`flex items-center gap-2 text-left text-[16px] leading-tight ${selected ? "text-ink" : "text-ink-soft hover:text-ink"}`}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: t.color ?? "#9c3524" }}
                  />
                  <span className={selected ? "font-display italic" : ""}>{t.name}</span>
                </button>
              );
            })}
          </div>

          {stats.length > 0 ? <div className="my-2.5 h-px bg-ink/20" /> : null}
          {stats.map((s) => (
            <div key={s.key} className="mb-1.5 last:mb-0">
              <div className="caps text-[12px] text-ink-soft">{s.label}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[26px] leading-none tabular-nums">
                  {formatStat(s.now, s.format)}
                </span>
                <span className="text-[14px] italic text-ink-soft">{statUnit(s.format)}</span>
              </div>
              {s.format === "men" ? (
                <>
                  <div className="mt-1 h-[5px] w-full bg-ink/10">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, (s.now / s.initial) * 100))}%`,
                        background: track.def.color ?? "#9c3524",
                      }}
                    />
                  </div>
                  {Math.abs(s.delta) >= 1 ? (
                    <div className="mt-0.5 text-[13px] italic text-ink-soft">
                      {s.delta < 0 ? "−" : "+"}
                      {Math.abs(Math.round(s.delta)).toLocaleString("en-US")} since yesterday
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: the date, the latest dispatch, and the controls. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 pb-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="card pointer-events-auto max-w-[460px] px-5 py-4">
            {episode ? (
              <div className="caps mb-1 text-[13px] text-carmine">{episode.title}</div>
            ) : null}
            <div className="font-display text-[28px] leading-none sm:text-[38px]">{formatDate(clock.virtualMs)}</div>
            <div className="mt-2 text-[17px] leading-snug">
              <span className="caps text-[14px] text-ink-soft">Day {day}</span>
              {place ? <span> · {place}</span> : null}
            </div>
            <div className="text-[15px] italic leading-snug text-ink-soft">
              {clock.rate <= 3_600
                ? `${formatLocalTime(clock.virtualMs, trackSnap.position[0])} · `
                : ""}
              {snapshot.activity.label}
              {clock.rate <= 3_600 && trackSnap.isHalted && snapshot.activity.key !== "camp"
                ? " · halted"
                : ""}
              {snapshot.activity.weather ? ` · ${snapshot.activity.weather}` : ""}
            </div>
            {episode?.currentBeat ? (
              <p className="mt-2 border-t border-ink/20 pt-2 text-[16px] leading-snug">
                {episode.currentBeat}
              </p>
            ) : null}
          </div>

          {moment ? (
            <div key={moment.t} className="card fade-in pointer-events-auto hidden max-w-[400px] px-5 py-4 sm:block">
              <div className="caps text-[12px] text-ink-soft">
                {formatDate(Date.parse(moment.t))}
              </div>
              <div className="font-display text-[22px] italic leading-tight">{moment.title}</div>
              {moment.body ? (
                <p className="mt-1.5 text-[16px] leading-snug">{moment.body}</p>
              ) : null}
              {moment.quote ? (
                <blockquote className="mt-2 border-l-2 border-carmine/60 pl-3 text-[15px] italic leading-snug text-ink-soft">
                  “{moment.quote.text}”
                  <footer className="caps mt-0.5 text-[11px] not-italic">{moment.quote.by}</footer>
                </blockquote>
              ) : null}
              {moment.refs?.length ? (
                <div className="caps mt-2 text-[11px] text-ink-soft">
                  After{" "}
                  {moment.refs
                    .map((id) => loaded.manifest.bibliography.find((b) => b.id === id)?.short)
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {link.frame ? null : (
          <div
            className={`transition-opacity duration-700 ${showControls ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          >
            <div className="mb-2 flex justify-center gap-3">
              {!follow ? (
                <button
                  type="button"
                  onClick={() => setFollow(true)}
                  className="card px-4 py-1.5 text-[15px] italic hover:text-carmine"
                >
                  Return to the {track.def.name}
                </button>
              ) : null}
              {clock.goLive ? (
                <button
                  type="button"
                  onClick={clock.goLive}
                  className="card px-4 py-1.5 text-[15px] italic hover:text-carmine"
                >
                  Return to the live march
                </button>
              ) : null}
            </div>
            <Timeline
              journey={loaded}
              virtualMs={clock.virtualMs}
              paused={clock.paused}
              rate={clock.rate}
              styleId={styleId}
              onToggle={clock.toggle}
              onSeek={clock.seek}
              onSetRate={clock.setRate}
              onSetStyle={setStyleId}
              onOverview={() => {
                setFollow(false);
                setOverviewNonce((n) => n + 1);
              }}
              onSources={() => setShowSources(true)}
            />
          </div>
        )}
      </div>

      {showSources ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-ink/30 p-4"
          onClick={() => setShowSources(false)}
        >
          <div
            role="dialog"
            aria-label="Sources"
            className="card max-h-[85dvh] w-full max-w-[640px] overflow-y-auto px-6 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-display text-[26px] leading-tight">Sources</h2>
              <button
                type="button"
                onClick={() => setShowSources(false)}
                className="text-[15px] italic text-ink-soft hover:text-ink"
              >
                Close
              </button>
            </div>
            {loaded.manifest.notes.length > 0 ? (
              <>
                <h3 className="caps mt-3 text-[12px] text-carmine">How far to trust this</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-snug">
                  {loaded.manifest.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </>
            ) : null}
            {loaded.manifest.bibliography.length > 0 ? (
              <>
                <h3 className="caps mt-4 text-[12px] text-carmine">Works consulted</h3>
                <ul className="mt-1 space-y-1 text-[15px] leading-snug">
                  {loaded.manifest.bibliography.map((b) => (
                    <li key={b.id}>
                      {b.url ? (
                        <a href={b.url} target="_blank" rel="noreferrer" className="underline decoration-ink/30 hover:text-carmine">
                          {b.citation}
                        </a>
                      ) : (
                        b.citation
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <h3 className="caps mt-4 text-[12px] text-carmine">Credits</h3>
            <ul className="mt-1 space-y-1 text-[15px] leading-snug">
              {[...loaded.manifest.sources, ...loaded.manifest.attribution].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {clock.live ? (
        <div className="caps pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 text-[13px] text-carmine">
          ● Live · as it happened, {new Date().getFullYear() - 1812} years on
        </div>
      ) : null}
    </div>
  );
}
