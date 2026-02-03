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
You are a visual moderation specialist for ad compliance. Your job is to check the given image URL for risky content (NSFW, weapons, violence, hate, self-harm) using the hiveModeration tool.
Summarize the risk scores and flag any categories that may require action. If no image URL is provided, ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [hiveModerationTool],
  memory: sharedMemory,
});
