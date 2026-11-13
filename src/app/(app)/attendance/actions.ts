"use server";

import { z } from "zod";
import { markStatusEnum } from "@/db/schema";
import { getAccess } from "@/lib/auth/session";
import { isInSeason, isIsoDate, season, seasonStartYear } from "@/lib/dates";
import { clearMarks, ForbiddenError, markUnrecordedAbsent, setMark } from "@/server/attendance";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const daySchema = z
  .string()
  .refine((value) => isIsoDate(value) && isInSeason(value, season(seasonStartYear())), "The date is outside the current season.");

const markSchema = z.object({
  athleteId: z.number().int().positive(),
  day: daySchema,
  status: z.enum(markStatusEnum.enumValues),
  note: z.string().trim().max(60).nullable(),
});

const bulkSchema = z.object({
  athleteIds: z.array(z.number().int().positive()).max(500),
  day: daySchema,
});

async function run<T>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await work() };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: error.issues[0].message };
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: "Saving failed. Please try again." };
  }
}

async function currentViewer() {
  const access = await getAccess();
  if (access.state !== "ok") throw new ForbiddenError();
  return access.viewer;
}

export async function saveMarkAction(input: z.input<typeof markSchema>): Promise<ActionResult> {
  return run(async () => {
    await setMark(await currentViewer(), markSchema.parse(input));
    return undefined;
  });
}

/** Returns the ids of the athletes that were marked absent, so the action can be undone. */
export async function markUnrecordedAbsentAction(input: z.input<typeof bulkSchema>): Promise<ActionResult<number[]>> {
  return run(async () => {
    const { athleteIds, day } = bulkSchema.parse(input);
    return markUnrecordedAbsent(await currentViewer(), athleteIds, day);
  });
}

export async function clearMarksAction(input: z.input<typeof bulkSchema>): Promise<ActionResult> {
  return run(async () => {
    const { athleteIds, day } = bulkSchema.parse(input);
    await clearMarks(await currentViewer(), athleteIds, day);
    return undefined;
  });
}
