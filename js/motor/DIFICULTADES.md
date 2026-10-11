# Tabla de dificultades v1 (propuesta Motor FC, pendiente de OK de Donato)

## Niveles de club
N5 élite (candidato a Champions) · N4 grande (top 4 / Champions) · N3 europeo (Europa/Conference) · N2 mitad de tabla · N1 permanencia / recién ascendido

## Estimados (marcados "estimado" en la UI, nunca como dato real)
presupuestoFichajesM = valorPlantillaM x {N5 .15, N4 .12, N3 .10, N2 .08, N1 .06}, piso 5 M
masaSalarialM (anual) = valorPlantillaM x {N5 .28, N4 .30, N3 .32, N2 .35, N1 .38}, piso 15 M
Perfil del presidente: mecenas +20% presupuesto, austero -20%, fondo exige saldo de ventas positivo, ultra -1 de paciencia, politico exige 1 canterano en el 11 en partidos grandes.

## Objetivo base (Medio)
N5 liga o semis de Champions · N4 top 4 + octavos UCL · N3 top 6/7 (Europa) · N2 top 10 · N1 permanencia

## Dificultades
| | Fácil | Medio | Difícil | Hardcore | Leyenda |
|---|---|---|---|---|---|
| Objetivo | base -1 escalón | base | base +1 | base +1 y una copa (N4-N5: copa nacional; N1-N3: cuartos de copa) | base +2 y 2 competiciones (tope N1: top 10) |
| Presupuesto | x1.5 | x1.0 | x0.7 | x0.35 | 0, solo reinvierte 50% de ventas |
| Tope salarial | masa +15% | +5% | igual | -10% (hay que recortar) | -20% |
| Restricciones | ninguna | sueldo individual máx 1.5x el más alto actual | máx 4 altas por ventana | máx 3 altas, nadie de +30 años, sueldo máx = el más alto actual | máx 2 altas, 3 sub-21 con minutos, no vender capitán ni ídolos sin OK |
| Paciencia | confianza inicial 80, no hay despido en temp 1 | 65, ultimátum tras 6 sin ganar | 55, ultimátum tras 4 | 45, ultimátum tras 3, despido si falla objetivo principal | 35, despido tras 2 ultimátums, confianza tope 70 |

## Aprobada por Donato con ajustes (2026-10-10)
1. Hardcore: el límite de +30 años es solo para fichajes.
2. Leyenda N1: solo top 10, sin copa.
3. Estimados siempre como rango "≈ min–max M€ (estimado)" (±12%).
Código: dificultades.js, estimados.js, dts.js, index.js. Tests: node tests.js (27).
