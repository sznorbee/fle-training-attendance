import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { canAdminister, canRecordAttendance, type Viewer } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";

const ROLE_LABEL: Record<Viewer["role"], string> = {
  federation: "Federation",
  coach: "Coach",
  athlete: "Athlete",
};

function navLinks(viewer: Viewer): Array<{ href: string; label: string }> {
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
      <nav className="flex items-center gap-1">
        {navLinks(viewer).map((link) => (
          <Button key={link.href} asChild variant="ghost" size="sm" className="px-2.5 text-sm">
            <Link href={link.href}>{link.label}</Link>
          </Button>
        ))}
      </nav>
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <span className="hidden truncate text-sm text-muted-foreground md:inline">{viewer.name ?? viewer.email}</span>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {ROLE_LABEL[viewer.role]}
        </Badge>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out" title="Sign out">
            <LogOut />
          </Button>
        </form>
      </div>
    </>
  );
}
