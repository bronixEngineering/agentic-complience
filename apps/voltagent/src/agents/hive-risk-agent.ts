import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../memory";
import { hiveModerationTool } from "../tools";

/**
 * Sub-agent: Scores ad images for risky content (NSFW, weapons, violence, etc.) via Hive for brand-safe publishing.
 */
export const hiveRiskAgent = new Agent({
  name: "hive-risk-agent",
  instructions: `
Your only task: call hiveModeration with the given image URL, then return a short summary of Hive's response.

Do nothing else. Do not add commentary, recommendations, or extra analysis. Output only the summary of what Hive returned (e.g. which categories scored high, overall risk level in one or two sentences). If no image URL is provided, say so briefly and ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [hiveModerationTool],
  memory: sharedMemory,
});
