import { BadgeDollarSign, CircleGauge, Handshake, Info, MessageSquareText, PhoneCall, ShieldCheck, TrendingDown, Users } from "lucide-react";
import { CohortChart, DailyChart } from "@/components/impact/impact-charts";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { bandToGrade, channelLabels, cohortLabels, gradeColors, humanize, money, percentage, sentimentLabels } from "@/lib/prevention";
import { getImpactData } from "@/lib/supabase/queries";
import type { Grade } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D", "E"];
const cohortColors: Record<string, string> = { intervenido: "#00b398", grupo_control: "#9063cd", no_contactado: "#e8639f" };

function heat(rate: number | null) {
  if (rate == null) return undefined;
  return `color-mix(in oklab, #00b398 ${Math.round(12 + rate * 0.7)}%, #ffffff)`;
}

export default async function ImpactPage() {
  const data = await getImpactData();
  const { kpis } = data;

  const control = data.cohorts.find(row => row.cohort === "grupo_control");
  const intervened = data.cohorts.find(row => row.cohort === "intervenido");
  const gap = control?.late_rate_pct != null && intervened?.late_rate_pct != null ? control.late_rate_pct - intervened.late_rate_pct : null;

  const commitmentCodes = new Set(data.outcomes.filter(outcome => outcome.counts_as_commitment).map(outcome => outcome.code));
  const bandByCustomer = new Map(data.customers.map(row => [row.customer_id, row.risk_band]));
  const channels = [...new Set(data.conversations.map(row => row.channel))].sort();
  const graded = data.conversations.filter(row => row.outcome).map(row => {
    const band = bandByCustomer.get(row.customer_id);
    return { ...row, grade: band ? bandToGrade[band] : null };
  });
  const matrix = GRADES.map(grade => ({
    grade,
    cells: channels.map(channel => {
      const rows = graded.filter(row => row.channel === channel && row.grade === grade);
      const commitments = rows.filter(row => commitmentCodes.has(row.outcome!)).length;
      return { channel, total: rows.length, commitments, rate: rows.length ? Math.round((commitments / rows.length) * 100) : null };
    }),
  }));
  const insights = matrix.flatMap(row => row.cells.filter(cell => cell.total >= 3 && cell.rate != null).map(cell => ({ grade: row.grade, ...cell })))
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)).slice(0, 3);

  const stagesByPlaybook = data.stages.reduce<Record<string, typeof data.stages>>((groups, stage) => {
    (groups[stage.playbook_key] ??= []).push(stage);
    return groups;
  }, {});
  const offers = data.offers.filter(offer => offer.times_allowed > 0);
  const sentimentTotal = data.sentiment.reduce((sum, row) => sum + row.conversations, 0);

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">IMPACTO Y APRENDIZAJE</span>
        <h1>Impacto<span className="heading-dot">.</span></h1>
        <p>Compromisos, mora frente al grupo de control y qué combinación de grado y canal funciona mejor.</p>
      </div>
      <span className="demo-badge"><span /> Simulación ilustrativa · datos ficticios</span>
    </div>

    <nav className="section-nav" aria-label="Secciones de impacto">
      <a href="#resultados">Resultados</a><a href="#control">Grupo de control</a><a href="#aprendizaje">¿Qué funcionó?</a><a href="#canales">Canales</a><a href="#reglas">Reglas y ofertas</a><a href="#playbooks">Etapas</a><a href="#laboratorio">Laboratorio</a>
    </nav>

    <section id="resultados" className="stats-grid stats-grid-8">
      <div className="stat-card stat-highlight" title="Diferencia de tasa de mora entre el grupo de control y los clientes intervenidos, en puntos porcentuales. Datos ficticios."><div className="stat-label">Mora evitada vs control<TrendingDown size={18} strokeWidth={1.6} /></div><strong className="stat-value">{gap != null ? `${gap > 0 ? "−" : "+"}${Math.abs(gap).toFixed(1)} pp` : "—"}</strong><div className="stat-detail">Control {percentage(control?.late_rate_pct, 1)} · intervenidos {percentage(intervened?.late_rate_pct, 1)}</div><div className="stat-annotation"><span className="tiny-dot" />ESTIMACIÓN ILUSTRATIVA</div></div>
      <div className="stat-card accent-cyan"><div className="stat-label">Clientes contactados<Users size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.customers_contacted ?? "—"}</strong><div className="stat-detail">{kpis?.conversations_45d ?? 0} conversaciones en 45 días</div><div className="stat-annotation"><span className="tiny-dot" />RESPUESTA {percentage(kpis?.response_rate_pct)}</div></div>
      <div className="stat-card accent-green"><div className="stat-label">Compromisos<Handshake size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.commitments_45d ?? "—"}</strong><div className="stat-detail">Tasa de compromiso {percentage(kpis?.commitment_rate_pct)}</div><div className="stat-annotation"><span className="tiny-dot" />CUMPLIDOS {percentage(kpis?.commitment_kept_rate_pct)}</div></div>
      <div className="stat-card accent-purple"><div className="stat-label">Pagado vía links<BadgeDollarSign size={18} strokeWidth={1.6} /></div><strong className="stat-value">{money(kpis?.paid_via_links_usd)}</strong><div className="stat-detail">Pagos simulados desde WhatsApp</div><div className="stat-annotation"><span className="tiny-dot" />NO EQUIVALE A RECUPERACIÓN REAL</div></div>
      <div className="stat-card accent-orange"><div className="stat-label">Escalaciones<ShieldCheck size={18} strokeWidth={1.6} /></div><strong className="stat-value">{percentage(kpis?.escalation_rate_pct)}</strong><div className="stat-detail">{kpis?.escalations_open ?? 0} abiertas ahora</div><div className="stat-annotation"><span className="tiny-dot" />DERIVADAS A UNA PERSONA</div></div>
      <div className="stat-card accent-cyan"><div className="stat-label">P95 de respuesta en voz<CircleGauge size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.p95_voice_latency_ms != null ? `${(kpis.p95_voice_latency_ms / 1000).toFixed(2)} s` : "—"}</strong><div className="stat-detail">Promedio {kpis?.avg_latency_ms != null ? `${(kpis.avg_latency_ms / 1000).toFixed(2)} s` : "—"}</div><div className="stat-annotation"><span className="tiny-dot" />OBJETIVO &lt; 2 S</div></div>
      <div className="stat-card accent-pink"><div className="stat-label">Interrupciones en voz<PhoneCall size={18} strokeWidth={1.6} /></div><strong className="stat-value">{percentage(kpis?.voice_interruption_rate_pct)}</strong><div className="stat-detail">{kpis?.failed_interactions ?? 0} interacciones fallidas</div><div className="stat-annotation"><span className="tiny-dot" />TURNOS DEL AGENTE INTERRUMPIDOS</div></div>
      <div className="stat-card accent-green"><div className="stat-label">Costo por conversación<MessageSquareText size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.avg_cost_per_conversation_usd != null ? `$${kpis.avg_cost_per_conversation_usd.toFixed(4)}` : "—"}</strong><div className="stat-detail">Cierre positivo o neutral {percentage(kpis?.positive_or_neutral_end_pct)}</div><div className="stat-annotation"><span className="tiny-dot" />MODELOS + VOZ</div></div>
    </section>

    <div className="impact-grid">
      <section id="control" className="panel">
        <div className="panel-heading"><div><span className="eyebrow">CONTRAFACTUAL</span><h2>Tasa de mora por cohorte</h2></div></div>
        <CohortChart data={data.cohorts.map(row => ({ label: cohortLabels[row.cohort] ?? row.cohort, rate: row.late_rate_pct ?? 0, color: cohortColors[row.cohort] ?? "#b9bbb5" }))} />
        <div className="cohort-legend">{data.cohorts.map(row => <div key={row.cohort}><i style={{ background: cohortColors[row.cohort] ?? "#b9bbb5" }} /><span>{cohortLabels[row.cohort] ?? row.cohort}</span><strong>{row.late} de {row.installments}</strong></div>)}</div>
        <p className="info-caption"><Info size={15} /> Simulación ilustrativa: no atribuye causalidad ni una reducción de mora real.</p>
      </section>

      <section id="aprendizaje" className="panel">
        <div className="panel-heading"><div><span className="eyebrow">CLOSED LOOP</span><h2>¿Qué funcionó?</h2></div></div>
        <p className="panel-description">Tasa de compromiso por grado actual y canal. La misma señal alimentará la propensión de la intervención recomendada.</p>
        {channels.length === 0 ? <p className="muted-note">Aún no hay conversaciones con resultado.</p> :
          <div className="table-scroll"><table className="heatmap">
            <thead><tr><th>Grado</th>{channels.map(channel => <th key={channel}>{channelLabels[channel] ?? channel}</th>)}</tr></thead>
            <tbody>{matrix.map(row => <tr key={row.grade}><td><GradeBadge grade={row.grade} /></td>{row.cells.map(cell => <td key={cell.channel} className={cell.total < 3 ? "heat-low" : ""} style={{ background: cell.total >= 3 ? heat(cell.rate) : undefined }}>
              <strong>{cell.rate != null ? `${cell.rate}%` : "—"}</strong><small>{cell.commitments}/{cell.total}</small>
            </td>)}</tr>)}</tbody>
          </table></div>}
        {insights.length > 0 && <ul className="insight-list">{insights.map(item => <li key={`${item.grade}-${item.channel}`}><i style={{ background: gradeColors[item.grade] }} />Grado {item.grade} + {channelLabels[item.channel] ?? item.channel}: <strong>{item.rate}%</strong> <small>({item.commitments} de {item.total})</small></li>)}</ul>}
        <p className="info-caption"><Info size={15} /> Celdas con menos de 3 conversaciones se muestran atenuadas.</p>
      </section>
    </div>

    <section className="panel impact-section">
      <div className="panel-heading"><div><span className="eyebrow">TENDENCIA</span><h2>Actividad diaria</h2></div><div className="chart-legend"><span><i className="legend-square yellow" />Conversaciones</span><span><i className="legend-line" />Compromisos</span><span><i className="legend-line legend-line-pink" />Escalaciones</span></div></div>
      {data.daily.length ? <DailyChart data={data.daily} /> : <p className="muted-note">Sin actividad registrada.</p>}
    </section>

    <section id="canales" className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">CONECTAR MEJOR</span><h2>Rendimiento por canal</h2></div></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Canal</th><th>Conversaciones</th><th>Respuesta</th><th>Compromiso</th><th>Cumplimiento</th><th>Escalaciones</th><th>Duración prom.</th><th>Latencia prom.</th><th>Costo prom.</th></tr></thead>
        <tbody>{data.channels.map(row => <tr key={row.channel}>
          <td><strong className="amount">{channelLabels[row.channel] ?? row.channel}</strong></td><td>{row.conversations}</td>
          <td><Meter value={row.response_rate_pct} /></td><td><Meter value={row.commitment_rate_pct} color="#00b398" /></td><td><Meter value={row.kept_rate_pct} color="#9063cd" /></td>
          <td>{row.escalations}</td><td>{row.avg_duration_s != null ? `${Math.round(row.avg_duration_s / 60)} min ${row.avg_duration_s % 60}s` : "—"}</td>
          <td>{row.avg_latency_ms != null ? `${(row.avg_latency_ms / 1000).toFixed(2)} s` : "—"}</td><td>{row.avg_cost_usd != null ? `$${row.avg_cost_usd.toFixed(4)}` : "—"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <div id="reglas" className="equal-grid">
      <section className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">GOBERNANZA</span><h2>Por regla</h2></div></div>
        <div className="table-scroll"><table>
          <thead><tr><th>Regla</th><th>Conv.</th><th>Compromiso</th><th>Escalación</th><th>Δ riesgo</th></tr></thead>
          <tbody>{data.rules.map(row => <tr key={row.rule_key}><td><strong className="cell-title">{row.rule_name}</strong><small className="cell-secondary">{row.rule_key}</small></td><td>{row.conversations}</td><td><Meter value={row.commitment_rate_pct} color="#00b398" /></td><td>{percentage(row.escalation_rate_pct)}</td><td>{row.avg_risk_reduction != null ? `−${row.avg_risk_reduction.toFixed(1)}` : "—"}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">NEGOCIACIÓN</span><h2>Por oferta</h2></div></div>
        <div className="table-scroll"><table>
          <thead><tr><th>Oferta</th><th>Ofrecida</th><th>Aceptada</th><th>Cumplida</th><th>Monto</th></tr></thead>
          <tbody>{offers.map(row => <tr key={row.offer_code}><td><strong className="cell-title">{row.offer_name}</strong><small className="cell-secondary">{row.offer_code}</small></td><td>{row.times_allowed}</td><td>{row.times_accepted}</td><td>{percentage(row.kept_rate_pct)}</td><td className="amount">{money(row.amount_committed)}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>

    <div id="playbooks" className="equal-grid">
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">EMBUDO</span><h2>Etapas del playbook</h2></div></div>
        <div className="funnel-groups">{Object.entries(stagesByPlaybook).map(([playbook, stages]) => {
          const max = Math.max(1, ...stages.map(stage => stage.conversations_reached));
          return <div key={playbook} className="funnel-group"><h3 className="subheading">{humanize(playbook)}</h3>{stages.map(stage => <div key={stage.stage_key} className="funnel-stage">
            <span>{humanize(stage.stage_key)}</span>
            <div className="progress-track"><span style={{ width: `${(stage.conversations_reached / max) * 100}%` }} /></div>
            <strong>{stage.conversations_reached}</strong>
            <small className={stage.interruption_rate_pct ? "flag-warn" : ""}>{percentage(stage.interruption_rate_pct)} interr.</small>
          </div>)}</div>;
        })}</div>
      </section>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">EMPATÍA</span><h2>Cambio de sentimiento</h2></div></div>
        <ul className="sentiment-list">{data.sentiment.map(row => <li key={`${row.sentiment_start}-${row.sentiment_end}`}>
          <span className={`sentiment-tag sentiment-${(row.sentiment_start ?? "").toLowerCase()}`}>{humanize(row.sentiment_start, sentimentLabels)}</span>
          <span className="sentiment-arrow">→</span>
          <span className={`sentiment-tag sentiment-${(row.sentiment_end ?? "").toLowerCase()}`}>{humanize(row.sentiment_end, sentimentLabels)}</span>
          <div className="progress-track"><span style={{ width: `${sentimentTotal ? (row.conversations / sentimentTotal) * 100 : 0}%` }} /></div>
          <strong>{row.conversations}</strong>
        </li>)}</ul>
      </section>
    </div>

    <section id="laboratorio" className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">LABORATORIO</span><h2>Rendimiento por modelo</h2></div></div>
      <div className="table-scroll"><table>
        <thead><tr><th>Modelo</th><th>Rol</th><th>Conv.</th><th>Latencia prom.</th><th>P95</th><th>Costo / conv.</th><th>Compromiso</th><th>Interrupciones</th></tr></thead>
        <tbody>{data.models.map(row => <tr key={row.model_profile_key}>
          <td><strong className="cell-title">{row.display_name}</strong><small className="cell-secondary">{row.provider}{row.includes_synthetic_data ? " · incluye datos sintéticos" : ""}</small></td>
          <td><span className="action-tag">{humanize(row.role)}</span></td><td>{row.conversations}</td>
          <td>{row.avg_latency_ms != null ? `${row.avg_latency_ms} ms` : "—"}</td><td>{row.p95_latency_ms != null ? `${row.p95_latency_ms} ms` : "—"}</td>
          <td>{row.cost_per_conversation_usd != null ? `$${row.cost_per_conversation_usd.toFixed(5)}` : "—"}</td><td>{percentage(row.commitment_rate_pct)}</td><td>{row.avg_interruptions?.toFixed(2) ?? "—"}</td>
        </tr>)}</tbody>
      </table></div>
    </section>

    <p className="data-note"><span /> Cifras de demostración calculadas por las vistas de Supabase. La mora evitada es una comparación ilustrativa entre cohortes, no una medición causal.</p>
  </div>;
}

function Meter({ value, color = "#59cbe8" }: { value: number | null; color?: string }) {
  return <span className="meter"><span className="meter-track"><span style={{ width: `${Math.min(100, value ?? 0)}%`, background: color }} /></span><b>{percentage(value)}</b></span>;
}
