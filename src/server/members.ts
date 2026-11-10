import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { athletes, clubs, members, type Role } from "@/db/schema";

export type MemberInput = {
  email: string;
  name: string | null;
  role: Role;
  clubId: number | null;
  athleteId: number | null;
};

export function listMembers() {
  return db
    .select({
      id: members.id,
      email: members.email,
      name: members.name,
      role: members.role,
      clubCode: clubs.code,
      athleteFamilyName: athletes.familyName,
      athleteGivenName: athletes.givenName,
    })
    .from(members)
    .leftJoin(clubs, eq(clubs.id, members.clubId))
    .leftJoin(athletes, eq(athletes.id, members.athleteId))
    .orderBy(asc(members.role), asc(members.email));
}

/** Grants (or changes) access for an e-mail address. */
export async function saveMember(input: MemberInput): Promise<void> {
  const values = {
    name: input.name,
    role: input.role,
    // Keep only the links that make sense for the role.
    clubId: input.role === "federation" ? null : input.clubId,
    athleteId: input.role === "athlete" ? input.athleteId : null,
  };
  await db
    .insert(members)
    .values({ email: input.email.trim().toLowerCase(), ...values })
    .onConflictDoUpdate({ target: members.email, set: values });
}

export async function removeMember(id: number): Promise<void> {
  await db.delete(members).where(eq(members.id, id));
}
