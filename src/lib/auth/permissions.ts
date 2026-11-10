import type { Role } from "@/db/schema";

/** The signed-in person, as far as authorisation is concerned. */
export type Viewer = {
  email: string;
  name: string | null;
  role: Role;
  clubId: number | null;
  athleteId: number | null;
};

type AthleteRef = { id: number; clubId: number | null };

/** Which athletes a viewer may see. */
export type AthleteScope =
  | { kind: "all" }
  | { kind: "club"; clubId: number }
  | { kind: "athlete"; athleteId: number }
  | { kind: "none" };

export function athleteScope(viewer: Viewer): AthleteScope {
  switch (viewer.role) {
    case "federation":
      return { kind: "all" };
    case "coach":
      return viewer.clubId === null ? { kind: "none" } : { kind: "club", clubId: viewer.clubId };
    case "athlete":
      return viewer.athleteId === null
        ? { kind: "none" }
        : { kind: "athlete", athleteId: viewer.athleteId };
  }
}

export function canViewAthlete(viewer: Viewer, athlete: AthleteRef): boolean {
  const scope = athleteScope(viewer);
  switch (scope.kind) {
    case "all":
      return true;
    case "club":
      return athlete.clubId === scope.clubId;
    case "athlete":
      return athlete.id === scope.athleteId;
    case "none":
      return false;
  }
}

/** Coaches record attendance for their own club; the federation for everyone. */
export function canEditAthlete(viewer: Viewer, athlete: AthleteRef): boolean {
  if (viewer.role === "federation") return true;
  return viewer.role === "coach" && viewer.clubId !== null && athlete.clubId === viewer.clubId;
}

export const canRecordAttendance = (viewer: Viewer) => viewer.role !== "athlete";

/** Importing the file, managing members and running the sheet sync. */
export const canAdminister = (viewer: Viewer) => viewer.role === "federation";
