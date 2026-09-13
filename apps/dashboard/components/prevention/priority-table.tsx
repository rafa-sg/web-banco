"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Mail, MessageCircle, Phone, Search, SearchX, SlidersHorizontal, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactButton } from "@/components/prevention/call-button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { actionLabels, bandToGrade, channelLabels, contactBlockReason, contactChannelFor, dueLabel, gradeColors, gradeLabels, humanize, initials, money, priorityScore, productLabels } from "@/lib/prevention";
import type { CustomerOverview, Grade } from "@/lib/types";

const PAGE_SIZE = 12;

type DueFilter = "all" | "upcoming" | "today" | "late";
const dueFilters: { key: DueFilter; label: string }[] = [
  { key: "all", label: "Todos" }, { key: "upcoming", label: "Antes de vencer" }, { key: "today", label: "Vence hoy" }, { key: "late", label: "Con atraso" },
];

function dueBucket(row: CustomerOverview): DueFilter | null {
  if ((row.days_past_due ?? 0) > 0 || (row.days_to_due ?? 0) < 0) return "late";
  if (row.days_to_due === 0) return "today";
  if (row.days_to_due != null) return "upcoming";
  return null;
}

function whyLine(row: CustomerOverview, signalLabels: Record<string, string>) {
  const factors = (row.top_factors ?? []).map(factor => factor.label ?? factor.factor).filter(Boolean) as string[];
  const signals = (row.active_signals ?? []).slice(0, 1).map(code => signalLabels[code] ?? humanize(code));
  const parts = [...factors.slice(0, 2), ...signals];
  return parts.length ? parts.join(" · ") : "Sin señales registradas";
}

function ChannelIcon({ channel }: { channel: string | null }) {
  if (channel === "whatsapp") return <MessageCircle size={14} />;
  if (channel === "voice") return <Phone size={13} />;
  if (channel === "email") return <Mail size={13} />;
  return <UserRound size={14} />;
}

export function PriorityTable({ rows, gradeCounts, signalLabels, channelByGrade }: {
  rows: CustomerOverview[];
  gradeCounts: { grade: Grade; count: number }[];
  signalLabels: Record<string, string>;
  channelByGrade: Record<string, string> | null;
}) {
  const [grade, setGrade] = useState<Grade | "all">("all");
  const [due, setDue] = useState<DueFilter>("all");
  const [channel, setChannel] = useState("all");
  const [product, setProduct] = useState("all");
  const [department, setDepartment] = useState("all");
  const [contactableOnly, setContactableOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [page, setPage] = useState(0);

  const products = useMemo(() => [...new Set(rows.map(row => row.product_type).filter(Boolean))] as string[], [rows]);
  const departments = useMemo(() => [...new Set(rows.map(row => row.department).filter(Boolean))].sort() as string[], [rows]);
  const channels = useMemo(() => [...new Set(rows.map(row => row.preferred_channel).filter(Boolean))] as string[], [rows]);
  const total = rows.length;

  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = rows
    .filter(row => grade === "all" || (row.risk_band && bandToGrade[row.risk_band] === grade))
    .filter(row => due === "all" || dueBucket(row) === due)
    .filter(row => channel === "all" || row.preferred_channel === channel)
    .filter(row => product === "all" || row.product_type === product)
    .filter(row => department === "all" || row.department === department)
    .filter(row => !contactableOnly || (row.contact_enabled && !row.opted_out && !row.is_control_group))
    .filter(row => normalize(`${row.full_name} ${row.customer_code}`).includes(normalize(search)))
    .sort((a, b) => priorityScore(b) - priorityScore(a));

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const dueCounts = useMemo(() => rows.reduce<Record<string, number>>((counts, row) => { const bucket = dueBucket(row); if (bucket) counts[bucket] = (counts[bucket] ?? 0) + 1; return counts; }, {}), [rows]);
  const extraFilters = [channel !== "all", product !== "all", department !== "all", contactableOnly].filter(Boolean).length;
  const hasFilters = grade !== "all" || due !== "all" || channel !== "all" || product !== "all" || department !== "all" || contactableOnly || search !== "";
  const reset = () => { setGrade("all"); setDue("all"); setChannel("all"); setProduct("all"); setDepartment("all"); setContactableOnly(false); setSearch(""); setPage(0); };

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
      <div className="filter-bar-unified" role="search" aria-label="Filtros de la cola">
        <div className="filter-bar-row">
          <label className="search-field"><Search size={17} /><input aria-label="Buscar cliente o código" placeholder="Buscar cliente o código…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
          <div className="segmented" role="group" aria-label="Filtrar por vencimiento">{dueFilters.map(item => <button key={item.key} type="button" aria-pressed={due === item.key} onClick={() => { setDue(item.key); setPage(0); }}>{item.label}{item.key !== "all" && ` (${dueCounts[item.key] ?? 0})`}</button>)}</div>
          <Button variant="outline" size="sm" aria-expanded={moreOpen} aria-controls="more-filters" onClick={() => setMoreOpen(open => !open)}><SlidersHorizontal size={13} /> Más filtros{extraFilters ? ` (${extraFilters})` : ""}</Button>
          {hasFilters && <Button variant="ghost" size="sm" onClick={reset}>Limpiar</Button>}
        </div>
        {moreOpen && <div id="more-filters" className="filter-bar-row filter-bar-more">
          <label className="select-field"><span className="sr-only">Canal preferido</span><select value={channel} onChange={event => { setChannel(event.target.value); setPage(0); }}><option value="all">Todos los canales preferidos</option>{channels.map(value => <option key={value} value={value}>{channelLabels[value] ?? value}</option>)}</select></label>
          <label className="select-field"><span className="sr-only">Producto</span><select value={product} onChange={event => { setProduct(event.target.value); setPage(0); }}><option value="all">Todos los productos</option>{products.map(value => <option key={value} value={value}>{productLabels[value] ?? humanize(value)}</option>)}</select></label>
          <label className="select-field"><span className="sr-only">Departamento</span><select value={department} onChange={event => { setDepartment(event.target.value); setPage(0); }}><option value="all">Todos los departamentos</option>{departments.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label className="check-field"><input type="checkbox" checked={contactableOnly} onChange={event => { setContactableOnly(event.target.checked); setPage(0); }} />Solo contactables</label>
        </div>}
        <span className="table-scope-note">Los filtros solo afectan esta tabla, no las tarjetas ni la corrida.</span>
      </div>

      <div className="table-scroll"><table>
        <caption className="sr-only">Clientes ordenados por prioridad de intervención. Datos ficticios.</caption>
        <thead><tr><th>Cliente</th><th>Grado</th><th>Riesgo</th><th>Vence</th><th>Monto</th><th>Gestión</th><th>Canal preferido</th><th>Por qué</th><th><span className="sr-only">Acciones</span></th></tr></thead>
        <tbody>{visible.map(row => {
          const rowGrade = row.risk_band ? bandToGrade[row.risk_band] : null;
          const why = whyLine(row, signalLabels);
          return <tr key={row.customer_id}>
            <td><Link className="customer-cell" href={`/clientes/${row.customer_id}`}><span className="avatar">{initials(row.full_name)}</span><span><strong>{row.full_name}</strong><small>{row.customer_code} · {row.product_type ? productLabels[row.product_type] ?? humanize(row.product_type) : "—"}</small></span></Link></td>
            <td>{row.risk_band ? <GradeBadge grade={bandToGrade[row.risk_band]} /> : "—"}</td>
            <td><span className="score-cell"><span>{row.risk_score ?? "—"}<small>/100</small></span></span></td>
            <td><span className={row.days_past_due && row.days_past_due > 0 ? "due-late" : ""}>{dueLabel(row.days_to_due, row.days_past_due)}</span></td>
            <td><span className="amount">{money(row.amount_due)}</span></td>
            <td><span className="action-tag">{row.is_control_group ? "Control · sin contacto" : actionLabels[row.intervention_status ?? ""] ?? row.intervention_status ?? "Monitorear"}</span></td>
            <td><span className="channel-tag"><ChannelIcon channel={row.preferred_channel} />{channelLabels[row.preferred_channel ?? ""] ?? "—"}</span></td>
            <td><span className="why-cell" title={why}>{why}</span></td>
            <td><div className="row-actions">
              <ContactButton customerId={row.customer_id} channel={contactChannelFor(rowGrade, channelByGrade)} disabledReason={contactBlockReason(row)} size="sm" />
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
