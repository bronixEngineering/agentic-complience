import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Amaç: Reklamda sağlık, finans, performans veya "en iyi/garanti" gibi iddiaları tespit eder;
 * disclaimer/kanıt ihtiyacı ve risk seviyesi önerir.
 */
// TODO: LLM (GPT/Claude) structured output for claim extraction, or dedicated claims API if available
export const claimsCheckTool = createTool({
  name: "claimsCheck",
  description: "Detect health, financial, performance or superlative claims in the ad; suggest disclaimer/substantiation and risk level",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the ad image"),
    extractedText: z.string().optional().describe("Optional text already extracted from the image"),
  }),
  execute: async (args) => {
    const { imageUrl, extractedText } = args;
    // Demo: return mock claims
    return {
      claims: [
        {
          type: "health",
          text: "clinically proven",
          risk: "high",
          suggestion: "Add disclaimer or substantiation",
        },
        {
          type: "superlative",
          text: "best",
          risk: "medium",
          suggestion: "Consider softening or substantiate",
        },
      ],
      overallRisk: "medium",
      disclaimerRecommended: true,
      summary: "2 claims detected; disclaimer recommended for health claim.",
    };
  },
});
