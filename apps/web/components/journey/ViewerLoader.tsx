"use client";

import dynamic from "next/dynamic";
import type { JourneyBundle } from "@living-journeys/content";

// The viewer reads the clock and the link on first render, so it is client-only.
const JourneyViewer = dynamic(() => import("./JourneyViewer"), {
  ssr: false,
  loading: () => <div className="h-dvh w-full bg-paper" />,
});

export function ViewerLoader({ bundle }: { bundle: JourneyBundle }) {
  return <JourneyViewer bundle={bundle} />;
}
