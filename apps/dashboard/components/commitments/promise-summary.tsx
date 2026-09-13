import Link from "next/link";
import { AlarmClock, ArrowUpRight, CalendarClock, CalendarDays, ClipboardCheck } from "lucide-react";
import { CommitmentStatus } from "@/components/commitments/commitment-card";
import { addDays } from "@/lib/conversation";
import { dateLabel, money } from "@/lib/prevention";
import type { CommitmentListItem } from "@/lib/types";

/** Promesas que ya son obligación de pago (las pendientes de aprobación van aparte: aún no son acuerdo vigente). */
const PAYABLE = new Set(["pending", "approved"]);

/** Resumen de promesas para el inicio: cada tarjeta abre exactamente la lista que explica su cifra. */
export function PromiseSummary({ rows, today }: { rows: CommitmentListItem[]; today: string }) {
  const weekEnd = addDays(today, 7);
  const payable = rows.filter(row => PAYABLE.has(row.status) && row.committed_date);
  const dueToday = payable.filter(row => row.committed_date === today);
  const upcoming = payable.filter(row => row.committed_date! > today && row.committed_date! < weekEnd);
  const overdue = payable.filter(row => row.committed_date! < today);
  const pendingApproval = rows.filter(row => row.status === "pending_approval");
  const sum = (list: CommitmentListItem[]) => money(list.reduce((total, row) => total + (row.amount ?? 0), 0));
  const attention = [...overdue, ...dueToday].sort((a, b) => a.committed_date!.localeCompare(b.committed_date!)).slice(0, 5);

  const primary = [
    { key: "today", label: "Vencen hoy", icon: CalendarClock, list: dueToday, tone: "accent-orange" },
    { key: "overdue", label: "Vencidas sin resolver", icon: AlarmClock, list: overdue, tone: "accent-pink" },
  ];
  const secondary = [
    { key: "week", label: "Próximos 7 días", icon: CalendarDays, list: upcoming },
    { key: "approval", label: "Pendientes de aprobación", icon: ClipboardCheck, list: pendingApproval },
  ];

  return <section className="panel promise-summary-panel" aria-labelledby="promise-summary-title">
    <div className="panel-heading">
      <div><span className="eyebrow">SEGUIMIENTO DE PROMESAS</span><h2 id="promise-summary-title">Promesas de pago</h2></div>
      <Link href="/promesas" className="text-link">Ver todas <ArrowUpRight size={13} /></Link>
    </div>
    <div className="promise-summary-layout">
      <div className="promise-tiles">{primary.map(tile => <Link key={tile.key} href={`/promesas?vence=${tile.key}`} className={`promise-tile ${tile.tone}`}>
        <span className="promise-tile-label"><tile.icon size={15} />{tile.label}</span>
        <strong>{tile.list.length}</strong>
        <small>{sum(tile.list)}</small>
      </Link>)}</div>
      <div className="promise-secondary">{secondary.map(item => <Link key={item.key} href={`/promesas?vence=${item.key}`} className={item.list.length ? "" : "promise-secondary-empty"}>
        <item.icon size={14} /><span>{item.label}</span><b>{item.list.length}</b>{item.list.length > 0 && <small>{sum(item.list)}</small>}
      </Link>)}</div>
    </div>
    {attention.length > 0
      ? <ul className="attention-list" aria-label="Promesas que requieren atención">{attention.map(row => <li key={row.id}>
          <Link href={`/clientes/${row.customer_id}`}><strong>{row.customer_name}</strong><small>{row.receipt_code} · {row.offer_name ?? row.offer_code}</small></Link>
          <span className={row.committed_date! < today ? "due-late" : ""}>{row.committed_date === today ? "Hoy" : dateLabel(row.committed_date, true)}</span>
          <span className="amount">{money(row.amount)}</span>
          <CommitmentStatus status={row.status} />
        </li>)}</ul>
      : <p className="muted-note">Ninguna promesa vence hoy ni está vencida sin resolver.</p>}
    <p className="info-caption">Montos acordados. Pagos simulados en la demo; “vencida sin resolver” puede significar que falta registrar el pago.</p>
  </section>;
}
