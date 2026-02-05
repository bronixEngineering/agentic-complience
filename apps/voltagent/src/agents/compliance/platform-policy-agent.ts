import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { platformPolicyTool } from "../../tools";

/**
 * Sub-agent: Checks ad compliance with Meta/Google ad policies (text overlay, prohibited content); returns score and issues.
 */
export const platformPolicyAgent = new Agent({
  name: "platform-policy-agent",
  instructions: `
You are a platform policy specialist for ad compliance. Your job is to check the ad image against Meta or Google ad policies (text overlay limit, prohibited content, etc.) using the platformPolicy tool.
Report the compliance score and any issues (warnings or violations). If no image URL is provided, ask for it. Specify the platform (meta or google) if the user has a target.
`,
  model: openai("gpt-5-mini"),
  tools: [platformPolicyTool],
  memory: sharedMemory,
});
