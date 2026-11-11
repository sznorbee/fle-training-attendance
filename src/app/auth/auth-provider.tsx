"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";
import { NeonAuthUIProvider } from "@neondatabase/auth-ui";

const authClient = createAuthClient();

const subscribeToNothing = () => () => {};
/** False on the server and during hydration, true afterwards. */
const useIsClient = () => useSyncExternalStore(subscribeToNothing, () => true, () => false);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // The auth screens read the browser URL while rendering (e.g. the e-mail
  // being verified), so they are rendered in the browser only.
  const isClient = useIsClient();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      onSessionChange={() => router.refresh()}
      redirectTo="/"
      // Neon Auth e-mails a 6-digit code; this shows the screen to enter it.
      emailVerification={{ otp: true }}
      defaultTheme="light"
      Link={Link}
    >
      {isClient ? children : null}
    </NeonAuthUIProvider>
  );
}
