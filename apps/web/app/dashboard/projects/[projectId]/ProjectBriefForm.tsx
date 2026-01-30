"use client";

import { useRef, useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Globe, Megaphone, MoreHorizontal, Rocket, Users, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { updateProjectBrief } from "@/app/actions/projects";

type BriefChannels = {
  platforms?: string[];
  other?: string;
};

type StructuredBrief = {
  mode?: "form" | "plain";
  raw?: string;
  aspectRatio?: string;
  background?: string;
  objective?: string;
  targetAudience?: string;
  insights?: string;
  brandVoiceTone?: string;
  keyMessage?: string;
  deliverables?: string;
  mandatories?: string;
  competitors?: string;
  budget?: string;
  channels?: BriefChannels;
};

// Backward compatibility (legacy v0 brief)
type LegacyBrief = {
  purpose?: string;
  style?: string;
  notes?: string;
};

type Brief = StructuredBrief & LegacyBrief;

const PLATFORM_OPTIONS = [
  { value: "Meta", label: "Meta (Facebook/Instagram)" },
  { value: "TikTok", label: "TikTok" },
  { value: "YouTube", label: "YouTube" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "X", label: "X" },
  { value: "Website", label: "Website / Landing page" },
  { value: "Other", label: "Other" },
] as const;

const ASPECT_RATIO_OPTIONS = [
  { value: "16:9", label: "16:9 (Landscape)" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:3", label: "4:3 (Standard)" },
  { value: "21:9", label: "21:9 (Ultrawide)" },
] as const;

function MetaIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M7.4 18.2c-2.2 0-4-2.4-4-6.2 0-5 2.2-8 4.7-8 2 0 3.4 1.7 5 4.5 1.6-2.8 3-4.5 5-4.5 2.5 0 4.7 3 4.7 8 0 3.8-1.8 6.2-4 6.2-2.2 0-4-2.2-5.7-5.2-1.7 3-3.5 5.2-5.7 5.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TikTokIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M14 4c.3 2.7 2.1 4.6 4.8 4.9V11c-1.8 0-3.3-.6-4.6-1.8V14c0 3.1-2.4 5.5-5.5 5.5S3.2 17.1 3.2 14 5.6 8.5 8.7 8.5c.5 0 1 .1 1.4.2V11c-.4-.2-.9-.3-1.4-.3-1.7 0-3.1 1.4-3.1 3.1S7 16.9 8.7 16.9s3.1-1.4 3.1-3.1V4h2.2Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  );
}

function YouTubeIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="3.5"
        y="7"
        width="17"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M11 10.2v3.6l3.2-1.8L11 10.2Z" fill="currentColor" />
    </svg>
  );
}

function LinkedInIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <text
        x="8"
        y="16"
        fontSize="8.5"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        fill="currentColor"
        fontWeight="700"
      >
        in
      </text>
    </svg>
  );
}

function XIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <text
        x="8.2"
        y="16.5"
        fontSize="10"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        fill="currentColor"
        fontWeight="800"
      >
        X
      </text>
    </svg>
  );
}

function PlatformIcon({ platform }: { platform: (typeof PLATFORM_OPTIONS)[number]["value"] }) {
  switch (platform) {
    case "Meta":
      return <MetaIcon className="size-4 shrink-0 text-[#0866FF]" aria-hidden="true" />;
    case "TikTok":
      return <TikTokIcon className="size-4 shrink-0 text-[#FE2C55]" aria-hidden="true" />;
    case "YouTube":
      return <YouTubeIcon className="size-4 shrink-0 text-[#FF0000]" aria-hidden="true" />;
    case "LinkedIn":
      return <LinkedInIcon className="size-4 shrink-0 text-[#0A66C2]" aria-hidden="true" />;
    case "X":
      return (
        <XIcon
          className="size-4 shrink-0 text-[#111827] dark:text-[#E5E7EB]"
          aria-hidden="true"
        />
      );
    case "Website":
      return <Globe className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
    case "Other":
      return <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
    default:
      return null;
  }
}

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "resize-y min-h-[110px]",
        className
      )}
      {...props}
    />
  );
}

const FORM_STEPS = [
  { key: "context", title: "Context", subtitle: "Background & objective", Icon: FileText },
  { key: "audience", title: "Audience", subtitle: "Target & insights", Icon: Users },
  { key: "messaging", title: "Messaging", subtitle: "Message & mandatories", Icon: Megaphone },
  { key: "execution", title: "Execution", subtitle: "Deliverables & channels", Icon: Rocket },
] as const;

const METHOD_STEP = {
  key: "method",
  title: "Method",
  subtitle: "Choose plain text or form",
  Icon: MoreHorizontal,
} as const;

const PLAIN_STEP = {
  key: "plain",
  title: "Plain text",
  subtitle: "Paste plain text",
  Icon: FileText,
} as const;

export function ProjectBriefForm({
  projectId,
  initialBrief,
}: {
  projectId: string;
  initialBrief?: Brief | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [stepIndex, setStepIndex] = useState(0);
  
  // Generation loading state
  const [isGenerating, setIsGenerating] = useState(false);

  // Workflow State (for tracking during generation)
  const [executionData, setExecutionData] = useState<{
      executionId?: string;
      dbExecutionId?: string;
      status?: string;
  } | null>(null);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);

  // Polling for workflow status when running
  const checkStatus = useCallback(async () => {
    if (!executionData?.executionId) return null;
    
    try {
      const params = new URLSearchParams({
        voltExecutionId: executionData.executionId,
        ...(executionData.dbExecutionId && { dbExecutionId: executionData.dbExecutionId }),
      });
      
      const res = await fetch(`/api/nanobanana/status?${params}`);
      if (!res.ok) return null;
      
      return await res.json();
    } catch (e) {
      console.error("Status check failed:", e);
      return null;
    }
  }, [executionData?.executionId, executionData?.dbExecutionId]);

  // Poll when status is "running"
  useEffect(() => {
    if (executionData?.status !== "running") {
      setPollingMessage(null);
      return;
    }

    setPollingMessage("AI is enhancing your brief...");
    let pollCount = 0;
    const maxPolls = 60; // Max 60 polls (2 minutes with 2s interval)

    const pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount > maxPolls) {
        clearInterval(pollInterval);
        setPollingMessage(null);
        setError("Workflow is taking too long. Please refresh and check again.");
        return;
      }

      // Update message based on poll count
      if (pollCount > 10) {
        setPollingMessage("Still processing... this may take a moment");
      } else if (pollCount > 5) {
        setPollingMessage("Enhancing and analyzing your brief...");
      }

      const statusData = await checkStatus();
      
      if (!statusData) return;
      
      if (statusData.status === "suspended") {
        clearInterval(pollInterval);
        setPollingMessage(null);
        // Redirect to approval page
        router.push(`/dashboard/projects/${projectId}/approval`);
      } else if (statusData.status === "completed") {
        clearInterval(pollInterval);
        setPollingMessage(null);
        // Redirect to results page
        router.push(`/dashboard/projects/${projectId}/results`);
      } else if (statusData.status === "failed") {
        clearInterval(pollInterval);
        setPollingMessage(null);
        setError("Workflow failed. Please try again.");
        setExecutionData(null);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [executionData?.status, checkStatus, router, projectId]);

  const brief = initialBrief ?? {};

  const initialMode: "form" | "plain" = "plain";
  const [mode, setMode] = useState<"form" | "plain">(initialMode);

  const defaultObjective = brief.objective ?? brief.purpose ?? "";
  const defaultTone = brief.brandVoiceTone ?? brief.style ?? "";
  const defaultInsights = brief.insights ?? brief.notes ?? "";

  const defaultPlatform = brief.channels?.platforms?.[0] ?? "";
  const [selectedPlatform, setSelectedPlatform] = useState<string>(defaultPlatform);
  const [platformOther, setPlatformOther] = useState<string>(
    brief.channels?.other ?? ""
  );

  const otherChecked = selectedPlatform === "Other";

  const steps =
    mode === "plain"
      ? [METHOD_STEP, PLAIN_STEP]
      : [METHOD_STEP, ...FORM_STEPS];

  const activeStep = steps[stepIndex] ?? steps[0]!;

  const selectPlatform = (value: string) => {
    setSelectedPlatform(value);
  };

  const goNext = () => {
    setError(null);

    const form = formRef.current;
    if (!form) {
      setStepIndex((s) => Math.min(steps.length - 1, s + 1));
      return;
    }

    const fd = new FormData(form);

    // Method selection step: just advance to next step
    if (activeStep.key === "method") {
      setStepIndex((s) => Math.min(steps.length - 1, s + 1));
      return;
    }

    if (mode === "plain" && activeStep.key === "plain") {
      const raw = (fd.get("rawBrief") as string | null) ?? "";
      if (!raw.trim()) {
        setError("Brief text is required");
        return;
      }
      setStepIndex((s) => Math.min(steps.length - 1, s + 1));
      return;
    }

    if (mode === "form" && activeStep.key === "context") {
      const objective = (fd.get("objective") as string | null) ?? "";
      if (!objective.trim()) {
        setError("Objective is required");
        return;
      }
    }

    setStepIndex((s) => Math.min(steps.length - 1, s + 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((s) => Math.max(0, s - 1));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await updateProjectBrief(projectId, formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="briefMode" value={mode} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold tracking-tight">Creative brief</div>
          <div className="text-muted-foreground text-sm">
            Step {stepIndex + 1} of {steps.length} — {activeStep.subtitle}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {steps.map((s, idx) => {
            const n = idx + 1;
            const active = stepIndex === idx;
            const done = stepIndex > idx;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setError(null);
                  setStepIndex(idx);
                }}
                className={cn(
                  "hover:bg-muted/30 flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                  active ? "border-primary/40 bg-muted/20" : "border-muted/60"
                )}
              >
                <Badge variant={done ? "success" : active ? "default" : "secondary"}>
                  {n}
                </Badge>
                <div className="leading-tight">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <s.Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>{s.title}</span>
                  </div>
                  <div className="text-muted-foreground text-xs">{s.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {error && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-muted/60 bg-muted/10 backdrop-blur-sm p-4 transition-all duration-200">
        <div className={activeStep.key === "method" ? "block space-y-6" : "hidden space-y-6"} aria-hidden={activeStep.key !== "method"}>
          <div className="text-center">
            <div className="text-lg font-semibold leading-none">How would you like to create your brief?</div>
            <div className="text-muted-foreground mt-2 text-sm">
              Choose the method that works best for you. You can change this later.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMode("plain");
                setError(null);
              }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 backdrop-blur-sm",
                "hover:shadow-lg hover:scale-[1.02]",
                mode === "plain" 
                  ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20" 
                  : "border-muted/60 hover:border-primary/40 hover:bg-muted/20"
              )}
            >
              <div className="relative z-10 space-y-4">
                <div className={cn(
                  "flex size-14 items-center justify-center rounded-2xl border-2 transition-all",
                  mode === "plain"
                    ? "border-primary/30 bg-primary/10"
                    : "border-muted/60 bg-muted/20 group-hover:border-primary/30 group-hover:bg-primary/5"
                )}>
                  <FileText className={cn(
                    "size-7 transition-colors",
                    mode === "plain" ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-base font-semibold transition-colors",
                      mode === "plain" && "text-primary"
                    )}>
                      Plain Text Brief
                    </div>
                    {mode === "plain" && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground text-sm leading-relaxed">
                    Perfect if you already have your brief written. Just paste it as plain text and you're done.
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>Fastest option</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>Flexible formatting</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>Copy from existing docs</span>
                  </div>
                </div>
              </div>
            </button>

              <button
                type="button"
                disabled={true}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200 backdrop-blur-sm opacity-60 cursor-not-allowed",
                  "border-muted/60 bg-muted/10"
                )}
              >
              <div className="relative z-10 space-y-4">
                <div className={cn(
                  "flex size-14 items-center justify-center rounded-2xl border-2 transition-all",
                  mode === "form"
                    ? "border-primary/30 bg-primary/10"
                    : "border-muted/60 bg-muted/20 group-hover:border-primary/30 group-hover:bg-primary/5"
                )}>
                  <Rocket className={cn(
                    "size-7 transition-colors",
                    mode === "form" ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-base font-semibold transition-colors",
                      mode === "form" && "text-primary"
                    )}>
                      Guided Form
                    </div>
                    <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
                  </div>
                  <div className="text-muted-foreground text-sm leading-relaxed">
                    Starting from scratch? Answer structured questions step-by-step to build a complete brief.
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>Structured approach</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>No information missed</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="bg-muted flex size-5 items-center justify-center rounded">✓</div>
                    <span>Clear guidance at each step</span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

          <div className={activeStep.key === "plain" ? "block space-y-4" : "hidden space-y-4"} aria-hidden={activeStep.key !== "plain"}>
            <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="rawBrief">Plain Text Brief</Label>
              <Badge variant="outline">Required</Badge>
            </div>
            <Textarea
              id="rawBrief"
              name="rawBrief"
              rows={12}
              placeholder={`Paste your brief here.\n\nExample:\n## Background\n...\n\n## Objective\n...\n\n## Target audience\n...`}
              defaultValue={brief.raw ?? ""}
              disabled={isPending}
              required={mode === "plain"}
            />
              <div className="grid gap-2">
              <Label htmlFor="aspectRatio">Aspect Ratio</Label>
              <div className="relative">
                <select
                  id="aspectRatio"
                  name="aspectRatio"
                  defaultValue={brief.aspectRatio ?? "16:9"}
                  disabled={isPending}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                  )}
                >
                  {ASPECT_RATIO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={activeStep.key === "context" ? "block space-y-4" : "hidden space-y-4"} aria-hidden={activeStep.key !== "context"}>
          <div className="grid gap-2">
            <Label htmlFor="background">Background</Label>
            <Textarea
              id="background"
              name="background"
              rows={5}
              placeholder="Company/product context, what’s happening, why now."
              defaultValue={brief.background ?? ""}
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="objective">Objective</Label>
              <Badge variant="outline">Required</Badge>
            </div>
            <Textarea
              id="objective"
              name="objective"
              rows={4}
              placeholder="What do we need to achieve? (awareness, conversions, retention, etc.)"
              defaultValue={defaultObjective}
              disabled={isPending}
              required
            />
          </div>
        </div>

        <div className={activeStep.key === "audience" ? "block space-y-4" : "hidden space-y-4"} aria-hidden={activeStep.key !== "audience"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="targetAudience">Target audience</Label>
              <Textarea
                id="targetAudience"
                name="targetAudience"
                rows={5}
                placeholder="Who are we trying to reach? Demographics + psychographics."
                defaultValue={brief.targetAudience ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brandVoiceTone">Brand voice / tone</Label>
              <Input
                id="brandVoiceTone"
                name="brandVoiceTone"
                placeholder="e.g. Compassionate, humorous, confident, premium."
                defaultValue={defaultTone}
                disabled={isPending}
              />
              <div className="text-muted-foreground text-xs">
                Tip: a few adjectives is enough.
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insights">Mindset / insights</Label>
            <Textarea
              id="insights"
              name="insights"
              rows={5}
              placeholder="Key audience insight, tension, motivations, barriers."
              defaultValue={defaultInsights}
              disabled={isPending}
            />
          </div>
        </div>

        <div className={activeStep.key === "messaging" ? "block space-y-4" : "hidden space-y-4"} aria-hidden={activeStep.key !== "messaging"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="keyMessage">Key message</Label>
              <Textarea
                id="keyMessage"
                name="keyMessage"
                rows={5}
                placeholder="The single-minded thought / main message."
                defaultValue={brief.keyMessage ?? ""}
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mandatories">Mandatories</Label>
              <Textarea
                id="mandatories"
                name="mandatories"
                rows={5}
                placeholder="Logos, taglines, disclaimers, legal copy, CTAs, etc."
                defaultValue={brief.mandatories ?? ""}
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        <div className={activeStep.key === "execution" ? "block space-y-4" : "hidden space-y-4"} aria-hidden={activeStep.key !== "execution"}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="deliverables">Deliverables / execution requirements</Label>
              <Textarea
                id="deliverables"
                name="deliverables"
                rows={4}
                placeholder="What needs to be produced? Any formats, sizes, timelines?"
                defaultValue={brief.deliverables ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="competitors">Competitors</Label>
              <Textarea
                id="competitors"
                name="competitors"
                rows={4}
                placeholder="Key competitors or alternatives."
                defaultValue={brief.competitors ?? ""}
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget">Budget</Label>
              <Input
                id="budget"
                name="budget"
                placeholder="e.g. $100,000"
                defaultValue={brief.budget ?? ""}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <div className="text-sm font-medium leading-none">Channels</div>
              <div className="text-muted-foreground mt-1 text-sm">
                Select platforms where this will run.
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                    selectedPlatform === opt.value
                  ? "border-primary/40 bg-muted/30"
                  : "border-muted/60 bg-muted/10"
              )}
            >
              <input
                type="radio"
                name="platforms"
                value={opt.value}
                checked={selectedPlatform === opt.value}
                onChange={() => selectPlatform(opt.value)}
                disabled={isPending}
                className="h-4 w-4 rounded-full border border-input bg-background"
              />
              <PlatformIcon platform={opt.value} />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>

        {otherChecked && (
              <div className="grid gap-2">
                <Label htmlFor="platformOther">Other platform</Label>
                <Input
                  id="platformOther"
                  name="platformOther"
                  placeholder="e.g. Snapchat, Pinterest, Reddit"
                  value={platformOther}
                  onChange={(e) => setPlatformOther(e.target.value)}
                  disabled={isPending}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={goBack}
          disabled={isPending || stepIndex === 0}
        >
          Back
        </Button>

        <div className="flex items-center gap-2">
          {activeStep.key === "method" ? (
            <Button type="button" onClick={goNext} disabled={isPending}>
              Continue with {mode === "plain" ? "Plain Text" : "Guided Form"}
            </Button>
          ) : mode === "plain" ? (
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} variant="secondary">
                {isPending ? "Saving..." : "Save Draft"}
              </Button>
            {/* 
                Only show Generate button if brief has content (checked via default value for now, 
                ideally state checks if saved). 
                For MVP, we assume user saves first, or we can trigger both. 
                Simpler: Trigger BOTH save and generate? 
                Or just a separate button "Save & Generate".
            */}
              <Button 
                type="button" 
                variant="default"
                disabled={isGenerating || isPending}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-purple-900/20 disabled:opacity-50"
                onClick={async () => {
                   // 1. Get current values
                   const form = formRef.current;
                   if (!form) return;
                   const fd = new FormData(form);
                   const prompt = fd.get("rawBrief") as string;
                   const ratio = fd.get("aspectRatio") as string;

                   if (!prompt || prompt.length < 10) {
                       setError("Please enter a brief before generating.");
                       return;
                   }

                   // Clear previous state before starting new generation
                   setError(null);
                   setIsGenerating(true);
                   setExecutionData(null);
                   
                   try {
                       // Save first (optional, but good practice)
                       await updateProjectBrief(projectId, fd);

                       // Call Generation API
                       const res = await fetch("/api/nanobanana", {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({
                               projectId,
                               prompt,
                               aspect_ratio: ratio
                           })
                       });
                       
                       if (!res.ok) {
                           const errData = await res.json().catch(() => ({}));
                           throw new Error(errData.error || "Generation failed to start");
                       }
                       
                       const data = await res.json();
                       console.log("[ProjectBriefForm] Full API Response:", JSON.stringify(data, null, 2));
                       
                       // Extract status - normalize to lowercase
                       let workflowStatus = data.status || "running";
                       if (typeof workflowStatus === "string") {
                           workflowStatus = workflowStatus.toLowerCase();
                       }
                       
                       console.log("[ProjectBriefForm] Parsed status:", workflowStatus);
                       console.log("[ProjectBriefForm] Has enhancedBrief:", !!data.enhancedBrief);
                       console.log("[ProjectBriefForm] requiresApproval:", data.requiresApproval);
                       
                       // Handle immediate status responses
                       if (workflowStatus === "suspended" && data.enhancedBrief) {
                           console.log("[ProjectBriefForm] Workflow SUSPENDED - redirecting to approval page");
                           router.push(`/dashboard/projects/${projectId}/approval`);
                           return;
                       } else if (workflowStatus === "completed") {
                           console.log("[ProjectBriefForm] Workflow COMPLETED - redirecting to results page");
                           router.push(`/dashboard/projects/${projectId}/results`);
                           return;
                       } else if (workflowStatus === "running") {
                           console.log("[ProjectBriefForm] Workflow RUNNING - starting polling");
                           // Update state to trigger polling
                           setExecutionData({
                               executionId: data.voltExecutionId,
                               dbExecutionId: data.executionId,
                               status: workflowStatus,
                           });
                       } else {
                           console.log("[ProjectBriefForm] Unknown status:", workflowStatus);
                           setExecutionData({
                               executionId: data.voltExecutionId,
                               dbExecutionId: data.executionId,
                               status: workflowStatus,
                           });
                       }

                   } catch (e) {
                       setError("Failed to start AI generation: " + String(e));
                   } finally {
                       setIsGenerating(false);
                   }
                }}
              >
                {isGenerating ? (
                  <>
                    <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting AI...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 size-4" />
                    Save & Generate
                  </>
                )}
              </Button>
            </div>
          ) : stepIndex < steps.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={isPending}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save brief"}
            </Button>
          )}
        </div>
      </div>

       {/* Debug: Current execution state */}
       {executionData && (
           <div className="mt-4 p-2 rounded bg-muted/50 text-xs font-mono">
               <div>Status: <span className="text-primary">{executionData.status}</span></div>
               <div>VoltID: {executionData.executionId || "none"}</div>
               <div>DBID: {executionData.dbExecutionId || "none"}</div>
           </div>
       )}

       {/* Workflow Status Display */}
       {executionData && executionData.status === "running" && (
           <div className="mt-8">
               <div className="rounded-xl border border-blue-500/50 bg-blue-500/5 p-6">
                   <div className="flex items-center gap-4">
                       <div className="flex size-12 items-center justify-center rounded-full bg-blue-500/20">
                           <Loader2 className="size-6 animate-spin text-blue-500" />
                       </div>
                       <div>
                           <h3 className="font-semibold text-blue-500">Workflow Running</h3>
                           <p className="text-sm text-muted-foreground">
                               {pollingMessage || "Processing your brief..."}
                           </p>
                       </div>
                   </div>
                   <div className="mt-4 flex gap-2">
                       <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-500/20">
                           <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500" 
                                style={{ animation: "pulse 1.5s ease-in-out infinite, shimmer 2s ease-in-out infinite" }} />
                       </div>
                   </div>
               </div>
           </div>
       )}

    </form>
  );
}
