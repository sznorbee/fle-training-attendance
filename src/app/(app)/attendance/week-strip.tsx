import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDay, isInSeason, isoWeekNumber, weekOf, type IsoDate, type Season } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Props = {
  day: IsoDate;
  today: IsoDate;
  season: Season;
  /** Days of the shown week that already have marks. */
  recordedDays: Set<IsoDate>;
  /** Short context shown next to the week number, e.g. the club. */
  context?: string;
  hrefFor: (day: IsoDate) => string;
};

const arrowClass =
  "inline-flex size-11 items-center justify-center rounded-xl border border-input bg-card outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Week-at-a-glance day picker: one tap to switch day, a dot where marks exist. */
export function WeekStrip({ day, today, season, recordedDays, context, hrefFor }: Props) {
  const week = weekOf(day);
  const previousWeek = addDays(day, -7);
  const nextWeek = addDays(day, 7);

  return (
    <section aria-label="Choose a day" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isInSeason(previousWeek, season) ? (
          <Link href={hrefFor(previousWeek)} aria-label="Previous week" className={arrowClass}>
            <ChevronLeft className="size-5" />
          </Link>
        ) : (
          <span className={cn(arrowClass, "opacity-40")} aria-hidden>
            <ChevronLeft className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-lg leading-tight font-bold">{formatDay(day, { month: "long", year: "numeric" })}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[context, `week ${isoWeekNumber(day)}`].filter(Boolean).join(" · ")}
            {day !== today && isInSeason(today, season) && (
              <>
                {" · "}
                <Link href={hrefFor(today)} className="font-medium text-primary underline-offset-4 hover:underline">
                  Go to today
                </Link>
              </>
            )}
          </p>
        </div>
        {isInSeason(nextWeek, season) ? (
          <Link href={hrefFor(nextWeek)} aria-label="Next week" className={arrowClass}>
            <ChevronRight className="size-5" />
          </Link>
        ) : (
          <span className={cn(arrowClass, "opacity-40")} aria-hidden>
            <ChevronRight className="size-5" />
          </span>
        )}
      </div>

      <ol className="flex gap-1.5">
        {week.map((date) => {
          const selected = date === day;
          const recorded = recordedDays.has(date);
          const content = (
            <>
              <span className="text-[11px] font-semibold uppercase">{formatDay(date, { weekday: "short" })}</span>
              <span className="text-lg leading-none font-bold">{Number(date.slice(8))}</span>
              <span
                aria-hidden
                className={cn("size-1.5 rounded-full", recorded ? (selected ? "bg-white" : "bg-primary") : "bg-transparent")}
              />
            </>
          );
          const boxClass = "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border";
          return (
            <li key={date} className="min-w-0 flex-1">
              {isInSeason(date, season) ? (
                <Link
                  href={hrefFor(date)}
                  aria-current={selected ? "date" : undefined}
                  aria-label={`${formatDay(date, { weekday: "long", day: "numeric", month: "long" })}${recorded ? ", has marks" : ""}${date === today ? ", today" : ""}`}
                  className={cn(
                    boxClass,
                    "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    selected
                      ? "border-foreground bg-foreground text-white"
                      : cn("bg-card hover:bg-accent", date === today ? "border-primary" : "border-input"),
                  )}
                >
                  {content}
                </Link>
              ) : (
                <span className={cn(boxClass, "border-transparent text-muted-foreground opacity-50")}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
