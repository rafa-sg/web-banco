"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Refresca los datos del servidor cuando cambian las tablas indicadas (con un pequeño debounce). */
export function LiveRefresh({ tables, channelName }: { tables: string[]; channelName: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(channelName);
    for (const table of tablesKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      });
    }
    channel.subscribe(state => setStatus(state === "SUBSCRIBED" ? "live" : state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED" ? "offline" : "connecting"));
    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, router]);

  return <span className={`live-status live-status-${status}`}><i />{status === "live" ? "En tiempo real" : status === "offline" ? "Sin conexión en tiempo real" : "Conectando…"}</span>;
}
