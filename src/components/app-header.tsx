import { AccountSheet } from "@/components/account-sheet";
import { NavLinks, type NavLink } from "@/components/nav-links";
import { canAdminister, canRecordAttendance, type Viewer } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";
import { getClubCode } from "@/server/roster";

const ROLE_LABEL: Record<Viewer["role"], string> = {
  federation: "Federation",
  coach: "Coach",
  athlete: "Athlete",
};

function navLinks(viewer: Viewer): NavLink[] {
  if (!canRecordAttendance(viewer)) {
    return viewer.athleteId ? [{ href: `/athletes/${viewer.athleteId}`, label: "My attendance" }] : [];
  }
  return [
    { href: "/attendance", label: "Attendance" },
    { href: "/overview", label: "Overview" },
    ...(canAdminister(viewer) ? [{ href: "/admin", label: "Admin" }] : []),
  ];
}

export async function AppHeader() {
  const viewer = await requireViewer();
  return (
    <>
      <NavLinks links={navLinks(viewer)} />
      <div className="ml-auto flex min-w-0 items-center">
        <AccountSheet
          account={{
            name: viewer.name,
            email: viewer.email,
            role: ROLE_LABEL[viewer.role],
            club: (await getClubCode(viewer)) ?? (viewer.role === "federation" ? "All clubs" : "Not set"),
          }}
        />
      </div>
    </>
  );
}
