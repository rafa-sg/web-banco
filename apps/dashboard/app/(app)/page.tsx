import { Ban, ChevronDown, FlaskConical, ShieldAlert, Wallet } from "lucide-react";
import { PromiseSummary } from "@/components/commitments/promise-summary";
import { PriorityTable } from "@/components/prevention/priority-table";
import { RunButton } from "@/components/prevention/run-button";
import { todayInElSalvador } from "@/lib/conversation";
import { bandToGrade, money } from "@/lib/prevention";
import { getActivePolicy, getCommitmentList, getCustomerOverview, getKpis, getSignalDefinitions } from "@/lib/supabase/queries";
import type { Grade } from "@/lib/types";

const AT_RISK = new Set(["PREVENTIVO", "ALTO", "CRITICO"]);

export default async function PreventionCenterPage() {
  const [kpis, customers, commitments, signals, policy] = await Promise.all([getKpis(), getCustomerOverview(), getCommitmentList(), getSignalDefinitions(), getActivePolicy()]);

  const atRisk = customers.filter(row => row.risk_band && AT_RISK.has(row.risk_band) && !row.is_control_group);
  const blocked = atRisk.filter(row => row.opted_out || !row.contact_enabled);
  const actionable = atRisk.filter(row => !row.opted_out && row.contact_enabled);
  const amountAtRisk = actionable.reduce((sum, row) => sum + (row.amount_due ?? 0), 0);
  const controlSize = kpis?.control_group_size ?? customers.filter(row => row.is_control_group).length;
  const signalLabels = Object.fromEntries(signals.map(signal => [signal.code, signal.label]));

  const gradeCounts = (["A", "B", "C", "D", "E"] as Grade[]).map(grade => ({
    grade,
    count: customers.filter(row => row.risk_band && bandToGrade[row.risk_band] === grade).length,
  }));

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">¿A QUIÉN ATENDER Y QUÉ HACER?</span>
        <h1>Centro de prevención<span className="heading-dot">.</span></h1>
        <p>Quién necesita ayuda, por qué y cuál es la mejor intervención antes del vencimiento.</p>
      </div>
      <RunButton />
    </div>

    <div className="stats-grid stats-grid-2">
      <div className="stat-card accent-pink"><div className="stat-label">Requieren intervención<ShieldAlert size={18} strokeWidth={1.6} /></div><strong className="stat-value">{actionable.length}</strong><div className="stat-detail">Clientes C, D y E que se pueden contactar hoy</div><div className="stat-annotation"><span className="tiny-dot" />DE {customers.length} CLIENTES EN CARTERA</div></div>
      <div className="stat-card stat-highlight"><div className="stat-label">Cuotas próximas en riesgo<Wallet size={18} strokeWidth={1.6} /></div><strong className="stat-value">{money(amountAtRisk)}</strong><div className="stat-detail">Monto exigible de esos {actionable.length} clientes</div><div className="stat-annotation"><span className="tiny-dot" />NO ES PÉRDIDA ESPERADA · DATOS FICTICIOS</div></div>
    </div>

    <details className="why-not-all">
      <summary><ChevronDown size={15} /> ¿Por qué no se contacta a todos? <span>{controlSize} en grupo de control · {blocked.length} bloqueados por regla</span></summary>
      <div className="why-not-all-body">
        <div><FlaskConical size={17} /><p><b>{controlSize} en grupo de control.</b> No se contactan a propósito: son la comparación que permite medir cuánta mora evita la prevención.</p></div>
        <div><Ban size={17} /><p><b>{blocked.length} clientes C–E bloqueados por regla.</b> Pidieron no ser contactados o tienen el contacto deshabilitado. Las reglas protegen al cliente.</p></div>
      </div>
    </details>

    <PromiseSummary rows={commitments} today={todayInElSalvador()} />

    {customers.length === 0
      ? <section className="panel empty-state"><h3>Aún no hay clientes cargados</h3><p>La base de Supabase está vacía. En cuanto el equipo siembre los datos de demostración, la cola priorizada aparecerá aquí.</p></section>
      : <PriorityTable rows={customers} gradeCounts={gradeCounts} signalLabels={signalLabels} channelByGrade={policy?.channel_by_grade ?? null} />}

    <p className="data-note"><span /> Tarjetas sobre toda la cartera actual. Grados A–B se contactan por correo y C–E por llamada, según la política activa. Riesgo 0–100 no es un porcentaje. Datos ficticios.</p>
  </div>;
}
