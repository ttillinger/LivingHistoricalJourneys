import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { coordsFromGeoJson, loadJourney, parseJourney } from "../src/index";
import type { Coord, LoadedJourney } from "../src/index";

const here = dirname(fileURLToPath(import.meta.url));
const contentDir = resolve(here, "..", "..", "..", "content", "journeys");

/** Load a built journey (journey.json + route GeoJSON) straight from the content repo. */
export function loadContentJourney(slug: string): LoadedJourney {
  const dir = join(contentDir, slug);
  const manifest = parseJourney(JSON.parse(readFileSync(join(dir, "journey.json"), "utf8")));
  const routeCoords: Record<string, Coord[]> = {};
  for (const track of manifest.tracks) {
    const geojson = JSON.parse(readFileSync(join(dir, track.route), "utf8"));
    routeCoords[track.id] = coordsFromGeoJson(geojson);
  }
  return loadJourney(manifest, routeCoords);
}

/** ISO string -> epoch ms, for readable test timestamps. */
export const at = (iso: string): number => Date.parse(iso);
