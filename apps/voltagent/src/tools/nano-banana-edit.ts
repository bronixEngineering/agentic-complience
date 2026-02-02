import { fal } from "@fal-ai/client";
import { createTool } from "@voltagent/core";
import { z } from "zod";

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

export const nanoBananaEditTool = createTool({
  name: "nanoBananaEditImage",
  description: "Edit an image using Nano Banana Pro (or compatible model) via fal-ai.",
  parameters: z.object({
    prompt: z.string().describe("Prompt text to describe the edit or new image."),
    image_url: z.string().describe("URL of the source image to edit."),
  }),
  execute: async (args) => {
    try {
      ensureFalConfigured();

      const prompt = args.prompt?.trim();
      const imageUrl = args.image_url?.trim();

      if (!prompt || prompt.length < 8) {
        throw new Error("Prompt must be at least 8 characters.");
      }
      if (!imageUrl) {
        throw new Error("Image URL is required.");
      }

      // Using nano-banana-pro/edit as per user request
      // Input requires 'image_urls' as an array
      const result = await fal.subscribe("fal-ai/nano-banana-pro/edit", {
          input: {
            prompt,
            image_urls: [imageUrl],
            num_images: 1, // Force exactly 1 image
          } as any,
      });

      return result.data;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw known user errors directly
        if (
          error.message.includes("FAL_KEY") ||
          error.message.includes("image_url")
        ) {
          throw error;
        }
        throw new Error(`Failed to edit image with Nano Banana Edit: ${error.message}`);
      }
      throw new Error(`Failed to edit image with Nano Banana Edit: ${String(error)}`);
    }
  },
});

