"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkflowState } from "@/hooks/useWorkflowState";

interface WorkflowBlockerProps {
  projectId: string;
  children: React.ReactNode;
}

/**
 * Wrapped around brief form to block new brief creation when workflow is active
 */
export function WorkflowBlocker({ projectId, children }: WorkflowBlockerProps) {
  const { isLoading, status, currentStep, isBriefBlocked } = useWorkflowState(projectId);

  // Show loading while checking
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If workflow is active, show blocker
  if (isBriefBlocked) {
    const continueHref = currentStep === "approval" 
      ? `/dashboard/projects/${projectId}/approval`
      : `/dashboard/projects/${projectId}/results`;
    
    const statusMessage = status === "suspended" 
      ? "Your brief has been enhanced and is waiting for approval."
      : "Your creative content is currently being generated.";
    
    const stepLabel = currentStep === "approval" ? "Review Brief" : "View Results";

    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5 text-amber-500" />
            <CardTitle className="text-amber-700 dark:text-amber-400">
              Active Workflow Detected
            </CardTitle>
          </div>
          <CardDescription className="text-amber-600/80 dark:text-amber-300/80">
            {statusMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You cannot create a new brief while there's an active workflow. 
              Please complete or cancel the current workflow first.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={continueHref}>
                  {stepLabel}
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No active workflow, render children (the form)
  return <>{children}</>;
}
