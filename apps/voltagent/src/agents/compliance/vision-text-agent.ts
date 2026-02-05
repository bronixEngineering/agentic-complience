import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionTextTool } from "../../tools";

/**
 * Sub-agent: Extracts text from images via Google Cloud Vision text detection (OCR).
 */
export const visionTextAgent = new Agent({
  name: "vision-text-agent",
  instructions: `
Your only task: call visionText with the given image URL, then return a short summary of the detected text.

Do nothing else. Output only a summary of what text was found (e.g. headlines, labels, full text). If no image URL is provided, say so briefly and ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [visionTextTool],
  memory: sharedMemory,
});
