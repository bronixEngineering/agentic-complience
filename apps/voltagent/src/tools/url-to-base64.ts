import { createTool } from "@voltagent/core";
import { z } from "zod";

/**
 * Fetches a URL (e.g. CDN) and returns the response body as base64.
 */
export const urlToBase64Tool = createTool({
  name: "urlToBase64",
  description:
    "Fetch a public URL (e.g. CDN, image, or file URL) and return its content as base64. Use when the user needs a URL converted to base64 (e.g. for downstream tools that require data: URLs or base64).",
  parameters: z.object({
    url: z
      .string()
      .url()
      .describe("Public http(s) URL to fetch (e.g. CDN or image URL)."),
  }),
  execute: async (args) => {
    const url = args.url?.trim();
    if (!url) {
      return { error: "url is required." };
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "url must be http or https." };
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return { error: `Failed to fetch: HTTP ${res.status}` };
      }
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const contentType = res.headers.get("content-type") ?? undefined;
      return { base64, contentType };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { error: message };
    }
  },
});
