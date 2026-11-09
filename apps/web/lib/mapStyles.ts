import type { StyleSpecification } from "maplibre-gl";

/**
 * Map styles (HANDOFF.md §7.2). The period style restyles OpenFreeMap's vector tiles
 * (OpenMapTiles schema) as an engraved campaign map: paper, water, woods and rivers
 * only. Modern roads, railways, borders and place names are simply not drawn — the
 * journey's own period labels are laid over it as DOM (see JourneyMap).
 */

export type StyleId = "period" | "modern";

const TILES = "https://tiles.openfreemap.org/planet";

export const PAPER = "#efe4c9";

const periodStyle: StyleSpecification = {
  version: 8,
  name: "campaign-1812",
  sources: {
    omt: {
      type: "vector",
      url: TILES,
    },
  },
  layers: [
    { id: "paper", type: "background", paint: { "background-color": PAPER } },
    {
      id: "wood",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wood"],
      paint: {
        "fill-color": "#b9b98a",
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.22, 9, 0.38],
      },
    },
    {
      id: "wetland",
      type: "fill",
      source: "omt",
      "source-layer": "landcover",
      filter: ["==", ["get", "class"], "wetland"],
      paint: { "fill-color": "#a9bcae", "fill-opacity": 0.3 },
    },
    {
      id: "water",
      type: "fill",
      source: "omt",
      "source-layer": "water",
      paint: { "fill-color": "#aebfb6" },
    },
    {
      id: "water-shore",
      type: "line",
      source: "omt",
      "source-layer": "water",
      paint: { "line-color": "#6f877f", "line-width": 0.7, "line-opacity": 0.8 },
    },
    {
      id: "rivers",
      type: "line",
      source: "omt",
      "source-layer": "waterway",
      filter: ["==", ["get", "class"], "river"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#7d968d",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 7, 1.3, 10, 2.6],
      },
    },
    {
      id: "streams",
      type: "line",
      source: "omt",
      "source-layer": "waterway",
      minzoom: 8,
      filter: ["!=", ["get", "class"], "river"],
      paint: { "line-color": "#93a9a0", "line-width": 0.6, "line-opacity": 0.7 },
    },
    {
      // The post roads of the day survive as today's main roads; a faint hairline
      // gives the country some grain without reading as a modern network.
      id: "post-roads",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      minzoom: 7,
      filter: ["in", ["get", "class"], ["literal", ["trunk", "primary"]]],
      paint: {
        "line-color": "#8a7556",
        "line-width": 0.6,
        "line-opacity": 0.35,
        "line-dasharray": [3, 2],
      },
    },
  ],
};

export const MAP_STYLES: Record<StyleId, { label: string; style: StyleSpecification | string }> = {
  period: { label: "Period map", style: periodStyle },
  modern: { label: "Modern map", style: "https://tiles.openfreemap.org/styles/liberty" },
};
