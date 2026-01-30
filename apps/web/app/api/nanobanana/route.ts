import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// We no longer use @fal-ai/client here directly
// The workflow on the backend now handles the generation

type FalImage = {
  url: string;
  file_name?: string;
  content_type?: string;
};

type FalResult = {
  images: FalImage[];
};

type WorkflowImageResult = {
  personaId: string;
  imageUrl: FalResult;
};

type WorkflowResponse = {
  id: string;
  status: "running" | "completed" | "suspended" | "failed";
  result: {
    enhancedBrief?: any;
    prompts?: any[];
    images?: WorkflowImageResult[];
    clarifications?: string;
  };
  suspendData?: {
    enhancedBrief?: any;
    questions?: string[];
  };
};

const rawUrl = process.env.VOLTAGENT_API_URL || "http://localhost:3141";
const VOLTAGENT_API_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Note: User must be logged in to save to DB, but for now we might fail gracefully if not?
    // STRICT MODE: User must be logged in.
    if (!user) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      prompt?: string;
      projectId?: string; // Request body MUST now include projectId to link data
      aspect_ratio?: string;
    };

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const projectId = body.projectId;

    if (!prompt || prompt.length < 8) {
      return NextResponse.json(
        { error: "Prompt must be at least 8 characters." },
        { status: 400 }
      );
    }
    
    if (!projectId) {
       // For new "playground" usage without project, we can't save to DB easily.
       // But user requirement is strict: "Everything must be very clear and detailed" in DB.
       return NextResponse.json(
        { error: "Project ID is required for tracking." },
        { status: 400 }
      );
    }

    console.log(`[NanoBananaAPI] Starting creative execution for project ${projectId}`);

    // Call the VoltAgent Workflow
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.VOLTAGENT_SECRET_KEY) {
      headers["Authorization"] = `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`;
    } else if (process.env.VOLTAGENT_PUBLIC_KEY) {
       headers["X-Voltagent-Key"] = process.env.VOLTAGENT_PUBLIC_KEY;
    }

    const response = await fetch(`${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          brief: prompt,
          aspect_ratio: body.aspect_ratio || "16:9",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NanoBananaAPI] Workflow execution failed:", response.status, errorText);
      throw new Error(`Workflow request failed: ${response.statusText}`);
    }

    const responseJson = await response.json();
    // VoltAgent standard response: { success: true, data: { ... } }
    console.log("[NanoBananaAPI] RAW VoltAgent Response:", JSON.stringify(responseJson, null, 2));

    // Handle multiple possible VoltAgent response structures
    // Could be: { data: { ... } } or { execution: { ... } } or direct object
    let workflowData: any = responseJson;
    
    // Unwrap common wrappers
    if (responseJson.data) {
      workflowData = responseJson.data;
    }
    if (workflowData.execution) {
      workflowData = workflowData.execution;
    }

    // Extract execution ID (try multiple possible field names)
    const voltExecutionId = workflowData.executionId || workflowData.id || workflowData.execution_id;
    
    // Extract status (try multiple possible field names)
    // VoltAgent might use "state" or "status"
    let status = workflowData.status || workflowData.state || "running";
    
    // Normalize status to lowercase
    if (typeof status === "string") {
      status = status.toLowerCase();
    }

    // Extract enhanced brief from suspend data
    // VoltAgent might structure this differently:
    // - suspendData.enhancedBrief
    // - suspended.data.enhancedBrief  
    // - suspendedData.enhancedBrief
    // - output.enhancedBrief (if passed through steps)
    let enhancedBrief = null;
    
    if (workflowData.suspendData?.enhancedBrief) {
      enhancedBrief = workflowData.suspendData.enhancedBrief;
    } else if (workflowData.suspended?.data?.enhancedBrief) {
      enhancedBrief = workflowData.suspended.data.enhancedBrief;
    } else if (workflowData.suspendedData?.enhancedBrief) {
      enhancedBrief = workflowData.suspendedData.enhancedBrief;
    } else if (workflowData.output?.enhancedBrief) {
      enhancedBrief = workflowData.output.enhancedBrief;
    } else if (workflowData.result?.enhancedBrief) {
      enhancedBrief = workflowData.result.enhancedBrief;
    }

    console.log(`[NanoBananaAPI] Initial parse: executionId=${voltExecutionId}, status=${status}`);
    console.log(`[NanoBananaAPI] Enhanced brief in initial response:`, enhancedBrief ? "YES" : "NO");
    console.log(`[NanoBananaAPI] Full workflow data keys:`, Object.keys(workflowData));

    // VoltAgent /execute returns "completed" even when workflow is suspended
    // We need to fetch the actual execution details to get suspend data
    if (voltExecutionId && (!enhancedBrief || status === "completed")) {
      console.log(`[NanoBananaAPI] Fetching execution details for ${voltExecutionId}...`);
      
      // Try multiple possible endpoint patterns
      // According to VoltAgent docs, /state endpoint gives full execution state
      const possibleEndpoints = [
        `${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/executions/${voltExecutionId}/state`,
        `${VOLTAGENT_API_URL}/workflows/executions?workflowId=creative-fanout-v2&status=suspended`,
        `${VOLTAGENT_API_URL}/api/executions/${voltExecutionId}`,
        `${VOLTAGENT_API_URL}/executions/${voltExecutionId}`,
        `${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/executions/${voltExecutionId}`,
      ];
      
      let detailsResponse = null;
      let workingEndpoint = null;
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`[NanoBananaAPI] Trying endpoint: ${endpoint}`);
          const resp = await fetch(endpoint, { method: "GET", headers });
          if (resp.ok) {
            detailsResponse = resp;
            workingEndpoint = endpoint;
            console.log(`[NanoBananaAPI] Success with endpoint: ${endpoint}`);
            break;
          } else {
            console.log(`[NanoBananaAPI] Endpoint ${endpoint} returned ${resp.status}`);
          }
        } catch (e) {
          console.log(`[NanoBananaAPI] Endpoint ${endpoint} failed:`, e);
        }
      }
      
      if (detailsResponse && detailsResponse.ok) {
          const detailsJson = await detailsResponse.json();
          console.log(`[NanoBananaAPI] Execution details:`, JSON.stringify(detailsJson, null, 2));
          
          // Parse the details response
          let detailsData = detailsJson.data || detailsJson;
          if (detailsData.execution) {
            detailsData = detailsData.execution;
          }
          
          // Update status from details (might be "suspended" instead of "completed")
          const detailStatus = detailsData.status || detailsData.state;
          if (detailStatus) {
            status = typeof detailStatus === "string" ? detailStatus.toLowerCase() : detailStatus;
            console.log(`[NanoBananaAPI] Updated status from details: ${status}`);
          }
          
          // Try to get enhanced brief from details - check all possible locations
          // Based on actual VoltAgent response, the enhancedBrief is in:
          // - suspension.checkpoint.stepExecutionState.enhancedBrief
          // - suspension.suspendData.enhancedBrief
          // - events[].metadata.suspendData.enhancedBrief
          if (!enhancedBrief) {
            const possibleLocations = [
              // ACTUAL VoltAgent locations (based on real response)
              detailsData.suspension?.checkpoint?.stepExecutionState?.enhancedBrief,
              detailsData.suspension?.suspendData?.enhancedBrief,
              // From events array - workflow-suspended event metadata
              detailsData.events?.find((e: any) => e.type === 'workflow-suspended')?.metadata?.suspendData?.enhancedBrief,
              detailsData.events?.find((e: any) => e.type === 'workflow-suspended')?.input?.enhancedBrief,
              // From step-complete event output
              detailsData.events?.find((e: any) => e.type === 'step-complete' && e.output?.enhancedBrief)?.output?.enhancedBrief,
              // Legacy/fallback locations
              detailsData.suspendData?.enhancedBrief,
              detailsData.suspended?.data?.enhancedBrief,
              detailsData.output?.enhancedBrief,
              detailsData.result?.enhancedBrief,
              detailsData.enhancedBrief,
            ];
            
            for (const location of possibleLocations) {
              if (location) {
                enhancedBrief = location;
                console.log(`[NanoBananaAPI] Found enhancedBrief!`);
                break;
              }
            }
            
            console.log(`[NanoBananaAPI] Enhanced brief from details:`, enhancedBrief ? "YES" : "NO");
          }
      } else {
        console.log(`[NanoBananaAPI] All execution detail endpoints failed`);
      }
    }

    console.log(`[NanoBananaAPI] Final: status=${status}, hasEnhancedBrief=${!!enhancedBrief}`);

    // --- DATABASE PERSISTENCE ---

    // 1. Create Workflow Execution Record
    // We need a brief version ID first. 
    // Logic: Create a new brief version for this run.
    const { data: briefVersion, error: briefError } = await supabase
      .from("project_brief_versions")
      .insert({
        project_id: projectId,
        version_number: Math.floor(Date.now() / 1000), // Fix: Use seconds to fit in integer column
        user_brief_text: prompt,
        enhanced_brief_json: enhancedBrief,
        is_approved: status === "completed" ? true : null,
      })
      .select("id")
      .single();
    
    // Fallback if brief insert fails (e.g. version conflict? we used timestamp so rare)
    if (briefError) {
        console.error("Failed to insert brief version:", briefError);
        // Continue but logging will be partial
    }

    const briefVersionId = briefVersion?.id;

    // 2. Execution Record
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .insert({
        project_id: projectId,
        volt_execution_id: voltExecutionId,
        brief_version_id: briefVersionId,
        status: status,
        started_at: new Date().toISOString(),
        completed_at: status === "completed" ? new Date().toISOString() : null
      })
      .select("id")
      .single();

    if (execError) {
        console.error("Failed to insert execution:", execError);
    }
    const internalExecutionId = execution?.id;

    // --- LOG WORKFLOW STEPS ---
    if (internalExecutionId) {
        const stepsToLog = [];
        
        // 1. Start Step
        stepsToLog.push({
            execution_id: internalExecutionId,
            step_name: "Workflow Initiated",
            agent_id: "system", // Required by schema
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            input_payload: { prompt, aspect_ratio: body.aspect_ratio }, // Schema: input_payload
            output_payload: { voltExecutionId } // Schema: output_payload
        });

        // 2. Current Status Step
        if (status === 'suspended') {
             stepsToLog.push({
                execution_id: internalExecutionId,
                step_name: "Brief Enhancement",
                agent_id: "brief-enhancer-agent",
                status: "suspended", // It finished the step but paused the workflow? Or is it waiting?
                // Actually the enhancement is DONE, it's waiting for approval.
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                input_payload: { prompt },
                output_payload: { enhancedBrief }
             });
             
             // Open user review step
             stepsToLog.push({
                 execution_id: internalExecutionId,
                 step_name: "User Approval",
                 agent_id: "user",
                 status: "pending",
                 started_at: new Date().toISOString(),
             });
        } else if (status === 'completed') {
             stepsToLog.push({
                execution_id: internalExecutionId,
                step_name: "Creative Generation",
                agent_id: "fanout-workflow",
                status: "completed",
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
                output_payload: { imageCount: workflowData.result?.images?.length || 0 }
             });
        }

        const { error: stepError } = await supabase.from("workflow_steps").insert(stepsToLog);
        if (stepError) console.error("Failed to log steps:", stepError);
    }

    // 3. Save Results (If Completed)
    if (status === "completed" && workflowData.result?.images && internalExecutionId) {
        const rawImages = workflowData.result.images;
        
        // Save each image to project_content
        const imageInserts = rawImages.flatMap((item: any) => {
             const result = item.imageUrl; // FalResult
             return result.images.map((img: any) => ({
                 project_id: projectId,
                 content_type: "generated_image",
                 content_data: {
                     url: img.url,
                     persona: item.personaId,
                     prompt_id: `prompt_${item.personaId}`
                 },
                 agent_id: item.personaId,
                 execution_id: internalExecutionId,
                 // step_id: ... hard to map without granular step logs from VoltAgent
             }));
        });

        if (imageInserts.length > 0) {
            const { error: imgError } = await supabase.from("project_content").insert(imageInserts);
            if (imgError) console.error("Failed to save images:", imgError);
        }
    }

    // 4. Handle Suspension (If Suspended)
    if (status === "suspended") {
        // We already saved the enhanced brief in step 1 (brief_version)
        // We might want to notify frontend differently
    }


    // --- RETURN RESPONSE ---

    // Transform logic remains similar for frontend compat
    const rawImages = workflowData.result?.images || [];
    const flattenedImages = rawImages.flatMap((item: any) => {
      // Handle potential Fal format differences
      const falImages = item.imageUrl?.images || []; // If using Fal V3
      // ... or single image fallback ...
      return falImages.map((img: any) => ({
        url: img.url,
        file_name: img.file_name || `${item.personaId}.png`,
        content_type: img.content_type || "image/png",
      }));
    });

    console.log(`[NanoBananaAPI] Returning to frontend: status=${status}, hasEnhancedBrief=${!!enhancedBrief}, requiresApproval=${status === "suspended"}`);

    return NextResponse.json({
      images: flattenedImages,
      status: status,
      enhancedBrief: enhancedBrief,
      requiresApproval: status === "suspended",
      executionId: internalExecutionId, // Return our DB ID
      voltExecutionId: voltExecutionId, // Return Volt ID
      description: status === "suspended" 
          ? "Brief generated, awaiting approval." 
          : `Generated ${flattenedImages.length} variations via Creative Fanout V2`,
    });

  } catch (error) {
    console.error("[NanoBananaAPI] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate images.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
