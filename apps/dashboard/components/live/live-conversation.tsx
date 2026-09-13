"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, CircleCheck, CircleX, Handshake, Scissors, Send, TriangleAlert, UserRound } from "lucide-react";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { Elapsed } from "@/components/live/elapsed";
import { createClient } from "@/lib/supabase/client";
import { bandToGrade, channelLabels, dateTimeLabel, humanize, intentLabels, labelOf, money, outcomeLabels, sentimentLabels } from "@/lib/prevention";
import type { ConversationEvent, ConversationRow, CustomerOverview, Message, PlaybookStage, TurnEvaluation } from "@/lib/types";

const eventMeta: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "info" }> = {
  commitment_registered: { label: "Compromiso registrado", tone: "ok" },
  offer_validated: { label: "Oferta dentro de política", tone: "ok" },
  offer_rejected: { label: "Oferta rechazada por política", tone: "danger" },
  escalation_created: { label: "Escalada a una persona", tone: "danger" },
  handoff_created: { label: "Enviado por WhatsApp", tone: "info" },
  interruption_real: { label: "Interrupción del cliente", tone: "warn" },
  opt_out_registered: { label: "El cliente pidió no ser contactado", tone: "danger" },
};

function upsert<T extends { id: string }>(list: T[], item: T, sortKey: (value: T) => number | string) {
  const next = list.filter(existing => existing.id !== item.id);
  next.push(item);
  return next.sort((a, b) => (sortKey(a) > sortKey(b) ? 1 : -1));
}

function payloadText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  for (const key of ["message", "error", "reason", "receipt_code", "detail"]) if (typeof record[key] === "string") return record[key] as string;
  return null;
}

export function LiveConversation({ conversation: initialConversation, customer, initialMessages, initialEvaluations, initialEvents, stages }: {
  conversation: ConversationRow;
  customer: CustomerOverview | null;
  initialMessages: Message[];
  initialEvaluations: TurnEvaluation[];
  initialEvents: ConversationEvent[];
  stages: PlaybookStage[];
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialMessages);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [events, setEvents] = useState(initialEvents);
  const [connected, setConnected] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const id = conversation.id;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`conv-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` }, payload => setMessages(list => upsert(list, payload.new as Message, value => value.seq)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "turn_evaluations", filter: `conversation_id=eq.${id}` }, payload => setEvaluations(list => upsert(list, payload.new as TurnEvaluation, value => value.seq)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_events", filter: `conversation_id=eq.${id}` }, payload => setEvents(list => upsert(list, payload.new as ConversationEvent, value => value.created_at)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` }, payload => setConversation(current => ({ ...current, ...(payload.new as Partial<ConversationRow>) })))
      .subscribe(state => setConnected(state === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  const latest = evaluations.at(-1) ?? null;
  const currentStageKey = latest?.to_stage ?? conversation.current_stage;
  const currentPosition = stages.find(stage => stage.stage_key === currentStageKey)?.position ?? -1;
  const policyEvent = [...events].reverse().find(event => event.event_type === "offer_validated" || event.event_type === "offer_rejected");
  const lastAgentLatency = [...messages].reverse().find(message => message.role !== "customer" && message.latency_ms != null)?.latency_ms ?? null;
  const highlighted = useMemo(() => events.filter(event => eventMeta[event.event_type]), [events]);
  const ended = Boolean(conversation.ended_at);
  const grade = customer?.risk_band ? bandToGrade[customer.risk_band] : null;

  return <div className="page-enter">
    <Link href={ended ? (customer ? `/clientes/${customer.customer_id}` : "/") : "/en-vivo"} className="back-link"><ArrowLeft size={15} /> {ended ? "Volver a la ficha" : "Volver a en vivo"}</Link>

    <div className={`live-banner ${ended ? "live-banner-ended" : ""}`}>
      <span className="live-pill"><i />{ended ? "Finalizada" : conversation.channel === "voice" ? "Llamada en curso" : "Chat en curso"}</span>
      <strong>{customer?.full_name ?? "Cliente"}</strong>
      {grade && <GradeBadge grade={grade} />}
      <span className="live-banner-meta">{channelLabels[conversation.channel] ?? conversation.channel} · {conversation.turn_count} turnos</span>
      <Elapsed since={conversation.started_at} until={conversation.ended_at} />
      <span className={`live-status ${connected ? "live-status-live" : "live-status-connecting"}`}><i />{connected ? "En tiempo real" : "Conectando…"}</span>
    </div>

    {ended && <section className="closing-card">
      <div><span className="eyebrow">RESULTADO</span><strong>{humanize(conversation.outcome, outcomeLabels)}</strong></div>
      <div><span className="eyebrow">RIESGO</span><strong>{conversation.risk_before ?? "—"} → {conversation.risk_after ?? "—"}</strong></div>
      <div><span className="eyebrow">COSTO</span><strong>{conversation.cost_usd != null ? money(conversation.cost_usd) : "—"}</strong></div>
      <div><span className="eyebrow">CIERRE</span><strong>{dateTimeLabel(conversation.ended_at)}</strong></div>
    </section>}

    <div className="live-layout">
      <section className="panel transcript-panel" aria-labelledby="transcript-title">
        <div className="panel-heading"><div><span className="eyebrow">TRANSCRIPCIÓN</span><h2 id="transcript-title">Conversación</h2></div></div>
        {messages.length === 0 ? <p className="muted-note">Esperando el primer mensaje…</p> :
          <div className="transcript">{messages.map(message => {
            const isCustomer = message.role === "customer";
            return <div key={message.id} className={`bubble ${isCustomer ? "bubble-customer" : message.role === "system" ? "bubble-system" : "bubble-agent"}`}>
              <span className="bubble-author">{isCustomer ? <UserRound size={13} /> : <Bot size={13} />}{isCustomer ? "Cliente" : message.role === "system" ? "Sistema" : "Agente"}</span>
              <p>{message.content}</p>
              {message.interrupted && <p className="bubble-interrupted"><Scissors size={12} /> Interrumpido{message.heard_text ? ` · alcanzó a escuchar: “${message.heard_text}”` : ""}</p>}
            </div>;
          })}<div ref={transcriptEnd} /></div>}
      </section>

      <section className="panel brain-panel" aria-labelledby="brain-title">
        <div className="panel-heading"><div><span className="eyebrow">CEREBRO</span><h2 id="brain-title">Qué está decidiendo el agente</h2></div></div>

        {stages.length > 0 && <ol className="stage-track" aria-label="Etapas del playbook">{stages.map(stage => {
          const state = stage.position < currentPosition ? "done" : stage.position === currentPosition ? "current" : "pending";
          return <li key={stage.id} className={`stage stage-${state}`} title={stage.objective ?? stage.name}><i /><span>{stage.name}</span></li>;
        })}</ol>}

        <dl className="brain-list">
          <div><dt>Etapa</dt><dd>{stages.find(stage => stage.stage_key === currentStageKey)?.name ?? humanize(currentStageKey)}</dd></div>
          <div><dt>Intención</dt><dd>{humanize(latest?.intent, intentLabels)}{latest?.confidence != null && <small> · confianza {Math.round(latest.confidence * 100)}%</small>}</dd></div>
          <div><dt>Sentimiento</dt><dd>{humanize(latest?.sentiment, sentimentLabels)}{latest?.sentiment_score != null && <small> ({latest.sentiment_score.toFixed(2)})</small>}</dd></div>
          <div><dt>Ritmo</dt><dd>{humanize(latest?.pace)}</dd></div>
          <div><dt>Regla</dt><dd>{latest?.rule_label ?? latest?.rule_id ?? "—"}</dd></div>
          <div><dt>Siguiente</dt><dd>{humanize(latest?.decision)}</dd></div>
          <div><dt>Política</dt><dd>{policyEvent
            ? policyEvent.event_type === "offer_validated"
              ? <span className="policy-ok"><CircleCheck size={14} /> Dentro de límites</span>
              : <span className="policy-bad"><CircleX size={14} /> {payloadText(policyEvent.payload) ?? "Fuera de política"}</span>
            : "Sin ofertas evaluadas"}</dd></div>
          <div><dt>Latencia</dt><dd>{lastAgentLatency != null ? `${(lastAgentLatency / 1000).toFixed(2)} s` : "—"}</dd></div>
          <div><dt>Costo</dt><dd>{conversation.cost_usd != null ? money(conversation.cost_usd) : "—"}</dd></div>
        </dl>

        <h3 className="subheading">Eventos destacados</h3>
        {highlighted.length === 0 ? <p className="muted-note">Sin eventos por ahora.</p> :
          <ul className="event-list">{highlighted.map(event => {
            const meta = eventMeta[event.event_type];
            const Icon = event.event_type === "commitment_registered" ? Handshake : event.event_type === "handoff_created" ? Send : event.event_type === "interruption_real" ? Scissors : meta.tone === "ok" ? CircleCheck : TriangleAlert;
            const detail = payloadText(event.payload) ?? (event.payload && typeof event.payload === "object" ? labelOf(event.payload) : null);
            return <li key={event.id} className={`event event-${meta.tone}`}><Icon size={14} /><div><strong>{meta.label}</strong>{detail && detail !== "—" && <small>{detail}</small>}</div><time>{dateTimeLabel(event.created_at)}</time></li>;
          })}</ul>}
      </section>
    </div>
  </div>;
}
