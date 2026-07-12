# Map styles

Handcrafted MapLibre GL style JSONs (HANDOFF.md §7.2). Authored in later phases:

- `modern.json` — clean, muted vector style.
- `atlas.json` — warm paper tint, terrain shading, serif labels.
- `campaign-1812.json` — the signature period style: parchment background, sepia
  palette, modern feature classes filtered out, period typography.

Style switching is instant (`setStyle` + a persistent overlay manager re-adds the
route/marker layers), so a historian can flip between historical and modern maps.
