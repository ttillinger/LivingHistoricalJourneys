import { virtualNow, type ClockState } from "@living-journeys/engine";

// Proves the pure engine package is wired into the app. At the anchor instant
// (serverNow === anchorRealMs) the virtual time equals the campaign's start.
const napoleonStart = Date.UTC(1812, 5, 24, 3, 0, 0);
const demoClock: ClockState = {
  anchorVirtualMs: napoleonStart,
  anchorRealMs: 0,
  rate: 1,
  paused: false,
};
const engineVirtualStart = new Date(virtualNow(demoClock, 0)).toISOString();

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Phase 0 · Scaffold &amp; pipeline
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Living Historical Journeys
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 text-pretty">
          An ambient web app for following historical journeys in real — or
          scaled — time. This is the deploy target; the experience comes next.
        </p>
      </header>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-2 font-medium">Monorepo online</h2>
        <ul className="space-y-1 text-neutral-600 dark:text-neutral-400">
          <li>
            <code className="font-mono">packages/engine</code> — pure clock +
            content schema, unit-tested.
          </li>
          <li>
            <code className="font-mono">apps/web</code> — Next.js (App Router,
            TypeScript strict, Tailwind v4).
          </li>
          <li>
            <code className="font-mono">content/</code> — journey pipeline with
            CI validation.
          </li>
          <li>
            <code className="font-mono">supabase/</code> — migrations, RLS from
            the first table.
          </li>
        </ul>
        <p className="mt-3 font-mono text-xs text-neutral-500">
          engine.virtualNow(napoleon-1812 start) = {engineVirtualStart}
        </p>
      </section>

      <footer className="text-xs text-neutral-400">
        Napoleon&apos;s 1812 campaign is the free flagship. The rest of the
        catalog follows.
      </footer>
    </main>
  );
}
