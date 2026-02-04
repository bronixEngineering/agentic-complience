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
      prompt?: string;
      image_url?: string;
      projectId?: string;
    };

    const prompt = body.prompt?.trim();
    const imageUrl = body.image_url?.trim();
    const projectId = body.projectId;

    if (!prompt || prompt.length < 8) {
      return NextResponse.json(
        { error: "Prompt must be at least 8 characters." },
        { status: 400 }
      );
    }
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 }
      );
    }

    // Call the VoltAgent Workflow
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (process.env.VOLTAGENT_SECRET_KEY) {
      headers["Authorization"] = `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`;
    } else if (process.env.VOLTAGENT_PUBLIC_KEY) {
       headers["X-Voltagent-Key"] = process.env.VOLTAGENT_PUBLIC_KEY;
    }

    // Execute the image-editing workflow
    const response = await fetch(`${VOLTAGENT_API_URL}/workflows/image-editing/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          prompt,
          image_url: imageUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[NanoBananaEditAPI] Workflow execution failed:", response.status, errorText);
      throw new Error(`Workflow request failed: ${response.statusText}`);
    }

    const responseJson = await response.json();
    console.log("[NanoBananaEditAPI] Response:", JSON.stringify(responseJson, null, 2));

    // Response structure from VoltAgent workflow execute is:
    // { success: true, data: { executionId, result: { success, images: [...] } } }
    const workflowData = responseJson.data || responseJson;
    const workflowResult = workflowData.result || workflowData;
    const voltExecutionId = workflowData.executionId || responseJson.id;
    const images = workflowResult.images || [];

    console.log("[NanoBananaEditAPI] Parsed voltExecutionId:", voltExecutionId);
    console.log("[NanoBananaEditAPI] Parsed images count:", images.length);

    // Flatten image result
    // The tool returns data like: images: [ { images: [{ url: ... }], description: "..." } ]
    // Each item in the array has an `images` array inside it from Fal response
    const finalImages: any[] = [];
    if (Array.isArray(images)) {
        for (const imgBatch of images) {
            if (imgBatch && imgBatch.images && Array.isArray(imgBatch.images)) {
                finalImages.push(...imgBatch.images);
            } else if (imgBatch && imgBatch.url) {
                finalImages.push(imgBatch);
            }
        }
    }
    console.log("[NanoBananaEditAPI] Flattened images count:", finalImages.length);

    // --- DATABASE PERSISTENCE ---
    let createdIds: string[] = [];
    if (projectId && finalImages.length > 0) {
        console.log("[NanoBananaEditAPI] Saving to DB for project:", projectId);
        
        // 1. Create a brief version for the edit
        const { data: briefVersion, error: briefError } = await supabase
          .from("project_brief_versions")
          .insert({
            project_id: projectId,
            version_number: Math.floor(Date.now() / 1000),
            user_brief_text: prompt,
            enhanced_brief_json: { type: "edit", source_image: imageUrl },
            is_approved: true,
          })
          .select("id")
          .single();

        if (briefError) {
            console.error("[NanoBananaEditAPI] Brief Insert Error:", briefError);
        }
        const briefVersionId = briefVersion?.id;

        // 2. Create the execution record
        const { data: execution, error: execError } = await supabase
          .from("workflow_executions")
          .insert({
            project_id: projectId,
            volt_execution_id: voltExecutionId,
            brief_version_id: briefVersionId,
            status: "completed",
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (execError) {
            console.error("[NanoBananaEditAPI] Execution Insert Error:", execError);
        }
        const internalExecutionId = execution?.id;

        // 3. Insert the image(s) linked to the execution
        const imageInserts = finalImages.map((img: any) => ({
             project_id: projectId,
             content_type: "edited_image",
             content_data: {
                 url: img.url,
                 prompt: prompt,
                 source_image: imageUrl,
                 type: "edit"
             },
             agent_id: "user-edit", 
             execution_id: internalExecutionId,
        }));
        
        const { data: insertData, error: insertError } = await supabase
            .from("project_content")
            .insert(imageInserts)
            .select("id");

        if (insertError) {
            console.error("[NanoBananaEditAPI] DB Insert Error:", insertError);
        } else if (insertData) {
            console.log("[NanoBananaEditAPI] Successfully saved to DB:", insertData);
            createdIds = insertData.map(d => d.id);
        }
    }

    return NextResponse.json({
      success: true,
      images: finalImages,
      createdIds: createdIds
    });

  } catch (error) {
    console.error("[NanoBananaEditAPI] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to edit image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
