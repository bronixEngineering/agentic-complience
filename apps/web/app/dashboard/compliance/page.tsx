"use client"

import { useMemo, useRef, useState, useEffect } from "react"
import { DefaultChatTransport, isFileUIPart, isTextUIPart, type UIMessage } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SendHorizontal, Paperclip, Bot, User, ChevronDown, ChevronRight, Terminal } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "@/components/ui/sidebar"
import {
  WorkingDirectoryPanel,
  type WorkingDirectoryAsset,
} from "@/components/creative-assistant/WorkingDirectoryPanel"

const AGENT_ID = "all-in-one-supervisor-agent"
const CHAT_API = `/api/voltagent/agents/${AGENT_ID}/chat`
const CHAT_ID_STORAGE_KEY = `chatId:${AGENT_ID}`
const STREAM_API = `/api/voltagent/agents/${AGENT_ID}/stream`

type ToolInvocationPart = {
  type: "tool-invocation"
  toolCallId: string
  toolName: string
  state: "call" | "result"
  args?: unknown
  result?: unknown
  errorText?: string
}

type TimelineStep = {
  toolName?: string
  state?: "call" | "result" | string
  args?: unknown
  result?: unknown
  errorText?: string
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const isTextPart = (p: unknown): p is { type: "text"; text: string } =>
  isRecord(p) && p["type"] === "text" && typeof p["text"] === "string"

const isFilePart = (p: unknown): p is { type: "file"; url: string } =>
  isRecord(p) && p["type"] === "file" && typeof p["url"] === "string"

const isToolInvocationPart = (p: unknown): p is ToolInvocationPart =>
  isRecord(p) &&
  p["type"] === "tool-invocation" &&
  typeof p["toolCallId"] === "string" &&
  typeof p["toolName"] === "string" &&
  (p["state"] === "call" || p["state"] === "result")

function getMessageText(m: UIMessage | { content?: unknown }): string {
  // Back-compat: some streams still expose `content`
  if ("content" in m && typeof m.content === "string") return m.content
  if (!("parts" in m) || !Array.isArray(m.parts)) return ""

  return m.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("")
}

function getToolInvocations(m: UIMessage): ToolInvocationPart[] {
  if (!("parts" in m) || !Array.isArray(m.parts)) return []
  return (m.parts as unknown[]).filter(isToolInvocationPart)
}

function ExecutionTimeline({ tools }: { tools: TimelineStep[] }) {
  // If the user hasn't toggled anything, we auto-open while tools are running.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null)
  
  // If no tools, we show a default "Direct Response" trace
  const hasTools = tools && tools.length > 0
  const steps = (
    hasTools ? tools : [{ toolName: "Direct Response", state: "result", result: "Generated text response" }]
  ).filter(Boolean)

  const hasRunningStep = steps.some((s) => s?.state && s.state !== "result")
  const isOpen = manualOpen ?? hasRunningStep

  return (
    <div className="mt-2 w-full max-w-full">
      <Collapsible
        open={isOpen}
        onOpenChange={(next) => setManualOpen(next)}
        className="w-full space-y-2"
      >
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="flex h-8 w-full items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 text-xs font-normal text-muted-foreground hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5" />
              <span>
                Execution Timeline ({steps.length} steps){hasRunningStep ? " • running" : ""}
              </span>
            </div>
            {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border bg-background/50 p-3 text-xs">
            <ul className="space-y-3">
              {steps.map((tool, idx) => (
                <li key={idx} className="relative flex gap-3">
                  <span className="absolute left-[5px] top-2 h-full w-px bg-border last:hidden" />
                  <div className="relative z-10 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-medium text-foreground">
                        {tool?.toolName ?? "Tool"}
                      </span>
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal uppercase opacity-70">
                        {tool?.state === "result" ? "Completed" : "Running"}
                      </Badge>
                    </div>
                    {/* Show args if available */}
                    {tool?.args !== undefined && (
                      <div className="mt-1 rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                        <div className="mb-1 text-[9px] uppercase tracking-wider opacity-50">Args</div>
                        <div className="line-clamp-3 break-all">
                          {typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args)}
                        </div>
                      </div>
                    )}
                     {/* Show result if available */}
                    {tool?.state === "result" && tool?.result !== undefined && (
                       <div className="mt-1 rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                         <div className="mb-1 text-[9px] uppercase tracking-wider opacity-50">Result</div>
                         <div className="line-clamp-3 overflow-hidden text-ellipsis">
                            {typeof tool.result === 'string' ? tool.result : JSON.stringify(tool.result)}
                         </div>
                       </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

function MessageBody({ message }: { message: UIMessage }) {
  const text = getMessageText(message)
  const files = message.parts?.filter(isFileUIPart) ?? []
  const tools = getToolInvocations(message)
  const isUser = message.role === "user"

  // Fix: Hide empty bubbles if there is no text AND no files AND no tools
  const isEmpty = !text && files.length === 0 && tools.length === 0
  
  if (isEmpty) return null

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-8 w-8">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-muted"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex max-w-[85%] flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {(text || files.length > 0) && (
          <div
            className={`rounded-2xl px-4 py-2.5 shadow-sm text-sm ${
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-none"
                : "bg-muted/50 border rounded-tl-none"
            }`}
          >
            {files.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {files.map((f, idx) => {
                  const isImage = typeof f.mediaType === "string" && f.mediaType.startsWith("image/")
                  const key = `${f.url}-${idx}`

                  if (isImage) {
                    return (
                      <img
                        key={key}
                        src={f.url}
                        alt={f.filename ?? "uploaded image"}
                        className="max-h-60 rounded-lg border bg-background/50 object-cover"
                      />
                    )
                  }

                  return (
                    <a
                      key={key}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded bg-background/50 px-2 py-1 text-xs underline"
                    >
                      <Paperclip className="h-3 w-3" />
                      {f.filename ?? "Attached File"}
                    </a>
                  )
                })}
              </div>
            )}

            {text && <div className="whitespace-pre-wrap leading-relaxed">{text}</div>}
          </div>
        )}
        
        {/* Timeline is rendered outside the bubble regardless of tools, showing at least 1 step */}
        {!isUser && (
          <ExecutionTimeline tools={tools} />
        )}
      </div>
    </div>
  )
}

function createChatId() {
  return typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getOrCreateStoredChatId(): string {
  const existing = window.localStorage.getItem(CHAT_ID_STORAGE_KEY)
  if (existing) return existing
  const created = createChatId()
  window.localStorage.setItem(CHAT_ID_STORAGE_KEY, created)
  return created
}

function ComplianceChat({
  chatId,
  setChatId,
  initialMessages,
  initialAssets,
}: {
  chatId: string
  setChatId: (next: string) => void
  initialMessages: UIMessage[]
  initialAssets: WorkingDirectoryAsset[]
}) {
  const [input, setInput] = useState("")
  const [hasFile, setHasFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
  const [status, setStatus] = useState<"ready" | "submitted" | "streaming" | "error">("ready")
  const [streamError, setStreamError] = useState<string | null>(null)
  const [livePhase, setLivePhase] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [assets, setAssets] = useState<WorkingDirectoryAsset[]>(initialAssets)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    setAssets(initialAssets)
  }, [initialAssets])

  useEffect(() => {
    return () => {
      // Cleanup on unmount to avoid stream writing after close.
      abortRef.current?.abort("unmount")
    }
  }, [])

  const resetChatId = () => {
    const created = createChatId()
    try {
      window.localStorage.setItem(CHAT_ID_STORAGE_KEY, created)
    } catch {
      // ignore
    }
    setChatId(created)
  }

  // Keep transport around for potential future use (chat-compatible endpoint),
  // but tool traces are streamed from /stream below for live visibility.
  useMemo(() => new DefaultChatTransport({ api: CHAT_API }), [])

  const isLoading = status === "submitted" || status === "streaming"

  const createMessageId = () =>
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

  const fileToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })

  const upsertAssistantText = (parts: unknown[], appendText: string) => {
    const next = Array.isArray(parts) ? [...parts] : []
    const idx = next.findIndex(isTextPart)
    if (idx === -1) {
      next.unshift({ type: "text", text: appendText })
    } else {
      const cur = next[idx]
      if (isTextPart(cur)) {
        next[idx] = { ...cur, text: String(cur.text ?? "") + appendText }
      }
    }
    return next
  }

  const upsertToolInvocation = (
    parts: unknown[],
    invocation: {
      toolCallId: string
      toolName: string
      args?: unknown
      state: "call" | "result"
      result?: unknown
      errorText?: string
    }
  ) => {
    const next = Array.isArray(parts) ? [...parts] : []
    const idx = next.findIndex(
      (p) => isToolInvocationPart(p) && p.toolCallId === invocation.toolCallId
    )
    const payload = {
      type: "tool-invocation",
      toolCallId: invocation.toolCallId,
      toolName: invocation.toolName,
      ...(invocation.args !== undefined ? { args: invocation.args } : {}),
      state: invocation.state,
      ...(invocation.result !== undefined ? { result: invocation.result } : {}),
      ...(invocation.errorText ? { errorText: invocation.errorText } : {}),
    }
    if (idx === -1) next.push(payload)
    else {
      const cur = next[idx]
      next[idx] = isRecord(cur) ? { ...cur, ...payload } : payload
    }
    return next
  }

  const upsertAssistantFiles = (
    parts: unknown[],
    filesToAdd: Array<{ url: string; mediaType?: string; filename?: string }>
  ) => {
    const next = Array.isArray(parts) ? [...parts] : []
    const seen = new Set(
      next
        .filter(isFilePart)
        .map((p) => String(p.url))
    )
    for (const f of filesToAdd) {
      if (!f?.url || seen.has(f.url)) continue
      seen.add(f.url)
      next.push({
        type: "file",
        url: f.url,
        mediaType: f.mediaType ?? "image/png",
        ...(f.filename ? { filename: f.filename } : {}),
      })
    }
    return next
  }

  const extractImagesFromToolOutput = (output: unknown) => {
    const images: Array<{ url: string; mediaType?: string; filename?: string; metadata?: unknown }> =
      []
    if (!output || typeof output !== "object") return images
    const rec = output as Record<string, unknown>
    const maybeImages = rec["images"]
    if (Array.isArray(maybeImages)) {
      for (const item of maybeImages) {
        if (!item || typeof item !== "object") continue
        const img = item as Record<string, unknown>
        const url = typeof img["url"] === "string" ? img["url"] : ""
        if (!url) continue
        images.push({
          url,
          mediaType:
            typeof img["content_type"] === "string"
              ? (img["content_type"] as string)
              : undefined,
          filename: typeof img["file_name"] === "string" ? (img["file_name"] as string) : undefined,
          metadata: img,
        })
      }
      return images
    }
    // fallback shapes
    const url = typeof rec["url"] === "string" ? (rec["url"] as string) : ""
    if (url) images.push({ url, metadata: rec })
    return images
  }

  const addOptimisticAssets = ({
    toolName,
    toolCallId,
    images,
  }: {
    toolName: string
    toolCallId: string
    images: Array<{ url: string; mediaType?: string; filename?: string; metadata?: unknown }>
  }) => {
    const createdAt = new Date().toISOString()
    const newOnes = images.map((img, idx) => {
      const localId = `local:${toolCallId}:${idx}:${Date.now()}`
      return {
        id: localId,
        toolName,
        toolCallId,
        originalUrl: img.url,
        createdAt,
        status: "optimistic" as const,
      } satisfies WorkingDirectoryAsset
    })

    setAssets((prev) => {
      const seen = new Set(prev.map((a) => a.originalUrl))
      const merged = [...prev]
      for (const a of newOnes) {
        if (seen.has(a.originalUrl)) continue
        seen.add(a.originalUrl)
        merged.push(a)
      }
      return merged
    })

    return newOnes
  }

  const sendLiveMessage = async ({
    text,
    files,
  }: {
    text?: string
    files?: FileList
  }) => {
    setStreamError(null)
    setLivePhase(null)
    setStatus("submitted")

    // Abort any previous in-flight stream.
    abortRef.current?.abort("new request")
    const abort = new AbortController()
    abortRef.current = abort

    const parts: UIMessage["parts"] = []
    const trimmed = (text ?? "").trim()
    if (trimmed) parts.push({ type: "text", text: trimmed })

    if (files && files.length > 0) {
      const dataUrls = await Promise.all(Array.from(files).map(fileToDataUrl))
      Array.from(files).forEach((f, i) => {
        parts.push({
          type: "file",
          url: dataUrls[i],
          mediaType: f.type || "application/octet-stream",
          filename: f.name,
        })
      })
    }

    const userMessage: UIMessage = {
      id: createMessageId(),
      role: "user",
      parts,
    }

    const assistantMessageId = createMessageId()
    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantMessageId, role: "assistant", parts: [{ type: "text", text: "" }] } as UIMessage,
    ])

    const res = await fetch(STREAM_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: chatId,
        messageId: userMessage.id,
        messages: [userMessage],
      }),
      signal: abort.signal,
    })

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "")
      setStatus("error")
      setStreamError(errText || `Stream failed (HTTP ${res.status})`)
      return
    }

    setStatus("streaming")
    setLivePhase("Thinking…")

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ""

    const applyToAssistant = (fn: (parts: unknown[]) => unknown[]) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantMessageId) return m
          const curParts = Array.isArray(m.parts) ? (m.parts as unknown[]) : []
          return { ...m, parts: fn(curParts) as unknown as UIMessage["parts"] }
        })
      )
    }

    const persistAssetsForAssistant = async ({
      toolName,
      toolCallId,
      optimistic,
      images,
    }: {
      toolName: string
      toolCallId: string
      optimistic: WorkingDirectoryAsset[]
      images: Array<{ url: string; mediaType?: string; filename?: string; metadata?: unknown }>
    }) => {
      try {
        const payload = {
          toolName,
          toolCallId,
          assets: optimistic.map((o, idx) => ({
            clientId: o.id,
            url: images[idx]?.url ?? o.originalUrl,
            metadata: images[idx]?.metadata,
          })),
        }

        const res = await fetch(
          `/api/voltagent/conversations/${encodeURIComponent(chatId)}/assets/import`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        )

        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || `Asset import failed (HTTP ${res.status})`)
        }

        const json = (await res.json()) as {
          assets?: Array<{
            id: string
            clientId?: string
            originalUrl: string
            storedUrl: string
            createdAt: string
          }>
        }

        const imported = Array.isArray(json.assets) ? json.assets : []
        if (imported.length === 0) return

        // Update workspace items + swap assistant file URLs to stored URLs.
        setAssets((prev) =>
          prev.map((a) => {
            const match = imported.find((x) => x.clientId === a.id)
            if (!match) return a
            return {
              ...a,
              id: match.id,
              storedUrl: match.storedUrl,
              createdAt: match.createdAt,
              status: "stored",
            }
          })
        )

        applyToAssistant((p) => {
          const next = Array.isArray(p) ? [...p] : []
          return next.map((part) => {
            if (!isFilePart(part)) return part
            const match = imported.find((x) => x.originalUrl === part.url)
            return match ? { ...part, url: match.storedUrl } : part
          })
        })
      } catch {
        setAssets((prev) =>
          prev.map((a) =>
            optimistic.some((o) => o.id === a.id) ? { ...a, status: "error" } : a
          )
        )
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })

        while (true) {
          const sep = buf.indexOf("\n\n")
          if (sep === -1) break
          const rawEvent = buf.slice(0, sep)
          buf = buf.slice(sep + 2)

          const dataLines = rawEvent
            .split("\n")
            .filter((l) => l.startsWith("data: "))
            .map((l) => l.slice(6))
          if (dataLines.length === 0) continue

          const dataStr = dataLines.join("\n")
          if (!dataStr || dataStr === "[DONE]") continue

          let evt: unknown
          try {
            evt = JSON.parse(dataStr) as unknown
          } catch {
            continue
          }

          if (!isRecord(evt)) continue
          const evtType = typeof evt["type"] === "string" ? (evt["type"] as string) : ""

          switch (evtType) {
            case "start":
            case "start-step": {
              setLivePhase("Thinking…")
              break
            }
            case "text-delta": {
              const delta =
                typeof evt["text"] === "string" ? (evt["text"] as string) : ""
              if (delta) {
                setLivePhase("Responding…")
                applyToAssistant((p) => upsertAssistantText(p, delta))
              }
              break
            }
            case "tool-call": {
              const toolCallId =
                typeof evt["toolCallId"] === "string" ? (evt["toolCallId"] as string) : ""
              const toolName =
                typeof evt["toolName"] === "string" ? (evt["toolName"] as string) : "tool"
              if (toolCallId) {
                setLivePhase(
                  toolName === "delegate_task"
                    ? "Delegating task…"
                    : `Calling tool: ${toolName}…`
                )
                applyToAssistant((p) =>
                  upsertToolInvocation(p, {
                    toolCallId,
                    toolName,
                    args: evt["input"],
                    state: "call",
                  })
                )
              }
              break
            }
            case "tool-result": {
              const toolCallId =
                typeof evt["toolCallId"] === "string" ? (evt["toolCallId"] as string) : ""
              const toolName =
                typeof evt["toolName"] === "string" ? (evt["toolName"] as string) : "tool"
              if (toolCallId) {
                setLivePhase(
                  toolName === "delegate_task"
                    ? "Delegate completed"
                    : `Tool completed: ${toolName}`
                )
                applyToAssistant((p) =>
                  upsertToolInvocation(p, {
                    toolCallId,
                    toolName,
                    args: evt["input"],
                    state: "result",
                    result: evt["output"],
                  })
                )

                // If this tool produced images, show them in chat and add them to the workspace.
                if (
                  toolName === "nanoBananaProImage" ||
                  toolName === "nanoBananaEditImage"
                ) {
                  const imgs = extractImagesFromToolOutput(evt["output"])
                  if (imgs.length > 0) {
                    applyToAssistant((p) => upsertAssistantFiles(p, imgs))
                    const optimistic = addOptimisticAssets({
                      toolName,
                      toolCallId,
                      images: imgs,
                    })
                    void persistAssetsForAssistant({
                      toolName,
                      toolCallId,
                      optimistic,
                      images: imgs,
                    })
                  }
                }
              }
              break
            }
            case "tool-error": {
              const toolCallId =
                typeof evt["toolCallId"] === "string" ? (evt["toolCallId"] as string) : ""
              const toolName =
                typeof evt["toolName"] === "string" ? (evt["toolName"] as string) : "tool"
              if (toolCallId) {
                setLivePhase(`Tool error: ${toolName}`)
                applyToAssistant((p) =>
                  upsertToolInvocation(p, {
                    toolCallId,
                    toolName,
                    args: evt["input"],
                    state: "result",
                    result: evt["error"],
                    errorText: "tool-error",
                  })
                )
              }
              break
            }
            case "error": {
              setStreamError("Stream error")
              setLivePhase("Error")
              break
            }
            case "finish": {
              // nothing special; we'll set ready when stream ends
              setLivePhase(null)
              break
            }
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (abort.signal.aborted) {
        // ignore abort errors (navigation, refresh, new request)
      } else {
        setStreamError(msg || "Stream error")
        setStatus("error")
      }
    } finally {
      try {
        await reader.cancel()
      } catch {
        // ignore
      }
      setStatus("ready")
      setLivePhase(null)
      if (abortRef.current === abort) abortRef.current = null
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        requestAnimationFrame(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
        })
    }
  }, [messages, status])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = (input ?? "").trim()
    const files = fileInputRef.current?.files

    if (isLoading) return
    if (!text && (!files || files.length === 0)) return

    if (files && files.length > 0) {
      void sendLiveMessage(text ? { text, files } : { files })
    } else {
      void sendLiveMessage({ text })
    }
    
    setInput("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    setHasFile(false)
  }

  const handleSuggestion = (text: string) => {
    setInput(text)
    // Optional: auto-send or just focus
    // sendMessage({ text }) 
  }

  return (
    // Height calculation: 100vh - 4rem (header) - 2rem (padding) - 2rem (extra buffer) = calc(100vh - 8rem)
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Creative Assistant</h1>
            <p className="text-muted-foreground text-sm">
              Create, edit, and review assets in a workspace
            </p>
          </div>
          <div className="shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={resetChatId}>
              New canvas
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <Card className="flex flex-1 flex-col overflow-hidden shadow-md lg:w-1/3 lg:max-w-[420px]">
        <CardHeader className="flex-none border-b bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <CreativeAssistantIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Creative Assistant</CardTitle>
              <CardDescription className="text-xs">
                Chat on the left, generated assets on the right
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col overflow-hidden min-h-0 p-0">
          <div className="flex flex-1 flex-col overflow-hidden min-h-0 bg-background">
            <div 
              ref={scrollRef}
              className="flex-1 min-h-0 overflow-y-auto p-6"
            >
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                  <div className="rounded-full bg-muted/50 p-6">
                    <Bot className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <div className="max-w-sm space-y-2">
                    <h3 className="font-medium">Your workspace is ready</h3>
                    <p className="text-sm text-muted-foreground">
                      Describe what you want to create, edit, or extract. Generated assets will appear in your workspace.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col gap-1 p-3 text-xs"
                      onClick={() =>
                        handleSuggestion(
                          "Generate an ad creative for a skincare brand (16:9). Add a clean product shot, soft lighting, and a short headline."
                        )
                      }
                    >
                      <span>Generate an Ad</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col gap-1 p-3 text-xs"
                      onClick={() => handleSuggestion("Extract text from this image and summarize it.")}
                    >
                      <span>OCR and Summarize</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((m) => (
                    <MessageBody key={m.id} message={m as UIMessage} />
                  ))}
                  {isLoading && (
                     <div className="flex gap-3">
                       <Avatar className="h-8 w-8">
                         <AvatarFallback className="bg-muted"><Bot className="h-4 w-4" /></AvatarFallback>
                       </Avatar>
                       <div className="flex items-center gap-3 rounded-2xl rounded-tl-none border bg-muted/50 px-4 py-3">
                         <div className="flex items-center gap-1">
                           <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]"></div>
                           <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]"></div>
                           <div className="h-2 w-2 animate-bounce rounded-full bg-primary/40"></div>
                         </div>
                         {livePhase && (
                           <span className="text-xs text-muted-foreground font-mono">
                             {livePhase}
                           </span>
                         )}
                       </div>
                     </div>
                  )}
                </div>
              )}
            </div>

            {streamError && (
              <div className="flex-none border-t bg-destructive/5 px-4 py-2 text-xs text-destructive">
                {streamError}
              </div>
            )}

            <div className="flex-none border-t bg-background/50 p-4 backdrop-blur supports-backdrop-filter:bg-background/80">
              <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-2">
                <div className="relative flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-background px-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                   <div 
                     className="flex cursor-pointer items-center text-muted-foreground hover:text-foreground"
                     onClick={() => fileInputRef.current?.click()}
                   >
                     <Paperclip className="h-5 w-5" />
                     <span className="sr-only">Attach file</span>
                   </div>
                   
                   {hasFile && (
                     <span className="flex h-5 items-center rounded bg-primary/10 px-1.5 text-[10px] font-medium text-primary">
                       Image attached
                     </span>
                   )}
                   
                   <Input
                    className="border-0 shadow-none focus-visible:ring-0 px-2"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message or describe your compliance question..."
                    disabled={isLoading}
                   />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setHasFile(Boolean(e.currentTarget.files?.length))}
                  className="hidden"
                />

                <Button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !hasFile)}
                  className="shrink-0 rounded-lg shadow-sm"
                  size="icon"
                >
                  <SendHorizontal className="h-4 w-4" />
                </Button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                AI can make mistakes. Please verify important information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

        <WorkingDirectoryPanel
          conversationId={chatId}
          assets={assets}
          className="lg:flex-1"
        />
      </div>
    </div>
  )
}

export default function CompliancePage() {
  const { setOpen, isMobile } = useSidebar()

  useEffect(() => {
    // Make the left sidebar minimal by default on this page (desktop only).
    if (!isMobile) setOpen(false)
  }, [isMobile, setOpen])

  // Stable conversation id is required for resumable streams.
  // We persist it in localStorage so refreshes can resume an in-flight stream.
  const [chatId, setChatId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)
  const [initialAssets, setInitialAssets] = useState<WorkingDirectoryAsset[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    try {
      setChatId(getOrCreateStoredChatId())
    } catch {
      // If storage is unavailable, fall back to a per-tab id (resume won't survive refresh).
      setChatId(createChatId())
    }
  }, [])

  useEffect(() => {
    if (!chatId) return
    let cancelled = false
    setInitialMessages(null)
    setInitialAssets(null)
    setHistoryError(null)
    ;(async () => {
      try {
        const [msgsRes, assetsRes] = await Promise.all([
          fetch(`/api/voltagent/conversations/${encodeURIComponent(chatId)}/messages`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }),
          fetch(`/api/voltagent/conversations/${encodeURIComponent(chatId)}/assets`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }),
        ])

        if (!msgsRes.ok) {
          const body = await msgsRes.json().catch(() => null)
          throw new Error(body?.error || `Failed to load history (HTTP ${msgsRes.status})`)
        }
        const msgsJson = (await msgsRes.json()) as { messages?: UIMessage[] }

        let assets: WorkingDirectoryAsset[] = []
        if (assetsRes.ok) {
          const assetsJson = (await assetsRes.json().catch(() => null)) as
            | { assets?: WorkingDirectoryAsset[] }
            | null
          assets = Array.isArray(assetsJson?.assets) ? assetsJson!.assets! : []
        }

        if (!cancelled) {
          setInitialMessages(Array.isArray(msgsJson.messages) ? msgsJson.messages : [])
          setInitialAssets(assets)
        }
      } catch (e) {
        if (!cancelled) {
          setHistoryError(e instanceof Error ? e.message : "Failed to load history")
          setInitialMessages([])
          setInitialAssets([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chatId])

  if (!chatId || !initialMessages || !initialAssets) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex-none">
          <h1 className="text-2xl font-semibold tracking-tight">Creative Assistant</h1>
          <p className="text-muted-foreground text-sm">
            Create, edit, and review assets in a workspace
          </p>
        </div>
        <Card className="flex flex-1 items-center justify-center overflow-hidden">
          <CardContent className="py-10 text-center">
            <div className="mx-auto max-w-md space-y-3">
              <div className="text-sm font-medium tracking-wide">Loading your workspace</div>
              <div className="text-xs text-muted-foreground">
                Restoring this conversation and preparing the canvas…
              </div>
              <div className="mx-auto mt-6 h-2 w-48 rounded-full bg-muted">
                <div className="h-2 w-24 animate-pulse rounded-full bg-primary/40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {historyError && (
        <div className="mb-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          Failed to load chat history: {historyError}
        </div>
      )}
      <ComplianceChat
        chatId={chatId}
        setChatId={setChatId}
        initialMessages={initialMessages}
        initialAssets={initialAssets}
      />
    </>
  )
}

function CreativeAssistantIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4 12H2" />
      <path d="M22 12h-2" />
      <path d="m19.07 4.93-1.41 1.41" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 19.07-1.41-1.41" />
      <path d="m6.34 6.34-1.41-1.41" />
      <path d="M12 7a5 5 0 0 0 0 10a5 5 0 0 0 0-10Z" />
    </svg>
  )
}
