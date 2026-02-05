import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionImagePropertiesTool } from "../../tools";

/**
 * Sub-agent: Returns image properties (e.g. dominant colors) via Google Cloud Vision.
 */
export const visionImagePropertiesAgent = new Agent({
  name: "vision-image-properties-agent",
  instructions: `
Your only task: call visionImageProperties with the given image URL, then return a short summary of the image properties (e.g. dominant colors).

Do nothing else. Output only a summary of what the API returned. If no image URL is provided, say so briefly and ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [visionImagePropertiesTool],
  memory: sharedMemory,
});
