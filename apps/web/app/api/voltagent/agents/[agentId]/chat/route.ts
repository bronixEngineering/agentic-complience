import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const rawUrl = process.env.VOLTAGENT_API_URL || "http://localhost:3141";
const VOLTAGENT_API_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;
    if (!agentId) {
      return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
    }

    const body = await request.json();
    // Vercel AI SDK sends { messages }; VoltAgent expects { input: messages, options? }
    const voltagentBody =
      Array.isArray(body?.messages) && body.messages !== undefined
        ? { input: body.messages, options: body.options ?? {} }
        : body;

    const res = await fetch(`${VOLTAGENT_API_URL}/agents/${agentId}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.VOLTAGENT_SECRET_KEY && {
          Authorization: `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`,
        }),
        ...(process.env.VOLTAGENT_PUBLIC_KEY && {
          "X-Voltagent-Key": process.env.VOLTAGENT_PUBLIC_KEY,
        }),
      },
      body: JSON.stringify(voltagentBody),
      signal: request.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || res.statusText },
        { status: res.status }
      );
    }

    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[voltagent/chat]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy error" },
      { status: 500 }
    );
  }
}
