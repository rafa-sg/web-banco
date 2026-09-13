import type { Metadata } from "next";
import "@fontsource-variable/instrument-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bancoagrícola · Centro de Control de Prevención",
  description: "Centro de control de cobranza preventiva. Entropía Hack 2026. Datos ficticios.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-SV"><body>{children}</body></html>;
}
