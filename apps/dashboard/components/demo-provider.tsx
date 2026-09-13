"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ChannelFilter } from "@/lib/demo-data";

type DemoContext = { reference: string; period: number; setPeriod: (period: number) => void; channel: ChannelFilter; setChannel: (channel: ChannelFilter) => void };
const Context = createContext<DemoContext | null>(null);

export function DemoProvider({ reference, children }: { reference: string; children: ReactNode }) {
  const [period, setPeriod] = useState(30);
  const [channel, setChannel] = useState<ChannelFilter>("all");
  return <Context.Provider value={{ reference, period, setPeriod, channel, setChannel }}>{children}</Context.Provider>;
}

export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider is required");
  return value;
}
