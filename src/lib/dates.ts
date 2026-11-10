/** Calendar helpers working on plain `YYYY-MM-DD` strings (no time zones). */

export type IsoDate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function isoDate(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + delta));
  return isoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Today's date in the federation's time zone. */
export function today(timeZone = process.env.APP_TIME_ZONE ?? "Europe/Luxembourg"): IsoDate {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function formatDay(date: IsoDate, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export type SeasonMonth = { year: number; month: number; key: string; label: string };

/** A season runs from September of `startYear` to July of the following year. */
export function seasonMonths(startYear: number): SeasonMonth[] {
  const months = [9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7];
  return months.map((month) => {
    const year = yearOfSeasonMonth(startYear, month);
    return {
      year,
      month,
      key: `${year}-${pad(month)}`,
      label: formatDay(isoDate(year, month, 1), { month: "long", year: "numeric" }),
    };
  });
}

export function yearOfSeasonMonth(startYear: number, month: number): number {
  return month >= 8 ? startYear : startYear + 1;
}

export function seasonStartYear(): number {
  const fromEnv = Number(process.env.SEASON_START_YEAR);
  if (Number.isInteger(fromEnv) && fromEnv > 2000) return fromEnv;
  const [y, m] = today().split("-").map(Number);
  return m >= 8 ? y : y - 1;
}

export function monthDays(year: number, month: number): IsoDate[] {
  return Array.from({ length: daysInMonth(year, month) }, (_, i) => isoDate(year, month, i + 1));
}
