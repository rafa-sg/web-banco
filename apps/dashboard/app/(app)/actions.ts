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
  const result = await postToAgent<AgentRunResponse>("/runs", {}, 90_000);
  if (!result.ok) return result;
  revalidatePath("/");
  revalidatePath("/en-vivo");
  const body = result.body;
  return { ok: true, summary: summarizeRun(body), live: Boolean(body.dispatch && body.dispatch.real_calls + body.dispatch.simulated_calls > 0) };
}

export type CallResult = { ok: true; mode: "elevenlabs" | "simulated"; conversationId: string | null } | { ok: false; error: string };

type AgentCallResponse = { ok: boolean; error?: string; mode?: "elevenlabs" | "simulated"; conversationId?: string | null; elevenlabsConversationId?: string };

/** POST autenticado al agente. La web nunca decide ni escribe: el agente valida contra la BD. */
async function postToAgent<T extends { ok: boolean; error?: string }>(path: string, body: object, timeoutMs: number): Promise<{ ok: true; body: T } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sesión expirada. Vuelve a iniciar sesión." };

  const baseUrl = process.env.AGENT_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return { ok: false, error: "Falta AGENT_BASE_URL en .env.local del dashboard." };

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-agent-secret": process.env.AGENT_SHARED_SECRET ?? "" },
      body: JSON.stringify({ created_by: auth.user.email ?? "web", ...body }),
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const parsed = (await response.json()) as T;
    if (!response.ok || !parsed.ok) return { ok: false, error: parsed.error ?? `El agente respondió ${response.status}` };
    return { ok: true, body: parsed };
  } catch (error) {
    return { ok: false, error: `No se pudo contactar al agente en ${baseUrl}: ${(error as Error).message}` };
  }
}

/**
 * "Llamar" (grados C–E): el agente valida contacto habilitado y reglas de frecuencia en la BD.
 * mode "elevenlabs" = llamada real (cuesta dinero) · "simulated" = conversación simulada.
 */
export async function startCustomerCall(customerId: string): Promise<CallResult> {
  const result = await postToAgent<AgentCallResponse>(`/calls/${encodeURIComponent(customerId)}`, {}, 30_000);
  if (!result.ok) return result;
  if (!result.body.mode) return { ok: false, error: "El agente no devolvió el modo de la llamada." };
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath("/en-vivo");
  return { ok: true, mode: result.body.mode, conversationId: result.body.conversationId ?? null };
}

export type EmailResult = { ok: true; real: boolean; conversationId: string | null } | { ok: false; error: string };

/** "Enviar correo" (grados A–B): recordatorio preventivo. Real solo con Resend y contacto habilitado; si no, queda simulado. */
export async function sendCustomerEmail(customerId: string): Promise<EmailResult> {
  const result = await postToAgent<{ ok: boolean; error?: string; real?: boolean; conversationId?: string | null }>(`/emails/${encodeURIComponent(customerId)}`, {}, 30_000);
  if (!result.ok) return result;
  revalidatePath("/");
  revalidatePath(`/clientes/${customerId}`);
  return { ok: true, real: Boolean(result.body.real), conversationId: result.body.conversationId ?? null };
}

export type HangupResult = { ok: true; outcome: string; alreadyClosed: boolean } | { ok: false; error: string };

/** "Colgar": cierra una conversación de voz en curso (o atascada) con su resultado. */
export async function hangupConversation(conversationId: string): Promise<HangupResult> {
  const result = await postToAgent<{ ok: boolean; error?: string; outcome?: string; alreadyClosed?: boolean }>(`/calls/${encodeURIComponent(conversationId)}/hangup`, {}, 30_000);
  if (!result.ok) return result;
  revalidatePath("/en-vivo");
  revalidatePath(`/conversaciones/${conversationId}`);
  return { ok: true, outcome: result.body.outcome ?? "", alreadyClosed: Boolean(result.body.alreadyClosed) };
}

export type AgentStatus = { online: true; voice: "elevenlabs" | "simulated"; email: "resend" | "simulated" } | { online: false; error: string };

/** Modo real o simulado de cada canal, para mostrarlo ANTES de confirmar una corrida. */
export async function getAgentStatus(): Promise<AgentStatus> {
  const baseUrl = process.env.AGENT_BASE_URL?.replace(/\/$/, "");
  if (!baseUrl) return { online: false, error: "Falta AGENT_BASE_URL" };
  try {
    const response = await fetch(`${baseUrl}/`, { cache: "no-store", signal: AbortSignal.timeout(4_000) });
    const body = (await response.json()) as { providers?: { voice?: "elevenlabs" | "simulated"; email?: "resend" | "simulated" } };
    if (!body.providers?.voice || !body.providers.email) return { online: false, error: "Respuesta inesperada del agente" };
    return { online: true, voice: body.providers.voice, email: body.providers.email };
  } catch (error) {
    return { online: false, error: (error as Error).message };
  }
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
