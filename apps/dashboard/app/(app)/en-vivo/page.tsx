import Link from "next/link";
import { Activity, ArrowUpRight, MessageCircle, Phone, Scissors, TriangleAlert } from "lucide-react";
import { Elapsed } from "@/components/live/elapsed";
import { HangupButton } from "@/components/live/hangup-button";
import { LiveRefresh } from "@/components/live/live-refresh";
import { channelLabels, decisionLabels, humanize, intentLabels, sentimentLabels } from "@/lib/prevention";
import { getLiveConversations } from "@/lib/supabase/queries";

/** Una llamada de cobranza preventiva no dura esto: probablemente quedó abierta. */
const STALE_AFTER_S = 15 * 60;

export default async function LivePage() {
  const live = await getLiveConversations();

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
      : <div className="live-grid">{live.map(conversation => <article key={conversation.conversation_id} className={`live-card ${conversation.seconds_elapsed > STALE_AFTER_S ? "live-card-stale" : ""}`}>
          <div className="live-card-top">
            <span className="live-pill"><i />{conversation.channel === "voice" ? "Llamada" : "Chat"} en curso</span>
            <Elapsed since={conversation.started_at} />
          </div>
          <Link href={`/conversaciones/${conversation.conversation_id}`} className="live-card-name">
            <span className="channel-symbol-sm">{conversation.channel === "whatsapp" ? <MessageCircle size={16} /> : <Phone size={15} />}</span>
            <div><strong>{conversation.full_name}</strong><small>{conversation.customer_code} · {channelLabels[conversation.channel] ?? conversation.channel}</small></div>
            <ArrowUpRight size={16} className="live-card-arrow" />
          </Link>
          {conversation.seconds_elapsed > STALE_AFTER_S && <p className="alert-strip alert-warn"><TriangleAlert size={14} /><span>Lleva más de {Math.round(STALE_AFTER_S / 60)} min abierta. Si ya terminó, cuélguela para cerrarla.</span></p>}
          <dl className="live-card-brain">
            <div><dt>Etapa</dt><dd>{conversation.current_stage_name ?? humanize(conversation.current_stage)}</dd></div>
            <div><dt>Intención</dt><dd>{humanize(conversation.last_intent, intentLabels)}</dd></div>
            <div><dt>Sentimiento</dt><dd>{humanize(conversation.sentiment_end ?? conversation.sentiment_start, sentimentLabels)}</dd></div>
            <div><dt>Decisión</dt><dd>{humanize(conversation.last_decision, decisionLabels)}</dd></div>
          </dl>
          {conversation.last_message && <p className="live-card-last"><b>{conversation.last_message_role === "customer" ? "Cliente" : "Agente"}:</b> {conversation.last_message}</p>}
          <div className="live-card-flags">
            <span>{conversation.turn_count} turnos</span>
            {conversation.interruption_count > 0 && <span className="flag-warn"><Scissors size={12} />{conversation.interruption_count} interrupciones</span>}
            {conversation.escalated && <span className="flag-danger"><TriangleAlert size={12} />Escalada</span>}
          </div>
          <div className="live-card-actions">
            <Link href={`/conversaciones/${conversation.conversation_id}`} className="text-link">Ver conversación <ArrowUpRight size={13} /></Link>
            {conversation.channel === "voice" && <HangupButton conversationId={conversation.conversation_id} customerName={conversation.full_name} />}
          </div>
        </article>)}</div>}
  </div>;
}
