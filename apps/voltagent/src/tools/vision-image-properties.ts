import { createTool } from "@voltagent/core";
import { z } from "zod";
import { visionAnnotate, fetchImageAsBase64 } from "./vision-common";

/**
 * Google Vision API – image properties (dominant colors) via REST + API key.
 */
export const visionImagePropertiesTool = createTool({
  name: "visionImageProperties",
  description:
    "Get image properties (dominant colors, etc.) from an image using Google Cloud Vision API.",
  parameters: z.object({
    imageUrl: z
      .string()
      .describe(
        "Image URL to get properties for. Can be a public http(s) URL or a data: URL (base64) from an attached upload."
      ),
  }),
  execute: async (args) => {
    const { imageUrl } = args;
    try {
      const content = await fetchImageAsBase64(imageUrl);
      const response = await visionAnnotate(content, "IMAGE_PROPERTIES");
      const err = response.error;
      if (err) {
        return { error: err.message || "Vision API image properties error" };
      }
      const colors = response.imagePropertiesAnnotation?.dominantColors?.colors ?? [];
      return {
        dominantColors: colors.map((c) => ({
          color: c.color,
          score: c.score,
          pixelFraction: c.pixelFraction,
        })),
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: message };
    }
  },
});
