"use client";

import { useState } from "react";
import { Check, X, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface ApprovalComponentProps {
  executionId: string;
  dbExecutionId: string;
  enhancedBrief: any;
  onComplete: (images: any[]) => void;
  onReSuspend?: (newBrief: any) => void;
  onCancel?: () => void;
  onExpired?: () => void; // Called when workflow state expired (VoltAgent restart)
}

export function ApprovalComponent({ 
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

  const handleAction = async (approved: boolean) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const res = await fetch("/api/nanobanana/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executionId,
          dbExecutionId,
          approved,
          feedback: approved ? undefined : feedback,
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
      } else if (data.images && data.images.length > 0) {
        // Workflow completed with images
        onComplete(data.images);
      } else if (data.status === "completed") {
        // Completed but no images (edge case)
        onComplete([]);
      } else {
        // Unknown state - treat as cancelled
        onCancel?.();
      }

    } catch (err) {
      console.error("Resume error:", err);
      setError(err instanceof Error ? err.message : "Failed to process approval");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/5">
      <CardHeader>
        <CardTitle className="text-yellow-500 flex items-center gap-2">
           <Edit2 className="size-5" />
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
        
        {/* Render Structured Brief if possible */}
        {enhancedBrief && typeof enhancedBrief === 'object' ? (
            <div className="grid gap-4 text-sm">
                
                {/* Product Section */}
                {enhancedBrief.product && (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <h4 className="font-semibold mb-2 text-primary">Product Context</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                            {Object.entries(enhancedBrief.product).map(([k, v]) => (
                                <div key={k}>
                                    <span className="capitalize font-medium text-foreground">{k.replace(/_/g, ' ')}:</span> {String(v)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                    {/* Audience */}
                    {enhancedBrief.target_audience && (
                         <div className="rounded-lg border bg-card p-3 shadow-sm">
                            <h4 className="font-semibold mb-2 text-primary">Target Audience</h4>
                            <div className="space-y-1 text-muted-foreground">
                                {Object.entries(enhancedBrief.target_audience).map(([k, v]) => (
                                    <div key={k}>
                                        <span className="capitalize font-medium text-foreground">{k.replace(/_/g, ' ')}:</span> {String(v)}
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}

                    {/* Goal */}
                    {enhancedBrief.goal && (
                         <div className="rounded-lg border bg-card p-3 shadow-sm">
                            <h4 className="font-semibold mb-2 text-primary">Campaign Goal</h4>
                             <div className="space-y-1 text-muted-foreground">
                                {Object.entries(enhancedBrief.goal).map(([k, v]) => (
                                    <div key={k}>
                                        <span className="capitalize font-medium text-foreground">{k.replace(/_/g, ' ')}:</span> {String(v)}
                                    </div>
                                ))}
                            </div>
                         </div>
                    )}
                </div>

                {/* Visual Direction (Important) */}
                {enhancedBrief.visual_direction && (
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <h4 className="font-semibold mb-2 text-primary">Visual Direction</h4>
                         <div className="grid md:grid-cols-2 gap-4 text-muted-foreground">
                             {/* Flatten logic slightly for nested visual direction if needed, or just map */}
                             {Object.entries(enhancedBrief.visual_direction).map(([k, v]) => {
                                 if (typeof v === 'object' && v !== null) {
                                     return (
                                         <div key={k} className="col-span-2 md:col-span-1">
                                             <span className="capitalize font-medium text-foreground block mb-1">{k.replace(/_/g, ' ')}</span>
                                             <ul className="list-disc list-inside pl-1">
                                                 {Object.entries(v as any).map(([subK, subV]) => (
                                                     <li key={subK}><span className="opacity-70">{subK}:</span> {String(subV)}</li>
                                                 ))}
                                             </ul>
                                         </div>
                                     )
                                 }
                                 return (
                                    <div key={k}>
                                        <span className="capitalize font-medium text-foreground">{k.replace(/_/g, ' ')}:</span> {String(v)}
                                    </div>
                                 );
                             })}
                         </div>
                    </div>
                )}
                
                {/* Fallback for other fields or if simple string */}
                <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => console.log(enhancedBrief)}>Log Full JSON for Debug</Button>
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
