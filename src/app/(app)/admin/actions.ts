"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { roleEnum } from "@/db/schema";
import { canAdminister } from "@/lib/auth/permissions";
import { getAccess } from "@/lib/auth/session";
import { seasonStartYear } from "@/lib/dates";
import { importWorkbook, type ImportSummary } from "@/server/import";
import { removeMember, saveMember } from "@/server/members";
import { syncPendingMarks } from "@/server/sync";

export type FormState<T = undefined> = { ok: true; data: T } | { ok: false; error: string } | null;

const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function assertAdmin(): Promise<void> {
  const access = await getAccess();
  if (access.state !== "ok" || !canAdminister(access.viewer)) {
    throw new Error("Only federation administrators can do this.");
  }
}

const failure = (error: unknown): { ok: false; error: string } => ({
  ok: false,
  error: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : "Something went wrong.",
});

export async function importAction(_: FormState<ImportSummary>, formData: FormData): Promise<FormState<ImportSummary>> {
  try {
    await assertAdmin();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose the .xlsx attendance file first.");
    if (file.size > MAX_FILE_BYTES) throw new Error("The file is larger than 5 MB.");

    const summary = await importWorkbook(await file.arrayBuffer(), seasonStartYear());
    revalidatePath("/admin");
    return { ok: true, data: summary };
  } catch (error) {
    return failure(error);
  }
}

export async function syncAction(): Promise<FormState<string>> {
  try {
    await assertAdmin();
    const result = await syncPendingMarks();
    revalidatePath("/admin");
    return result.ok ? { ok: true, data: result.message } : { ok: false, error: result.message };
  } catch (error) {
    return failure(error);
  }
}

const optionalId = z.preprocess((value) => (value === "" || value === null ? null : Number(value)), z.number().int().positive().nullable());

const memberSchema = z
  .object({
    email: z.email("Enter a valid e-mail address."),
    name: z.string().trim().max(120).transform((value) => value || null),
    role: z.enum(roleEnum.enumValues),
    clubId: optionalId,
    athleteId: optionalId,
  })
  .refine((member) => member.role !== "coach" || member.clubId !== null, "A coach needs a club.")
  .refine((member) => member.role !== "athlete" || member.athleteId !== null, "Choose which athlete this account belongs to.");

export async function saveMemberAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    await assertAdmin();
    await saveMember(memberSchema.parse(Object.fromEntries(formData)));
    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  await assertAdmin();
  await removeMember(z.coerce.number().int().positive().parse(formData.get("id")));
  revalidatePath("/admin");
}
