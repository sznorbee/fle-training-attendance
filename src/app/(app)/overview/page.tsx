import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkCell } from "@/components/mark-cell";
import { PageSkeleton } from "@/components/page-skeleton";
import { RosterFilters } from "@/components/roster-filters";
import { Card } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { canRecordAttendance } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";
import { formatDay, monthDays, seasonMonths, seasonStartYear, today } from "@/lib/dates";
import { firstValue, idParam, type RawSearchParams } from "@/lib/search-params";
import { formatRate, summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { getMarks, type DayMark } from "@/server/attendance";
import { listAthletes, listClubs, listSquads } from "@/server/roster";

export const metadata: Metadata = { title: "Overview" };

type Props = { searchParams: Promise<RawSearchParams> };

const TOTAL_COLUMNS = [
  { title: "+", hint: "Trainings attended" },
  { title: "−", hint: "Absences" },
  { title: "%", hint: "Attendance rate over recorded days" },
  { title: "L", hint: "Lessons" },
];

const isWeekend = (day: string) => ["Sat", "Sun"].includes(formatDay(day, { weekday: "short" }));

async function Overview({ searchParams }: Props) {
  const viewer = await requireViewer();
  if (!canRecordAttendance(viewer)) redirect("/");

  const params = await searchParams;
  const months = seasonMonths(seasonStartYear());
  const month =
    months.find((m) => m.key === firstValue(params.month)) ??
    months.find((m) => today().startsWith(m.key)) ??
    months[0];
  const squadId = idParam(params.squad);
  const clubId = viewer.role === "federation" ? idParam(params.club) : undefined;

  const days = monthDays(month.year, month.month);
  const [athletes, squads, clubs] = await Promise.all([
    listAthletes(viewer, { squadId, clubId }),
    listSquads(),
    viewer.role === "federation" ? listClubs() : undefined,
  ]);
  const marks = await getMarks(athletes.map((athlete) => athlete.id), days[0], days.at(-1)!);
  const marksByAthlete = Map.groupBy(marks, (mark) => mark.athleteId);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground">{month.label}</p>
        </div>
        <RosterFilters action="/overview" squads={squads} clubs={clubs} squadId={squadId} clubId={clubId}>
          <NativeSelect name="month" defaultValue={month.key} aria-label="Month" className="w-auto">
            {months.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </NativeSelect>
        </RosterFilters>
      </div>

      <Card className="overflow-x-auto py-0">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="sticky left-0 z-10 border-b bg-card px-4 py-2 text-left font-medium">Athlete</th>
              {TOTAL_COLUMNS.map((column) => (
                <th key={column.title} className="border-b px-1.5 py-2 text-right font-medium" title={column.hint}>
                  <abbr title={column.hint} className="no-underline">
                    {column.title}
                  </abbr>
                </th>
              ))}
              {days.map((day) => (
                <th key={day} className={cn("border-b px-px py-2 font-medium", isWeekend(day) && "bg-muted")}>
                  <Link href={`/attendance?date=${day}`} className="block min-w-6 py-1 hover:text-primary" title="Record this day">
                    <span className="block">{Number(day.slice(8))}</span>
                    <span className="block font-normal">{formatDay(day, { weekday: "narrow" })}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {athletes.map((athlete) => {
              const athleteMarks = marksByAthlete.get(athlete.id) ?? [];
              const markByDay = new Map<string, DayMark>(athleteMarks.map((mark) => [mark.day, mark]));
              const summary = summarize(athleteMarks.map((mark) => mark.status));
              return (
                <tr key={athlete.id} className="hover:bg-muted/40">
                  <th className="sticky left-0 z-10 max-w-36 border-b bg-card py-1.5 pr-2 pl-4 text-left font-normal sm:max-w-none sm:whitespace-nowrap">
                    <Link href={`/athletes/${athlete.id}`} className="block truncate py-1.5 hover:underline sm:inline">
                      <span className="font-medium">{athlete.familyName}</span> {athlete.givenName}
                    </Link>
                    <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">{athlete.clubCode}</span>
                  </th>
                  <td className="border-b px-1.5 text-right tabular-nums">{summary.present}</td>
                  <td className="border-b px-1.5 text-right tabular-nums">{summary.absent}</td>
                  <td className="border-b px-1.5 text-right tabular-nums">{formatRate(summary.rate)}</td>
                  <td className="border-b px-1.5 pr-3 text-right tabular-nums">{summary.lessons}</td>
                  {days.map((day) => (
                    <td key={day} className={cn("border-b px-px py-1 text-center", isWeekend(day) && "bg-muted/60")}>
                      <MarkCell mark={markByDay.get(day)} className="size-5 text-[11px]" />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {athletes.length === 0 && <p className="px-4 py-6 text-muted-foreground">No athletes to show.</p>}
      </Card>
      <p className="text-xs text-muted-foreground">
        + attended · − absent · % rate over recorded days · L lessons. In the grid: 0 = absent, 1 = present, 2 = present with
        lesson, ✱ = other. Select a day number to record that day.
      </p>
    </>
  );
}

export default function OverviewPage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Overview {...props} />
    </Suspense>
  );
}
