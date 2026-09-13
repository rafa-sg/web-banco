# Bancoagrícola · Banca inteligente

Frontend de analítica para **cobranza preventiva**, desarrollado para el reto Bancoagrícola de Entropía Hack 2026. El equipo web transforma la información de riesgo, las conversaciones y los compromisos en una herramienta clara para el equipo de gestión.

**Estado:** primera iteración visual navegable. Usa 72 perfiles ficticios y no requiere credenciales. Aún no está conectado a Supabase, WhatsApp, Vapi ni al motor de decisiones.

## Documentación del proyecto

- [Fases del frontend y criterios de entrega](docs/FASES-FRONTEND.md)
- [Dirección visual y branding](docs/DISENO.md)
- [Contrato de integración y métricas](docs/INTEGRACION.md)
- [Especificación del sistema](CLAUDE.md)

Al revisar esta carpeta no existía un `README.md`. Este documento organiza la parte web a partir de `CLAUDE.md`, los dos mockups originales y la referencia visual aportada. `CLAUDE.md` conserva la prioridad en las decisiones del sistema; los mockups son referencias de interacción, no evidencia de funcionalidades ya implementadas.

## Ejecutar

Requisitos: Node.js 20.9 o superior y pnpm 12.3.4.

```bash
pnpm install
pnpm dev:dashboard
```

Abrir [http://localhost:3000](http://localhost:3000). El servidor se limita a la máquina local.

```bash
pnpm typecheck       # TypeScript estricto
pnpm lint            # ESLint sin advertencias
pnpm build           # Compilación de producción
pnpm start           # Servir la compilación
```

Si el puerto está ocupado, ejecutar `pnpm --filter @bancoagricola/dashboard exec next dev --hostname 127.0.0.1 --port 3001`.

## Qué se puede revisar ahora

| Pantalla | Ruta | Primera iteración |
|---|---|---|
| Resumen general | `/` | KPIs, actividad, cartera, casos prioritarios y canales |
| Atención preventiva | `/riesgo` | Búsqueda, filtro de prioridad, orden y paginación |
| Conversaciones | `/conversaciones` | Gestiones de voz y WhatsApp, acceso al detalle |
| Compromisos | `/compromisos` | Acuerdos, cumplimiento y pagos ficticios |
| Resultados e impacto | `/analitica` | Embudo, canales y requisitos de medición de mora evitada |
| Atención humana | `/escalaciones` | Lista de derivaciones simuladas, de solo lectura |
| Políticas del agente | `/politicas` | Referencia ficticia de políticas v1 de la especificación |
| Ficha del cliente | `/clientes/DEMO-001` | Contexto, tres factores de riesgo y secuencia ilustrativa |

Los filtros de 7, 30 y 90 días y de canal actualizan la selección de datos. La exportación CSV incluye los filtros globales y los perfiles de la vista; los filtros locales de búsqueda y prioridad de la tabla no se exportan. Los gráficos permiten consultar sus valores en una tabla accesible.

Los fixtures contienen actividad de los últimos 28 días: seleccionar 90 días amplía la ventana, sin inventar actividad anterior. Un perfil tiene como máximo una gestión en este prototipo. Las fechas se anclan al momento de la petición y se presentan en `America/El_Salvador`; los montos se almacenan en centavos enteros.

## Organización

```text
apps/dashboard/
  app/                 Rutas Next.js 15 (App Router)
  components/          Pantallas, tablas, gráficos y componentes UI
  components/ui/       Base compatible con shadcn/ui
  lib/demo-data.ts     Fixtures tipados y agregaciones de presentación
  public/brand/        Recursos de identidad visual
docs/                  Fases, diseño y contrato con backend
```

Stack: Next.js 15, React, TypeScript estricto, Tailwind CSS 4, componentes con convenciones shadcn/ui, Recharts, Lucide y tipografía Instrument Sans alojada localmente. El workspace usa pnpm y Turborepo y permite incorporar los paquetes compartidos definidos en `CLAUDE.md`.

El backend, el scoring y las decisiones de política no se implementan en esta entrega del frontend. Las agregaciones de fixtures sirven para revisar la interfaz; al integrar, los contratos y resultados provendrán del sistema compartido. Las claves del agente y la clave `service_role` nunca deben llegar al navegador. El `.env` existente no fue utilizado.

## Próxima iteración

Revisar jerarquía del resumen, densidad de las tablas, proporción de blanco/negro/amarillo y detalle del cliente. La fase 1 tiene una base implementada; su diseño sigue abierto a iteración. Las pantallas de fase 2 ya tienen un prototipo inicial y no se consideran integradas.
