# Living Historical Journeys

An ambient web app for following a historical journey across a period map in real or
scaled time. Live at https://journeys.esportsball.com — **every push to `main` deploys.**

## Session workflow

1. Read **[ROADMAP.md](ROADMAP.md)** first: the phase order, hosting, gates and log.
   Work the first unchecked phase. [HANDOFF.md](HANDOFF.md) is the design reference
   the roadmap points into (*HANDOFF §N*).
2. `git pull --ff-only`, then a green baseline before changing anything.
3. When done: run the gates, tick the phase, add a log entry, commit, push to
   `origin main` (standing authorization — see `..\AGENTS.md`). Never push red work:
   it goes straight to the public site.
4. Look at what you built. Screenshot the viewer in a real browser before calling
   visual work done — the first build shipped a map that rendered black.

## Structure

- `packages/engine` — pure TypeScript: clock, geometry, solar, schema, `evaluate`.
  **No React, DOM, Node or Supabase imports** (lint-enforced). Every piece of journey
  state is a function of `(content, virtualTime)`; a renderer that needs
  journey-specific behaviour gets a schema extension, never an `if (journeyId === …)`.
- `content` — journey sources and the build that turns them into bundles.
  `authoring.json`, `labels.json` and `roads.json` are inputs; `journey.json`,
  `bundle.json` and `routes/*.geojson` are **generated** by `pnpm content:build`.
- `apps/web` — Next.js 15 + React 19 + Tailwind 4. `components/journey/` is the viewer
  (`JourneyViewer` owns the clock and layout, `JourneyMap` owns MapLibre),
  `lib/mapStyles.ts` holds the period style.

## Commands

`pnpm` is not on this machine's PATH; use `npx pnpm@9 <command>`.

- `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm validate:content` / `pnpm build`
- `pnpm test:e2e` — Playwright smoke test
- `pnpm content:build` — regenerate bundles after editing any content source
- `pnpm --filter @living-journeys/content trace <slug>` — re-trace road geometry after
  moving a route vertex (calls the public OSRM server; results are cached in `roads.json`)

## Hard rules

- Cut features, not quality: one gorgeous journey beats five mediocre ones.
- Content edits bump `version` in `authoring.json`.
- Content timestamps are UTC written from local mean time, and every moment cites a
  source — read `content/journeys/napoleon-1812/README.md` before editing content.
- Every map raster, scene image and quoted text gets a source and licence line before
  merge (HANDOFF §11, §14.6).
- Server time is the only wall clock for persisted state (HANDOFF §14.2).
