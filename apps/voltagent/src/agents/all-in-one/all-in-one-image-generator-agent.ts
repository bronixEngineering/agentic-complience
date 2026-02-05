import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { nanoBananaProTool } from "../../tools";

/**
 * Sub-agent: Generates a single image via Nano Banana Pro.
 */
export const allInOneImageGeneratorAgent = new Agent({
  name: "all-in-one-image-generator-agent",
  instructions: `
Your only task: generate ONE image by calling nanoBananaProImage.

## Inputs you need from the user/task
- prompt: required (must be at least 8 characters)
- aspect_ratio: optional (defaults to 1:1). Allowed: 21:9, 16:9, 3:2, 4:3, 5:4, 1:1, 4:5, 3:4, 2:3, 9:16

## What to do
- If prompt is missing, ask for it briefly.
- Call nanoBananaProImage with { prompt, aspect_ratio? }.

## Output (strict)
- Return the generated image URL if present (first line): imageUrl: <url>
- Then a short 1-2 sentence summary.
- If you cannot find a URL in the tool result, return: imageUrl: (missing) and include a compact JSON snippet of the result.
`,
  model: openai("gpt-5-mini"),
  tools: [nanoBananaProTool],
  memory: sharedMemory,
});

