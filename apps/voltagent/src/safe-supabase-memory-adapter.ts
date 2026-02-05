import { SupabaseMemoryAdapter } from "@voltagent/supabase";
import type { ConversationStepRecord } from "@voltagent/core";

/**
 * Workaround for occasional Postgres upsert error:
 * "ON CONFLICT DO UPDATE command cannot affect row a second time"
 *
 * This happens when the adapter attempts to upsert multiple rows with the same
 * conflict target (typically duplicate step IDs) in a single batch.
 *
 * We dedupe by step `id` and ignore only this specific, safe-to-skip error.
 */
export class SafeSupabaseMemoryAdapter extends SupabaseMemoryAdapter {
  override async saveConversationSteps(steps: ConversationStepRecord[]): Promise<void> {
    const seen = new Set<string>();
    const deduped = steps.filter((s) => {
      const id = (s as unknown as { id?: unknown })?.id;
      if (typeof id !== "string") return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    try {
      await super.saveConversationSteps(deduped);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("cannot affect row a second time")) {
        // Non-fatal: steps are for observability; the core chat/memory still works.
        // eslint-disable-next-line no-console
        console.warn(
          "[memory] saveConversationSteps duplicate upsert; skipping this batch",
          message
        );
        return;
      }
      throw e;
    }
  }
}

