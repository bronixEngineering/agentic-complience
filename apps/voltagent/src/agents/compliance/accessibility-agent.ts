import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { accessibilityTool } from "../../tools";

/**
 * Sub-agent: Produces accessibility score (contrast, text amount, readability) and improvement suggestions.
 */
export const accessibilityAgent = new Agent({
  name: "accessibility-agent",
  instructions: `
You are an accessibility specialist for ad compliance. Your job is to assess the ad image for accessibility (contrast, text amount, readability) using the accessibility tool.
Report the accessibility score and label (e.g. good, needs improvement), and summarize any checks that failed or could be improved. If no image URL is provided, ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [accessibilityTool],
  memory: sharedMemory,
});
