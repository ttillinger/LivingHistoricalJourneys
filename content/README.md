# Content

Journey content lives here as authored files, validated in CI against the engine's
Zod schema (`packages/engine/src/schema.ts`). See `HANDOFF.md` §5 and §12.

```
content/
├── journeys/
│   └── <slug>/
│       ├── journey.json        # manifest + timeline (schema-validated)
│       ├── routes/*.geojson    # dense route geometry per track
│       ├── labels.geojson      # period place-name overlay
│       └── scenes/             # scene manifest + curated stills
├── map-styles/                 # MapLibre style JSONs (modern, atlas, period)
└── scripts/
    └── validate.ts             # `pnpm validate:content`
```

## Validate locally

```bash
pnpm validate:content
```

Runs the same check CI runs. It passes when no manifests exist yet, and fails the
build on any schema violation.

## Authoring rules (from HANDOFF.md §14)

- Content changes **bump `version`**; never mutate a version once a run references it.
- Every map raster, scene image, and quoted text gets a line in an `ATTRIBUTION.md`
  with source + license **before merge**.
- Routes are dense LineStrings (200+ vertices for the flagship); the schedule
  (time → km) is authored separately from the geometry.
