import { createTool } from "@voltagent/core";
import { z } from "zod";

/** Hive Visual Moderation API – statik key; ileride process.env.HIVE_SECRET_KEY kullanılabilir. */
const HIVE_SECRET_KEY = "9FpLIvEiPsZOX7/MUcqndg==";

const HIVE_VISUAL_MODERATION_URL =
  "https://api.thehive.ai/api/v3/hive/visual-moderation";

/** Hive API response shape (image: single frame in output). */
interface HiveClass {
  class_name: string;
  value: number;
}

interface HiveOutputItem {
  classes: HiveClass[];
  extra?: unknown[];
}

interface HiveSuccessResponse {
  task_id: string;
  model: string;
  version?: string;
  output: HiveOutputItem[];
}

/**
 * Amaç: Görselde riskli içerik var mı (NSFW, silah, şiddet vb.) Hive kategorileriyle skorlar;
 * brand-safe yayın için kullanılır.
 * Modelden gelen tüm class'lar (class_name + value) aynen döndürülür.
 */
export const hiveModerationTool = createTool({
  name: "hiveModeration",
  description:
    "Score image for risky content (NSFW, weapons, violence, etc.) via Hive categories for brand-safe publishing",
  parameters: z.object({
    imageUrl: z.string().describe("URL of the image to moderate"),
  }),
  execute: async (args): Promise<HiveSuccessResponse | { error: string; task_id?: null; output?: [] }> => {
    const { imageUrl } = args;

    let res: Response;
    try {
      res = await fetch(HIVE_VISUAL_MODERATION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HIVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: [{ media_url: imageUrl }],
        }),
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Hive API unreachable";
      return { error: message, task_id: null, output: [] };
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.text();
        if (body) detail += `: ${body.slice(0, 200)}`;
      } catch {
        // ignore
      }
      return { error: detail, task_id: null, output: [] };
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { error: "Invalid Hive response (not JSON)", task_id: null, output: [] };
    }

    const parsed = data as Partial<HiveSuccessResponse>;
    if (
      typeof parsed?.task_id !== "string" ||
      typeof parsed?.model !== "string" ||
      !Array.isArray(parsed?.output)
    ) {
      return {
        error: "Invalid Hive response (missing task_id, model, or output)",
        task_id: null,
        output: [],
      };
    }

    return {
      task_id: parsed.task_id,
      model: parsed.model,
      ...(parsed.version !== undefined && { version: parsed.version }),
      output: parsed.output,
    };
  },
});
