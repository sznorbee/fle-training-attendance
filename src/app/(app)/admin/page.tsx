import { Suspense } from "react";
import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/page-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth/session";
import { listMembers } from "@/server/members";
import { listAthletes, listClubs } from "@/server/roster";
import { countPendingMarks, getLastSyncRun, isSheetSyncConfigured } from "@/server/sync";
import { removeMemberAction } from "./actions";
import { ImportForm, MemberForm, SyncForm } from "./admin-forms";

export const metadata: Metadata = { title: "Admin" };

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Luxembourg" }).format(date);

async function Admin() {
  const viewer = await requireAdmin();
  const [members, clubs, athletes, pending, lastRun] = await Promise.all([
    listMembers(),
    listClubs(),
    listAthletes(viewer),
    countPendingMarks(),
    getLastSyncRun(),
  ]);
  const syncConfigured = isSheetSyncConfigured();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>

      <Card>
        <CardHeader>
          <CardTitle>Import the attendance file</CardTitle>
          <CardDescription>
            Upload the federation&apos;s .xlsx file to load squads, athletes and the marks recorded so far. You can
            import again at any time: marks recorded in this app are never overwritten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shared sheet sync</CardTitle>
          <CardDescription>
            Once a day, marks recorded here are written into the shared Google Sheet. Only those cells are changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>
            <strong>{pending}</strong> {pending === 1 ? "mark is" : "marks are"} waiting to be written.
            {lastRun?.finishedAt && (
              <span className="text-muted-foreground">
                {" "}
                Last run {formatDateTime(lastRun.finishedAt)}: {lastRun.message}
              </span>
            )}
          </p>
          {!syncConfigured && (
            <p className="text-muted-foreground">
              The sync is not configured yet. Set the GOOGLE_* environment variables described in the README.
            </p>
          )}
          <SyncForm disabled={!syncConfigured} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People and access</CardTitle>
          <CardDescription>
            Access is granted by e-mail address: the person signs up with that address and gets the role below. Coaches
            record attendance for their club, athletes see their own record, the federation sees and edits everything.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <MemberForm clubs={clubs} athletes={athletes} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Athlete</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.clubCode}</TableCell>
                  <TableCell>
                    {member.athleteFamilyName} {member.athleteGivenName}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={removeMemberAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <Button type="submit" variant="ghost" size="icon" aria-label={`Remove ${member.email}`}>
                        <Trash2 />
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {members.length === 0 && <p className="text-sm text-muted-foreground">Nobody has been given access yet.</p>}
        </CardContent>
      </Card>
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Admin />
    </Suspense>
  );
}
