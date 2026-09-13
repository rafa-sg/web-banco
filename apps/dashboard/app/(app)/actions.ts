"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type RunResult = { ok: true; summary: string; live: boolean } | { ok: false; error: string };

type AgentRunResponse = {
  ok: boolean;
  error?: string;
  run?: { run_id: string; requiring_intervention: number; blocked: number; control_group: number };
  dispatch?: {
    voice_provider: "elevenlabs" | "simulated";
    email_provider: "resend" | "simulated";
    real_calls: number;
    simulated_calls: number;
    reminder_emails: number;
    fallback_emails: number;
    human: number;
    notes: string[];
  } | null;
};

/**
 * "Iniciar corrida": el servidor del agente recalcula con datos actuales (run_prevention) y despacha:
 * C–E → llamada del agente · A–B → correo · sin respuesta → correo. La decisión vive en la BD, no aquí.
 * AGENT_BASE_URL y AGENT_SHARED_SECRET son variables de servidor (nunca NEXT_PUBLIC_).
 */
export async function startPreventionRun(): Promise<RunResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

  const baseUrl = process.env.AGENT_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return { ok: false, error: "Falta AGENT_BASE_URL en .env.local del dashboard." };

  let body: AgentRunResponse;
  try {
    const response = await fetch(`${baseUrl}/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-secret": process.env.AGENT_SHARED_SECRET ?? "" },
      body: JSON.stringify({ created_by: auth.user.email ?? "web" }),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
    body = (await response.json()) as AgentRunResponse;
    if (!response.ok || !body.ok) return { ok: false, error: body.error ?? `El agente respondió ${response.status}` };
  } catch (error) {
    return { ok: false, error: `No se pudo contactar al agente en ${baseUrl}: ${(error as Error).message}` };
  }

  revalidatePath("/");
  revalidatePath("/en-vivo");
  return { ok: true, summary: summarizeRun(body), live: Boolean(body.dispatch && body.dispatch.real_calls + body.dispatch.simulated_calls > 0) };
}

export type CallResult = { ok: true; mode: "elevenlabs" | "simulated"; conversationId: string } | { ok: false; error: string };

type AgentCallResponse = { ok: boolean; error?: string; mode?: "elevenlabs" | "simulated"; conversationId?: string; elevenlabsConversationId?: string };

/**
 * "Empezar llamada" desde la ficha: el agente valida contacto habilitado y reglas de frecuencia en la BD.
 * mode "elevenlabs" = llamada telefónica real (cuesta dinero) · "simulated" = conversación simulada.
 */
export async function startCustomerCall(customerId: string): Promise<CallResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

  const baseUrl = process.env.AGENT_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return { ok: false, error: "Falta AGENT_BASE_URL en .env.local del dashboard." };

  let body: AgentCallResponse;
  try {
    const response = await fetch(`${baseUrl}/calls/${encodeURIComponent(customerId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-secret": process.env.AGENT_SHARED_SECRET ?? "" },
      body: JSON.stringify({}),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    body = (await response.json()) as AgentCallResponse;
    if (!response.ok || !body.ok) return { ok: false, error: body.error ?? `El agente respondió ${response.status}` };
  } catch (error) {
    return { ok: false, error: `No se pudo contactar al agente en ${baseUrl}: ${(error as Error).message}` };
  }

  if (!body.conversationId || !body.mode) return { ok: false, error: "El agente no devolvió la conversación creada." };
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/en-vivo");
  return { ok: true, mode: body.mode, conversationId: body.conversationId };
}

function summarizeRun({ run, dispatch }: AgentRunResponse) {
  if (!run) return "Corrida completada.";
  const parts = [`${run.requiring_intervention} intervenciones`];
  if (dispatch) {
    const calls = dispatch.real_calls + dispatch.simulated_calls;
    const emails = dispatch.reminder_emails + dispatch.fallback_emails;
    parts.push(`${calls} llamada${calls === 1 ? "" : "s"}${dispatch.voice_provider === "simulated" ? " simulada" + (calls === 1 ? "" : "s") : ""}`);
    parts.push(`${emails} correo${emails === 1 ? "" : "s"}${dispatch.email_provider === "simulated" ? " simulado" + (emails === 1 ? "" : "s") : ""}`);
    if (dispatch.human) parts.push(`${dispatch.human} a asesor`);
  }
  parts.push(`${run.blocked} bloqueados`, `${run.control_group} en control`);
  return parts.join(" · ");
}
