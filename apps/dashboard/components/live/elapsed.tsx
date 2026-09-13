"use client";

import { useEffect, useState } from "react";
import { secondsToClock } from "@/lib/prevention";

export function Elapsed({ since, until }: { since: string; until?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [until]);
  const end = until ? new Date(until).getTime() : now;
  return <span className="elapsed">{secondsToClock(Math.max(0, (end - new Date(since).getTime()) / 1000))}</span>;
}
