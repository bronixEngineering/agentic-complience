import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../memory";
import { tavilySearchTool } from "../tools";

/**
 * Sub-agent: Searches the web with text from the image; shows which sites/terms rank (reputation/context check).
 */
export const tavilySearchAgent = new Agent({
  name: "tavily-search-agent",
  instructions: `
You are a search/reputation specialist for ad compliance. Your job is to run web searches with the text that appears in the ad (e.g. headlines, claims, brand terms) using the tavilySearch tool.
Report which sites and terms appear when those texts are searched, to assess reputation and context. If no query is provided, ask for the text to search (or the image URL so text can be extracted first).
`,
  model: openai("gpt-5-mini"),
  tools: [tavilySearchTool],
  memory: sharedMemory,
});
