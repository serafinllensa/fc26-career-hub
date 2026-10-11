# FC26 Career Hub · Guía de estilo v2 (Diseño FC, 10/10/2026)

> **v2, pedido de Serafin: estilo de la interfaz de EA SPORTS FC 26.** Se aplica cargando `tema-fc26.css` DESPUÉS de `tokens.css`. Los tokens, componentes y reglas de datos de abajo siguen valiendo; el tema cambia el aspecto:
> - Fondo profundo verde azulado con luces difusas; el brillo de la derecha toma el color del club (`--club-glow`, lo calcula `aplicarClub`).
> - Paneles de vidrio esmerilado (`.tarjeta`, `.tarjeta.brillo`), fila u opción elegida "iluminada" (`.sel`), como la Shortlist y la pantalla de oferta.
> - Titulares en Inter Tight 800 en mayúscula; números enormes (`.num-xl`); filas "etiqueta → VALOR" (`.fila-dato`).
> - Escritorio: barra superior con pestañas y subrayado menta, barra de atajos estilo consola abajo (`.atajos`). Celular: barra inferior de vidrio.
> - Botón principal claro con brillo (como "Make Offer"); botón rojo redondo para cortar la reunión.
> - Escudo grande con resplandor en el encabezado, estrellas de nivel como en "Classic Match".
> - Plantilla en escritorio: lista + ficha del jugador elegido (`.plantel`, `.ficha`). Oficina: layout de negociación (exigencias a la izquierda, reunión a la derecha con tensión y respuestas).
> - El panel ya usa `objetivos()` y `finanzas()` del Motor en vivo.
> No usamos fuentes ni imágenes de EA: es el mismo lenguaje visual hecho con recursos propios.


Archivos: `tokens.css` (sistema completo, listo para copiar a `css/`), `fuentes/` (woff2, OFL), `maquetas/*.html` (funcionan con datos reales de `data/`), `capturas/` (celular 390 px y escritorio 1440 px; `-completa` = página entera).
Para ver las maquetas: servir la raíz del repo (`python3 -m http.server`) y abrir `/diseno/maquetas/panel.html?club=real-madrid`.

## Pantallas (maquetas, abrir con `?club=<id>`)
`panel` · `plantilla` (Shortlist + ficha EA/Transfermarkt) · `presidente` y `dt` (oficinas) · `calendario` · `partido` (cargar resultado, Classic Match) · `objetivos` (3 plazos, en vivo del Motor, `&dif=`) · `tacticas` (pizarra + FC IQ) · `mercado` (negociación + fair play) · `trofeos` (vitrina e historial) · `clubes` (selector de 96).

## 1. Idea
Una "sala de prensa del club": papel claro, tinta negra y **el color del club como protagonista** en una banda arriba de cada pantalla. Titulares condensados en mayúscula (lenguaje de camiseta y marcador), texto chico muy legible, números tabulares.
Lo que NO repetimos de la versión vieja: fondo negro con dorado genérico, tarjetas gigantes con párrafos de fuente en cada jugador, botones "Editar/Baja" repetidos 30 veces, pantallas con un solo mensaje vacío, ningún rastro del club.

## 2. Tipografía
- Display: **Barlow Condensed** 600/700/800, mayúscula. Nombres de club, títulos de sección (`.h1`, `.h2`), KPIs y dorsales.
- Texto: **Inter** variable. Cuerpo 15 px, meta 13 px, etiquetas 12 px en mayúscula con tracking.
- Todo número que se compara (valor, edad, puntos) lleva `.num` (tabular).

## 3. Color
- Neutros fijos: papel `#F4F2ED`, superficie `#FFF`, tinta `#15171C`, líneas `#E3E0D8`. Modo oscuro preparado con `data-tema="auto"`.
- Estados fijos, nunca del club: ok verde, alerta ámbar, peligro rojo, info azul.
- **Club** (de `clubes.json → colores`), aplicado con `aplicarClub(club)` de `maquetas/comun.js`:
  - `--club` principal (banda y botón `.btn.club`), `--club-2` secundario (rayas de la banda, subrayado del botón).
  - `--club-tinta`: blanco o tinta según qué contraste más (mín. 4.5:1).
  - `--club-acento`: el color del club que tenga ≥ 3:1 sobre el papel; si ninguno, tinta. Es el único que se usa para detalles sobre fondo claro (ícono activo, foco, estrellas).
  - Escudo: si el principal es casi blanco (Real Madrid, Tottenham, Fulham…) se invierte. Dentro de la banda va sobre el secundario para despegarse.
- Probado con un club blanco (Real Madrid), uno claro (City) y uno oscuro (Inter), con los colores oficiales de `clubes.json`.

## 4. Escudos
Escudos **reales** de `data/escudos/<clubId>.png` (128 px, fuente en `clubes.json → escudo`), con `escudo(club, tam)` de `maquetas/comun.js`. Se muestran tal cual, sin recortar ni recolorear. En la banda van sobre una placa blanca redonda con aro del color secundario, para que cualquier escudo se lea sobre cualquier color de club. Si falta el archivo o falla la carga, queda el monograma con la `sigla` y los colores del club. En el pie de todas las pantallas va: "Los escudos son marcas de sus clubes. Proyecto de fans sin fines comerciales."
Club sin colores con fuente (hoy Deportivo, Paris FC y Niza; Napoli y Torino sin secundario): se usa el neutro de la app, no inventamos colores.

## 5. Layout
- Celular primero. Barra inferior de 5 (Panel, Plantilla, Calendario, Oficinas, Más), toques de 44 px como mínimo y `safe-area`.
- ≥ 960 px: barra lateral de 248 px con grupos; contenido máx. 1200 px; panel en 2/3 + 1/3.
- Plantilla: filas compactas en celular (dorsal, nombre, posición, edad, país, contrato, valor) y tabla ordenable con encabezado fijo en escritorio. Separadores por línea con conteo.
- Listas de 96 clubes: buscador + chips de liga + chips de nivel, agrupado por liga con "n de 20/18", botón Sortear. Tarjeta con franja de 2 colores a la izquierda.

## 6. Componentes (`tokens.css`)
`.banda` · `.escudo` · `.tarjeta` · `.kpi` · `.chip[aria-pressed]` · `.badge` (ok/alerta/peligro/info/neutro/**estimado**/**ejemplo**) · `.pos` (por/def/med/del, siempre con texto) · `.dif` (dificultad con 5 barras) · `.btn` (primario/club/secundario/fantasma/peligro) · `.campo` · `.medidor` (alto/medio/bajo) · `.tabla` · `.fuente` · `.sin-verificar`.

## 7. Honestidad de datos (regla de diseño, no opcional)
- Todo bloque con datos externos muestra su fuente y fecha (`.fuente`), una sola vez por bloque, no por fila.
- Lo calculado por Motor lleva `.badge.estimado` y se muestra como rango (texto de `finanzas().texto`).
- Dato faltante: `.sin-verificar` ("◌ Sin dato"), nunca un cero ni un guion que parezca dato.
- En maquetas, el estado de juego simulado lleva `.badge.ejemplo` (rayado ámbar). En la app real no existe.
- País: usar `nacCodigo` (ISO) de Datos; mientras, la maqueta mapea a ISO alfa-3 para no chocar con "POR" de posición.

## 8. Próximo (según lo nuevo de Serafin)
- **Objetivos en 3 horizontes**: pestañas Temporada / 3 temporadas / 5 temporadas; cada objetivo con ícono de categoría (deportivo, cantera, económico, institucional, desarrollo), progreso y consecuencia.
- **Control financiero**: medidor de ratio de costo de plantilla con las marcas de la regla que aplique (70 % UEFA/Serie A/DFL, 85–115 % Premier, límite LaLiga en M€), estado verde/ámbar/rojo y qué te pasa si te pasás según la dificultad.
- Oficina del DT, calendario, tácticas y vitrina.

## 9. Accesibilidad
Contraste AA en todo texto, foco visible con el acento del club, `prefers-reduced-motion`, estados con texto además de color, `aria-pressed` en filtros, `aria-current` en navegación.
