"use client";

import { useRouter } from "next/navigation";

/**
 * Starts a live run: the link itself records when the march began, so opening it
 * again — on any device, months from now — shows where the army has got to.
 */
export function BeginLiveLink({ slug }: { slug: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() =>
        router.push(`/viewer/${slug}?began=${encodeURIComponent(new Date().toISOString())}`)
      }
      className="text-left font-display text-[19px] italic text-ink underline decoration-ink/40 underline-offset-4 hover:text-carmine hover:decoration-carmine"
    >
      Begin the march today, in real time →
    </button>
  );
}
