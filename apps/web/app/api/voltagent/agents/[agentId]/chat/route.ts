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

    const body: unknown = await request.json();

    type JsonRecord = Record<string, unknown>;
    const isJsonRecord = (v: unknown): v is JsonRecord =>
      typeof v === "object" && v !== null && !Array.isArray(v);

    // Vercel AI SDK sends { messages, ... }.
    // VoltAgent expects { input: messages, ... }.
    // Preserve additional fields (e.g. chat/session identifiers) if present.
    const voltagentBody = (() => {
      if (!isJsonRecord(body)) return body;
      const messages = body["messages"];
      if (!Array.isArray(messages)) return body;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { messages: _messages, ...rest } = body;
      return { ...rest, input: messages };
    })();

    // Resumable streams need stable userId + conversationId.
    // We always set userId from the authenticated Supabase user.
    // conversationId is taken from:
    // - AI SDK chat id (body.id) if provided
    // - caller-provided options.conversationId if present
    const existingOptions = (() => {
      if (!isJsonRecord(voltagentBody)) return undefined;
      const options = voltagentBody["options"];
      return isJsonRecord(options) ? options : undefined;
    })();

    const conversationId = (() => {
      if (isJsonRecord(body) && typeof body["id"] === "string") return body["id"];
      const maybeConversationId = existingOptions?.["conversationId"];
      return typeof maybeConversationId === "string" ? maybeConversationId : undefined;
    })();

    const voltagentBodyWithOptions = isJsonRecord(voltagentBody)
      ? {
          ...voltagentBody,
          options: {
            ...(existingOptions ?? {}),
            userId: user.id,
            ...(conversationId ? { conversationId } : {}),
            resumableStream: true,
          },
        }
      : voltagentBody;

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
      body: JSON.stringify(voltagentBodyWithOptions),
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
