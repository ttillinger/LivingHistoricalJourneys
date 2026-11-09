import Link from "next/link";
import { getJourneyBundle, journeyList } from "@living-journeys/content";
import type { Coord } from "@living-journeys/engine";
import { BeginLiveLink } from "@/components/journey/BeginLiveLink";

const FLAGSHIP = "napoleon-1812";

/** The route as a plain SVG path — a sketch of the march for the title page. */
function routePath(coords: Coord[], box: [number, number, number, number], width: number) {
  const [w, s, e, n] = box;
  const kx = Math.cos((((s + n) / 2) * Math.PI) / 180);
  const scale = width / ((e - w) * kx);
  const height = (n - s) * scale;
  const d = coords
    .filter((_, i) => i % 3 === 0 || i === coords.length - 1)
    .map(([lon, lat], i) => {
      const x = (lon - w) * kx * scale;
      const y = (n - lat) * scale;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
  return { d, height };
}

export default function HomePage() {
  const flagship = getJourneyBundle(FLAGSHIP)!;
  const box: [number, number, number, number] = [23.2, 53.6, 38.4, 56.0];
  const sketches = flagship.manifest.tracks.map((t) => ({
    id: t.id,
    color: t.color ?? "#9c3524",
    primary: t.isPrimary,
    ...routePath(flagship.routeCoords[t.id] ?? [], box, 1000),
  }));
  const height = sketches[0]?.height ?? 300;
  const others = journeyList.filter((j) => j.slug !== FLAGSHIP);

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="paper-grain" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-6 py-14 sm:py-20">
        <header className="text-center">
          <p className="caps text-[15px] text-ink-soft">Living Historical Journeys</p>
          <h1 className="mt-6 font-display text-5xl leading-[1.05] sm:text-7xl">
            Follow history
            <br />
            <span className="italic">at the pace it happened</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[20px] leading-relaxed text-ink-soft">
            A journey from the past, moving across a period map in real time. Start it today
            and it will take as long as it took them — or watch the whole of it in minutes.
          </p>
        </header>

        <section className="mt-14">
          <div className="card px-6 py-7 sm:px-10 sm:py-9">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <h2 className="font-display text-3xl sm:text-4xl">{flagship.manifest.title}</h2>
              <p className="caps text-[14px] text-ink-soft">24 June – 14 December 1812 · 174 days</p>
            </div>

            <svg
              viewBox={`-10 -10 1020 ${height + 20}`}
              className="mt-6 w-full"
              role="img"
              aria-label="The route of the campaign, from the Niemen to Moscow and back"
            >
              {sketches
                .sort((a, b) => Number(a.primary) - Number(b.primary))
                .map((s) => (
                  <path
                    key={s.id}
                    d={s.d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.primary ? 3 : 1.6}
                    strokeOpacity={s.primary ? 1 : 0.7}
                    strokeDasharray={s.primary ? undefined : "2 5"}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
            </svg>
            <div className="caps mt-1 flex justify-between text-[13px] text-ink-soft">
              <span>The Niemen</span>
              <span>Smolensk</span>
              <span>Moscow</span>
            </div>

            <p className="mt-6 max-w-3xl text-[19px] leading-relaxed">
              Some 422,000 men cross the Niemen in June. Fewer than 10,000 recross it in
              December. Ride with the Grande Armée to Moscow and back, or with the Russian
              army that shadows it — the strength of each counted day by day, after
              Minard&apos;s chart of 1869.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              <Link
                href={`/viewer/${FLAGSHIP}`}
                className="border border-ink bg-ink px-6 py-2.5 font-display text-[20px] text-paper transition-colors hover:bg-carmine hover:border-carmine"
              >
                Watch the campaign
              </Link>
              <BeginLiveLink slug={FLAGSHIP} />
            </div>
          </div>
        </section>

        <footer className="mt-auto pt-14 text-center text-[16px] italic text-ink-soft">
          In preparation: {others.map((j) => j.title).join(" · ")}
        </footer>
      </div>
    </main>
  );
}
