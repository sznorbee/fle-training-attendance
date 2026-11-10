import "server-only";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { athletes, attendance, squads, syncRuns } from "@/db/schema";
import { seasonStartYear } from "@/lib/dates";
import { createSheetsClient, type CellUpdate, type SheetsClient } from "@/lib/sheet/google";
import { a1, nameKey, parseLayout, parseRoster } from "@/lib/sheet/layout";
import { markToCell } from "@/lib/sheet/marks";

export type SyncResult = { ok: boolean; cellsWritten: number; message: string };

const pendingCondition = and(
  eq(attendance.source, "app"),
  or(isNull(attendance.syncedAt), lt(attendance.syncedAt, attendance.updatedAt)),
);

export async function countPendingMarks(): Promise<number> {
  return db.$count(attendance, pendingCondition);
}

export const isSheetSyncConfigured = () => createSheetsClient() !== null;

export const getLastSyncRun = async () =>
  (await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1)).at(0) ?? null;

/**
 * Writes every mark recorded in the app since the last run to the shared
 * Google Sheet. Only those cells are touched, so formulas and other clubs'
 * manual edits stay as they are.
 */
export async function syncPendingMarks(client: SheetsClient | null = createSheetsClient()): Promise<SyncResult> {
  if (!client) {
    return { ok: false, cellsWritten: 0, message: "Google Sheets sync is not configured." };
  }
  const [run] = await db.insert(syncRuns).values({}).returning();

  let result: SyncResult;
  try {
    result = await writePendingMarks(client, run.startedAt);
  } catch (error) {
    result = { ok: false, cellsWritten: 0, message: error instanceof Error ? error.message : String(error) };
  }

  await db
    .update(syncRuns)
    .set({ finishedAt: sql`now()`, ...result })
    .where(eq(syncRuns.id, run.id));
  return result;
}

async function writePendingMarks(client: SheetsClient, startedAt: Date): Promise<SyncResult> {
  const pending = await db
    .select({
      id: attendance.id,
      day: attendance.day,
      status: attendance.status,
      note: attendance.note,
      familyName: athletes.familyName,
      givenName: athletes.givenName,
      sheet: squads.name,
    })
    .from(attendance)
    .innerJoin(athletes, eq(athletes.id, attendance.athleteId))
    .innerJoin(squads, eq(squads.id, athletes.squadId))
    .where(pendingCondition);
  if (pending.length === 0) return { ok: true, cellsWritten: 0, message: "Nothing to sync." };

  const updates: CellUpdate[] = [];
  const syncedIds: number[] = [];
  const unmatched = new Set<string>();

  for (const [sheet, marks] of Map.groupBy(pending, (mark) => mark.sheet)) {
    const grid = await client.readTable(sheet);
    const { columnByDate } = parseLayout(grid, seasonStartYear());
    const rowByName = new Map(
      parseRoster(grid).map((row) => [nameKey(row.familyName, row.givenName), row.rowIndex]),
    );

    for (const mark of marks) {
      const rowIndex = rowByName.get(nameKey(mark.familyName, mark.givenName));
      const columnIndex = columnByDate.get(mark.day);
      if (rowIndex === undefined || columnIndex === undefined) {
        unmatched.add(
          rowIndex === undefined ? `${mark.familyName} ${mark.givenName} (${sheet})` : `${mark.day} (${sheet})`,
        );
        continue;
      }
      updates.push({ sheet, cell: a1(rowIndex, columnIndex), value: markToCell(mark.status, mark.note) });
      syncedIds.push(mark.id);
    }
  }

  await client.writeCells(updates);
  if (syncedIds.length > 0) {
    // Marks edited again while we were writing keep `updatedAt > syncedAt`
    // and are picked up by the next run.
    await db.update(attendance).set({ syncedAt: startedAt }).where(inArray(attendance.id, syncedIds));
  }

  const message =
    unmatched.size === 0
      ? `Wrote ${updates.length} cells.`
      : `Wrote ${updates.length} cells. Not found in the sheet: ${[...unmatched].join(", ")}.`;
  return { ok: unmatched.size === 0, cellsWritten: updates.length, message };
}
