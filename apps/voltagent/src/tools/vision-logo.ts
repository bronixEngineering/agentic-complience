import { createTool } from "@voltagent/core";
import { z } from "zod";
import { visionAnnotate, fetchImageAsBase64 } from "./vision-common";

/**
 * Google Vision API – logo detection via REST + API key.
 */
export const visionLogoTool = createTool({
  name: "visionLogo",
  description:
    "Detect logos (brands, products) in an image using Google Cloud Vision API. Returns logo names and locations.",
  parameters: z.object({
    imageUrl: z
      .string()
      .describe(
        "Image URL to run logo detection on. Can be a public http(s) URL or a data: URL (base64) from an attached upload."
      ),
  }),
  execute: async (args) => {
    const { imageUrl } = args;
    try {
      const content = await fetchImageAsBase64(imageUrl);
      const response = await visionAnnotate(content, "LOGO_DETECTION");
      const err = response.error;
      if (err) {
        return { error: err.message || "Vision API logo detection error" };
      }
      const annotations = response.logoAnnotations ?? [];
      const logos = annotations.map((a) => ({
        description: a.description ?? "",
        score: a.score,
        boundingPoly: a.boundingPoly,
      }));
      return { logos };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: message };
    }
  },
});
