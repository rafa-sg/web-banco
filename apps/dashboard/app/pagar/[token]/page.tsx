import { createClient } from "@/lib/supabase/server";
import { PaymentCard } from "@/app/pagar/[token]/payment-card";

export const metadata = { title: "Pago simulado · Bancoagrícola (demo)", robots: { index: false, follow: false } };

export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_payment_link", { p_token: token });
  const raw = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : Array.isArray(data) && data[0] ? data[0] as Record<string, unknown> : null;
  const link = raw && raw.found !== false ? raw : null;

  return <div className="public-screen">
    <PaymentCard token={token} link={link} error={error?.message ?? (link ? null : "Este enlace no existe o ya no está disponible.")} />
  </div>;
}
