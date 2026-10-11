// Motor FC: mercado de salida (vender, ceder), vuelta de cedidos y juveniles que suben de la cantera.
import {tension} from './presidente.js';
const r1 = x => Math.round(x * 10) / 10;
const clamp = (x, a, b) => Math.round(Math.max(a, Math.min(b, x)) * 10) / 10;
const ovrDe = j => j?.ea?.ovr ?? j?.ovr ?? null;

/**
 * Le sugerís al presidente vender o ceder a un jugador. Opinan el presidente y el DT.
 * propuesta: {tipo: 'venta'|'cesion', jugador: {id, nombre, edad, valorM, sueldoM?, ovr?, canterano?, idolo?}, precioPedidoM?, plantilla?: [jugadores]}
 */
export function proponerSalida(carrera, club, {tipo, jugador, precioPedidoM = null, plantilla = []}) {
  if (!['venta', 'cesion'].includes(tipo)) throw new Error('Tipo de salida inválido');
  if (!jugador?.nombre) throw new Error('Falta el jugador');
  const dif = carrera.dificultad, perfil = club.presidente?.perfil ?? null;
  const ovr = ovrDe(jugador), ovrs = plantilla.map(ovrDe).filter(x => x != null).sort((a, b) => b - a);
  const rango = ovr != null && ovrs.length ? ovrs.indexOf(ovr) + 1 : null; // 1 = el mejor del plantel
  const figura = rango != null && rango <= 3, titular = rango != null && rango <= 11;
  const mp = [], md = [];
  let pv = 50;
  if (tipo === 'venta') {
    if (perfil === 'fondo') { pv += 20; mp.push('Al fondo le sirve vender'); }
    if (perfil === 'austero') { pv += 10; mp.push('Libera sueldo'); }
    if (perfil === 'mecenas' && figura) { pv -= 25; mp.push('No quiere vender figuras'); }
    if (figura) { pv -= 15; mp.push('Es de los 3 mejores del plantel: los hinchas lo van a sentir'); }
    if (jugador.edad >= 30) { pv += 10; mp.push('Tiene 30 o más: es buen momento para vender'); }
    if (jugador.edad <= 21 && (jugador.valorM ?? 0) >= 20) { pv -= 10; mp.push('Es joven y se revaloriza'); }
    if (precioPedidoM != null && jugador.valorM) { const r = precioPedidoM / jugador.valorM; if (r < 0.7) { pv -= 25; mp.push(`Pedís ${Math.round(r * 100)}% de su valor: es regalarlo`); } else if (r >= 1.1) { pv += 10; mp.push('Buen precio'); } }
  } else {
    if (jugador.edad <= 23) { pv += 15; mp.push('Una cesión le da minutos para crecer'); }
    if (titular) { pv -= 20; mp.push('Es titular: no tiene sentido cederlo'); }
    if (jugador.edad >= 28) { pv -= 10; mp.push('A esa edad conviene vender, no ceder'); }
  }
  // El DT
  let dtOp = 'de-acuerdo';
  if (figura) { dtOp = 'en-contra'; md.push('Es de mis mejores jugadores'); }
  else if (titular && tipo === 'venta') { dtOp = 'duda'; md.push('Es titular: necesito un reemplazo antes'); }
  else md.push(tipo === 'cesion' ? 'Que juegue y vuelva mejor' : 'No es fundamental para mí');
  if ((jugador.idolo || jugador.canterano) && (dif === 'leyenda' || (perfil === 'politico' && tipo === 'venta'))) {
    return armar('rechaza', 'Es un símbolo del club. Ni lo pienses.', mp.concat(dif === 'leyenda' ? ['En leyenda los ídolos están protegidos'] : ['Los socios no lo perdonarían']));
  }
  if (dtOp === 'en-contra') pv -= 10;
  const decision = pv >= 55 ? 'acepta' : pv >= 35 ? 'condiciona' : 'rechaza';
  const textos = {acepta: tipo === 'venta' ? 'Si llega una buena oferta, se vende.' : 'Está bien, buscale un club donde juegue.',
    condiciona: tipo === 'venta' ? 'Solo si pagan lo que vale, ni un euro menos.' : 'Solo a un club donde sea titular, y sin opción de compra baja.',
    rechaza: 'No. Ese jugador se queda.'};
  return armar(decision, textos[decision], mp);

  function armar(decision, texto, motivos) {
    const respuestas = [
      ...(decision !== 'rechaza' ? [{id: 'buscar', texto: tipo === 'venta' ? 'Lo pongo en venta.' : 'Lo pongo para ceder.', efectos: {}}] : []),
      ...(decision === 'rechaza' ? [{id: 'insistir', texto: 'Le pido que lo reconsidere.', efectos: {presidente: -4}}] : []),
      {id: 'otra', texto: 'Le propongo otra cosa.', efectos: {}},
      {id: 'dejar', texto: 'Lo dejamos así.', efectos: {presidente: +1}},
    ];
    return {tipo, jugador: {id: jugador.id, nombre: jugador.nombre}, presidente: {decision, texto, motivos},
      dt: {opinion: dtOp, motivos: md}, precioMinimoM: decision === 'condiciona' && tipo === 'venta' ? jugador.valorM ?? null : null,
      respuestas, tension: tension(carrera.confianza.presidente)};
  }
}

/** Aplica la respuesta a proponerSalida: deja al jugador "en venta" o "para ceder" en la carrera. */
export function responderSalida(carrera, prop, respuestaId) {
  const r = prop.respuestas.find(x => x.id === respuestaId);
  if (!r) throw new Error('Respuesta inexistente');
  const confianza = {...carrera.confianza, presidente: clamp(carrera.confianza.presidente + (r.efectos.presidente || 0), 0, 100)};
  const transferibles = {...(carrera.transferibles || {})};
  if (respuestaId === 'buscar') transferibles[prop.jugador.id] = {tipo: prop.tipo, nombre: prop.jugador.nombre, precioMinimoM: prop.precioMinimoM, enPartido: carrera.partidos.length};
  return {...carrera, confianza, transferibles};
}

/**
 * Llegó la oferta en el juego y se cerró: cargás a dónde fue y por cuánto (venta) o por cuánto tiempo (cesión).
 * salida: {tipo, jugador:{id, nombre, sueldoM?}, clubDestino, precioM (venta), meses (cesión), sueldoPagaDestinoPct? (cesión, 0..100), opcionCompraM?, fecha?}
 */
export function registrarSalida(carrera, salida) {
  const {tipo, jugador, clubDestino} = salida;
  if (!['venta', 'cesion'].includes(tipo)) throw new Error('Tipo de salida inválido');
  if (!jugador?.id || !clubDestino) throw new Error('Faltan el jugador o el club de destino');
  if (tipo === 'venta' && !(salida.precioM >= 0)) throw new Error('Cargá por cuánto se vendió');
  if (tipo === 'cesion' && !(salida.meses > 0 && salida.meses <= 24)) throw new Error('La cesión va de 1 a 24 meses');
  const control = controlarSalida(carrera, salida);
  const m = {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0, ...(carrera.mercado || {})};
  const sueldo = control.sueldoM;
  let liberaM = 0;
  if (tipo === 'venta') { m.vendidoM = r1(m.vendidoM + salida.precioM); liberaM = sueldo; }
  else liberaM = r1(sueldo * ((salida.sueldoPagaDestinoPct ?? 100) / 100));
  m.masaBajasM = r1(m.masaBajasM + liberaM);
  const registro = {tipo, jugadorId: jugador.id, nombre: jugador.nombre, clubDestino, precioM: tipo === 'venta' ? salida.precioM : null,
    meses: tipo === 'cesion' ? salida.meses : null, opcionCompraM: salida.opcionCompraM ?? null, liberaM, fecha: salida.fecha ?? null,
    enPartido: carrera.partidos.length, vuelve: tipo === 'cesion', devuelto: false, sueldoEstimado: control.sueldoEstimado, bajoMinimo: control.bajoMinimo};
  const confianza = {...carrera.confianza, presidente: clamp(carrera.confianza.presidente - control.costoPresidente, 0, 100)};
  const transferibles = {...(carrera.transferibles || {})}; delete transferibles[jugador.id];
  return {...carrera, confianza, mercado: m, transferibles, salidas: [...(carrera.salidas || []), registro],
    plantilla: (carrera.plantilla || []).filter(id => id !== jugador.id)};
}

/**
 * Control previo a registrar (para el diálogo de confirmación): sueldo que se libera y si la venta queda abajo del mínimo del presidente.
 * Vender por debajo del mínimo se puede, pero cuesta confianza: 3 + 1 por cada 10% abajo (tope 12).
 */
export function controlarSalida(carrera, {tipo, jugador, precioM}) {
  const sueldoEstimado = !(jugador?.sueldoM > 0);
  const sueldoM = sueldoEstimado ? (jugador?.valorM ? r1(Math.max(0.5, jugador.valorM * 0.1)) : 0) : jugador.sueldoM;
  const min = carrera.transferibles?.[jugador?.id]?.precioMinimoM ?? null;
  const bajoMinimo = tipo === 'venta' && min != null && precioM < min;
  const costoPresidente = bajoMinimo ? Math.min(12, 3 + Math.floor(((min - precioM) / min) * 10)) : 0;
  const avisos = [];
  if (sueldoEstimado && sueldoM) avisos.push(`Sueldo estimado ≈ ${sueldoM} M€ por año (10% de su valor)`);
  if (bajoMinimo) avisos.push(`El presidente pidió no menos de ${min} M€: venderlo en ${precioM} M€ te cuesta ${costoPresidente} de confianza`);
  return {ok: !bajoMinimo, sueldoM, sueldoEstimado, bajoMinimo, precioMinimoM: min, costoPresidente, avisos};
}

/** Un cedido vuelve (o se ejecuta la opción de compra: queda como venta). */
export function volverDeCesion(carrera, jugadorId, {ejercioCompra = false} = {}) {
  const i = (carrera.salidas || []).findIndex(s => s.jugadorId === jugadorId && s.tipo === 'cesion' && !s.devuelto);
  if (i < 0) throw new Error('Ese jugador no está cedido');
  const s = carrera.salidas[i], m = {...carrera.mercado};
  const salidas = carrera.salidas.slice();
  if (ejercioCompra) {
    m.vendidoM = r1((m.vendidoM || 0) + (s.opcionCompraM || 0));
    salidas[i] = {...s, devuelto: true, vuelve: false, compraEjecutada: true};
    return {...carrera, mercado: m, salidas};
  }
  m.masaBajasM = r1((m.masaBajasM || 0) - s.liberaM);
  salidas[i] = {...s, devuelto: true};
  return {...carrera, mercado: m, salidas, plantilla: [...(carrera.plantilla || []), jugadorId]};
}

/** Juvenil que sube de la cantera: {nombre, pos, edad, ovr?, pot?, sueldoM?}. Suma al plantel y a los objetivos de cantera. */
export function registrarJuvenil(carrera, juvenil, {identidad = []} = {}) {
  if (!juvenil?.nombre || !juvenil?.pos) throw new Error('Faltan el nombre o la posición');
  if (!(juvenil.edad >= 15 && juvenil.edad <= 21)) throw new Error('Un juvenil tiene entre 15 y 21 años');
  const id = juvenil.id ?? `cantera-${(carrera.cantera?.length || 0) + 1}-${juvenil.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-')}`;
  const m = {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0, ...(carrera.mercado || {})};
  m.masaAltasM = r1(m.masaAltasM + (juvenil.sueldoM ?? 0));
  const esCantera = identidad.includes('cantera');
  const conf = {...carrera.confianza, hinchas: clamp(carrera.confianza.hinchas + (esCantera ? 3 : 1), 0, 100), presidente: clamp(carrera.confianza.presidente + (esCantera ? 2 : 0), 0, 100)};
  return {...carrera, mercado: m, confianza: conf, plantilla: [...(carrera.plantilla || []), id],
    cantera: [...(carrera.cantera || []), {...juvenil, id, enPartido: carrera.partidos.length, temporada: carrera.temporada, canterano: true}]};
}
