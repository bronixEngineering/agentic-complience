import { redirect } from "next/navigation";

import { DashboardHeader } from "./DashboardHeader";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Compliance AI</h1>
          <DashboardHeader />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
