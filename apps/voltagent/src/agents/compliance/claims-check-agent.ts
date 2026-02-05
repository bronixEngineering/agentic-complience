import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";
import { visionTextTool } from "../../tools";

/**
 * Sub-agent: Önce visionText ile görseldeki metni alır (Vision OCR), sonra o metinde
 * iddia (claim) var mı diye kendi karar verir ve raporlar.
 */
export const claimsCheckAgent = new Agent({
  name: "claims-check-agent",
  instructions: `
You are a claims compliance specialist. Your only job is to check the ad image for claims that might require a disclaimer.

1. Call visionText with the image URL to get the text in the image (Google Vision OCR).
2. Using that text (fullText from the result), decide whether it contains any of these types of claims:
   - **health**: medical, clinical, treatment, cure, health-related promises
   - **financial**: guarantees, investment returns, money-back, financial promises
   - **performance**: "proven results", "guaranteed results", effectiveness claims
   - **superlative**: "best", "#1", "leading", "top", "most" type claims

3. Report your conclusion: list each claim you find with type, the exact phrase, risk (high/medium), and whether a disclaimer is recommended. If there are no such claims, say so clearly.

Base your decision on the meaning and context of the text, not on keyword matching. The text can be in Turkish or English.

If no image URL is provided, ask for it.
`,
  model: openai("gpt-5-mini"),
  tools: [visionTextTool],
  memory: sharedMemory,
});
