"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, CircleHelp, Handshake, LineChart, Menu, Radar, Settings2, X, Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/login/actions";

export const navigation = [
  { href: "/", label: "Centro de prevención", icon: Radar, group: "OPERACIÓN" },
  { href: "/en-vivo", label: "En vivo", icon: Activity },
  { href: "/promesas", label: "Promesas de pago", icon: Handshake },
  { href: "/impacto", label: "Impacto", icon: LineChart, group: "GOBERNANZA" },
  { href: "/configuracion", label: "Configuración", icon: Settings2 },
];

export function AppShell({ children, userEmail, liveCount = 0 }: { children: ReactNode; userEmail?: string | null; liveCount?: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const current = navigation.find(item => item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href)));

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
      <nav aria-label="Navegación principal">
        {navigation.map(item => <div key={item.href}>
          {item.group && <p className="nav-group">{item.group}</p>}
          <Link href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setMobileOpen(false)}><item.icon size={18} strokeWidth={1.7} /><span>{item.label}</span>{item.href === "/en-vivo" && liveCount > 0 && <span className="live-count">{liveCount}</span>}{pathname === item.href && <span className="active-dot" />}</Link>
        </div>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="purpose-note"><span className="purpose-icon">↗</span><p>Anticipar es<br /><strong>cuidar el futuro.</strong></p><div className="purpose-line" /></div>
        <Button variant="ghost" className="help-button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen}><CircleHelp size={17} /> Acerca de esta demo <ChevronRight size={14} /></Button>
        {helpOpen && <div className="help-content">Prototipo del reto Entropía Hack 2026. Los perfiles y gestiones son ficticios. No hay envíos ni conexiones bancarias reales.</div>}
        <form action={signOut} className="profile"><span className="avatar profile-avatar">{userEmail ? userEmail.slice(0, 2).toUpperCase() : "EA"}</span><div>{userEmail ?? "Equipo de cobranza"}<small>Espacio de demostración</small></div><button type="submit" className="icon-link" aria-label="Cerrar sesión"><LogOut size={16} /></button></form>
      </div>
    </aside>
    <div className="main-shell">
      <header className="topbar">
        <Button variant="ghost" size="icon" className="mobile-toggle" aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</Button>
        <div className="breadcrumb"><span>Centro de control</span><ChevronRight size={13} /><strong>{current?.label ?? "Ficha del cliente"}</strong></div>
        <div className="topbar-right"><span className="demo-badge"><span /> Datos de demostración</span><span className="topbar-date">{new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/El_Salvador" }).format(new Date())}<small>El Salvador · GMT−6</small></span><span className="top-avatar">{userEmail ? userEmail.slice(0, 2).toUpperCase() : "EA"}</span></div>
      </header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="footer"><span>Bancoagrícola <span>·</span> Banca inteligente</span><span>Entropía Hack 2026 <span>·</span> Prototipo con datos ficticios</span></footer>
    </div>
  </div>;
}
