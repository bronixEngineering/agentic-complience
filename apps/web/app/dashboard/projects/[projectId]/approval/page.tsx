"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalComponent } from "../ApprovalComponent";
import { useWorkflowState } from "@/hooks/useWorkflowState";

export default function ApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { 
    isLoading, 
    status, 
    executionId: dbExecutionId, 
    voltExecutionId, 
    enhancedBrief, 
    error,
    refetch 
  } = useWorkflowState(projectId);

  const handleComplete = () => {
    router.push(`/dashboard/projects/${projectId}/results`);
  };

  const handleReSuspend = () => {
    refetch();
  };

  const handleExpired = () => {
    router.push(`/dashboard/projects/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading approval data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/dashboard/projects/${projectId}`}>
                <ArrowLeft className="mr-2 size-4" />
                Back to Brief
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not suspended or no enhanced brief, redirect appropriately
  if (status !== "suspended" || !enhancedBrief) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href={`/dashboard/projects/${projectId}`}>
              <ArrowLeft className="mr-2 size-4" />
              Back to Brief
            </Link>
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">Review Enhanced Brief</h1>
          <p className="text-sm text-muted-foreground">
            Review the AI-enhanced brief and approve to generate creative assets.
          </p>
        </div>
      </div>

      {/* Approval Component */}
      <ApprovalComponent
        projectId={projectId}
        executionId={voltExecutionId || ""}
        dbExecutionId={dbExecutionId || ""}
        enhancedBrief={enhancedBrief}
        onComplete={handleComplete}
        onReSuspend={handleReSuspend}
        onCancel={() => router.push(`/dashboard/projects/${projectId}`)}
        onExpired={handleExpired}
      />
    </div>
  );
}
