import type { MarkStatus } from "@/db/schema";

/** Mirrors the spreadsheet's summary columns: (+), (-), % and lessons. */
export type Summary = { present: number; absent: number; lessons: number; rate: number | null };

export function summarize(statuses: Iterable<MarkStatus>): Summary {
  let present = 0;
  let absent = 0;
  let lessons = 0;
  for (const status of statuses) {
    if (status === "absent") absent++;
    else if (status === "present") present++;
    else if (status === "lesson") {
      present++;
      lessons++;
    }
    // "other" (competitions, excused...) counts neither for nor against.
  }
  const recorded = present + absent;
  return { present, absent, lessons, rate: recorded === 0 ? null : present / recorded };
}

export function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}
