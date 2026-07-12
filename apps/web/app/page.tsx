import Link from "next/link";
import { journeyList } from "@living-journeys/content";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Phase 2 · The viewer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance">
          Living Historical Journeys
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400 text-pretty">
          Follow a historical journey across a map in real — or scaled — time.
          Pick one and press play; scrub the timeline, change the pace, follow
          either side.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        {journeyList.map((journey) => (
          <Link
            key={journey.slug}
            href={`/viewer/${journey.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-5 transition-colors hover:border-neutral-300 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-medium">{journey.title}</h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  journey.tier === "free"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-neutral-500/15 text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {journey.tier}
              </span>
            </div>
            {journey.description ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
                {journey.description}
              </p>
            ) : null}
            <span className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Launch{" "}
              <span className="inline-block transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </section>

      <footer className="text-xs text-neutral-400">
        Napoleon 1812 is the free flagship. Timing, positions, and stats are computed
        by a shared engine from curated journey content.
      </footer>
    </main>
  );
}
