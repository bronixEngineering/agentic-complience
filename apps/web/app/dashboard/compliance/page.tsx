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

const AGENT_ID = "all-in-one-supervisor-agent"
const CHAT_API = `/api/voltagent/agents/${AGENT_ID}/chat`
const CHAT_ID_STORAGE_KEY = `chatId:${AGENT_ID}`
const STREAM_API = `/api/voltagent/agents/${AGENT_ID}/stream`

function getMessageText(m: UIMessage | { content?: string }): string {
  // Back-compat: some streams still expose `content`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (m as any)?.content === "string") return (m as any).content
  if (!("parts" in m) || !Array.isArray(m.parts)) return ""

  return m.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("")
}

function getToolInvocations(m: UIMessage) {
  if (!("parts" in m) || !Array.isArray(m.parts)) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return m.parts.filter((p) => p && (p as any).type === "tool-invocation") as any[]
}

function ExecutionTimeline({ tools }: { tools: any[] }) {
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
                    {tool?.args && (
                      <div className="mt-1 rounded bg-muted/50 p-2 font-mono text-[10px] text-muted-foreground">
                        <div className="mb-1 text-[9px] uppercase tracking-wider opacity-50">Args</div>
                        <div className="line-clamp-3 break-all">
                          {typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args)}
                        </div>
                      </div>
                    )}
                     {/* Show result if available */}
                    {tool?.state === "result" && tool?.result && (
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
}: {
  chatId: string
  setChatId: (next: string) => void
  initialMessages: UIMessage[]
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

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    return () => {
      // Cleanup on unmount to avoid stream writing after close.
      abortRef.current?.abort("unmount")
    }
  }, [])

  const [copied, setCopied] = useState(false)
  const copyChatId = async () => {
    try {
      await navigator.clipboard.writeText(chatId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1000)
    } catch {
      // ignore
    }
  }

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

  const upsertAssistantText = (parts: any[], appendText: string) => {
    const next = Array.isArray(parts) ? [...parts] : []
    const idx = next.findIndex((p) => p?.type === "text")
    if (idx === -1) {
      next.unshift({ type: "text", text: appendText })
    } else {
      next[idx] = { ...next[idx], text: String(next[idx]?.text ?? "") + appendText }
    }
    return next
  }

  const upsertToolInvocation = (
    parts: any[],
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
      (p) => p?.type === "tool-invocation" && p?.toolCallId === invocation.toolCallId
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
    else next[idx] = { ...next[idx], ...payload }
    return next
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

    const parts: any[] = []
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

    const applyToAssistant = (fn: (parts: any[]) => any[]) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== assistantMessageId) return m
          return { ...m, parts: fn((m as any).parts) }
        })
      )
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

          let evt: any
          try {
            evt = JSON.parse(dataStr)
          } catch {
            continue
          }

          switch (evt?.type) {
            case "start":
            case "start-step": {
              setLivePhase("Thinking…")
              break
            }
            case "text-delta": {
              const delta = typeof evt.text === "string" ? evt.text : ""
              if (delta) {
                setLivePhase("Responding…")
                applyToAssistant((p) => upsertAssistantText(p, delta))
              }
              break
            }
            case "tool-call": {
              const toolCallId = String(evt.toolCallId || "")
              const toolName = String(evt.toolName || "tool")
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
                    args: evt.input,
                    state: "call",
                  })
                )
              }
              break
            }
            case "tool-result": {
              const toolCallId = String(evt.toolCallId || "")
              const toolName = String(evt.toolName || "tool")
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
                    args: evt.input,
                    state: "result",
                    result: evt.output,
                  })
                )
              }
              break
            }
            case "tool-error": {
              const toolCallId = String(evt.toolCallId || "")
              const toolName = String(evt.toolName || "tool")
              if (toolCallId) {
                setLivePhase(`Tool error: ${toolName}`)
                applyToAssistant((p) =>
                  upsertToolInvocation(p, {
                    toolCallId,
                    toolName,
                    args: evt.input,
                    state: "result",
                    result: evt.error,
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
        <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground text-sm">Supervisor Agent powered by VoltAgent</p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <Card className="flex flex-1 flex-col overflow-hidden shadow-md">
        <CardHeader className="flex-none border-b bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheckIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Compliance Supervisor</CardTitle>
              <CardDescription className="text-xs">
                Upload ad creatives to check against policy guidelines
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
                    <h3 className="font-medium">Ready to check your ads</h3>
                    <p className="text-sm text-muted-foreground">
                      I can help analyze your ad creatives for compliance risks, banned logos, and policy violations.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col gap-1 p-3 text-xs"
                      onClick={() => handleSuggestion("Are there any banned logos in this image?")}
                    >
                      <span>🚫 Check for Banned Logos</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col gap-1 p-3 text-xs"
                      onClick={() => handleSuggestion("Does this ad text violate any claims policy?")}
                    >
                      <span>📝 Analyze Ad Claims</span>
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

        <Card className="hidden w-full shrink-0 shadow-md lg:block lg:w-80">
          <CardHeader className="border-b bg-muted/20 px-6 py-4">
            <CardTitle className="text-base">Debug</CardTitle>
            <CardDescription className="text-xs">Resumable stream metadata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-6 text-sm">
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Conversation ID</div>
              <div className="rounded-md border bg-background/50 p-3 font-mono text-xs break-all">
                {chatId}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={copyChatId}
                  disabled={!chatId}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetChatId}
                >
                  Reset
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This id is sent as <span className="font-mono">options.conversationId</span> for resumable streams.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function CompliancePage() {
  // Stable conversation id is required for resumable streams.
  // We persist it in localStorage so refreshes can resume an in-flight stream.
  const [chatId, setChatId] = useState<string | null>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)
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
    setHistoryError(null)
    ;(async () => {
      try {
        const res = await fetch(`/api/voltagent/conversations/${encodeURIComponent(chatId)}/messages`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || `Failed to load history (HTTP ${res.status})`)
        }
        const json = (await res.json()) as { messages?: UIMessage[] }
        if (!cancelled) setInitialMessages(Array.isArray(json.messages) ? json.messages : [])
      } catch (e) {
        if (!cancelled) {
          setHistoryError(e instanceof Error ? e.message : "Failed to load history")
          setInitialMessages([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chatId])

  if (!chatId || !initialMessages) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex-none">
          <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground text-sm">Supervisor Agent powered by VoltAgent</p>
        </div>
        <Card className="flex flex-1 items-center justify-center">
          <CardContent className="py-10 text-sm text-muted-foreground">
            Initializing chat session…
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
      <ComplianceChat chatId={chatId} setChatId={setChatId} initialMessages={initialMessages} />
    </>
  )
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
