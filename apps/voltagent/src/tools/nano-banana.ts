import { fal } from "@fal-ai/client";
import { createTool } from "@voltagent/core";
import { z } from "zod";

const allowedAspectRatios = new Set([
  "21:9",
  "16:9",
  "3:2",
  "4:3",
  "5:4",
  "1:1",
  "4:5",
  "3:4",
  "2:3",
  "9:16",
]);

type AspectRatio =
  | "21:9"
  | "16:9"
  | "3:2"
  | "4:3"
  | "5:4"
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "9:16";

// Initialize fal-ai client configuration once
let falConfigured = false;
function ensureFalConfigured() {
  if (!falConfigured) {
    if (!process.env.FAL_KEY) {
      throw new Error("Missing FAL_KEY in the environment. Please set FAL_KEY environment variable.");
    }
    fal.config({ credentials: process.env.FAL_KEY });
    falConfigured = true;
  }
}

export const nanoBananaProTool = createTool({
  name: "nanoBananaProImage",
  description: "Generate an image using Nano Banana Pro via fal-ai.",
  parameters: z.object({
    prompt: z.string().describe("Prompt text to render with Nano Banana Pro."),
    aspect_ratio: z
      .string()
      .optional()
      .describe(
        "Optional aspect ratio (e.g. 1:1, 4:5). Defaults to 1:1."
      ),
  }),
  execute: async (args) => {
    try {
      // Ensure fal-ai is configured
      ensureFalConfigured();

      const prompt = args.prompt?.trim();
      const aspectRatio = (args.aspect_ratio || "1:1").trim();

      if (!prompt || prompt.length < 8) {
        throw new Error("Prompt must be at least 8 characters.");
      }

      if (!allowedAspectRatios.has(aspectRatio)) {
        throw new Error(
          `Invalid aspect ratio "${aspectRatio}". Allowed ratios: ${[
            ...allowedAspectRatios,
          ].join(", ")}`
        );
      }

      const result = await fal.subscribe("fal-ai/nano-banana-pro", {
        input: {
          prompt,
          aspect_ratio: aspectRatio as AspectRatio,
        },
      });

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known user errors directly
        if (
          error.message.includes("FAL_KEY") ||
          error.message.includes("aspect ratio") ||
          error.message.includes("at least 8")
        ) {
          throw error;
        }
        throw new Error(`Failed to generate image with Nano Banana Pro: ${error.message}`);
      }
      throw new Error(`Failed to generate image with Nano Banana Pro: ${String(error)}`);
    }
  },
});
