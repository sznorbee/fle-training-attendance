import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarkCell } from "@/components/mark-cell";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireViewer } from "@/lib/auth/session";
import { monthDays, seasonMonths, seasonStartYear } from "@/lib/dates";
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

  const months = seasonMonths(seasonStartYear());
  const firstDay = `${months[0].key}-01`;
  const lastDay = monthDays(months.at(-1)!.year, months.at(-1)!.month).at(-1)!;
  const marks = await getMarks([athlete.id], firstDay, lastDay);
  const markByDay = new Map(marks.map((mark) => [mark.day, mark]));
  const season = summarize(marks.map((mark) => mark.status));

  const stats = [
    { label: "Trainings attended", value: season.present },
    { label: "Absences", value: season.absent },
    { label: "Attendance rate", value: formatRate(season.rate) },
    { label: "Lessons", value: season.lessons },
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
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Season {months[0].year}/{months.at(-1)!.year}
          </CardTitle>
          <CardDescription>0 = absent · 1 = present · 2 = present with lesson · ✱ = other</CardDescription>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Days</TableHead>
                <TableHead className="text-right">+</TableHead>
                <TableHead className="text-right">−</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead className="text-right">Lessons</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((month) => {
                const monthMarks = marks.filter((mark) => mark.day.startsWith(month.key));
                const summary = summarize(monthMarks.map((mark) => mark.status));
                return (
                  <TableRow key={month.key}>
                    <TableCell className="font-medium">{month.label}</TableCell>
                    <TableCell>
                      <div className="flex gap-px">
                        {monthDays(month.year, month.month).map((day) => (
                          <MarkCell key={day} mark={markByDay.get(day)} className="size-5 bg-muted/50 text-[10px]" />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{summary.present}</TableCell>
                    <TableCell className="text-right tabular-nums">{summary.absent}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatRate(summary.rate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{summary.lessons}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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
