"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DEV_AUTH_COOKIE, isDevAuth, neonAuth, SIGN_IN_PATH } from "@/lib/auth/neon";

export async function signOutAction(): Promise<void> {
  if (neonAuth) await neonAuth.signOut();
  else (await cookies()).delete(DEV_AUTH_COOKIE);
  redirect(SIGN_IN_PATH);
}

/** Development only: "sign in" as any address to try out the roles locally. */
export async function devSignInAction(formData: FormData): Promise<void> {
  if (!isDevAuth) throw new Error("Development sign-in is disabled.");
  const email = z.email().parse(formData.get("email"));
  (await cookies()).set(DEV_AUTH_COOKIE, email, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/");
}
