"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { Club, Role } from "@/db/schema";
import type { MemberRow } from "@/server/members";
import type { RosterAthlete } from "@/server/roster";
import { importAction, removeMemberAction, saveMemberAction, syncAction, type FormState } from "./actions";

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
        <Input type="file" name="file" accept=".xlsx" required aria-label="Attendance file" className="h-11 max-w-sm py-2 sm:h-9 sm:py-1" />
        <Button type="submit" className="h-11 sm:h-9" disabled={pending}>
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
      <Button type="submit" variant="outline" className="h-11 w-fit sm:h-9" disabled={disabled || pending}>
        {pending ? "Syncing…" : "Sync now"}
      </Button>
      <Feedback state={state} success={state?.ok && state.data} />
    </form>
  );
}

const ROLE_HELP: Record<Role, string> = {
  coach: "Records attendance for the athletes of one club.",
  athlete: "Sees their own attendance, nothing else.",
  federation: "Sees and edits every club, and manages this page.",
};

type MembersPanelProps = { members: MemberRow[]; clubs: Club[]; athletes: RosterAthlete[] };

/** The access form plus the list of people; "Edit" loads a person into the form. */
export function MembersPanel({ members, clubs, athletes }: MembersPanelProps) {
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <MemberForm
        // Remount to load the chosen person (or to empty the form again).
        key={editing?.id ?? "new"}
        member={editing}
        clubs={clubs}
        athletes={athletes}
        onDone={() => setEditing(null)}
      />

      <ul className="flex flex-col divide-y border-t">
        {members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <div className="min-w-0 flex-1 basis-56">
              <p className="truncate font-medium">{member.email}</p>
              <p className="truncate text-sm text-muted-foreground">
                {[
                  member.name,
                  member.clubCode,
                  member.athleteFamilyName && `${member.athleteFamilyName} ${member.athleteGivenName}`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {member.role}
            </Badge>
            <div className="flex gap-2">
              {confirmingId === member.id ? (
                <>
                  <form action={removeMemberAction}>
                    <input type="hidden" name="id" value={member.id} />
                    <Button type="submit" variant="destructive" className="h-11 sm:h-9">
                      Remove access
                    </Button>
                  </form>
                  <Button variant="outline" className="h-11 sm:h-9" onClick={() => setConfirmingId(null)}>
                    Keep
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="h-11 sm:h-9" onClick={() => setEditing(member)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 sm:h-9"
                    aria-label={`Remove ${member.email}`}
                    onClick={() => setConfirmingId(member.id)}
                  >
                    Remove
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {members.length === 0 && <p className="text-sm text-muted-foreground">Nobody has been given access yet.</p>}
    </div>
  );
}

type MemberFormProps = Omit<MembersPanelProps, "members"> & { member: MemberRow | null; onDone: () => void };

function MemberForm({ member, clubs, athletes, onDone }: MemberFormProps) {
  const [state, action, pending] = useActionState(saveMemberAction, null);
  const [role, setRole] = useState<Role>(member?.role ?? "coach");

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Label>
          E-mail
          {/* The address identifies the person, so it cannot be changed while editing. */}
          <Input
            type="email"
            name="email"
            required
            readOnly={member !== null}
            defaultValue={member?.email}
            placeholder="coach@example.com"
            className="h-11 read-only:bg-muted sm:h-9"
          />
        </Label>
        <Label>
          Name
          <Input name="name" defaultValue={member?.name ?? ""} placeholder="Optional" className="h-11 sm:h-9" />
        </Label>
        <Label>
          Role
          <NativeSelect name="role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="coach">Coach</option>
            <option value="athlete">Athlete</option>
            <option value="federation">Federation</option>
          </NativeSelect>
        </Label>
        {role === "coach" && (
          <Label>
            Club
            <NativeSelect name="clubId" defaultValue={member?.clubId ?? ""} required>
              <option value="">Choose a club</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.code}
                </option>
              ))}
            </NativeSelect>
          </Label>
        )}
        {role === "athlete" && (
          <Label>
            Athlete
            <NativeSelect name="athleteId" defaultValue={member?.athleteId ?? ""} required>
              <option value="">Choose an athlete</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.familyName} {athlete.givenName} ({athlete.clubCode ?? "no club"})
                </option>
              ))}
            </NativeSelect>
          </Label>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{ROLE_HELP[role]}</p>
      <div className="flex gap-2">
        <Button type="submit" className="h-11 w-fit sm:h-9" disabled={pending}>
          {member ? "Save changes" : "Give access"}
        </Button>
        {member && (
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
      <Feedback state={state} success="Access saved." />
    </form>
  );
}
