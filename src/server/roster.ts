import "server-only";
import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { athletes, clubs, squads } from "@/db/schema";
import { athleteScope, type Viewer } from "@/lib/auth/permissions";

export type RosterAthlete = {
  id: number;
  familyName: string;
  givenName: string;
  coachLabel: string | null;
  clubId: number | null;
  clubCode: string | null;
  squadId: number;
  squadName: string;
};

export type RosterFilter = { clubId?: number; squadId?: number };

/** Athletes the viewer is allowed to see, in spreadsheet order. */
export async function listAthletes(viewer: Viewer, filter: RosterFilter = {}): Promise<RosterAthlete[]> {
  const scope = athleteScope(viewer);
  if (scope.kind === "none") return [];

  const conditions: SQL[] = [eq(athletes.active, true)];
  if (scope.kind === "club") conditions.push(eq(athletes.clubId, scope.clubId));
  if (scope.kind === "athlete") conditions.push(eq(athletes.id, scope.athleteId));
  if (filter.clubId !== undefined) conditions.push(eq(athletes.clubId, filter.clubId));
  if (filter.squadId !== undefined) conditions.push(eq(athletes.squadId, filter.squadId));

  return db
    .select({
      id: athletes.id,
      familyName: athletes.familyName,
      givenName: athletes.givenName,
      coachLabel: athletes.coachLabel,
      clubId: athletes.clubId,
      clubCode: clubs.code,
      squadId: athletes.squadId,
      squadName: squads.name,
    })
    .from(athletes)
    .innerJoin(squads, eq(squads.id, athletes.squadId))
    .leftJoin(clubs, eq(clubs.id, athletes.clubId))
    .where(and(...conditions))
    .orderBy(asc(squads.id), asc(athletes.sortOrder));
}

export async function getAthlete(viewer: Viewer, athleteId: number): Promise<RosterAthlete | null> {
  const visible = await listAthletes(viewer);
  return visible.find((athlete) => athlete.id === athleteId) ?? null;
}

export const listClubs = () => db.select().from(clubs).orderBy(asc(clubs.code));
export const listSquads = () => db.select().from(squads).orderBy(asc(squads.id));
