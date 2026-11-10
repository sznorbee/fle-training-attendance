import { timingSafeEqual } from "node:crypto";
import { syncPendingMarks } from "@/server/sync";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called daily by Vercel Cron (see vercel.json), which sends CRON_SECRET. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) return new Response("Unauthorized", { status: 401 });
  const result = await syncPendingMarks();
  return Response.json(result, { status: result.ok ? 200 : 500 });
}
