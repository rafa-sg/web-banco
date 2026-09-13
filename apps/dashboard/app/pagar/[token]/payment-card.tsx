"use client";

import { useState, useTransition } from "react";
import { CircleCheck, Lock, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulatePayment, type PaymentResult } from "@/app/pagar/[token]/actions";
import { dateTimeLabel, humanize, money } from "@/lib/prevention";

function pick(record: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

export function PaymentCard({ token, link, error }: { token: string; link: Record<string, unknown> | null; error: string | null }) {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [pending, start] = useTransition();

  const name = pick(link, ["first_name", "customer_first_name", "customer_name", "full_name"]);
  const amount = pick(link, ["amount", "amount_usd"]);
  const concept = pick(link, ["concept", "description"]);
  const status = String(pick(link, ["status"]) ?? "");
  const expires = pick(link, ["expires_at"]);
  const alreadyPaid = status === "paid";
  const expired = status === "expired";
  const receipt = result?.ok ? pick(result.data, ["receipt_code", "receipt", "payment_id", "id"]) : null;

  return <main className="payment-card">
    <p className="payment-demo"><Lock size={13} /> Pago simulado · demostración sin cobro real</p>
    {error || !link ? <div className="payment-state"><TriangleAlert size={34} /><h1>Enlace no disponible</h1><p>{error}</p></div> :
      result?.ok || alreadyPaid ? <div className="payment-state payment-success"><CircleCheck size={40} /><h1>¡Pago registrado!</h1><p>Gracias{name ? `, ${String(name)}` : ""}. Tu pago de {money(Number(amount))} quedó registrado.</p>{receipt && <p className="payment-receipt">Comprobante: <strong>{String(receipt)}</strong></p>}</div> :
      <>
        <span className="eyebrow">BANCOAGRÍCOLA · DEMO</span>
        <h1>Hola{name ? ` ${String(name)}` : ""}</h1>
        {concept && <p className="payment-concept">{String(concept)}</p>}
        <strong className="payment-amount">{money(Number(amount))}</strong>
        {expires && <p className="payment-expiry">Disponible hasta {dateTimeLabel(String(expires))}</p>}
        {expired ? <p className="form-error">Este enlace venció. Solicita uno nuevo al asistente.</p> :
          <Button className="payment-button" disabled={pending} onClick={() => start(async () => setResult(await simulatePayment(token, "card_demo")))}>{pending ? "Procesando…" : "Pagar"}</Button>}
        {result && !result.ok && <p className="form-error">{result.error}</p>}
        {status && !expired && <p className="payment-expiry">Estado: {humanize(status)}</p>}
      </>}
    <p className="login-note">Entropía Hack 2026 · Datos ficticios · No se procesan pagos reales.</p>
  </main>;
}
