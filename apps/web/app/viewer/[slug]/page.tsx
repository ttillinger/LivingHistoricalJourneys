import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJourneyBundle, journeyList } from "@living-journeys/content";
import { Viewer } from "@/components/viewer/Viewer";

export function generateStaticParams() {
  return journeyList.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bundle = getJourneyBundle(slug);
  return {
    title: bundle
      ? `${bundle.manifest.title} — Living Historical Journeys`
      : "Journey not found",
  };
}

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const bundle = getJourneyBundle(slug);
  if (!bundle) notFound();
  return <Viewer bundle={bundle} />;
}
