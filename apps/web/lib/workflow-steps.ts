/**
 * Maps VoltAgent execution timeline events to workflow_steps table rows.
 * Used to persist the Execution Timeline (Workflow Started, Step 1: enhance-brief, etc.) in the DB.
 */

export type WorkflowStepRow = {
  execution_id: string;
  step_name: string;
  agent_id: string;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

type VoltAgentEvent = {
  type?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metadata?: Record<string, unknown> & { displayName?: string };
  timestamp?: string;
  createdAt?: string;
};

function humanizeStepName(type: string | undefined, metadata: VoltAgentEvent["metadata"]): string {
  const displayName = metadata?.displayName;
  if (typeof displayName === "string" && displayName.trim()) return displayName;
  if (!type) return "Step";
  const normalized = type.toLowerCase().replace(/[-_]/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function eventToAgentId(type: string | undefined, stepName: string): string {
  const lower = (stepName || type || "").toLowerCase();
  if (lower.includes("enhance-brief") || lower.includes("enhance brief")) return "brief-enhancer-agent";
  if (lower.includes("approval-gate") || lower.includes("approval gate")) return "approval-gate";
  if (lower.includes("workflow started") || lower.includes("workflow-started")) return "system";
  if (lower.includes("workflow suspended") || lower.includes("workflow-suspended")) return "system";
  if (lower.includes("creative") || lower.includes("image generation")) return "fanout-workflow";
  if (type === "step-complete" || type === "step-start") return "workflow";
  return "workflow";
}

function eventToStatus(event: VoltAgentEvent): string {
  const type = (event.type || "").toLowerCase();
  if (type === "workflow-suspended") return "suspended";
  if (type === "workflow-started" || type === "step-complete") return "completed";
  if (type === "step-start" || type === "step-running") return "running";
  return event.output != null ? "completed" : "running";
}

/**
 * Map an array of VoltAgent execution events to workflow_steps rows.
 * Events are expected to have type, input, output?, metadata?, timestamp?.
 */
export function mapVoltAgentEventsToWorkflowSteps(
  executionId: string,
  events: VoltAgentEvent[]
): WorkflowStepRow[] {
  const now = new Date().toISOString();
  return events.map((event, index) => {
    const stepName = humanizeStepName(event.type, event.metadata);
    const status = eventToStatus(event);
    const timestamp = event.timestamp ?? event.createdAt ?? now;
    const hasOutput = event.output != null && Object.keys(event.output).length > 0;
    return {
      execution_id: executionId,
      step_name: stepName,
      agent_id: eventToAgentId(event.type, stepName),
      input_payload: event.input ?? null,
      output_payload: hasOutput ? (event.output as Record<string, unknown>) : null,
      status,
      error_message: null,
      started_at: timestamp,
      completed_at: status === "completed" || status === "suspended" ? timestamp : null,
    };
  });
}

/**
 * Normalize raw API response to an array of events.
 * VoltAgent may return events in different shapes (e.g. events[], timeline[], or nested).
 */
export function normalizeVoltAgentEvents(workflowData: Record<string, unknown>): VoltAgentEvent[] {
  const raw = workflowData.events ?? workflowData.timeline ?? workflowData.steps;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is VoltAgentEvent =>
      e != null && typeof e === "object" && (e.type != null || e.input != null || e.metadata != null)
  );
}
