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
      created_by: user.id,
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

export async function updateProjectBrief(projectId: string, formData: FormData) {
  const briefMode = ((formData.get("briefMode") as string | null) ?? "form").trim();

  // Plain text path
  if (briefMode === "plain") {
    const aspectRatio = ((formData.get("aspectRatio") as string | null) ?? "16:9").trim();
    const raw = ((formData.get("rawBrief") as string | null) ?? "").trim();
    if (!raw) {
      return { error: "Brief text is required" };
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be logged in" };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("projects")
      .select("meta")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .single();

    if (fetchError || !existing) {
      return { error: "Project not found or you don't have access" };
    }

    const currentMeta = (existing.meta as Record<string, unknown>) || {};
    const newMeta = {
      ...currentMeta,
      brief: {
        mode: "plain",
        raw,
        aspectRatio,
      },
    };

    const { error: updateError } = await supabase
      .from("projects")
      .update({ meta: newMeta })
      .eq("id", projectId)
      .eq("owner_id", user.id);

    if (updateError) {
      return { error: updateError.message || "Failed to save brief" };
    }

    revalidatePath(`/dashboard/projects/${projectId}`);
    return { success: true };
  }

  const background = (formData.get("background") as string | null) ?? "";
  const objective = (formData.get("objective") as string | null) ?? "";
  const targetAudience = (formData.get("targetAudience") as string | null) ?? "";
  const insights = (formData.get("insights") as string | null) ?? "";
  const brandVoiceTone = (formData.get("brandVoiceTone") as string | null) ?? "";
  const keyMessage = (formData.get("keyMessage") as string | null) ?? "";
  const deliverables = (formData.get("deliverables") as string | null) ?? "";
  const mandatories = (formData.get("mandatories") as string | null) ?? "";
  const competitors = (formData.get("competitors") as string | null) ?? "";
  const budget = (formData.get("budget") as string | null) ?? "";

  const platforms = (formData.getAll("platforms") as string[]).filter(Boolean);
  const platformOther = ((formData.get("platformOther") as string | null) ?? "").trim();

  if (objective.trim().length === 0) {
    return { error: "Objective is required" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in" };
  }

  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("meta")
    .eq("id", projectId)
    .eq("owner_id", user.id)
    .single();

  if (fetchError || !existing) {
    return { error: "Project not found or you don't have access" };
  }

  const currentMeta = (existing.meta as Record<string, unknown>) || {};
  const newMeta = {
    ...currentMeta,
    brief: {
      mode: "form",
      background: background.trim() || undefined,
      objective: objective.trim(),
      targetAudience: targetAudience.trim() || undefined,
      insights: insights.trim() || undefined,
      brandVoiceTone: brandVoiceTone.trim() || undefined,
      keyMessage: keyMessage.trim() || undefined,
      deliverables: deliverables.trim() || undefined,
      mandatories: mandatories.trim() || undefined,
      competitors: competitors.trim() || undefined,
      budget: budget.trim() || undefined,
      channels: {
        platforms,
        other: platforms.includes("Other") ? platformOther || undefined : undefined,
      },
    },
  };

  const { error: updateError } = await supabase
    .from("projects")
    .update({ meta: newMeta })
    .eq("id", projectId)
    .eq("owner_id", user.id);

  if (updateError) {
    return { error: updateError.message || "Failed to save brief" };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);
  return { success: true };
}
