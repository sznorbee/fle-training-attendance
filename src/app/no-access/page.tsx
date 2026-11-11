import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SIGN_IN_PATH } from "@/lib/auth/neon";
import { getAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "No access yet" };

async function NoAccess() {
  const access = await getAccess();
  if (access.state === "anonymous") redirect(SIGN_IN_PATH);
  if (access.state === "ok") redirect("/");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{access.state === "unverified" ? "Confirm your e-mail address" : "No access yet"}</CardTitle>
        <CardDescription>
          {access.state === "unverified"
            ? `We need to know that ${access.user.email} is yours. Enter the 6-digit code from the e-mail we sent you; you can also request a new one there.`
            : `You are signed in as ${access.user.email}, but this address has not been given access. Ask your federation administrator to add it.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {access.state === "unverified" && (
          <Button asChild>
            <Link href={`/auth/email-verification?email=${encodeURIComponent(access.user.email)}`}>Enter code</Link>
          </Button>
        )}
        <form action={signOutAction}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NoAccessPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Suspense>
        <NoAccess />
      </Suspense>
    </main>
  );
}
