"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bot, CircleCheck, CircleDashed, CircleX, Cog, Handshake, Scissors, Send, ShieldAlert, TriangleAlert, UserRound } from "lucide-react";
import { CommitmentCard, NoCommitmentCard } from "@/components/commitments/commitment-card";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { Elapsed } from "@/components/live/elapsed";
import { HangupButton } from "@/components/live/hangup-button";
import { createClient } from "@/lib/supabase/client";
import {
  bankResultCategory, durationLabel, eventDetail, groupHighlightedEvents, highlightedEvents, parseToolMessage, resultCategory, resultCategoryLabels, secondsLabel, stageChanges,
} from "@/lib/conversation";
import { bandToGrade, channelLabels, costLabel, dateTimeLabel, decisionLabels, humanize, intentLabels, outcomeLabels, paceLabels, sentimentLabels } from "@/lib/prevention";
import type { Commitment, ConversationResult, ConversationEvent, ConversationRow, CustomerOverview, Message, ModelCost, PaymentLink, PlaybookStage, TurnEvaluation } from "@/lib/types";

const VISIBLE_EVENTS = 8;
const LATENCY_TARGET_MS = 2000;

function upsert<T extends { id: string }>(list: T[], item: T, sortKey: (value: T) => number | string) {
  const next = list.filter(existing => existing.id !== item.id);
  next.push(item);
  return next.sort((a, b) => (sortKey(a) > sortKey(b) ? 1 : -1));
}

function percentile(values: number[], p: number) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("es-SV", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/El_Salvador" }).format(new Date(value));
}

function riskDelta(before: number | null, after: number | null) {
  if (before == null || after == null) return "—";
  const delta = after - before;
  return delta === 0 ? "Sin cambio" : `${delta < 0 ? "Bajó" : "Subió"} ${Math.abs(delta)}`;
}

function ToolChipRow({ message }: { message: Message }) {
  const chip = parseToolMessage(message);
  return <details className={`tool-chip ${chip.ok === false ? "tool-chip-bad" : chip.ok ? "tool-chip-ok" : ""}`}>
    <summary>
      <Cog size={12} />
      <span>{chip.label}</span>
      {chip.ok === true && <CircleCheck size={12} />}
      {chip.ok === false && <CircleX size={12} />}
      {chip.detail && <small>{chip.detail}</small>}
    </summary>
    <pre>{chip.raw}</pre>
  </details>;
}

export function LiveConversation({ conversation: initialConversation, customer, initialMessages, initialEvaluations, initialEvents, initialCommitments, initialPaymentLinks, costs, offerNames, result, stages }: {
  conversation: ConversationRow;
  customer: CustomerOverview | null;
  initialMessages: Message[];
  initialEvaluations: TurnEvaluation[];
  initialEvents: ConversationEvent[];
  initialCommitments: Commitment[];
  initialPaymentLinks: PaymentLink[];
  costs: ModelCost[];
  offerNames: Record<string, string>;
  result: ConversationResult | null;
  stages: PlaybookStage[];
}) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialMessages);
  const [evaluations, setEvaluations] = useState(initialEvaluations);
  const [events, setEvents] = useState(initialEvents);
  const [commitments, setCommitments] = useState(initialCommitments);
  const [paymentLinks, setPaymentLinks] = useState(initialPaymentLinks);
  const [connected, setConnected] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const id = conversation.id;
  const ended = Boolean(conversation.ended_at);
  const endedOnLoad = useRef(ended);

  useEffect(() => {
    const supabase = createClient();
    const filter = `conversation_id=eq.${id}`;
    const channel = supabase.channel(`conv-${id}`)
      // UPDATE: el agente alarga el mismo mensaje del cliente cuando la transcripción crece.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter }, payload => setMessages(list => upsert(list, payload.new as Message, value => value.seq)))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter }, payload => setMessages(list => upsert(list, payload.new as Message, value => value.seq)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "turn_evaluations", filter }, payload => setEvaluations(list => upsert(list, payload.new as TurnEvaluation, value => value.seq)))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_events", filter }, payload => setEvents(list => upsert(list, payload.new as ConversationEvent, value => value.created_at)))
      .on("postgres_changes", { event: "*", schema: "public", table: "commitments", filter }, payload => { if (payload.new && "id" in payload.new) setCommitments(list => upsert(list, payload.new as Commitment, value => value.created_at)); })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_links", filter }, payload => { if (payload.new && "id" in payload.new) setPaymentLinks(list => upsert(list, payload.new as PaymentLink, value => value.created_at)); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` }, payload => setConversation(current => ({ ...current, ...(payload.new as Partial<ConversationRow>) })))
      .subscribe(state => setConnected(state === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Al cerrar en vivo: recarga props de servidor (resultado de la vista, resumen en español, costos) sin perder el estado Realtime.
  useEffect(() => {
    if (!ended || endedOnLoad.current) return;
    endedOnLoad.current = true;
    const timer = setTimeout(() => router.refresh(), 1500);
    return () => clearTimeout(timer);
  }, [ended, router]);

  useEffect(() => { transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  const latest = evaluations.at(-1) ?? null;
  const currentStageKey = latest?.to_stage ?? conversation.current_stage;
  const currentPosition = stages.find(stage => stage.stage_key === currentStageKey)?.position ?? -1;
  const stageName = (key: string | null) => stages.find(stage => stage.stage_key === key)?.name ?? humanize(key);
  const grade = customer?.risk_band ? bandToGrade[customer.risk_band] : null;

  const commitment = commitments.find(row => row.id === conversation.commitment_id) ?? commitments.at(-1) ?? null;
  const commitmentLinks = paymentLinks.filter(link => !commitment || !link.commitment_id || link.commitment_id === commitment.id);
  const category = ended ? bankResultCategory(result?.bank_result) ?? resultCategory(conversation.outcome, Boolean(commitment)) : null;

  const lastOffer = [...events].reverse().find(event => event.event_type === "offer_validated" || event.event_type === "offer_rejected");
  const lastValidOffer = [...events].reverse().find(event => event.event_type === "offer_validated");
  const customerAccepted = evaluations.some(evaluation => evaluation.commitment_signal === "explicit");
  // Señales de acuerdo sin registro: se marca para revisión humana, nunca se convierte en promesa.
  const agreementHint = ended && !commitment && (lastValidOffer || customerAccepted)
    ? [lastValidOffer ? `Hubo una oferta dentro de política (${eventDetail(lastValidOffer) ?? "sin detalle"}).` : null, customerAccepted ? "El cliente dio señales explícitas de aceptar." : null].filter(Boolean).join(" ")
    : null;
  const eventGroups = useMemo(() => groupHighlightedEvents(events), [events]);
  const visibleGroups = showAllEvents ? eventGroups : eventGroups.slice(-VISIBLE_EVENTS);
  const stageHistory = useMemo(() => stageChanges(events), [events]);

  const agentLatencies = messages.filter(message => message.role === "agent" && message.latency_ms != null).map(message => message.latency_ms!);
  const endedPayload = events.find(event => event.event_type === "conversation_ended")?.payload as { avg_latency_ms?: number | null; p95_latency_ms?: number | null } | undefined;
  const avgLatency = conversation.avg_latency_ms ?? endedPayload?.avg_latency_ms ?? (agentLatencies.length ? Math.round(agentLatencies.reduce((sum, value) => sum + value, 0) / agentLatencies.length) : null);
  const p95Latency = conversation.p95_latency_ms ?? endedPayload?.p95_latency_ms ?? percentile(agentLatencies, 95);
  const interruptions = conversation.interruption_count ?? events.filter(event => event.event_type === "interruption_real").length;
  const durationMs = conversation.duration_ms ?? (conversation.ended_at ? new Date(conversation.ended_at).getTime() - new Date(conversation.started_at).getTime() : null);
  const turnsUnder2s = result?.turns_under_2s_pct ?? (agentLatencies.length ? Math.round((100 * agentLatencies.filter(value => value < LATENCY_TARGET_MS).length) / agentLatencies.length) : null);
  const dialing = events.find(event => event.event_type === "call_dialing")?.payload as { total_ms?: number } | undefined;
  const guardrails = events.filter(event => event.event_type === "guardrail_triggered");
  const lastGuardrail = guardrails.at(-1);
  const costByRole = costs.reduce<Record<string, number>>((totals, row) => {
    const key = humanize(row.role ?? row.provider ?? "otro");
    totals[key] = (totals[key] ?? 0) + (row.cost_usd ?? 0);
    return totals;
  }, {});

  const funnel = [
    { label: "Oferta validada", done: events.some(event => event.event_type === "offer_validated") },
    { label: "Condiciones dichas", done: (conversation.terms_presented?.length ?? 0) > 0 },
    { label: "Cliente confirmó", done: Boolean(commitment?.customer_confirmed) || evaluations.some(evaluation => evaluation.commitment_signal === "explicit") },
    { label: commitment ? `Registrada (${commitment.receipt_code})` : "Registrada", done: Boolean(commitment) },
  ];

  return <div className="page-enter">
    <Link href={ended ? (customer ? `/clientes/${customer.customer_id}` : "/") : "/en-vivo"} className="back-link"><ArrowLeft size={15} /> {ended ? "Volver a la ficha" : "Volver a en vivo"}</Link>

    <div className={`live-banner ${ended ? "live-banner-ended" : ""}`}>
      <span className="live-pill"><i />{ended ? "Finalizada" : conversation.channel === "voice" ? "Llamada en curso" : "Chat en curso"}</span>
      <strong>{customer?.full_name ?? "Cliente"}</strong>
      {grade && <GradeBadge grade={grade} />}
      <span className="live-banner-meta">{channelLabels[conversation.channel] ?? conversation.channel} · {conversation.turn_count} turnos</span>
      <Elapsed since={conversation.started_at} until={conversation.ended_at} />
      <span className={`live-status ${connected ? "live-status-live" : "live-status-connecting"}`}><i />{connected ? "En tiempo real" : "Conectando…"}</span>
      {!ended && <HangupButton conversationId={conversation.id} customerName={customer?.full_name ?? "el cliente"} channel={conversation.channel} variant="default" />}
    </div>

    {category && <section className={`result-banner result-${category}`} aria-label="Resultado final">
      <span className="eyebrow">RESULTADO FINAL</span>
      <strong>{resultCategoryLabels[category]}</strong>
      <span className="result-outcome">{humanize(conversation.outcome, outcomeLabels)}{conversation.outcome_reason ? ` · ${conversation.outcome_reason}` : ""}</span>
      <div className="result-facts">
        <span>Promesa registrada: <b>{commitment ? `Sí · ${commitment.receipt_code}` : "No"}</b></span>
        {agreementHint && <span className="result-fact-warn"><TriangleAlert size={13} /> Acuerdo por verificar</span>}
        <span>{channelLabels[conversation.channel] ?? conversation.channel} · {durationLabel(durationMs)} min · cerró {dateTimeLabel(conversation.ended_at, true)}</span>
      </div>
    </section>}

    {commitment
      ? <CommitmentCard commitment={commitment} links={commitmentLinks} offerName={offerNames[commitment.offer_code] ?? null} />
      : ended && <NoCommitmentCard outcome={conversation.outcome} reason={conversation.outcome_reason} summary={conversation.summary} agreementHint={agreementHint} />}

    {ended && <section className="closing-card closing-metrics" aria-label="Métricas de la conversación">
      <div><span className="eyebrow">LATENCIA PROM.</span><strong>{secondsLabel(avgLatency)}</strong></div>
      <div><span className="eyebrow">P95 POR TURNO</span><strong className={p95Latency == null ? "" : p95Latency < LATENCY_TARGET_MS ? "metric-ok" : "metric-bad"}>{secondsLabel(p95Latency)}</strong><small>Meta &lt; 2 s</small></div>
      <div><span className="eyebrow">TURNOS &lt; 2 S</span><strong>{turnsUnder2s != null ? `${turnsUnder2s}%` : "—"}</strong><small>{conversation.turn_count} turnos</small></div>
      <div><span className="eyebrow">INTERRUPCIONES</span><strong>{interruptions}</strong></div>
      <div><span className="eyebrow">DURACIÓN</span><strong>{durationLabel(durationMs)}</strong>{dialing?.total_ms != null && <small>Marcado: {secondsLabel(dialing.total_ms)}</small>}</div>
      <div><span className="eyebrow">GUARDRAILS</span><strong>{guardrails.length}</strong><small>{guardrails.length ? "Intervenciones de seguridad" : "Sin activaciones"}</small></div>
      <div><span className="eyebrow">RIESGO</span><strong>{conversation.risk_before ?? "—"} → {conversation.risk_after ?? "—"}</strong></div>
      <div><span className="eyebrow">COSTO</span><strong>{costLabel(conversation.cost_usd)}</strong>{Object.keys(costByRole).length > 1 && <small>{Object.entries(costByRole).map(([role, cost]) => `${role} $${cost.toFixed(4)}`).join(" · ")}</small>}</div>
      <div><span className="eyebrow">CAMBIO DE RIESGO</span><strong>{riskDelta(conversation.risk_before, conversation.risk_after)}</strong><small>Puntaje 0–100</small></div>
    </section>}

    {ended && commitment && conversation.summary && <p className="conversation-summary"><b>Resumen:</b> {conversation.summary}</p>}

    <div className="live-layout">
      <section className="panel transcript-panel" aria-labelledby="transcript-title">
        <div className="panel-heading"><div><span className="eyebrow">TRANSCRIPCIÓN</span><h2 id="transcript-title">Conversación</h2></div></div>
        {messages.length === 0 ? <p className="muted-note">Esperando el primer mensaje…</p> :
          <div className="transcript">{messages.map(message => {
            if (message.role === "tool") return <ToolChipRow key={message.id} message={message} />;
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

        <h3 className="subheading">Cierre del compromiso</h3>
        <ol className="closing-funnel" aria-label="Embudo de cierre">{funnel.map(step => <li key={step.label} className={step.done ? "funnel-done" : ""}>
          {step.done ? <CircleCheck size={15} /> : <CircleDashed size={15} />}<span>{step.label}</span>
        </li>)}</ol>
        {lastOffer?.event_type === "offer_rejected" && !commitment && <p className="funnel-note"><CircleX size={13} /> Última oferta rechazada: {eventDetail(lastOffer) ?? "fuera de política"}</p>}

        <dl className="brain-list">
          <div><dt>Etapa</dt><dd>{stageName(currentStageKey)}</dd></div>
          <div><dt>Intención</dt><dd>{humanize(latest?.intent, intentLabels)}{latest?.confidence != null && <small> · confianza {Math.round(latest.confidence * 100)}%</small>}</dd></div>
          <div><dt>Sentimiento</dt><dd>{humanize(latest?.sentiment, sentimentLabels)}{latest?.sentiment_score != null && <small> ({latest.sentiment_score.toFixed(2)})</small>}</dd></div>
          <div><dt>Ritmo</dt><dd>{humanize(latest?.pace, paceLabels)}</dd></div>
          <div><dt>Siguiente</dt><dd>{humanize(latest?.decision, decisionLabels)}</dd></div>
          <div><dt>Última oferta</dt><dd>{lastOffer
            ? lastOffer.event_type === "offer_validated"
              ? <span className="policy-ok"><CircleCheck size={14} /> Validada por política</span>
              : <span className="policy-bad"><CircleX size={14} /> Rechazada por política</span>
            : "Sin ofertas evaluadas"}</dd></div>
          <div><dt>Guardrails</dt><dd><span className={guardrails.length ? "guardrail-count guardrail-count-active" : "guardrail-count"}><ShieldAlert size={14} /> {guardrails.length}</span>{lastGuardrail && <small> · {eventDetail(lastGuardrail)}</small>}</dd></div>
          {!ended && dialing?.total_ms != null && <div><dt>Marcado</dt><dd>{secondsLabel(dialing.total_ms)}</dd></div>}
          {!ended && <div><dt>Latencia</dt><dd>{secondsLabel(agentLatencies.at(-1))}{p95Latency != null && <small> · p95 {secondsLabel(p95Latency)}</small>}</dd></div>}
        </dl>

        <h3 className="subheading">Recorrido de etapas</h3>
        {stageHistory.length === 0 ? <p className="muted-note">Sin cambios de etapa todavía.</p> :
          <ol className="stage-history">{stageHistory.map(change => <li key={change.id}>
            <div><strong>{stageName(change.from)} → {stageName(change.to)}</strong><time>{timeLabel(change.at)}</time></div>
            {change.rule && <small>Regla: {change.rule}</small>}
          </li>)}</ol>}

        <h3 className="subheading">Eventos destacados</h3>
        {eventGroups.length === 0 ? <p className="muted-note">Sin eventos por ahora.</p> : <>
          <ul className="event-list">{visibleGroups.map(group => {
            const meta = highlightedEvents[group.type];
            const Icon = group.type === "commitment_registered" ? Handshake : group.type === "guardrail_triggered" ? ShieldAlert : group.type === "handoff_created" || group.type === "handoff_completed" || group.type === "payment_link_created" ? Send : group.type === "interruption_real" ? Scissors : meta.tone === "ok" ? CircleCheck : TriangleAlert;
            return <li key={group.key} className={`event event-${meta.tone}`}><Icon size={14} /><div><strong>{meta.label}{group.count > 1 && <span className="event-count"> ×{group.count}</span>}</strong>{group.detail && <small>{group.detail}</small>}</div><time>{timeLabel(group.last.created_at)}</time></li>;
          })}</ul>
          {eventGroups.length > VISIBLE_EVENTS && <button type="button" className="text-link events-toggle" onClick={() => setShowAllEvents(value => !value)}>{showAllEvents ? "Ver menos" : `Ver todos (${eventGroups.length})`}</button>}
        </>}
      </section>
    </div>
  </div>;
}
