"use client";

import { useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { bandLabels, dateLabel, percentage, summarize, type Customer, type RiskBand } from "@/lib/demo-data";
import { useDemo } from "@/components/demo-provider";

const bandColors: Record<RiskBand, string> = { BAJO: "#e8e8e5", MODERADO: "#b9bbb5", PREVENTIVO: "#fdda24", ALTO: "#78746d", CRITICO: "#2c2a29" };

export function ActivityChart({ rows }: { rows: Customer[] }) {
  const { period, reference } = useDemo();
  const [view, setView] = useState<"activity" | "commitments">("activity");
  const step = Math.ceil(period / 6);
  const data = Array.from({ length: 6 }, (_, index) => {
    const end = (5 - index) * step;
    const summary = summarize(rows.filter(row => row.activityDaysAgo >= end && row.activityDaysAgo < end + step));
    return { date: dateLabel(reference, -end), conversations: summary.conversations.length, commitments: summary.commitments.length, kept: summary.kept.length };
  });
  return <section className="panel evolution-panel" aria-labelledby="evolution-title">
    <div className="panel-heading"><div><span className="eyebrow">UNA GESTIÓN QUE AVANZA</span><h2 id="evolution-title">Evolución de la gestión</h2></div><div className="segmented compact"><button aria-pressed={view === "activity"} onClick={() => setView("activity")}>Actividad</button><button aria-pressed={view === "commitments"} onClick={() => setView("commitments")}>Acuerdos</button></div></div>
    <div className="chart-legend"><span><i className="legend-square yellow" />{view === "activity" ? "Conversaciones" : "Compromisos"}</span><span><i className="legend-line" />{view === "activity" ? "Compromisos" : "Cumplidos"}</span><span className="legend-period">Últimos {period} días</span></div>
    <div className="activity-chart" role="img" aria-label={`Actividad simulada de los últimos ${period} días. Consulte la tabla de datos debajo del gráfico.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={data} margin={{ top: 15, right: 8, left: -25, bottom: 2 }} accessibilityLayer>
          <CartesianGrid stroke="#ecece8" vertical={false} strokeDasharray="3 5" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#82827d", fontSize: 11 }} dy={10} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#82827d", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "#f5f5f0" }} contentStyle={{ border: "1px solid #e9e9e5", borderRadius: 10, fontSize: 12 }} />
          <Bar name={view === "activity" ? "Conversaciones" : "Compromisos"} dataKey={view === "activity" ? "conversations" : "commitments"} fill="#fdda24" radius={[5, 5, 0, 0]} maxBarSize={38} isAnimationActive={false} />
          <Line name={view === "activity" ? "Compromisos" : "Cumplidos"} dataKey={view === "activity" ? "commitments" : "kept"} type="monotone" stroke="#2c2a29" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <details className="chart-data"><summary>Ver datos del gráfico</summary><table><caption>Conteos de demostración por intervalo de {step} días</caption><thead><tr><th>Hasta</th><th>Conversaciones</th><th>Compromisos</th><th>Cumplidos</th></tr></thead><tbody>{data.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.conversations}</td><td>{row.commitments}</td><td>{row.kept}</td></tr>)}</tbody></table></details>
  </section>;
}

export function RiskDistribution({ rows }: { rows: Customer[] }) {
  const data = (Object.keys(bandLabels) as RiskBand[]).map(band => ({ name: bandLabels[band], value: rows.filter(row => row.band === band).length, color: bandColors[band] }));
  return <section className="panel distribution-panel" aria-labelledby="distribution-title"><div className="panel-heading"><div><span className="eyebrow">CONOCER PARA ACOMPAÑAR</span><h2 id="distribution-title">Perfil de la cartera</h2></div><Link href="/riesgo" className="icon-link" aria-label="Ver atención preventiva"><ArrowUpRight size={19} /></Link></div>
    <div className="donut-wrap"><div className="donut-chart" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={data} dataKey="value" innerRadius={64} outerRadius={84} startAngle={90} endAngle={-270} paddingAngle={3} stroke="none" isAnimationActive={false}>{data.map(entry => <Cell key={entry.name} fill={entry.color} />)}</Pie></PieChart></ResponsiveContainer></div><div className="donut-center"><strong>{rows.length}</strong><span>clientes</span></div></div>
    <div className="risk-legend">{data.map(item => <div key={item.name}><span><i style={{ background: item.color }} />{item.name}</span><strong>{item.value}<small>{percentage(item.value, rows.length)}%</small></strong></div>)}</div>
  </section>;
}

export function ChannelPerformance({ rows }: { rows: Customer[] }) {
  return <section className="panel channel-panel"><div className="panel-heading"><div><span className="eyebrow">CONECTAR MEJOR</span><h2>Efectividad por canal</h2></div></div><p className="panel-description">Compromisos sobre conversaciones completadas.</p>
    {(["whatsapp", "voice"] as const).map(channel => {
      const { commitments, completed } = summarize(rows.filter(row => row.channel === channel));
      const rate = percentage(commitments.length, completed.length);
      return <div className="channel-performance" key={channel}><div className={`channel-symbol ${channel}`}>{channel === "whatsapp" ? <MessageCircle size={20} /> : <Phone size={19} />}</div><div className="channel-progress"><div><strong>{channel === "whatsapp" ? "WhatsApp" : "Voz"}</strong><span>{completed.length ? `${rate}%` : "—"}</span></div><div className="progress-track"><span style={{ width: `${rate}%` }} /></div><small>{commitments.length} compromisos / {completed.length} completadas</small></div></div>;
    })}
    <Link href="/analitica" className="text-link channel-link">Explorar resultados <ArrowUpRight size={15} /></Link>
  </section>;
}
