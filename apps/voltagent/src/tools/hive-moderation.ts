import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Amaç: Görselde riskli içerik var mı (NSFW, silah, şiddet vb.) Hive kategorileriyle skorlar;
 * brand-safe yayın için kullanılır.
 */
// TODO: Hive Visual Moderation API (docs.thehive.ai); V3 playground or V2 enterprise
export const hiveModerationTool = createTool({
  name: "hiveModeration",
  description: "Score image for risky content (NSFW, weapons, violence, etc.) via Hive categories for brand-safe publishing",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the image to moderate"),
  }),
  execute: async (args) => {
    const { imageUrl } = args;
    // Demo: return mock risk scores
    return {
      nsfw: 0.02,
      weapons: 0.01,
      violence: 0.0,
      hate: 0.0,
      selfHarm: 0.0,
      summary: "Low risk; no actionable flags (demo).",
    };
  },
});
