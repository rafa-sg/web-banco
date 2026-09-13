"use client";

import { useState, useTransition } from "react";
import { BadgeCheck, Link2 } from "lucide-react";
import { Toggle } from "@/components/config/toggle";
import { setOfferActive } from "@/app/(app)/configuracion/actions";
import { humanize } from "@/lib/prevention";
import type { Offer } from "@/lib/types";

function OfferCard({ offer }: { offer: Offer }) {
  const [active, setActive] = useState(offer.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const params = Object.entries(offer.params ?? {});

  return <article className={`panel offer-card ${active ? "" : "rule-card-inactive"}`}>
    <div className="rule-card-head">
      <div className="rule-card-title"><strong>{offer.name}</strong><small>{offer.code} · {humanize(offer.offer_type)}</small></div>
      <Toggle checked={active} label={`${active ? "Desactivar" : "Activar"} ${offer.name}`} disabled={pending} onChange={value => { setActive(value); start(async () => { const result = await setOfferActive(offer.id, value); if (!result.ok) { setActive(!value); setError(result.error); } else setError(null); }); }} />
    </div>
    {offer.description && <p className="rule-description">{offer.description}</p>}
    {params.length > 0 && <div className="param-chips">{params.map(([key, value]) => <span key={key} className="param-chip"><b>{humanize(key)}</b>{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>)}</div>}
    <div className="offer-flags">
      {offer.requires_approval && <span className="flag-warn"><BadgeCheck size={13} /> Requiere aprobación</span>}
      {offer.generates_payment_link && <span className="flag-info"><Link2 size={13} /> Genera link de pago</span>}
    </div>
    {error && <p className="form-error">{error}</p>}
  </article>;
}

export function OffersList({ offers }: { offers: Offer[] }) {
  return <div className="offer-grid">{offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}</div>;
}
