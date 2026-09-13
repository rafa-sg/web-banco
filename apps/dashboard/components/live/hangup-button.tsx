"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hangupConversation } from "@/app/(app)/actions";
import { humanize, outcomeLabels } from "@/lib/prevention";

/** "Colgar": pide confirmación y cierra la conversación en el agente para que no quede abierta. */
export function HangupButton({ conversationId, customerName, variant = "outline" }: { conversationId: string; customerName: string; variant?: "outline" | "default" }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!confirming) return;
    cancel.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !pending) close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, pending]);

  function close() {
    setConfirming(false);
    trigger.current?.focus();
  }

  function hangup() {
    startTransition(async () => {
      const outcome = await hangupConversation(conversationId);
      setConfirming(false);
      setMessage(outcome.ok
        ? { ok: true, text: outcome.alreadyClosed ? "La conversación ya estaba cerrada." : `Llamada finalizada · ${humanize(outcome.outcome, outcomeLabels)}` }
        : { ok: false, text: `No se pudo colgar: ${outcome.error}` });
      router.refresh();
    });
  }

  return <>
    <Button ref={trigger} size="sm" variant={variant} className="button-danger" onClick={event => { event.preventDefault(); event.stopPropagation(); setMessage(null); setConfirming(true); }}>
      <PhoneOff size={13} /> Colgar
    </Button>

    {confirming && <div className="modal-backdrop" role="presentation" onClick={() => !pending && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={`hangup-${conversationId}`} onClick={event => event.stopPropagation()}>
        <div className="modal-heading"><h2 id={`hangup-${conversationId}`}>¿Colgar la llamada con {customerName}?</h2><button className="icon-link" aria-label="Cerrar" onClick={close} disabled={pending}><X size={16} /></button></div>
        <p>La conversación se cierra con el resultado que tenga hasta ahora. Si ya se registró una promesa, se conserva y se envía su confirmación.</p>
        <ul className="modal-rules">
          <li>Simulada: el agente deja de responder de inmediato.</li>
          <li>Real: el agente se despide y corta en su siguiente turno.</li>
          <li>Si la conversación quedó atascada, esto la cierra.</li>
        </ul>
        <div className="modal-actions"><Button ref={cancel} variant="outline" onClick={close} disabled={pending}>Seguir en la llamada</Button><Button className="button-danger-solid" onClick={hangup} disabled={pending}><PhoneOff size={14} /> {pending ? "Colgando…" : "Colgar"}</Button></div>
      </div>
    </div>}

    {message && <div className={`toast ${message.ok ? "toast-ok" : "toast-error"}`} role="status">
      {!message.ok && <TriangleAlert size={17} />}
      <span>{message.text}</span>
      <button aria-label="Cerrar aviso" onClick={() => setMessage(null)}><X size={15} /></button>
    </div>}
  </>;
}
