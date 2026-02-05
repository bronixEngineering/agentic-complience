import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
      <p className="text-muted-foreground">
        Welcome back{user?.email ? `, ${user.email}` : ""}.
      </p>
    </div>
  );
}
