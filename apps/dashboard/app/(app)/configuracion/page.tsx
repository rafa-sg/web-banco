import Link from "next/link";
import { Ban, BookOpen, Bot, Clock, Info, MessageSquareOff, ShieldCheck } from "lucide-react";
import { ApprovalsList } from "@/components/config/approvals-list";
import { EscalationsList } from "@/components/config/escalations-list";
import { OffersList } from "@/components/config/offers-list";
import { RulesManager } from "@/components/config/rules-manager";
import { channelLabels, gradeColors, humanize, bandToGrade, weekdayLabels } from "@/lib/prevention";
import {
  getActivePolicy, getEscalations, getOffers, getPendingCommitments, getPlaybooksConfig, getRulesConfig,
} from "@/lib/supabase/queries";
import type { RiskBand } from "@/lib/types";

const TABS = [
  { key: "reglas", label: "Reglas" },
  { key: "ofertas", label: "Ofertas" },
  { key: "playbooks", label: "Playbooks" },
  { key: "politicas", label: "Políticas" },
  { key: "aprobaciones", label: "Aprobaciones" },
  { key: "escalaciones", label: "Escalaciones" },
  { key: "educacion", label: "Educación" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some(item => item.key === rawTab) ? rawTab as Tab : "reglas";
  const [pending, escalations] = await Promise.all([getPendingCommitments(), getEscalations()]);
  const openEscalations = escalations.filter(item => item.status !== "resolved").length;
  const badges: Partial<Record<Tab, number>> = { aprobaciones: pending.length, escalaciones: openEscalations };

  return <div className="page-enter">
    <div className="page-heading">
      <div>
        <span className="eyebrow">LO QUE CONTROLA EL NEGOCIO</span>
        <h1>Configuración<span className="heading-dot">.</span></h1>
        <p>Reglas, ofertas, playbooks y políticas que guían al agente, más las decisiones que requieren a una persona.</p>
      </div>
    </div>

    <nav className="tabs" aria-label="Secciones de configuración">
      {TABS.map(item => <Link key={item.key} href={`/configuracion?tab=${item.key}`} className="tab" aria-current={tab === item.key ? "page" : undefined}>{item.label}{badges[item.key] ? <span className="live-count">{badges[item.key]}</span> : null}</Link>)}
    </nav>

    {tab === "reglas" && <RulesTab />}
    {tab === "ofertas" && <OffersTab />}
    {tab === "playbooks" && <PlaybooksTab />}
    {tab === "politicas" && <PolicyTab />}
    {tab === "aprobaciones" && <ApprovalsList items={pending} />}
    {tab === "escalaciones" && <EscalationsList items={escalations} />}
    {tab === "educacion" && <section className="panel coming-soon"><span className="policy-icon"><BookOpen size={22} /></span><div><h2>Cápsulas educativas</h2><p>Las cápsulas de 15–20 segundos (título, duración, video, guion y a quién aplican) dependen de la tabla <code>education_contents</code>, que llega con la migración del motor de prevención. Aún no existe en Supabase.</p></div></section>}
  </div>;
}

async function RulesTab() {
  const { rules, facts, offers, ruleOffers, customers } = await getRulesConfig();
  return <RulesManager rules={rules} facts={facts} offers={offers} ruleOffers={ruleOffers} customers={customers} />;
}

async function OffersTab() {
  return <OffersList offers={await getOffers()} />;
}

async function PlaybooksTab() {
  const { playbooks, stages, criteria } = await getPlaybooksConfig();
  const criteriaLabels = new Map(criteria.map(item => [item.key, item.label]));
  return <div className="stack">{playbooks.map(playbook => {
    const playbookStages = stages.filter(stage => stage.playbook_id === playbook.id);
    return <section key={playbook.id} className={`panel ${playbook.is_active ? "" : "rule-card-inactive"}`}>
      <div className="panel-heading"><div><span className="eyebrow">{playbook.key}</span><h2>{playbook.name}</h2></div><span className={`status-pill ${playbook.is_active ? "status-done" : "status-open"}`}>{playbook.is_active ? "Activo" : "Inactivo"}</span></div>
      {playbook.description && <p className="panel-description">{playbook.description}</p>}
      <p className="rule-meta">Canales: {(playbook.channel_scope ?? []).map(channel => channelLabels[channel] ?? channel).join(" · ") || "—"}</p>
      <ol className="playbook-stages">{playbookStages.map(stage => <li key={stage.id} className={stage.is_terminal ? "stage-terminal" : ""}>
        <span className="stage-number">{stage.position}</span>
        <div>
          <div className="stage-title"><strong>{stage.name}</strong>{stage.allows_offers && <span className="param-chip">Permite ofertas</span>}{stage.max_turns != null && <span className="param-chip">Máx. {stage.max_turns} turnos</span>}{stage.is_terminal && <span className="param-chip">Cierre</span>}</div>
          {stage.objective && <p>{stage.objective}</p>}
          {(stage.criteria ?? []).length > 0 && <div className="signal-chips">{stage.criteria!.map(key => <span key={key} className="signal-chip">{criteriaLabels.get(key) ?? humanize(key)}</span>)}</div>}
          {stage.agent_instructions && <details className="stage-instructions"><summary>Instrucciones al agente</summary><p>{stage.agent_instructions}</p></details>}
        </div>
      </li>)}</ol>
    </section>;
  })}</div>;
}

async function PolicyTab() {
  const policy = await getActivePolicy();
  if (!policy) return <section className="panel empty-state"><h3>No hay una política activa</h3><p>Activa una política en Supabase para mostrarla aquí.</p></section>;
  const bands = Object.entries(policy.risk_bands ?? {}).sort((a, b) => a[1][0] - b[1][0]);
  const weights = Object.entries(policy.risk_weights ?? {}).sort((a, b) => b[1] - a[1]);
  const maxWeight = Math.max(1, ...weights.map(([, value]) => value));

  return <div className="stack">
    <div className="policy-banner"><div className="policy-icon"><ShieldCheck size={24} /></div><div><strong>{policy.name}</strong><p>Versión {policy.version} · playbook por defecto {humanize(policy.default_playbook_key)}</p></div><span className="neutral-badge">Solo lectura</span></div>
    <div className="policy-grid">
      <section className="panel policy-card"><span className="policy-number"><Bot size={16} /></span><h2>Identidad del asistente</h2><dl>
        <div><dt>Nombre</dt><dd>{policy.assistant_name ?? "—"}</dd></div>
        <div><dt>Frase de apertura obligatoria</dt><dd>“{policy.disclosure_text ?? "—"}”</dd></div>
        <div><dt>Contacto en vivo</dt><dd>{policy.live_contact_allowlist_only ? "Solo números habilitados para la demo" : "Todos los contactables"}</dd></div>
      </dl></section>
      <section className="panel policy-card"><span className="policy-number"><Clock size={16} /></span><h2>Límites de contacto</h2><dl>
        <div><dt>Contactos por semana</dt><dd>Máximo {policy.max_contacts_per_week ?? "—"}</dd></div>
        <div><dt>Tiempo entre contactos</dt><dd>{policy.cooldown_hours ?? "—"} horas</dd></div>
        <div><dt>Horario silencioso</dt><dd>{policy.quiet_hours?.start ?? "—"} a {policy.quiet_hours?.end ?? "—"}</dd></div>
        <div><dt>Días sin contacto</dt><dd>{(policy.forbidden_weekdays ?? []).map(day => weekdayLabels[day] ?? day).join(", ") || "Ninguno"}</dd></div>
      </dl></section>
      <section className="panel policy-card"><span className="policy-number"><MessageSquareOff size={16} /></span><h2>Conversación</h2><dl>
        <div><dt>Turnos por conversación</dt><dd>Máximo {policy.max_turns_per_conversation ?? "—"}</dd></div>
        <div><dt>Ofertas presentadas</dt><dd>Máximo {policy.max_offers_presented ?? "—"}</dd></div>
        <div><dt>Vigencia del link de pago</dt><dd>{policy.payment_link_ttl_hours ?? "—"} horas</dd></div>
      </dl></section>
    </div>

    <div className="equal-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">CALIFICACIÓN</span><h2>Bandas de riesgo</h2></div></div>
        <ul className="band-list">{bands.map(([band, [min, max]]) => {
          const grade = bandToGrade[band as RiskBand];
          return <li key={band}><i style={{ background: grade ? gradeColors[grade] : "#b9bbb5" }} /><strong>{grade ? `${grade} · ` : ""}{humanize(band)}</strong><span>{min} – {max}</span></li>;
        })}</ul>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">EXPLICABILIDAD</span><h2>Pesos del riesgo</h2></div></div>
        <div className="factor-bars">{weights.map(([key, value]) => <div key={key} className="factor-bar"><div><strong>{humanize(key)}</strong><b>{value}</b></div><div className="progress-track"><span style={{ width: `${(value / maxWeight) * 100}%` }} /></div></div>)}</div>
      </section>
    </div>

    <div className="equal-grid">
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">ESCALAMIENTO</span><h2>Transiciones globales</h2></div></div>
        <ul className="transition-list">{(policy.global_transitions ?? []).map((transition, index) => <li key={transition.id ?? index}><strong>{transition.label ?? transition.id}</strong><span className="param-chip">→ {humanize(transition.go_to)}</span>{transition.instruction && <p>{transition.instruction}</p>}</li>)}</ul>
      </section>
      <section className="panel"><div className="panel-heading"><div><span className="eyebrow">GUARDRAILS</span><h2>Frases prohibidas</h2></div><Ban size={18} className="muted-icon" /></div>
        {(policy.prohibited_phrases ?? []).length ? <div className="signal-chips">{policy.prohibited_phrases!.map(phrase => <span key={phrase} className="signal-chip signal-chip-danger">{phrase}</span>)}</div> : <p className="muted-note">Sin frases configuradas.</p>}
        <h3 className="subheading">Modelos por defecto</h3>
        <dl className="profile-list">{Object.entries(policy.default_models ?? {}).map(([role, model]) => <div key={role}><dt>{humanize(role)}</dt><dd>{model}</dd></div>)}</dl>
      </section>
    </div>
    <p className="info-caption"><Info size={15} /> La edición de políticas se hará con control de versiones; por ahora esta vista es de solo lectura.</p>
  </div>;
}
