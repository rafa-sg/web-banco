"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, Mail, Phone, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCustomerEmail, startCustomerCall } from "@/app/(app)/actions";

type Notice = { ok: boolean; text: string; href?: string };

/**
 * Acción de contacto según la política de canal por grado: A–B correo, C–E llamada.
 * Cada clic puede disparar un contacto real con costo: el botón se bloquea mientras la petición está en curso.
 */
export function ContactButton({ customerId, channel, disabledReason, size = "default" }: {
  customerId: string;
  channel: "email" | "voice" | null;
  disabledReason: string | null;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);
  const isEmail = channel === "email";
  const Icon = isEmail ? Mail : Phone;
  const idleLabel = isEmail ? (size === "sm" ? "Enviar correo" : "Enviar correo preventivo") : (size === "sm" ? "Llamar" : "Empezar llamada");
  const reason = channel ? disabledReason : "Sin canal definido para este grado";

  function contact() {
    if (inFlight.current || !channel) return;
    inFlight.current = true;
    setNotice(null);
    startTransition(async () => {
      if (isEmail) {
        const outcome = await sendCustomerEmail(customerId);
        inFlight.current = false;
        setNotice(outcome.ok
          ? { ok: true, text: outcome.real ? "Correo preventivo enviado." : "Correo preventivo registrado en modo simulado (no salió a un buzón real).", href: outcome.conversationId ? `/conversaciones/${outcome.conversationId}` : undefined }
          : { ok: false, text: `No se pudo enviar el correo: ${outcome.error}` });
        if (outcome.ok) router.refresh();
        return;
      }
      const outcome = await startCustomerCall(customerId);
      if (outcome.ok) {
        router.push(outcome.conversationId ? `/conversaciones/${outcome.conversationId}` : "/en-vivo");
        return;
      }
      inFlight.current = false;
      setNotice({ ok: false, text: `No se pudo iniciar la llamada: ${outcome.error}` });
    });
  }

  if (reason) return <span title={reason}><Button size={size} variant={size === "sm" ? "outline" : "default"} disabled aria-label={`${idleLabel} (no disponible: ${reason})`}><Icon size={size === "sm" ? 13 : 15} /> {idleLabel}</Button></span>;

  return <>
    <Button size={size} variant={size === "sm" ? "outline" : "default"} onClick={contact} disabled={pending}>
      <Icon size={size === "sm" ? 13 : 15} /> {pending ? (isEmail ? "Enviando…" : "Llamando…") : idleLabel}
    </Button>
    {notice && <div className={`toast ${notice.ok ? "toast-ok" : "toast-error"}`} role="status">
      {notice.ok ? <CircleCheck size={17} /> : <TriangleAlert size={17} />}
      <span>{notice.text}</span>
      {notice.href && <Link href={notice.href} className="icon-link">Ver registro</Link>}
      <button aria-label="Cerrar aviso" onClick={() => setNotice(null)}><X size={15} /></button>
    </div>}
  </>;
}
