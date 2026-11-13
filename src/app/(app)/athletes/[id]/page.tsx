import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkCell } from "@/components/mark-cell";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/lib/auth/session";
import { monthDays, season, seasonMonths, seasonStartYear, today } from "@/lib/dates";
import { formatRate, summarize } from "@/lib/stats";
import { getMarks } from "@/server/attendance";
import { getAthlete } from "@/server/roster";

export const metadata: Metadata = { title: "Athlete" };

type Props = { params: Promise<{ id: string }> };

async function AthleteDetails({ params }: Props) {
  const viewer = await requireViewer();
  // Not-found (rather than forbidden) so other athletes' ids reveal nothing.
  const athlete = await getAthlete(viewer, Number((await params).id));
  if (!athlete) notFound();

  const currentSeason = season(seasonStartYear());
  const marks = await getMarks([athlete.id], currentSeason.first, currentSeason.last);
  // Months still to come are left out until something is recorded in them.
  const thisMonth = today().slice(0, 7);
  const months = seasonMonths(seasonStartYear()).filter(
    (month) => month.key <= thisMonth || marks.some((mark) => mark.day.startsWith(month.key)),
  );
  const markByDay = new Map(marks.map((mark) => [mark.day, mark]));
  const seasonSummary = summarize(marks.map((mark) => mark.status));

  const stats = [
    { label: "Trainings attended", value: seasonSummary.present },
    { label: "Absences", value: seasonSummary.absent },
    { label: "Attendance rate", value: formatRate(seasonSummary.rate), hint: "of recorded days" },
    { label: "Lessons", value: seasonSummary.lessons },
  ];

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {athlete.givenName} {athlete.familyName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {athlete.clubCode && <Badge variant="outline">{athlete.clubCode}</Badge>}
          <span>{athlete.squadName}</span>
          {athlete.coachLabel && <span>· Coach: {athlete.coachLabel}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-1 py-4">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
              {"hint" in stat && <p className="text-xs text-muted-foreground">{stat.hint}</p>}
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Season {currentSeason.label}</CardTitle>
          <CardDescription>0 = absent · 1 = present · 2 = present with lesson · ✱ = other</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {months.map((month) => {
              const monthMarks = marks.filter((mark) => mark.day.startsWith(month.key));
              const summary = summarize(monthMarks.map((mark) => mark.status));
              return (
                <li key={month.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-medium">{month.label}</h3>
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {summary.present} attended · {summary.absent} absent · {formatRate(summary.rate)} · {summary.lessons}{" "}
                      {summary.lessons === 1 ? "lesson" : "lessons"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {monthDays(month.year, month.month).map((day) => (
                      <MarkCell key={day} mark={markByDay.get(day)} className="size-5 bg-muted/60 text-[10px]" />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          {months.length === 0 && <p className="text-sm text-muted-foreground">The season has not started yet.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function AthletePage(props: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AthleteDetails {...props} />
    </Suspense>
  );
}
