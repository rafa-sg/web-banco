"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, CircleCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { decideCommitment } from "@/app/(app)/configuracion/actions";
import { dateLabel, dateTimeLabel, humanize, money, unresolvedPlaceholders } from "@/lib/prevention";
import type { PendingCommitment } from "@/lib/types";

function ApprovalRow({ item, offerName }: { item: PendingCommitment; offerName: string | null }) {
  const [state, setState] = useState<"pending" | "approved" | "cancelled">("pending");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const decide = (approve: boolean) => start(async () => {
    const result = await decideCommitment(item.id, approve);
    if (result.ok) { setState(approve ? "approved" : "cancelled"); setError(null); } else setError(result.error);
  });

  return <article className="panel approval-card">
    <div className="rule-card-head">
      <div className="rule-card-title"><Link href={`/clientes/${item.customer_id}`}><strong>{item.customer_name}</strong></Link><small title={item.offer_code ?? undefined}>{offerName ?? humanize(item.commitment_type)} · solicitado {dateTimeLabel(item.created_at, true)}</small></div>
      <strong className="approval-amount">{money(item.amount)}</strong>
    </div>
    {item.terms_text && (unresolvedPlaceholders(item.terms_text).length
      ? <p className="alert-strip alert-warn">Condiciones incompletas en el registro: revise monto y fecha antes de aprobar.</p>
      : <p className="rule-description">{item.terms_text}</p>)}
    <div className="rule-card-foot">
      <span className="rule-meta">Fecha comprometida: {dateLabel(item.committed_date, true)}</span>
      <span className="spacer" />
      {state === "pending"
        ? <><Button variant="outline" size="sm" disabled={busy} onClick={() => decide(false)}><X size={14} /> Rechazar</Button><Button size="sm" disabled={busy} onClick={() => decide(true)}><Check size={14} /> Aprobar</Button></>
        : <span className={state === "approved" ? "policy-ok" : "policy-bad"}><CircleCheck size={14} /> {state === "approved" ? "Aprobado" : "Rechazado"}</span>}
    </div>
    {error && <p className="form-error">{error}</p>}
  </article>;
}

export function ApprovalsList({ items, offerNames = {} }: { items: PendingCommitment[]; offerNames?: Record<string, string> }) {
  if (!items.length) return <section className="panel empty-state"><CircleCheck size={30} /><h3>No hay compromisos pendientes de aprobación</h3><p>Cuando el agente acuerde una opción que requiere visto bueno humano, aparecerá aquí.</p></section>;
  return <div className="stack">{items.map(item => <ApprovalRow key={item.id} item={item} offerName={item.offer_code ? offerNames[item.offer_code] ?? null : null} />)}</div>;
}
