"use client";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Un fallo de consulta no es "sin datos": se dice explícitamente para no confundir error con cero registros. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="empty-state">
    <TriangleAlert size={30} />
    <h1>No pudimos consultar los datos.</h1>
    <p>Esto es un error de conexión o de consulta, no una lista vacía. Las cifras de esta vista no están disponibles hasta reintentar.</p>
    {process.env.NODE_ENV !== "production" && error.message && <p className="muted-note">{error.message}</p>}
    <Button onClick={reset}>Reintentar</Button>
  </div>;
}
