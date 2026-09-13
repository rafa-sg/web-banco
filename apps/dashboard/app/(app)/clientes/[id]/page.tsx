import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Ban, MessageCircle, Phone, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import {
  actionLabels, asList, bandToGrade, channelLabels, dateLabel, dateTimeLabel, dueLabel, humanize, initials, labelOf, money, outcomeLabels,
} from "@/lib/prevention";
import { getConversationsForCustomer, getCustomerById, getLatestIntervention, getSignalDefinitions } from "@/lib/supabase/queries";

function ChannelIcon({ channel, size = 16 }: { channel: string | null; size?: number }) {
  if (channel === "whatsapp") return <MessageCircle size={size} />;
  if (channel === "voice") return <Phone size={size} />;
  return <UserRound size={size} />;
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  const [intervention, conversations, signalDefinitions] = await Promise.all([getLatestIntervention(id), getConversationsForCustomer(id), getSignalDefinitions()]);
  const signalLabels = new Map(signalDefinitions.map(signal => [signal.code, signal]));

  const grade = customer.risk_band ? bandToGrade[customer.risk_band] : null;
  const factors = (customer.top_factors ?? []).map(factor => ({
    label: factor.label ?? factor.factor ?? "Factor",
    detail: factor.detail,
    value: factor.contribution ?? factor.points ?? factor.weight ?? 0,
  }));
  const maxFactor = Math.max(1, ...factors.map(factor => factor.value));
  const rules = asList(intervention?.matched_rules).map(labelOf);
  const blocks = asList(intervention?.block_reasons).map(labelOf);
  if (customer.opted_out) blocks.unshift("El cliente pidió no ser contactado");
  if (customer.is_control_group) blocks.unshift("Pertenece al grupo de control");
  const offers = asList(intervention?.offers).map(labelOf).slice(0, 3);
  const channel = intervention?.recommended_channel ?? customer.preferred_channel;
  const sequence = intervention?.channel_sequence?.length ? intervention.channel_sequence : channel ? [channel] : [];
  const actionTitle = customer.is_control_group ? "Sin contacto · grupo de control" : blocks.length ? "Bloqueado por regla" : actionLabels[intervention?.status ?? customer.intervention_status ?? ""] ?? "Monitorear";

  return <div className="page-enter">
    <Link href="/" className="back-link"><ArrowLeft size={15} /> Volver al centro de prevención</Link>

    <div className="customer-heading">
      <span className="avatar large-avatar">{initials(customer.full_name)}</span>
      <div>
        <span className="eyebrow">¿POR QUÉ ESTAMOS CONTACTANDO A…?</span>
        <h1>{customer.full_name}</h1>
        <p>{customer.customer_code}<span>·</span>{customer.product_type ?? "Sin producto"}<span>·</span>{[customer.city, customer.department].filter(Boolean).join(", ") || "—"}</p>
      </div>
      <div className="customer-heading-actions">
        {grade && <GradeBadge grade={grade} large />}
        <span title="Llamada desde la web pendiente de conectar con el agente"><Button disabled><Phone size={15} /> Empezar llamada</Button></span>
      </div>
    </div>

    <div className="profile-grid">
      <section className="panel" aria-labelledby="financial-title">
        <div className="panel-heading"><div><span className="eyebrow">A · PERFIL FINANCIERO</span><h2 id="financial-title">Situación del crédito</h2></div></div>
        <div className="score-pair">
          <div><span>Riesgo</span><strong>{customer.risk_score ?? "—"}<small>/100</small></strong></div>
          <div><span>Prob. de mora</span><strong>{customer.probability_default != null ? `${Math.round(customer.probability_default * 100)}%` : "—"}</strong></div>
        </div>
        <dl className="profile-list">
          <div><dt>Saldo</dt><dd>{money(customer.balance)}</dd></div>
          <div><dt>Próxima cuota</dt><dd>{money(customer.amount_due)}</dd></div>
          <div><dt>Vencimiento</dt><dd>{dateLabel(customer.next_due_date)} · {dueLabel(customer.days_to_due, customer.days_past_due)}</dd></div>
          <div><dt>Canal preferido</dt><dd>{channelLabels[customer.preferred_channel ?? ""] ?? "—"}</dd></div>
          <div><dt>Último contacto</dt><dd>{customer.last_contact_at ? `${dateLabel(customer.last_contact_at)} · ${channelLabels[customer.last_contact_channel ?? ""] ?? "—"}` : "Sin contacto"}</dd></div>
          <div><dt>Último resultado</dt><dd>{humanize(customer.last_outcome, outcomeLabels)}</dd></div>
          <div><dt>Compromisos abiertos</dt><dd>{customer.open_commitments}</dd></div>
          <div><dt>Segmento · ingreso</dt><dd>{[customer.segment, customer.income_type].filter(Boolean).join(" · ") || "—"}</dd></div>
        </dl>
        <p className="score-disclaimer">El riesgo es un puntaje 0–100, no un porcentaje. La probabilidad de mora es una estimación demostrativa.</p>
      </section>

      <section className="panel" aria-labelledby="why-title">
        <div className="panel-heading"><div><span className="eyebrow">B · ¿POR QUÉ?</span><h2 id="why-title">Señales que explican el riesgo</h2></div></div>
        {factors.length ? <div className="factor-bars">{factors.map(factor => <div key={factor.label} className="factor-bar">
          <div><strong>{factor.label}</strong><b>{factor.value}</b></div>
          <div className="progress-track"><span style={{ width: `${(factor.value / maxFactor) * 100}%` }} /></div>
          {factor.detail && <p>{factor.detail}</p>}
        </div>)}</div> : <p className="muted-note">Sin factores registrados para este cliente.</p>}
        {(customer.active_signals ?? []).length > 0 && <><h3 className="subheading">Señales activas</h3><div className="signal-chips">{customer.active_signals!.map(signal => <span key={signal} className="signal-chip" title={signalLabels.get(signal)?.description ?? undefined}>{signalLabels.get(signal)?.label ?? humanize(signal)}</span>)}</div></>}
        {rules.length > 0 && <><h3 className="subheading">Reglas activadas</h3><ul className="rule-list">{rules.map(rule => <li key={rule}><ShieldCheck size={14} />{rule}</li>)}</ul></>}
        {blocks.length > 0 && <><h3 className="subheading">Bloqueos</h3><ul className="rule-list rule-list-blocked">{blocks.map(block => <li key={block}><Ban size={14} />{block}</li>)}</ul></>}
      </section>

      <section className="panel recommendation-panel" aria-labelledby="action-title">
        <div className="panel-heading"><div><span className="eyebrow">C · INTERVENCIÓN RECOMENDADA</span><h2 id="action-title">Qué hacer ahora</h2></div></div>
        <div className="action-hero"><span className="action-icon"><ChannelIcon channel={channel} size={22} /></span><div><strong>{actionTitle}</strong><small>{channel ? `Canal sugerido: ${channelLabels[channel] ?? channel}` : "Sin canal sugerido"}</small></div></div>
        {intervention?.reason && <p className="action-reason">{intervention.reason}</p>}
        {sequence.length > 0 && <><h3 className="subheading">Plan de contacto</h3><ol className="stepper">{sequence.map((step, index) => <li key={`${step}-${index}`}><span>{index + 1}</span>{channelLabels[step] ?? humanize(step)}</li>)}</ol></>}
        {offers.length > 0 && <><h3 className="subheading">Ofertas permitidas</h3><ul className="offer-list">{offers.map(offer => <li key={offer}>{offer}</li>)}</ul></>}
        <dl className="profile-list compact-list">
          <div><dt>Estado</dt><dd>{humanize(intervention?.status ?? customer.intervention_status, actionLabels)}</dd></div>
          <div><dt>Programada para</dt><dd>{dateTimeLabel(intervention?.scheduled_for)}</dd></div>
        </dl>
        {!intervention && <p className="muted-note">Aún no hay una intervención registrada. Ejecuta una corrida desde el centro de prevención.</p>}
      </section>
    </div>

    <section className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">HISTORIAL</span><h2>Conversaciones<span className="count-badge">{conversations.length}</span></h2></div></div>
      {conversations.length === 0 ? <div className="empty-state"><h3>Sin conversaciones todavía</h3><p>Cuando el agente contacte a este cliente, la gestión aparecerá aquí.</p></div> :
        <div className="table-scroll"><table>
          <thead><tr><th>Fecha</th><th>Canal</th><th>Resultado</th><th>Riesgo</th><th>Resumen</th><th><span className="sr-only">Detalle</span></th></tr></thead>
          <tbody>{conversations.map(conversation => <tr key={conversation.id}>
            <td>{dateTimeLabel(conversation.started_at)}</td>
            <td><span className="channel-tag"><ChannelIcon channel={conversation.channel} size={14} />{channelLabels[conversation.channel] ?? conversation.channel}</span></td>
            <td><span className="action-tag">{conversation.status === "active" ? "En curso" : humanize(conversation.outcome, outcomeLabels)}</span>{conversation.escalated && <small className="cell-secondary">Escalada</small>}</td>
            <td>{conversation.risk_before ?? "—"} → {conversation.risk_after ?? "—"}</td>
            <td><span className="why-cell" title={conversation.summary ?? ""}>{conversation.summary ?? "—"}</span></td>
            <td><Link className="row-arrow" href={`/conversaciones/${conversation.id}`} aria-label="Ver línea de tiempo"><ArrowUpRight size={15} /></Link></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </div>;
}
