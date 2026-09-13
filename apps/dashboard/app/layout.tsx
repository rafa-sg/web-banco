import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/components/demo-provider";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bancoagrícola · Banca inteligente",
  description: "Prototipo de analítica de cobranza preventiva. Entropía Hack 2026. Datos ficticios.",
  robots: { index: false, follow: false },
};

// A request-time anchor keeps relative demo dates current and hydration deterministic.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-SV"><body><DemoProvider reference={new Date().toISOString()}><AppShell>{children}</AppShell></DemoProvider></body></html>;
}
