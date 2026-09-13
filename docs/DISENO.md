# Dirección visual · Bancoagrícola

## Decisión de esta iteración

Una herramienta de analítica sobria, con superficies blancas, navegación negra, amarillo de marca en acciones e indicadores y acentos secundarios puntuales. El contenido ocupa el centro: clientes, contexto, acciones y resultados.

La tarjeta aportada inspira la identidad, no una reproducción de su composición. La pantalla interna necesita espacio para leer tablas y comparar información; no se transforma en una tarjeta amarilla ni incluye elementos de pago como el chip o Mastercard.

## Identidad verificada

Se consultó la [web oficial de Bancoagrícola](https://www.bancoagricola.com/cuentas-personas) y su [hoja de estilos pública](https://www.bancoagricola.com/web/templates/Principalnew2/assets/css/banco.min.css?v=2). Esta hoja utiliza **`#FDDA24`** en botones y acentos y **`#2C2A29`** en texto e interacciones. Se adoptan esos códigos y blanco `#FFFFFF` en el prototipo. Esto verifica su uso digital; no sustituye el manual de marca vigente.

Los logotipos se descargaron sin modificación de los recursos oficiales:

- `public/brand/bancoagricola-footer.png`: [versión blanca](https://www.bancoagricola.com/multimedia/render/3315), usada sobre el fondo oscuro del menú.
- `public/brand/bancoagricola-logo.png`: [versión positiva](https://www.bancoagricola.com/web/templates/Principalnew2/assets/img/logo.png).
- `public/brand/bancoagricola-responsive.svg`: [versión vectorial positiva](https://www.bancoagricola.com/web/templates/Principalnew2/assets/img/logo-responsive.svg).

Los recursos permanecen locales para que el prototipo no dependa del sitio externo. Se preservan sus proporciones y colores; el nombre no se reconstruye con una fuente ni se añaden elementos al logotipo.

## Paleta y uso

| Color | Valor | Uso |
|---|---|---|
| Blanco | `#FFFFFF` | Tarjetas, controles y superficies principales |
| Negro de referencia | `#2C2A29` | Texto, series de datos y énfasis |
| Negro de interfaz | `#252524` | Fondo de navegación, derivado para esta UI |
| Amarillo del sitio oficial | `#FDDA24` | Selección, indicador destacado y barras |
| Gris claro de interfaz | `#F7F8F7` | Fondo del dashboard |
| Gris de interfaz | `#72746F` | Texto secundario |
| Verde, violeta y otros acentos | Tonos de interfaz | Canal y estados, siempre acompañados por una etiqueta |

Los tonos secundarios de la interfaz se inspiran en la referencia aportada; no se presentan como códigos certificados de la marca. Aproximadamente 70% de la composición es blanca o gris claro, 25% negra y el resto corresponde a acentos. Es una dirección visual, no una proporción obligatoria.

## Tipografía y componentes

- Instrument Sans variable, alojada localmente, para la interfaz. Es una elección de diseño del prototipo, no una afirmación sobre la fuente corporativa.
- Logotipo oficial como archivo independiente de la tipografía de la UI.
- Números tabulares para montos, score y conteos.
- Bordes suaves y esquinas de 7–12 px, sin sombras fuertes ni degradados decorativos.
- Etiquetas y denominadores cerca de cada indicador; no depender solo del color.
- Estados de hover, foco visible, selección, deshabilitado, vacío, error y carga.
- Navegación adaptable: menú lateral en escritorio, panel desplegable en móvil.
- Preferencia de movimiento reducido y tabla alternativa para el gráfico de evolución.

## Orden de lectura

1. Ubicación, periodo y condición de datos de demostración.
2. Resumen operativo y dimensiones del problema.
3. Actividad y distribución de cartera.
4. Casos que requieren acompañamiento.
5. Efectividad de los canales y gobernanza.

En la ficha: identidad ficticia, datos del préstamo, historia de la gestión, tres factores principales y resultado. La señal de prioridad no se presenta como score crediticio ni como probabilidad validada.

## Decisiones pendientes de la próxima revisión

- Tamaño de letra y densidad preferida por el equipo en las tablas.
- Si el resumen debe priorizar operación diaria o tendencias del periodo.
- Cantidad de gráficos visibles antes de la cola de atención.
- Profundidad del timeline y ubicación del panel de explicabilidad.
- Validación de aplicación del branding con los archivos maestros y manual vigente.

Actualizar este registro al aceptar una iteración; evitar cambios independientes de color o componentes por pantalla.
