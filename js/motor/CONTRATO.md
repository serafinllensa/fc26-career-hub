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

# Tanda 2 (2026-10-11, pedidos de Serafin)

## Finanzas cargadas desde el juego (finanzasJuego.js)
- configurarFinanzas(carrera, club, {masaJuegoM, presupuestoJuegoM, salud?}) -> carrera con `finanzasJuego`. Se llama al crear la carrera (paso de dificultad) o desde Mercado y finanzas.
  presupuesto = presupuesto del juego × dificultad (1 / 1 / 0,7 / 0,35 / 0) × salud (ajustada 0,85, crisis 0,6) × 1,1 si el presidente es mecenas.
  tope = masa del juego × dificultad (1,15 / 1,05 / 1 / 0,9 / 0,8) × salud (ajustada 0,95, crisis 0,9). `explicacion[]` trae el cálculo en texto.
  salud: solo con fuente (hoy OM, OL y Monaco, encuadrados por la DNCG) o elegida por el jugador; el resto es neutral.
- semanalAAnualM(milesPorSemana) -> M€ por año (el juego muestra sueldos semanales).
- estadoMercado() usa finanzasJuego si existe: `fuente: 'juego'`, `estimado: false`. Si no, sigue con el estimado de siempre.
- evaluarFairPlay(carrera, club, estado) -> {estado: ok|aviso|excedido|sin-dato, uso, excesoM, sancion, texto}
  fácil: solo aviso. Medio: multa del 50% del exceso (regla de la app) o bloqueo de inscripciones en LaLiga y Serie A. Difícil: además recorte del tope del 5%. Hardcore: además bloqueo en cualquier liga. Leyenda: además −3 puntos (−6 y sin Europa si reincidís).
- cierreDeVentana(carrera, club, estado) -> {carrera, fairPlay}. Llamar al cerrar cada ventana: aplica la sanción (multa al disponible, recorte, bloqueo, −8 de confianza) y reinicia las altas. El bloqueo se levanta solo cuando la masa vuelve abajo del tope.

## Preferencias del DT (dts.js)
- preferenciasDT(dt) -> {formacion, formacionEstimada, estilos[], estiloEstimado, fuente: 'con fuente'|'estimado'}. Sin fuente, el estilo sale al azar con semilla en el id del DT (siempre el mismo) y coherente con su formación. Mostrá "estimado" cuando `estiloEstimado`.
- La charla táctica las usa: si el estilo no es el suyo, se queja ("Su idea es contragolpe y bloque-bajo, no posesion"), más fuerte si el dato tiene fuente.

## Mercado de salida y cantera (salidas.js)
- proponerSalida(carrera, club, {tipo: 'venta'|'cesion', jugador, precioPedidoM?, plantilla}) -> {presidente: {decision: acepta|condiciona|rechaza, texto, motivos}, dt: {opinion: de-acuerdo|duda|en-contra, motivos}, precioMinimoM, respuestas}
- responderSalida(carrera, prop, buscar|insistir|otra|dejar) -> carrera (`transferibles[id]` = en venta o para ceder)
- registrarSalida(carrera, {tipo, jugador:{id, nombre, sueldoM}, clubDestino, precioM | meses (1..24), sueldoPagaDestinoPct?, opcionCompraM?, fecha?}) -> carrera (suma la venta, libera masa, saca al jugador del plantel, queda en `salidas`)
- volverDeCesion(carrera, jugadorId, {ejercioCompra?}) -> carrera
- registrarJuvenil(carrera, {nombre, pos, edad 15..21, ovr?, pot?, sueldoM?}, {identidad}) -> carrera (`cantera[]`, suma al plantel; si el club es de cantera, más confianza)

## El DT pide refuerzos (refuerzos.js)
- detectarFalencias(plantilla, formacion) -> {promedioOnce, falencias: [{grupo, motivo, gravedad 1..3, referenciaOvr}]}
- sugerirRefuerzos(carrera, dt, falencia, candidatos, {disponibleM, clubes, promedioOnce}) -> hasta 3 [{jugador, puntaje, motivos}]. Los candidatos son jugadores de data/plantillas con `club`. Solo trae jugadores alcanzables: no vienen de un club más grande ni de un rival directo, su media es como mucho la del once + 4, entran en la plata disponible y cumplen las reglas de la dificultad.
- opinarJugador(carrera, dt, falencia, jugador, {clubes}) -> {opinion: de-acuerdo|duda|no, motivos, respuestas: pedir | insistir/otra/ceder, respaldoDT}
- responderRefuerzo(carrera, charla, id) -> {carrera, pedirAlPresidente, respaldoDT}. Si `pedirAlPresidente`, abrí pedirAlPresidente con `respaldoDT` en el pedido (suma "Lo pidió el DT").
- Todos los "no" (del presidente y del DT) traen ahora también la respuesta `otra` ("Te propongo otra cosa"), sin costo.

## Arreglos QA tanda 2 (2026-10-11)
- controlarSalida(carrera, {tipo, jugador, precioM}) -> {ok, sueldoM, sueldoEstimado, bajoMinimo, precioMinimoM, costoPresidente, avisos[]}. Llamalo antes de registrar para el `confirmar()`.
- registrarSalida: sin `sueldoM` estima el 10% del valor por año (`sueldoEstimado: true`). Vender por debajo del mínimo del presidente se puede, pero cuesta confianza (3 + 1 por cada 10% abajo, tope 12) y queda `bajoMinimo: true`.
- sugerirRefuerzos: solo jugadores cuyo puesto principal es el que falta. opinarJugador: si no juega en ese puesto no compara la media; si es su puesto secundario lo dice.
- Motivos: "Encaja con su estilo de transiciones" (nombres en castellano: `NOMBRE_ESTILO`).
