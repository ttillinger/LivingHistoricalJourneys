import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JourneySchema } from "@living-journeys/engine";

/**
 * Validates every `content/journeys/<slug>/journey.json` against the engine's Zod
 * schema. Runs in CI (HANDOFF.md §0). Passes cleanly when no journeys exist yet.
 */

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const journeysDir = resolve(scriptDir, "..", "journeys");

function findManifests(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const manifests: string[] = [];
  for (const entry of readdirSync(dir)) {
    const entryPath = join(dir, entry);
    if (!statSync(entryPath).isDirectory()) continue;
    const manifest = join(entryPath, "journey.json");
    if (existsSync(manifest)) manifests.push(manifest);
  }
  return manifests;
}

const manifests = findManifests(journeysDir);

if (manifests.length === 0) {
  console.log("content: no journey manifests found yet — nothing to validate.");
  process.exit(0);
}

let failures = 0;
for (const manifest of manifests) {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifest, "utf8"));
  } catch (err) {
    failures++;
    console.error(`✗ ${manifest}: invalid JSON\n  ${String(err)}`);
    continue;
  }

  const result = JourneySchema.safeParse(raw);
  if (result.success) {
    console.log(`✓ ${manifest}`);
  } else {
    failures++;
    console.error(`✗ ${manifest}`);
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
  }
}

if (failures > 0) {
  console.error(`\ncontent: ${failures} journey(s) failed validation.`);
  process.exit(1);
}
console.log(`\ncontent: ${manifests.length} journey(s) valid.`);
