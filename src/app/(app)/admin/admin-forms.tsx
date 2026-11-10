"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Club } from "@/db/schema";
import type { RosterAthlete } from "@/server/roster";
import { importAction, saveMemberAction, syncAction, type FormState } from "./actions";

function Feedback({ state, success }: { state: FormState<unknown>; success: React.ReactNode }) {
  if (!state) return null;
  return state.ok ? (
    <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
      {success}
    </div>
  ) : (
    <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState(importAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Input type="file" name="file" accept=".xlsx" required aria-label="Attendance file" className="max-w-sm" />
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import"}
        </Button>
      </div>
      <Feedback
        state={state}
        success={
          state?.ok && (
            <ul className="flex flex-col gap-1">
              {state.data.sheets.map((sheet) => (
                <li key={sheet.sheet}>
                  <strong>{sheet.sheet}</strong>: {sheet.athletes} athletes, {sheet.marks} marks.
                  {sheet.warnings.map((warning) => (
                    <span key={warning} className="block text-amber-800">
                      {warning}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )
        }
      />
    </form>
  );
}

export function SyncForm({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(syncAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Button type="submit" variant="outline" className="w-fit" disabled={disabled || pending}>
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      <Feedback state={state} success={state?.ok && state.data} />
    </form>
  );
}

export function MemberForm({ clubs, athletes }: { clubs: Club[]; athletes: RosterAthlete[] }) {
  const [state, action, pending] = useActionState(saveMemberAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Label>
          E-mail
          <Input type="email" name="email" required placeholder="coach@example.com" />
        </Label>
        <Label>
          Name
          <Input name="name" placeholder="Optional" />
        </Label>
        <Label>
          Role
          <NativeSelect name="role" defaultValue="coach">
            <option value="coach">Coach</option>
            <option value="athlete">Athlete</option>
            <option value="federation">Federation</option>
          </NativeSelect>
        </Label>
        <Label>
          Club
          <NativeSelect name="clubId" defaultValue="">
            <option value="">—</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.code}
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Label>
          Athlete
          <NativeSelect name="athleteId" defaultValue="">
            <option value="">—</option>
            {athletes.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.familyName} {athlete.givenName} ({athlete.clubCode ?? "no club"})
              </option>
            ))}
          </NativeSelect>
        </Label>
      </div>
      <Button type="submit" className="w-fit" disabled={pending}>
        Save access
      </Button>
      <Feedback state={state} success="Access saved." />
    </form>
  );
}
