import "server-only";
import { sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { athletes, attendance, clubs, squads } from "@/db/schema";
import { parseLayout, parseRoster, type RosterRow } from "@/lib/sheet/layout";
import { cellToMark } from "@/lib/sheet/marks";
import { readWorkbook, type Worksheet } from "@/lib/sheet/xlsx";

export type SheetImportSummary = { sheet: string; athletes: number; marks: number; warnings: string[] };
export type ImportSummary = { sheets: SheetImportSummary[] };

const CHUNK_SIZE = 1000;

/**
 * Loads the federation's workbook: one squad per worksheet, its roster and
 * every recorded mark. Safe to run again: marks edited in the app are kept.
 */
export async function importWorkbook(data: ArrayBuffer, seasonStartYear: number): Promise<ImportSummary> {
  const worksheets = await readWorkbook(data);
  if (worksheets.length === 0) throw new Error("The file contains no worksheets.");

  const sheets = await db.transaction(async (tx) => {
    const summaries: SheetImportSummary[] = [];
    for (const worksheet of worksheets) {
      summaries.push(await importWorksheet(tx, worksheet, seasonStartYear));
    }
    return summaries;
  });
  return { sheets };
}

async function importWorksheet(tx: Tx, worksheet: Worksheet, seasonStartYear: number): Promise<SheetImportSummary> {
  const layout = parseLayout(worksheet.grid, seasonStartYear);
  const roster = parseRoster(worksheet.grid);
  const summary: SheetImportSummary = {
    sheet: worksheet.name,
    athletes: roster.length,
    marks: 0,
    warnings: layout.warnings,
  };
  if (layout.columnByDate.size === 0 || roster.length === 0) {
    summary.warnings = [...summary.warnings, "Sheet skipped: no attendance table recognised."];
    summary.athletes = 0;
    return summary;
  }

  const squadId = await upsertSquad(tx, worksheet.name);
  const clubIdByCode = await upsertClubs(tx, roster);
  const athleteIdByRow = await upsertAthletes(tx, squadId, roster, clubIdByCode);

  const marks = roster.flatMap((row) => {
    const athleteId = athleteIdByRow.get(row.rowIndex)!;
    const cells = worksheet.grid[row.rowIndex] ?? [];
    return [...layout.columnByDate].flatMap(([day, column]) => {
      const mark = cellToMark(cells[column]);
      return mark ? [{ athleteId, day, ...mark, source: "import" as const }] : [];
    });
  });

  for (let i = 0; i < marks.length; i += CHUNK_SIZE) {
    await tx
      .insert(attendance)
      .values(marks.slice(i, i + CHUNK_SIZE))
      .onConflictDoUpdate({
        target: [attendance.athleteId, attendance.day],
        set: { status: sql`excluded.status`, note: sql`excluded.note`, updatedAt: sql`now()` },
        // Never overwrite what a coach recorded in the app.
        setWhere: sql`${attendance.source} = 'import'`,
      });
  }
  summary.marks = marks.length;
  return summary;
}

async function upsertSquad(tx: Tx, name: string): Promise<number> {
  const [squad] = await tx
    .insert(squads)
    .values({ name })
    .onConflictDoUpdate({ target: squads.name, set: { name } })
    .returning({ id: squads.id });
  return squad.id;
}

async function upsertClubs(tx: Tx, roster: RosterRow[]): Promise<Map<string, number>> {
  const codes = [...new Set(roster.flatMap((row) => (row.clubCode ? [row.clubCode] : [])))];
  if (codes.length === 0) return new Map();
  const rows = await tx
    .insert(clubs)
    .values(codes.map((code) => ({ code })))
    .onConflictDoUpdate({ target: clubs.code, set: { code: sql`excluded.code` } })
    .returning({ id: clubs.id, code: clubs.code });
  return new Map(rows.map((club) => [club.code, club.id]));
}

async function upsertAthletes(
  tx: Tx,
  squadId: number,
  roster: RosterRow[],
  clubIdByCode: Map<string, number>,
): Promise<Map<number, number>> {
  const athleteIdByRow = new Map<number, number>();
  // One statement per athlete keeps duplicate names inside a sheet harmless.
  for (const [sortOrder, row] of roster.entries()) {
    const values = {
      clubId: row.clubCode ? clubIdByCode.get(row.clubCode)! : null,
      coachLabel: row.coachLabel,
      sortOrder,
      active: true,
    };
    const [athlete] = await tx
      .insert(athletes)
      .values({ squadId, familyName: row.familyName, givenName: row.givenName, ...values })
      .onConflictDoUpdate({
        target: [athletes.squadId, athletes.familyName, athletes.givenName],
        set: values,
      })
      .returning({ id: athletes.id });
    athleteIdByRow.set(row.rowIndex, athlete.id);
  }
  return athleteIdByRow;
}
