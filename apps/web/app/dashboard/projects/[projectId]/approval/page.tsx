"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApprovalComponent } from "../ApprovalComponent";

interface ExecutionData {
  executionId: string;
  dbExecutionId: string;
  status: string;
  enhancedBrief: any;
}

export default function ApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch execution data on mount
  useEffect(() => {
    async function fetchExecution() {
      try {
        const res = await fetch(`/api/nanobanana/status?projectId=${projectId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch execution status");
        }
        const data = await res.json();

        if (data.status === "suspended" && data.enhancedBrief) {
          setExecutionData({
            executionId: data.voltExecutionId,
            dbExecutionId: data.executionId,
            status: data.status,
            enhancedBrief: data.enhancedBrief,
          });
        } else if (data.status === "completed") {
          // Already completed, redirect to results
          router.replace(`/dashboard/projects/${projectId}/results`);
          return;
        } else {
          // No suspended execution, redirect to brief page
          router.replace(`/dashboard/projects/${projectId}`);
          return;
        }
      } catch (err) {
        console.error("Error fetching execution:", err);
        setError("Failed to load approval data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchExecution();
  }, [projectId, router]);

  const handleComplete = () => {
    // Workflow completed, redirect to results page
    router.push(`/dashboard/projects/${projectId}/results`);
  };

  const handleReSuspend = (newBrief: any) => {
    // Update with new enhanced brief from feedback loop
    setExecutionData((prev) =>
      prev
        ? {
            ...prev,
            enhancedBrief: newBrief,
            status: "suspended",
          }
        : null
    );
  };

  const handleExpired = () => {
    // Workflow expired, redirect to brief page to start fresh
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

  if (!executionData) {
    return null;
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
          <h1 className="text-2xl font-semibold tracking-tight">Review Enhanced Brief</h1>
          <p className="text-sm text-muted-foreground">
            Review the AI-enhanced brief and approve to generate creative assets.
          </p>
        </div>
      </div>

      {/* Approval Component */}
      <ApprovalComponent
        executionId={executionData.executionId}
        dbExecutionId={executionData.dbExecutionId}
        enhancedBrief={executionData.enhancedBrief}
        onComplete={handleComplete}
        onReSuspend={handleReSuspend}
        onCancel={() => router.push(`/dashboard/projects/${projectId}`)}
        onExpired={handleExpired}
      />
    </div>
  );
}
