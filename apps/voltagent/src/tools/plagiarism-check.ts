import { z } from "zod";
import { createTool } from "@voltagent/core";

export const plagiarismCheckTool = createTool({
  name: "plagiarism_check",
  description: "Check text content for plagiarism and originality.",
  parameters: z.object({
    text: z.string().describe("The long-form copy or ad copy to check."),
  }),
  execute: async ({ text }) => {
    // Mock implementation
    console.log(`[Plagiarism Check] Analyzing text length: ${text ? text.length : 0}`);

    if (!text) return { verdict: "No text provided." };

    // Mock detection based on specific phrases
    if (text.includes("Just do it") || text.includes("Think different")) {
      return {
        originality_score: 0.1,
        matches: [
          {
            source: "Famous Ad Campaigns",
            url: "https://example.com/famous-slogans",
            similarity: 1.0,
            excerpt: text.includes("Just do it") ? "Just do it" : "Think different"
          }
        ],
        verdict: "Plagiarism detected."
      };
    }

    return {
      originality_score: 0.98,
      matches: [],
      verdict: "Content appears original."
    };
  },
});
