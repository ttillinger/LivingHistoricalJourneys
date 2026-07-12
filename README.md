# Living Historical Journeys

An ambient web app for following historical journeys **in real time or scaled time**.
Start Napoleon's 1812 Russian campaign on June 24 and watch the Grande Armée creep
across a period-styled map for six months — or compress the whole campaign into a
week. Built for wall-mounted art frames first, desktop second, phone as a remote.

> **Napoleon 1812 is free forever** (the showcase). The rest of the catalog sits
> behind a subscription. See [`HANDOFF.md`](./HANDOFF.md) for the full product and
> engineering plan.

## Status

**Phase 2 — Viewer.** A working MapLibre viewer runs any journey end-to-end in the
browser: route + marker + travelled line, follow/free camera, moment/stats/legend/
date overlays, and local-clock play / speed / seek. Try `/viewer/napoleon-1812`.
Phases 0 (scaffold + CI) and 1 (pure engine + content) are complete. Next up: Phase 3
(accounts, runs, server-anchored clock, mobile remote).

## Repository layout

```
living-journeys/
├── apps/web/          # Next.js app (App Router, TS strict, Tailwind v4)
├── packages/engine/   # pure TS: clock + content schema (no React/DOM/Supabase)
├── content/           # journey manifests + validation pipeline
└── supabase/          # migrations + seed
```

The **engine is pure and framework-free** — every derived journey state (position,
activity, stats, day/night, current moment) is a function of `(content, virtualTime)`,
so the frame, desktop viewer, mobile remote, and email digests all render the same
state. This is the central design rule (`HANDOFF.md` §4).

## Prerequisites

- Node 20+ (this repo develops on 24 — see `.nvmrc`)
- pnpm 9 (`corepack enable` or `npm i -g pnpm@9`)

## Development

```bash
pnpm install
pnpm dev              # http://localhost:3000
```

## Quality gates (the same ones CI runs)

```bash
pnpm lint             # eslint (flat config, repo-wide)
pnpm typecheck        # tsc --noEmit across packages
pnpm test             # vitest (engine golden tests)
pnpm validate:content # journey manifests vs. the engine schema
pnpm build            # next build
```

## Notes

- Develop **outside OneDrive** on Windows — `node_modules` + OneDrive sync is a
  file-lock/perf hazard (`HANDOFF.md` §3).
- Server time is the only wall clock for persistent state; client time is only for
  intra-frame animation (`HANDOFF.md` §14.2).
