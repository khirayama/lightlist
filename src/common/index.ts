import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

export type { Session } from "@supabase/supabase-js";

export function createSupabaseClient() {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.supabase) {
      globalThis.supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    return globalThis.supabase;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return supabase;
}

export function createPrismaClient() {
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.prisma) {
      globalThis.prisma = new PrismaClient();
    }
    return globalThis.prisma;
  }
  return new PrismaClient();
}
