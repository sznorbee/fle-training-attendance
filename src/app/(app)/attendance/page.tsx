import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/page-skeleton";
import { RosterFilters } from "@/components/roster-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { canRecordAttendance } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";
import { clampToSeason, formatDay, isInSeason, isIsoDate, season, seasonStartYear, today, weekOf } from "@/lib/dates";
import { firstValue, idParam, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { getMarks, getRecordedDays } from "@/server/attendance";
import { listAthletes, listClubs, listSquads } from "@/server/roster";
import { AttendanceBoard, type BoardMark } from "./attendance-board";
import { WeekStrip } from "./week-strip";

export const metadata: Metadata = { title: "Attendance" };

type Props = { searchParams: Promise<RawSearchParams> };

const byName = new Intl.Collator("fr", { sensitivity: "base" });

async function Attendance({ searchParams }: Props) {
  const viewer = await requireViewer();
  if (!canRecordAttendance(viewer)) redirect("/");

  const params = await searchParams;
  const currentSeason = season(seasonStartYear());
  const now = today();
  const requestedDay = firstValue(params.date);
  const day = isIsoDate(requestedDay) ? requestedDay : clampToSeason(now, currentSeason);
  const squadId = idParam(params.squad);
  const clubId = viewer.role === "federation" ? idParam(params.club) : undefined;

  const [clubAthletes, squads, clubs] = await Promise.all([
    listAthletes(viewer, { clubId }),
    listSquads(),
    viewer.role === "federation" ? listClubs() : undefined,
  ]);
  // Alphabetical, so a name is found where one expects it.
  const athletes = clubAthletes
    .filter((athlete) => squadId === undefined || athlete.squadId === squadId)
    .sort((a, b) => byName.compare(`${a.familyName} ${a.givenName}`, `${b.familyName} ${b.givenName}`));
  const athleteIds = athletes.map((athlete) => athlete.id);
  const week = weekOf(day);
  const [marks, recordedDays] = await Promise.all([
    getMarks(athleteIds, day, day),
    getRecordedDays(athleteIds, week[0], week[6]),
  ]);
  const initialMarks = Object.fromEntries(
    marks.map((mark) => [mark.athleteId, { status: mark.status, note: mark.note } as BoardMark]),
  );

  const href = (date: string, squad = squadId) => {
    const query = new URLSearchParams({ date });
    if (squad) query.set("squad", String(squad));
    if (clubId) query.set("club", String(clubId));
    return `/attendance?${query}`;
  };
  const clubLabel = clubs?.find((club) => club.id === clubId)?.code ?? athletes[0]?.clubCode ?? undefined;
  const squadChips = [
    { id: undefined, label: "All", count: clubAthletes.length },
    ...squads.map((squad) => ({
      id: squad.id,
      label: squad.name.replace(/^CADRE\s+/i, ""),
      count: clubAthletes.filter((athlete) => athlete.squadId === squad.id).length,
    })),
  ];

  return (
    <>
      <h1 className="sr-only">
        Attendance for {formatDay(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </h1>

      <WeekStrip
        day={day}
        today={now}
        season={currentSeason}
        recordedDays={recordedDays}
        context={viewer.role === "federation" ? (clubLabel ?? "All clubs") : clubLabel}
        hrefFor={(date) => href(date)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <nav aria-label="Squad" className="flex flex-wrap gap-2">
          {squadChips.map((chip) => (
            <Link
              key={chip.label}
              href={href(day, chip.id ?? 0)}
              aria-current={chip.id === squadId ? "true" : undefined}
              className={cn(
                "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium capitalize outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                chip.id === squadId ? "border-foreground bg-foreground text-white" : "border-input bg-card hover:bg-accent",
              )}
            >
              {chip.label.toLowerCase()} {chip.count}
            </Link>
          ))}
        </nav>
        <RosterFilters action="/attendance" clubs={clubs} clubId={clubId}>
          {squadId && <input type="hidden" name="squad" value={squadId} />}
          <Input
            type="date"
            name="date"
            defaultValue={day}
            min={currentSeason.first}
            max={currentSeason.last}
            aria-label="Jump to a date"
            className="h-11 w-auto"
          />
        </RosterFilters>
      </div>

      {!isInSeason(day, currentSeason) ? (
        <Card>
          <CardHeader>
            <CardTitle>This day is outside season {currentSeason.label}</CardTitle>
            <CardDescription>
              Attendance can be recorded from {formatDay(currentSeason.first, { day: "numeric", month: "long", year: "numeric" })}{" "}
              to {formatDay(currentSeason.last, { day: "numeric", month: "long", year: "numeric" })}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11">
              <Link href={href(clampToSeason(now, currentSeason))}>Go to the current day</Link>
            </Button>
          </CardContent>
        </Card>
      ) : athletes.length === 0 ? (
        <p className="text-muted-foreground">
          No athletes to show. {viewer.role === "federation" ? "Import the attendance file on the Admin page first." : "Ask your federation to import the attendance file."}
        </p>
      ) : (
        // The key resets the board's local state when the day or filters change.
        <AttendanceBoard key={href(day)} day={day} athletes={athletes} initialMarks={initialMarks} />
      )}
    </>
  );
}

export default function AttendancePage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Attendance {...props} />
    </Suspense>
  );
}
