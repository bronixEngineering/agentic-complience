import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const rawUrl = process.env.VOLTAGENT_API_URL || "http://localhost:3141";
const VOLTAGENT_API_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      executionId: string; // This is the VOLT execution ID
      dbExecutionId: string; // This is our DB ID
      approved: boolean;
      feedback?: string;
    };

    const { executionId, dbExecutionId, approved, feedback } = body;

    if (!executionId) {
      return NextResponse.json({ error: "Execution ID required" }, { status: 400 });
    }

    console.log(`[ResumeAPI] Resuming execution ${executionId}. Approved: ${approved}`);

    // 1. Resume VoltAgent Workflow
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.VOLTAGENT_SECRET_KEY) {
      headers["Authorization"] = `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`;
    } else if (process.env.VOLTAGENT_PUBLIC_KEY) {
       headers["X-Voltagent-Key"] = process.env.VOLTAGENT_PUBLIC_KEY;
    }

    // Payload matches what the workflow expects in `suspend(..., resumeSchema)`
    // In our workflow: resumeSchema: z.object({ approved: z.boolean(), feedback: z.string().optional() })
    // IMPORTANT: VoltAgent requires the data to be wrapped in "resumeData" field!
    const resumePayload = {
      resumeData: {
        approved: approved,
        feedback: feedback || "",
      }
    };

    console.log(`[ResumeAPI] Sending resume payload:`, JSON.stringify(resumePayload));

    const response = await fetch(`${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/executions/${executionId}/resume`, {
      method: "POST",
      headers,
      body: JSON.stringify(resumePayload),
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("[ResumeAPI] Failed to resume VoltAgent:", errText);
        
        // Parse error to check for specific cases
        let errData: any = {};
        try {
          errData = JSON.parse(errText);
        } catch {}
        
        // Handle "Workflow state not found" - VoltAgent lost the in-memory state (e.g., after restart)
        if (errData.error?.includes("state not found") || errText.includes("state not found")) {
          // Mark the workflow as failed in our DB
          await supabase
            .from("workflow_executions")
            .update({ 
              status: "failed",
              completed_at: new Date().toISOString()
            })
            .eq("id", dbExecutionId);
          
          return NextResponse.json({ 
            error: "Workflow state expired. Please start a new generation.",
            errorCode: "WORKFLOW_STATE_EXPIRED",
            shouldRestart: true
          }, { status: 410 }); // 410 Gone - resource no longer available
        }
        
        throw new Error("Failed to resume workflow");
    }

    const responseJson = await response.json();
    // VoltAgent standard response: { success: true, data: { ... } }
    const workflowData = (responseJson.data || responseJson) as any;
    const status = workflowData.status; // 'completed', 'running', or 'suspended' (if rejected and re-enhanced)

    console.log(`[ResumeAPI] Resumed. New Status: ${status}`, JSON.stringify(workflowData, null, 2));

    // 2. Update Database
    // A. Update Execution Status
    const { error: updateError } = await supabase
        .from("workflow_executions")
        .update({ 
            status: status,
            completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq("id", dbExecutionId);
    
    if (updateError) {
        console.error("[ResumeAPI] Failed to update execution status:", updateError);
    } else {
        console.log(`[ResumeAPI] Updated DB execution status to: ${status}`);
    }

    // B. Update Brief Version (Mark approved/rejected)
    // We need to find the brief version linked to this execution
    const { data: execData } = await supabase
        .from("workflow_executions")
        .select("brief_version_id, project_id")
        .eq("id", dbExecutionId)
        .single();
    
    if (execData?.brief_version_id) {
        await supabase
            .from("project_brief_versions")
            .update({
                is_approved: approved,
                feedback_notes: feedback || null
            })
            .eq("id", execData.brief_version_id);
    }

    // --- LOG STEPS ---
    const stepsToLog = [];
    
    // 1. Close the "User Approval" step (we can't easily update the old row without ID, so we insert a decision log)
    stepsToLog.push({
        execution_id: dbExecutionId,
        step_name: "User Decision",
        agent_id: "user",
        status: approved ? "approved" : "rejected",
        input_payload: { approved, feedback },
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
    });

    if (status === 'completed') {
        stepsToLog.push({
            execution_id: dbExecutionId,
            step_name: "Image Generation",
            agent_id: "fanout-workflow",
            status: "completed",
            output_payload: { imageCount: workflowData.result?.images?.length || 0 },
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        });
    }

    const { error: stepError } = await supabase.from("workflow_steps").insert(stepsToLog);
    if (stepError) console.error("Failed to log steps:", stepError);

    const projectId = execData?.project_id;

    // 3. Save Final Images (If Completed)
    if (status === "completed" && workflowData.result?.images && projectId) {
        const rawImages = workflowData.result.images;
        
        const imageInserts = rawImages.flatMap((item: any) => {
             const result = item.imageUrl; 
             return result.images.map((img: any) => ({
                 project_id: projectId,
                 content_type: "generated_image",
                 content_data: {
                     url: img.url,
                     persona: item.personaId,
                     prompt_id: `prompt_${item.personaId}`
                 },
                 agent_id: item.personaId,
                 execution_id: dbExecutionId,
             }));
        });

        if (imageInserts.length > 0) {
            const { error: imgError } = await supabase.from("project_content").insert(imageInserts);
            if (imgError) console.error("Failed to save images:", imgError);
        }
    }

    // Handle re-suspend scenario (user rejected, workflow re-enhanced and suspended again)
    if (status === "suspended") {
        // Update execution status back to suspended
        await supabase
            .from("workflow_executions")
            .update({ status: "suspended" })
            .eq("id", dbExecutionId);

        // Get the new enhanced brief from suspend data
        const newEnhancedBrief = workflowData.suspendData?.enhancedBrief || workflowData.result?.enhancedBrief;
        
        // Update brief version with new enhanced brief
        if (execData?.brief_version_id && newEnhancedBrief) {
            await supabase
                .from("project_brief_versions")
                .update({
                    enhanced_brief_json: newEnhancedBrief,
                    is_approved: null, // Reset approval status
                })
                .eq("id", execData.brief_version_id);
        }

        // Log the re-suspend step
        await supabase.from("workflow_steps").insert({
            execution_id: dbExecutionId,
            step_name: "Brief Re-Enhanced",
            agent_id: "brief-enhancer-agent",
            status: "suspended",
            input_payload: { feedback },
            output_payload: { enhancedBrief: newEnhancedBrief },
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
        });

        return NextResponse.json({
            status: "suspended",
            requiresApproval: true,
            enhancedBrief: newEnhancedBrief,
            executionId: dbExecutionId,
            voltExecutionId: executionId,
            description: "Brief re-enhanced based on feedback. Please review again.",
        });
    }

    // Return final result (same shape as start endpoint for consistency)
    const rawImages = workflowData.result?.images || [];
    const flattenedImages = rawImages.flatMap((item: any) => {
      const falImages = item.imageUrl?.images || [];
      return falImages.map((img: any) => ({
        url: img.url,
        file_name: img.file_name || `${item.personaId}.png`,
        content_type: img.content_type || "image/png",
      }));
    });

    return NextResponse.json({
        images: flattenedImages,
        status: status,
        executionId: dbExecutionId,
        voltExecutionId: executionId,
        description: "Images generated successfully",
    });

  } catch (error) {
    console.error("[ResumeAPI] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
