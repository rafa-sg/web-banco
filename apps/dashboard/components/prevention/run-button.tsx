"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Info, Play, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentStatus, startPreventionRun, type AgentStatus, type RunResult } from "@/app/(app)/actions";

export function RunButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function openModal() {
    setResult(null);
    setStatus(null);
    setOpen(true);
    getAgentStatus().then(setStatus);
  }

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function confirm() {
    startTransition(async () => {
      const outcome = await startPreventionRun();
      setResult(outcome);
      close();
      if (outcome.ok) router.refresh();
    });
  }

  const mode = (real: boolean) => real ? <strong className="mode-real">reales</strong> : <strong className="mode-simulated">simuladas</strong>;

  return <>
    <Button ref={trigger} onClick={openModal}><Play size={15} /> Iniciar corrida</Button>

    {open && <div className="modal-backdrop" role="presentation" onClick={() => !pending && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="run-title" onClick={event => event.stopPropagation()}>
        <div className="modal-heading"><h2 id="run-title">Iniciar corrida de prevención</h2><button className="icon-link" aria-label="Cerrar" onClick={close} disabled={pending}><X size={16} /></button></div>
        <p>Recalcula el riesgo con los datos actuales, decide la mejor intervención para cada cliente y la ejecuta.</p>
        <p className="modal-scope"><Info size={14} /> Aplica a <b>toda la cartera</b> que vence en los próximos 10 días. Los filtros de la tabla no cambian el alcance.</p>
        <ul className="modal-rules">
          <li>Grados C, D y E: llama el agente de voz</li>
          <li>Grados A y B: correo preventivo con recordatorio y video</li>
          <li>Si no contesta o no se le puede llamar: correo de seguimiento</li>
          <li>Excluye bloqueados (opt-out, disputa, frecuencia) y el grupo de control</li>
        </ul>
        <div className="modal-mode" aria-live="polite">
          {status == null ? <span>Consultando el modo del agente…</span>
            : status.online ? <span>Llamadas {mode(status.voice === "elevenlabs")} · correos {mode(status.email === "resend")}</span>
              : <span className="mode-offline"><TriangleAlert size={14} /> El agente no responde: la corrida fallará ({status.error})</span>}
        </div>
        <div className="modal-actions"><Button ref={cancel} variant="outline" onClick={close} disabled={pending}>Cancelar</Button><Button onClick={confirm} disabled={pending || (status != null && !status.online)}>{pending ? "Calculando y despachando…" : "Confirmar corrida"}</Button></div>
      </div>
    </div>}

    {result && <div className={`toast ${result.ok ? "toast-ok" : "toast-error"}`} role="status">
      {result.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}
      <span>{result.ok ? result.summary : `No se pudo iniciar la corrida: ${result.error}`}</span>
      {result.ok && result.live && <Link href="/en-vivo" className="icon-link">Ver en vivo</Link>}
      <button aria-label="Cerrar aviso" onClick={() => setResult(null)}><X size={15} /></button>
    </div>}
  </>;
}
