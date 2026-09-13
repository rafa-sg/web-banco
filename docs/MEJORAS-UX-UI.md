# Mejoras UX/UI — Centro de prevención

**Origen:** auditoría UX/UI del 13 de septiembre de 2026 sobre el dashboard (`http://localhost:3000`).
**Criterio de recorte:** solo se conserva lo que mejora la demo del hackathon y cabe en su alcance
(CLAUDE.md §21). Se descartó lo orientado a producción bancaria: roles y permisos, NRP-23 / OWASP /
BCBS 239, exportaciones, vistas guardadas, fechas de corte históricas, conciliación completa de pagos,
bandeja humana separada, diccionario formal de KPIs y pruebas con administradores.

> Objetivo: que quien vea el dashboard sepa **qué atender hoy, por qué, qué se acordó y qué tan
> confiables son los datos**, sin inventar nada que no esté registrado.

---

## 1. Hecho

| ID | Mejora | Dónde |
|---|---|---|
| H01 | Un fallo de consulta ya no se muestra como "0 clientes": las consultas principales lanzan error y `error.tsx` lo dice explícitamente. Las secundarias degradan a vacío pero quedan en el log del servidor. | `apps/dashboard/lib/supabase/queries.ts`, `apps/dashboard/app/error.tsx` |
| H02 | El modal de corrida aclara que aplica a **toda la cartera** (vencimientos a 10 días), no a los filtros de la tabla, y muestra si llamadas y correos son **reales o simulados** antes de confirmar. Si el agente no responde, no deja confirmar. | `components/prevention/run-button.tsx`, `getAgentStatus()` en `app/(app)/actions.ts` |
| H03 | La prioridad de una regla ya no se guarda al salir del campo: requiere **Guardar** (o Enter) y se puede descartar. | `components/config/rules-manager.tsx` |
| H04 | Conversación terminada sin promesa pero con oferta validada o aceptación explícita → aviso **"Acuerdo por verificar"**. No se inventa la promesa. | `components/live/live-conversation.tsx`, `components/commitments/commitment-card.tsx` |
| H05 | Condiciones con variables sin reemplazar (`{monto}`, `{nueva_fecha}`) se marcan como **condiciones incompletas** y no se muestran como texto aceptado. | `commitment-card.tsx`, `commitment-list.tsx`, ficha del cliente |
| H06 | La cola indica que los filtros solo afectan la tabla, con botón **Limpiar filtros** siempre visible cuando hay filtros. | `components/prevention/priority-table.tsx` |
| H07 | **Resumen de promesas en el inicio:** vencen hoy, próximos 7 días, vencidas sin resolver y pendientes de aprobación, con monto; cada tarjeta abre la lista filtrada en `/promesas?vence=…`. Lista corta de las que requieren atención. | `components/commitments/promise-summary.tsx` |
| H08 | Etiquetas que explican cada universo: "Compromisos · últimos 45 días", "promesas históricas", "cuotas" en cohortes, "Cuotas próximas en riesgo" en vez de "pagos prevenibles". | `app/(app)/page.tsx`, `app/(app)/impacto/page.tsx` |
| H09 | Pestañas de vencimiento en la cola: **Antes de vencer · Vence hoy · Con atraso**, con conteos. | `priority-table.tsx` |
| H11 | El botón "Llamar" deshabilitado para todos se reemplazó por la acción real según grado (ver §2). | `components/prevention/call-button.tsx` |
| H12 | Códigos crudos traducidos: productos (`AGRICOLA_AVIO` → "Agrícola de avío"), señales en la cola, ritmo ("Rápido") y decisión ("Avanzar de etapa"). | `lib/prevention.ts` |
| H13 | Modales con foco inicial, **Escape** y devolución del foco al botón de origen. | `run-button.tsx`, `hangup-button.tsx` |
| H14 | "Esta semana" → **"Próximos 7 días"**, mañana a hoy + 6, igual en inicio y en Promesas. | `commitment-list.tsx`, `promise-summary.tsx` |
| H15 | Estado vacío de Promesas dice qué filtro lo causa y ofrece **Ver todas las promesas**. Propuestas pendientes de aprobación ya no cuentan como pago por vencer. | `commitment-list.tsx`, `app/(app)/promesas/page.tsx` |
| H16 | Se quitó el `.limit(1000)` silencioso de promesas. | `queries.ts` |
| H17 | "¿Qué funcionó?" usa el grado **al iniciar la conversación** (`risk_before`), no el grado actual. | `impacto/page.tsx` |
| H18 | Se mantiene "Mora evitada vs control" (KPI estrella, CLAUDE.md §14) con "(observada)" y la nota "diferencia entre cohortes · no causal" junto al número. | `impacto/page.tsx` |
| H19 | Δ riesgo con un solo signo (`+1.0` / `−2.0`). | `signedLabel()` en `lib/prevention.ts` |
| H20 | Costos menores a un centavo con 4 decimales en vez de `$0.00`. | `costLabel()` en `lib/prevention.ts` |

## 2. Pedidos adicionales (hecho)

### Contacto por grado desde la web
- **Grados A y B → "Enviar correo"** (recordatorio preventivo).
- **Grados C, D y E → "Llamar"**.
- El canal sale de `agent_policies.channel_by_grade`; si falta, se usa A–B correo / C–E llamada.
- Aparece en la cola y en la ficha. Se deshabilita con motivo si el cliente es del grupo de control,
  pidió no ser contactado o no tiene contacto habilitado. El agente vuelve a validar todo en la BD
  (`start_conversation`).
- Agente: nuevo `POST /emails/:customerId` (`entropy-banco/apps/agent/src/routes/runs.ts`).

### Colgar llamadas en vivo
- Botón **Colgar** (con confirmación) en cada tarjeta de En vivo y en el encabezado de la conversación.
- Tarjetas con más de 15 min abiertas se marcan como posiblemente atascadas.
- Agente: nuevo `POST /calls/:conversationId/hangup` (`channels/hangup.ts`).
  - Cierra la conversación en la BD de inmediato y de forma idempotente, conservando la promesa si existe.
  - Registra el evento `manual_hangup`. No manda el correo de "intentamos comunicarnos".
  - **Simulada:** el bucle deja de generar turnos.
  - **Real (ElevenLabs):** el siguiente turno del Custom LLM se despide y emite `end_call`. Si el
    cliente no vuelve a hablar, el corte depende del timeout de silencio de ElevenLabs.

### Datos dentro de cada registro
- **Ficha del cliente:** franja de situación actual (próxima cuota, riesgo, promesa vigente, próxima
  gestión, último contacto), producto legible, fechas con año, factores en "+N pts".
- **Conversación:** hechos clave en el resultado (promesa registrada sí/no, canal, duración, cierre),
  "Última oferta validada/rechazada" en vez de "Dentro de límites", cambio de riesgo, horas con segundos
  en eventos.

## 2b. Limpieza antes de la demo (hecho)

- **Inicio:** arriba solo "Requieren intervención" y "Cuotas próximas en riesgo". Grupo de control y bloqueados
  pasan a un desplegable "¿Por qué no se contacta a todos?". En promesas, "Vencen hoy" y "Vencidas sin resolver"
  son las tarjetas grandes; "Próximos 7 días" y "Pendientes de aprobación" van en chico (atenuadas si están en 0).
- **Cola:** una sola barra de filtros: búsqueda + vencimiento + "Más filtros" (canal, producto, departamento,
  solo contactables) + Limpiar.
- **Impacto:** 4 indicadores y 4 gráficas, una pregunta cada una: embudo "de cada 100 llamadas" (contestaron →
  compromiso → cumplieron, según `outcome_definitions`), mora por cohorte, canales comparados y tendencia diaria.
  Lo demás (grado × canal, reglas, ofertas, etapas, sentimiento, latencia, modelos) queda en "Detalle para
  analistas", cerrado por defecto. Paleta categórica validada para daltonismo: "No contactados" pasó de rosa a naranja.
- **Configuración:** pestaña **Esencial** por defecto (canal por grado editable, llamadas reales por corrida,
  correo si no contesta, protecciones al cliente y ofertas activas con interruptor), más Ofertas, Aprobaciones y
  Escalaciones. Reglas, guiones, políticas y educación quedan bajo **Avanzado**. Cada sección tiene una frase de
  orientación y los códigos internos solo aparecen como tooltip.

## 3. Pendiente (fuera del dashboard)

| ID | Qué | Por qué no se hizo aquí |
|---|---|---|
| H05-raíz | Las promesas sembradas guardan `terms_template` crudo: `supabase/migrations/20260912001100_seed_data.sql:816` inserta `v_offer.terms_template` sin `render_template`. | Requiere cambiar el seed y re-sembrar la BD compartida. |
| H04-raíz | Revisar por qué DEMO-001 alternó 15 y 7 días y terminó sin promesa registrada. | Es comportamiento del agente de voz; hay que revisar la transcripción y los eventos de esa conversación. |
| — | Resúmenes antiguos en inglés. | Las conversaciones nuevas ya generan resumen en español (`finalize.ts`); las viejas quedan igual. |
| H10 | Separar "estado de gestión" de "próxima acción" en la cola. | Se renombró la columna a "Gestión"; separar requiere un campo de próxima acción en la vista. |

## 4. Verificación

- `tsc --noEmit` y `eslint --max-warnings 0` del dashboard: sin errores.
- `tsc --noEmit` del agente: sin errores.
- Endpoints nuevos respondiendo en el agente local: hangup con id inexistente → 404; `/emails` sin
  secreto → 401.
- **No probado de punta a punta:** envío de correo y colgado sobre conversaciones reales, porque el
  agente local está con ElevenLabs y Resend en modo real.
