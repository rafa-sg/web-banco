"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Play, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDetection, type RunResult } from "@/app/(app)/actions";

export function RunButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const outcome = await runDetection();
      setResult(outcome);
      setOpen(false);
      if (outcome.ok) router.refresh();
    });
  }

  return <>
    <Button onClick={() => { setResult(null); setOpen(true); }}><Play size={15} /> Iniciar corrida</Button>

    {open && <div className="modal-backdrop" role="presentation" onClick={() => !pending && setOpen(false)}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="run-title" onClick={event => event.stopPropagation()}>
        <div className="modal-heading"><h2 id="run-title">Iniciar corrida de prevención</h2><button className="icon-link" aria-label="Cerrar" onClick={() => setOpen(false)} disabled={pending}><X size={16} /></button></div>
        <p>Recalcula el riesgo con los datos actuales y crea las intervenciones que correspondan según las reglas activas.</p>
        <ul className="modal-rules">
          <li>Grados C, D y E</li>
          <li>Excluye clientes bloqueados (opt-out, disputa, frecuencia)</li>
          <li>El grupo de control se excluye siempre</li>
        </ul>
        <div className="modal-actions"><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancelar</Button><Button onClick={confirm} disabled={pending}>{pending ? "Calculando…" : "Confirmar corrida"}</Button></div>
      </div>
    </div>}

    {result && <div className={`toast ${result.ok ? "toast-ok" : "toast-error"}`} role="status">
      {result.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}
      <span>{result.ok ? result.summary : `No se pudo iniciar la corrida: ${result.error}`}</span>
      <button aria-label="Cerrar aviso" onClick={() => setResult(null)}><X size={15} /></button>
    </div>}
  </>;
}
