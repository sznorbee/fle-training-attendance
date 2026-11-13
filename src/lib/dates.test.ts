import { describe, expect, it } from "vitest";
import { clampToSeason, isInSeason, isoWeekNumber, season, weekOf } from "./dates";

describe("weeks", () => {
  it("returns Monday to Sunday around a day", () => {
    expect(weekOf("2026-11-10")).toEqual([
      "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15",
    ]);
    expect(weekOf("2026-11-15")[0]).toBe("2026-11-09"); // Sunday belongs to the week that started Monday
    expect(weekOf("2027-01-01")[0]).toBe("2026-12-28"); // across a year boundary
  });

  it("numbers weeks the ISO way", () => {
    expect(isoWeekNumber("2026-11-10")).toBe(46);
    expect(isoWeekNumber("2027-01-01")).toBe(53);
    expect(isoWeekNumber("2027-01-04")).toBe(1);
  });
});

describe("season", () => {
  const s = season(2026);

  it("runs from 1 September to 31 July", () => {
    expect(s).toEqual({ first: "2026-09-01", last: "2027-07-31", label: "2026/2027" });
  });

  it("knows which days belong to it", () => {
    expect(isInSeason("2026-09-01", s)).toBe(true);
    expect(isInSeason("2027-08-01", s)).toBe(false);
    expect(clampToSeason("2026-08-15", s)).toBe("2026-09-01");
    expect(clampToSeason("2027-08-15", s)).toBe("2027-07-31");
    expect(clampToSeason("2026-12-24", s)).toBe("2026-12-24");
  });
});
