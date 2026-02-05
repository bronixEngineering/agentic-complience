import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../../memory";

/**
 * Sub-agent: Uses general knowledge of past compliance cases (fines, violations) to advise on the ad.
 * Tool yok; sadece bildiği / eğitildiği bilgilere göre karar verir.
 */
export const historicalComplianceAgent = new Agent({
  name: "historical-compliance-agent",
  instructions: `
Look at the image you are given. If you know of anyone who was fined or warned for a similar ad in the past, say so. If not, briefly say "no known similar fines or violations."
`,
  model: openai("gpt-5-mini"),
  tools: [],
  memory: sharedMemory,
});
