import type { MarkStatus } from "@/db/schema";

/**
 * Translation between the spreadsheet's cell conventions and attendance marks:
 *   0 = absent, 1 = present, 2 = present with an individual lesson,
 *   any other content (competition venue, "*", ...) = "other" with a note.
 */
export type Mark = { status: Exclude<MarkStatus, "cleared">; note: string | null };

export type CellValue = string | number | null;

export function cellToMark(value: unknown): Mark | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (value === 0) return { status: "absent", note: null };
    if (value === 1) return { status: "present", note: null };
    if (value === 2) return { status: "lesson", note: null };
    return { status: "other", note: String(value) };
  }
  const text = String(value).trim();
  if (text === "") return null;
  if (/^[012]$/.test(text)) return cellToMark(Number(text));
  return { status: "other", note: text };
}

export function markToCell(status: MarkStatus, note: string | null): CellValue {
  switch (status) {
    case "absent":
      return 0;
    case "present":
      return 1;
    case "lesson":
      return 2;
    case "other":
      return note?.trim() || "*";
    case "cleared":
      return "";
  }
}
