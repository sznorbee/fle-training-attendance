import type { MarkStatus } from "@/db/schema";

export type RecordableStatus = Exclude<MarkStatus, "cleared">;

/** How each mark is presented; `symbol` is what the spreadsheet cell contains. */
export const MARK_STYLE: Record<RecordableStatus, { label: string; symbol: string; className: string }> = {
  absent: { label: "Absent", symbol: "0", className: "bg-red-100 text-red-800 border-red-200" },
  present: { label: "Present", symbol: "1", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  lesson: { label: "Lesson", symbol: "2", className: "bg-sky-100 text-sky-800 border-sky-200" },
  other: { label: "Other", symbol: "✱", className: "bg-amber-100 text-amber-800 border-amber-200" },
};

export const RECORDABLE_STATUSES = Object.keys(MARK_STYLE) as RecordableStatus[];
