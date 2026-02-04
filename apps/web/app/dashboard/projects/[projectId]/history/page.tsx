"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  Clock, 
  FileText, 
  CheckCircle, 
  Sparkles, 
  Edit3, 
  Loader2,
  ChevronRight,
  Circle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface TimelineEvent {
  id: string;
  type: "brief_created" | "brief_enhanced" | "images_generated" | "image_edited";
  title: string;
  description: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  metadata?: any;
}

export default function HistoryPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const supabase = createClient();
        
        // Fetch workflow executions and steps
        const { data: executions, error: execError } = await supabase
          .from("workflow_executions")
          .select(`
            id, 
            status, 
            started_at, 
            completed_at,
            workflow_steps (
              step_name,
              status,
              started_at,
              completed_at,
              output_payload
            )
          `)
          .eq("project_id", projectId)
          .order("started_at", { ascending: false });

        if (execError) throw execError;

        const timelineEvents: TimelineEvent[] = [];

        if (executions) {
          executions.forEach(exec => {
            // Add workflow execution as main event
            timelineEvents.push({
              id: exec.id,
              type: "images_generated",
              title: "Workflow Execution",
              description: `Status: ${exec.status}`,
              timestamp: exec.started_at,
              status: exec.status === "completed" ? "completed" : exec.status === "failed" ? "failed" : "pending",
              metadata: exec,
            });

            // Add workflow steps
            if (exec.workflow_steps && Array.isArray(exec.workflow_steps)) {
              exec.workflow_steps.forEach((step: any) => {
                let eventType: TimelineEvent["type"] = "brief_enhanced";
                let icon = CheckCircle;

                if (step.step_name.includes("Brief")) {
                  eventType = "brief_enhanced";
                } else if (step.step_name.includes("Generation")) {
                  eventType = "images_generated";
                }

                timelineEvents.push({
                  id: `${exec.id}-${step.step_name}`,
                  type: eventType,
                  title: step.step_name,
                  description: step.status === "completed" ? "Completed successfully" : step.status,
                  timestamp: step.started_at,
                  status: step.status === "completed" ? "completed" : "pending",
                  metadata: step,
                });
              });
            }
          });
        }

        // Sort by timestamp descending
        timelineEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        setEvents(timelineEvents);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [projectId]);

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "brief_created":
        return FileText;
      case "brief_enhanced":
        return CheckCircle;
      case "images_generated":
        return Sparkles;
      case "image_edited":
        return Edit3;
      default:
        return Circle;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "failed":
        return "text-red-500";
      default:
        return "text-yellow-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="size-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Project History</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Timeline of all project activities
        </p>
      </div>

      {/* Timeline */}
      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="size-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start creating to see your project history
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative space-y-4">
          {/* Timeline Line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

          {events.map((event, index) => {
            const Icon = getEventIcon(event.type);
            const isLast = index === events.length - 1;

            return (
              <Card key={event.id} className="relative ml-12 overflow-hidden">
                {/* Timeline Dot */}
                <div className="absolute -left-12 top-6">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 bg-background",
                    getStatusColor(event.status)
                  )}>
                    <Icon className="size-4" />
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{event.title}</CardTitle>
                    <Badge 
                      variant={event.status === "completed" ? "default" : "secondary"}
                      className={cn(
                        event.status === "completed" && "bg-green-500",
                        event.status === "failed" && "bg-red-500"
                      )}
                    >
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
