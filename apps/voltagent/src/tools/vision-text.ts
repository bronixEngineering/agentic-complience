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
    imageUrl: z
      .string()
      .describe(
        "Image reference to run text detection on. Accepts: (1) public http(s) URL, (2) data: URL (base64) from an attached upload, OR (3) raw base64-encoded image bytes."
      ),
  }),
  execute: async (args) => {
    const raw = args.imageUrl?.trim();
    try {
      if (!raw) {
        return { error: "imageUrl is required (http(s) URL, data: URL, or raw base64)." };
      }

      const looksLikeBase64 = (value: string) => {
        // Heuristic: base64 strings are long, contain only base64 charset (+ optional padding),
        // and typically have no URL scheme.
        const v = value.replace(/\s+/g, "");
        if (v.length < 64) return false;
        if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) return false;
        if (!/^[A-Za-z0-9+/=]+$/.test(v)) return false;
        // Allow unpadded base64; if padded, padding should be at the end.
        if (v.includes("=") && !/=+$/.test(v)) return false;
        return true;
      };

      const content = looksLikeBase64(raw) ? raw.replace(/\s+/g, "") : await fetchImageAsBase64(raw);
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
