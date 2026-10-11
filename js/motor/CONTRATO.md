# Contrato del Motor (importar todo desde js/motor/index.js). Tests: node tests.js

## Club y dificultad
- objetivos(club, dif) -> [{tipo, id, texto, principal}]  (temporada: liga, Europa, copa)
- objetivosPlazos(club, dif) -> {plazos:{corto,mediano,largo}, corto[], mediano[], largo[]}  cada item {categoria: deportivo|cantera|economico|institucional|desarrollo, id, texto}
- restricciones(dif, sueldoMasAltoM?) / puedeFichar(dif, {edad, sueldoM, altasEnVentana, sueldoMasAltoM}) -> {ok, motivos[]}
- paciencia(dif) / finanzas(club, dif) -> {presupuesto, topeSalarial, texto:{presupuesto, topeSalarial}}  (siempre rango "estimado")
- calcularNiveles(clubes, {ligas}) -> [{id, nivel, nivelCalculado, ajuste, puntaje, motivo, estimados[]}]. Niveles finales ya calculados: js/motor/niveles.json

## Oficina del DT
- charlaVestuario(carrera, motivar|exigir|calmar) -> {carrera, efecto, texto}
- procesarVestuario(carrera, p, {plantilla, titulares?}) -> {carrera, eventos[]}  tipos: goleador-renovacion, vestuario-dividido, reclamo-minutos (si p.titulares viene). Se responden con responder()
- sugerirDTs(club, dts, 5) -> [{dt, puntaje, motivos[]}] / sortearDT(club, dts)

## Calendario
- fixtureLiga(clubIdsDeLaLiga, clubId, oficial?) -> [{jornada, rivalId, local, comp, fecha (la del partido), provisorio, resultadoReal:{gf,gc} (lado de tu club) | null, resultadoRealLV:{local, visitante} (para mostrar como el marcador), reprogramado}]
- analizarPartido(p, {nivelPropio, nivelRival, partidosPrevios, plantilla}) -> {titular, lineas[], sensacion: muy-bien|bien|normal|mal|muy-mal}
  oficial = data/fixtures/<liga>.json {fuente, fecha, jornadas:[{n, fecha, partidos:[{local, visitante}]}]}
- validarPartido(p) -> errores[]  p = {id, comp: liga|copa|ucl|uel|uecl, jornada, rivalId, local: bool, gf, gc, goleadores:[jugadorId], fecha}
- resumen(partidos, comp?) -> {pj,pg,pe,pp,gf,gc,dg,pts} / forma(partidos, 5) -> ['G','E','P'] / rachaSinGanar / goleadores

## Carrera (formato del BRIEF + objetivos, estado, banderas)
- crearCarrera({club, dt, dificultad, plantilla}) / agregarPartido(carrera, p)
- guardar(localStorage, c) / cargar(localStorage, id) / listar(localStorage) / borrar(localStorage, id)
- exportar(c) -> texto JSON / importar(texto) -> carrera (valida, tira Error con mensaje legible)

## Presidente
- procesarPartido(carrera, p, {nivelRival, perfil}) -> {carrera, eventos[], delta, tension, corregido, cerrada}
  Corregir un partido = llamar de nuevo con el mismo id: revierte lo anterior y no genera eventos. Nunca hay dos eventos iguales sin contestar.
  Despido: carrera.estado = {despedido, finalizada: true, motivoFin: 'despido'}; agregarPartido tira Error. Pantalla de cierre: resumenCarrera(carrera).
  evento = {id, tipo: aviso|ultimatum|elogio|despido, titulo, texto, respuestas:[{id, texto, efectos}], respondido}
- responder(carrera, eventoId, respuestaId) -> carrera (aplica efectos y banderas: plazo, pideRefuerzos, presupuestoExtraPct, renovaciones, fin)
- tension(confianzaPresidente) -> {nivel: baja|media|alta|critica, texto}

## Negociación con el presidente (negociacion.js)
- pedirAlPresidente(carrera, club, pedido) -> {decision: acepta|contraoferta|rechaza, aprobadoM, texto, motivos[], respuestas[], estado, tension}
  pedido = {tipo:'presupuesto'|'masa', montoM} | {tipo:'fichaje', precioM, jugador:{nombre, edad, valorM, sueldoM}}
  Pesa: confianza, perfil (mecenas/austero/fondo/ultra), dificultad, restricciones de fichaje y fair play (LaLiga y Serie A bloquean desde medio; hardcore/leyenda bloquean en todas; fácil solo avisa).
- cerrarNegociacion(carrera, neg, respuestaId) -> carrera (aplica plata y confianza; insistir nunca da vuelta un no)
- estadoMercado(carrera, club) -> {disponibleM, masaM, topeM, usoMasa, estimado:true}  (para el medidor)
- registrarVenta(carrera, {precioM, sueldoM}) / nuevaVentana(carrera)

## Charla táctica con el DT (tactica.js)
- proponerTactica(carrera, dt, {formacion, estilo?}) -> {reaccion: acepta|discute|resiste, texto, motivos[], respuestas[]}
  Usa su formación de Transfermarkt y su nivel; la filosofía no tiene fuente, así que el estilo queda neutral.
- cerrarCharlaTactica(carrera, charla, insistir|probar|ceder|confirmar) -> carrera (tactica, relacionDT)
- evaluarPrueba(carrera) -> {carrera, resultado}  llamar después de cada partido: a los 3 partidos de prueba decide.

## Cambios 2026-10-11 (detalles de QA)
- procesarPartido: en un partido corregido, `delta` es solo la diferencia contra lo que había; nuevo `deltas` {presidente, vestuario, hinchas} y `etiqueta: 'Resultado corregido'` (null si es partido nuevo).
- La confianza siempre queda con un decimal. exportar() y guardar() pasan por normalizar(carrera), que también limpia guardados viejos.

## Trofeos (carrera.js)
- registrarTrofeo(carrera, {comp, temporada?, nombre?}) -> {carrera, nuevo, efectos}. Misma comp y temporada no se duplica. Sube presidente e hinchas (liga +10/+12, champions +12/+15, resto +6/+8).
- quitarTrofeo(carrera, {comp, temporada?}) -> carrera (deshace un "La gané" por error, con su confianza).
- resumenCarrera ahora suma listaTrofeos y trofeosPorComp.

## Filosofía de los DTs (dts.js / tactica.js)
- `filosofia` puede ser ['posesion'] o [{valor:'posesion', fuente:'https://…', fecha}]. Una ficha sin fuente no cuenta.
- Etiquetas que entiende el Motor: posesion, presion-alta, transiciones, contragolpe, bloque-bajo, juego-directo, juveniles.
- DT libre: `estado: 'libre'` o `clubActual: null`.
- Pedir un fichaje sin plata disponible: rechazo directo ("primero vendé"), salvo en fácil.

## Cambios 2026-10-11 (bugs de QA del mercado)
- Fichaje sin `jugador.sueldoM`: el Motor estima el sueldo en el 10% anual de `valorM` (o del precio), lo agrega a los motivos como "Sueldo estimado", lo controla con el fair play y lo suma a la masa al aprobarse.
- El bloqueo de 2 partidos ahora cuenta cualquier "no": un rechazo o una contraoferta que se cerró sin plata (insistir o retirar).
- sugerirDTs(club, dts, n, {incluirActual: true}) incluye al DT actual del club (por defecto queda afuera).
- (2026-10-11, bug QA) El bloqueo de 2 partidos mira el mismo pedido: en fichajes, el mismo jugador (`jugador.id`, o el nombre si no hay id); en presupuesto y masa, el mismo tipo por un monto igual, mayor o hasta un 20% menor. Pedir otro jugador o mucho menos es un pedido nuevo.

## DTs (2026-10-11, pedido de Serafin)
- sugerirDTs(club, dts, 5, {clubes}) -> [{dt, puntaje, motivos, actual, categoria}]. El primero es SIEMPRE el DT actual (`actual: true`, `puntaje: null`). Pasá `{clubes}` (la lista con el nivel del Motor) para que la categoría de cada DT se calcule por sus etapas.
  Las otras 4: categoría del DT >= nivel del club - 1, libres o "traíbles" (su club es de menor nivel; uno del mismo nivel solo si tiene vínculo), 72 años o menos, ordenados por vínculo y encaje.
  Categoría = la mejor etapa como primer entrenador: nivel del club, -2 si duró menos de una temporada, -1 si menos de 1,5, -1 si terminó hace más de 5 años y -2 si fue hace más de 10. Una etapa corta tampoco cuenta como "Ya dirigió" completo.
- buscarDTs(dts, {texto, soloLibres, nac}, {clubes}) -> [{dt, categoria, libre}] para "Elegir otro DT" (los 299, ordenados por categoría).
- categoriaDT(dt, {clubes}) -> 1..5. sortearDT nunca devuelve al DT actual.
- Manchester United: N4 por decisión de Serafin, en AJUSTES_MANUALES, NIVELES.md y niveles.json.
