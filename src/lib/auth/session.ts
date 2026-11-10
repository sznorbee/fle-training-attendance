import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { DEV_AUTH_COOKIE, isDevAuth, neonAuth, SIGN_IN_PATH } from "./neon";
import { canAdminister, type Viewer } from "./permissions";

export type SessionUser = { email: string; name: string | null; emailVerified: boolean };

export type Access =
  | { state: "anonymous" }
  | { state: "unverified"; user: SessionUser }
  | { state: "no-access"; user: SessionUser }
  | { state: "ok"; viewer: Viewer };

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();

  if (neonAuth) {
    const { data } = await neonAuth.getSession();
    if (!data?.user?.email) return null;
    return {
      email: normalizeEmail(data.user.email),
      name: data.user.name || null,
      emailVerified: Boolean(data.user.emailVerified),
    };
  }

  if (isDevAuth) {
    const email = cookieStore.get(DEV_AUTH_COOKIE)?.value;
    return email ? { email: normalizeEmail(email), name: null, emailVerified: true } : null;
  }

  return null;
});

/** Bootstrap administrators, so the first federation user needs no database row. */
function isBootstrapAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).includes(email);
}

/** Resolves who is signed in and what they may do. Deduplicated per request. */
export const getAccess = cache(async (): Promise<Access> => {
  const user = await getSessionUser();
  if (!user) return { state: "anonymous" };

  // Roles are granted by e-mail address, so the address must be proven.
  const mustBeVerified = process.env.REQUIRE_VERIFIED_EMAIL !== "false";
  if (mustBeVerified && !user.emailVerified) return { state: "unverified", user };

  const [member] = await db.select().from(members).where(eq(members.email, user.email)).limit(1);
  if (member) {
    return {
      state: "ok",
      viewer: {
        email: user.email,
        name: member.name ?? user.name,
        role: member.role,
        clubId: member.clubId,
        athleteId: member.athleteId,
      },
    };
  }

  if (isBootstrapAdmin(user.email)) {
    return {
      state: "ok",
      viewer: { email: user.email, name: user.name, role: "federation", clubId: null, athleteId: null },
    };
  }

  return { state: "no-access", user };
});

/** For pages: returns the viewer or redirects to the right place. */
export async function requireViewer(): Promise<Viewer> {
  const access = await getAccess();
  if (access.state === "anonymous") redirect(SIGN_IN_PATH);
  if (access.state !== "ok") redirect("/no-access");
  return access.viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!canAdminister(viewer)) redirect("/");
  return viewer;
}
