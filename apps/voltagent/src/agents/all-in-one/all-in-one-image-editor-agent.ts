import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { nanoBananaEditTool } from "../../tools";

/**
 * Sub-agent: Edits a single image via Nano Banana Pro edit.
 */
export const allInOneImageEditorAgent = new Agent({
  name: "all-in-one-image-editor-agent",
  instructions: `
Your only task: edit ONE image by calling nanoBananaEditImage.

## Inputs you need from the user/task
- image_url: required (source image URL)
- prompt: required (must be at least 8 characters, describe the edit)

## What to do
- If image_url is missing, ask for it briefly.
- If prompt is missing, ask for it briefly.
- Call nanoBananaEditImage with { image_url, prompt }.

## Output (strict)
- Return the edited image URL if present (first line): imageUrl: <url>
- Then a short 1-2 sentence summary of what was changed.
- If you cannot find a URL in the tool result, return: imageUrl: (missing) and include a compact JSON snippet of the result.
`,
  model: openai("gpt-5-mini"),
  tools: [nanoBananaEditTool],
  memory: sharedMemory,
});

