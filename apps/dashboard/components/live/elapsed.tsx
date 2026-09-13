"use client";

import { useEffect, useState } from "react";
import { secondsToClock } from "@/lib/prevention";

export function Elapsed({ since, until }: { since: string; until?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const end = until ? new Date(until).getTime() : now;
  // El servidor y el navegador calculan "ahora" en momentos distintos (33:00 vs 33:01):
  // la diferencia es esperada y el reloj se corrige en el primer tick del cliente.
  return <span className="elapsed" suppressHydrationWarning>{secondsToClock(Math.max(0, (end - new Date(since).getTime()) / 1000))}</span>;
}
