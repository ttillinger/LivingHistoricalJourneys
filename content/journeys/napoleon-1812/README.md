# napoleon-1812 (free flagship)

Content for Napoleon's 1812 Russian campaign — the free flagship journey and the
quality bar for everything else (HANDOFF.md §12).

**Source of truth:** [`authoring.json`](./authoring.json). `journey.json` and
`routes/*.geojson` are generated from it by `pnpm content:build` — do not edit them
by hand.

## Present (Phase 1 — interim density)

- Two tracks (Grande Armée + Russian Army) with **41 schedule keyframes** on the
  primary, advance → Moscow → winter retreat, with Moscow modelled as a halt.
- **Army strength** and **retreat temperature** stat series after Minard (1869).
- **34 moments**, tagged and significance-rated.
- **8 episodes** (Niemen, Smolensk, Borodino w/ beats, Moscow occupation,
  Maloyaroslavets, Krasny, Berezina w/ beats, Vilna) and 6 weather/activity
  conditions.

Figures are interim approximations after Minard + standard campaign chronology.

## Still to author (later content pass)

- Denser, road-accurate route geometry (200+ vertices per track, HANDOFF.md §12).
- `labels.geojson` — period place names (Kowno, not Kaunas).
- `scenes/` — ~15–25 curated stills + `art-direction.md` (Phase 5).
- `ATTRIBUTION.md` — per-asset sources and licenses.
- Reconcile strength/temperature keyframes against primary scholarship.

`poc-seed.json` is the original proof-of-concept data, kept for provenance.
