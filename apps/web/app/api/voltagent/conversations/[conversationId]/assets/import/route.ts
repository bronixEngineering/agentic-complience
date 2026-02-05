import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

export const runtime = "nodejs";

const UPLOAD_BUCKET = process.env.SUPABASE_UPLOADS_BUCKET ?? "chat_uploads";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type ImportAssetInput = {
  clientId?: string;
  url: string;
  metadata?: unknown;
};

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

const guessExtension = (contentType: string) => {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[contentType.toLowerCase()] ?? "bin";
};

const contentTypeFromHeader = (v: string | null) => {
  if (!v) return "application/octet-stream";
  // remove charset etc.
  return v.split(";")[0]?.trim() || "application/octet-stream";
};

export async function POST(
  request: Request,
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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Missing SUPABASE_SERVICE_ROLE_KEY (required to persist generated assets to Storage).",
        },
        { status: 500 }
      );
    }

    const adminSupabase = createAdminClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = (await request.json().catch(() => null)) as
      | {
          toolName?: unknown;
          toolCallId?: unknown;
          assets?: unknown;
        }
      | null;

    const toolName = typeof body?.toolName === "string" ? body.toolName : "tool";
    const toolCallId = typeof body?.toolCallId === "string" ? body.toolCallId : undefined;

    const assetsInput = Array.isArray(body?.assets) ? (body?.assets as unknown[]) : [];
    const assets: ImportAssetInput[] = assetsInput
      .map((a) => {
        if (!a || typeof a !== "object") return null;
        const rec = a as Record<string, unknown>;
        const url = typeof rec.url === "string" ? rec.url : "";
        if (!url) return null;
        return {
          clientId: typeof rec.clientId === "string" ? rec.clientId : undefined,
          url,
          metadata: rec.metadata,
        } satisfies ImportAssetInput;
      })
      .filter(Boolean) as ImportAssetInput[];

    if (assets.length === 0) {
      return NextResponse.json({ conversationId, assets: [] });
    }

    const results = [];

    for (const a of assets) {
      const originalUrl = a.url;

      const resp = await fetch(originalUrl, { method: "GET" });
      if (!resp.ok) {
        throw new Error(`Failed to fetch asset (HTTP ${resp.status})`);
      }

      const contentType = contentTypeFromHeader(resp.headers.get("content-type"));
      const ext = guessExtension(contentType);
      const bytes = new Uint8Array(await resp.arrayBuffer());

      const hash = createHash("sha256").update(originalUrl).digest("hex").slice(0, 32);
      const objectPath = `creative_assets/${safe(user.id)}/${safe(conversationId)}/${hash}.${ext}`;

      const { error: uploadError } = await adminSupabase.storage
        .from(UPLOAD_BUCKET)
        .upload(objectPath, bytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicData } = adminSupabase.storage
        .from(UPLOAD_BUCKET)
        .getPublicUrl(objectPath);
      const storedUrl = publicData?.publicUrl;
      if (!storedUrl) throw new Error("Storage upload succeeded but public URL is missing");

      const row = {
        user_id: user.id,
        conversation_id: conversationId,
        tool_name: toolName,
        tool_call_id: toolCallId ?? null,
        original_url: originalUrl,
        stored_url: storedUrl,
        metadata: a.metadata ?? null,
      };

      const { data: upserted, error: upsertError } = await adminSupabase
        .from("creative_assets")
        .upsert(row, {
          onConflict: "user_id,conversation_id,original_url",
        })
        .select("id, created_at")
        .single();

      if (upsertError) {
        throw new Error(`DB upsert failed: ${upsertError.message}`);
      }

      results.push({
        id: upserted?.id as string,
        clientId: a.clientId,
        toolName,
        toolCallId,
        originalUrl,
        storedUrl,
        createdAt: (upserted?.created_at as string) ?? new Date().toISOString(),
        metadata: a.metadata,
      });
    }

    return NextResponse.json({ conversationId, assets: results });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import error" },
      { status: 500 }
    );
  }
}

