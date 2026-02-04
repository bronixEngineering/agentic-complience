import { z } from "zod";
import { createTool } from "@voltagent/core";

export const trademarkSearchTool = createTool({
  name: "trademark_search",
  description: "Search for trademark conflicts for campaign names, slogans, or brand marks.",
  parameters: z.object({
    query: z.string().describe("The text content (name, slogan) to search for."),
    types: z.array(z.enum(["word", "slogan", "logo"])).describe("Types of trademarks to check against."),
  }),
  execute: async ({ query, types }) => {
    // Mock implementation
    console.log(`[Trademark Search] Checking '${query}' against ${types.join(", ")}`);
    
    // Simulate some logic
    const lowerQuery = query.toLowerCase();
    
    // Mock results based on keywords
    if (lowerQuery.includes("nike") || lowerQuery.includes("apple") || lowerQuery.includes("coke")) {
      return {
        status: "CONFLICT_FOUND",
        conflicts: [
          {
            mark: query,
             owner: "MegaCorp Inc.",
            similarity_score: 0.95,
            status: "REGISTERED"
          }
        ],
        verdict: "High risk of infringement."
      };
    }

    return {
      status: "CLEAN",
      conflicts: [],
      verdict: "No direct conflicts found."
    };
  },
});
