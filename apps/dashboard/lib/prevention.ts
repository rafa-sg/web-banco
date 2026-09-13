import type { Grade, RiskBand } from "@/lib/types";

export const bandToGrade: Record<RiskBand, Grade> = { BAJO: "A", MODERADO: "B", PREVENTIVO: "C", ALTO: "D", CRITICO: "E" };
export const gradeToBand: Record<Grade, RiskBand> = { A: "BAJO", B: "MODERADO", C: "PREVENTIVO", D: "ALTO", E: "CRITICO" };
export const gradeLabels: Record<Grade, string> = { A: "A · Bajo", B: "B · Moderado", C: "C · Preventivo", D: "D · Alto", E: "E · Crítico" };
export const gradeColors: Record<Grade, string> = { A: "#00b398", B: "#59cbe8", C: "#fdda24", D: "#f2884b", E: "#e8639f" };

export const channelLabels: Record<string, string> = { voice: "Voz", whatsapp: "WhatsApp", human: "Persona", sms: "SMS", email: "Correo" };

export const actionLabels: Record<string, string> = {
  scheduled: "Seguimiento programado",
  dispatched: "En contacto",
  completed: "Gestión completada",
  skipped: "Sin acción · fuera de política",
  blocked: "Bloqueado",
  CALL_NOW: "Llamar ahora",
  WHATSAPP: "Enviar WhatsApp",
  CALL_ALTERNATIVE_DATE: "Llamar · proponer fecha",
  EDUCATION_REMINDER: "Recordatorio educativo",
  HUMAN: "Derivar a una persona",
  MONITOR: "Monitorear",
  BLOCKED: "Bloqueado",
};

export function money(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
}

export function percentage(value: number | null | undefined, decimals = 0) {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  // Columnas date (YYYY-MM-DD) se parsean como medianoche UTC: formatearlas en El Salvador las corre un día atrás.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  return new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", timeZone: "America/El_Salvador" }).format(new Date(value));
}

export function dateTimeLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/El_Salvador" }).format(new Date(value));
}

export function dueLabel(daysToDue: number | null, daysPastDue: number | null) {
  if (daysPastDue != null && daysPastDue > 0) return `${daysPastDue}d de atraso`;
  if (daysToDue == null) return "—";
  if (daysToDue === 0) return "Vence hoy";
  if (daysToDue < 0) return `${Math.abs(daysToDue)}d de atraso`;
  return `En ${daysToDue}d`;
}

export function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

/** Heurística de demo: riesgo × monto en riesgo, ponderado por cercanía al vencimiento. Documentado como estimación. */
export function priorityScore(row: { risk_score: number | null; amount_due: number | null; days_to_due: number | null }) {
  const risk = row.risk_score ?? 0;
  const amount = row.amount_due ?? 0;
  const urgency = row.days_to_due == null ? 1 : 1 / (Math.max(row.days_to_due, 0) + 1);
  return risk * (1 + Math.log10(amount + 1)) * (1 + urgency * 3);
}

/** jsonb de reglas/ofertas/bloqueos puede venir como strings u objetos; se muestra la etiqueta más legible. */
export function labelOf(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    for (const key of ["name", "label", "rule_label", "message", "reason", "title", "code", "key"]) {
      if (typeof record[key] === "string" && record[key]) return record[key] as string;
    }
  }
  return "—";
}

export function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export const outcomeLabels: Record<string, string> = {
  PAYMENT_COMMITMENT: "Compromiso de pago", PAYMENT_PLAN_AGREED: "Plan de pagos acordado", DATE_EXTENSION_AGREED: "Nueva fecha acordada",
  PARTIAL_PAYMENT_AGREED: "Pago parcial acordado", PAID_DURING_CONTACT: "Pagó durante el contacto", PENDING_APPROVAL: "Pendiente de aprobación",
  ALREADY_PAID: "Indica que ya pagó", FOLLOW_UP_REQUIRED: "Requiere seguimiento", CALLBACK_SCHEDULED: "Rellamada agendada",
  HUMAN_ESCALATION: "Escalado a asesor", WRONG_PERSON: "No era el titular", EXPLICIT_REFUSAL: "Negativa explícita",
  NO_ANSWER: "Sin respuesta", ABANDONED: "Abandonada", ALTERNATIVE_DATE: "Fecha alternativa", PARTIAL_PAYMENT: "Pago parcial",
  MESSAGE_SENT: "Mensaje enviado", DO_NOT_CONTACT: "Pidió no ser contactado", FAILED: "Falla técnica",
};

export const operatorLabels: Record<string, string> = {
  eq: "=", neq: "≠", gt: ">", gte: "≥", lt: "<", lte: "≤", between: "entre", in: "es uno de", not_in: "no es uno de",
  contains: "contiene", not_contains: "no contiene", is_true: "es verdadero", is_false: "es falso",
};

export const weekdayLabels: Record<number, string> = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo" };

export const cohortLabels: Record<string, string> = { intervenido: "Intervenidos", grupo_control: "Grupo de control", no_contactado: "No contactados" };

export const intentLabels: Record<string, string> = {
  WILL_PAY: "Pagará", NEEDS_ALTERNATIVE_DATE: "Necesita otra fecha", FINANCIAL_DIFFICULTY: "Dificultad financiera",
  REFUSES: "Se niega", ANGRY: "Molesto", EVASIVE: "Evasivo", REQUESTS_HUMAN: "Pide una persona",
  DISPUTE: "Disputa", POSSIBLE_FRAUD: "Posible fraude", CONFIRMS: "Confirma", UNKNOWN: "Sin clasificar",
};

export const sentimentLabels: Record<string, string> = {
  POSITIVE: "Positivo", NEUTRAL: "Neutral", CONCERNED: "Preocupado", FRUSTRATED: "Frustrado", ANGRY: "Molesto",
};

export function humanize(value: string | null | undefined, dictionary: Record<string, string> = {}) {
  if (!value) return "—";
  return dictionary[value] ?? dictionary[value.toUpperCase()] ?? value.replaceAll("_", " ").toLowerCase().replace(/^\w/, char => char.toUpperCase());
}

export function secondsToClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
