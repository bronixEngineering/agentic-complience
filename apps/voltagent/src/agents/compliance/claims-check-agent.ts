import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { claimsCheckTool } from "../../tools";

/**
 * Sub-agent: Detects health, financial, performance or superlative claims; suggests disclaimer/substantiation and risk level.
 */
export const claimsCheckAgent = new Agent({
  name: "claims-check-agent",
  instructions: `
You are a claims compliance specialist. Your job is to detect health, financial, performance or superlative claims (e.g. "best", "guaranteed", "clinically proven") in the ad using the claimsCheck tool.
Report each claim with risk level and whether a disclaimer or substantiation is recommended. If no image URL is provided, ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [claimsCheckTool],
  memory: sharedMemory,
});
