"use client";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="empty-state"><h1>No pudimos cargar esta vista.</h1><p>Intenta nuevamente para recuperar la información de demostración.</p><Button onClick={reset}>Reintentar</Button></div>;
}
