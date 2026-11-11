# Content

Journey content lives here as authored files, validated in CI against the engine's
Zod schema (`packages/engine/src/schema.ts`). See `HANDOFF.md` §5 and §12.

```
content/
├── journeys/
│   └── <slug>/
│       ├── authoring.json      # hand-authored source (vertices + dates + stats)  ─┐ build
│       ├── poc-seed.json       # legacy POC source, for mechanical ports          ─┤ inputs
│       ├── journey.json        # GENERATED manifest + timeline (schema-validated)  ─┐ build
│       ├── routes/*.geojson    # GENERATED route geometry per track                ─┘ outputs
│       ├── roads.json          # traced road geometry per leg (`pnpm trace <slug>`) ─┤
│       ├── labels.json         # period place names drawn over the map            ─┘
│       ├── research/           # sourced research notes behind the content
│       ├── bundle.json         # GENERATED app bundle (manifest + routes + labels)
│       └── scenes/             # scene manifest + curated stills (Phase 5)
├── map-styles/                 # MapLibre style JSONs (modern, atlas, period)
└── scripts/
    ├── build.ts                # `pnpm content:build` — authoring/POC -> journey.json
    └── validate.ts             # `pnpm validate:content`
```

## Build

`journey.json` and `routes/*.geojson` are **generated** — never edit them by hand.
Edit the `authoring.json` (or `poc-seed.json`) source and regenerate:

```bash
pnpm content:build     # computes route km from geometry, writes + validates manifests
```

The build derives each schedule keyframe's `km` from the route geometry, so the
schedule and the drawn line can never drift apart, and it fails on any schema
violation — committed manifests are always valid.

## Validate locally

```bash
pnpm validate:content
```

Runs the same check CI runs. It passes when no manifests exist yet, and fails the
build on any schema violation.

## Authoring rules (from HANDOFF.md §14)

- Content changes **bump `version`**; never mutate a version once a run references it.
- Every map raster, scene image, and quoted text gets a source and licence line
  **before merge** — in the journey's `attribution` (shown in the app's Sources panel).
- Every moment cites the works it rests on: `refs` are ids into the journey's
  `bibliography`, and `pnpm validate:content` fails on an id that does not resolve.
- Timestamps are UTC written from **local mean time** (UTC + 4 minutes per degree of
  longitude east); see `journeys/napoleon-1812/README.md`.
- A track with a `dailyRhythm` marches only between those local hours.
- Routes are dense LineStrings (200+ vertices for the flagship); the schedule
  (time → km) is authored separately from the geometry.
