"use client";

import { LogOut, Menu } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type Account = { name: string | null; email: string; role: string; club: string };

/** The signed-in person's details and the sign-out button, in a side sheet. */
export function AccountSheet({ account }: { account: Account }) {
  const details = [
    { label: "Name", value: account.name ?? "Not set" },
    { label: "E-mail", value: account.email },
    { label: "Club", value: account.club },
    { label: "Role", value: account.role },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" className="h-11 min-w-11 gap-2 px-2.5 sm:h-9" aria-label="Open settings">
          {/* Wider screens also show who is signed in; phones show the menu icon only. */}
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground md:inline">
            {account.name ?? account.email}
          </span>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {account.role}
          </Badge>
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Your account in this app.</SheetDescription>
        </SheetHeader>

        <dl className="flex flex-col divide-y border-y">
          {details.map((detail) => (
            <div key={detail.label} className="flex flex-col gap-0.5 py-3">
              <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
              <dd className="font-medium break-words">{detail.value}</dd>
            </div>
          ))}
        </dl>

        <form action={signOutAction} className="mt-auto">
          <Button type="submit" variant="outline" className="h-11 w-full">
            <LogOut />
            Log out
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
