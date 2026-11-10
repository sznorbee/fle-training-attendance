"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IsoDate } from "@/lib/dates";
import { MARK_STYLE, RECORDABLE_STATUSES, type RecordableStatus } from "@/lib/mark-style";
import { cn } from "@/lib/utils";
import type { RosterAthlete } from "@/server/roster";
import { markUnrecordedAbsentAction, saveMarkAction } from "./actions";

export type BoardMark = { status: RecordableStatus; note: string | null };
type Marks = Record<number, BoardMark | undefined>;

type Props = { day: IsoDate; athletes: RosterAthlete[]; initialMarks: Marks };

export function AttendanceBoard({ day, athletes, initialMarks }: Props) {
  const [marks, setMarks] = useState<Marks>(initialMarks);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const unrecorded = athletes.filter((athlete) => !marks[athlete.id]);
  const count = (status: RecordableStatus) => athletes.filter((a) => marks[a.id]?.status === status).length;

  /** Optimistic update; rolls back if the server refuses. */
  function save(athleteId: number, next: BoardMark | undefined) {
    const previous = marks[athleteId];
    setMarks((current) => ({ ...current, [athleteId]: next }));
    setError(null);
    startTransition(async () => {
      const result = await saveMarkAction({
        athleteId,
        day,
        status: next?.status ?? "cleared",
        note: next?.note ?? null,
      });
      if (!result.ok) {
        setMarks((current) => ({ ...current, [athleteId]: previous }));
        setError(result.error);
      }
    });
  }

  function markRestAbsent() {
    const athleteIds = unrecorded.map((athlete) => athlete.id);
    setError(null);
    startTransition(async () => {
      const result = await markUnrecordedAbsentAction({ athleteIds, day });
      if (!result.ok) return setError(result.error);
      setMarks((current) => ({
        ...current,
        ...Object.fromEntries(athleteIds.map((id) => [id, { status: "absent", note: null }])),
      }));
    });
  }

  const squads = Map.groupBy(athletes, (athlete) => athlete.squadName);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span>
          <strong>{count("present") + count("lesson")}</strong> present
          <span className="text-muted-foreground"> ({count("lesson")} with lesson)</span>
        </span>
        <span>
          <strong>{count("absent")}</strong> absent
        </span>
        <span className="text-muted-foreground">{unrecorded.length} not recorded</span>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={unrecorded.length === 0 || isPending}
          onClick={markRestAbsent}
        >
          Mark the rest absent
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      {[...squads].map(([squadName, members]) => (
        <Card key={squadName} className="gap-2">
          <CardHeader>
            <CardTitle className="text-sm tracking-wide text-muted-foreground uppercase">{squadName}</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {members.map((athlete) => (
                <AthleteRow
                  key={athlete.id}
                  athlete={athlete}
                  mark={marks[athlete.id]}
                  onChange={(next) => save(athlete.id, next)}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type RowProps = {
  athlete: RosterAthlete;
  mark: BoardMark | undefined;
  onChange: (next: BoardMark | undefined) => void;
};

function AthleteRow({ athlete, mark, onChange }: RowProps) {
  const details = [athlete.clubCode, athlete.coachLabel].filter(Boolean).join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5">
      <div className="min-w-40 flex-1">
        <p className="font-medium">
          {athlete.familyName} <span className="font-normal">{athlete.givenName}</span>
        </p>
        {details && <p className="text-xs text-muted-foreground">{details}</p>}
      </div>

      <div role="group" aria-label={`Attendance of ${athlete.givenName} ${athlete.familyName}`} className="flex gap-1">
        {RECORDABLE_STATUSES.map((status) => {
          const selected = mark?.status === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={selected}
              // Tapping the selected mark again clears it.
              onClick={() => onChange(selected ? undefined : { status, note: null })}
              className={cn(
                "h-9 min-w-16 rounded-md border px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selected ? MARK_STYLE[status].className : "bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {MARK_STYLE[status].label}
            </button>
          );
        })}
      </div>

      {mark?.status === "other" && (
        <Input
          // Remount when the saved note changes so the field shows it.
          key={mark.note ?? ""}
          defaultValue={mark.note ?? ""}
          maxLength={60}
          placeholder="Reason, e.g. competition venue"
          aria-label="Reason"
          className="basis-full sm:max-w-xs sm:basis-auto"
          onBlur={(event) => {
            const note = event.currentTarget.value.trim() || null;
            if (note !== mark.note) onChange({ status: "other", note });
          }}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
        />
      )}
    </li>
  );
}
