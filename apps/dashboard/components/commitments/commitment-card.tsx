import { CircleCheck, CircleDashed, ExternalLink, FileX2, Handshake, TriangleAlert } from "lucide-react";
import { commitmentStatusLabels, commitmentTypeLabels, paymentLinkStatusLabels } from "@/lib/conversation";
import { dateLabel, dateTimeLabel, humanize, money, outcomeLabels, unresolvedPlaceholders } from "@/lib/prevention";
import type { Commitment, PaymentLink } from "@/lib/types";

export function CommitmentStatus({ status }: { status: string }) {
  return <span className={`status-pill commitment-${status}`}>{commitmentStatusLabels[status] ?? humanize(status)}</span>;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`promise-check ${ok ? "promise-check-ok" : ""}`}>{ok ? <CircleCheck size={15} /> : <CircleDashed size={15} />}{label}</span>;
}

export function CommitmentCard({ commitment, links, offerName }: { commitment: Commitment; links: PaymentLink[]; offerName: string | null }) {
  const moved = commitment.original_due_date && commitment.committed_date && commitment.original_due_date !== commitment.committed_date;
  const missing = unresolvedPlaceholders(commitment.terms_text);
  return <section className="promise-card" aria-labelledby={`promise-${commitment.id}`}>
    <div className="promise-head">
      <span className="promise-icon"><Handshake size={22} /></span>
      <div>
        <span className="eyebrow">PROMESA DE PAGO</span>
        <strong id={`promise-${commitment.id}`} className="promise-receipt">{commitment.receipt_code}</strong>
      </div>
      <CommitmentStatus status={commitment.status} />
    </div>
    <div className="promise-grid">
      <div><span>Oferta</span><strong>{offerName ?? commitmentTypeLabels[commitment.commitment_type] ?? humanize(commitment.offer_code)}</strong><small>{commitment.offer_code}</small></div>
      <div><span>Monto</span><strong>{money(commitment.amount)}</strong></div>
      <div><span>Fecha comprometida</span><strong>{dateLabel(commitment.committed_date, true)}</strong>{moved && <small>Vencía {dateLabel(commitment.original_due_date, true)}</small>}</div>
      <div><span>Registrada</span><strong>{dateTimeLabel(commitment.created_at, true)}</strong></div>
    </div>
    {missing.length > 0
      ? <p className="alert-strip alert-warn"><TriangleAlert size={15} /><span><b>Condiciones incompletas en el registro.</b> Faltan datos ({missing.join(", ")}); no usar este texto como condiciones aceptadas. Monto y fecha de arriba son los registrados.</span></p>
      : commitment.terms_text && <p className="promise-terms">{commitment.terms_text}</p>}
    <div className="promise-checks">
      <Check ok={commitment.customer_confirmed} label="Cliente confirmó" />
      <Check ok={commitment.policy_validated} label="Validada por política" />
      {commitment.requires_approval && <Check ok={commitment.status === "approved" || commitment.status === "kept"} label="Aprobación humana" />}
    </div>
    {links.length > 0 && <ul className="promise-links">{links.map(link => <li key={link.id}>
      <a href={link.url} target="_blank" rel="noreferrer" className="text-link"><ExternalLink size={13} /> Link de pago · {money(link.amount)}</a>
      <span className={`status-pill link-${link.status}`}>{paymentLinkStatusLabels[link.status] ?? humanize(link.status)}</span>
    </li>)}</ul>}
  </section>;
}

/** agreementHint: la conversación tuvo una oferta validada o una confirmación del cliente, pero no hay promesa registrada. */
export function NoCommitmentCard({ outcome, reason, summary, agreementHint = null }: { outcome: string | null; reason: string | null; summary: string | null; agreementHint?: string | null }) {
  return <section className="promise-card promise-card-empty">
    <div className="promise-head">
      <span className="promise-icon"><FileX2 size={22} /></span>
      <div>
        <span className="eyebrow">PROMESA DE PAGO</span>
        <strong className="promise-receipt">Sin promesa de pago</strong>
      </div>
    </div>
    {agreementHint && <p className="alert-strip alert-warn"><TriangleAlert size={15} /><span><b>Acuerdo por verificar.</b> {agreementHint} No hay una promesa registrada: revise condiciones y confirmación antes de dar el caso por cerrado.</span></p>}
    <p className="promise-terms"><b>{humanize(outcome, outcomeLabels)}</b>{reason ? ` · ${reason}` : ""}</p>
    {summary && <p className="promise-summary">{summary}</p>}
  </section>;
}
