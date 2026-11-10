import { describe, expect, it } from "vitest";
import { athleteScope, canAdminister, canEditAthlete, canViewAthlete, type Viewer } from "./permissions";

const base = { email: "x@example.test", name: null, clubId: null, athleteId: null };
const federation: Viewer = { ...base, role: "federation" };
const celCoach: Viewer = { ...base, role: "coach", clubId: 1 };
const athlete: Viewer = { ...base, role: "athlete", clubId: 1, athleteId: 10 };

const celAthlete = { id: 10, clubId: 1 };
const otherCelAthlete = { id: 11, clubId: 1 };
const esudAthlete = { id: 20, clubId: 2 };

describe("permissions", () => {
  it("lets the federation see and edit everyone", () => {
    expect(canEditAthlete(federation, esudAthlete)).toBe(true);
    expect(canViewAthlete(federation, celAthlete)).toBe(true);
    expect(canAdminister(federation)).toBe(true);
  });

  it("limits coaches to their own club", () => {
    expect(canEditAthlete(celCoach, celAthlete)).toBe(true);
    expect(canEditAthlete(celCoach, esudAthlete)).toBe(false);
    expect(canViewAthlete(celCoach, esudAthlete)).toBe(false);
    expect(canAdminister(celCoach)).toBe(false);
  });

  it("gives a coach without a club no access", () => {
    const orphan: Viewer = { ...base, role: "coach" };
    expect(athleteScope(orphan)).toEqual({ kind: "none" });
    expect(canEditAthlete(orphan, { id: 1, clubId: null })).toBe(false);
  });

  it("lets athletes only read their own record", () => {
    expect(canViewAthlete(athlete, celAthlete)).toBe(true);
    expect(canViewAthlete(athlete, otherCelAthlete)).toBe(false);
    expect(canEditAthlete(athlete, celAthlete)).toBe(false);
  });
});
