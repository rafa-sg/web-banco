"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommitmentStatus } from "@/components/commitments/commitment-card";
import { addDays, commitmentStatusLabels, commitmentTypeLabels } from "@/lib/conversation";
import { dateLabel, dateTimeLabel, money, unresolvedPlaceholders } from "@/lib/prevention";
import type { CommitmentListItem } from "@/lib/types";

const OPEN = new Set(["pending", "pending_approval", "approved"]);
/** Obligaciones de pago vigentes: una propuesta pendiente de aprobación todavía no lo es. */
const PAYABLE = new Set(["pending", "approved"]);
export type DueFilter = "all" | "today" | "week" | "overdue" | "approval";
const dueLabels: Record<DueFilter, string> = { all: "Todas las fechas", today: "Vencen hoy", week: "Próximos 7 días (sin hoy)", overdue: "Vencidas sin resolver", approval: "Pendientes de aprobación" };

export function CommitmentList({ rows, today, initialDue = "all" }: { rows: CommitmentListItem[]; today: string; initialDue?: DueFilter }) {
  const [status, setStatus] = useState("all");
  const [due, setDue] = useState<DueFilter>(initialDue);

  const filtered = useMemo(() => {
    // Mismo criterio que el resumen del inicio: mañana hasta hoy + 6 días, ambos incluidos.
    const weekEnd = addDays(today, 7);
    return rows.filter(row => {
      if (status !== "all" && row.status !== status) return false;
      const date = row.committed_date;
      if (due === "today") return PAYABLE.has(row.status) && date === today;
      if (due === "week") return PAYABLE.has(row.status) && date != null && date > today && date < weekEnd;
      if (due === "overdue") return PAYABLE.has(row.status) && date != null && date < today;
      if (due === "approval") return row.status === "pending_approval";
      return true;
    });
  }, [rows, status, due, today]);

  const statusCounts = useMemo(() => rows.reduce<Record<string, number>>((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {}), [rows]);

  return <section className="panel table-panel" aria-labelledby="commitment-list-title">
    <div className="panel-heading"><div><span className="eyebrow">DETALLE</span><h2 id="commitment-list-title">Compromisos<span className="count-badge">{filtered.length}</span></h2></div></div>
    <div className="table-toolbar">
      <div className="segmented" role="group" aria-label="Filtrar por estado">
        <button type="button" aria-pressed={status === "all"} onClick={() => setStatus("all")}>Todas ({rows.length})</button>
        {Object.keys(commitmentStatusLabels).filter(key => statusCounts[key]).map(key => <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>{commitmentStatusLabels[key]} ({statusCounts[key]})</button>)}
      </div>
      <label className="select-field"><span className="sr-only">Filtrar por vencimiento</span>
        <select value={due} onChange={event => setDue(event.target.value as DueFilter)}>{(Object.keys(dueLabels) as DueFilter[]).map(key => <option key={key} value={key}>{dueLabels[key]}</option>)}</select>
      </label>
    </div>
    {filtered.length === 0 ? (rows.length === 0
      ? <div className="empty-state"><h3>Aún no hay promesas registradas</h3><p>Cuando el agente registre un compromiso, aparecerá aquí en tiempo real.</p></div>
      : <div className="empty-state"><h3>Sin promesas con estos filtros</h3><p>{due !== "all" ? `Filtro de fecha: ${dueLabels[due]}. ` : ""}{status !== "all" ? `Estado: ${commitmentStatusLabels[status] ?? status}.` : ""}</p><Button variant="outline" size="sm" onClick={() => { setDue("all"); setStatus("all"); }}>Ver todas las promesas</Button></div>) :
      <div className="table-scroll"><table>
        <thead><tr><th>Código</th><th>Cliente</th><th>Oferta</th><th>Fecha comprometida</th><th>Monto</th><th>Estado</th><th>Registrada</th><th><span className="sr-only">Conversación</span></th></tr></thead>
        <tbody>{filtered.map(row => {
          const overdue = PAYABLE.has(row.status) && row.committed_date != null && row.committed_date < today;
          return <tr key={row.id}>
            <td><strong className="amount">{row.receipt_code}</strong></td>
            <td><Link href={`/clientes/${row.customer_id}`} className="cell-title">{row.customer_name}</Link><small className="cell-secondary">{row.customer_code ?? "—"}</small></td>
            <td><span className="cell-title">{row.offer_name ?? commitmentTypeLabels[row.commitment_type] ?? row.offer_code}</span><small className="cell-secondary">{row.offer_code}{unresolvedPlaceholders(row.terms_text).length > 0 && <span className="flag-warn"> · condiciones incompletas</span>}</small></td>
            <td><span className={overdue ? "due-late" : ""}>{dateLabel(row.committed_date, true)}</span>{row.committed_date === today && OPEN.has(row.status) && <small className="cell-secondary">Vence hoy</small>}</td>
            <td className="amount">{money(row.amount)}</td>
            <td><CommitmentStatus status={row.status} /></td>
            <td>{dateTimeLabel(row.created_at)}</td>
            <td>{row.conversation_id && <Link className="row-arrow" href={`/conversaciones/${row.conversation_id}`} aria-label="Ver conversación de origen"><ArrowUpRight size={15} /></Link>}</td>
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
