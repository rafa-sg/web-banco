"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Condition } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function update(table: string, id: string, values: Record<string, unknown>): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.from(table).update(values).eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "No se guardó: tu usuario no tiene permiso de edición sobre esta tabla." };
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function setRuleActive(id: string, isActive: boolean) {
  return update("collection_rules", id, { is_active: isActive });
}

export async function setRulePriority(id: string, priority: number) {
  if (!Number.isInteger(priority) || priority < 0 || priority > 10000) return { ok: false, error: "La prioridad debe ser un entero entre 0 y 10000." } as ActionResult;
  return update("collection_rules", id, { priority });
}

export async function setRuleConditions(id: string, conditions: Condition[]) {
  if (!conditions.length) return { ok: false, error: "La regla necesita al menos una condición." } as ActionResult;
  return update("collection_rules", id, { conditions: { all: conditions } });
}

export async function setOfferActive(id: string, isActive: boolean) {
  return update("offers", id, { is_active: isActive });
}

export async function decideCommitment(id: string, approve: boolean) {
  return update("commitments", id, { status: approve ? "approved" : "cancelled", resolved_at: new Date().toISOString() });
}

export async function assignEscalation(id: string, assignee: string) {
  const value = assignee.trim();
  if (!value) return { ok: false, error: "Indica a quién se asigna." } as ActionResult;
  return update("escalations", id, { assigned_to: value });
}

export async function resolveEscalation(id: string, notes: string) {
  return update("escalations", id, { status: "resolved", notes: notes.trim() || null, resolved_at: new Date().toISOString() });
}

export type RuleTestResult = { ok: true; result: unknown } | { ok: false; error: string };

export async function testRulesForCustomer(customerId: string): Promise<RuleTestResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("match_rules", { p_customer_id: customerId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, result: data };
}
