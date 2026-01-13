"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const name = formData.get("name") as string;

  // Validation
  if (!name || name.trim().length === 0) {
    return {
      error: "Project name is required",
    };
  }

  if (name.length > 140) {
    return {
      error: "Project name must be 140 characters or less",
    };
  }

  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "You must be logged in to create a project",
    };
  }

  // Insert project
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: name.trim(),
      owner_id: user.id,
      status: "draft",
      active_phase: "setup",
      progress_pct: 0,
      meta: {},
    })
    .select()
    .single();

  if (error) {
    return {
      error: error.message || "Failed to create project",
    };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/projects/${data.id}`);
}
