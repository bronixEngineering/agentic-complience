"use client";

import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function DashboardHeader() {
  return (
    <Button type="button" variant="outline" onClick={() => signOut()}>
      Sign out
    </Button>
  );
}
