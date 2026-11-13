import "server-only";
import { and, between, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { athletes, attendance, type MarkStatus } from "@/db/schema";
import { canEditAthlete, type Viewer } from "@/lib/auth/permissions";
import type { IsoDate } from "@/lib/dates";

export type DayMark = { athleteId: number; day: IsoDate; status: MarkStatus; note: string | null };

export class ForbiddenError extends Error {
  constructor() {
    super("You are not allowed to edit this athlete.");
  }
}

/** Recorded marks for the given athletes; cleared marks are left out. */
export async function getMarks(athleteIds: number[], from: IsoDate, to: IsoDate): Promise<DayMark[]> {
  if (athleteIds.length === 0) return [];
  return db
    .select({
      athleteId: attendance.athleteId,
      day: attendance.day,
      status: attendance.status,
      note: attendance.note,
    })
    .from(attendance)
    .where(
      and(
        inArray(attendance.athleteId, athleteIds),
        between(attendance.day, from, to),
        ne(attendance.status, "cleared"),
      ),
    );
}

async function editableAthleteIds(viewer: Viewer, athleteIds: number[]): Promise<number[]> {
  if (athleteIds.length === 0) return [];
  const rows = await db
    .select({ id: athletes.id, clubId: athletes.clubId })
    .from(athletes)
    .where(inArray(athletes.id, athleteIds));
  return rows.filter((athlete) => canEditAthlete(viewer, athlete)).map((athlete) => athlete.id);
}

export async function setMark(viewer: Viewer, mark: DayMark): Promise<void> {
  const [allowed] = await editableAthleteIds(viewer, [mark.athleteId]);
  if (allowed === undefined) throw new ForbiddenError();

  const values = {
    status: mark.status,
    note: mark.status === "other" ? mark.note?.trim() || null : null,
    source: "app" as const,
    updatedBy: viewer.email,
    updatedAt: sql`now()`,
  };
  await db
    .insert(attendance)
    .values({ athleteId: mark.athleteId, day: mark.day, ...values })
    .onConflictDoUpdate({ target: [attendance.athleteId, attendance.day], set: values });
}

/** Marks every athlete without a mark on that day as absent. Returns who was marked. */
export async function markUnrecordedAbsent(
  viewer: Viewer,
  athleteIds: number[],
  day: IsoDate,
): Promise<number[]> {
  const allowed = await editableAthleteIds(viewer, athleteIds);
  if (allowed.length === 0) return [];

  const values = {
    status: "absent" as const,
    note: null,
    source: "app" as const,
    updatedBy: viewer.email,
    updatedAt: sql`now()`,
  };
  const written = await db
    .insert(attendance)
    .values(allowed.map((athleteId) => ({ athleteId, day, ...values })))
    .onConflictDoUpdate({
      target: [attendance.athleteId, attendance.day],
      set: values,
      setWhere: eq(attendance.status, "cleared"),
    })
    .returning({ athleteId: attendance.athleteId });
  return written.map((row) => row.athleteId);
}

/** Clears the marks of several athletes on one day (used to undo a bulk action). */
export async function clearMarks(viewer: Viewer, athleteIds: number[], day: IsoDate): Promise<void> {
  const allowed = await editableAthleteIds(viewer, athleteIds);
  if (allowed.length === 0) return;
  await db
    .update(attendance)
    .set({ status: "cleared", note: null, source: "app", updatedBy: viewer.email, updatedAt: sql`now()` })
    .where(and(inArray(attendance.athleteId, allowed), eq(attendance.day, day)));
}

/** Days in the range on which at least one of the athletes has a mark. */
export async function getRecordedDays(athleteIds: number[], from: IsoDate, to: IsoDate): Promise<Set<IsoDate>> {
  if (athleteIds.length === 0) return new Set();
  const rows = await db
    .selectDistinct({ day: attendance.day })
    .from(attendance)
    .where(
      and(
        inArray(attendance.athleteId, athleteIds),
        between(attendance.day, from, to),
        ne(attendance.status, "cleared"),
      ),
    );
  return new Set(rows.map((row) => row.day));
}
