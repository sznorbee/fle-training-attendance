import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDevAuth, neonAuth } from "@/lib/auth/neon";
import { devSignInAction } from "../actions";
import { AuthProvider } from "../auth-provider";

export const metadata: Metadata = { title: "Sign in" };

type Props = { params: Promise<{ path: string }> };

function DevSignIn() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Development sign-in</CardTitle>
        <CardDescription>
          Neon Auth is not configured, so any e-mail address signs you in. This screen does not exist in production.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={devSignInAction} className="flex flex-col gap-3">
          <Label>
            E-mail
            <Input type="email" name="email" required autoFocus />
          </Label>
          <Button type="submit">Sign in</Button>
        </form>
      </CardContent>
    </Card>
  );
}

async function AuthScreen({ params }: Props) {
  const { path } = await params;
  if (!Object.values(authViewPaths).includes(path)) notFound();

  if (neonAuth) {
    return (
      <AuthProvider>
        <AuthView path={path} />
      </AuthProvider>
    );
  }
  if (isDevAuth) return <DevSignIn />;
  return <p className="text-muted-foreground">Sign-in is not configured. Set the NEON_AUTH_* environment variables.</p>;
}

export default function AuthPage(props: Props) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-xl font-semibold tracking-tight">Training attendance</h1>
      <Suspense>
        <AuthScreen {...props} />
      </Suspense>
    </main>
  );
}
