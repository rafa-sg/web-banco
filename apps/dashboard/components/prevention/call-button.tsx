"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCustomerCall } from "@/app/(app)/actions";

/** Cada clic puede disparar una llamada real con costo: el botón se bloquea mientras la petición está en curso. */
export function CallButton({ customerId, disabledReason }: { customerId: string; disabledReason: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  function call() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    startTransition(async () => {
      const outcome = await startCustomerCall(customerId);
      if (outcome.ok) {
        router.push(`/conversaciones/${outcome.conversationId}`);
        return;
      }
      inFlight.current = false;
      setError(outcome.error);
    });
  }

  if (disabledReason) return <span title={disabledReason}><Button disabled><Phone size={15} /> Empezar llamada</Button></span>;

  return <>
    <Button onClick={call} disabled={pending}><Phone size={15} /> {pending ? "Llamando…" : "Empezar llamada"}</Button>
    {error && <div className="toast toast-error" role="status">
      <TriangleAlert size={17} />
      <span>No se pudo iniciar la llamada: {error}</span>
      <button aria-label="Cerrar aviso" onClick={() => setError(null)}><X size={15} /></button>
    </div>}
  </>;
}
