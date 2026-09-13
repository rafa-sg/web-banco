import Link from "next/link";
import { Activity, ArrowUpRight, Clock, Mail, MessageCircle, Phone, Scissors, TriangleAlert } from "lucide-react";
import { Elapsed } from "@/components/live/elapsed";
import { HangupButton } from "@/components/live/hangup-button";
import { LiveRefresh } from "@/components/live/live-refresh";
import { channelLabels, decisionLabels, humanize, intentLabels, sentimentLabels } from "@/lib/prevention";
import { getLiveConversations } from "@/lib/supabase/queries";
import type { LiveConversation } from "@/lib/types";

/** Una conversación preventiva no dura esto: probablemente quedó abierta. */
const STALE_AFTER_S = 15 * 60;

function needsAttention(conversation: LiveConversation) {
  return conversation.escalated || conversation.seconds_elapsed > STALE_AFTER_S;
}

function ChannelIcon({ channel, size = 16 }: { channel: string; size?: number }) {
  if (channel === "voice") return <Phone size={size - 1} />;
  if (channel === "email") return <Mail size={size - 1} />;
  return <MessageCircle size={size} />;
}

function LiveCard({ conversation }: { conversation: LiveConversation }) {
  const stale = conversation.seconds_elapsed > STALE_AFTER_S;
  const sentiment = conversation.sentiment_end ?? conversation.sentiment_start;

  return <article className={`live-card ${needsAttention(conversation) ? "live-card-attention" : ""}`}>
    <div className="live-card-top">
      <Link href={`/conversaciones/${conversation.conversation_id}`} className="live-card-name">
        <span className="channel-symbol-sm"><ChannelIcon channel={conversation.channel} /></span>
        <span><strong>{conversation.full_name}</strong><small>{conversation.customer_code} · {channelLabels[conversation.channel] ?? conversation.channel}</small></span>
      </Link>
      <span className="live-card-clock"><Elapsed since={conversation.started_at} /><small>{conversation.turn_count} turnos</small></span>
    </div>

    {(stale || conversation.escalated || conversation.interruption_count > 0) && <div className="live-card-flags">
      {stale && <span className="flag-warn"><Clock size={12} /> Abierta hace rato</span>}
      {conversation.escalated && <span className="flag-danger"><TriangleAlert size={12} /> Escalada</span>}
      {conversation.interruption_count > 0 && <span><Scissors size={12} /> {conversation.interruption_count} interrupciones</span>}
    </div>}

    <dl className="live-card-brain">
      <div><dt>Etapa</dt><dd>{conversation.current_stage_name ?? humanize(conversation.current_stage)}</dd></div>
      <div><dt>Intención</dt><dd>{humanize(conversation.last_intent, intentLabels)}</dd></div>
      <div><dt>Sentimiento</dt><dd><span className={`sentiment-tag sentiment-${(sentiment ?? "").toLowerCase()}`}>{humanize(sentiment, sentimentLabels)}</span></dd></div>
      <div><dt>Decisión</dt><dd>{humanize(conversation.last_decision, decisionLabels)}</dd></div>
    </dl>

    <p className="live-card-last">{conversation.last_message
      ? <><b>{conversation.last_message_role === "customer" ? "Cliente:" : "Agente:"}</b> {conversation.last_message}</>
      : <span className="muted-note">Esperando el primer mensaje…</span>}</p>

    <div className="live-card-actions">
      <Link href={`/conversaciones/${conversation.conversation_id}`} className="text-link">Ver conversación <ArrowUpRight size={13} /></Link>
      <HangupButton conversationId={conversation.conversation_id} customerName={conversation.full_name} channel={conversation.channel} />
    </div>
  </article>;
}

export default async function LivePage() {
  const live = await getLiveConversations();
  const attention = live.filter(needsAttention);
  const running = live.filter(conversation => !needsAttention(conversation));
  const byChannel = Object.entries(live.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.channel]: (counts[row.channel] ?? 0) + 1 }), {}));

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">LA IA DECIDIENDO TURNO A TURNO</span>
        <h1>En vivo<span className="heading-dot">.</span></h1>
        <p>Conversaciones en curso con su etapa, intención y última decisión del agente.</p>
      </div>
      <LiveRefresh tables={["conversations", "messages", "turn_evaluations", "conversation_events", "intervention_steps", "commitments"]} channelName="live-list" />
    </div>

    {live.length === 0
      ? <section className="panel empty-state"><Activity size={30} /><h3>No hay conversaciones en curso</h3><p>Cuando el agente inicie una llamada o un chat, aparecerá aquí automáticamente.</p></section>
      : <>
          <div className="live-summary">
            <span className="live-pill"><i />{live.length} en curso</span>
            {byChannel.map(([channel, count]) => <span key={channel}><ChannelIcon channel={channel} size={14} />{count} {channelLabels[channel] ?? channel}</span>)}
            {attention.length > 0 && <span className="flag-warn"><TriangleAlert size={14} />{attention.length} requieren atención</span>}
          </div>

          {attention.length > 0 && <section aria-labelledby="attention-title">
            <h2 id="attention-title" className="live-section-title"><TriangleAlert size={15} /> Requieren atención <small>escaladas, o abiertas hace más de {Math.round(STALE_AFTER_S / 60)} min</small></h2>
            <div className="live-grid">{attention.map(conversation => <LiveCard key={conversation.conversation_id} conversation={conversation} />)}</div>
          </section>}

          {running.length > 0 && <section aria-labelledby="running-title">
            <h2 id="running-title" className={`live-section-title ${attention.length ? "" : "sr-only"}`}>En curso</h2>
            <div className="live-grid">{running.map(conversation => <LiveCard key={conversation.conversation_id} conversation={conversation} />)}</div>
          </section>}
        </>}
  </div>;
}
