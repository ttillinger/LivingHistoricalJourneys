# Living Historical Journeys — Rebuild Handoff

**Status:** Planning document. No rebuild code exists yet. The files currently in this
directory (`index.html`, `events/*.json`, `sprites/*.png`) are the proof of concept and
are treated as *reference material and seed content*, not as a starting codebase.

**Audience:** Future Claude (Opus) sessions implementing the rebuild, phase by phase.
Each phase below is sized to be completable in roughly one focused session and ends with
concrete acceptance criteria. Read this whole document before starting any phase.

---

## 1. Product vision

An ambient web app where users follow historical journeys **in real time or scaled
time**. The canonical example: a historian starts Napoleon's 1812 Russian campaign on
June 24 and, for the next six months, their wall-mounted art frame shows the Grande
Armée creeping across a beautiful period-styled map — resting at night, fighting
multi-day battles, bleeding strength daily — until the shattered army recrosses the
Niemen in December. Or they compress the whole campaign into a month, a week, an hour.

Three surfaces, one product:

1. **Frame mode** — the flagship. A chromeless, always-on, gallery-quality display for
   "art monitor" digital frames (Samsung Frame via browser/casting, Raspberry Pi kiosk,
   Fire tablet, any fullscreen browser). Zero interaction required once launched.
2. **Desktop mode** — the rich experience. Full map interaction, journey library,
   timeline scrubbing, social features, comments, journey management.
3. **Mobile remote** — *not* a full mobile experience. A lightweight control surface:
   pause/resume/speed/seek your runs, switch what the frame displays. Changes made on
   the phone appear on the frame within a second.

Business model: **Napoleon 1812 is free forever** (the showcase). The rest of the
catalog (Oregon Trail, Shackleton, Silk Road, Lewis & Clark, Magellan, mythical
journeys…) sits behind a subscription or pack purchases. Social features (shared runs,
comments, badges) drive retention.

---

## 2. Proof-of-concept autopsy

The POC is a single 1,900-line `index.html` using Leaflet + raster tiles, with journey
data in `events/*.json` organized into packs by `events/config.json`.

### What worked — carry these ideas forward

- **The data-driven event schema.** `time {start,end}`, `mapBounds`, `tracks[]` (each
  with typed, timestamped waypoints), `moments[]` (timestamped narrative cards),
  `paceSegments[]` (activity/weather periods like "Retreat in worsening weather"). This
  is the right shape; the rebuild formalizes and extends it (Section 5).
- **The speed model.** "1× = the real pace of the original journey" is exactly the right
  mental model. Keep it, including the speed-change math that preserves current virtual
  time when the multiplier changes (POC `index.html:1709`).
- **Multiple tracks per journey.** Napoleon vs. the Russian army as parallel tracks is
  the seed of the social "pick your perspective" feature.
- **Follow mode with pan-to-break-follow + "Return to track" button.** Good UX; keep.
- **Moment cards, legend, activity/weather readouts, strength bar.** All the right
  ambient information; the rebuild redesigns their visual presentation.
- **Pack taxonomy** (Campaigns / Explorers / Migration & Trade) as catalog structure.

### What failed or was weak — the rebuild fixes these

| POC weakness | Rebuild answer |
|---|---|
| Client-only clock (`performance.now()` anchor) resets on reload, can't sync across devices | Server-anchored, event-sourced run clock (Section 6) |
| Animated AI sprites/gifs didn't work (user-confirmed) | Curated **still images** with crossfades (Section 9) |
| Attrition curve hardcoded in JS for Napoleon only (`getArmyStrengthFraction`) | Generic data-driven `statSeries` on any track (Section 5) |
| Straight-line interpolation between ~8 sparse waypoints looks wrong | Route geometry (dense LineString) separated from schedule (time→distance keyframes) (Section 5) |
| Raster tile hodgepodge (OSM/Esri/Carto) with no aesthetic control; "the map was difficult" | MapLibre GL vector tiles with handcrafted style JSONs, incl. period styles (Section 7) |
| Night detection via UTC hours | Solar time at the track's current position via suncalc — winter retreat nights are properly long |
| Everything in one file, no types, no tests | TypeScript-strict monorepo with a pure, unit-tested engine package (Section 4) |
| No accounts, persistence, or multi-device | Supabase auth + Postgres + Realtime (Sections 6, 8) |

### POC assets to reuse

- `events/*.json` — seed content. The **structure** ports over; the **data fidelity**
  must be dramatically upgraded (Section 12).
- `sprites/*.png` — do not reuse. The still-image system replaces them.

---

## 3. Stack decision

Consistent with the team's existing Node.js + Tailwind + Supabase deployment experience:

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router, latest stable), TypeScript strict** | It *is* a Node.js app; deploys like the other projects. RSC for catalog/social pages; the map viewer is a client component. |
| Styling | **Tailwind CSS v4** + shadcn/ui for app chrome | Frame mode uses bespoke CSS (Section 8) — gallery aesthetics, not dashboard aesthetics. |
| Map | **MapLibre GL JS** (not Leaflet) | Vector tiles = total aesthetic control, smooth camera, terrain. The single biggest quality jump over the POC. |
| Base tiles | **OpenFreeMap** (free, no key) to start; **self-hosted PMTiles (Protomaps)** when scaling; MapTiler as managed fallback | Decision can be deferred — the map layer abstracts the source. |
| Terrain/hillshade | AWS Terrain Tiles (terrarium, free) via MapLibre `raster-dem` | Optional toggle, as in POC. |
| Backend | **Supabase**: Auth, Postgres + RLS, Realtime (clock sync + presence), Storage (scene images, fictional map tiles) | |
| Scheduled jobs | **Next.js route handlers triggered by host cron** (Vercel Cron or equivalent) | Deliberately *not* Supabase Edge Functions (Deno) — keeps the engine package importable everywhere without a second runtime. |
| Email | **Resend + React Email** | Digest emails render journey state server-side using the same engine package. |
| Payments | **Stripe** (subscription first; packs later if wanted) | Phase 7. |
| Package manager / repo | **pnpm workspaces** monorepo | `apps/web` + `packages/engine` + `content/`. |
| Validation | **Zod** everywhere content or user input crosses a boundary | Content schema, API inputs, env vars. |
| Testing | Vitest (engine golden tests), Playwright (viewer + frame smoke tests) | |

**Repo location note:** create the new repo **outside OneDrive** (e.g.
`C:\dev\living-journeys`). `node_modules` + OneDrive sync on Windows is a known
performance/file-lock hazard. Keep this planning doc's directory as archive.

### Repository layout

```
living-journeys/
├── apps/web/                    # Next.js app
│   ├── app/
│   │   ├── (marketing)/         # landing, pricing, catalog preview
│   │   ├── (app)/               # authed: library, run management, social
│   │   ├── viewer/[runId]/      # desktop viewer
│   │   ├── frame/[deviceCode]/  # frame mode (chromeless)
│   │   ├── remote/[runId]/      # mobile remote control
│   │   └── api/                 # route handlers (cron, stripe webhooks, pairing)
│   ├── components/map/          # MapLibre wrapper, adapters, camera director
│   ├── components/overlays/     # moment cards, stats, legend, scene panel
│   └── lib/supabase/            # typed clients (browser/server/service)
├── packages/engine/             # PURE TypeScript. No React, no DOM, no Supabase.
│   ├── src/clock.ts             # virtual-time math (Section 6)
│   ├── src/journey.ts           # position/activity/stats/moments evaluation
│   ├── src/solar.ts             # day/night via suncalc at current position
│   ├── src/schema.ts            # Zod schemas for journey content
│   └── test/                    # golden tests per journey
├── content/
│   ├── journeys/napoleon-1812/
│   │   ├── journey.json         # manifest + timeline (validated by engine schema)
│   │   ├── routes/*.geojson     # dense route geometry per track
│   │   ├── labels.geojson       # period place-name overlay (Section 7)
│   │   └── scenes/              # scene manifest + curated stills
│   ├── map-styles/              # MapLibre style JSONs (modern, atlas, period styles)
│   └── scripts/                 # validate, seed-to-supabase, tile fictional maps
└── supabase/
    ├── migrations/
    └── seed.sql
```

---

## 4. Architectural spine: the pure engine

**The single most important design rule of the rebuild:**

> Every piece of derived journey state — position, activity, weather, army strength,
> day/night, current moment, camp vs. march — is a **pure function of
> `(journeyContent, virtualTime)`**, implemented in `packages/engine` with zero
> dependencies on React, the DOM, or Supabase.

Why this matters:

- The **frame**, the **desktop viewer**, the **mobile remote**, the **email digest
  job**, and **OG share images** all render the same state. One implementation, many
  surfaces.
- Rewind/seek/replay is free — evaluate at any virtual time.
- It's unit-testable with golden tests: "at 1812-09-07T10:00Z, Napoleon's track is
  within 5km of Borodino, activity is `battle`, strength ≈ 130,000."
- Journey-specific logic can never leak into renderers again (the POC's core sin).

Engine public API sketch:

```ts
// clock.ts
type ClockState = {
  anchorVirtualMs: number;  // virtual time at the anchor
  anchorRealMs: number;     // SERVER wall-clock ms at the anchor
  rate: number;             // 1 = original pace; 0 allowed? no — use paused
  paused: boolean;
};
function virtualNow(clock: ClockState, serverNowMs: number): number;

// journey.ts
type JourneySnapshot = {
  tracks: Record<TrackId, {
    position: Coord;            // in the journey's coordinate space (Section 7)
    headingDeg: number | null;
    distanceKm: number;         // along route
    activity: ActivityState;    // key, label, isHalted, episodeId?
    stats: Record<string, number>; // e.g. { strength: 132000, tempC: -22 }
  }>;
  solar: { isNight: boolean; phase: "dawn"|"day"|"dusk"|"night" };
  currentMoment: Moment | null;
  activeEpisode: Episode | null;   // durative events: battles, crossings
  momentsSince(t: number): Moment[]; // for email digests & catch-up feeds
  scene: SceneRef;                 // resolved image for current state (Section 9)
  progressFraction: number;
};
function evaluate(journey: JourneyContent, virtualMs: number): JourneySnapshot;
```

---

## 5. Journey content model

Formalizes and extends the POC schema. Authored as files in `content/journeys/`,
validated by `packages/engine/src/schema.ts` (Zod) in CI, and registered into the
`journeys` catalog table by a sync script. Free journeys' content ships statically;
premium journeys' content is served through an entitlement-checked route (Section 10).

Key structures (`journey.json`):

```jsonc
{
  "id": "napoleon-1812",
  "version": 3,                          // bump on content edits; runs pin a version
  "title": "Napoleon's 1812 Russian Campaign",
  "tier": "free",                        // "free" | "premium"
  "coordinateSpace": "geo",              // "geo" | "image" (fictional maps, Section 7)
  "time": { "start": "1812-06-24T03:00:00Z", "end": "1812-12-14T12:00:00Z" },
  "mapDefaults": { "bounds": [...], "styles": ["campaign-1812", "atlas", "modern"] },

  "tracks": [{
    "id": "grande-armee",
    "name": "Grande Armée",
    "kind": "army",
    "isPrimary": true,
    "route": "routes/grande-armee.geojson",   // dense LineString, 200+ vertices
    "schedule": [                              // time → km along route
      { "t": "1812-06-24T03:00:00Z", "km": 0,    "label": "Crossing the Niemen" },
      { "t": "1812-06-28T18:00:00Z", "km": 97,   "label": "Vilna occupied" },
      // ... daily-resolution keyframes; km plateaus model halts (Moscow: 35 days flat)
    ],
    "dailyRhythm": { "marchStartLocal": "05:00", "marchEndLocal": "20:00" },
    // Halts at night: engine freezes km progression outside march hours and
    // redistributes so schedule keyframes are still hit. Battles/episodes override.
    "statSeries": {
      "strength": {
        "label": "Army strength", "format": "men", "initial": 450000,
        "keyframes": [ { "t": "...", "v": 450000 }, { "t": "...", "v": 130000 }, ... ]
        // Sourced from Minard's chart + modern scholarship. Interpolated per-day;
        // the UI can show "≈ 1,900 men lost since yesterday".
      },
      "temperature": { "label": "Temperature", "format": "celsius", "keyframes": [...] }
    }
  },
  { "id": "russian-army", "kind": "army", ... }],

  "moments": [   // instantaneous narrative cards (as in POC, plus richness)
    { "t": "1812-09-07T05:30:00Z", "title": "Battle of Borodino begins",
      "body": "...", "tags": ["battle"], "significance": 3, "image": "scenes/borodino.jpg" }
  ],

  "episodes": [  // NEW: durative events with their own state
    { "id": "borodino", "start": "1812-09-07T05:30:00Z", "end": "1812-09-07T18:00:00Z",
      "kind": "battle", "title": "Battle of Borodino",
      "narrativeBeats": [ { "t": "...", "text": "The Grand Redoubt falls..." } ] },
    { "id": "moscow-occupation", "kind": "encampment", "start": "...", "end": "..." }
  ],

  "conditions": [ // weather/ambient periods (POC paceSegments, generalized)
    { "start": "...", "end": "...", "weather": "First snows", "activityKey": "retreat" }
  ],

  "scenes": { /* Section 9 */ },
  "labelsOverlay": "labels.geojson",   // period place names (Kowno, not Kaunas)
  "attribution": [ "Minard (1869)", "..." ],
  "sources": [ "..." ]                 // bibliography, shown in an About panel
}
```

Design notes:

- **Route/schedule separation** is the fix for the POC's straight-line movement. The
  route is drawn beautifully (following actual roads/rivers); the schedule controls
  *when* the marker is *where along it*. Authoring routes: trace in geojson.io/QGIS
  against period maps; validation script checks monotonic km, schedule bounds, etc.
- **`statSeries` is generic.** Napoleon gets `strength` + `temperature`; Oregon Trail
  gets `oxen`, `provisions`; Shackleton gets `crew`, `driftKm`. Renderers iterate
  whatever exists — zero journey-specific renderer code.
- **`episodes` vs `moments`:** moments are cards that appear in a feed; episodes change
  engine state for a duration (a multi-day battle halts the schedule, switches the
  scene, changes the frame layout). The POC conflated these in `paceSegments`.
- **Versioning:** runs store `journey_version` at creation so mid-run content edits
  don't shift someone's six-month journey under them (they can opt in to upgrade).

---

## 6. The run clock (server-anchored, event-sourced)

The heart of "real time across months and devices." A **run** is a user's (or group's)
instance of a journey.

**State:** each run has a compact clock state — `{anchorVirtualMs, anchorRealMs, rate,
paused}` — where `anchorRealMs` is **server time** (Postgres `now()`). Any client
computes `virtualNow = anchorVirtual + (serverNow − anchorReal) × rate` (frozen when
paused). O(1), no ticking process anywhere, works after weeks offline.

**Control = append-only log.** Every control action (`start`, `pause`, `resume`,
`set_rate`, `seek`) inserts a row into `run_clock_events` and transactionally updates
the materialized clock state on `runs` (a Postgres function does both atomically).
Benefits:

- Full history → rewind UI, "replay my journey," debugging.
- **Verifiable badges:** "Completed Napoleon 1812 in true real time" is provable by
  inspecting the log (no seeks, rate always 1). This falls out for free.
- Supabase Realtime broadcasts on insert → every surface (frame, desktop, phone)
  snaps to the new state within ~1s.

**Client time sync:** clients estimate server-time offset (a tiny endpoint returns
`now()`; client computes offset with round-trip halving, refreshed hourly). Drift
tolerance of ±2s is invisible at journey timescales.

**Rate semantics:** `rate = 1` is the original pace. The UI also offers "finish by
date" (e.g. "complete the remaining campaign in 30 days"), which just computes the
equivalent rate. Rewind = `seek` event backward; the log preserves the true history.

---

## 7. Map system

The POC's hardest problem. Three layers of answer:

### 7.1 Renderer: MapLibre GL + coordinate adapters

Because mythical/fictional journeys don't live on Earth, the engine emits positions in
the journey's declared `coordinateSpace` and the map layer resolves them through an
adapter:

```ts
interface MapAdapter {
  init(container: HTMLElement, journey: JourneyContent): MapHandle;
  toRender(coord: JourneyCoord): LngLatLike;   // identity for geo
}
// GeoAdapter    → real MapLibre map, vector/raster styles, terrain
// ImageAdapter  → a large illustrated map image, tiled (gdal2tiles → raster tiles
//                 in Supabase Storage), displayed in an image-coordinate CRS.
//                 Journey coords are pixel positions on the source image.
```

Everything above the adapter (markers, past/future route lines, camera director,
overlays) is shared between real-world and fictional journeys.

### 7.2 Aesthetics: handcrafted style JSONs + period label overlays

This replaces the POC's grab-bag of third-party raster tiles:

- **`modern`** — clean, muted vector style (start from OpenFreeMap's Positron-like
  style, tune colors/typography).
- **`atlas`** — NatGeo-ish: warm paper tint, terrain shading, serif labels.
- **Per-era period styles** (e.g. `campaign-1812`) — the signature look. Same vector
  tiles, radically restyled: parchment background, aged sepia palette, engraved-style
  hillshading, **modern feature classes filtered out** (motorways, railways, airports,
  modern boundaries hidden), period typography (IM Fell / EB Garamond via glyph
  pipeline), hand-drawn-look route lines.
- **Period place names:** modern tiles say "Kaunas," the historian wants "Kowno." Each
  journey ships `labels.geojson` with period names along the corridor; period styles
  suppress base-map labels near the route and render the overlay instead. This is a
  content-authoring task per journey, and it's what will make historians love it.
- **Georeferenced historical map rasters** (an actual 1812 map as the basemap) are a
  premium delight but a licensing minefield: David Rumsey's collection is **CC BY-NC —
  not usable in a paid product**. Use Library of Congress / national-library scans with
  verified public-domain status, georeference with Allmaps or QGIS, tile to PMTiles,
  host in Supabase Storage. Treat as per-journey enhancement, Phase 8+, with a
  documented license check per map.
- Style switching is instant (MapLibre `setStyle` with route/marker layers re-added via
  a persistent overlay manager) — the "historian flipping between historical and
  modern map" moment.

### 7.3 Camera: follow, free, and director

- **Follow** (default on frames): smooth-follow the selected track; pan/zoom breaks
  follow (desktop) with a "Return to track" affordance — carried from the POC.
- **Free**: full navigation within journey bounds.
- **Director** (frames + "lean back" desktop): automatic cinematography driven by
  engine state — frames both armies when they converge (Borodino), slow-zooms during
  encampments, pulls wide at chapter transitions, subtle Ken Burns drift while resting.
  Data-driven from episodes; no journey-specific camera code.
- Per-participant camera state: in a shared run, each user follows whichever track they
  want and flips freely (Section 10).

---

## 8. Frame mode (the flagship surface)

Route: `/frame/[deviceCode]` — designed for 24/7 unattended operation on TVs/art
monitors in landscape or portrait.

**Pairing flow:** frame device opens the site's `/frame` entry → shows a 6-character
code (device row created with a random token) → user, on phone/desktop, enters the code
under Account → Devices → picks which run the frame displays. The frame long-polls/
subscribes via Realtime and reloads into the assigned run. Frame auth uses the device
token (scoped RLS), never user credentials on the TV.

**Layout system (the "beautiful still in the bottom-right quarter" requirement):**
composable layout presets that the director switches based on engine state:

- `map-dominant` — full-bleed map, slim caption bar (date, day N, activity, weather,
  strength), scene image in the bottom-right quarter with a soft frame/vignette.
- `scene-dominant` — during long encampments/nights: the scene still becomes the
  canvas (full-bleed), map shrinks to an inset; ideal ambient art at 2am.
- `moment` — when a significant moment fires: typographic card over a dimmed map,
  holds for N minutes, then returns.
- `chapter` — day rollover / episode transitions: elegant interstitial ("Day 82 —
  Before Borodino. 133,000 men remain.").
- Portrait variants of each.

**Always-on engineering requirements:**

- Adaptive tick: at 1× the marker moves meters per minute — render updates at ~1/30s
  except during animations; respect `visibilitychange`; no accumulating timers.
- OLED burn-in mitigation: 1–2px slow layout drift, periodic layout rotation, no
  static high-contrast chrome.
- Resilience: auto-reconnect Realtime with jittered backoff; on reload, clock state
  fully recovers from the server (the clock design makes reloads harmless); service
  worker caches app shell + current style + scene images.
- Typography and dark palettes tuned for TV viewing distance; test at 1080p and 4K,
  landscape and portrait, via Playwright viewport snapshots.

---

## 9. Scene imagery (stills, not sprites)

Decision (user-confirmed from POC experience): **no AI-animated gifs/sprites.** Instead,
a curated library of beautiful still images per journey, resolved by the engine and
crossfaded (slow 2–3s dissolve) on state change.

- **Scene manifest** maps engine state to assets:
  `(activityKey, solarPhase, chapter?) → image` — e.g. `march/day`, `march/dusk`,
  `camp/night`, `battle/day`, `retreat-snow/day`, plus episode-specific art
  (`borodino`, `berezina`, `moscow-fires`). ~15–25 images per journey.
- **Art direction doc per journey** (`scenes/art-direction.md`): one consistent style
  ("19th-century oil painting, muted palette, no text, no borders"), consistent aspect
  set (16:9 crop + portrait crop per image). Generation can be AI-assisted offline,
  but every image is human-curated into the content repo — generation is a content
  pipeline step, never a runtime dependency.
- Also usable: public-domain paintings (this era is rich: Vereshchagin's 1812 series
  is public domain and stunning — verify each source's reproduction licensing).
- Storage: Supabase Storage, served with image transforms; preload the next likely
  scene (engine can predict upcoming state).

---

## 10. Accounts, runs, social, monetization

### Data model (Supabase migrations; RLS on everything)

```sql
profiles        (id → auth.users, username, display_name, avatar_url)
journeys        (id, slug, title, tier, latest_version, catalog metadata)
journey_assets  (journey_id, version, content_url, checksum)  -- premium content gating
runs            (id, journey_id, journey_version, owner_id, title, visibility
                 [private|friends|public], clock_anchor_virtual_ms,
                 clock_anchor_real, clock_rate, clock_paused, status
                 [active|completed|abandoned], created_at)
run_clock_events(id, run_id, actor_id, kind [start|pause|resume|set_rate|seek],
                 payload jsonb, server_time)   -- append-only; source of truth history
run_participants(run_id, user_id, role [owner|member], perspective_track_id,
                 camera_prefs jsonb, joined_at)
devices         (id, owner_id, pairing_code, token_hash, assigned_run_id,
                 layout_prefs jsonb, last_seen_at)
follows         (follower_id, followee_id)     -- lightweight social graph
comments        (id, run_id, author_id, body, anchor_kind [moment|virtual_time|episode],
                 anchor_ref, parent_id, created_at, deleted_at)
badges          (id, slug, title, description, criteria jsonb)
badge_awards    (badge_id, user_id, run_id, awarded_at, evidence jsonb)
entitlements    (user_id, kind [subscription|pack], ref, active, current_period_end)
email_prefs     (user_id, run_id, cadence [daily|weekly|major_moments|off])
```

Key RLS shapes: runs visible per `visibility` + participation; comments visible where
the run is; premium `journey_assets` require an active entitlement or `tier='free'`;
devices readable only via matching token.

### Social features

- **Shared runs:** owner invites via link; participants share the *same clock*
  (owner/role-gated controls) but each has their own perspective and camera — one
  friend rides with Napoleon, another with the Russians, and anyone can flip anytime
  (perspective is view state, never exclusive).
- **Following & feed:** see friends' active runs on the map catalog ("Sarah is on Day
  47, approaching Smolensk"), visit their run read-only if visibility allows.
- **Comments:** anchored to moments, episodes, or a virtual timestamp — so a fellow
  historian can attach "Actually, Davout's I Corps was already across by dawn…" to the
  Niemen crossing *on your run*. Threaded, edit/delete, report + owner-moderation
  minimum viable moderation.
- **Badges:** completion badges per journey; **verified real-time badges** proven from
  the clock log (rate=1 throughout, no seeks); perspective badges; streaks later.
- **Email digests:** cron route handler evaluates each opted-in run via the engine,
  collects `momentsSince(lastDigest)`, renders a React Email ("Day 51: Borodino. The
  army lost ~28,000 men yesterday. Tomorrow: the road to Moscow.") via Resend.

### Monetization

Stripe subscription ("Expedition Pass") unlocking the full catalog; Napoleon free.
Webhooks maintain `entitlements`. Premium journey content and scene assets are served
through an entitlement-checked handler (signed URLs), so paid content isn't just
client-side gated. Consider one-time "pack" purchases later — schema already allows it.

---

## 11. Mythical journeys — legal reality check

- **Middle-earth: not without a license.** Tolkien's works remain in copyright
  (UK: life+70 → 2043; US: even later for LotR). The maps, place names in combination,
  and the journey itself are protected expression, and Middle-earth Enterprises
  licenses aggressively. A "Middle Earth walk" feature would need licensing talks —
  park it. Do not ship "inspired-by" knockoffs either (trade dress risk).
- **Excellent public-domain substitutes** (all fully clear, several with real-world
  routes that need no fictional map at all):
  - *Around the World in 80 Days* (Verne, PD) — real-world route, built-in deadline
    drama; arguably a **better** flagship mythical-adjacent journey than Middle-earth.
  - Homer's *Odyssey* — commission an original illustrated Mediterranean fantasy map
    (we own it → ImageAdapter showcase).
  - Dante's *Inferno* — a descent map; wildly shareable.
  - *Journey to the West*, Jason and the Argonauts, the Exodus, Norse myth
    (Hermóðr's ride to Hel), *Treasure Island* (PD, map included in the PD text).
- **Caution:** "The Oregon Trail" as a *game* title is trademarked (HarperCollins/
  Gameloft). Naming a journey "Oregon Trail Wagon Train (1843)" descriptively about
  the historical trail is fine; avoid game-like trade dress or marketing that
  suggests the game.
- Original commissioned maps + PD source texts = clean IP we can even merchandise.

---

## 12. Content quality bar (Napoleon 1812 as the standard)

The POC's 8 waypoints and 9 moments cannot carry a six-month ambient experience. The
free flagship must be *dense*, because it's the sales pitch. Target for the rebuild:

- Route: 200+ vertices per track following actual period roads (Kaunas–Vilnius–
  Smolensk–Borodino–Moscow and the retreat variant via Maloyaroslavets decision point).
- Schedule: daily-resolution keyframes (~170 days), halts modeled (Vilna, Vitebsk,
  Moscow's 35 days), corps-level split optional later (Minard shows flanking corps).
- Strength: keyframes from Minard (422k → 100k at Moscow → 10k recrossing) reconciled
  with modern scholarship; Russian army strength too.
- Temperature: Minard's retreat temperature record is in the source chart — surface it.
- Moments: 60–100 (roughly one per 1–3 days, denser around battles), each 1–3
  sentences, tagged and significance-rated so the frame can prioritize.
- Episodes: Niemen crossing, Smolensk, Borodino (with intra-day beats), Moscow
  occupation + fires, Maloyaroslavets, Krasny, Berezina (multi-day), Vilna collapse.
- Sources listed in-app. This research task is well-suited to a dedicated content
  session with web research, separate from engineering sessions.

Second journey (Phase 7, premium proof): **Shackleton 1914–16** — different kind
(ship/ice drift/boat journey), different stats (crew, drift), polar day/night stress-
tests the solar model, and its map aesthetic (whites/blues) proves the style system.

---

## 13. Phased implementation plan

Each phase = roughly one Opus session, ends with working, deployed, tested software.
Do not start phase N+1 with phase N's acceptance criteria unmet.

**Phase 0 — Scaffold & pipeline.** pnpm monorepo, Next.js + TS strict + Tailwind,
Supabase project + local dev, CI (typecheck, lint, test, content validation), deploy to
hosting with a hello-world page, env var validation.
*Accept:* clean deploy from main; CI green; Supabase migrations apply from scratch.

**Phase 1 — Engine + content schema + Napoleon v1 data.** `packages/engine` complete
(clock, evaluate, solar, schema), Napoleon content upgraded to at least interim density
(≥40 schedule keyframes, ≥30 moments, real Minard strength curve), other three POC
journeys ported mechanically. Golden tests.
*Accept:* `pnpm test` proves positions/activities/stats at known timestamps; content
validation runs in CI; no DOM imports in engine (lint-enforced).

**Phase 2 — Viewer (anonymous, local clock).** MapLibre + GeoAdapter, `modern` +
`atlas` styles, route/marker/past-line overlay manager, follow/free camera, overlay
components (moment card, stats, legend, date/weather bar), speed + seek controls with
local-only clock. POC parity, but beautiful.
*Accept:* Napoleon runs end-to-end in browser at any rate; style switch preserves
overlays; Playwright smoke test.

**Phase 3 — Accounts, runs, server clock, remote.** Supabase Auth, runs CRUD +
library UI, clock event log + atomic clock-update function, Realtime sync, time-sync
endpoint, `/remote/[runId]`.
*Accept:* pause on phone → viewer reacts <2s; reload after hours → correct virtual
time; clock log renders as run history.

**Phase 4 — Frame mode + pairing.** Device pairing flow, `/frame/[deviceCode]`,
layout presets + director v1, burn-in mitigations, reconnect hardening, portrait.
*Accept:* frame survives a 24h unattended soak (scripted clock jumps, network drops);
pairing works on a real TV browser; Playwright snapshots for 1080p/4K/portrait.

**Phase 5 — Scenes + period style.** Scene manifest + resolver + crossfade panel +
`scene-dominant` layout; `campaign-1812` period style + period label overlay; first
curated Napoleon scene set (~15 images).
*Accept:* scene changes track engine state through a full simulated day/night; period
style hides modern features and shows period names along the corridor.

**Phase 6 — Social + email.** Participants + invites + perspectives, comments with
anchors, follows + friend activity on catalog, badges incl. clock-log-verified real-
time badge, digest cron + Resend templates, `email_prefs`.
*Accept:* two accounts share a run with different perspectives; comment on a moment
appears for both; digest email renders correct engine state for a mid-run journey.

**Phase 7 — Catalog + payments + Shackleton.** Marketing/catalog pages, Stripe
subscription + webhooks + entitlements, premium content gating (signed asset access),
Shackleton at full content quality as the first premium journey.
*Accept:* free user runs Napoleon but hits paywall on Shackleton; test-mode checkout
unlocks; webhook replay is idempotent; premium content URLs unusable without
entitlement.

**Phase 8+ — Expansion.** ImageAdapter + fictional-map pipeline (Odyssey with
commissioned map), georeferenced historical rasters (license-checked), director v2,
more journeys, author toolkit (validation CLI → maybe an internal studio route),
public run pages + OG images (engine-rendered), corps-level Napoleon detail.

---

## 14. Working agreements for implementing sessions

1. **Engine purity is non-negotiable.** If a renderer needs journey-specific behavior,
   the fix is a content-schema extension, never an `if (journeyId === ...)`.
2. **Server time is the only wall clock.** Never anchor persistent state to client
   `Date.now()`/`performance.now()`; client time is only for intra-frame animation.
3. **Content changes bump `version`;** never mutate a version in place once any run
   references it.
4. **RLS-first:** write the policy with the migration, and test it (a small pgTAP or
   scripted policy test per table).
5. **Every phase ends deployed.** The frame use case means regressions are visible on
   someone's wall — keep main shippable.
6. **Licensing discipline:** every map raster, every scene image, every quoted text
   gets a line in `content/**/ATTRIBUTION.md` with source + license before merge.
7. When in doubt about scope, cut features, not quality — a gorgeous Napoleon on a
   frame beats five mediocre journeys.

## 15. Open questions (defaults chosen; user can override)

| Question | Default assumed by this plan |
|---|---|
| Hosting | Same Node hosting pipeline as the team's other projects (Vercel-style); needs cron + long-lived Realtime (client-side) only — no websocket server of our own. |
| Product name | Working title "Living Historical Journeys"; do a trademark/domain pass before Phase 7 marketing pages. |
| Subscription vs packs | Subscription first (simpler entitlements); schema supports packs later. |
| Scene image generation tool | Any offline generator + human curation; images are repo/Storage assets — runtime never generates. |
| Analytics | Add a lightweight, privacy-respecting option (e.g. self-hosted Plausible/Umami) in Phase 7; not before. |
