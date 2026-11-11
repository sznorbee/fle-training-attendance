import { NextResponse, type NextRequest } from "next/server";
import { neonAuth, PUBLIC_AUTH_PATHS, SIGN_IN_PATH } from "@/lib/auth/neon";

const neonProxy = neonAuth?.middleware({ loginUrl: SIGN_IN_PATH });

/**
 * Keeps the Neon Auth session fresh and sends anonymous visitors to sign-in.
 * This is only an optimistic check: every page and action re-checks access.
 */
export default function proxy(request: NextRequest) {
  if (!neonProxy || PUBLIC_AUTH_PATHS.includes(request.nextUrl.pathname)) return NextResponse.next();
  return neonProxy(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/cron).*)"],
};
