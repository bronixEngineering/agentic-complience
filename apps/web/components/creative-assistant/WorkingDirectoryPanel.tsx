"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Download, ExternalLink, FolderOpen } from "lucide-react";

export type WorkingDirectoryAsset = {
  id: string;
  toolName?: string;
  toolCallId?: string;
  originalUrl: string;
  storedUrl?: string;
  createdAt?: string;
  status?: "optimistic" | "stored" | "error";
};

function truncateMiddle(s: string, head = 10, tail = 8) {
  if (!s) return "";
  if (s.length <= head + tail + 3) return s;
  return `${s.slice(0, head)}...${s.slice(-tail)}`;
}

export function WorkingDirectoryPanel({
  conversationId,
  assets,
  className,
}: {
  conversationId: string;
  assets: WorkingDirectoryAsset[];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const hasAssets = assets.length > 0;

  const sorted = useMemo(() => {
    // Stable sort by createdAt when available; otherwise keep insertion order.
    return [...assets].sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : NaN;
      const tb = b.createdAt ? Date.parse(b.createdAt) : NaN;
      if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
      return ta - tb;
    });
  }, [assets]);

  const copyConversationId = async () => {
    try {
      await navigator.clipboard.writeText(conversationId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 900);
    } catch {
      // ignore
    }
  };

  return (
    <Card className={cn("flex flex-1 flex-col overflow-hidden shadow-md", className)}>
      <CardHeader className="flex-none border-b bg-muted/20 px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              Workspace
            </CardTitle>
            <CardDescription className="text-xs">
              Generated assets for this conversation
            </CardDescription>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary" className="font-mono text-[10px]">
              {truncateMiddle(conversationId, 10, 8)}
            </Badge>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={copyConversationId}
              title="Copy conversation id"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="sr-only">Copy conversation id</span>
            </Button>
            {copied && (
              <span className="text-[10px] text-muted-foreground">Copied</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {!hasAssets ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-full bg-muted/50 p-6">
                <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <div className="max-w-sm space-y-2">
                <h3 className="font-medium">No assets yet</h3>
                <p className="text-sm text-muted-foreground">
                  When tools generate images, they’ll show up here like a working directory.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((asset) => {
                const url = asset.storedUrl || asset.originalUrl;
                const title = asset.toolName ? asset.toolName : "asset";
                const isError = asset.status === "error";
                return (
                  <Card key={asset.id} className="group overflow-hidden">
                    <div className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={title}
                        className={cn(
                          "h-full w-full object-cover transition-opacity",
                          isError && "opacity-40"
                        )}
                      />
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex"
                          title="Open"
                        >
                          <Button size="icon" variant="secondary" className="h-9 w-9">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </a>
                        <a
                          href={url}
                          download
                          className="inline-flex"
                          title="Download"
                        >
                          <Button size="icon" variant="secondary" className="h-9 w-9">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </div>
                    <CardContent className="space-y-1 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">
                          {asset.toolName ?? "asset"}
                        </div>
                        {asset.status === "optimistic" && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal opacity-70">
                            Saving…
                          </Badge>
                        )}
                        {asset.status === "error" && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal opacity-70">
                            Error
                          </Badge>
                        )}
                      </div>
                      {asset.createdAt && (
                        <div className="text-[10px] text-muted-foreground/70">
                          {new Date(asset.createdAt).toLocaleString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

