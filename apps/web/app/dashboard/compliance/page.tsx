"use client"

import { useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isFileUIPart, isTextUIPart, type UIMessage } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SendHorizontal } from "lucide-react"

const CHAT_API = "/api/voltagent/agents/compliance-supervisor-agent/chat"

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

function MessageBody({ message }: { message: UIMessage }) {
  const text = getMessageText(message)
  const files = message.parts?.filter(isFileUIPart) ?? []

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, idx) => {
            const isImage = typeof f.mediaType === "string" && f.mediaType.startsWith("image/")
            const key = `${f.url}-${idx}`

            if (isImage) {
              return (
                <img
                  key={key}
                  src={f.url}
                  alt={f.filename ?? "uploaded image"}
                  className="max-h-40 max-w-[220px] rounded-md border object-contain bg-background/40"
                />
              )
            }

            return (
              <a
                key={key}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs underline underline-offset-2"
              >
                {f.filename ?? "attached file"}
              </a>
            )
          })}
        </div>
      )}

      {text && <div className="whitespace-pre-wrap wrap-break-word">{text}</div>}
    </div>
  )
}

export default function CompliancePage() {
  const [input, setInput] = useState("")
  const [hasFile, setHasFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const transport = useMemo(() => new DefaultChatTransport({ api: CHAT_API }), [])
  const { messages, sendMessage, status } = useChat({ transport })

  const isLoading = status === "submitted" || status === "streaming"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = (input ?? "").trim()
    const files = fileInputRef.current?.files

    if (isLoading) return
    if (!text && (!files || files.length === 0)) return

    // If a file is attached, Vercel AI SDK will convert it to a data: URL file part.
    // The compliance agents/tools accept http(s) URLs and data: URLs for Vision-based checks.
    if (files && files.length > 0) {
      sendMessage(text ? { text, files } : { files })
    } else {
      sendMessage({ text })
    }
    setInput("")
    if (fileInputRef.current) fileInputRef.current.value = ""
    setHasFile(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground text-sm">
          Check ad creatives for compliance. Share an image URL or attach an image and the Compliance Supervisor will respond.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b py-4">
          <CardTitle>Compliance Supervisor</CardTitle>
          <CardDescription>
            Type your request and include an image URL, or attach an image (e.g. &quot;Check this ad for compliance&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-0">
          <div className="flex min-h-[360px] max-h-[60vh] flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="text-muted-foreground text-center text-sm">
                  Type your message and press Enter or Send to start.
                </p>
              )}
              <ul className="space-y-4">
                {messages.map((m) => (
                  <li
                    key={m.id}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground"
                        : "mr-auto max-w-[85%] rounded-lg border bg-muted/50 px-3 py-2 text-sm"
                    }
                  >
                    <MessageBody message={m as UIMessage} />
                  </li>
                ))}
              </ul>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isLoading}
                  onChange={(e) => setHasFile(Boolean(e.currentTarget.files?.length))}
                  className="text-muted-foreground file:text-foreground file:bg-muted/40 file:hover:bg-muted/60 file:rounded-md file:border-0 file:px-3 file:py-2 file:text-sm file:font-medium"
                />
                <Input
                  value={input ?? ""}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message"
                  disabled={isLoading}
                  className="min-w-0"
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || (!(input ?? "").trim() && !hasFile)}
                size="icon"
              >
                <SendHorizontal className="size-4" aria-hidden />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
