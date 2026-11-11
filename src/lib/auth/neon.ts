import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

/** Neon Auth server instance, or `null` when the project is not configured for it. */
export const neonAuth =
  baseUrl && cookieSecret
    ? createNeonAuth({ baseUrl, cookies: { secret: cookieSecret } })
    : null;

/**
 * Local development without Neon Auth: sign in by typing any e-mail address.
 * Never available in production builds.
 */
export const isDevAuth = neonAuth === null && process.env.NODE_ENV !== "production";

export const DEV_AUTH_COOKIE = "dev_auth_email";
export const SIGN_IN_PATH = "/auth/sign-in";

/**
 * Sign-in screens that signed-out visitors must reach but that Neon Auth's
 * own route protection does not exempt (e.g. entering the verification code).
 */
export const PUBLIC_AUTH_PATHS = [
  "/auth/email-verification",
  "/auth/reset-password",
  "/auth/recover-account",
  "/auth/two-factor",
];
