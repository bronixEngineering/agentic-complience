"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  type AttachmentData,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { SpeechInput } from "@/components/ai-elements/speech-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { nanoid } from "nanoid";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const AGENT_ID = "all-in-one-supervisor-agent";
const STREAM_API = `/api/voltagent/agents/${AGENT_ID}/stream`;

function createConversationId() {
  return typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function filePartToDataUrl(
  part: { url: string; mediaType?: string; filename?: string }
): Promise<{ type: "file"; url: string; mediaType: string; filename: string }> {
  const url = part.url;
  if (typeof url === "string" && url.startsWith("data:")) {
    return Promise.resolve({
      type: "file",
      url,
      mediaType: part.mediaType || "application/octet-stream",
      filename: part.filename || "file",
    });
  }
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(blob);
        })
    )
    .then((dataUrl) => ({
      type: "file" as const,
      url: dataUrl,
      mediaType: part.mediaType || "application/octet-stream",
      filename: part.filename || "file",
    }));
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

type ToolEntry = {
  toolCallId: string;
  name: string;
  description: string;
  status: "call" | "result";
  parameters: Record<string, unknown>;
  result: string | undefined;
  error: string | undefined;
};

interface MessageType {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: ToolEntry[];
}

const initialMessages: MessageType[] = [];

const suggestions = [
  "What are the latest trends in AI?",
  "How does machine learning work?",
  "Explain quantum computing",
  "Best practices for React development",
  "Tell me about TypeScript benefits",
  "How to optimize database queries?",
  "What is the difference between SQL and NoSQL?",
  "Explain cloud computing basics",
];

const AttachmentItem = ({
  attachment,
  onRemove,
}: {
  attachment: AttachmentData;
  onRemove: (id: string) => void;
}) => {
  const handleRemove = useCallback(() => {
    onRemove(attachment.id);
  }, [onRemove, attachment.id]);

  return (
    <Attachment data={attachment} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
};

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => {
      attachments.remove(id);
    },
    [attachments]
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          attachment={attachment}
          key={attachment.id}
          onRemove={handleRemove}
        />
      ))}
    </Attachments>
  );
};

const SuggestionItem = ({
  suggestion,
  onClick,
}: {
  suggestion: string;
  onClick: (suggestion: string) => void;
}) => {
  const handleClick = useCallback(() => {
    onClick(suggestion);
  }, [onClick, suggestion]);

  return <Suggestion onClick={handleClick} suggestion={suggestion} />;
};

export default function ChatExample() {
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [livePhase, setLivePhase] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const conversationId = useMemo(() => {
    if (conversationIdRef.current) return conversationIdRef.current;
    const id = createConversationId();
    conversationIdRef.current = id;
    return id;
  }, []);

  const updateMessageContent = useCallback(
    (messageId: string, newContent: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.versions.some((v) => v.id === messageId)) {
            return {
              ...msg,
              versions: msg.versions.map((v) =>
                v.id === messageId ? { ...v, content: newContent } : v
              ),
            };
          }
          return msg;
        })
      );
    },
    []
  );

  const updateAssistantTools = useCallback(
    (assistantMessageId: string, fn: (tools: ToolEntry[]) => ToolEntry[]) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.versions.some((v) => v.id === assistantMessageId))
            return msg;
          const nextTools = fn(msg.tools ?? []);
          return { ...msg, tools: nextTools };
        })
      );
    },
    []
  );

  const updateAssistantReasoning = useCallback(
    (assistantMessageId: string, appendContent: string, durationMs?: number) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.versions.some((v) => v.id === assistantMessageId))
            return msg;
          const prevReasoning = msg.reasoning?.content ?? "";
          return {
            ...msg,
            reasoning: {
              content: prevReasoning + appendContent,
              duration: durationMs ?? msg.reasoning?.duration ?? 0,
            },
          };
        })
      );
    },
    []
  );

  const updateAssistantSources = useCallback(
    (
      assistantMessageId: string,
      newSources: { href: string; title: string }[]
    ) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.versions.some((v) => v.id === assistantMessageId))
            return msg;
          const existing = msg.sources ?? [];
          const seen = new Set(existing.map((s) => s.href));
          const added = newSources.filter((s) => !seen.has(s.href));
          return { ...msg, sources: [...existing, ...added] };
        })
      );
    },
    []
  );

  const runStream = useCallback(
    async (
      userMessage: MessageType,
      assistantMessageId: string,
      body: { id: string; messageId: string; messages: unknown[] }
    ) => {
      setStreamError(null);
      abortRef.current?.abort("new request");
      const abort = new AbortController();
      abortRef.current = abort;

      const res = await fetch(STREAM_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abort.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        setStreamError(errText || `Stream failed (${res.status})`);
        setStatus("error");
        return;
      }

      setStatus("streaming");
      setLivePhase("Thinking…");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      const applyText = (delta: string) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (!m.versions.some((v) => v.id === assistantMessageId))
              return m;
            const v = m.versions[0];
            if (!v) return m;
            return {
              ...m,
              versions: [{ ...v, content: v.content + delta }],
            };
          })
        );
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });

          for (;;) {
            const sep = buf.indexOf("\n\n");
            if (sep === -1) break;
            const rawEvent = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            const dataLines = rawEvent
              .split("\n")
              .filter((l) => l.startsWith("data: "))
              .map((l) => l.slice(6));
            if (dataLines.length === 0) continue;
            const dataStr = dataLines.join("\n");
            if (!dataStr || dataStr === "[DONE]") continue;
            let evt: unknown;
            try {
              evt = JSON.parse(dataStr);
            } catch {
              continue;
            }
            if (!isRecord(evt)) continue;
            const evtType =
              typeof evt["type"] === "string" ? (evt["type"] as string) : "";
            if (
              typeof window !== "undefined" &&
              (localStorage.getItem("voltagent-debug") === "true" ||
                (window as unknown as { __VOLTAGENT_DEBUG__?: boolean }).__VOLTAGENT_DEBUG__)
            ) {
              const summary =
                evtType === "text-delta"
                  ? { type: evtType, length: (evt["text"] as string)?.length ?? 0 }
                  : { type: evtType, ...evt };
              console.log("[VoltAgent stream]", summary);
            }
            switch (evtType) {
              case "start":
              case "start-step": {
                setLivePhase("Thinking…");
                break;
              }
              case "text-delta": {
                setLivePhase("Responding…");
                const delta =
                  typeof evt["text"] === "string" ? (evt["text"] as string) : "";
                if (delta) applyText(delta);
                break;
              }
              case "tool-call": {
                const toolCallId =
                  typeof evt["toolCallId"] === "string"
                    ? (evt["toolCallId"] as string)
                    : "";
                const toolName =
                  typeof evt["toolName"] === "string"
                    ? (evt["toolName"] as string)
                    : "tool";
                if (toolCallId) {
                  setLivePhase(
                    toolName === "delegate_task"
                      ? "Delegating task…"
                      : `Calling tool: ${toolName}…`
                  );
                  updateAssistantTools(assistantMessageId, (tools) => [
                    ...tools,
                    {
                      toolCallId,
                      name: toolName,
                      description: "",
                      status: "call",
                      parameters: (evt["input"] as Record<string, unknown>) ?? {},
                      result: undefined,
                      error: undefined,
                    },
                  ]);
                }
                break;
              }
              case "tool-result": {
                const toolCallId =
                  typeof evt["toolCallId"] === "string"
                    ? (evt["toolCallId"] as string)
                    : "";
                const toolName =
                  typeof evt["toolName"] === "string"
                    ? (evt["toolName"] as string)
                    : "tool";
                if (toolCallId) {
                  setLivePhase(
                    toolName === "delegate_task"
                      ? "Delegate completed"
                      : `Tool completed: ${toolName}`
                  );
                  updateAssistantTools(assistantMessageId, (tools) =>
                    tools.map((t) =>
                      t.toolCallId === toolCallId
                        ? {
                            ...t,
                            status: "result" as const,
                            result:
                              typeof evt["output"] === "string"
                                ? (evt["output"] as string)
                                : JSON.stringify(evt["output"] ?? ""),
                          }
                        : t
                    )
                  );
                }
                break;
              }
              case "tool-error": {
                const toolCallId =
                  typeof evt["toolCallId"] === "string"
                    ? (evt["toolCallId"] as string)
                    : "";
                const toolName =
                  typeof evt["toolName"] === "string"
                    ? (evt["toolName"] as string)
                    : "tool";
                if (toolCallId) {
                  setLivePhase(`Tool error: ${toolName}`);
                  updateAssistantTools(assistantMessageId, (tools) =>
                    tools.map((t) =>
                      t.toolCallId === toolCallId
                        ? {
                            ...t,
                            status: "result" as const,
                            result: undefined,
                            error:
                              typeof evt["error"] === "string"
                                ? (evt["error"] as string)
                                : "Tool error",
                          }
                        : t
                    )
                  );
                }
                break;
              }
              case "error": {
                setLivePhase("Error");
                setStreamError("Stream error");
                break;
              }
              case "reasoning-delta":
              case "reasoning": {
                const content =
                  typeof evt["text"] === "string"
                    ? (evt["text"] as string)
                    : typeof evt["content"] === "string"
                      ? (evt["content"] as string)
                      : "";
                const durationMs =
                  typeof evt["duration"] === "number"
                    ? (evt["duration"] as number)
                    : undefined;
                if (content) {
                  setLivePhase("Thinking…");
                  updateAssistantReasoning(assistantMessageId, content, durationMs);
                }
                break;
              }
              case "source":
              case "sources": {
                const raw =
                  evt["sources"] ?? evt["source"] ?? evt["references"];
                const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
                const sources = arr
                  .filter(
                    (s: unknown): s is { href?: string; url?: string; title?: string } =>
                      typeof s === "object" && s !== null
                  )
                  .map((s) => ({
                    href: (s.href ?? s.url ?? "") as string,
                    title: (s.title ?? s.href ?? s.url ?? "Source") as string,
                  }))
                  .filter((s) => s.href);
                if (sources.length) updateAssistantSources(assistantMessageId, sources);
                break;
              }
              case "finish": {
                setLivePhase(null);
                break;
              }
              default:
                break;
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!abort.signal.aborted) {
          setStreamError(msg || "Stream error");
          setStatus("error");
        }
      } finally {
        setStatus("ready");
        setLivePhase(null);
        if (abortRef.current === abort) abortRef.current = null;
      }
    },
    [
      updateAssistantTools,
      updateAssistantReasoning,
      updateAssistantSources,
    ]
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim());
      const hasFiles = Boolean(message.files?.length);
      if (!hasText && !hasFiles) return;

      setStreamError(null);
      setStatus("submitted");

      const userMsgId = `user-${Date.now()}-${nanoid(6)}`;
      const assistantMsgId = `assistant-${Date.now()}-${nanoid(6)}`;

      type TextPart = { type: "text"; text: string };
      type FilePart = { type: "file"; url: string; mediaType: string; filename: string };
      const parts: (TextPart | FilePart)[] = [];
      if (message.text?.trim())
        parts.push({ type: "text", text: message.text.trim() });

      if (message.files?.length) {
        try {
          const fileParts = await Promise.all(
            message.files.map((f) =>
              filePartToDataUrl({
                url: f.url,
                mediaType: f.mediaType,
                filename: f.filename,
              })
            )
          );
          parts.push(...fileParts);
        } catch (e) {
          toast.error("Failed to read files");
          setStatus("ready");
          return;
        }
      }

      const apiUserMessage = {
        id: userMsgId,
        role: "user" as const,
        parts,
      };

      const userMessage: MessageType = {
        from: "user",
        key: userMsgId,
        versions: [
          {
            id: userMsgId,
            content:
              message.text?.trim() || (hasFiles ? "Sent with attachments" : ""),
          },
        ],
      };

      const assistantMessage: MessageType = {
        from: "assistant",
        key: assistantMsgId,
        versions: [{ id: assistantMsgId, content: "" }],
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setText("");

      await runStream(userMessage, assistantMsgId, {
        id: conversationId,
        messageId: userMsgId,
        messages: [apiUserMessage],
      });
    },
    [conversationId, runStream]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSubmit({ text: suggestion, files: [] });
    },
    [handleSubmit]
  );

  const handleTranscriptionChange = useCallback((transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
  }, []);

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    []
  );

  const isSubmitDisabled = useMemo(
    () => status === "streaming" || status === "submitted",
    [status]
  );

  return (
    <div className="relative flex size-full max-w-2xl flex-col divide-y overflow-hidden rounded-lg border border-border bg-card shadow-sm [&_.conversation-content]:text-xs [&_.conversation-content]:leading-snug [&_.message-response]:text-xs [&_.message-response]:leading-snug">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-2 p-2">
          {messages.map(({ versions, ...message }) => (
            <MessageBranch defaultBranch={0} key={message.key}>
              <MessageBranchContent>
                {versions.map((version) => (
                  <Message
                    from={message.from}
                    key={`${message.key}-${version.id}`}
                  >
                    <div>
                      {message.sources?.length ? (
                        <Sources>
                          <SourcesTrigger count={message.sources.length} />
                          <SourcesContent>
                            {message.sources.map((source) => (
                              <Source
                                href={source.href}
                                key={source.href}
                                title={source.title}
                              />
                            ))}
                          </SourcesContent>
                        </Sources>
                      ) : null}
                      {message.reasoning ? (
                        <Reasoning duration={message.reasoning.duration}>
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {message.reasoning.content}
                          </ReasoningContent>
                        </Reasoning>
                      ) : null}
                      <MessageContent>
                        <MessageResponse>{version.content}</MessageResponse>
                      </MessageContent>
                    </div>
                  </Message>
                ))}
              </MessageBranchContent>
              {versions.length > 1 ? (
                <MessageBranchSelector>
                  <MessageBranchPrevious />
                  <MessageBranchPage />
                  <MessageBranchNext />
                </MessageBranchSelector>
              ) : null}
            </MessageBranch>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-2 pt-2">
        {streamError && (
          <div className="mx-2 rounded-md bg-destructive/15 px-3 py-2 text-xs text-destructive">
            {streamError}
          </div>
        )}
        {livePhase && (
          <div className="mx-2 flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-primary" />
            {livePhase}
          </div>
        )}
        <Suggestions className="px-2 text-xs">
          {suggestions.map((suggestion) => (
            <SuggestionItem
              key={suggestion}
              onClick={handleSuggestionClick}
              suggestion={suggestion}
            />
          ))}
        </Suggestions>
        <div className="w-full px-2 pb-2">
          <PromptInput
            className="[&_textarea]:min-h-[60px] [&_textarea]:text-xs [&_button]:size-7 [&_button]:text-xs"
            globalDrop
            multiple
            onSubmit={handleSubmit}
          >
            <PromptInputHeader>
              <PromptInputAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea onChange={handleTextChange} value={text} />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <SpeechInput
                  className="shrink-0"
                  onTranscriptionChange={handleTranscriptionChange}
                  size="icon-sm"
                  variant="ghost"
                />
              </PromptInputTools>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
