"use client";

import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyMetric } from "@/lib/types";

const axisTick = { fill: "#82827d", fontSize: 12 };
const tooltipStyle = { border: "1px solid #e9e9e5", borderRadius: 10, fontSize: 13 };

export function CohortChart({ data }: { data: { label: string; rate: number; color: string }[] }) {
  return <div className="impact-chart" role="img" aria-label={data.map(item => `${item.label}: ${item.rate}% de mora`).join(". ")}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: -18, bottom: 0 }} accessibilityLayer>
        <CartesianGrid stroke="#ecece8" vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={axisTick} unit="%" domain={[0, 100]} />
        <Tooltip cursor={{ fill: "#f5f5f0" }} contentStyle={tooltipStyle} formatter={value => [`${value}%`, "Tasa de mora"]} />
        <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={72} isAnimationActive={false}>
          {data.map(item => <Cell key={item.label} fill={item.color} />)}
          <LabelList dataKey="rate" position="top" formatter={(value: unknown) => `${value}%`} style={{ fontSize: 13, fontWeight: 600, fill: "#2c2a29" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>;
}

export function DailyChart({ data }: { data: DailyMetric[] }) {
  const rows = data.map(row => ({
    ...row,
    label: new Intl.DateTimeFormat("es-SV", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${row.day}T00:00:00Z`)),
  }));
  return <div className="impact-chart impact-chart-wide" role="img" aria-label="Conversaciones y compromisos por día">
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={rows} margin={{ top: 12, right: 8, left: -22, bottom: 0 }} accessibilityLayer>
        <CartesianGrid stroke="#ecece8" vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} dy={8} minTickGap={18} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={axisTick} />
        <Tooltip cursor={{ fill: "#f5f5f0" }} contentStyle={tooltipStyle} />
        <Bar name="Conversaciones" dataKey="conversations" fill="#fdda24" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        <Line name="Compromisos" dataKey="commitments" type="monotone" stroke="#9063cd" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        <Line name="Escalaciones" dataKey="escalations" type="monotone" stroke="#e8639f" strokeWidth={2} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

export type ChannelRate = { channel: string; label: string; color: string; conversations: number; response: number | null; commitment: number | null; kept: number | null };

const RATE_METRICS = [
  { key: "response", label: "Contestan" },
  { key: "commitment", label: "Llegan a compromiso" },
  { key: "kept", label: "Cumplen" },
] as const;

/** Canales comparados en las mismas 3 tasas: un grupo por métrica, una barra por canal (color fijo por canal). */
export function ChannelChart({ channels }: { channels: ChannelRate[] }) {
  const rows = RATE_METRICS.map(metric => ({ metric: metric.label, ...Object.fromEntries(channels.map(channel => [channel.channel, channel[metric.key] ?? 0])) }));
  const describe = channels.map(channel => `${channel.label}: contestan ${channel.response ?? 0}%, compromiso ${channel.commitment ?? 0}%, cumplen ${channel.kept ?? 0}%`).join(". ");
  return <div className="impact-chart" role="img" aria-label={describe}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={rows} margin={{ top: 24, right: 8, left: -18, bottom: 0 }} barGap={2} accessibilityLayer>
        <CartesianGrid stroke="#ecece8" vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={axisTick} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={axisTick} unit="%" domain={[0, 100]} />
        <Tooltip cursor={{ fill: "#f5f5f0" }} contentStyle={tooltipStyle} formatter={(value, name) => [`${value}%`, channels.find(channel => channel.channel === name)?.label ?? name]} />
        {channels.map(channel => <Bar key={channel.channel} dataKey={channel.channel} name={channel.channel} fill={channel.color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
          <LabelList dataKey={channel.channel} position="top" formatter={(value: unknown) => `${value}%`} style={{ fontSize: 12, fontWeight: 600, fill: "#2c2a29" }} />
        </Bar>)}
      </BarChart>
    </ResponsiveContainer>
  </div>;
}
