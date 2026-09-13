"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, BarChart3, ChevronRight, CircleHelp, FileCheck2, Headphones, LayoutDashboard, Menu, MessageSquareText, ShieldCheck, X, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/components/demo-provider";
import { dateLabel } from "@/lib/demo-data";

export const navigation = [
  { href: "/", label: "Resumen general", icon: LayoutDashboard, group: "ANALÍTICA" },
  { href: "/riesgo", label: "Atención preventiva", icon: Users },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageSquareText },
  { href: "/compromisos", label: "Compromisos de pago", icon: FileCheck2 },
  { href: "/analitica", label: "Resultados e impacto", icon: BarChart3 },
  { href: "/escalaciones", label: "Atención humana", icon: Headphones, group: "GOBERNANZA" },
  { href: "/politicas", label: "Políticas del agente", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reference } = useDemo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const current = navigation.find(item => item.href === pathname);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [mobileOpen]);

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Saltar al contenido</a>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <Link href="/" className="brand" aria-label="Bancoagrícola · Resumen general" onClick={() => setMobileOpen(false)}><Image src="/brand/bancoagricola-footer.png" alt="Bancoagrícola" width={286} height={40} priority className="official-logo" /></Link>
      <div className="workspace-label"><span className="workspace-icon"><Activity size={15} /></span><div>Banca inteligente<small>Cobranza preventiva</small></div><span className="workspace-version">01</span></div>
      <nav aria-label="Navegación principal">
        {navigation.map(item => <div key={item.href}>
          {item.group && <p className="nav-group">{item.group}</p>}
          <Link href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setMobileOpen(false)}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{pathname === item.href && <span className="active-dot" />}</Link>
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="purpose-note"><span className="purpose-icon">↗</span><p>Anticipar es<br /><strong>cuidar el futuro.</strong></p><div className="purpose-line" /></div>
        <Button variant="ghost" className="help-button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen}><CircleHelp size={17} /> Acerca de esta demo <ChevronRight size={14} /></Button>
        {helpOpen && <div className="help-content">Prototipo del reto Entropía Hack 2026. Los 72 perfiles y todas las gestiones son ficticios. No hay envíos ni conexiones bancarias.</div>}
        <div className="profile"><span className="avatar profile-avatar">EA</span><div>Equipo de analítica<small>Espacio de demostración</small></div><ArrowUpRight size={16} aria-hidden="true" /></div>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <Button variant="ghost" size="icon" className="mobile-toggle" aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</Button>
        <div className="breadcrumb"><span>Centro de analítica</span><ChevronRight size={13} /><strong>{current?.label ?? "Ficha del cliente"}</strong></div>
        <div className="topbar-right"><span className="demo-badge"><span /> Datos de demostración</span><span className="topbar-date">{dateLabel(reference, 0, true)}<small>El Salvador · GMT−6</small></span><span className="top-avatar">EA</span></div>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="footer"><span>Bancoagrícola <span>·</span> Banca inteligente</span><span>Entropía Hack 2026 <span>·</span> Prototipo con datos ficticios</span></footer>
    </div>
  </div>;
}
