import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionLogoTool } from "../../tools";

/**
 * Sub-agent: Detects logos (brands/products) in images via Google Cloud Vision logo detection.
 */
export const visionLogoAgent = new Agent({
  name: "vision-logo-agent",
  instructions: `
Your only task: call visionLogo with the given image reference (public http(s) URL or attached image as a data: URL), then return a short summary of the detected logos.

Do nothing else. Output only a summary of which logos/brands were found (or that none were detected). If no image reference is provided, say so briefly and ask for an image or image URL.
`,
  model: openai("gpt-5-mini"),
  tools: [visionLogoTool],
  memory: sharedMemory,
});
