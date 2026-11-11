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
- [x] **R2 — Napoleon to the content bar** (2026-11-10). Four research passes with web
  sources replaced the from-memory content: Napoleon's headquarters stop by stop,
  the Russian main army's, 122 cited moments, strength and temperature keyframes
  tied to named sources, timed beats for every battle, and a Sources panel in the
  viewer with the caveats in plain words. The engine honours `dailyRhythm`. What is
  still soft is listed in `content/journeys/napoleon-1812/README.md`.
- [ ] **R3 — The other journeys** (started 2026-11-10; moved ahead of frame mode at the
  owner's request). Each of the three proof-of-concept ports rebuilt to Napoleon's
  standard: a sourced route, dated stops, cited moments, a Sources panel.
  - [x] Shackleton's Endurance expedition, 1914–16 (2026-11-11).
  - [x] The Oregon emigration of 1843 (2026-11-11).
  - [ ] Silk Road, c. 1300 — needs an owner decision first: the port is an invented
    "typical caravan", so there is nothing to source. See *Open decisions*.
- [ ] **R4 — Frame mode proper** (HANDOFF §8). `/frame` route, layout presets
  (map-dominant, scene-dominant, moment, chapter), director camera, burn-in drift,
  portrait, a 24-hour unattended soak. Candidate signature: draw the travelled route
  with its width proportional to army strength, as Minard did.
- [ ] **R5 — Scenes** (HANDOFF §9). Curated stills resolved from engine state, with
  slow crossfades; art-direction doc and ~15 images per journey; licence line for each.
- [ ] **R6 — Accounts, runs, server clock, phone remote** (HANDOFF §6, §10). Needs the
  database — see *Database* below. The link-anchored live run from R1 is the stopgap
  until then and should keep working afterwards.
- [ ] **R7 — Social and email** (HANDOFF §10).
- [ ] **R8 — Catalogue and payments** (HANDOFF §10). Every journey but Napoleon is
  marked `premium` in its content; nothing enforces that yet.
- [ ] **Later** — fictional-map adapter, georeferenced period rasters, author toolkit.

## Napoleon tidy-up

Accepted as good enough on 2026-11-10; none of this blocks anything. Pick items up
when working in that journey anyway. Detail is in
`content/journeys/napoleon-1812/README.md` and the `openQuestions` of each research file.

- [ ] The title page says 422,000 men crossed the Niemen (Minard's whole army); the
  counter in the viewer starts at 340,000 (his central column). Make them agree.
- [ ] Russian route: it rests mainly on one day-by-day chronicle. Check it against
  Lieven, Mikaberidze and Clausewitz, none of which was read directly.
- [ ] Night stops known from one source only: Kokhanovo (21 Nov), Oshmiany and
  Miedniki (6–7 Dec), and the post-house of 8 Nov, which is not on the map at all.
- [ ] Villages placed by a gazetteer lookup, not a cited coordinate: Gorodnya,
  Velichevo, Gridnevo, Petelino, Staiki, Rasasna. Russian headquarters at Shilovo
  is drawn at Krasny, 5 km off.
- [ ] Temperatures before 18 October are seasonal estimates. Find readings, or show
  no temperature until Minard's begin.
- [ ] Army strength mixes sources that count different things. Settle on one basis,
  or show a range.
- [ ] 122 moments is over the 60–100 guide. Cut or demote the weakest.
- [ ] Three eyewitness quotes were left out for want of a public-domain translation;
  translate them here from the French originals.
- [ ] Routes follow today's roads, and six legs are straight lines. Trace the 1812
  post roads from a period map.

## Open decisions

- **Silk Road.** The port is a generic caravan from Xi'an to Constantinople in an
  arbitrary year. Options: replace it with a real, dated journey along the same roads
  (William of Rubruck 1253–55 has a day-level itinerary; Marco Polo 1271–75 is the
  famous one but his dates are vague), or keep a composite and label it as one.
- **The engine was kept, not rewritten** (R1). The owner asked for a rebuild from
  scratch and has not yet confirmed this call.

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

- **2026-11-11 — R3, first two journeys.** Four research passes, as for Napoleon.
  Found for Shackleton: he was not aboard when the ship left Plymouth; farthest south
  is printed three ways; the wreck lies five miles from Worsley's reckoning; South
  and Worsley's log disagree by 90 minutes on the rescue. Found for Oregon: the
  emigration travelled as one body for only eight days; the wagons of 1843 probably
  never went through Ash Hollow; nobody counted the people; the Applegate drowning
  has no recorded date. DECISION: the Shackleton marker follows Shackleton, from
  Buenos Aires where he joined; the 22 on Elephant Island are a second track that
  exists only while they are apart. DECISION: the Oregon marker is one wagon party
  (Nesmith's, the only day-by-day diary) to Fort Walla Walla, then the main body.
  DECISION: the Oregon route is the National Park Service's surveyed trail line,
  not modern roads. DECISION: the journey is titled "The Oregon Emigration of
  1843" to stay clear of the game trademark. DECISION: Shackleton and Oregon are
  told in the past tense, Napoleon in the present; each is consistent within itself.
  Engine and viewer gained: tracks that appear and leave, stats that lapse, a
  camera zoom per condition, a default pace chosen from the journey's length, and
  title-page cards drawn from each journey's own content. One browser test failed
  once on the first cold run (a client error after switching tracks in Napoleon)
  and passed on every run after; not reproduced, cause unknown.

- **2026-11-10 — R2.** Found: the from-memory schedule had Napoleon marching
  continuously where he sat 18 days in Vilna and 15 in Vitebsk; put him at Vyazma on
  the day of the battle (he was a march ahead); had him in the Kremlin a day early;
  and put Ney's fight at Krasny two days early. Its strength curve matched no source,
  and was flat through the Moscow stay, when the army grew. All clock times were
  written as if UTC were local time, so every dawn attack showed two hours late.
  DECISION: the Grande Armée marker is Napoleon's headquarters (the best-documented
  point in the army), then Murat's column after 5 December. DECISION: strength follows
  Minard's central column (340,000 at the Niemen, not his 422,000 for the whole army)
  with the 2 September roll call and later historians where they are better; the
  marker ends at 4,000 at Kovno, and the last moment gives Minard's 10,000. DECISION:
  moments cite works, not URLs (`refs` → `bibliography`); the URLs are in `research/`.
  DECISION: eyewitness quotes only from public-domain translations or translated
  here; three quotes available only in a modern translation were left out.

- **2026-11-09 — R0, R1.** Found: the July viewer's map collapsed to zero height in a
  production build (MapLibre's own CSS overrode the container's positioning), so the
  deployed site showed overlays on black. The e2e test now asserts the map's height.
  DECISION: place names are DOM markers, not map-rendered text — no serif glyph set is
  available from the tile host, and DOM gives real typography. DECISION: routes follow
  today's roads as a stand-in for period ones; six legs with no usable modern road
  (a closed border, the Dnieper and Berezina crossings, tracks near Borodino, Vereya
  and Podolsk) are straight lines, marked `"straight": true` in `authoring.json`.
  DECISION: the engine was kept — it is small, pure and its 46 tests pass.
