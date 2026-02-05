"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useWorkflowState, WorkflowStep } from "@/hooks/useWorkflowState";

interface WorkflowRedirectGuardProps {
  projectId: string;
  expectedStep: WorkflowStep;
  children: React.ReactNode;
  /** Show loading while checking workflow status */
  showLoading?: boolean;
  /** Allow access even if workflow is in different state (for non-workflow pages like gallery) */
  bypassRedirect?: boolean;
}

/**
 * Guard component that redirects users to correct workflow step
 * Use this to wrap page content that should be workflow-aware
 */
export function WorkflowRedirectGuard({
  projectId,
  expectedStep,
  children,
  showLoading = true,
  bypassRedirect = false,
}: WorkflowRedirectGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, currentStep, status, shouldRedirect } = useWorkflowState(projectId);

  useEffect(() => {
    if (isLoading || bypassRedirect) return;

    const redirectPath = shouldRedirect(pathname);
    if (redirectPath) {
      console.log(`[WorkflowGuard] Redirecting from ${pathname} to ${redirectPath} (status: ${status})`);
      router.replace(redirectPath);
    }
  }, [isLoading, bypassRedirect, pathname, shouldRedirect, router, status]);

  // Show loading while checking workflow status
  if (isLoading && showLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking workflow status...</p>
        </div>
      </div>
    );
  }

  // If we should redirect, don't render children (prevent flash of content)
  if (!bypassRedirect && !isLoading) {
    const redirectPath = shouldRedirect(pathname);
    if (redirectPath) {
      return (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
