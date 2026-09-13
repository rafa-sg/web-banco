"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, Search, SearchX, MessageCircle, Phone } from "lucide-react";
import { bandLabels, channelLabels, dateLabel, money, outcomeLabels, type Customer, type RiskBand } from "@/lib/demo-data";
import { useDemo } from "@/components/demo-provider";
import { Button } from "@/components/ui/button";

export function RiskBadge({ band }: { band: RiskBand }) {
  return <span className={`risk-badge risk-${band.toLowerCase()}`}><i />{bandLabels[band]}</span>;
}

export function CustomerTable({ rows, compact = false, mode = "risk" }: { rows: Customer[]; compact?: boolean; mode?: "risk" | "conversation" | "commitment" | "escalation" }) {
  const { reference } = useDemo();
  const [search, setSearch] = useState("");
  const [band, setBand] = useState("all");
  const [descending, setDescending] = useState(true);
  const [page, setPage] = useState(0);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = rows.filter(row => (band === "all" || row.band === band) && normalize(`${row.name} ${row.id} ${row.product}`).includes(normalize(search))).sort((a, b) => descending ? b.score - a.score : a.score - b.score);
  const pageSize = compact ? 5 : 10;
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  const title = mode === "risk" ? "Casos que necesitan acompañamiento" : mode === "conversation" ? "Historial de conversaciones" : mode === "commitment" ? "Acuerdos y cumplimiento" : "Casos para atención humana";

  return <section className={`panel table-panel ${compact ? "compact-table" : ""}`}>
    <div className="panel-heading"><div><span className="eyebrow">{mode === "risk" ? "LA SIGUIENTE MEJOR ACCIÓN" : "DETALLE DE LA GESTIÓN"}</span><h2>{title}<span className="count-badge">{rows.length}</span></h2></div>{compact && <Link href="/riesgo" className="text-link">Ver todos <ArrowRight size={15} /></Link>}</div>
    {!compact && <div className="table-toolbar"><label className="search-field"><Search size={17} /><input aria-label="Buscar por cliente, ID o producto" placeholder="Buscar cliente, ID o producto..." value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label><label className="select-field"><span className="sr-only">Filtrar por nivel de riesgo</span><select value={band} onChange={event => { setBand(event.target.value); setPage(0); }}><option value="all">Todos los niveles</option>{Object.entries(bandLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div>}
    <div className="table-scroll"><table><caption className="sr-only">{title}. Todos los perfiles son ficticios.</caption><thead><tr><th>Cliente / producto</th><th><button className="sort-button" onClick={() => setDescending(!descending)}>Prioridad <ArrowDown size={12} className={descending ? "" : "rotated"} /></button></th><th>{mode === "commitment" ? "Monto acordado" : "Próxima cuota"}</th><th>Canal</th><th>{mode === "risk" ? "Próxima acción" : "Resultado"}</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{visible.map(row => <tr key={row.id}><td><Link className="customer-cell" href={`/clientes/${row.id}`}><span className={`avatar avatar-${row.channel}`}>{row.initials}</span><span><strong>{row.name}</strong><small>{compact ? row.product : `${row.id} · ${row.product}`}</small></span></Link></td><td><div className="score-cell"><RiskBadge band={row.band} /><span>{row.score}<small>/100</small></span></div></td><td><span className="amount">{money(row.installmentCents)}</span><small className="cell-secondary">{mode === "commitment" && row.commitmentKept ? "Pago registrado · demo" : `Vence ${dateLabel(reference, row.dueInDays)}`}</small></td><td><span className="channel-tag">{row.channel === "whatsapp" ? <MessageCircle size={14} /> : <Phone size={13} />}{channelLabels[row.channel]}</span></td><td><span className="next-action">{mode === "risk" ? row.isControl ? "Cohorte de control" : row.outcome === "HUMAN_ESCALATION" ? "Atención humana" : "Seguimiento preventivo" : mode === "commitment" ? row.commitmentKept ? "Cumplido" : "Pendiente" : outcomeLabels[row.outcome]}</span>{row.isControl && <small className="cell-secondary">Sin contacto</small>}</td><td><Link className="row-arrow" href={`/clientes/${row.id}`} aria-label={`Ver ficha de ${row.name}`}><ArrowUpRightIcon /></Link></td></tr>)}</tbody></table></div>
    {visible.length === 0 && <div className="empty-state"><SearchX size={30} /><h3>No hay casos con estos filtros</h3><p>Prueba otro cliente, periodo, canal o nivel de riesgo.</p><Button variant="outline" size="sm" onClick={() => { setSearch(""); setBand("all"); setPage(0); }}>Limpiar búsqueda y nivel</Button></div>}
    <div className="table-footer"><span>{filtered.length ? `${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)}` : "0"} de {filtered.length} casos <span className="table-footer-note">· Datos ficticios</span></span>{!compact && <div><Button variant="ghost" size="sm" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><Button variant="ghost" size="sm" disabled={(currentPage + 1) * pageSize >= filtered.length} onClick={() => setPage(currentPage + 1)}>Siguiente</Button></div>}</div>
  </section>;
}

function ArrowUpRightIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>; }
