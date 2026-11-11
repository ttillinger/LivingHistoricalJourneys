# napoleon-1812 (free flagship)

Content for Napoleon's 1812 Russian campaign — the free flagship journey and the
quality bar for everything else (HANDOFF.md §12).

**Source of truth:** [`authoring.json`](./authoring.json). `journey.json`,
`bundle.json` and `routes/*.geojson` are generated from it by `pnpm content:build` —
do not edit them by hand.

## What is here (version 3, researched November 2026)

- **Grande Armée** track: Napoleon's own headquarters, stop by stop (about 80 dated
  halts), and after he left on 5 December the main column under Murat.
- **Russian Army** track: the main army's headquarters (Barclay, then Kutuzov).
- Both tracks declare a `dailyRhythm`, so the marker marches by day and halts at night.
- **Army strength** for both, **temperature** for the retreat, each keyframe tied to
  a named source (see the comments in `research/`).
- **122 moments**, each citing the works it rests on (`refs` → `bibliography`), 18
  with a line from an eyewitness.
- **11 episodes** with timed beats, and 17 activity/weather conditions.
- `notes` — the plain-language caveats shown in the app's Sources panel.

## Editing rules

- **All timestamps are UTC, written from local mean time.** A battle that began at
  06:00 on the spot is `06:00 − longitude × 4 min`: at Moscow (37.6°E) that is 03:30Z,
  at Vilna (25.3°E) 04:19Z. The viewer converts back, so getting this wrong shows a
  dawn attack in mid-morning.
- All dates are New Style. Russian sources give Old Style, 12 days earlier in 1812.
- A halt is two vertices at the same coordinates: arrival and departure.
- Do not move a vertex without re-running `pnpm --filter @living-journeys/content
  trace napoleon-1812`; the road cache is keyed on the coordinates.
- A new fact needs a source. Add the work to `bibliography` and cite it in `refs`.

## research/

The four research files behind this version, one per slice. Each row carries its
source URLs and a confidence, and each file ends with `corrections` (what the earlier
from-memory content had wrong) and `openQuestions` (where sources disagree, with both
versions). Read the relevant `openQuestions` before changing a date or a number.

Known soft spots:

- Minor night stops known from a single source (Kokhanovo 21 Nov, Oshmiany and
  Miedniki 6–7 Dec, the post-house of 8 Nov, which is not on the map).
- Small villages placed by a gazetteer lookup rather than a cited coordinate
  (Gorodnya, Velichevo, Gridnevo, Petelino, Staiki, Rasasna); the Russian
  headquarters at Shilovo is drawn at Krasny, 5 km away.
- The Russian track rests mainly on one chronicle (sargmbs.ru). Clausewitz, Lieven
  and Mikaberidze were not read directly.
- Strength figures mix sources that count different things; the Sources panel says so.
- Temperatures before 18 October are seasonal estimates.

## Still to author

- `scenes/` — curated stills and `art-direction.md` (ROADMAP R4).

`poc-seed.json` is the original proof-of-concept data, kept for provenance.
