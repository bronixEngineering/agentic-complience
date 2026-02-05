"use client";

import { useState, useEffect, useCallback } from "react";

export type WorkflowStatus = "none" | "running" | "suspended" | "completed" | "error" | "failed";

export type WorkflowStep = "brief" | "approval" | "results";

export interface WorkflowState {
  status: WorkflowStatus;
  executionId: string | null;
  voltExecutionId: string | null;
  currentStep: WorkflowStep;
  enhancedBrief?: any;
  images?: any[];
  isLoading: boolean;
  error: string | null;
}

interface StatusResponse {
  status: WorkflowStatus;
  executionId?: string;
  voltExecutionId?: string;
  enhancedBrief?: any;
  images?: any[];
  requiresApproval?: boolean;
  error?: string;
}

/**
 * Determines the current workflow step based on status
 */
function getStepFromStatus(status: WorkflowStatus): WorkflowStep {
  switch (status) {
    case "suspended":
      return "approval";
    case "completed":
      return "results";
    case "running":
      return "results"; // Show results page with loading
    case "none":
    case "error":
    case "failed":
    default:
      return "brief";
  }
}

/**
 * Gets the redirect path based on workflow status and current path
 */
function getRedirectPath(
  projectId: string,
  status: WorkflowStatus,
  currentPath: string
): string | null {
  const basePath = `/dashboard/projects/${projectId}`;
  const targetStep = getStepFromStatus(status);
  
  // Map step to path
  const stepPaths: Record<WorkflowStep, string> = {
    brief: basePath,
    approval: `${basePath}/approval`,
    results: `${basePath}/results`,
  };
  
  // Determine current step from path
  let currentStep: WorkflowStep = "brief";
  if (currentPath.includes("/approval")) {
    currentStep = "approval";
  } else if (currentPath.includes("/results")) {
    currentStep = "results";
  } else if (currentPath.includes("/gallery") || currentPath.includes("/history") || currentPath.includes("/edit")) {
    // These are non-workflow pages, don't redirect
    return null;
  }
  
  // If we're already on the correct step, no redirect needed
  if (currentStep === targetStep) {
    return null;
  }
  
  return stepPaths[targetStep];
}

/**
 * Custom hook for managing workflow state based on VoltAgent API
 */
export function useWorkflowState(projectId: string) {
  const [state, setState] = useState<WorkflowState>({
    status: "none",
    executionId: null,
    voltExecutionId: null,
    currentStep: "brief",
    isLoading: true,
    error: null,
  });

  const fetchStatus = useCallback(async () => {
    if (!projectId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const res = await fetch(`/api/nanobanana/status?projectId=${projectId}`);
      
      if (!res.ok) {
        throw new Error("Failed to fetch workflow status");
      }
      
      const data: StatusResponse = await res.json();
      
      const status = data.status || "none";
      const currentStep = getStepFromStatus(status);
      
      setState({
        status,
        executionId: data.executionId || null,
        voltExecutionId: data.voltExecutionId || null,
        currentStep,
        enhancedBrief: data.enhancedBrief,
        images: data.images,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error("[useWorkflowState] Error fetching status:", err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch status",
      }));
    }
  }, [projectId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Check if user should be redirected from current path
   */
  const shouldRedirect = useCallback(
    (currentPath: string): string | null => {
      if (state.isLoading) return null;
      return getRedirectPath(projectId, state.status, currentPath);
    },
    [projectId, state.status, state.isLoading]
  );

  /**
   * Check if brief creation is blocked (active workflow exists)
   */
  const isBriefBlocked = state.status === "running" || state.status === "suspended";

  /**
   * Check if workflow is actively processing
   */
  const isWorkflowActive = state.status === "running" || state.status === "suspended";

  return {
    ...state,
    refetch: fetchStatus,
    shouldRedirect,
    isBriefBlocked,
    isWorkflowActive,
    getStepFromStatus,
  };
}

export type { StatusResponse };
