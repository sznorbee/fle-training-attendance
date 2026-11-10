import { daysInMonth, isoDate, yearOfSeasonMonth, type IsoDate } from "@/lib/dates";

/**
 * Understands the layout of the federation's attendance worksheet.
 *
 * Row 1 holds day numbers followed, after each month's days, by the month name
 * above a five-column summary block; row 2 holds the column titles. Athletes
 * start on row 3. Working on a plain grid keeps this usable for both the
 * uploaded .xlsx file and the Google Sheets API.
 */
export type Grid = unknown[][];

export type SheetLayout = {
  /** Zero-based column index for every calendar day found in the header. */
  columnByDate: Map<IsoDate, number>;
  warnings: string[];
};

export type RosterRow = {
  /** Zero-based row index in the grid. */
  rowIndex: number;
  familyName: string;
  givenName: string;
  coachLabel: string | null;
  clubCode: string | null;
};

const COLUMN = { familyName: 1, givenName: 2, coach: 3, club: 4, firstDay: 10 } as const;
const SUMMARY_BLOCK_WIDTH = 5;
const FIRST_ATHLETE_ROW = 2;

const MONTH_BY_PREFIX: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function monthFromHeader(value: unknown): number | null {
  if (typeof value !== "string") return null;
  return MONTH_BY_PREFIX[value.trim().slice(0, 3).toUpperCase()] ?? null;
}

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function parseLayout(grid: Grid, seasonStartYear: number): SheetLayout {
  const [dayRow = [], titleRow = []] = grid;
  const columnByDate = new Map<IsoDate, number>();
  const warnings: string[] = [];
  const width = Math.max(dayRow.length, titleRow.length);

  let pendingDayColumns: number[] = [];
  for (let col = COLUMN.firstDay; col < width; col++) {
    const month = monthFromHeader(dayRow[col]);
    if (month === null) {
      // A day column has a weekday title; position decides the day number, so
      // a mistyped header value (e.g. a date instead of "31") is harmless.
      if (text(titleRow[col]) !== "") pendingDayColumns.push(col);
      continue;
    }

    const year = yearOfSeasonMonth(seasonStartYear, month);
    const expected = daysInMonth(year, month);
    if (pendingDayColumns.length !== expected) {
      warnings.push(
        `${text(dayRow[col])}: found ${pendingDayColumns.length} day columns, expected ${expected}.`,
      );
    }
    pendingDayColumns.slice(0, expected).forEach((dayCol, i) => {
      columnByDate.set(isoDate(year, month, i + 1), dayCol);
    });
    pendingDayColumns = [];
    col += SUMMARY_BLOCK_WIDTH - 1;
  }

  if (columnByDate.size === 0) warnings.push("No month blocks found in the header rows.");
  return { columnByDate, warnings };
}

/** The main roster: consecutive named rows starting on row 3. */
export function parseRoster(grid: Grid): RosterRow[] {
  const roster: RosterRow[] = [];
  for (let rowIndex = FIRST_ATHLETE_ROW; rowIndex < grid.length; rowIndex++) {
    const row = grid[rowIndex] ?? [];
    const familyName = text(row[COLUMN.familyName]);
    if (familyName === "") break;
    roster.push({
      rowIndex,
      familyName,
      givenName: text(row[COLUMN.givenName]),
      coachLabel: text(row[COLUMN.coach]) || null,
      clubCode: text(row[COLUMN.club]).toUpperCase() || null,
    });
  }
  return roster;
}

/** Key used to find an athlete's row again, tolerant to case/spacing/accents. */
export function nameKey(familyName: string, givenName: string): string {
  const normalize = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[\s-]+/g, " ").trim().toLowerCase();
  return `${normalize(familyName)}|${normalize(givenName)}`;
}

/** Zero-based column index to A1 letters (0 -> A, 26 -> AA). */
export function columnLetter(index: number): string {
  let letters = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  }
  return letters;
}

export function a1(rowIndex: number, columnIndex: number): string {
  return `${columnLetter(columnIndex)}${rowIndex + 1}`;
}
