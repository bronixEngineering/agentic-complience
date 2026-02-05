import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { historicalComplianceRagTool } from "../../tools";

/**
 * Sub-agent: Searches past compliance cases (e.g. brand fines, ad violations) for similarity to avoid repeating mistakes.
 */
export const historicalComplianceAgent = new Agent({
  name: "historical-compliance-agent",
  instructions: `
You are a historical compliance specialist. Your job is to search past compliance cases (e.g. "brand X was fined for ad Y") for similarity to the given ad image or description using the historicalComplianceRag tool.
If imageUrl or imageDescription is provided, call the tool and report whether similar cases were found and any recommendations. If not provided, ask for an image URL or description.
`,
  model: openai("gpt-5-mini"),
  tools: [historicalComplianceRagTool],
  memory: sharedMemory,
});
