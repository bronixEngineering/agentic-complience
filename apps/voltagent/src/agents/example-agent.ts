import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { calculatorTool, webSearchTool } from "../tools";
import { sharedMemory } from "../memory";

/**
 * Example agent that can perform calculations and web searches
 */
export const exampleAgent = new Agent({
  name: "example-agent",
  instructions: `You are a helpful assistant that can:
- Perform mathematical calculations using the calculator tool
- Search the web for information using the web search tool
- Answer questions based on your knowledge and search results

Always be helpful, accurate, and concise in your responses.`,
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool, webSearchTool],
  memory: sharedMemory,
});
