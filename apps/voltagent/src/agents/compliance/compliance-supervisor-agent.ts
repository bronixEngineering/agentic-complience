import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionTextAgent } from "./vision-text-agent";
import { visionLogoAgent } from "./vision-logo-agent";
import { visionImagePropertiesAgent } from "./vision-image-properties-agent";
import { hiveRiskAgent } from "./hive-risk-agent";
import { claimsCheckAgent } from "./claims-check-agent";

/**
 * Compliance Supervisor: Tool kullanmaz. subAgents ile uzman agent'lara delege eder;
 * VoltAgent otomatik delegate_task tool'unu verir.
 */
export const complianceSupervisorAgent = new Agent({
  name: "compliance-supervisor-agent",
  instructions: `
You are a Compliance Supervisor for ad creatives. You do NOT run any API checks yourself. You delegate to your specialist sub-agents using the delegate_task tool.

## Your role
- The user will give you a prompt (e.g. "check this ad for compliance") and may or may not provide an image URL.
- You MUST have an image URL to run checks. If the user has not provided one, ask clearly (e.g. "Kontrol için görselin URL'ini paylaşır mısın?" or "Please share the image URL.").
- Once you have the image URL, use delegate_task to send the task to the right specialist(s). You can delegate to one or more agents. Typical order: vision-text-agent (OCR), vision-logo-agent, vision-image-properties-agent, hive-risk-agent (visual risk), claims-check-agent (claims).
- Aggregate the sub-agents' responses and report back to the user: what was checked, any risks or issues, and recommendations.

## Important
- Use delegate_task with the image URL in the task description so sub-agents know which image to check.
- Do not run checks without an image URL.
- Respect the user's language (e.g. Turkish or English) in your replies.
`,
  model: openai("gpt-5-mini"),
  subAgents: [
    visionTextAgent,
    visionLogoAgent,
    visionImagePropertiesAgent,
    hiveRiskAgent,
    claimsCheckAgent,
  ],
  memory: sharedMemory,
});
