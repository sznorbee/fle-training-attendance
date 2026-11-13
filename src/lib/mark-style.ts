import type { MarkStatus } from "@/db/schema";

export type RecordableStatus = Exclude<MarkStatus, "cleared">;

/**
 * How each mark is presented; `symbol` is what the spreadsheet cell contains.
 * Present/lesson are blue/navy and absent is orange, so they stay apart for
 * colour-blind readers and differ in lightness as well as hue.
 */
export const MARK_STYLE: Record<RecordableStatus, { label: string; symbol: string; className: string }> = {
  absent: { label: "Absent", symbol: "0", className: "bg-orange-50 text-orange-900 border-orange-400" },
  present: { label: "Present", symbol: "1", className: "bg-blue-100 text-blue-900 border-blue-200" },
  lesson: { label: "Lesson", symbol: "2", className: "bg-foreground text-white border-foreground" },
  other: { label: "Other", symbol: "✱", className: "bg-slate-100 text-slate-700 border-slate-300" },
};

/** Quick reasons offered for an "other" mark; anything else can be typed. */
export const OTHER_REASONS = ["Competition", "Injured", "Sick", "Excused"] as const;
