import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Amaç: Meta/Google reklam politikalarına uyumu kontrol eder (metin overlay limiti, yasaklı içerik vb.);
 * skor ve ihlal listesi döner.
 */
// TODO: Meta/Google policy rules as structured rules + LLM; text overlay % via image analysis or OCR
export const platformPolicyTool = createTool({
  name: "platformPolicy",
  description: "Check ad compliance with Meta/Google ad policies (text overlay limit, prohibited content, etc.); return score and issue list",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the ad image"),
    extractedText: z.string().optional().describe("Optional text already extracted from the image"),
    platform: z.enum(["meta", "google"]).optional().default("meta").describe("Target platform"),
  }),
  execute: async (args) => {
    const { imageUrl, extractedText, platform = "meta" } = args;
    // Demo: return mock policy check
    return {
      platform,
      compliant: false,
      score: 65,
      issues: [
        {
          rule: "text_overlay_limit",
          severity: "warning",
          message: "Text may exceed ~20% of image area; risk of reduced delivery.",
        },
        {
          rule: "prohibited_content",
          severity: "info",
          message: "No prohibited content detected.",
        },
      ],
      summary: "Check text overlay; otherwise policy-compliant for Meta.",
    };
  },
});
