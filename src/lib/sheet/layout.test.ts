import { describe, expect, it } from "vitest";
import { a1, columnLetter, nameKey, parseLayout, parseRoster, type Grid } from "./layout";
import { cellToMark, markToCell } from "./marks";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

/** Builds header rows shaped like the federation sheet for the given months. */
function buildHeader(months: Array<{ name: string; days: number }>): Grid {
  const dayRow: unknown[] = [null, null, null, null, null, "TOTAL"];
  const titleRow: unknown[] = [null, "Family name", "name", "coach", "club", "(+)", "(-)", "%", "LESSONS"];
  let col = 10;
  for (const { name, days } of months) {
    for (let d = 1; d <= days; d++, col++) {
      dayRow[col] = d;
      titleRow[col] = WEEKDAYS[d % 7];
    }
    dayRow[col] = name;
    ["(+)", "(-)", "%", "lessons"].forEach((title, i) => (titleRow[col + i] = title));
    col += 5;
  }
  return [dayRow, titleRow];
}

describe("parseLayout", () => {
  const header = buildHeader([
    { name: "SEPTEMBER", days: 30 },
    { name: "OCTOBER", days: 31 },
    { name: "JAN", days: 31 },
  ]);

  it("maps every day to its column, skipping the summary blocks", () => {
    const { columnByDate, warnings } = parseLayout(header, 2026);
    expect(warnings).toEqual([]);
    expect(columnByDate.get("2026-09-01")).toBe(10); // K
    expect(columnByDate.get("2026-09-30")).toBe(39); // AN
    expect(columnByDate.get("2026-10-01")).toBe(45); // AT
    expect(columnByDate.get("2027-01-01")).toBe(45 + 31 + 5);
    expect(columnByDate.size).toBe(92);
  });

  it("ignores a mistyped day header because position decides the day", () => {
    const grid = structuredClone(header);
    grid[0][39] = new Date("2025-03-31");
    expect(parseLayout(grid, 2026).columnByDate.get("2026-09-30")).toBe(39);
  });

  it("warns when a month has an unexpected number of columns", () => {
    const { warnings } = parseLayout(buildHeader([{ name: "FEBRUARY", days: 30 }]), 2026);
    expect(warnings).toHaveLength(1);
  });
});

describe("parseRoster", () => {
  it("stops at the first unnamed row and normalises values", () => {
    const grid: Grid = [[], [], [1, "Doe", "Jane ", " Coach A", "cel "], [2, "Roe", "Sam"], [], [3, "Guest"]];
    expect(parseRoster(grid)).toEqual([
      { rowIndex: 2, familyName: "Doe", givenName: "Jane", coachLabel: "Coach A", clubCode: "CEL" },
      { rowIndex: 3, familyName: "Roe", givenName: "Sam", coachLabel: null, clubCode: null },
    ]);
  });
});

describe("helpers", () => {
  it("builds A1 references", () => {
    expect(columnLetter(0)).toBe("A");
    expect(columnLetter(25)).toBe("Z");
    expect(columnLetter(26)).toBe("AA");
    expect(a1(2, 10)).toBe("K3");
    expect(a1(5, 398)).toBe("OI6");
  });

  it("matches names regardless of accents, case and hyphens", () => {
    expect(nameKey("Masquelier-Vázquez", "Haiko ")).toBe(nameKey("masquelier vazquez", "HAIKO"));
  });

  it("round-trips sheet values through marks", () => {
    expect(cellToMark(0)).toEqual({ status: "absent", note: null });
    expect(cellToMark(2)).toEqual({ status: "lesson", note: null });
    expect(cellToMark(" Berne ")).toEqual({ status: "other", note: "Berne" });
    expect(cellToMark(4)).toEqual({ status: "other", note: "4" });
    expect(cellToMark("  ")).toBeNull();
    expect(markToCell("present", null)).toBe(1);
    expect(markToCell("other", null)).toBe("*");
    expect(markToCell("cleared", null)).toBe("");
  });
});
