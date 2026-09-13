"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RunResult = { ok: true; summary: string } | { ok: false; error: string };

export async function runDetection(): Promise<RunResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_detection", {});
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true, summary: summarizeRun(data) };
}

function summarizeRun(data: unknown) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, unknown>).filter(([, value]) => typeof value === "number");
    if (entries.length) return entries.map(([key, value]) => `${key.replaceAll("_", " ")}: ${value}`).join(" · ");
  }
  return "Corrida completada. La cola se recalculó con los datos actuales.";
}
