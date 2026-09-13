// Presentation fixtures only. Scoring and policy decisions belong to packages/core.
export type RiskBand = "BAJO" | "MODERADO" | "PREVENTIVO" | "ALTO" | "CRITICO";
export type Channel = "whatsapp" | "voice";
export type ChannelFilter = "all" | Channel;
export type Outcome = "PAYMENT_COMMITMENT" | "ALTERNATIVE_DATE" | "HUMAN_ESCALATION" | "FOLLOW_UP_REQUIRED" | "NO_ANSWER";
export type Customer = {
  id: string;
  name: string;
  initials: string;
  product: string;
  score: number;
  band: RiskBand;
  channel: Channel;
  isControl: boolean;
  installmentCents: number;
  balanceCents: number;
  dueInDays: number;
  activityDaysAgo: number;
  contacted: boolean;
  outcome: Outcome;
  commitmentKept: boolean;
  factors: { label: string; detail: string; contribution: number }[];
};

export const bandLabels: Record<RiskBand, string> = { BAJO: "Bajo", MODERADO: "Moderado", PREVENTIVO: "Preventivo", ALTO: "Alto", CRITICO: "Crítico" };
export const channelLabels: Record<Channel, string> = { whatsapp: "WhatsApp", voice: "Voz" };
export const outcomeLabels: Record<Outcome, string> = {
  PAYMENT_COMMITMENT: "Compromiso de pago", ALTERNATIVE_DATE: "Fecha alternativa",
  HUMAN_ESCALATION: "Atención humana", FOLLOW_UP_REQUIRED: "Seguimiento pendiente", NO_ANSWER: "Sin respuesta",
};
const names = ["Carlos Martínez", "María López", "Ana Flores", "Luis Hernández", "Sofía Ramírez", "José Rivera", "Elena Castro", "Diego Molina", "Lucía Torres", "Mario Rivas", "Laura Cruz", "Andrés Reyes"];
const bands: RiskBand[] = ["CRITICO", "ALTO", "PREVENTIVO", "MODERADO", "BAJO"];
const scores = [93, 84, 62, 37, 16];
const outcomes: Outcome[] = ["PAYMENT_COMMITMENT", "ALTERNATIVE_DATE", "FOLLOW_UP_REQUIRED", "PAYMENT_COMMITMENT", "HUMAN_ESCALATION", "NO_ANSWER"];

export const customers: Customer[] = Array.from({ length: 72 }, (_, index) => {
  const bandIndex = index < 8 ? 0 : index < 22 ? 1 : index < 36 ? 2 : index < 54 ? 3 : 4;
  const isControl = index < 36 && index % 7 >= 5;
  const score = scores[bandIndex] + index % 5 - 2;
  return {
    id: `DEMO-${String(index + 1).padStart(3, "0")}`,
    name: index < names.length ? names[index] : `Persona demo ${String(index + 1).padStart(2, "0")}`,
    initials: index < names.length ? names[index].split(" ").map(word => word[0]).join("") : `D${index + 1}`,
    product: index % 3 === 0 ? "Préstamo personal" : index % 3 === 1 ? "Tarjeta de crédito" : "Crédito de consumo",
    score,
    band: bands[bandIndex],
    channel: index % 3 === 0 ? "voice" : "whatsapp",
    isControl,
    installmentCents: 15000 + index * 1250,
    balanceCents: 180000 + index * 18500,
    dueInDays: index % 9 + 1,
    activityDaysAgo: index % 28,
    contacted: bandIndex < 4 && !isControl,
    outcome: outcomes[index % outcomes.length],
    commitmentKept: index % 4 !== 0,
    factors: [
      { label: "Proximidad del vencimiento", detail: `La próxima cuota vence en ${index % 9 + 1} días.`, contribution: Math.round(score * .3) },
      { label: "Historial de pagos tardíos", detail: `${bandIndex < 2 ? 4 : 2} de los últimos 12 pagos se realizaron después de la fecha.`, contribution: Math.round(score * .25) },
      { label: "Mayor atraso histórico", detail: `El mayor atraso registrado fue de ${bandIndex < 2 ? 18 : 5} días.`, contribution: Math.round(score * .15) },
    ],
  };
});

export const policyPreview = [
  { number: "01", title: "Contacto respetuoso", description: "Acompañar en el momento adecuado.", rules: [["Horario de contacto", "08:00 a 20:00 · El Salvador"], ["Frecuencia máxima", "2 contactos por semana"], ["Tiempo entre contactos", "48 horas"], ["Negativa explícita", "Cerrar sin insistir"]] },
  { number: "02", title: "Alternativas dentro de los límites", description: "Cada propuesta tiene una regla que la respalda.", rules: [["Extensión máxima", "30 días"], ["Pago parcial mínimo", "25% de la cuota"], ["Día no permitido", "Domingo"], ["Confirmación", "Solo con comprobante de registro"]] },
  { number: "03", title: "Acompañamiento humano", description: "Reconocer cuándo una persona debe tomar el caso.", rules: [["Solicitud de una persona", "Escalamiento inmediato"], ["Disputa o posible fraude", "Escalamiento inmediato"], ["Molestia sostenida", "2 turnos consecutivos"], ["Excepción a la política", "Revisión humana"]] },
] as const;

export function money(cents: number) {
  return new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);
}

export function dateLabel(reference: string, offset = 0, full = false) {
  const instant = new Date(Date.parse(reference) + offset * 86_400_000);
  return new Intl.DateTimeFormat("es-SV", { timeZone: "America/El_Salvador", day: "2-digit", month: "short", ...(full ? { year: "numeric" } : {}) }).format(instant);
}

export function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round(numerator / denominator * 100) : 0;
}

export function selectCustomers(period: number, channel: ChannelFilter) {
  return customers.filter(customer => customer.activityDaysAgo < period && (channel === "all" || customer.channel === channel));
}

export function summarize(rows: Customer[]) {
  const atRisk = rows.filter(customer => ["PREVENTIVO", "ALTO", "CRITICO"].includes(customer.band));
  const interventions = atRisk.filter(customer => customer.contacted);
  const conversations = rows.filter(customer => customer.contacted);
  const completed = conversations.filter(customer => ["PAYMENT_COMMITMENT", "ALTERNATIVE_DATE", "HUMAN_ESCALATION"].includes(customer.outcome));
  const commitments = completed.filter(customer => ["PAYMENT_COMMITMENT", "ALTERNATIVE_DATE"].includes(customer.outcome));
  const kept = commitments.filter(customer => customer.commitmentKept);
  const escalations = conversations.filter(customer => customer.outcome === "HUMAN_ESCALATION");
  return { atRisk, interventions, conversations, completed, commitments, kept, escalations };
}
