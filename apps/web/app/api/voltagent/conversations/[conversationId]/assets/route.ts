import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreativeAssetRow = {
  id: string;
  tool_name: string;
  tool_call_id: string | null;
  original_url: string;
  stored_url: string;
  metadata: unknown;
  created_at: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("creative_assets")
      .select("id, tool_name, tool_call_id, original_url, stored_url, metadata, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as CreativeAssetRow[];
    const assets = rows.map((r) => ({
      id: r.id,
      toolName: r.tool_name,
      toolCallId: r.tool_call_id ?? undefined,
      originalUrl: r.original_url,
      storedUrl: r.stored_url,
      metadata: r.metadata ?? undefined,
      createdAt: r.created_at,
    }));

    return NextResponse.json({ conversationId, assets });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Assets error" },
      { status: 500 }
    );
  }
}

