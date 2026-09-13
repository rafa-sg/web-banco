"use server";

import { createClient } from "@/lib/supabase/server";

export type PaymentResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

export async function simulatePayment(token: string, method: string): Promise<PaymentResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("simulate_payment", { p_token: token, p_method: method });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {} };
}
