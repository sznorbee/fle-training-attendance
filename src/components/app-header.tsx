import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { NavLinks, type NavLink } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { canAdminister, canRecordAttendance, type Viewer } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";

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
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="hidden truncate text-sm text-muted-foreground md:inline">{viewer.name ?? viewer.email}</span>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {ROLE_LABEL[viewer.role]}
        </Badge>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Sign out" title="Sign out">
            <LogOut />
          </Button>
        </form>
      </div>
    </>
  );
}
