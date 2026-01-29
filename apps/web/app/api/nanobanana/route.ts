import { NextResponse } from "next/server"

// We no longer use @fal-ai/client here directly
// The workflow on the backend now handles the generation

type FalImage = {
  url: string
  file_name?: string
  content_type?: string
}

type FalResult = {
  images: FalImage[]
}

type WorkflowImageResult = {
  personaId: string
  imageUrl: FalResult
}

type WorkflowResponse = {
  id: string
  status: string
  result: {
    images?: WorkflowImageResult[]
  }
}

const VOLTAGENT_API_URL = process.env.VOLTAGENT_API_URL || "http://localhost:3141"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string
      aspect_ratio?: string // Workflow V2 determines this automatically, but we might pass it as hint if workflow supported it. Currently it infers.
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""

    if (!prompt || prompt.length < 8) {
      return NextResponse.json(
        { error: "Prompt must be at least 8 characters." },
        { status: 400 }
      )
    }

    console.log(`[NanoBananaAPI] Starting creative execution for prompt: "${prompt.substring(0, 50)}..."`)

    // Call the VoltAgent Workflow
    // We use the "andThen" style execution or direct execute endpoint
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (process.env.VOLTAGENT_SECRET_KEY) {
      headers["Authorization"] = `Bearer ${process.env.VOLTAGENT_SECRET_KEY}`
    } else if (process.env.VOLTAGENT_PUBLIC_KEY) {
       // Sometimes public key is used for client-side, but let's send it if secret is missing just in case
       headers["X-Voltagent-Key"] = process.env.VOLTAGENT_PUBLIC_KEY
    }

    const response = await fetch(`${VOLTAGENT_API_URL}/workflows/creative-fanout-v2/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: {
          brief: prompt,
          // We could pass personas here if we pushed the frontend to support selection
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[NanoBananaAPI] Workflow execution failed:", response.status, errorText)
      throw new Error(`Workflow request failed: ${response.statusText}`)
    }

    const workflowData = (await response.json()) as WorkflowResponse
    console.log("[NanoBananaAPI] Workflow completed. Result:", JSON.stringify(workflowData.result?.images?.length || 0))

    // Transform the workflow result into the format expected by the frontend
    // Frontend expects: { images: ImageFile[], description: string }
    const rawImages = workflowData.result?.images || []
    
    const flattenedImages = rawImages.flatMap((item) => {
      // item.imageUrl is the Fal result object which contains an 'images' array
      const falImages = item.imageUrl?.images || []
      
      return falImages.map((img) => ({
        url: img.url,
        file_name: img.file_name || `${item.personaId}.png`,
        content_type: img.content_type || "image/png",
      }))
    })

    if (flattenedImages.length === 0) {
       console.warn("[NanoBananaAPI] No images returned from workflow")
    }

    return NextResponse.json({
      images: flattenedImages,
      description: `Generated ${flattenedImages.length} variations via Creative Fanout V2`,
    })

  } catch (error) {
    console.error("[NanoBananaAPI] Error:", error)
    const message = error instanceof Error ? error.message : "Failed to generate images."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
