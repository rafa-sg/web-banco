"use client";

import { useState, useTransition } from "react";
import { Ban, FlaskConical, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { Toggle } from "@/components/config/toggle";
import { setRuleActive, setRuleConditions, setRulePriority, testRulesForCustomer, type ActionResult } from "@/app/(app)/configuracion/actions";
import { asList, bandToGrade, channelLabels, humanize, labelOf, operatorLabels } from "@/lib/prevention";
import type { CollectionRule, Condition, FactDefinition, Offer, RiskBand, RuleOffer } from "@/lib/types";

type CustomerOption = { customer_id: string; full_name: string; customer_code: string; risk_band: RiskBand | null };

function formatValue(value: unknown, fact?: FactDefinition) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return fact?.data_type === "number" && value.length === 2 ? `${value[0]} y ${value[1]}` : value.map(item => humanize(String(item))).join(", ");
  return typeof value === "string" ? humanize(value) : String(value);
}

export function describeCondition(condition: Condition, facts: FactDefinition[]) {
  const fact = facts.find(item => item.key === condition.fact);
  return `${fact?.label ?? humanize(condition.fact)} ${operatorLabels[condition.op] ?? condition.op} ${formatValue(condition.value, fact)}`.trim();
}

function defaultValue(fact: FactDefinition | undefined, op: string): unknown {
  if (!fact || op === "is_true" || op === "is_false") return undefined;
  if (op === "between") return [0, 10];
  if (op === "in" || op === "not_in") return fact.options?.slice(0, 1) ?? [];
  if (fact.data_type === "number") return 0;
  return fact.options?.[0] ?? "";
}

function ConditionEditor({ rule, facts, onClose }: { rule: CollectionRule; facts: FactDefinition[]; onClose: () => void }) {
  const [rows, setRows] = useState<Condition[]>(() => (rule.conditions.all ?? []).map(condition => ({ ...condition })));
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const change = (index: number, next: Partial<Condition>) => setRows(current => current.map((row, i) => i === index ? { ...row, ...next } : row));
  const setFact = (index: number, key: string) => {
    const fact = facts.find(item => item.key === key);
    const op = fact?.operators[0] ?? "eq";
    change(index, { fact: key, op, value: defaultValue(fact, op) });
  };
  const setOp = (index: number, op: string) => change(index, { op, value: defaultValue(facts.find(item => item.key === rows[index].fact), op) });
  const add = () => { const fact = facts[0]; setRows(current => [...current, { fact: fact.key, op: fact.operators[0], value: defaultValue(fact, fact.operators[0]) }]); };
  const save = () => start(async () => {
    const clean = rows.map(({ fact, op, value }) => (value === undefined ? { fact, op } : { fact, op, value }));
    const outcome = await setRuleConditions(rule.id, clean);
    setResult(outcome);
    if (outcome.ok) onClose();
  });

  return <div className="condition-editor">
    <p className="muted-note">La regla aplica cuando se cumplen <strong>todas</strong> las condiciones.</p>
    {rows.map((row, index) => {
      const fact = facts.find(item => item.key === row.fact);
      return <div key={index} className="condition-row">
        <select aria-label="Dato" value={row.fact} onChange={event => setFact(index, event.target.value)}>{facts.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
        <select aria-label="Operador" value={row.op} onChange={event => setOp(index, event.target.value)}>{(fact?.operators ?? [row.op]).map(op => <option key={op} value={op}>{operatorLabels[op] ?? op}</option>)}</select>
        <ValueInput fact={fact} op={row.op} value={row.value} onChange={value => change(index, { value })} />
        <button type="button" className="icon-link" aria-label="Quitar condición" onClick={() => setRows(current => current.filter((_, i) => i !== index))}><Trash2 size={15} /></button>
      </div>;
    })}
    <div className="condition-actions">
      <Button type="button" variant="ghost" size="sm" onClick={add}><Plus size={14} /> Agregar condición</Button>
      <span className="spacer" />
      <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={pending}>Cancelar</Button>
      <Button type="button" size="sm" onClick={save} disabled={pending || rows.length === 0}>{pending ? "Guardando…" : "Guardar condiciones"}</Button>
    </div>
    {result && !result.ok && <p className="form-error">{result.error}</p>}
  </div>;
}

function ValueInput({ fact, op, value, onChange }: { fact?: FactDefinition; op: string; value: unknown; onChange: (value: unknown) => void }) {
  if (op === "is_true" || op === "is_false") return <span className="muted-note condition-novalue">sin valor</span>;
  if (op === "between") {
    const [min, max] = Array.isArray(value) ? value : [0, 0];
    return <span className="condition-range"><input type="number" aria-label="Desde" value={String(min)} onChange={event => onChange([Number(event.target.value), max])} /><span>y</span><input type="number" aria-label="Hasta" value={String(max)} onChange={event => onChange([min, Number(event.target.value)])} /></span>;
  }
  if ((op === "in" || op === "not_in") && fact?.options) {
    const selected = new Set(Array.isArray(value) ? value.map(String) : []);
    return <span className="condition-multi">{fact.options.map(option => <label key={option}><input type="checkbox" checked={selected.has(option)} onChange={event => { const next = new Set(selected); if (event.target.checked) next.add(option); else next.delete(option); onChange([...next]); }} />{humanize(option)}</label>)}</span>;
  }
  if (fact?.options) return <select aria-label="Valor" value={String(value ?? "")} onChange={event => onChange(event.target.value)}>{fact.options.map(option => <option key={option} value={option}>{humanize(option)}</option>)}</select>;
  if (fact?.data_type === "number") return <input type="number" aria-label="Valor" step="any" value={String(value ?? 0)} onChange={event => onChange(Number(event.target.value))} />;
  return <input type="text" aria-label="Valor" value={String(value ?? "")} onChange={event => onChange(event.target.value)} />;
}

function RuleCard({ rule, facts, offers }: { rule: CollectionRule; facts: FactDefinition[]; offers: Offer[] }) {
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState(rule.is_active);
  const [priority, setPriority] = useState(String(rule.priority));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const conditions = rule.conditions.all ?? [];
  const editable = Object.keys(rule.conditions).every(key => key === "all");
  const blocking = rule.effect === "block";

  const run = (action: () => Promise<ActionResult>, rollback: () => void) => start(async () => {
    const outcome = await action();
    if (!outcome.ok) { rollback(); setError(outcome.error); } else setError(null);
  });
  // Cambiar la prioridad reordena qué regla gana: se guarda solo con confirmación explícita, nunca al salir del campo.
  const priorityDirty = priority !== String(rule.priority);
  const savePriority = () => {
    if (!priorityDirty || priority.trim() === "" || Number.isNaN(Number(priority))) return;
    const previous = String(rule.priority);
    run(() => setRulePriority(rule.id, Number(priority)), () => setPriority(previous));
  };

  return <article className={`rule-card ${active ? "" : "rule-card-inactive"}`}>
    <div className="rule-card-head">
      <span className={`effect-badge ${blocking ? "effect-block" : "effect-allow"}`}>{blocking ? <Ban size={13} /> : <ShieldCheck size={13} />}{blocking ? "Bloquea" : "Permite"}</span>
      <div className="rule-card-title" title={rule.key}><strong>{rule.name}</strong>{rule.playbook_key && <small>Guion: {humanize(rule.playbook_key)}</small>}</div>
      <label className="priority-field">Prioridad<input type="number" value={priority} onChange={event => setPriority(event.target.value)} onKeyDown={event => { if (event.key === "Enter") savePriority(); if (event.key === "Escape") setPriority(String(rule.priority)); }} disabled={pending} /></label>
      {priorityDirty && <span className="priority-actions"><Button size="sm" onClick={savePriority} disabled={pending}>Guardar</Button><Button size="sm" variant="ghost" onClick={() => setPriority(String(rule.priority))} disabled={pending}>Descartar</Button></span>}
      <Toggle checked={active} label={`${active ? "Desactivar" : "Activar"} ${rule.name}`} disabled={pending} onChange={value => { setActive(value); run(() => setRuleActive(rule.id, value), () => setActive(!value)); }} />
    </div>
    {rule.description && <p className="rule-description">{rule.description}</p>}
    {editing ? <ConditionEditor rule={rule} facts={facts} onClose={() => setEditing(false)} /> : <>
      <ul className="condition-list">{conditions.map((condition, index) => <li key={index}>{describeCondition(condition, facts)}</li>)}</ul>
      <div className="rule-card-foot">
        {(rule.channel_sequence ?? []).length > 0 && <span className="rule-meta">Canales: {rule.channel_sequence!.map(channel => channelLabels[channel] ?? channel).join(" → ")}</span>}
        {offers.length > 0 && <span className="rule-meta">Ofertas: {offers.map(offer => offer.name).join(" · ")}</span>}
        {rule.tone && <span className="rule-meta">Tono: {humanize(rule.tone)}</span>}
        <span className="spacer" />
        {editable ? <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil size={13} /> Editar condiciones</Button> : <span className="muted-note">Condiciones avanzadas: solo lectura</span>}
      </div>
    </>}
    {error && <p className="form-error">{error}</p>}
  </article>;
}

function RuleTester({ customers }: { customers: CustomerOption[] }) {
  const [customerId, setCustomerId] = useState("");
  const [result, setResult] = useState<{ ok: true; result: unknown } | { ok: false; error: string } | null>(null);
  const [pending, start] = useTransition();
  const customer = customers.find(item => item.customer_id === customerId);
  const test = () => start(async () => setResult(await testRulesForCustomer(customerId)));

  const payload = result?.ok ? result.result : null;
  const record = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  const lists = record ? Object.entries(record).filter(([, value]) => Array.isArray(value)) : [];
  const scalars = record ? Object.entries(record).filter(([, value]) => value !== null && typeof value !== "object") : [];

  return <section className="panel rule-tester" aria-labelledby="tester-title">
    <div className="panel-heading"><div><span className="eyebrow">PROBAR CON CLIENTE</span><h2 id="tester-title">¿Qué reglas se activan?</h2></div><FlaskConical size={20} className="muted-icon" /></div>
    <p className="panel-description">Cambia una regla y vuelve a probar: la recomendación del cliente cambia con ella.</p>
    <div className="tester-form">
      <select aria-label="Cliente" value={customerId} onChange={event => { setCustomerId(event.target.value); setResult(null); }}>
        <option value="">Elige un cliente…</option>
        {customers.map(item => <option key={item.customer_id} value={item.customer_id}>{item.full_name} · {item.customer_code}</option>)}
      </select>
      <Button onClick={test} disabled={!customerId || pending}>{pending ? "Evaluando…" : "Probar"}</Button>
    </div>
    {customer?.risk_band && <p className="tester-customer"><GradeBadge grade={bandToGrade[customer.risk_band]} /> {customer.full_name}</p>}
    {result && !result.ok && <p className="form-error">{result.error}</p>}
    {result?.ok && <div className="tester-result">
      {scalars.length > 0 && <dl className="profile-list">{scalars.map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{typeof value === "boolean" ? (value ? "Sí" : "No") : humanize(String(value))}</dd></div>)}</dl>}
      {lists.map(([key, value]) => <div key={key}><h3 className="subheading">{humanize(key)} <span className="count-badge">{(value as unknown[]).length}</span></h3>
        {(value as unknown[]).length ? <ul className={`rule-list ${/block/i.test(key) ? "rule-list-blocked" : ""}`}>{asList(value).map((item, index) => <li key={index}>{/block/i.test(key) ? <Ban size={14} /> : <ShieldCheck size={14} />}{labelOf(item)}</li>)}</ul> : <p className="muted-note">Ninguno.</p>}
      </div>)}
      {!record && <pre className="json-preview">{JSON.stringify(payload, null, 2)}</pre>}
    </div>}
  </section>;
}

export function RulesManager({ rules, facts, offers, ruleOffers, customers }: { rules: CollectionRule[]; facts: FactDefinition[]; offers: Offer[]; ruleOffers: RuleOffer[]; customers: CustomerOption[] }) {
  const [filter, setFilter] = useState<"all" | "allow" | "block">("all");
  const offersById = new Map(offers.map(offer => [offer.id, offer]));
  const visible = rules.filter(rule => filter === "all" || rule.effect === filter);

  return <div className="config-split">
    <div className="rule-column">
      <div className="config-toolbar">
        <div className="segmented">{([["all", "Todas"], ["allow", "Permiten"], ["block", "Bloquean"]] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
        <span className="muted-note">{rules.filter(rule => rule.is_active).length} activas de {rules.length} · mayor prioridad se evalúa primero</span>
      </div>
      {visible.map(rule => <RuleCard key={rule.id} rule={rule} facts={facts} offers={ruleOffers.filter(link => link.rule_id === rule.id).map(link => offersById.get(link.offer_id)).filter((offer): offer is Offer => Boolean(offer))} />)}
    </div>
    <RuleTester customers={customers} />
  </div>;
}
