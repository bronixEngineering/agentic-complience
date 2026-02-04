"use client";

import { useState } from "react";
import { Check, X, Edit2, Package, Users, Target, Palette, Sparkles, Loader2 } from "lucide-react";
import { GenerationLoading } from "@/components/generation-loading";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ApprovalComponentProps {
  projectId: string;
  executionId: string;
  dbExecutionId: string;
  enhancedBrief: any;
  onComplete: (images: any[]) => void;
  onReSuspend?: (newBrief: any) => void;
  onCancel?: () => void;
  onExpired?: () => void; // Called when workflow state expired (VoltAgent restart)
}

export function ApprovalComponent({ 
    projectId,
    executionId, 
    dbExecutionId,
    enhancedBrief, 
    onComplete,
    onReSuspend,
    onCancel,
    onExpired
}: ApprovalComponentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string>("product");

  // Define sections with icons
  const sections = [
    { 
      key: "product", 
      label: "Product Context", 
      icon: Package,
      data: enhancedBrief?.product 
    },
    { 
      key: "target_audience", 
      label: "Target Audience", 
      icon: Users,
      data: enhancedBrief?.target_audience 
    },
    { 
      key: "goal", 
      label: "Campaign Goal", 
      icon: Target,
      data: enhancedBrief?.goal 
    },
    { 
      key: "visual_direction", 
      label: "Visual Direction", 
      icon: Palette,
      data: enhancedBrief?.visual_direction 
    },
  ].filter(section => section.data); // Only show sections that have data

  const handleAction = async (approved: boolean) => {
    setIsProcessing(true);
    setError(null);
    
    // For approval, call resume API and wait for workflow to complete
    if (approved) {
      try {
        // Step 1: Resume the workflow
        const res = await fetch("/api/nanobanana/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            executionId,
            dbExecutionId,
            approved,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          
          if (errData.errorCode === "WORKFLOW_STATE_EXPIRED" || res.status === 410) {
            setIsExpired(true);
            setError("This workflow session has expired. VoltAgent may have been restarted. Please start a new generation.");
            setIsProcessing(false);
            return;
          }
          
          throw new Error(errData.error || "Failed to resume workflow");
        }

        const data = await res.json();
        
        // If workflow completed immediately with images, go to results
        if (data.status === "completed" && data.images?.length > 0) {
          onComplete(data.images);
          return;
        }
        
        // If workflow is running, poll until complete (with longer intervals)
        if (data.status === "running") {
          const maxWaitTime = 3 * 60 * 1000; // 3 minutes max
          const startTime = Date.now();
          
          // Poll with increasing intervals: 5s, 8s, 10s, 15s...
          const intervals = [5000, 8000, 10000, 15000, 15000, 15000, 15000, 15000];
          let pollIndex = 0;
          
          const pollForCompletion = async (): Promise<boolean> => {
            if (Date.now() - startTime > maxWaitTime) {
              throw new Error("Generation timed out. Please check results page.");
            }
            
            const statusRes = await fetch(`/api/nanobanana/status?projectId=${projectId}`);
            const statusData = await statusRes.json();
            
            if (statusData.images?.length > 0) {
              onComplete(statusData.images);
              return true;
            }
            
            if (statusData.status === "completed") {
              onComplete([]);
              return true;
            }
            
            if (statusData.status === "failed") {
              throw new Error("Generation failed. Please try again.");
            }
            
            return false; // Keep polling
          };
          
          // Start polling loop
          while (true) {
            await new Promise(resolve => setTimeout(resolve, intervals[Math.min(pollIndex, intervals.length - 1)]));
            pollIndex++;
            
            const isDone = await pollForCompletion();
            if (isDone) return;
          }
        }

        // Fallback - just go to results
        onComplete([]);
        return;
        
      } catch (err) {
        console.error("Resume error:", err);
        setError(err instanceof Error ? err.message : "Failed to process approval");
        setIsProcessing(false);
        return;
      }
    }
    
    // For rejection, we need to wait for the response
    try {
      const res = await fetch("/api/nanobanana/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId,
          dbExecutionId,
          approved,
          feedback: feedback,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        
        // Handle expired workflow state (VoltAgent was restarted)
        if (errData.errorCode === "WORKFLOW_STATE_EXPIRED" || res.status === 410) {
          setIsExpired(true);
          setError("This workflow session has expired. VoltAgent may have been restarted. Please start a new generation.");
          return;
        }
        
        throw new Error(errData.error || "Failed to resume workflow");
      }

      const data = await res.json();
      
      // Handle different response scenarios
      if (data.status === "suspended" && data.requiresApproval) {
        // Workflow re-suspended with new enhanced brief (rejection feedback loop)
        setIsRejecting(false);
        setFeedback("");
        onReSuspend?.(data.enhancedBrief);
      } else {
        // For all other cases (running, completed, etc), redirect to results page
        onComplete([]);
      }

    } catch (err) {
      console.error("Resume error:", err);
      setError(err instanceof Error ? err.message : "Failed to process approval");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing && !isRejecting) {
    return <GenerationLoading />;
  }

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-yellow-500 flex items-center gap-2 text-base">
           <Edit2 className="size-4" />
           Review Enhanced Brief
        </CardTitle>
        <CardDescription>
          The AI has enhanced your brief. Please approve it to generate images, or provide feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
            <p>{error}</p>
            {isExpired && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => {
                  onExpired?.();
                }}
              >
                Start Fresh
              </Button>
            )}
          </div>
        )}
        
        {/* Render Structured Brief with Side Navigation */}
        {enhancedBrief && typeof enhancedBrief === 'object' && sections.length > 0 ? (
            <div className="flex gap-6 h-[500px]">
                {/* Left Sidebar - Section Navigation */}
                <div className="w-64 flex-shrink-0 space-y-2 overflow-y-auto">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = selectedSection === section.key;
                    
                    return (
                      <button
                        key={section.key}
                        onClick={() => setSelectedSection(section.key)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="size-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{section.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Right Content - Selected Section Details */}
                <div className="flex-1 min-w-0 h-full">
                  {sections.map((section) => {
                    if (selectedSection !== section.key) return null;
                    
                    const Icon = section.icon;
                    
                    return (
                      <div key={section.key} className="rounded-lg border bg-card shadow-sm h-full flex flex-col">
                        <div className="flex items-center gap-2 p-6 pb-4 border-b flex-shrink-0">
                          <Icon className="size-5 text-primary" />
                          <h4 className="font-semibold text-lg text-primary">{section.label}</h4>
                        </div>
                        
                        <div className="space-y-3 text-sm p-6 pt-4 overflow-y-auto flex-1">
                          {section.data && typeof section.data === 'object' && Object.entries(section.data).map(([k, v]) => {
                            // Handle nested objects (like in visual_direction)
                            if (typeof v === 'object' && v !== null) {
                              return (
                                <div key={k} className="space-y-1.5">
                                  <span className="capitalize font-semibold text-foreground block">
                                    {k.replace(/_/g, ' ')}
                                  </span>
                                  <ul className="space-y-1 pl-4 border-l-2 border-muted">
                                    {Object.entries(v as any).map(([subK, subV]) => (
                                      <li key={subK} className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{subK}:</span> {String(subV)}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={k} className="flex flex-col gap-1">
                                <span className="capitalize font-semibold text-foreground">
                                  {k.replace(/_/g, ' ')}
                                </span>
                                <span className="text-muted-foreground leading-relaxed">{String(v)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
            </div>
        ) : (
            <div className="rounded-md bg-black/40 p-4 font-mono text-xs text-muted-foreground overflow-auto max-h-[300px]">
                <pre>{JSON.stringify(enhancedBrief, null, 2)}</pre>
            </div>
        )}

        {isRejecting && (
            <div className="space-y-2 pt-4 border-t border-border">
                <label className="text-sm font-medium">What should be changed?</label>
                <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="E.g., Make the tone more professional, remove the blue background..."
                    value={feedback}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                />
            </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        {!isRejecting ? (
            <>
                <Button 
                    variant="ghost" 
                    onClick={() => setIsRejecting(true)}
                    disabled={isProcessing}
                >
                    <X className="mr-2 size-4" />
                    Reject / Edit
                </Button>
                <Button 
                    onClick={() => handleAction(true)}
                    disabled={isProcessing}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                    {isProcessing ? (
                      <>
                        <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 size-4" />
                        Approve & Generate
                      </>
                    )}
                </Button>
            </>
        ) : (
            <>
                <Button 
                    variant="ghost" 
                    onClick={() => setIsRejecting(false)}
                    disabled={isProcessing}
                >
                    Cancel
                </Button>
                <Button 
                    variant="destructive"
                    onClick={() => handleAction(false)}
                    disabled={isProcessing || !feedback.trim()}
                >
                    {isProcessing ? (
                      <>
                        <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Submit Feedback"
                    )}
                </Button>
            </>
        )}
      </CardFooter>
    </Card>
  );
}
