import Link from "next/link";
import { Activity, ArrowUpRight, MessageCircle, Phone, Scissors, TriangleAlert } from "lucide-react";
import { Elapsed } from "@/components/live/elapsed";
import { LiveRefresh } from "@/components/live/live-refresh";
import { channelLabels, humanize, intentLabels, sentimentLabels } from "@/lib/prevention";
import { getLiveConversations } from "@/lib/supabase/queries";

export default async function LivePage() {
  const live = await getLiveConversations();

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">LA IA DECIDIENDO TURNO A TURNO</span>
        <h1>En vivo<span className="heading-dot">.</span></h1>
        <p>Conversaciones en curso con su etapa, intención y última decisión del agente.</p>
      </div>
      <LiveRefresh tables={["conversations", "messages", "turn_evaluations"]} channelName="live-list" />
    </div>

    {live.length === 0
      ? <section className="panel empty-state"><Activity size={30} /><h3>No hay conversaciones en curso</h3><p>Cuando el agente inicie una llamada o un chat, aparecerá aquí automáticamente.</p></section>
      : <div className="live-grid">{live.map(conversation => <Link key={conversation.conversation_id} href={`/conversaciones/${conversation.conversation_id}`} className="live-card">
          <div className="live-card-top">
            <span className="live-pill"><i />{conversation.channel === "voice" ? "Llamada" : "Chat"} en curso</span>
            <Elapsed since={conversation.started_at} />
          </div>
          <div className="live-card-name">
            <span className="channel-symbol-sm">{conversation.channel === "whatsapp" ? <MessageCircle size={16} /> : <Phone size={15} />}</span>
            <div><strong>{conversation.full_name}</strong><small>{conversation.customer_code} · {channelLabels[conversation.channel] ?? conversation.channel}</small></div>
            <ArrowUpRight size={16} className="live-card-arrow" />
          </div>
          <dl className="live-card-brain">
            <div><dt>Etapa</dt><dd>{conversation.current_stage_name ?? humanize(conversation.current_stage)}</dd></div>
            <div><dt>Intención</dt><dd>{humanize(conversation.last_intent, intentLabels)}</dd></div>
            <div><dt>Sentimiento</dt><dd>{humanize(conversation.sentiment_end ?? conversation.sentiment_start, sentimentLabels)}</dd></div>
            <div><dt>Decisión</dt><dd>{humanize(conversation.last_decision)}</dd></div>
          </dl>
          {conversation.last_message && <p className="live-card-last"><b>{conversation.last_message_role === "customer" ? "Cliente" : "Agente"}:</b> {conversation.last_message}</p>}
          <div className="live-card-flags">
            <span>{conversation.turn_count} turnos</span>
            {conversation.interruption_count > 0 && <span className="flag-warn"><Scissors size={12} />{conversation.interruption_count} interrupciones</span>}
            {conversation.escalated && <span className="flag-danger"><TriangleAlert size={12} />Escalada</span>}
          </div>
        </Link>)}</div>}
  </div>;
}
