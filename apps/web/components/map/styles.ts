export type StyleId = "modern" | "atlas";

/**
 * Base map styles (HANDOFF.md §3, §7.2). OpenFreeMap serves free, key-less vector
 * styles — the deferred "start here" choice. The map layer abstracts the source, so
 * these become handcrafted period styles in Phase 5 without touching the viewer.
 */
export const MAP_STYLES: Record<StyleId, { label: string; url: string }> = {
  modern: { label: "Modern", url: "https://tiles.openfreemap.org/styles/positron" },
  atlas: { label: "Atlas", url: "https://tiles.openfreemap.org/styles/liberty" },
};

export const STYLE_IDS = Object.keys(MAP_STYLES) as StyleId[];
