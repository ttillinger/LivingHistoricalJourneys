"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { anniversaryStart, startOnDay } from "@living-journeys/engine";
import { formatDate, formatRealDate } from "@/lib/format";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Choosing when a live run sets out. The link itself records the start (`?began=`),
 * so opening it again — on any device, months from now — shows how far they have got.
 */
export function LiveStartDialog({
  slug,
  startMs,
  endMs,
  onClose,
}: {
  slug: string;
  startMs: number;
  endMs: number;
  onClose: () => void;
}) {
  // Read the clock once, so the three choices agree with each other.
  const [now] = useState(() => Date.now());
  const [day, setDay] = useState(() => {
    const d = new Date(now);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const begin = (beganMs: number) =>
    window.location.assign(
      `/viewer/${slug}?began=${encodeURIComponent(new Date(beganMs).toISOString())}`,
    );

  const calendar = anniversaryStart(startMs, endMs, now);
  const [y, m, d] = day.split("-").map(Number);
  const chosen = y && m && d ? startOnDay(startMs, y, m - 1, d) : NaN;

  const choice =
    "block w-full border border-ink/30 px-4 py-3 text-left transition-colors hover:border-carmine";

  // On the page itself, not inside a card: a card's blur would pin the dialog to it.
  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/30 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Follow in real time"
        className="card max-h-[92dvh] w-full max-w-[520px] overflow-y-auto px-6 py-5 text-ink"
        style={{ background: "rgb(243 234 212)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-[26px] leading-tight">Follow in real time</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] italic text-ink-soft hover:text-ink"
          >
            Close
          </button>
        </div>
        <p className="mt-1 text-[15px] leading-snug text-ink-soft">
          The journey takes as long as it took them. Choose the day it sets out; the link
          you land on remembers it, so keep it.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <button type="button" className={choice} onClick={() => begin(now)}>
            <div className="font-display text-[20px] leading-tight">Set out now</div>
            <div className="text-[15px] italic leading-snug text-ink-soft">
              Day 1 begins this minute. Journey’s end falls on{" "}
              {formatRealDate(now + (endMs - startMs))}.
            </div>
          </button>

          <button type="button" className={choice} onClick={() => begin(calendar)}>
            <div className="font-display text-[20px] leading-tight">Keep its own calendar</div>
            <div className="text-[15px] italic leading-snug text-ink-soft">
              {calendar <= now
                ? `Each day falls on its own date: today is ${formatDate(startMs + (now - calendar))}.`
                : `It sets out on ${formatRealDate(calendar)}, the day it set out in ${new Date(startMs).getUTCFullYear()}.`}
            </div>
          </button>

          <div className="border border-ink/30 px-4 py-3">
            <label className="font-display text-[20px] leading-tight" htmlFor={`set-out-${slug}`}>
              Set out on a day you choose
            </label>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <input
                id={`set-out-${slug}`}
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="border-b border-ink/40 bg-transparent py-0.5 text-[16px] text-ink focus:outline-none"
              />
              <button
                type="button"
                disabled={!Number.isFinite(chosen)}
                onClick={() => begin(chosen)}
                className="border border-ink px-4 py-1 font-display text-[17px] transition-colors hover:border-carmine hover:bg-carmine hover:text-paper disabled:opacity-40"
              >
                Begin
              </button>
            </div>
            <div className="mt-1 text-[15px] italic leading-snug text-ink-soft">
              A day already past joins the journey part-way; a day to come waits for it.
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The title page's way in: a line of text that opens the choice of start. */
export function LiveStartLink({
  slug,
  start,
  end,
  label,
}: {
  slug: string;
  start: string;
  end: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-left font-display text-[19px] italic text-ink underline decoration-ink/40 underline-offset-4 hover:text-carmine hover:decoration-carmine"
      >
        {label}
      </button>
      {open ? (
        <LiveStartDialog
          slug={slug}
          startMs={Date.parse(start)}
          endMs={Date.parse(end)}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
