import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type StoredMessageRow = {
  message_id: string;
  role: string;
  parts: unknown;
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
      .from("voltagent_memory_messages")
      .select("message_id, role, parts, created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as StoredMessageRow[];
    const messages = rows.map((r) => ({
      id: r.message_id,
      role: r.role as "user" | "assistant" | "system" | "tool",
      parts: Array.isArray(r.parts) ? r.parts : [],
    }));

    return NextResponse.json({ conversationId, messages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "History error" },
      { status: 500 }
    );
  }
}

