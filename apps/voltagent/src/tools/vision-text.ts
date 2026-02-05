import { createTool } from "@voltagent/core";
import { z } from "zod";
import { visionAnnotate, fetchImageAsBase64 } from "./vision-common";

/**
 * Google Vision API – text detection (OCR) via REST + API key.
 */
export const visionTextTool = createTool({
  name: "visionText",
  description:
    "Detect and extract text from an image using Google Cloud Vision API (OCR). Returns full text and word/block annotations.",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the image to run text detection on"),
  }),
  execute: async (args) => {
    const { imageUrl } = args;
    try {
      const content = await fetchImageAsBase64(imageUrl);
      const response = await visionAnnotate(content, "TEXT_DETECTION");
      const err = response.error;
      if (err) {
        return { error: err.message || "Vision API text detection error" };
      }
      const annotation = response.textAnnotations;
      if (!annotation || annotation.length === 0) {
        return { fullText: "", blocks: [] };
      }
      const fullText = annotation[0].description ?? "";
      const blocks = annotation.slice(1).map((a) => ({
        description: a.description ?? "",
        boundingPoly: a.boundingPoly,
      }));
      return { fullText, blocks };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: message };
    }
  },
});
