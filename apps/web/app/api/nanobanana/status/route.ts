import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const rawUrl = process.env.VOLTAGENT_API_URL || "http://localhost:3141";
const VOLTAGENT_API_URL = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let voltExecutionId = searchParams.get("voltExecutionId");
    let dbExecutionId = searchParams.get("dbExecutionId");
    const projectId = searchParams.get("projectId");

    // If projectId is provided, look up the latest execution for that project
    if (projectId && !voltExecutionId) {
      const { data: latestExec } = await supabase
        .from("workflow_executions")
        .select("id, volt_execution_id, status, brief_version_id")
        .eq("project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (latestExec) {
        voltExecutionId = latestExec.volt_execution_id;
        dbExecutionId = latestExec.id;
        
        // If the execution is already completed or doesn't need VoltAgent, return from DB
        if (latestExec.status === "completed" || latestExec.status === "failed") {
          let enhancedBrief = null;
          let images: any[] = [];
          
          if (latestExec.brief_version_id) {
            const { data: briefData } = await supabase
              .from("project_brief_versions")
              .select("enhanced_brief_json")
              .eq("id", latestExec.brief_version_id)
              .single();
            enhancedBrief = briefData?.enhanced_brief_json;
          }
          
          // Fetch images if completed
          if (latestExec.status === "completed") {
            const { data: imgData } = await supabase
              .from("project_content")
              .select("content_data")
              .eq("execution_id", latestExec.id)
              .eq("content_type", "generated_image");
            
            if (imgData) {
              images = imgData.map(r => r.content_data);
            }
          }
          
          return NextResponse.json({
            status: latestExec.status,
            enhancedBrief,
            images,
            requiresApproval: false,
            executionId: latestExec.id,
            voltExecutionId: latestExec.volt_execution_id,
            source: "database",
          });
        }
        
        // For suspended status, check for images first (in case of race condition)
        // Then fall back to showing enhanced brief for approval
        if (latestExec.status === "suspended") {
          // First, check if images already exist (workflow might have completed but DB status not updated)
          const { data: imgData } = await supabase
            .from("project_content")
            .select("content_data")
            .eq("execution_id", latestExec.id)
            .eq("content_type", "generated_image");
          
          if (imgData && imgData.length > 0) {
            // Images exist! Return as completed even though DB shows suspended
            console.log(`[StatusAPI] Found ${imgData.length} images for execution marked as suspended - treating as completed`);
            return NextResponse.json({
              status: "completed", // Override to completed since we have images
              images: imgData.map(r => r.content_data),
              requiresApproval: false,
              executionId: latestExec.id,
              voltExecutionId: latestExec.volt_execution_id,
              source: "database",
            });
          }
          
          // No images, so it's truly suspended - get enhanced brief
          if (latestExec.brief_version_id) {
            const { data: briefData } = await supabase
              .from("project_brief_versions")
              .select("enhanced_brief_json")
              .eq("id", latestExec.brief_version_id)
              .single();
            
            if (briefData?.enhanced_brief_json) {
              return NextResponse.json({
                status: "suspended",
                enhancedBrief: briefData.enhanced_brief_json,
                requiresApproval: true,
                executionId: latestExec.id,
                voltExecutionId: latestExec.volt_execution_id,
                source: "database",
              });
            }
          }
        }
      } else {
        // No execution found for this project
        return NextResponse.json({
          status: "none",
          requiresApproval: false,
          source: "database",
        });
      }
    }

    if (!voltExecutionId) {
      return NextResponse.json({ error: "voltExecutionId or projectId is required" }, { status: 400 });
    }

    console.log(`[StatusAPI] Checking status for execution ${voltExecutionId}`);

    // 1. Check VoltAgent for current status
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (process.env.VOLTAGENT_SECRET_KEY) {
      headers["Authorization"] = `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`;
    } else if (process.env.VOLTAGENT_PUBLIC_KEY) {
      headers["X-Voltagent-Key"] = process.env.VOLTAGENT_PUBLIC_KEY;
    }

    // Try multiple possible endpoint patterns
    // According to VoltAgent docs, /state endpoint gives full execution state
    const possibleEndpoints = [
      `${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/executions/${voltExecutionId}/state`,
      `${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/executions/${voltExecutionId}`,
      `${VOLTAGENT_API_URL}/api/executions/${voltExecutionId}`,
      `${VOLTAGENT_API_URL}/executions/${voltExecutionId}`,
    ];
    
    let response = null;
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[StatusAPI] Trying endpoint: ${endpoint}`);
        const resp = await fetch(endpoint, { method: "GET", headers });
        if (resp.ok) {
          response = resp;
          console.log(`[StatusAPI] Success with endpoint: ${endpoint}`);
          break;
        } else {
          console.log(`[StatusAPI] Endpoint ${endpoint} returned ${resp.status}`);
        }
      } catch (e) {
        console.log(`[StatusAPI] Endpoint ${endpoint} failed:`, e);
      }
    }

    if (!response || !response.ok) {
      console.error("[StatusAPI] All VoltAgent endpoints failed");
      
      // Fallback to database status
      if (dbExecutionId) {
        const { data: dbExec } = await supabase
          .from("workflow_executions")
          .select("status, brief_version_id")
          .eq("id", dbExecutionId)
          .single();
        
        if (dbExec) {
          // Also try to get enhanced brief from database
          let dbBrief = null;
          if (dbExec.brief_version_id) {
            const { data: briefData } = await supabase
              .from("project_brief_versions")
              .select("enhanced_brief_json")
              .eq("id", dbExec.brief_version_id)
              .single();
            dbBrief = briefData?.enhanced_brief_json;
          }
          
          return NextResponse.json({
            status: dbExec.status,
            enhancedBrief: dbBrief,
            requiresApproval: dbExec.status === "suspended",
            source: "database",
          });
        }
      }
      
      throw new Error(`All VoltAgent status endpoints failed`);
    }

    const responseJson = await response.json();
    console.log("[StatusAPI] RAW VoltAgent Response:", JSON.stringify(responseJson, null, 2));
    
    // Handle multiple possible VoltAgent response structures
    let workflowData: any = responseJson;
    if (responseJson.data) {
      workflowData = responseJson.data;
    }
    if (workflowData.execution) {
      workflowData = workflowData.execution;
    }
    
    // Extract status (try multiple possible field names)
    let status = workflowData.status || workflowData.state || "running";
    if (typeof status === "string") {
      status = status.toLowerCase();
    }
    
    // Extract enhanced brief from various possible locations
    // VoltAgent might store suspend data in different places
    let enhancedBrief = null;
    
    // Check all possible locations - based on actual VoltAgent response structure
    // The enhancedBrief is in:
    // - suspension.checkpoint.stepExecutionState.enhancedBrief
    // - suspension.suspendData.enhancedBrief
    // - events[].metadata.suspendData.enhancedBrief
    const possibleLocations = [
      // ACTUAL VoltAgent locations (based on real response)
      workflowData.suspension?.checkpoint?.stepExecutionState?.enhancedBrief,
      workflowData.suspension?.suspendData?.enhancedBrief,
      // From events array - workflow-suspended event metadata
      workflowData.events?.find((e: any) => e.type === 'workflow-suspended')?.metadata?.suspendData?.enhancedBrief,
      workflowData.events?.find((e: any) => e.type === 'workflow-suspended')?.input?.enhancedBrief,
      // From step-complete event output
      workflowData.events?.find((e: any) => e.type === 'step-complete' && e.output?.enhancedBrief)?.output?.enhancedBrief,
      // Legacy/fallback locations
      workflowData.suspendData?.enhancedBrief,
      workflowData.suspended?.data?.enhancedBrief,
      workflowData.output?.enhancedBrief,
      workflowData.result?.enhancedBrief,
      workflowData.enhancedBrief,
    ];
    
    for (const location of possibleLocations) {
      if (location) {
        enhancedBrief = location;
        console.log(`[StatusAPI] Found enhancedBrief!`);
        break;
      }
    }

    console.log(`[StatusAPI] Parsed status: ${status}, hasEnhancedBrief: ${!!enhancedBrief}`);
    console.log(`[StatusAPI] Full workflowData keys:`, Object.keys(workflowData));

    // 2. Update database with current status
    if (dbExecutionId && status) {
      await supabase
        .from("workflow_executions")
        .update({
          status: status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", dbExecutionId);

      // Update brief version with enhanced brief if suspended
      if (status === "suspended" && enhancedBrief) {
        const { data: execData } = await supabase
          .from("workflow_executions")
          .select("brief_version_id")
          .eq("id", dbExecutionId)
          .single();

        if (execData?.brief_version_id) {
          await supabase
            .from("project_brief_versions")
            .update({ enhanced_brief_json: enhancedBrief })
            .eq("id", execData.brief_version_id);
        }
      }
    }

    // 3. If completed, extract images
    let images: any[] = [];
    if (status === "completed" && workflowData.result?.images) {
      const rawImages = workflowData.result.images;
      images = rawImages.flatMap((item: any) => {
        const falImages = item.imageUrl?.images || [];
        return falImages.map((img: any) => ({
          url: img.url,
          file_name: img.file_name || `${item.personaId}.png`,
          content_type: img.content_type || "image/png",
        }));
      });
    }

    return NextResponse.json({
      status: status,
      enhancedBrief: enhancedBrief,
      requiresApproval: status === "suspended",
      images: images,
      source: "voltagent",
    });

  } catch (error) {
    console.error("[StatusAPI] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
