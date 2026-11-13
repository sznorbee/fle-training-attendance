"use client";

import Form from "next/form";
import type { Club, Squad } from "@/db/schema";
import { NativeSelect } from "@/components/ui/native-select";

type Props = {
  action: string;
  /** Omit when the page offers its own squad switch. */
  squads?: Squad[];
  /** Only passed for viewers who can see several clubs. */
  clubs?: Club[];
  squadId?: number;
  clubId?: number;
  children?: React.ReactNode;
};

/** Squad/club filters kept in the URL; submits as soon as a value changes. */
export function RosterFilters({ action, squads, clubs, squadId, clubId, children }: Props) {
  return (
    <Form
      action={action}
      className="flex flex-wrap items-center gap-2"
      onChange={(event) => event.currentTarget.requestSubmit()}
    >
      {children}
      {squads && (
        <NativeSelect name="squad" defaultValue={squadId ?? ""} aria-label="Squad" className="w-auto">
          <option value="">All squads</option>
          {squads.map((squad) => (
            <option key={squad.id} value={squad.id}>
              {squad.name}
            </option>
          ))}
        </NativeSelect>
      )}
      {clubs && (
        <NativeSelect name="club" defaultValue={clubId ?? ""} aria-label="Club" className="w-auto">
          <option value="">All clubs</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.code}
            </option>
          ))}
        </NativeSelect>
      )}
    </Form>
  );
}
