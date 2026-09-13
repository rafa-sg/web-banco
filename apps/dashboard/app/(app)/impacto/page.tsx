import { ChevronDown, CircleCheck, Handshake, Info, TrendingDown, Users } from "lucide-react";
import { ChannelChart, CohortChart, DailyChart, type ChannelRate } from "@/components/impact/impact-charts";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { bandToGrade, channelLabels, cohortLabels, humanize, money, percentage, sentimentLabels, signedLabel } from "@/lib/prevention";
import { bankResultCategory, resultCategory, todayInElSalvador } from "@/lib/conversation";
import { getActivePolicy, getImpactData, getPromiseKpiData } from "@/lib/supabase/queries";
import type { Grade, RiskBand } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D", "E"];
const DEFAULT_BANDS: Record<RiskBand, [number, number]> = { BAJO: [0, 24], MODERADO: [25, 49], PREVENTIVO: [50, 74], ALTO: [75, 89], CRITICO: [90, 100] };

// Paleta categórica validada (dataviz validate_palette.js, modo claro): morado · verde · naranja pasan separación CVD.
// Verde + rosa fallaba para deuteranopia, por eso "no contactados" usa naranja.
const CATEGORICAL = ["#9063cd", "#00b398", "#f2884b"];
const cohortColors: Record<string, string> = { grupo_control: CATEGORICAL[0], intervenido: CATEGORICAL[1], no_contactado: CATEGORICAL[2] };
const channelOrder = ["voice", "whatsapp", "email"];
const OPEN_COMMITMENT = new Set(["pending", "pending_approval", "approved"]);

function bandForScore(score: number | null, bands: Record<string, [number, number]> | null | undefined): RiskBand | null {
  if (score == null) return null;
  const entry = Object.entries(bands ?? DEFAULT_BANDS).find(([, [min, max]]) => score >= min && score <= max);
  return entry && entry[0] in bandToGrade ? entry[0] as RiskBand : null;
}

function heat(rate: number | null) {
  if (rate == null) return undefined;
  return `color-mix(in oklab, #00b398 ${Math.round(12 + rate * 0.7)}%, #ffffff)`;
}

export default async function ImpactPage() {
  const [data, promises, policy] = await Promise.all([getImpactData(), getPromiseKpiData(), getActivePolicy()]);
  const { kpis } = data;

  const control = data.cohorts.find(row => row.cohort === "grupo_control");
  const intervened = data.cohorts.find(row => row.cohort === "intervenido");
  const gap = control?.late_rate_pct != null && intervened?.late_rate_pct != null ? control.late_rate_pct - intervened.late_rate_pct : null;

  // ── Embudo de llamadas: qué cuenta como contacto y como compromiso sale de outcome_definitions ──
  const contactCodes = new Set(data.outcomes.filter(outcome => outcome.counts_as_contact).map(outcome => outcome.code));
  const commitmentCodes = new Set(data.outcomes.filter(outcome => outcome.counts_as_commitment).map(outcome => outcome.code));
  const calls = data.conversations.filter(row => row.channel === "voice" && row.outcome);
  const callIds = new Set(calls.map(row => row.id));
  const answered = calls.filter(row => contactCodes.has(row.outcome!)).length;
  const committed = calls.filter(row => commitmentCodes.has(row.outcome!)).length;
  const callCommitments = promises.commitments.filter(row => row.conversation_id && callIds.has(row.conversation_id));
  const kept = callCommitments.filter(row => row.status === "kept").length;
  const stillOpen = callCommitments.filter(row => OPEN_COMMITMENT.has(row.status)).length;
  const per100 = (value: number) => calls.length ? Math.round((value / calls.length) * 100) : 0;
  const funnel = [
    { label: "Llamadas realizadas", value: calls.length, note: null },
    { label: "Contestaron", value: answered, note: null },
    { label: "Llegaron a compromiso", value: committed, note: null },
    { label: "Cumplieron", value: kept, note: stillOpen ? `${stillOpen} promesas aún no llegan a su fecha` : null },
  ];

  const channels: ChannelRate[] = data.channels
    .filter(row => row.conversations > 0)
    .sort((a, b) => channelOrder.indexOf(a.channel) - channelOrder.indexOf(b.channel))
    .slice(0, CATEGORICAL.length)
    .map((row, index) => ({
      channel: row.channel, label: channelLabels[row.channel] ?? row.channel, color: CATEGORICAL[index], conversations: row.conversations,
      response: row.response_rate_pct != null ? Math.round(row.response_rate_pct) : null,
      commitment: row.commitment_rate_pct != null ? Math.round(row.commitment_rate_pct) : null,
      kept: row.kept_rate_pct != null ? Math.round(row.kept_rate_pct) : null,
    }));

  // ── Detalle para analistas ──
  const today = todayInElSalvador();
  const promisesToday = promises.commitments.filter(row => todayInElSalvador(new Date(row.created_at)) === today);
  const clearCalls = promises.voiceCalls.filter(row => {
    const category = "outcome" in row ? resultCategory(row.outcome, Boolean(row.commitment_id)) : bankResultCategory(row.bank_result);
    return category != null && category !== "no_contact";
  }).length;
  const amountCommitted = promises.commitments.filter(row => row.status !== "cancelled" && row.status !== "broken").reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const bandByCustomer = new Map(data.customers.map(row => [row.customer_id, row.risk_band]));
  const matrixChannels = [...new Set(data.conversations.map(row => row.channel))].sort();
  // Grado AL INICIAR la conversación (risk_before): un resultado histórico no cambia de fila si el riesgo del cliente cambió después.
  const graded = data.conversations.filter(row => row.outcome).map(row => {
    const band = bandForScore(row.risk_before, policy?.risk_bands) ?? bandByCustomer.get(row.customer_id) ?? null;
    return { ...row, grade: band ? bandToGrade[band] : null };
  });
  const matrix = GRADES.map(grade => ({
    grade,
    cells: matrixChannels.map(channel => {
      const rows = graded.filter(row => row.channel === channel && row.grade === grade);
      const commitments = rows.filter(row => commitmentCodes.has(row.outcome!)).length;
      return { channel, total: rows.length, commitments, rate: rows.length ? Math.round((commitments / rows.length) * 100) : null };
    }),
  }));
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
        <p>¿Funciona la prevención? Mora frente al grupo de control, embudo de llamadas, canales y tendencia.</p>
      </div>
      <span className="demo-badge"><span /> Simulación ilustrativa · datos ficticios</span>
    </div>

    <section className="stats-grid" aria-label="Indicadores principales">
      <div className="stat-card stat-highlight"><div className="stat-label">Mora evitada vs control (observada)<TrendingDown size={18} strokeWidth={1.6} /></div><strong className="stat-value">{gap != null ? `${gap > 0 ? "−" : "+"}${Math.abs(gap).toFixed(1)} pp` : "—"}</strong><div className="stat-detail">Control {percentage(control?.late_rate_pct, 1)} · intervenidos {percentage(intervened?.late_rate_pct, 1)}</div><div className="stat-annotation"><span className="tiny-dot" />DIFERENCIA ENTRE COHORTES · NO CAUSAL</div></div>
      <div className="stat-card accent-cyan"><div className="stat-label">Clientes contactados<Users size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.customers_contacted ?? "—"}</strong><div className="stat-detail">{kpis?.conversations_45d ?? 0} conversaciones en 45 días</div><div className="stat-annotation"><span className="tiny-dot" />RESPUESTA {percentage(kpis?.response_rate_pct)}</div></div>
      <div className="stat-card accent-green"><div className="stat-label">Compromisos · 45 días<Handshake size={18} strokeWidth={1.6} /></div><strong className="stat-value">{kpis?.commitments_45d ?? "—"}</strong><div className="stat-detail">Tasa de compromiso {percentage(kpis?.commitment_rate_pct)}</div><div className="stat-annotation"><span className="tiny-dot" />{money(amountCommitted)} COMPROMETIDOS</div></div>
      <div className="stat-card accent-purple"><div className="stat-label">Cumplimiento de promesas<CircleCheck size={18} strokeWidth={1.6} /></div><strong className="stat-value">{percentage(kpis?.commitment_kept_rate_pct)}</strong><div className="stat-detail">Cumplidas sobre promesas ya resueltas</div><div className="stat-annotation"><span className="tiny-dot" />PAGOS SIMULADOS</div></div>
    </section>

    <div className="impact-grid">
      <section className="panel" aria-labelledby="funnel-title">
        <div className="panel-heading"><div><span className="eyebrow">DE CADA 100 LLAMADAS</span><h2 id="funnel-title">Embudo de llamadas</h2></div></div>
        {calls.length === 0 ? <p className="muted-note">Aún no hay llamadas terminadas.</p> :
          <ol className="conversion-funnel">{funnel.map((step, index) => {
            const previous = index > 0 ? funnel[index - 1].value : null;
            return <li key={step.label} title={`${step.value} de ${calls.length} llamadas`}>
              <div className="conversion-funnel-head"><span>{step.label}</span><strong>{per100(step.value)}<small> de 100</small></strong></div>
              <div className="conversion-funnel-track"><span style={{ width: `${Math.max(per100(step.value), step.value ? 2 : 0)}%` }} /></div>
              <small className="conversion-funnel-note">{step.value} llamadas{previous ? ` · ${Math.round((step.value / previous) * 100)}% del paso anterior` : ""}{step.note ? ` · ${step.note}` : ""}</small>
            </li>;
          })}</ol>}
        <p className="info-caption"><Info size={15} /> “Contestaron” y “compromiso” según las definiciones de resultado configuradas. Historial completo de llamadas de voz.</p>
      </section>

      <section className="panel" aria-labelledby="cohort-title">
        <div className="panel-heading"><div><span className="eyebrow">¿FUNCIONA LA PREVENCIÓN?</span><h2 id="cohort-title">Tasa de mora por cohorte</h2></div></div>
        <CohortChart data={data.cohorts.map(row => ({ label: cohortLabels[row.cohort] ?? row.cohort, rate: row.late_rate_pct ?? 0, color: cohortColors[row.cohort] ?? "#b9bbb5" }))} />
        <div className="cohort-legend">{data.cohorts.map(row => <div key={row.cohort}><i style={{ background: cohortColors[row.cohort] ?? "#b9bbb5" }} /><span>{cohortLabels[row.cohort] ?? row.cohort}</span><strong>{row.late} de {row.installments} cuotas</strong></div>)}</div>
        <p className="info-caption"><Info size={15} /> El grupo de control no se contacta a propósito. Comparación ilustrativa, no una medición causal.</p>
      </section>
    </div>

    <div className="impact-grid">
      <section className="panel" aria-labelledby="channels-title">
        <div className="panel-heading"><div><span className="eyebrow">¿QUÉ CANAL CONVIENE?</span><h2 id="channels-title">Canales comparados</h2></div>
          <div className="chart-legend">{channels.map(channel => <span key={channel.channel}><i className="legend-square" style={{ background: channel.color }} />{channel.label} <small>({channel.conversations})</small></span>)}</div>
        </div>
        {channels.length === 0 ? <p className="muted-note">Sin conversaciones por canal.</p> : <ChannelChart channels={channels} />}
        <p className="info-caption"><Info size={15} /> Entre paréntesis, conversaciones por canal. Con pocas conversaciones, los porcentajes cambian mucho.</p>
      </section>

      <section className="panel" aria-labelledby="trend-title">
        <div className="panel-heading"><div><span className="eyebrow">TENDENCIA</span><h2 id="trend-title">Actividad diaria</h2></div><div className="chart-legend"><span><i className="legend-square yellow" />Conversaciones</span><span><i className="legend-line" />Compromisos</span><span><i className="legend-line legend-line-pink" />Escalaciones</span></div></div>
        {data.daily.length ? <DailyChart data={data.daily} /> : <p className="muted-note">Sin actividad registrada.</p>}
      </section>
    </div>

    <details className="analyst-detail">
      <summary><ChevronDown size={16} /> Detalle para analistas <small>reglas, ofertas, etapas, sentimiento, latencia y modelos</small></summary>

      <div className="analyst-stats">
        <div><span>P95 de respuesta en voz</span><strong>{kpis?.p95_voice_latency_ms != null ? `${(kpis.p95_voice_latency_ms / 1000).toFixed(2)} s` : "—"}</strong><small>Objetivo &lt; 2 s</small></div>
        <div><span>Interrupciones en voz</span><strong>{percentage(kpis?.voice_interruption_rate_pct)}</strong><small>{kpis?.failed_interactions ?? 0} interacciones fallidas</small></div>
        <div><span>Costo por conversación</span><strong>{kpis?.avg_cost_per_conversation_usd != null ? `US$${kpis.avg_cost_per_conversation_usd.toFixed(4)}` : "—"}</strong><small>Modelos + voz</small></div>
        <div><span>Escalaciones</span><strong>{percentage(kpis?.escalation_rate_pct)}</strong><small>{kpis?.escalations_open ?? 0} abiertas</small></div>
        <div><span>Promesas registradas hoy</span><strong>{promisesToday.length}</strong><small>{promises.commitments.length} históricas</small></div>
        <div><span>Llamadas con resultado claro</span><strong>{promises.voiceCalls.length ? percentage((clearCalls / promises.voiceCalls.length) * 100) : "—"}</strong><small>{clearCalls} de {promises.voiceCalls.length}</small></div>
      </div>

      <section className="panel analyst-block">
        <div className="panel-heading"><div><span className="eyebrow">GRADO × CANAL</span><h2>¿Qué combinación funcionó?</h2></div></div>
        <p className="panel-description">Tasa de compromiso por grado al iniciar la conversación y canal. Celdas con menos de 3 conversaciones, atenuadas.</p>
        {matrixChannels.length === 0 ? <p className="muted-note">Aún no hay conversaciones con resultado.</p> :
          <div className="table-scroll"><table className="heatmap">
            <thead><tr><th>Grado</th>{matrixChannels.map(channel => <th key={channel}>{channelLabels[channel] ?? channel}</th>)}</tr></thead>
            <tbody>{matrix.map(row => <tr key={row.grade}><td><GradeBadge grade={row.grade} /></td>{row.cells.map(cell => <td key={cell.channel} className={cell.total < 3 ? "heat-low" : ""} title={cell.total < 3 ? "Muestra insuficiente (menos de 3 conversaciones)" : undefined} style={{ background: cell.total >= 3 ? heat(cell.rate) : undefined }}>
              <strong>{cell.rate != null ? `${cell.rate}%` : "—"}</strong><small>{cell.commitments}/{cell.total}</small>
            </td>)}</tr>)}</tbody>
          </table></div>}
      </section>

      <div className="equal-grid">
        <section className="panel table-panel">
          <div className="panel-heading"><div><span className="eyebrow">GOBERNANZA</span><h2>Por regla</h2></div></div>
          <div className="table-scroll"><table>
            <thead><tr><th>Regla</th><th>Conv.</th><th>Compromiso</th><th>Escalación</th><th>Δ riesgo</th></tr></thead>
            <tbody>{data.rules.map(row => <tr key={row.rule_key}><td><strong className="cell-title" title={row.rule_key}>{row.rule_name}</strong></td><td>{row.conversations}</td><td><Meter value={row.commitment_rate_pct} color="#00b398" /></td><td>{percentage(row.escalation_rate_pct)}</td><td title="Variación promedio del puntaje de riesgo (negativo = bajó)">{row.avg_risk_reduction != null ? signedLabel(-row.avg_risk_reduction) : "—"}</td></tr>)}</tbody>
          </table></div>
        </section>
        <section className="panel table-panel">
          <div className="panel-heading"><div><span className="eyebrow">NEGOCIACIÓN</span><h2>Por oferta</h2></div></div>
          <div className="table-scroll"><table>
            <thead><tr><th>Oferta</th><th>Ofrecida</th><th>Aceptada</th><th>Cumplida</th><th>Monto</th></tr></thead>
            <tbody>{offers.map(row => <tr key={row.offer_code}><td><strong className="cell-title" title={row.offer_code}>{row.offer_name}</strong></td><td>{row.times_allowed}</td><td>{row.times_accepted}</td><td>{percentage(row.kept_rate_pct)}</td><td className="amount">{money(row.amount_committed)}</td></tr>)}</tbody>
          </table></div>
        </section>
      </div>

      <div className="equal-grid">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">RECORRIDO</span><h2>Etapas visitadas del playbook</h2></div></div>
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
          <p className="info-caption"><Info size={15} /> Sentimiento estimado por el modelo, no satisfacción verificada.</p>
        </section>
      </div>

      <section className="panel table-panel">
        <div className="panel-heading"><div><span className="eyebrow">LABORATORIO</span><h2>Rendimiento por modelo</h2></div></div>
        <div className="table-scroll"><table>
          <thead><tr><th>Modelo</th><th>Rol</th><th>Conv.</th><th>Latencia prom.</th><th>P95</th><th>Costo / conv.</th><th>Compromiso</th><th>Interrupciones</th></tr></thead>
          <tbody>{data.models.map(row => <tr key={row.model_profile_key}>
            <td><strong className="cell-title">{row.display_name}</strong><small className="cell-secondary">{row.provider}{row.includes_synthetic_data ? " · incluye datos sintéticos" : ""}</small></td>
            <td><span className="action-tag">{humanize(row.role)}</span></td><td>{row.conversations}</td>
            <td>{row.avg_latency_ms != null ? `${row.avg_latency_ms} ms` : "—"}</td><td>{row.p95_latency_ms != null ? `${row.p95_latency_ms} ms` : "—"}</td>
            <td>{row.cost_per_conversation_usd != null ? `US$${row.cost_per_conversation_usd.toFixed(5)}` : "—"}</td><td>{percentage(row.commitment_rate_pct)}</td><td>{row.avg_interruptions?.toFixed(2) ?? "—"}</td>
          </tr>)}</tbody>
        </table></div>
      </section>
    </details>

    <p className="data-note"><span /> Cifras de demostración calculadas por las vistas de Supabase. La mora evitada es una comparación ilustrativa entre cohortes, no una medición causal.</p>
  </div>;
}

function Meter({ value, color = "#59cbe8" }: { value: number | null; color?: string }) {
  return <span className="meter"><span className="meter-track"><span style={{ width: `${Math.min(100, value ?? 0)}%`, background: color }} /></span><b>{percentage(value)}</b></span>;
}
