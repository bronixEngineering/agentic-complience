import { Memory } from "@voltagent/core";
import { SafeSupabaseMemoryAdapter } from "./safe-supabase-memory-adapter";

/**
 * Shared memory instance - all agents will use the same memory storage
 */
export const sharedMemory = new Memory({
  storage: new SafeSupabaseMemoryAdapter({
    // Prefer dedicated backend env vars; fall back to existing project env names if present.
    supabaseUrl:
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL ??
      (() => {
        throw new Error("Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) for SupabaseMemoryAdapter.");
      })(),
    supabaseKey:
      process.env.SUPABASE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY ??
      (() => {
        throw new Error("Missing SUPABASE_KEY (or NEXT_PUBLIC_SUPABASE_SECRET_KEY) for SupabaseMemoryAdapter.");
      })(),
  }),
});
