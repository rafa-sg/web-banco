import { humanize, money } from "@/lib/prevention";
import type { ConversationEvent, Message } from "@/lib/types";

/* ── Resultado final en las 3 categorías del banco ─────────────────────────── */

export type ResultCategory = "agreed" | "follow_up" | "no_agreement" | "no_contact";

const AGREED = new Set(["PAYMENT_COMMITMENT", "PAYMENT_PLAN_AGREED", "DATE_EXTENSION_AGREED", "PARTIAL_PAYMENT_AGREED", "PAID_DURING_CONTACT", "PENDING_APPROVAL", "ALTERNATIVE_DATE", "PARTIAL_PAYMENT"]);
const FOLLOW_UP = new Set(["FOLLOW_UP_REQUIRED", "CALLBACK_SCHEDULED", "HUMAN_ESCALATION", "ALREADY_PAID", "MESSAGE_SENT"]);
const NO_AGREEMENT = new Set(["EXPLICIT_REFUSAL", "DO_NOT_CONTACT", "WRONG_PERSON"]);

export const resultCategoryLabels: Record<ResultCategory, string> = {
  agreed: "Fecha de pago acordada",
  follow_up: "Seguimiento posterior",
  no_agreement: "Sin acuerdo",
  no_contact: "Sin resultado claro",
};

/** Un compromiso registrado manda sobre el outcome: si hay recibo, hubo fecha acordada. */
export function resultCategory(outcome: string | null | undefined, hasCommitment = false): ResultCategory | null {
  if (hasCommitment) return "agreed";
  if (!outcome) return null;
  if (AGREED.has(outcome)) return "agreed";
  if (FOLLOW_UP.has(outcome)) return "follow_up";
  if (NO_AGREEMENT.has(outcome)) return "no_agreement";
  return "no_contact";
}

/* ── Compromisos ───────────────────────────────────────────────────────────── */

export const commitmentStatusLabels: Record<string, string> = {
  pending: "Pendiente de pago",
  pending_approval: "Pendiente de aprobación",
  approved: "Aprobada",
  kept: "Cumplida",
  broken: "Incumplida",
  cancelled: "Cancelada",
};

export const paymentLinkStatusLabels: Record<string, string> = { active: "Activo", paid: "Pagado", expired: "Vencido", cancelled: "Cancelado" };

export const commitmentTypeLabels: Record<string, string> = {
  FULL_PAYMENT: "Pago completo", DATE_EXTENSION: "Nueva fecha", PARTIAL_PAYMENT: "Pago parcial", INSTALLMENT_PLAN: "Plan de cuotas",
  FEE_WAIVER: "Condonación de recargo", CALLBACK: "Rellamada", HUMAN_ADVISOR: "Asesor humano",
};

/** Fecha "hoy" en El Salvador como YYYY-MM-DD, para comparar con columnas date. */
export function todayInElSalvador(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador" }).format(now);
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/* ── Errores de política legibles ─────────────────────────────────────────── */

const accents: Record<string, string> = {
  maximo: "máximo", minimo: "mínimo", dias: "días", numero: "número", condonacion: "condonación", invalida: "inválida", invalido: "inválido",
};

/** EXCEDE_MAXIMO_DE_DIAS_7 → "Excede máximo de 7 días" · MONTO_MENOR_AL_MINIMO_25PCT → "Monto menor al mínimo 25%". */
export function policyErrorLabel(code: string) {
  const words = code.toLowerCase().split("_").filter(Boolean).map(word => {
    const pct = word.match(/^(\d+)pct$/);
    if (pct) return `${pct[1]}%`;
    return accents[word] ?? word;
  });
  const text = words.join(" ").replace(/días (\d+)$/, "$1 días");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ── Mensajes de herramienta ("validar_oferta({...}) → {...}") ─────────────── */

const toolLabels: Record<string, string> = {
  validar_oferta: "Validó oferta",
  registrar_compromiso: "Registró compromiso",
  agendar_rellamada: "Agendó rellamada",
  escalar_a_humano: "Escaló a una persona",
  enviar_por_correo: "Envió por correo",
  finalizar_llamada: "Finalizó la llamada",
  end_call: "Finalizó la llamada",
};

export type ToolChip = { name: string; label: string; detail: string | null; ok: boolean | null; raw: string };

function tryJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** El resultado viene truncado a 600 caracteres: si no es JSON válido se extraen campos con expresiones regulares. */
function field(source: Record<string, unknown> | null, text: string, key: string): unknown {
  if (source && key in source) return source[key];
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*("(?:[^"\\\\]|\\\\.)*"|true|false|-?\\d+(?:\\.\\d+)?|\\[[^\\]]*\\])`));
  if (!match) return undefined;
  return tryJson(`{"v":${match[1]}}`)?.v;
}

function shortDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  return new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function parseToolMessage(message: Pick<Message, "content" | "meta">): ToolChip {
  const raw = message.content ?? "";
  const metaTool = message.meta && typeof message.meta === "object" ? (message.meta as Record<string, unknown>).tool : undefined;
  const name = typeof metaTool === "string" ? metaTool : raw.match(/^([a-z_]+)\(/)?.[1] ?? "herramienta";
  const arrow = raw.indexOf(") → ");
  const argsText = arrow > -1 ? raw.slice(name.length + 1, arrow) : "";
  const resultText = arrow > -1 ? raw.slice(arrow + 4) : "";
  const args = tryJson(argsText);
  const result = tryJson(resultText);
  const label = toolLabels[name] ?? humanize(name);

  if (name === "validar_oferta") {
    const valid = field(result, resultText, "valid");
    const offer = field(result, resultText, "offer_code") ?? args?.offer_code ?? args?.codigo_oferta;
    const normalized = (result?.normalized_params ?? {}) as Record<string, unknown>;
    const date = shortDate(normalized.new_date ?? normalized.pay_date ?? normalized.first_payment_date ?? normalized.pay_by_date ?? normalized.callback_date ?? field(result, resultText, "new_date") ?? field(result, resultText, "pay_date"));
    const amountValue = normalized.amount ?? normalized.down_payment ?? field(result, resultText, "amount");
    const amount = typeof amountValue === "number" ? money(amountValue) : null;
    const errors = field(result, resultText, "errors");
    const errorText = Array.isArray(errors) && errors.length ? errors.map(code => policyErrorLabel(String(code))).join(" · ") : null;
    const parts = [typeof offer === "string" ? offer : null, date, amount].filter(Boolean).join(" · ");
    const ok = valid === true ? true : valid === false ? false : null;
    return { name, label: parts ? `${label} ${parts}` : label, detail: ok === false ? errorText ?? "Fuera de política" : ok ? "Dentro de política" : null, ok, raw };
  }

  if (name === "registrar_compromiso") {
    const receipt = field(result, resultText, "receipt_code");
    const ok = field(result, resultText, "ok");
    const error = field(result, resultText, "error");
    return { name, label: typeof receipt === "string" ? `${label} ${receipt}` : label, detail: typeof error === "string" ? error : null, ok: ok === true || typeof receipt === "string" ? true : ok === false || typeof error === "string" ? false : null, raw };
  }

  const ok = field(result, resultText, "ok");
  const error = field(result, resultText, "error");
  return { name, label, detail: typeof error === "string" ? error : null, ok: ok === true ? true : ok === false || typeof error === "string" ? false : null, raw };
}

/* ── Eventos destacados ────────────────────────────────────────────────────── */

export type EventTone = "ok" | "warn" | "danger" | "info";

export const highlightedEvents: Record<string, { label: string; tone: EventTone }> = {
  commitment_registered: { label: "Compromiso registrado", tone: "ok" },
  offer_validated: { label: "Oferta dentro de política", tone: "ok" },
  offer_rejected: { label: "Oferta rechazada por política", tone: "danger" },
  escalation_created: { label: "Escalada a una persona", tone: "danger" },
  handoff_created: { label: "Enviado por WhatsApp", tone: "info" },
  payment_link_created: { label: "Link de pago creado", tone: "info" },
  education_queued: { label: "Contenido educativo en cola", tone: "info" },
  interruption_real: { label: "Interrupción del cliente", tone: "warn" },
  opt_out_registered: { label: "El cliente pidió no ser contactado", tone: "danger" },
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function eventDetail(event: ConversationEvent): string | null {
  const payload = record(event.payload);
  if (event.event_type === "offer_rejected") {
    const errors = Array.isArray(payload.errors) ? payload.errors.map(code => policyErrorLabel(String(code))) : [];
    return [payload.offer_code, ...errors].filter(Boolean).join(" · ") || null;
  }
  if (event.event_type === "offer_validated") {
    const normalized = record(payload.normalized);
    const date = shortDate(normalized.new_date ?? normalized.pay_date ?? normalized.first_payment_date ?? normalized.pay_by_date ?? normalized.callback_date);
    const amount = typeof normalized.amount === "number" ? money(normalized.amount) : typeof normalized.down_payment === "number" ? money(normalized.down_payment) : null;
    return [payload.offer_code, date, amount].filter(Boolean).join(" · ") || null;
  }
  if (event.event_type === "commitment_registered") return [payload.receipt_code, payload.offer_code].filter(Boolean).join(" · ") || null;
  if (event.event_type === "interruption_real") return typeof payload.heard_text === "string" && payload.heard_text ? `Alcanzó a escuchar: “${payload.heard_text}”` : null;
  for (const key of ["message", "reason", "error", "detail"]) if (typeof payload[key] === "string") return payload[key] as string;
  return null;
}

export type EventGroup = { key: string; type: string; count: number; detail: string | null; last: ConversationEvent };

/** Agrupa eventos destacados consecutivos del mismo tipo ("Interrupción del cliente ×6"). */
export function groupHighlightedEvents(events: ConversationEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  for (const event of events) {
    if (!highlightedEvents[event.event_type]) continue;
    const detail = eventDetail(event);
    const previous = groups.at(-1);
    if (previous && previous.type === event.event_type) {
      previous.count += 1;
      previous.last = event;
      previous.detail = detail ?? previous.detail;
    } else {
      groups.push({ key: event.id, type: event.event_type, count: 1, detail, last: event });
    }
  }
  return groups;
}

export function stageChanges(events: ConversationEvent[]) {
  return events.filter(event => event.event_type === "stage_changed").map(event => {
    const payload = record(event.payload);
    return {
      id: event.id,
      at: event.created_at,
      from: typeof payload.from === "string" ? payload.from : null,
      to: typeof payload.to === "string" ? payload.to : null,
      rule: typeof payload.rule_label === "string" ? payload.rule_label : typeof payload.rule_id === "string" ? payload.rule_id : null,
    };
  });
}

export function secondsLabel(ms: number | null | undefined) {
  return ms == null ? "—" : `${(ms / 1000).toFixed(2)} s`;
}

export function durationLabel(ms: number | null | undefined) {
  if (ms == null) return "—";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
