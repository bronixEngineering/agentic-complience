"use client"

import { useState } from "react"
import { useChat } from "@ai-sdk/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SendHorizontal } from "lucide-react"

const CHAT_API = "/api/voltagent/agents/compliance-supervisor-agent/chat"

function getMessageText(m: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (typeof m.content === "string") return m.content
  if (Array.isArray(m.parts)) {
    return m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text" && "text" in p)
      .map((p) => p.text)
      .join("")
  }
  return ""
}

export default function CompliancePage() {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status } = useChat({ api: CHAT_API })

  const isLoading = status === "submitted" || status === "streaming"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = (input ?? "").trim()
    if (!text || isLoading) return
    sendMessage({ text })
    setInput("")
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
        <p className="text-muted-foreground text-sm">
          Check ad creatives for compliance. Share an image URL and the Compliance Supervisor will respond.
        </p>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b py-4">
          <CardTitle>Compliance Supervisor</CardTitle>
          <CardDescription>
            Type your request with an image URL (e.g. &quot;Check this ad for compliance&quot;).
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
                    <span className="whitespace-pre-wrap wrap-break-word">{getMessageText(m)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4">
              <Input
                value={input ?? ""}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message"
                disabled={isLoading}
                className="min-w-0 flex-1"
              />
              <Button type="submit" disabled={isLoading || !(input ?? "").trim()} size="icon">
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
