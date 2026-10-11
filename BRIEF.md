# FC26 Career Hub — brief (Donato, coordinador)

Centro de control para el modo carrera de EA FC 26, temporada 2026/27. Lo usás al lado de la consola: no toca el juego.
Sitio estático (HTML, CSS y JS puro), mobile first, publicado en GitHub Pages. Todo se guarda en el navegador, con exportar e importar la carrera en un archivo.

## Lo que pidió Serafin (no se elimina nada; lo que no se pueda, pasa a "modo consulta")
1. Nueva carrera: elegir club y DT a mano, o sortearlos. Sugerir los 5 DTs reales que mejor encajan con el club (dirigió o jugó ahí, historia, filosofía, nivel).
2. Plantilla real y actual (octubre 2026) con valor de mercado, edad, contrato, posición. Editable: agregar, quitar o cambiar jugadores.
3. Dificultades: fácil, medio, difícil, hardcore y leyenda. Cambian objetivos, presupuesto, tope salarial, restricciones y paciencia. Siempre realistas, y distintas según el nivel del club.
4. Calendario de la temporada con carga de resultados y análisis de cada partido.
5. Oficina del DT y oficina del presidente, con interacción realista: el presidente pone límites de sueldos y fichajes y exigencias, hay discusiones, y todo depende de la dificultad.
6. Tácticas: formaciones, estilo de juego, roles y enfoques de FC IQ de FC 26, ideas de juego según DT y club. Se pueden discutir con el DT.
7. Vitrina de trofeos e historial.
8. Ideas extra del equipo (proponer, Donato aprueba).

## Decisiones técnicas
- Transfermarkt no se puede consultar en vivo desde un sitio estático. Datos FC arma fotos fechadas en data/*.json, con fuente y fecha por dato. Nada inventado: lo que no se verificó queda vacío y marcado.
- Conversaciones con DT y presidente en v1: motor propio con reglas y eventos (sin costo, sin internet). Charla con IA real queda como opción futura (modo consulta).
- Alcance v1 FINAL (pedido de Serafin): TODOS los clubes de las 5 grandes ligas de Europa en la temporada 2026/27, con plantilla completa: Premier League (20), LaLiga (20), Serie A (20), Bundesliga (18) y Ligue 1 (18), o sea 96 clubes. Argentina y las divisiones de ascenso vienen en la expansión que sigue. Las 3 plantillas de la primera tanda son el control de calidad del formato, no el alcance.
- Versión vieja de referencia (para no repetir): /workspace/fc26-ref (React, pantallas vacías, oscuro y pesado). Capturas en diseno/version-vieja.

## Formato de datos (contrato; cambios solo con OK de Donato)
- data/clubes.json: [{id, nombre, corto, pais, liga, nivel (1 a 5), ciudad, colores:{principal, secundario}, presupuestoFichajesM, masaSalarialM, presidente:{perfil: "mecenas"|"austero"|"ultra"|"politico"|"fondo", nota}, estilo:[tags], fuentes:[{campo, url, fecha}]}]
- data/plantillas/<clubId>.json: {clubId, fecha, fuente, jugadores:[{id, nombre, pos, posSec:[], edad, nac, valorM (euros, millones), contratoHasta "AAAA-MM", dorsal, verificado: bool}]}
- data/dts.json: [{id, nombre, nac, clubActual, clubesDirigidos:[ids], clubesJugados:[ids], formaciones:[], filosofia:[tags], temperamento, nivel (1 a 5), fuentes}]
- data/fciq.json: roles por posición y enfoques de FC 26, con fuente de EA.
- Carrera guardada: {version, club, dt, dificultad, temporada, plantilla, partidos:[], finanzas, confianza:{presidente, vestuario, hinchas}, eventos:[], trofeos:[]}

## Carpetas
- data/ → Datos FC
- js/motor/ y tests.js → Motor FC
- diseno/ → Diseño FC
- index.html, css/, js/ui/ → Frontend FC
- QA FC no edita nada.

## Flujo
Cada uno entrega, Donato revisa, QA prueba y recién ahí se le muestra a Serafin.
