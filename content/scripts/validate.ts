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
    // Beyond shape: every citation resolves, and every moment falls inside the journey.
    const journey = result.data;
    const known = new Set(journey.bibliography.map((b) => b.id));
    const start = Date.parse(journey.time.start);
    const end = Date.parse(journey.time.end);
    const problems: string[] = [];
    for (const m of journey.moments) {
      for (const ref of m.refs ?? []) {
        if (!known.has(ref)) problems.push(`moment "${m.title}" cites unknown source "${ref}"`);
      }
      const t = Date.parse(m.t);
      if (t < start || t > end) problems.push(`moment "${m.title}" is outside the journey's dates`);
    }
    if (problems.length === 0) {
      console.log(`✓ ${manifest}`);
    } else {
      failures++;
      console.error(`✗ ${manifest}`);
      for (const problem of problems) console.error(`  - ${problem}`);
    }
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
