# Fases del frontend · Bancoagrícola

## Alcance y punto de partida

Nuestra responsabilidad es la **web de analítica y seguimiento de cobranza preventiva**. El agente, los canales, el riesgo y las políticas son dependencias del equipo backend. El dashboard consume sus resultados y explica qué pasó; no vuelve a decidir por el agente.

Referencias revisadas:

1. `CLAUDE.md`: arquitectura, modelo, métricas, stack y límites del MVP.
2. `Cobranza Preventiva.dc.html`: resumen, cola, cliente, timeline y gobernanza.
3. `Cobranza Preventiva v2.dc.html`: denominadores explícitos, acuerdo separado del pago, señales explicables, vacíos y errores.
4. Tarjeta de Bancoagrícola aportada por el usuario: identidad de marca y acentos cromáticos.

Se preservan los mockups originales. No se adoptan sus referencias a otros bancos, supuestas políticas aprobadas, modelos de ML, grabaciones almacenadas ni roles adicionales: no corresponden al MVP definido en `CLAUDE.md`.

## Vista de las cinco fases

| Fase | Entrega | Estado actual | Depende de |
|---|---|---|---|
| 1. Base e identidad visual | Dashboard inicial y sistema visual | Implementada una primera iteración; diseño por revisar | Referencias del proyecto |
| 2. Vistas y recorridos | Flujos navegables y estados de interfaz | Prototipos iniciales disponibles | Iteración de fase 1 |
| 3. Datos y tiempo real | Supabase, acceso y eventos del sistema | Pendiente | Contratos, tablas, RLS y backend |
| 4. Analítica y trazabilidad | Métricas verificables y decisiones reconstruibles | Presentación inicial; medición pendiente | Datos integrados de fase 3 |
| 5. Calidad y demo | Revisión completa y recorrido reproducible | Pendiente | Fases anteriores integradas |

Las fases 1 y 2 permiten trabajar con fixtures mientras el backend construye primero `packages/core`, tal como exige la especificación. No necesitan un canal operativo ni credenciales para avanzar.

## Fase 1 · Base e identidad visual

**Objetivo:** tener una web ejecutable y una dirección visual concreta que podamos iterar.

- [x] Revisar el material existente y delimitar el frontend.
- [x] Crear workspace pnpm/Turborepo y `apps/dashboard` con Next.js 15.
- [x] Definir navegación, tipografía, espaciado, superficies, tarjetas y controles.
- [x] Predominar blanco y negro; reservar el amarillo para acentos.
- [x] Crear resumen con KPIs, evolución, cartera y casos prioritarios.
- [x] Usar un conjunto determinista de 72 perfiles ficticios.
- [ ] Cerrar la primera revisión de diseño con el equipo.
- [ ] Validar códigos cromáticos y aplicaciones con el manual de marca vigente.

**Aceptación:** se ejecuta localmente; navegación consistente; jerarquía clara; cifras identificadas como demo; no confunde compromisos con pagos; estilo revisado por el equipo.

**Qué iteramos:** distribución, cantidad de información, escala tipográfica, balance cromático, proporción de gráficos y tablas.

## Fase 2 · Vistas y recorridos

**Objetivo:** completar la experiencia del operador antes de integrarla.

- [x] Prototipo de atención preventiva con búsqueda, filtros, orden y paginación.
- [x] Prototipo de ficha del cliente con tres factores principales.
- [x] Prototipo de timeline con mensajes, decisión previa y resultado explícito.
- [x] Vistas iniciales de conversaciones, compromisos, escalaciones y políticas.
- [x] Exportación CSV de la selección global de la vista.
- [x] Estados básicos de carga, vacío, error y ruta inexistente.
- [ ] Vincular cada conversación a su ruta `/conversaciones/[id]`, cuando existan IDs de dominio.
- [ ] Incorporar correcciones de la revisión visual de cada pantalla.
- [ ] Diseñar offline, reconexión, latencia y permisos de consulta según contrato real.

**Aceptación:** desde el resumen se llega al caso y se entiende su contexto, acción, motivo y resultado. Los enlaces tienen destino, los filtros producen resultados coherentes y los estados alternativos son legibles.

**Qué iteramos:** tabla frente a tarjetas, información de la ficha, densidad del timeline, filtros útiles y prioridades del equipo.

## Fase 3 · Integración de datos y tiempo real

**Objetivo:** sustituir los fixtures por la información compartida del sistema.

- [ ] Acordar DTOs con backend; compartir enums canónicos y tipos.
- [ ] Cliente Supabase con clave pública y acceso de lectura mediante RLS y sesión autenticada.
- [ ] Validación Zod de los datos externos antes de presentarlos.
- [ ] Conectar clientes, préstamos, riesgo, intervenciones y conversaciones.
- [ ] Conectar mensajes, análisis, decisiones, compromisos y escalaciones.
- [ ] Consultar política activa desde el backend; retirar la copia de presentación.
- [ ] Suscribirse a cambios Realtime y liberar suscripciones al salir.
- [ ] Manejar carga inicial, deduplicación, reconexión, errores y última actualización real.
- [ ] Mantener el modo demo como fallback claramente identificado.

**Aceptación:** un evento persistido por el agente aparece sin recargar; al reconectar no se duplica; los errores no se muestran como ceros; no hay claves privadas ni cálculo de políticas en el cliente.

**Dependencias del backend:** schema y seed; `packages/core` y `packages/db`; tablas con permisos de lectura; consultas o vistas acordadas; eventos identificables; política y decisión versionadas. No se construye una integración bancaria real.

## Fase 4 · Analítica explicable y trazabilidad

**Objetivo:** que cada indicador y cada decisión se pueda explicar con evidencia.

- [ ] Definir y verificar numeradores, denominadores, periodo y unidad de cada métrica.
- [ ] Mostrar tasa de intervención, compromisos, cumplimiento, respuesta y escalamiento.
- [ ] Efectividad por canal con tamaño de muestra y las mismas reglas de conteo.
- [ ] Comparar intervenidos y control en ventanas equivalentes para la métrica de mora.
- [ ] No atribuir causalidad ni reducción de mora hasta disponer de evidencia comparable.
- [ ] Exponer factores de riesgo, `rule_ids`, política aplicada y evidencia de registro.
- [ ] Mostrar violaciones de guardrail y su acción correctiva desde registros reales.
- [ ] Calcular P50/P95/P99 por canal a partir de eventos medidos; sin cifras inventadas.
- [ ] Exportar informes con filtros, fecha de corte y definiciones.

**Aceptación:** una muestra de los números del dashboard se reproduce contra el dataset de demo integrado; cada decisión conserva su versión y reglas; compromisos y pagos permanecen separados; la cohorte de control nunca aparece contactada.

**Qué iteramos:** gráfico apropiado para cada pregunta, comparación de periodos y nivel de detalle de los indicadores.

## Fase 5 · Calidad y preparación de la demo

**Objetivo:** entregar un recorrido estable y reproducible para el hackathon.

- [ ] Validar navegación manual, teclado, foco, contraste y tamaños de pantalla.
- [ ] Recorrer los cinco escenarios A–E y priorizar el escenario C (dificultad financiera).
- [ ] Verificar el caso cooperativo, evasivo, molesto y la solicitud de una persona.
- [ ] Recorrer fallos de carga, reconexión y escritura sin confirmar operaciones fallidas.
- [ ] Verificar datos iniciales y reinicio reproducible junto al equipo backend.
- [ ] Ejecutar TypeScript, lint y build antes de cada entrega.
- [ ] Preparar `DEMO-RUNBOOK.md`, guion, fallback local y grabación de respaldo.
- [ ] Congelar funcionalidades según el plan del hackathon y dejar margen de corrección.

**Aceptación:** el equipo puede repetir el recorrido con los mismos datos, explicar los resultados y recuperarse si un proveedor no responde.

No se añaden suites de tests de UI en este MVP (`CLAUDE.md`, §21). La comprobación visual es manual; las reglas de negocio y su testing corresponden a `packages/core`.

## Cómo iteraremos

En cada entrega: abrir la pantalla local, revisar una tarea concreta, decidir cambios de diseño, implementarlos y verificar el resultado. Mantener un pequeño registro de decisiones en `DISENO.md`. Cerrar una fase por sus criterios de aceptación, no por la cantidad de pantallas dibujadas.

**Primera revisión propuesta:** resumen general y atención preventiva. Después, ficha/timeline; luego acuerdos y resultados. La conexión a servicios empieza cuando el equipo comparte los contratos necesarios.
