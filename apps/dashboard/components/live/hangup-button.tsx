"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PhoneOff, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hangupConversation } from "@/app/(app)/actions";
import { humanize, outcomeLabels } from "@/lib/prevention";

/**
 * "Colgar": pide confirmación y cierra la conversación en el agente para que no quede abierta.
 * Modal y aviso van en un portal a <body>: la tarjeta usa transform al hover, y un position:fixed
 * dentro de un ancestro con transform queda anclado a la tarjeta (el fondo salta al mover el mouse).
 */
export function HangupButton({ conversationId, customerName, channel = "voice", variant = "outline" }: { conversationId: string; customerName: string; channel?: string; variant?: "outline" | "default" }) {
  const isCall = channel === "voice";
  const action = isCall ? "Colgar" : "Cerrar";
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
        ? { ok: true, text: outcome.alreadyClosed ? "La conversación ya estaba cerrada." : `Conversación finalizada · ${humanize(outcome.outcome, outcomeLabels)}` }
        : { ok: false, text: `No se pudo colgar: ${outcome.error}` });
      router.refresh();
    });
  }

  return <>
    <Button ref={trigger} size="sm" variant={variant} className="button-danger" onClick={event => { event.preventDefault(); event.stopPropagation(); setMessage(null); setConfirming(true); }}>
      <PhoneOff size={13} /> {action}
    </Button>

    {confirming && createPortal(<div className="modal-backdrop" role="presentation" onClick={() => !pending && close()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={`hangup-${conversationId}`} onClick={event => event.stopPropagation()}>
        <div className="modal-heading"><h2 id={`hangup-${conversationId}`}>¿{action} la {isCall ? "llamada" : "conversación"} con {customerName}?</h2><button className="icon-link" aria-label="Cerrar" onClick={close} disabled={pending}><X size={16} /></button></div>
        <p>Se cierra con el resultado que tenga hasta ahora. Si ya se registró una promesa, se conserva y se envía su confirmación.</p>
        <ul className="modal-rules">
          <li>El agente deja de responder en esta conversación.</li>
          {isCall && <li>En una llamada real, se despide y corta en su siguiente turno.</li>}
          <li>Sirve para cerrar conversaciones que quedaron abiertas.</li>
        </ul>
        <div className="modal-actions"><Button ref={cancel} variant="outline" onClick={close} disabled={pending}>Seguir {isCall ? "en la llamada" : "en la conversación"}</Button><Button className="button-danger-solid" onClick={hangup} disabled={pending}><PhoneOff size={14} /> {pending ? "Cerrando…" : action}</Button></div>
      </div>
    </div>, document.body)}

    {message && createPortal(<div className={`toast ${message.ok ? "toast-ok" : "toast-error"}`} role="status">
      {!message.ok && <TriangleAlert size={17} />}
      <span>{message.text}</span>
      <button aria-label="Cerrar aviso" onClick={() => setMessage(null)}><X size={15} /></button>
    </div>, document.body)}
  </>;
}
