import { Ban, FlaskConical, ShieldAlert, Wallet } from "lucide-react";
import { PriorityTable } from "@/components/prevention/priority-table";
import { RunButton } from "@/components/prevention/run-button";
import { bandToGrade, money } from "@/lib/prevention";
import { getCustomerOverview, getKpis } from "@/lib/supabase/queries";
import type { Grade } from "@/lib/types";

const AT_RISK = new Set(["PREVENTIVO", "ALTO", "CRITICO"]);

export default async function PreventionCenterPage() {
  const [kpis, customers] = await Promise.all([getKpis(), getCustomerOverview()]);

  const atRisk = customers.filter(row => row.risk_band && AT_RISK.has(row.risk_band) && !row.is_control_group);
  const blocked = atRisk.filter(row => row.opted_out || !row.contact_enabled);
  const actionable = atRisk.filter(row => !row.opted_out && row.contact_enabled);
  const amountAtRisk = actionable.reduce((sum, row) => sum + (row.amount_due ?? 0), 0);
  const controlSize = kpis?.control_group_size ?? customers.filter(row => row.is_control_group).length;

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

    <div className="stats-grid">
      <div className="stat-card accent-pink"><div className="stat-label">Requieren intervención<ShieldAlert size={18} strokeWidth={1.6} /></div><strong className="stat-value">{actionable.length}</strong><div className="stat-detail">Grados C, D y E contactables</div><div className="stat-annotation"><span className="tiny-dot" />{customers.length} CLIENTES EN CARTERA</div></div>
      <div className="stat-card stat-highlight"><div className="stat-label">Pagos potencialmente prevenibles<Wallet size={18} strokeWidth={1.6} /></div><strong className="stat-value">{money(amountAtRisk)}</strong><div className="stat-detail">Suma de cuotas próximas en riesgo</div><div className="stat-annotation"><span className="tiny-dot" />ESTIMACIÓN · DATOS FICTICIOS</div></div>
      <div className="stat-card accent-purple"><div className="stat-label">Grupo de control<FlaskConical size={18} strokeWidth={1.6} /></div><strong className="stat-value">{controlSize}</strong><div className="stat-detail">No se contactan; sirven para medir</div><div className="stat-annotation"><span className="tiny-dot" />CONTRAFACTUAL</div></div>
      <div className="stat-card accent-orange"><div className="stat-label">Bloqueados por regla<Ban size={18} strokeWidth={1.6} /></div><strong className="stat-value">{blocked.length}</strong><div className="stat-detail">Opt-out o contacto deshabilitado</div><div className="stat-annotation"><span className="tiny-dot" />LAS REGLAS PROTEGEN AL CLIENTE</div></div>
    </div>

    {customers.length === 0
      ? <section className="panel empty-state"><h3>Aún no hay clientes cargados</h3><p>La base de Supabase está vacía. En cuanto el equipo siembre los datos de demostración, la cola priorizada aparecerá aquí.</p></section>
      : <PriorityTable rows={customers} gradeCounts={gradeCounts} />}

    <p className="data-note"><span /> Grado A–E derivado de la banda de riesgo mientras se integra el motor de prevención. Riesgo 0–100 no es un porcentaje. Datos ficticios.</p>
  </div>;
}
