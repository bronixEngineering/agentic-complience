import { NextResponse } from "next/server"
import { fal } from "@fal-ai/client"

const allowedAspectRatios = new Set([
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
])

type AspectRatio =
  | "21:9"
  | "16:9"
  | "3:2"
  | "4:3"
  | "5:4"
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string
      aspect_ratio?: string
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : ""
    const aspectRatio = body.aspect_ratio ?? "1:1"

    if (!prompt || prompt.length < 8) {
      return NextResponse.json(
        { error: "Prompt must be at least 8 characters." },
        { status: 400 }
      )
    }

    if (!allowedAspectRatios.has(aspectRatio)) {
      return NextResponse.json(
        { error: "Invalid aspect ratio." },
        { status: 400 }
      )
    }

    const aspectRatioValue = aspectRatio as AspectRatio

    if (process.env.FAL_KEY) {
      fal.config({ credentials: process.env.FAL_KEY })
    } else {
      return NextResponse.json(
        { error: "Missing FAL_KEY on the server." },
        { status: 500 }
      )
    }

    const result = await fal.subscribe("fal-ai/nano-banana-pro", {
      input: {
        prompt,
        aspect_ratio: aspectRatioValue,
      },
    })

    return NextResponse.json(result.data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate image."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
