"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone, Search, SearchX, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { actionLabels, bandToGrade, channelLabels, dueLabel, gradeColors, gradeLabels, initials, money, priorityScore } from "@/lib/prevention";
import type { CustomerOverview, Grade } from "@/lib/types";

const PAGE_SIZE = 12;

function whyLine(row: CustomerOverview) {
  const factors = (row.top_factors ?? []).map(factor => factor.label ?? factor.factor).filter(Boolean) as string[];
  const parts = [...factors.slice(0, 2), ...(row.active_signals ?? []).slice(0, 1)];
  return parts.length ? parts.join(" · ") : "Sin señales registradas";
}

function blockReason(row: CustomerOverview) {
  if (row.is_control_group) return "Grupo de control: no se contacta";
  if (row.opted_out) return "El cliente pidió no ser contactado";
  if (!row.contact_enabled) return "Contacto deshabilitado por regla";
  return "Llamada desde la web pendiente de conectar con el agente";
}

function ChannelIcon({ channel }: { channel: string | null }) {
  if (channel === "whatsapp") return <MessageCircle size={14} />;
  if (channel === "voice") return <Phone size={13} />;
  return <UserRound size={14} />;
}

export function PriorityTable({ rows, gradeCounts }: { rows: CustomerOverview[]; gradeCounts: { grade: Grade; count: number }[] }) {
  const [grade, setGrade] = useState<Grade | "all">("all");
  const [channel, setChannel] = useState("all");
  const [product, setProduct] = useState("all");
  const [department, setDepartment] = useState("all");
  const [contactableOnly, setContactableOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const products = useMemo(() => [...new Set(rows.map(row => row.product_type).filter(Boolean))] as string[], [rows]);
  const departments = useMemo(() => [...new Set(rows.map(row => row.department).filter(Boolean))].sort() as string[], [rows]);
  const channels = useMemo(() => [...new Set(rows.map(row => row.preferred_channel).filter(Boolean))] as string[], [rows]);
  const total = rows.length;

  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = rows
    .filter(row => grade === "all" || (row.risk_band && bandToGrade[row.risk_band] === grade))
    .filter(row => channel === "all" || row.preferred_channel === channel)
    .filter(row => product === "all" || row.product_type === product)
    .filter(row => department === "all" || row.department === department)
    .filter(row => !contactableOnly || (row.contact_enabled && !row.opted_out && !row.is_control_group))
    .filter(row => normalize(`${row.full_name} ${row.customer_code}`).includes(normalize(search)))
    .sort((a, b) => priorityScore(b) - priorityScore(a));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const reset = () => { setGrade("all"); setChannel("all"); setProduct("all"); setDepartment("all"); setContactableOnly(false); setSearch(""); setPage(0); };

  return <>
    <section className="panel grade-panel" aria-labelledby="grade-title">
      <div className="panel-heading"><div><span className="eyebrow">CALIFICACIÓN PREVENTIVA</span><h2 id="grade-title">Distribución A–E</h2></div><span className="count-badge">{total} clientes</span></div>
      <div className="grade-bar" aria-hidden="true">{gradeCounts.map(item => item.count > 0 && <span key={item.grade} style={{ flexGrow: item.count, background: gradeColors[item.grade] }} />)}</div>
      <div className="grade-chips" role="group" aria-label="Filtrar por grado">
        <button className="grade-chip" aria-pressed={grade === "all"} onClick={() => { setGrade("all"); setPage(0); }}>Todos<strong>{total}</strong></button>
        {gradeCounts.map(item => <button key={item.grade} className="grade-chip" aria-pressed={grade === item.grade} onClick={() => { setGrade(item.grade); setPage(0); }}><i style={{ background: gradeColors[item.grade] }} />{gradeLabels[item.grade]}<strong>{item.count}</strong></button>)}
      </div>
    </section>

    <section className="panel table-panel">
      <div className="panel-heading"><div><span className="eyebrow">PRIORIDAD = RIESGO × MONTO × CERCANÍA</span><h2>Cola priorizada<span className="count-badge">{filtered.length}</span></h2></div></div>
      <div className="table-toolbar">
        <label className="search-field"><Search size={17} /><input aria-label="Buscar cliente o código" placeholder="Buscar cliente o código…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
        <label className="select-field"><span className="sr-only">Canal</span><select value={channel} onChange={event => { setChannel(event.target.value); setPage(0); }}><option value="all">Todos los canales</option>{channels.map(value => <option key={value} value={value}>{channelLabels[value] ?? value}</option>)}</select></label>
        <label className="select-field"><span className="sr-only">Producto</span><select value={product} onChange={event => { setProduct(event.target.value); setPage(0); }}><option value="all">Todos los productos</option>{products.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="select-field"><span className="sr-only">Departamento</span><select value={department} onChange={event => { setDepartment(event.target.value); setPage(0); }}><option value="all">Todos los departamentos</option>{departments.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label className="check-field"><input type="checkbox" checked={contactableOnly} onChange={event => { setContactableOnly(event.target.checked); setPage(0); }} />Solo contactables</label>
      </div>

      <div className="table-scroll"><table>
        <caption className="sr-only">Clientes ordenados por prioridad de intervención. Datos ficticios.</caption>
        <thead><tr><th>Cliente</th><th>Grado</th><th>Riesgo</th><th>Vence</th><th>Monto</th><th>Acción recomendada</th><th>Canal</th><th>Por qué</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{visible.map(row => {
          const reason = blockReason(row);
          return <tr key={row.customer_id}>
            <td><Link className="customer-cell" href={`/clientes/${row.customer_id}`}><span className="avatar">{initials(row.full_name)}</span><span><strong>{row.full_name}</strong><small>{row.customer_code} · {row.product_type ?? "—"}</small></span></Link></td>
            <td>{row.risk_band ? <GradeBadge grade={bandToGrade[row.risk_band]} /> : "—"}</td>
            <td><span className="score-cell"><span>{row.risk_score ?? "—"}<small>/100</small></span></span></td>
            <td><span className={row.days_past_due && row.days_past_due > 0 ? "due-late" : ""}>{dueLabel(row.days_to_due, row.days_past_due)}</span></td>
            <td><span className="amount">{money(row.amount_due)}</span></td>
            <td><span className="action-tag">{row.is_control_group ? "Control · sin contacto" : actionLabels[row.intervention_status ?? ""] ?? row.intervention_status ?? "Monitorear"}</span></td>
            <td><span className="channel-tag"><ChannelIcon channel={row.preferred_channel} />{channelLabels[row.preferred_channel ?? ""] ?? "—"}</span></td>
            <td><span className="why-cell" title={whyLine(row)}>{whyLine(row)}</span></td>
            <td><div className="row-actions">
              <span title={reason}><Button size="sm" variant="outline" disabled><Phone size={13} /> Llamar</Button></span>
              <Link className="row-arrow" href={`/clientes/${row.customer_id}`} aria-label={`Ver ficha de ${row.full_name}`}><ArrowUpRight size={15} /></Link>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>

      {visible.length === 0 && <div className="empty-state"><SearchX size={30} /><h3>No hay clientes con estos filtros</h3><p>Prueba otro grado, canal o producto.</p><Button variant="outline" size="sm" onClick={reset}>Limpiar filtros</Button></div>}

      <div className="table-footer"><span>{filtered.length ? `${currentPage * PAGE_SIZE + 1}–${Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)}` : "0"} de {filtered.length} clientes</span><div><Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="ghost" size="sm" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div></div>
    </section>
  </>;
}
