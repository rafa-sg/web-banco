import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <div className="empty-state not-found"><span className="eyebrow">404 · PÁGINA NO ENCONTRADA</span><h1>Volvamos a lo importante.</h1><p>La página o el perfil que buscas no existe en esta demostración.</p><Link href="/" className="button button-primary"><ArrowLeft size={16} /> Ir al resumen general</Link></div>;
}
