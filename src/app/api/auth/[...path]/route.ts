import { neonAuth } from "@/lib/auth/neon";

const notConfigured = () => Response.json({ error: "Neon Auth is not configured." }, { status: 501 });

/** Forwards the browser's auth requests (sign-in, sign-up, ...) to Neon Auth. */
export const { GET, POST } = neonAuth?.handler() ?? { GET: notConfigured, POST: notConfigured };
