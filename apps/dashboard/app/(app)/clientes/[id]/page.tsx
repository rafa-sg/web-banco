import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Ban, Mail, MessageCircle, Phone, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { CommitmentStatus } from "@/components/commitments/commitment-card";
import { ContactButton } from "@/components/prevention/call-button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import {
  actionLabels, asList, bandToGrade, channelLabels, contactBlockReason, contactChannelFor, dateLabel, dateTimeLabel, dueLabel, gradeLabels, humanize, initials, labelOf, money,
  outcomeLabels, phoneLabel, productLabels, unresolvedPlaceholders,
} from "@/lib/prevention";
import { commitmentTypeLabels } from "@/lib/conversation";
import { getActivePolicy, getConversationsForCustomer, getCustomerContact, getCustomerById, getCustomerCommitments, getLatestIntervention, getOfferNames, getSignalDefinitions } from "@/lib/supabase/queries";

const OPEN_COMMITMENT = new Set(["pending", "pending_approval", "approved"]);

function ChannelIcon({ channel, size = 16 }: { channel: string | null; size?: number }) {
  if (channel === "whatsapp") return <MessageCircle size={size} />;
  if (channel === "voice") return <Phone size={size} />;
  if (channel === "email") return <Mail size={size} />;
  return <UserRound size={size} />;
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  const [intervention, conversations, signalDefinitions, commitments, offerNames, policy, contact] = await Promise.all([getLatestIntervention(id), getConversationsForCustomer(id), getSignalDefinitions(), getCustomerCommitments(id), getOfferNames(), getActivePolicy(), getCustomerContact(id)]);
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
  const contactChannel = contactChannelFor(grade, policy?.channel_by_grade);
  const product = customer.product_type ? productLabels[customer.product_type] ?? humanize(customer.product_type) : "Sin producto";
  const openCommitment = commitments.filter(row => OPEN_COMMITMENT.has(row.status)).sort((a, b) => (a.committed_date ?? "").localeCompare(b.committed_date ?? ""))[0] ?? null;
  const late = (customer.days_past_due ?? 0) > 0;
  // Solo con contacto habilitado el agente contacta de verdad: se muestra a quién, para no llamar o escribir por error.
  const destination = customer.contact_enabled
    ? contactChannel === "email" ? contact?.email ?? null : phoneLabel(contact?.phone_e164)
    : null;
  const actionTitle = customer.is_control_group ? "Sin contacto · grupo de control" : blocks.length ? "Bloqueado por regla" : actionLabels[intervention?.status ?? customer.intervention_status ?? ""] ?? "Monitorear";

  return <div className="page-enter">
    <Link href="/" className="back-link"><ArrowLeft size={15} /> Volver al centro de prevención</Link>

    <div className="customer-heading">
      <span className="avatar large-avatar">{initials(customer.full_name)}</span>
      <div>
        <span className="eyebrow">¿POR QUÉ ESTAMOS CONTACTANDO A…?</span>
        <h1>{customer.full_name}</h1>
        {customer.demo_notes && <span className="demo-note-badge" title={customer.demo_notes}>{customer.contact_enabled ? "Contacto real de prueba" : "Nota de demo"} · {customer.demo_notes}</span>}
        <p>{customer.customer_code}<span>·</span>{product}<span>·</span>{[customer.city, customer.department].filter(Boolean).join(", ") || "—"}</p>
      </div>
      <div className="customer-heading-actions">
        {grade && <GradeBadge grade={grade} large />}
        <div className="contact-action">
          <ContactButton customerId={customer.customer_id} channel={contactChannel} disabledReason={contactBlockReason(customer)} />
          {destination && <small>{contactChannel === "email" ? "Se enviará a" : "Llamará a"} <b>{destination}</b></small>}
          {customer.contact_enabled && !destination && <small className="flag-warn">Sin {contactChannel === "email" ? "correo" : "teléfono"} registrado</small>}
        </div>
      </div>
    </div>

    <section className="record-summary" aria-label="Situación actual">
      <div><span>Próxima cuota</span><strong>{money(customer.amount_due)}</strong><small className={late ? "due-late" : ""}>{dateLabel(customer.next_due_date, true)} · {dueLabel(customer.days_to_due, customer.days_past_due)}</small></div>
      <div><span>Riesgo</span><strong>{customer.risk_score ?? "—"}<small>/100</small></strong><small>{grade ? gradeLabels[grade] : "Sin grado"}</small></div>
      <div><span>Promesa vigente</span>{openCommitment
        ? <><strong>{money(openCommitment.amount)}</strong><small>{openCommitment.receipt_code} · {dateLabel(openCommitment.committed_date, true)}</small></>
        : <><strong>Ninguna</strong><small>Sin compromisos abiertos</small></>}</div>
      <div><span>Próxima gestión</span><strong>{contactChannel === "email" ? "Correo" : contactChannel === "voice" ? "Llamada" : "—"}</strong><small>{intervention?.scheduled_for ? `Programada ${dateTimeLabel(intervention.scheduled_for, true)}` : humanize(intervention?.status ?? customer.intervention_status, actionLabels)}</small></div>
      <div><span>Último contacto</span><strong>{customer.last_contact_at ? dateLabel(customer.last_contact_at, true) : "Sin contacto"}</strong><small>{customer.last_contact_at ? `${channelLabels[customer.last_contact_channel ?? ""] ?? "—"} · ${humanize(customer.last_outcome, outcomeLabels)}` : "—"}</small></div>
    </section>

    <div className="profile-grid">
      <section className="panel" aria-labelledby="financial-title">
        <div className="panel-heading"><div><span className="eyebrow">A · PERFIL FINANCIERO</span><h2 id="financial-title">Situación del crédito</h2></div></div>
        <div className="score-pair">
          <div><span>Riesgo</span><strong>{customer.risk_score ?? "—"}<small>/100</small></strong></div>
          <div><span>Prob. de mora</span><strong>{customer.probability_default != null ? `${Math.round(customer.probability_default * 100)}%` : "—"}</strong></div>
        </div>
        <dl className="profile-list">
          <div><dt>Producto</dt><dd>{product}</dd></div>
          <div><dt>Saldo del crédito</dt><dd className="amount">{money(customer.balance)}</dd></div>
          <div><dt>Cuota exigible</dt><dd className="amount">{money(customer.amount_due)}</dd></div>
          <div><dt>Vencimiento</dt><dd>{dateLabel(customer.next_due_date, true)}</dd></div>
          <div><dt>Canal preferido</dt><dd>{channelLabels[customer.preferred_channel ?? ""] ?? "—"}</dd></div>
          <div><dt>Compromisos abiertos</dt><dd>{customer.open_commitments}</dd></div>
          <div><dt>Segmento</dt><dd>{customer.segment ? humanize(customer.segment) : "—"}</dd></div>
          <div><dt>Tipo de ingreso</dt><dd>{customer.income_type ? humanize(customer.income_type) : "—"}</dd></div>
        </dl>
        <p className="score-disclaimer">El riesgo es un puntaje 0–100, no un porcentaje. La probabilidad de mora es una estimación demostrativa.</p>
      </section>

      <section className="panel" aria-labelledby="why-title">
        <div className="panel-heading"><div><span className="eyebrow">B · ¿POR QUÉ?</span><h2 id="why-title">Señales que explican el riesgo</h2></div></div>
        {factors.length ? <div className="factor-bars">{factors.map(factor => <div key={factor.label} className="factor-bar">
          <div><strong>{factor.label}</strong><b>+{factor.value} pts</b></div>
          <div className="progress-track"><span style={{ width: `${(factor.value / maxFactor) * 100}%` }} /></div>
          {factor.detail && <p>{factor.detail}</p>}
        </div>)}</div> : <p className="muted-note">Sin factores registrados para este cliente.</p>}
        {(customer.active_signals ?? []).length > 0 && <><h3 className="subheading">Señales activas</h3><div className="signal-chips">{customer.active_signals!.map(signal => <span key={signal} className="signal-chip" title={signalLabels.get(signal)?.description ?? undefined}>{signalLabels.get(signal)?.label ?? humanize(signal)}</span>)}</div></>}
        {rules.length > 0 && <><h3 className="subheading">Reglas activadas</h3><ul className="rule-list">{rules.map(rule => <li key={rule}><ShieldCheck size={14} />{rule}</li>)}</ul></>}
        {blocks.length > 0 && <><h3 className="subheading">Bloqueos</h3><ul className="rule-list rule-list-blocked">{blocks.map(block => <li key={block}><Ban size={14} />{block}</li>)}</ul></>}
      </section>

      <section className="panel recommendation-panel" aria-labelledby="action-title">
        <div className="panel-heading"><div><span className="eyebrow">C · INTERVENCIÓN RECOMENDADA</span><h2 id="action-title">Qué hacer ahora</h2></div></div>
        <div className="action-hero"><span className="action-icon"><ChannelIcon channel={channel} size={22} /></span><div><strong>{actionTitle}</strong><small>{channel ? `Canal sugerido: ${channelLabels[channel] ?? channel}` : "Sin canal sugerido"}{contactChannel ? ` · Desde la web: ${contactChannel === "email" ? "correo" : "llamada"} (grado ${grade})` : ""}</small></div></div>
        {intervention?.reason && <p className="action-reason">{intervention.reason}</p>}
        {sequence.length > 0 && <><h3 className="subheading">Plan de contacto</h3><ol className="stepper">{sequence.map((step, index) => <li key={`${step}-${index}`}><span>{index + 1}</span>{channelLabels[step] ?? humanize(step)}</li>)}</ol></>}
        {offers.length > 0 && <><h3 className="subheading">Ofertas permitidas</h3><ul className="offer-list">{offers.map(offer => <li key={offer}>{offer}</li>)}</ul></>}
        <dl className="profile-list compact-list">
          <div><dt>Estado</dt><dd>{humanize(intervention?.status ?? customer.intervention_status, actionLabels)}</dd></div>
          <div><dt>Programada para</dt><dd>{dateTimeLabel(intervention?.scheduled_for, true)}</dd></div>
        </dl>
        {!intervention && <p className="muted-note">Aún no hay una intervención registrada. Ejecuta una corrida desde el centro de prevención.</p>}
      </section>
    </div>

    <section className="panel table-panel" aria-labelledby="commitments-title">
      <div className="panel-heading"><div><span className="eyebrow">RESULTADO DE LA GESTIÓN</span><h2 id="commitments-title">Promesas de pago<span className="count-badge">{commitments.length}</span></h2></div><Link href="/promesas" className="text-link">Ver todas <ArrowUpRight size={13} /></Link></div>
      {commitments.length === 0 ? <div className="empty-state"><h3>Sin promesas de pago</h3><p>Cuando el cliente acuerde una fecha o un monto con el agente, el compromiso aparecerá aquí.</p></div> :
        <div className="table-scroll"><table>
          <thead><tr><th>Código</th><th>Oferta</th><th>Fecha comprometida</th><th>Monto</th><th>Estado</th><th>Registrada</th><th><span className="sr-only">Conversación</span></th></tr></thead>
          <tbody>{commitments.map(commitment => <tr key={commitment.id}>
            <td><strong className="amount">{commitment.receipt_code}</strong></td>
            <td><span className="cell-title">{offerNames[commitment.offer_code] ?? commitmentTypeLabels[commitment.commitment_type] ?? commitment.offer_code}</span><small className="cell-secondary">{commitment.offer_code}{unresolvedPlaceholders(commitment.terms_text).length > 0 && <span className="flag-warn"> · <TriangleAlert size={11} /> condiciones incompletas</span>}</small></td>
            <td>{dateLabel(commitment.committed_date, true)}{commitment.original_due_date && commitment.original_due_date !== commitment.committed_date && <small className="cell-secondary">Vencía {dateLabel(commitment.original_due_date, true)}</small>}</td>
            <td className="amount">{money(commitment.amount)}</td>
            <td><CommitmentStatus status={commitment.status} /></td>
            <td>{dateTimeLabel(commitment.created_at, true)}</td>
            <td>{commitment.conversation_id && <Link className="row-arrow" href={`/conversaciones/${commitment.conversation_id}`} aria-label="Ver conversación de origen"><ArrowUpRight size={15} /></Link>}</td>
          </tr>)}</tbody>
        </table></div>}
    </section>

    <section className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">HISTORIAL</span><h2>Conversaciones<span className="count-badge">{conversations.length}</span></h2></div></div>
      {conversations.length === 0 ? <div className="empty-state"><h3>Sin conversaciones todavía</h3><p>Cuando el agente contacte a este cliente, la gestión aparecerá aquí.</p></div> :
        <div className="table-scroll"><table>
          <thead><tr><th>Fecha</th><th>Canal</th><th>Resultado</th><th>Riesgo</th><th>Resumen</th><th><span className="sr-only">Detalle</span></th></tr></thead>
          <tbody>{conversations.map(conversation => <tr key={conversation.id}>
            <td>{dateTimeLabel(conversation.started_at, true)}</td>
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
