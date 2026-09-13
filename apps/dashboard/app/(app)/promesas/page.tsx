import { CalendarClock, CircleCheck, Handshake, Wallet } from "lucide-react";
import { CommitmentList, type DueFilter } from "@/components/commitments/commitment-list";
import { LiveRefresh } from "@/components/live/live-refresh";
import { todayInElSalvador } from "@/lib/conversation";
import { money, percentage } from "@/lib/prevention";
import { getCommitmentList } from "@/lib/supabase/queries";

const PAYABLE = new Set(["pending", "approved"]);
const DUE_FILTERS: DueFilter[] = ["all", "today", "week", "overdue", "approval"];
const isDueFilter = (value: string | undefined): value is DueFilter => DUE_FILTERS.includes(value as DueFilter);

export default async function CommitmentsPage({ searchParams }: { searchParams: Promise<{ vence?: string }> }) {
  const { vence } = await searchParams;
  const commitments = await getCommitmentList();
  const today = todayInElSalvador();

  const createdToday = commitments.filter(row => todayInElSalvador(new Date(row.created_at)) === today);
  const open = commitments.filter(row => PAYABLE.has(row.status));
  const pendingApproval = commitments.filter(row => row.status === "pending_approval").length;
  const kept = commitments.filter(row => row.status === "kept").length;
  const broken = commitments.filter(row => row.status === "broken").length;
  const keptRate = kept + broken > 0 ? (kept / (kept + broken)) * 100 : null;
  const dueToday = open.filter(row => row.committed_date === today).length;

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">EFECTIVIDAD DE LA GESTIÓN</span>
        <h1>Promesas de pago<span className="heading-dot">.</span></h1>
        <p>Cada compromiso registrado por el agente, con su recibo, fecha acordada y si se cumplió.</p>
      </div>
      <LiveRefresh tables={["commitments", "payment_links"]} channelName="commitments-list" />
    </div>

    <div className="stats-grid">
      <div className="stat-card stat-highlight"><div className="stat-label">Registradas hoy<Handshake size={18} strokeWidth={1.6} /></div><strong className="stat-value">{createdToday.length}</strong><div className="stat-detail">{money(createdToday.reduce((sum, row) => sum + (row.amount ?? 0), 0))} comprometidos hoy</div><div className="stat-annotation"><span className="tiny-dot" />{commitments.length} EN TOTAL</div></div>
      <div className="stat-card accent-green"><div className="stat-label">Monto comprometido abierto<Wallet size={18} strokeWidth={1.6} /></div><strong className="stat-value">{money(open.reduce((sum, row) => sum + (row.amount ?? 0), 0))}</strong><div className="stat-detail">{open.length} promesas pendientes de pago</div><div className="stat-annotation"><span className="tiny-dot" />{pendingApproval} MÁS PENDIENTES DE APROBACIÓN</div></div>
      <div className="stat-card accent-purple"><div className="stat-label">Cumplimiento<CircleCheck size={18} strokeWidth={1.6} /></div><strong className="stat-value">{percentage(keptRate)}</strong><div className="stat-detail">{keptRate == null ? "Sin promesas resueltas todavía" : `${kept} cumplidas · ${broken} incumplidas`}</div><div className="stat-annotation"><span className="tiny-dot" />SOBRE PROMESAS YA RESUELTAS</div></div>
      <div className="stat-card accent-orange"><div className="stat-label">Vencen hoy<CalendarClock size={18} strokeWidth={1.6} /></div><strong className="stat-value">{dueToday}</strong><div className="stat-detail">Promesas por pagar con fecha de hoy</div><div className="stat-annotation"><span className="tiny-dot" />EL SALVADOR · GMT−6</div></div>
    </div>

    <CommitmentList key={vence ?? "all"} rows={commitments} today={today} initialDue={isDueFilter(vence) ? vence : "all"} />
  </div>;
}
