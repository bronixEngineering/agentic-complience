import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Allow streaming responses up to 60s for agent runs
export const maxDuration = 60;

const rawUrl = process.env.VOLTAGENT_API_URL || "http://localhost:3141";
const VOLTAGENT_API_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

const UPLOAD_BUCKET = process.env.SUPABASE_UPLOADS_BUCKET ?? "chat_uploads";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type JsonRecord = Record<string, unknown>;
const isJsonRecord = (v: unknown): v is JsonRecord =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const decodeDataUrl = (dataUrl: string): { bytes: Uint8Array; contentType: string } => {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) throw new Error("Invalid data URL (missing comma)");
  const meta = dataUrl.slice(5, comma);
  const data = dataUrl.slice(comma + 1);
  const metaParts = meta.split(";").filter(Boolean);
  const contentType =
    metaParts[0] && !metaParts[0].includes("/")
      ? "application/octet-stream"
      : metaParts[0] || "application/octet-stream";
  const isBase64 = metaParts.includes("base64");
  const buf = isBase64 ? Buffer.from(data, "base64") : Buffer.from(decodeURIComponent(data), "utf8");
  return { bytes: new Uint8Array(buf), contentType };
};

const guessExtension = (contentType: string) => {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "application/pdf": "pdf",
  };
  return map[contentType.toLowerCase()] ?? "bin";
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

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

    const adminSupabase =
      SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
        ? createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          })
        : null;
    const storageClient = (adminSupabase ?? supabase).storage;

    const body: unknown = await request.json();

    const existingOptions = (() => {
      if (!isJsonRecord(body)) return undefined;
      const options = body["options"];
      return isJsonRecord(options) ? options : undefined;
    })();

    const conversationId = (() => {
      if (isJsonRecord(body) && typeof body["id"] === "string") return body["id"];
      const maybeConversationId = existingOptions?.["conversationId"];
      return typeof maybeConversationId === "string" ? maybeConversationId : undefined;
    })();

    const messageId = (() => {
      if (isJsonRecord(body) && typeof body["messageId"] === "string") return body["messageId"];
      return undefined;
    })();

    const uploadIfDataUrl = async (part: JsonRecord) => {
      if (part["type"] !== "file") return part;
      const url = part["url"];
      if (typeof url !== "string" || !url.startsWith("data:")) return part;

      const { bytes, contentType } = decodeDataUrl(url);
      const mediaType =
        typeof part["mediaType"] === "string" && part["mediaType"]
          ? (part["mediaType"] as string)
          : contentType;

      const filename =
        typeof part["filename"] === "string" && part["filename"]
          ? (part["filename"] as string)
          : `upload.${guessExtension(mediaType)}`;

      const conv = conversationId ?? "no-conversation";
      const msg = messageId ?? "no-message";
      const objectPath = `voltagent/${safe(user.id)}/${safe(conv)}/${safe(msg)}/${safe(filename)}`;

      const { error: uploadError } = await storageClient.from(UPLOAD_BUCKET).upload(objectPath, bytes, {
        contentType: mediaType,
        upsert: true,
      });
      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data } = storageClient.from(UPLOAD_BUCKET).getPublicUrl(objectPath);
      const publicUrl = data?.publicUrl;
      if (!publicUrl) throw new Error("Storage upload succeeded but public URL is missing");

      return { ...part, url: publicUrl, mediaType, filename };
    };

    const rewriteMessagePartsToUrls = async (input: unknown) => {
      if (!Array.isArray(input)) return input;
      const rewritten = [];
      for (const m of input) {
        if (!isJsonRecord(m)) {
          rewritten.push(m);
          continue;
        }
        const parts = m["parts"];
        if (!Array.isArray(parts)) {
          rewritten.push(m);
          continue;
        }

        const nextParts = [];
        for (const p of parts) {
          if (isJsonRecord(p)) nextParts.push(await uploadIfDataUrl(p));
          else nextParts.push(p);
        }
        rewritten.push({ ...m, parts: nextParts });
      }
      return rewritten;
    };

    const input = (() => {
      if (!isJsonRecord(body)) return undefined;
      if (Array.isArray(body["input"])) return body["input"];
      if (Array.isArray(body["messages"])) return body["messages"];
      return undefined;
    })();

    const rewrittenInput = await rewriteMessagePartsToUrls(input);

    const voltagentBody: JsonRecord = {
      ...(isJsonRecord(body) ? body : {}),
      input: rewrittenInput ?? input ?? body,
      options: {
        ...(existingOptions ?? {}),
        userId: user.id,
        ...(conversationId ? { conversationId } : {}),
        // AI SDK–style: ask VoltAgent to send reasoning + sources in the stream (same as toUIMessageStreamResponse)
        sendSources: true,
        sendReasoning: true,
      },
    };

    if (process.env.VOLTAGENT_DEBUG_STREAM === "true") {
      const arr = rewrittenInput ?? input;
      console.log("[voltagent/stream] POST", agentId, {
        conversationId,
        messageId,
        inputLength: Array.isArray(arr) ? arr.length : 1,
        optionsKeys: Object.keys((voltagentBody.options as object) ?? {}),
      });
    }

    const res = await fetch(`${VOLTAGENT_API_URL}/agents/${agentId}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.VOLTAGENT_SECRET_KEY && { Authorization: `Bearer ${process.env.VOLTAGENT_SECRET_KEY}` }),
        ...(process.env.VOLTAGENT_PUBLIC_KEY && { "X-Voltagent-Key": process.env.VOLTAGENT_PUBLIC_KEY }),
      },
      body: JSON.stringify(voltagentBody),
      signal: request.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || res.statusText }, { status: res.status });
    }

    // Debug: log stream events to server console (optional, enable via env)
    const debugStream = process.env.VOLTAGENT_DEBUG_STREAM === "true";
    const responseBody: ReadableStream<Uint8Array> | null = debugStream
      ? new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = res.body!.getReader();
            const dec = new TextDecoder();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  controller.close();
                  break;
                }
                buf += dec.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const payload = line.slice(6);
                    if (payload && payload !== "[DONE]") {
                      try {
                        const evt = JSON.parse(payload) as Record<string, unknown>;
                        const type = evt["type"];
                        console.log("[voltagent/stream]", type, type === "text-delta" ? `(${(evt["text"] as string)?.length ?? 0} chars)` : evt);
                      } catch {
                        console.log("[voltagent/stream]", "raw", payload.slice(0, 80));
                      }
                    }
                  }
                }
                controller.enqueue(value);
              }
            } catch (e) {
              console.error("[voltagent/stream] pipe error", e);
              controller.error(e);
            }
          },
        })
      : res.body;

    return new NextResponse(responseBody, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[voltagent/stream]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Proxy error" },
      { status: 500 }
    );
  }
}
