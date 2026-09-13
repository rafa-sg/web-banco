"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, CalendarDays, Check, CircleCheck, FileCheck2, Headphones, Info, MessageSquareText, ShieldCheck, Users, Wallet, X } from "lucide-react";
import { useDemo } from "@/components/demo-provider";
import { ActivityChart, ChannelPerformance, RiskDistribution } from "@/components/charts";
import { CustomerTable } from "@/components/customer-table";
import { Button } from "@/components/ui/button";
import { bandLabels, channelLabels, dateLabel, money, outcomeLabels, percentage, policyPreview, selectCustomers, summarize, type ChannelFilter, type Customer } from "@/lib/demo-data";

export type Section = "overview" | "riesgo" | "conversaciones" | "compromisos" | "analitica" | "escalaciones" | "politicas";
const titles: Record<Section, { eyebrow: string; title: string; description: string }> = {
  overview: { eyebrow: "UNA BANCA MÁS CERCANA", title: "Resumen de la gestión", description: "Anticipamos el riesgo. Acompañamos a las personas." },
  riesgo: { eyebrow: "PREVENIR EMPIEZA POR COMPRENDER", title: "Atención preventiva", description: "Una vista clara de quién necesita acompañamiento y por qué." },
  conversaciones: { eyebrow: "CADA CONVERSACIÓN CUENTA", title: "Conversaciones", description: "WhatsApp y voz, con el contexto completo de cada gestión." },
  compromisos: { eyebrow: "DEL ACUERDO A LA ACCIÓN", title: "Compromisos de pago", description: "Da seguimiento a los acuerdos y a su cumplimiento." },
  analitica: { eyebrow: "DATOS QUE NOS AYUDAN A MEJORAR", title: "Resultados e impacto", description: "Entiende la gestión, la efectividad de los canales y sus límites." },
  escalaciones: { eyebrow: "LAS PERSONAS, PRIMERO", title: "Atención humana", description: "Casos que necesitan la experiencia y el criterio de nuestro equipo." },
  politicas: { eyebrow: "CONFIANZA EN CADA DECISIÓN", title: "Políticas del agente", description: "Las reglas que guían un acompañamiento preventivo y respetuoso." },
};

function StatCards({ rows }: { rows: Customer[] }) {
  const metrics = summarize(rows);
  const stats = [
    { label: "Clientes en riesgo", value: String(metrics.atRisk.length).padStart(2, "0"), icon: Users, detail: `${percentage(metrics.atRisk.length, rows.length)}% de ${rows.length} clientes en cartera`, annotation: "PREVENTIVO O SUPERIOR", href: "/riesgo", style: "" },
    { label: "Intervenciones preventivas", value: String(metrics.interventions.length).padStart(2, "0"), icon: MessageSquareText, detail: `${metrics.interventions.length} de ${metrics.atRisk.length} clientes en riesgo`, annotation: `${percentage(metrics.interventions.length, metrics.atRisk.length)}% DE COBERTURA`, href: "/conversaciones", style: "" },
    { label: "Compromisos obtenidos", value: String(metrics.commitments.length).padStart(2, "0"), icon: FileCheck2, detail: `${metrics.commitments.length} de ${metrics.completed.length} conversaciones completadas`, annotation: `${percentage(metrics.commitments.length, metrics.completed.length)}% DE CONVERSIÓN`, href: "/compromisos", style: "" },
    { label: "Monto comprometido", value: money(metrics.commitments.reduce((sum, customer) => sum + customer.installmentCents, 0)), icon: Wallet, detail: "Acuerdos registrados · no equivale a pagos", annotation: "OPORTUNIDADES DE RECUPERACIÓN", href: "/compromisos", style: "stat-highlight" },
  ];
  return <div className="stats-grid">{stats.map(stat => <Link key={stat.label} href={stat.href} className={`stat-card ${stat.style}`}><div className="stat-label">{stat.label}<stat.icon size={18} strokeWidth={1.6} /></div><strong className="stat-value">{stat.value}</strong><div className="stat-detail">{stat.detail}</div><div className="stat-annotation">{stat.style ? <ArrowUpRight size={12} /> : <span className="tiny-dot" />}{stat.annotation}</div></Link>)}</div>;
}

function FocusBanner({ rows }: { rows: Customer[] }) {
  const { atRisk } = summarize(rows);
  const count = atRisk.filter(customer => !customer.isControl && (customer.band === "ALTO" || customer.band === "CRITICO")).length;
  return <section className="focus-banner"><div className="focus-mark"><ShieldCheck size={25} strokeWidth={1.5} /></div><div><strong>Estar a tiempo hace la diferencia.</strong><p>{count} clientes de prioridad alta o crítica están fuera de la cohorte de control.</p></div><Link href="/riesgo">Revisar atención preventiva <ArrowRight size={17} /></Link></section>;
}

function GovernanceSummary({ rows }: { rows: Customer[] }) {
  const metrics = summarize(rows);
  return <section className="panel governance-panel"><div className="panel-heading"><div><span className="eyebrow">UN AGENTE CON LÍMITES CLAROS</span><h2>Gestión responsable</h2></div><ShieldCheck size={20} /></div><div className="governance-item"><span><Headphones size={16} /> Derivados a una persona</span><strong>{metrics.escalations.length}</strong></div><div className="governance-item"><span><Users size={16} /> Control sin contacto</span><strong>{rows.filter(customer => customer.isControl).length}</strong></div><div className="governance-item"><span><FileCheck2 size={16} /> Política de referencia</span><strong>v1</strong></div><Link href="/politicas" className="text-link">Consultar las políticas <ArrowUpRight size={15} /></Link></section>;
}

function Results({ rows }: { rows: Customer[] }) {
  const metrics = summarize(rows);
  const funnel = [
    { label: "Clientes con intervención", value: metrics.conversations.length, denominator: rows.filter(customer => !customer.isControl).length, basis: "clientes fuera del control" },
    { label: "Conversaciones completadas", value: metrics.completed.length, denominator: metrics.conversations.length, basis: "conversaciones iniciadas" },
    { label: "Compromisos obtenidos", value: metrics.commitments.length, denominator: metrics.completed.length, basis: "conversaciones completadas" },
    { label: "Compromisos cumplidos", value: metrics.kept.length, denominator: metrics.commitments.length, basis: "compromisos" },
  ];
  return <><div className="charts-grid"><ActivityChart rows={rows} /><ChannelPerformance rows={rows} /></div><div className="equal-grid"><section className="panel funnel-panel"><div className="panel-heading"><div><span className="eyebrow">DE PRINCIPIO A FIN</span><h2>Embudo de la gestión</h2></div></div>{funnel.map((item, index) => <div className="funnel-row" key={item.label}><div><span><small>0{index + 1}</small>{item.label}</span><strong>{item.value}</strong></div><div className="progress-track"><span style={{ width: `${percentage(item.value, rows.length)}%`, opacity: 1 - index * .13 }} /></div><p>{item.value} / {item.denominator} {item.basis} · {percentage(item.value, item.denominator)}%</p></div>)}</section><section className="panel impact-panel"><span className="eyebrow">MEDIR EL IMPACTO REAL</span><h2>Mora evitada</h2><div className="pending-measurement">Por medir<span>Comparación entre cohortes</span></div><p>Los acuerdos describen la gestión. Para medir mora evitada necesitamos observar los pagos de clientes intervenidos y de una cohorte de control durante el mismo periodo.</p><div className="impact-cohorts"><div><strong>{metrics.interventions.length}</strong><span>Intervenidos en riesgo</span></div><div><strong>{rows.filter(row => row.isControl).length}</strong><span>Control sin contacto</span></div></div><span className="info-caption"><Info size={15} /> Esta demo no atribuye una reducción de mora real.</span></section></div></>;
}

function PolicyView() {
  return <><div className="policy-banner"><div className="policy-icon"><ShieldCheck size={24} /></div><div><strong>Política de contacto preventivo</strong><p>Referencia de CLAUDE.md · Versión 1 · America/El_Salvador</p></div><span className="neutral-badge">Solo lectura · Demo</span></div><div className="policy-grid">{policyPreview.map(section => <section className="panel policy-card" key={section.number}><span className="policy-number">{section.number}</span><h2>{section.title}</h2><p>{section.description}</p><dl>{section.rules.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>)}</div><section className="policy-principle"><ShieldCheck size={20} /><div><h2>La IA decide cómo conversar. Las reglas determinan qué puede ofrecer.</h2><p>El asistente se identifica como automatizado, trata al cliente de usted y no confirma acuerdos sin un registro exitoso. Una solicitud de atención humana detiene la automatización.</p></div></section><p className="data-note">Reglas ficticias para el hackathon, tomadas de la especificación del proyecto. No constituyen políticas aprobadas por Bancoagrícola.</p></>;
}

export function Dashboard({ section = "overview" }: { section?: Section }) {
  const { reference, period, setPeriod, channel, setChannel } = useDemo();
  const [notice, setNotice] = useState("");
  const rows = selectCustomers(period, channel);
  const metrics = summarize(rows);
  const copy = titles[section];
  const tableRows = section === "conversaciones" ? metrics.conversations : section === "compromisos" ? metrics.commitments : section === "escalaciones" ? metrics.escalations : metrics.atRisk;

  function exportReport() {
    const exportRows = section === "overview" || section === "analitica" ? rows : tableRows;
    const cells: (string | number)[][] = [
      ["Bancoagrícola · Reporte de demostración · Datos ficticios"],
      ["Vista", copy.title], ["Periodo", `Últimos ${period} días`], ["Fecha de referencia", dateLabel(reference, 0, true)], ["Canal", channel === "all" ? "Todos" : channelLabels[channel]],
      [], ["ID", "Cliente ficticio", "Producto", "Prioridad", "Score demo", "Cuota USD", "Saldo USD", "Canal preferido", "Cohorte de control", "Contacto realizado", "Resultado", "Pago de compromiso registrado"],
      ...exportRows.map(row => [row.id, row.name, row.product, bandLabels[row.band], row.score, (row.installmentCents / 100).toFixed(2), (row.balanceCents / 100).toFixed(2), channelLabels[row.channel], row.isControl ? "Sí" : "No", row.contacted ? "Sí" : "No", row.contacted ? outcomeLabels[row.outcome] : "Sin contacto", row.contacted && ["PAYMENT_COMMITMENT", "ALTERNATIVE_DATE"].includes(row.outcome) && row.commitmentKept ? "Sí" : "No"]),
    ];
    const csv = "\uFEFF" + cells.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `bancoagricola-demo-${section}-${period}d.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    setNotice(`Reporte exportado con ${exportRows.length} perfiles ficticios y los filtros actuales.`);
  }

  return <div className="page-enter"><div className="page-heading"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}<span className="heading-dot">.</span></h1><p>{copy.description}</p></div>{section !== "politicas" && <Button onClick={exportReport} variant="outline"><ArrowDownToLine size={16} /> Exportar reporte</Button>}</div>
    {section !== "politicas" && <div className="filter-bar"><div className="filter-period"><CalendarDays size={16} /><span>Periodo de análisis</span><div className="segmented">{[7, 30, 90].map(days => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)}>{days} días</button>)}</div></div><div className="filter-right"><label className="channel-select"><span className="sr-only">Canal de atención</span><select value={channel} onChange={event => setChannel(event.target.value as ChannelFilter)}><option value="all">Todos los canales</option><option value="whatsapp">WhatsApp</option><option value="voice">Voz</option></select></label><span className="data-status"><span /> {rows.length} perfiles ficticios</span></div></div>}
    {notice && <div className="notice" role="status"><CircleCheck size={17} />{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {section === "politicas" ? <PolicyView /> : <>
      {(section === "overview" || section === "analitica") && <StatCards rows={rows} />}
      {section === "overview" && <><FocusBanner rows={rows} /><div className="charts-grid"><ActivityChart rows={rows} /><RiskDistribution rows={rows} /></div><CustomerTable rows={metrics.atRisk.filter(row => !row.isControl)} compact /><div className="equal-grid"><ChannelPerformance rows={rows} /><GovernanceSummary rows={rows} /></div></>}
      {section === "analitica" && <Results rows={rows} />}
      {section === "riesgo" && <><div className="info-strip"><Info size={17} /><p>La prioridad es una señal explicable de atención preventiva; no es una calificación crediticia. Los perfiles de control permanecen sin contacto.</p></div><CustomerTable rows={tableRows} /></>}
      {section === "conversaciones" && <><div className="mini-stats"><div><MessageSquareText size={21} /><strong>{metrics.conversations.length}</strong><span>Conversaciones iniciadas</span></div><div><Check size={21} /><strong>{metrics.completed.length}</strong><span>Conversaciones completadas</span></div><div><Headphones size={21} /><strong>{metrics.escalations.length}</strong><span>Derivadas a una persona</span></div></div><CustomerTable rows={tableRows} mode="conversation" /></>}
      {section === "compromisos" && <><div className="mini-stats"><div><FileCheck2 size={21} /><strong>{metrics.commitments.length}</strong><span>Acuerdos obtenidos</span></div><div><CircleCheck size={21} /><strong>{metrics.kept.length}</strong><span>Compromisos cumplidos</span></div><div><Wallet size={21} /><strong>{money(metrics.kept.reduce((sum, customer) => sum + customer.installmentCents, 0))}</strong><span>Pagos registrados · demo</span></div></div><div className="info-strip"><Info size={17} /><p>Un acuerdo aceptado no equivale a un pago. El cumplimiento se confirma únicamente con un registro de pago.</p></div><CustomerTable rows={tableRows} mode="commitment" /></>}
      {section === "escalaciones" && <><div className="info-strip"><Headphones size={17} /><p>Vista de demostración de casos derivados. La asignación de operadores y la toma de casos se incorporarán al conectar el backend.</p></div><CustomerTable rows={tableRows} mode="escalation" /></>}
      <p className="data-note"><span /> Cifras simuladas para explorar el diseño. Fechas en El Salvador (GMT−6). No se realizan contactos ni operaciones reales.</p>
    </>}
  </div>;
}
