"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CircleCheck, Clock, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignEscalation, resolveEscalation } from "@/app/(app)/configuracion/actions";
import { dateTimeLabel, humanize } from "@/lib/prevention";
import type { OpenEscalation } from "@/lib/types";

const priorityLabels: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja", urgent: "Urgente" };

function EscalationCard({ item }: { item: OpenEscalation }) {
  const [assignee, setAssignee] = useState(item.assigned_to ?? "");
  const [notes, setNotes] = useState("");
  const [resolved, setResolved] = useState(item.status === "resolved");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const overdue = !resolved && item.sla_due_at && new Date(item.sla_due_at).getTime() < Date.now();

  return <article className={`panel escalation-card ${resolved ? "rule-card-inactive" : ""}`}>
    <div className="rule-card-head">
      <span className={`effect-badge ${item.priority === "high" || item.priority === "urgent" ? "effect-block" : "effect-allow"}`}><Headphones size={13} />{priorityLabels[item.priority ?? ""] ?? humanize(item.priority)}</span>
      <div className="rule-card-title"><Link href={`/clientes/${item.customer_id}`}><strong>{item.customer_name}</strong></Link><small>{item.reason ?? "Sin motivo"}{item.trigger ? ` · ${item.trigger}` : ""}</small></div>
      <span className={`status-pill ${resolved ? "status-done" : "status-open"}`}>{resolved ? "Resuelta" : humanize(item.status)}</span>
    </div>
    <div className="rule-card-foot">
      <span className="rule-meta">Creada {dateTimeLabel(item.created_at)}</span>
      {item.sla_due_at && <span className={`rule-meta ${overdue ? "flag-danger" : ""}`}><Clock size={12} /> SLA {dateTimeLabel(item.sla_due_at)}</span>}
      {item.conversation_id && <Link className="text-link" href={`/conversaciones/${item.conversation_id}`}>Ver conversación</Link>}
    </div>
    {resolved ? <p className="rule-description">{item.assigned_to ? `Atendida por ${item.assigned_to}. ` : ""}{item.notes ?? ""}</p> :
      <div className="escalation-form">
        <label>Asignar a<input value={assignee} placeholder="asesor@banco" onChange={event => setAssignee(event.target.value)} /></label>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => start(async () => { const result = await assignEscalation(item.id, assignee); setMessage(result.ok ? { ok: true, text: "Asignada." } : { ok: false, text: result.error }); })}>Asignar</Button>
        <label className="grow">Nota de cierre<input value={notes} placeholder="Qué se acordó con el cliente" onChange={event => setNotes(event.target.value)} /></label>
        <Button size="sm" disabled={busy} onClick={() => start(async () => { const result = await resolveEscalation(item.id, notes); if (result.ok) { setResolved(true); setMessage(null); } else setMessage({ ok: false, text: result.error }); })}><CircleCheck size={14} /> Resolver</Button>
      </div>}
    {message && <p className={message.ok ? "form-ok" : "form-error"}>{message.text}</p>}
  </article>;
}

export function EscalationsList({ items }: { items: OpenEscalation[] }) {
  const open = items.filter(item => item.status !== "resolved");
  const closed = items.filter(item => item.status === "resolved");
  return <div className="stack">
    {open.length === 0 && <section className="panel empty-state"><CircleCheck size={30} /><h3>No hay escalaciones abiertas</h3><p>Los casos que el agente derive a una persona aparecerán aquí para asignarlos y resolverlos.</p></section>}
    {open.map(item => <EscalationCard key={item.id} item={item} />)}
    {closed.length > 0 && <><h3 className="subheading">Resueltas recientemente</h3>{closed.map(item => <EscalationCard key={item.id} item={item} />)}</>}
  </div>;
}
