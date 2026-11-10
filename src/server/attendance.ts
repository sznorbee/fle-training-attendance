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

/** Marks every athlete without a mark on that day as absent. Returns how many. */
export async function markUnrecordedAbsent(
  viewer: Viewer,
  athleteIds: number[],
  day: IsoDate,
): Promise<number> {
  const allowed = await editableAthleteIds(viewer, athleteIds);
  if (allowed.length === 0) return 0;

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
    .returning({ id: attendance.id });
  return written.length;
}
