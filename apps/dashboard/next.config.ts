import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

// `next dev` usa su propia carpeta: si alguien corre `next build` con el servidor
// encendido, el build ya no reescribe los archivos del dev (CSS 404, módulos rotos).
export default function config(phase: string): NextConfig {
  return {
    poweredByHeader: false,
    devIndicators: false,
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
  };
}
