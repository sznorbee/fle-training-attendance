import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageSkeleton } from "@/components/page-skeleton";
import { RosterFilters } from "@/components/roster-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canRecordAttendance } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";
import { addDays, formatDay, isIsoDate, today } from "@/lib/dates";
import { firstValue, idParam, type RawSearchParams } from "@/lib/search-params";
import { getMarks } from "@/server/attendance";
import { listAthletes, listClubs, listSquads } from "@/server/roster";
import { AttendanceBoard, type BoardMark } from "./attendance-board";

export const metadata: Metadata = { title: "Attendance" };

type Props = { searchParams: Promise<RawSearchParams> };

async function Attendance({ searchParams }: Props) {
  const viewer = await requireViewer();
  if (!canRecordAttendance(viewer)) redirect("/");

  const params = await searchParams;
  const requestedDay = firstValue(params.date);
  const day = isIsoDate(requestedDay) ? requestedDay : today();
  const squadId = idParam(params.squad);
  const clubId = viewer.role === "federation" ? idParam(params.club) : undefined;

  const [athletes, squads, clubs] = await Promise.all([
    listAthletes(viewer, { squadId, clubId }),
    listSquads(),
    viewer.role === "federation" ? listClubs() : undefined,
  ]);
  const marks = await getMarks(athletes.map((athlete) => athlete.id), day, day);
  const initialMarks = Object.fromEntries(
    marks.map((mark) => [mark.athleteId, { status: mark.status, note: mark.note } as BoardMark]),
  );

  const dayHref = (date: string) => {
    const query = new URLSearchParams({ date });
    if (squadId) query.set("squad", String(squadId));
    if (clubId) query.set("club", String(clubId));
    return `/attendance?${query}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            {formatDay(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <RosterFilters action="/attendance" squads={squads} clubs={clubs} squadId={squadId} clubId={clubId}>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="icon" aria-label="Previous day">
              <Link href={dayHref(addDays(day, -1))}>
                <ChevronLeft />
              </Link>
            </Button>
            <Input type="date" name="date" defaultValue={day} aria-label="Date" className="w-auto" />
            <Button asChild variant="outline" size="icon" aria-label="Next day">
              <Link href={dayHref(addDays(day, 1))}>
                <ChevronRight />
              </Link>
            </Button>
          </div>
        </RosterFilters>
      </div>

      {athletes.length === 0 ? (
        <p className="text-muted-foreground">No athletes to show. Import the attendance file from the Admin page first.</p>
      ) : (
        // The key resets the board's local state when the day or filters change.
        <AttendanceBoard key={dayHref(day)} day={day} athletes={athletes} initialMarks={initialMarks} />
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
