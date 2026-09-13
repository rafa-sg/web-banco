"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/prevention/grade-badge";
import { Toggle } from "@/components/config/toggle";
import { setChannelByGrade, setOfferActive, setRunLimits, type ActionResult } from "@/app/(app)/configuracion/actions";
import { gradeLabels } from "@/lib/prevention";
import type { Grade, Offer } from "@/lib/types";

const GRADES: Grade[] = ["A", "B", "C", "D", "E"];
const CHANNEL_OPTIONS = [
  { value: "email", label: "Correo", icon: Mail },
  { value: "voice", label: "Llamada del agente", icon: Phone },
  { value: "human", label: "Asesor humano", icon: UserRound },
];

function SaveBar({ dirty, pending, result, onSave, onDiscard }: { dirty: boolean; pending: boolean; result: ActionResult | null; onSave: () => void; onDiscard: () => void }) {
  return <div className="essential-save">
    {result && !result.ok && <p className="form-error">{result.error}</p>}
    {result?.ok && !dirty && <p className="form-ok">Guardado. Aplica desde la próxima corrida.</p>}
    {dirty && <><Button size="sm" variant="ghost" onClick={onDiscard} disabled={pending}>Descartar</Button><Button size="sm" onClick={onSave} disabled={pending}>{pending ? "Guardando…" : "Guardar cambios"}</Button></>}
  </div>;
}

export function ChannelByGradeEditor({ policyId, initial }: { policyId: string; initial: Record<string, string> }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = GRADES.some(grade => values[grade] !== saved[grade]);

  return <section className="panel essential-card" aria-labelledby="channel-grade-title">
    <h2 id="channel-grade-title">¿Por qué canal se contacta a cada cliente?</h2>
    <p className="essential-intro">Según su nivel de riesgo. A es el más bajo y E el más alto.</p>
    <ul className="grade-channel-list">{GRADES.map(grade => <li key={grade}>
      <GradeBadge grade={grade} /><span>{gradeLabels[grade].split(" · ")[1]}</span>
      <select aria-label={`Canal para grado ${grade}`} value={values[grade] ?? "email"} onChange={event => { setValues(current => ({ ...current, [grade]: event.target.value })); setResult(null); }} disabled={pending}>
        {CHANNEL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </li>)}</ul>
    <SaveBar dirty={dirty} pending={pending} result={result} onDiscard={() => setValues(saved)} onSave={() => start(async () => {
      const outcome = await setChannelByGrade(policyId, values);
      setResult(outcome);
      if (outcome.ok) setSaved(values);
    })} />
  </section>;
}

export function RunLimitsEditor({ policyId, maxCalls, emailFallback }: { policyId: string; maxCalls: number; emailFallback: boolean }) {
  const [calls, setCalls] = useState(String(maxCalls));
  const [fallback, setFallback] = useState(emailFallback);
  const [saved, setSaved] = useState({ calls: String(maxCalls), fallback: emailFallback });
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const dirty = calls !== saved.calls || fallback !== saved.fallback;

  return <section className="panel essential-card" aria-labelledby="run-limits-title">
    <h2 id="run-limits-title">Límites de la corrida</h2>
    <p className="essential-intro">Protegen el costo y evitan saturar a los clientes cada vez que se presiona “Iniciar corrida”.</p>
    <div className="essential-field">
      <label htmlFor="max-calls"><strong>Llamadas reales por corrida</strong><small>Las demás se simulan o reciben correo.</small></label>
      <input id="max-calls" type="number" min={0} max={50} value={calls} onChange={event => { setCalls(event.target.value); setResult(null); }} disabled={pending} />
    </div>
    <div className="essential-field">
      <span><strong>Si no contesta, enviar correo</strong><small>El cliente recibe un correo de seguimiento con opciones.</small></span>
      <Toggle checked={fallback} label="Enviar correo si no contesta" disabled={pending} onChange={value => { setFallback(value); setResult(null); }} />
    </div>
    <SaveBar dirty={dirty} pending={pending} result={result} onDiscard={() => { setCalls(saved.calls); setFallback(saved.fallback); }} onSave={() => start(async () => {
      const outcome = await setRunLimits(policyId, { maxCallsPerRun: Number(calls), emailFallback: fallback });
      setResult(outcome);
      if (outcome.ok) setSaved({ calls, fallback });
    })} />
  </section>;
}

function OfferToggle({ offer }: { offer: Offer }) {
  const [active, setActive] = useState(offer.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return <li className={active ? "" : "essential-offer-off"}>
    <div title={offer.code}><strong>{offer.name}</strong>{offer.description && <small>{offer.description}</small>}{error && <small className="form-error">{error}</small>}</div>
    {offer.requires_approval && <span className="param-chip">Requiere aprobación</span>}
    <Toggle checked={active} label={`${active ? "Desactivar" : "Activar"} ${offer.name}`} disabled={pending} onChange={value => { setActive(value); start(async () => { const outcome = await setOfferActive(offer.id, value); if (!outcome.ok) { setActive(!value); setError(outcome.error); } else setError(null); }); }} />
  </li>;
}

export function OfferSwitches({ offers }: { offers: Offer[] }) {
  return <section className="panel essential-card essential-wide" aria-labelledby="offer-switches-title">
    <h2 id="offer-switches-title">¿Qué puede ofrecer el agente?</h2>
    <p className="essential-intro">Apague una opción y el agente deja de ofrecerla desde la siguiente conversación. Los límites de cada oferta (días, montos) los valida el sistema.</p>
    <ul className="essential-offers">{offers.map(offer => <OfferToggle key={offer.id} offer={offer} />)}</ul>
  </section>;
}
