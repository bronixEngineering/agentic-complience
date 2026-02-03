import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { sharedMemory } from "../memory";
import { imageToTextTool } from "../tools";

/**
 * Sub-agent: Extracts text from ad images (headlines, CTA, logo text) for downstream compliance checks.
 */
export const imageToTextAgent = new Agent({
  name: "image-to-text-agent",
  instructions: `
You are an image-to-text specialist for ad compliance. Your job is to extract all visible text from the given image URL using the imageToText tool.
Return the extracted text clearly so it can be used by other checks (claims, platform policy, Tavily search, etc.).
If the user has not provided an image URL, ask for it. Otherwise call the imageToText tool with the imageUrl and summarize the result.
`,
  model: openai("gpt-5-mini"),
  tools: [imageToTextTool],
  memory: sharedMemory,
});
