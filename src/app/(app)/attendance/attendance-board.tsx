"use client";

import { useState, useTransition } from "react";
import { Ellipsis, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IsoDate } from "@/lib/dates";
import { MARK_STYLE, OTHER_REASONS, type RecordableStatus } from "@/lib/mark-style";
import { cn } from "@/lib/utils";
import type { RosterAthlete } from "@/server/roster";
import { clearMarksAction, markUnrecordedAbsentAction, saveMarkAction, type ActionResult } from "./actions";

export type BoardMark = { status: RecordableStatus; note: string | null };
type Marks = Record<number, BoardMark | undefined>;

type Props = { day: IsoDate; athletes: RosterAthlete[]; initialMarks: Marks };

type SaveState = { kind: "idle" } | { kind: "saved" } | { kind: "error"; message: string };

/** Tapping a row walks through the common cases: not recorded → present → lesson → not recorded. */
function nextOnTap(mark: BoardMark | undefined): BoardMark | undefined {
  if (!mark) return { status: "present", note: null };
  if (mark.status === "present") return { status: "lesson", note: null };
  return undefined;
}

const markLabel = (mark: BoardMark | undefined) =>
  !mark ? "Not recorded" : mark.status === "other" ? (mark.note ?? "Other") : MARK_STYLE[mark.status].label;

const PILL_CLASS: Record<RecordableStatus | "open", string> = {
  present: "border-primary bg-primary text-white",
  lesson: "border-foreground bg-foreground text-white",
  absent: "border-orange-600 bg-white text-orange-800",
  other: "border-slate-400 bg-slate-100 text-foreground",
  open: "border-dashed border-slate-400 bg-card text-muted-foreground",
};

export function AttendanceBoard({ day, athletes, initialMarks }: Props) {
  const [marks, setMarks] = useState<Marks>(initialMarks);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [confirmingFinish, setConfirmingFinish] = useState(false);
  /** Athletes marked absent by the last "finish", so it can be undone. */
  const [undoIds, setUndoIds] = useState<number[]>([]);

  const unrecorded = athletes.filter((athlete) => !marks[athlete.id]);
  const count = (status: RecordableStatus) => athletes.filter((a) => marks[a.id]?.status === status).length;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? athletes.filter((a) => `${a.familyName} ${a.givenName} ${a.familyName}`.toLowerCase().includes(needle))
    : athletes;

  /** Applies a change at once, then saves it; puts the old marks back if saving fails. */
  function apply(changes: Marks, save: () => Promise<ActionResult<unknown>>, after?: (data: unknown) => void) {
    const previous = Object.fromEntries(Object.keys(changes).map((id) => [id, marks[Number(id)]]));
    setMarks((current) => ({ ...current, ...changes }));
    setConfirmingFinish(false);
    setUndoIds([]);
    startTransition(async () => {
      const result = await save();
      if (result.ok) {
        setSaveState({ kind: "saved" });
        after?.(result.data);
      } else {
        setMarks((current) => ({ ...current, ...previous }));
        setSaveState({ kind: "error", message: result.error });
      }
    });
  }

  function setMark(athleteId: number, next: BoardMark | undefined) {
    apply({ [athleteId]: next }, () =>
      saveMarkAction({ athleteId, day, status: next?.status ?? "cleared", note: next?.note ?? null }),
    );
  }

  function finish() {
    const athleteIds = unrecorded.map((athlete) => athlete.id);
    apply(
      Object.fromEntries(athleteIds.map((id) => [id, { status: "absent", note: null } as BoardMark])),
      () => markUnrecordedAbsentAction({ athleteIds, day }),
      (markedIds) => setUndoIds(markedIds as number[]),
    );
  }

  function undoFinish() {
    const athleteIds = undoIds;
    apply(Object.fromEntries(athleteIds.map((id) => [id, undefined])), () => clearMarksAction({ athleteIds, day }));
  }

  return (
    <>
      {athletes.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an athlete"
            aria-label="Find an athlete"
            className="h-11 pl-9"
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Tap a name once for present, twice for lesson. Use <Ellipsis className="inline size-4" aria-label="the menu" />{" "}
        for absent or another reason.
      </p>

      {/* Bottom padding keeps the last rows clear of the fixed summary bar. */}
      <ul className="flex flex-col gap-1.5 pb-32">
        {visible.map((athlete) => (
          <AthleteRow
            key={athlete.id}
            athlete={athlete}
            mark={marks[athlete.id]}
            expanded={expandedId === athlete.id}
            onToggleExpanded={() => setExpandedId(expandedId === athlete.id ? null : athlete.id)}
            onChange={(next) => {
              setExpandedId(null);
              setMark(athlete.id, next);
            }}
          />
        ))}
        {visible.length === 0 && <li className="py-6 text-center text-muted-foreground">No athlete matches “{query}”.</li>}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgb(20_33_61/0.06)]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold sm:text-base">
              {count("present") + count("lesson")} present · {count("lesson")} {count("lesson") === 1 ? "lesson" : "lessons"} ·{" "}
              {count("absent")} absent
            </p>
            <SaveStatus state={saveState} saving={isPending} unrecorded={unrecorded.length} />
          </div>

          {undoIds.length > 0 ? (
            <Button variant="outline" className="h-12 px-4" disabled={isPending} onClick={undoFinish}>
              Undo {undoIds.length} absent
            </Button>
          ) : confirmingFinish ? (
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 px-4" onClick={() => setConfirmingFinish(false)}>
                Cancel
              </Button>
              <Button className="h-12 px-4" disabled={isPending} onClick={finish}>
                Mark {unrecorded.length} absent
              </Button>
            </div>
          ) : (
            unrecorded.length > 0 && (
              <Button className="h-12 px-3.5 font-bold" disabled={isPending} onClick={() => setConfirmingFinish(true)}>
                Finish: {unrecorded.length} absent
              </Button>
            )
          )}
        </div>
      </div>
    </>
  );
}

function SaveStatus({ state, saving, unrecorded }: { state: SaveState; saving: boolean; unrecorded: number }) {
  if (state.kind === "error") {
    return (
      <p role="alert" className="text-sm font-medium text-red-700">
        Not saved: {state.message}
      </p>
    );
  }
  const progress = unrecorded === 0 ? "Everyone recorded" : `${unrecorded} not recorded yet`;
  return (
    <p role="status" className="text-sm text-muted-foreground">
      {progress}
      {saving ? " · Saving…" : state.kind === "saved" ? " · Saved" : ""}
    </p>
  );
}

type RowProps = {
  athlete: RosterAthlete;
  mark: BoardMark | undefined;
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (next: BoardMark | undefined) => void;
};

function AthleteRow({ athlete, mark, expanded, onToggleExpanded, onChange }: RowProps) {
  const name = `${athlete.familyName} ${athlete.givenName}`;
  const details = [athlete.clubCode, athlete.coachLabel && `Coach ${athlete.coachLabel}`].filter(Boolean).join(" · ");
  const label = markLabel(mark);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        mark?.status === "absent" && "border-orange-300 bg-orange-50",
        (mark?.status === "present" || mark?.status === "lesson") && "border-blue-200",
      )}
    >
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => onChange(nextOnTap(mark))}
          aria-label={`${name}: ${label}. Tap to change.`}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-1 pl-3.5 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">
              {athlete.familyName} <span className="font-normal">{athlete.givenName}</span>
            </span>
            {details && <span className="block truncate text-xs text-muted-foreground">{details}</span>}
          </span>
          <span
            className={cn(
              "inline-flex h-9 max-w-32 min-w-23 items-center justify-center truncate rounded-full border px-3 text-sm font-bold",
              PILL_CLASS[mark?.status ?? "open"],
            )}
          >
            {mark ? label : "Tap"}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-label={`More options for ${name}`}
          className="flex w-12 items-center justify-center text-muted-foreground outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
        >
          <Ellipsis className="size-5" />
        </button>
      </div>

      {expanded && <MoreOptions mark={mark} onChange={onChange} />}
    </li>
  );
}

function MoreOptions({ mark, onChange }: Pick<RowProps, "mark" | "onChange">) {
  const customNote = mark?.status === "other" && !OTHER_REASONS.includes(mark.note as never) ? (mark.note ?? "") : "";
  const optionClass = "h-11 px-4";

  return (
    <div className="flex flex-col gap-2 border-t bg-card p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className={cn(optionClass, "border-orange-600 text-orange-800")}
          onClick={() => onChange({ status: "absent", note: null })}
        >
          Absent
        </Button>
        {OTHER_REASONS.map((reason) => (
          <Button key={reason} variant="outline" className={optionClass} onClick={() => onChange({ status: "other", note: reason })}>
            {reason}
          </Button>
        ))}
        {mark && (
          <Button variant="ghost" className={optionClass} onClick={() => onChange(undefined)}>
            Clear
          </Button>
        )}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const note = String(new FormData(event.currentTarget).get("note") ?? "").trim();
          if (note) onChange({ status: "other", note });
        }}
      >
        <Input name="note" defaultValue={customNote} maxLength={60} placeholder="Other reason, e.g. the venue" aria-label="Other reason" className="h-11" />
        <Button type="submit" variant="outline" className={optionClass}>
          Save
        </Button>
      </form>
    </div>
  );
}
