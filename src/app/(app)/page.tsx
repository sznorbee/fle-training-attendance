import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageSkeleton } from "@/components/page-skeleton";
import { canRecordAttendance } from "@/lib/auth/permissions";
import { requireViewer } from "@/lib/auth/session";

async function Home() {
  const viewer = await requireViewer();
  if (canRecordAttendance(viewer)) redirect("/attendance");
  if (viewer.athleteId) redirect(`/athletes/${viewer.athleteId}`);
  return <p className="text-muted-foreground">Your account is not linked to an athlete yet. Please contact your federation.</p>;
}

export default function HomePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Home />
    </Suspense>
  );
}
