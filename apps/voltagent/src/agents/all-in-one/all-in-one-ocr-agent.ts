import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionTextTool } from "../../tools";

/**
 * Sub-agent: Extracts text from images via Google Vision OCR.
 */
export const allInOneOcrAgent = new Agent({
  name: "all-in-one-ocr-agent",
  instructions: `
Your only task: call visionText with the given image reference (public http(s) URL or attached image as a data: URL), then return the extracted text.

## What to do
- If no image reference is provided, ask for an image or image URL briefly.
- Call visionText with { imageUrl }.

## Output (strict)
- If fullText is present, output it (no extra commentary).
- If the tool returns an error, output that error and nothing else.
`,
  model: openai("gpt-5-mini"),
  tools: [visionTextTool],
  memory: sharedMemory,
});

