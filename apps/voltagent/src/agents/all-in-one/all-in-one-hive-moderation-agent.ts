import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { hiveModerationTool } from "../../tools";

/**
 * Sub-agent: Moderates an image via Hive Visual Moderation.
 */
export const allInOneHiveModerationAgent = new Agent({
  name: "all-in-one-hive-moderation-agent",
  instructions: `
Your only task: call hiveModeration with the given image URL, then return a short summary of the response.

## Important constraints
- Hive requires a PUBLIC http(s) image URL.
- If you only receive an attached image as a data: URL, you must ask for a public URL.

## What to do
- If no public image URL is provided, ask for it briefly.
- Call hiveModeration with { imageUrl }.

## Output (strict)
- Summarize the highest-risk categories (top few class_name + value).
- If the tool returns an error, output that error and nothing else.
`,
  model: openai("gpt-5-mini"),
  tools: [hiveModerationTool],
  memory: sharedMemory,
});

