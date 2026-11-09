# Roadmap

The session contract. Work the first unchecked phase; keep `main` shippable — every push
to `main` goes live at **https://journeys.esportsball.com** within about four minutes.

[`HANDOFF.md`](./HANDOFF.md) (July 2026) remains the design reference: the product
vision, the pure-engine rule (§4), the content model (§5), the run clock (§6), the map
system (§7), frame mode (§8), scenes (§9), the data model (§10), licensing (§11) and the
working agreements (§14) all still stand. **This file replaces its phase order (§13) and
its hosting assumptions (§3, §15)**, for two reasons found in November 2026:

- The first build followed §13 and reached a working viewer whose look fell well short
  of the brief — and whose map did not render at all in a production build. What the
  owner judges the product by is the map, the route and the wall display, so those now
  come before accounts and social features.
- Hosting is the crew's home server, not a Vercel-style platform or cloud Supabase.

## Phases

- [x] **R0 — Hosting** (2026-11-09). Docker image + compose, auto-deploy poller,
  `journeys.esportsball.com` through the shared Cloudflare tunnel. See *Hosting* below.
- [x] **R1 — The look** (2026-11-09). Web layer rebuilt from scratch; the engine was
  read, judged sound and kept. Period map style (paper, water, woods, rivers — nothing
  modern), period place names, routes that follow roads (2,300 vertices, traced once
  from OSRM and committed), night falling at the army's position, local mean time,
  strength with its daily loss, a timeline with episodes marked, a live link
  (`?began=`) that needs no account, a wall-display link (`&frame=1`), a new title page.
- [ ] **R2 — Napoleon to the content bar** (HANDOFF §12). A research session with web
  sources, not an engineering one. 60–100 moments; daily-resolution schedule; strength
  for both armies reconciled with modern scholarship; every date and place checked
  (the Russian track's dates and several French ones were written from memory in R1 and
  are the least trustworthy thing on the site); sources and attribution shown in-app.
  Engine: honour `dailyRhythm` so the army halts at night instead of creeping through it.
- [ ] **R3 — Frame mode proper** (HANDOFF §8). `/frame` route, layout presets
  (map-dominant, scene-dominant, moment, chapter), director camera, burn-in drift,
  portrait, a 24-hour unattended soak. Candidate signature: draw the travelled route
  with its width proportional to army strength, as Minard did.
- [ ] **R4 — Scenes** (HANDOFF §9). Curated stills resolved from engine state, with
  slow crossfades; art-direction doc and ~15 images for Napoleon; licence line for each.
- [ ] **R5 — Accounts, runs, server clock, phone remote** (HANDOFF §6, §10). Needs the
  database — see *Database* below. The link-anchored live run from R1 is the stopgap
  until then and should keep working afterwards.
- [ ] **R6 — Social and email** (HANDOFF §10).
- [ ] **R7 — Second journey, catalogue, payments** (HANDOFF §12, §10). Shackleton at
  full quality; the three proof-of-concept ports (Oregon Trail, Shackleton, Silk Road)
  stay off the title page until each is rebuilt to the bar.
- [ ] **Later** — fictional-map adapter, georeferenced period rasters, author toolkit.

## Hosting

- Server: `nateception-server` (the crew's home box). Repo at `~/projects/living-journeys`.
- Container `journeys-web`, bound to `127.0.0.1:3006`, on Docker's default bridge network
  (the box has no free address pool for per-project networks).
- Deploy: `ops/server/deploy-journeys.sh` runs from cron every four minutes, pulls
  `main` when it has moved and rebuilds. A commit that fails to build leaves the old
  container running. Log: `~/logs/journeys-deploy.log`.
- Public address: one ingress rule in `/etc/cloudflared/config.yml` plus a DNS record,
  both already in place. The tunnel config is shared with the other apps on the box.
- The image builds the Next standalone server. On Windows the standalone copy fails on
  symlinks, so `next.config.ts` turns it off there; local `pnpm build` still type-checks.

## Database (when R5 starts)

A self-hosted Supabase stack of its own on the same server, copied from race-intel's
(`~/projects/race-intel/ops/server/`): containers prefixed `journeys-`, its own ports,
a second hostname `journeys-api.esportsball.com`, schema applied from
`supabase/migrations/`. It also needs an outgoing mail account for sign-in emails, and
an entry in the box's nightly backup script. Realtime is part of that stack.

## Gates

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm validate:content && pnpm build
pnpm test:e2e      # Playwright; needs `pnpm start` or will launch it
```

`pnpm typecheck` does not cover `apps/web`; `pnpm build` does.

## Log

- **2026-11-09 — R0, R1.** Found: the July viewer's map collapsed to zero height in a
  production build (MapLibre's own CSS overrode the container's positioning), so the
  deployed site showed overlays on black. The e2e test now asserts the map's height.
  DECISION: place names are DOM markers, not map-rendered text — no serif glyph set is
  available from the tile host, and DOM gives real typography. DECISION: routes follow
  today's roads as a stand-in for period ones; six legs with no usable modern road
  (a closed border, the Dnieper and Berezina crossings, tracks near Borodino, Vereya
  and Podolsk) are straight lines, marked `"straight": true` in `authoring.json`.
  DECISION: the engine was kept — it is small, pure and its 46 tests pass.
