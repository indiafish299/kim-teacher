"use client";

import { MOODS, MOOD_IDS, DEFAULT_MOOD, type MoodId } from "@/lib/mood";

/**
 * All five faces are stacked and cross-faded so the expression changes
 * without a flash of missing image.
 */
export default function Avatar({
  mood,
  size = 36,
  className = "",
}: {
  mood?: MoodId;
  size?: number;
  className?: string;
}) {
  const current = mood ?? DEFAULT_MOOD;
  return (
    <span
      className={`relative inline-block shrink-0 overflow-hidden rounded-full bg-surface2 ring-1 ring-line ${className}`}
      style={{ width: size, height: size }}
    >
      {MOOD_IDS.map((id) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={id}
          src={MOODS[id].src}
          alt={id === current ? `김선생 (${MOODS[id].label})` : ""}
          aria-hidden={id !== current}
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            id === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </span>
  );
}
