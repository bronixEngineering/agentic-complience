import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Amaç: Görseldeki metinleri (başlık, CTA, logo yazısı vb.) çıkarır;
 * diğer agent'ların metin tabanlı analizi için girdi sağlar.
 */
// TODO: fal.ai image-to-text (e.g. fal-ai/florence2) or OpenAI Vision / GPT-4o image input
export const imageToTextTool = createTool({
  name: "imageToText",
  description: "Extract text from an image (headlines, CTA, logo text, etc.) for downstream analysis",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the image to extract text from"),
  }),
  execute: async (args) => {
    const { imageUrl } = args;
    // Demo: return mock extracted text
    return {
      text: "Sample product headline, CTA: Shop Now. Limited time offer.",
    };
  },
});
