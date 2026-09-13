# Contrato de integración del dashboard

## Responsabilidad del frontend

Consultar, presentar, filtrar y explicar datos persistidos. La API o los paquetes compartidos proporcionan score, banda, factores, NBA, acciones permitidas, reglas, resultados y comprobantes. La web no recalcula políticas ni confirma una operación por el solo hecho de que una solicitud HTTP haya salido.

`lib/demo-data.ts` es un fixture de presentación, no un risk engine. Al integrar, conservar las pantallas y sustituir la fuente de datos. No trasladar las decisiones a componentes React.

## Datos por vista

| Vista | Fuentes del dominio | Campos que debe exponer el contrato |
|---|---|---|
| Resumen | Riesgo, intervenciones, conversaciones y compromisos | Numerador, denominador, unidad, periodo y fecha de corte |
| Atención preventiva | `customers`, `loans`, `risk_scores`, `interventions` | ID, producto, monto, fecha, score, banda, factores, NBA, control y estado |
| Cliente | Las anteriores y `payments` | Contexto del préstamo, historial y preferencias de contacto |
| Conversación | `conversations`, `messages`, `analysis_results` | Canal, turnos, autor, hora, intención, sentimiento y outcome |
| Trazabilidad | `agent_decisions`, `events`, `guardrail_violations` | `rule_ids`, versión, acciones permitidas y evidencia de registro |
| Compromisos | `payment_commitments`, `payments` | Monto, fecha, tipo, confirmación, validación y estado |
| Atención humana | `escalations` | Razón, prioridad, asignación, estado y fecha |
| Políticas | `policies` | Versión activa, nombre, reglas, vigencia y cambios |

El dashboard no sustituye una consola humana completa. La primera integración de escalaciones puede ser de solo lectura.

## Contratos que hay que acordar antes de conectar

- Identificadores y relaciones exactas; distinguir cliente, préstamo, intervención y conversación.
- Orden cronológico estable con timestamp e ID, y criterio de deduplicación de Realtime.
- Estados de conversación completada: denominadores coherentes entre vistas.
- Si los filtros de canal se refieren al canal preferido, al realizado o a ambos. En el fixture se usa el canal del único escenario por perfil.
- Paginación en servidor; no descargar toda la cartera para buscar.
- Representación de dinero sin pérdidas: centavos enteros o decimal validado.
- Fechas de negocio frente a instantes UTC; presentación en `America/El_Salvador`.
- Respuesta de error diferenciada de lista vacía; última actualización y frescura de datos.
- Validación de datos externos con Zod y enums canónicos de `CLAUDE.md`.

## Definición de las primeras métricas

| Indicador | Numerador | Denominador / unidad |
|---|---|---|
| Clientes en riesgo | Clientes únicos en PREVENTIVO, ALTO o CRITICO | Clientes únicos de la selección |
| Intervención preventiva | Clientes en riesgo intervenidos antes del vencimiento | Clientes detectados en riesgo |
| Conversión a compromiso | Conversaciones completadas con compromiso | Conversaciones completadas |
| Cumplimiento | Compromisos con pago registrado conforme al acuerdo | Compromisos de la ventana de maduración acordada |
| Monto comprometido | Suma de montos de acuerdos vigentes | USD; no equivale a recuperación |
| Pagos registrados | Suma de pagos confirmados del periodo | USD; no inferir a partir de promesas |
| Escalamiento | Conversaciones derivadas a una persona | Conversaciones del periodo |

Mora evitada requiere la definición de `CLAUDE.md`, clientes elegibles, una cohorte de control comparable, seguimiento de pagos, ventanas equivalentes y una limitación explícita del dataset sintético. Mientras no existan esos datos se muestra **Por medir**. No se reutilizan los porcentajes del mockup como resultados observados.

En los fixtures, un perfil tiene una sola gestión y no existen múltiples préstamos o compromisos. Esas simplificaciones no deben convertirse en supuestos del contrato integrado.

## Acceso y efectos

El frontend usará la clave pública de Supabase con RLS y sesión autenticada. `service_role`, Twilio, OpenAI, Vapi y secretos de webhooks pertenecen al servidor. El `.env` raíz existente no se usa en esta iteración y no debe copiarse a variables públicas.

La UI actual no envía WhatsApp, no llama, no modifica políticas, no registra pagos y no asigna operadores. Cualquier futura acción debe validar autorización y política en servidor y devolver un registro verificable antes de presentar éxito.
