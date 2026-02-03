import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Amaç: Görselde geçen metinlerle web araması yapar; bu metinlerle arandığında
 * hangi siteler/terimler öne çıkıyor gösterir (reputasyon/bağlam kontrolü).
 */
// TODO: @tavily/core tavily.search() with TAVILY_API_KEY
export const tavilySearchTool = createTool({
  name: "tavilySearch",
  description: "Search the web with text from the image; show which sites/terms rank when those terms are searched (reputation/context check)",
  parameters: z.object({
    query: z.string().describe("Search query (e.g. text extracted from the image)"),
    maxResults: z.number().optional().default(5).describe("Maximum number of results"),
  }),
  execute: async (args) => {
    const { query, maxResults = 5 } = args;
    // Demo: return mock results
    const results = Array.from({ length: maxResults }, (_, i) => ({
      title: `Result ${i + 1} for "${query}"`,
      url: `https://example.com/result-${i + 1}`,
      snippet: `Mock snippet for "${query}". In production, use Tavily API.`,
    }));
    return {
      query,
      results,
      totalResults: results.length,
    };
  },
});
