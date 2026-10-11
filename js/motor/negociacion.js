// Motor FC: negociaciones con el presidente (presupuesto, masa salarial, aprobar un fichaje). Reglas deterministas.
import {REGLAS, puedeFichar} from './dificultades.js';
import {finanzas} from './estimados.js';
import {tension} from './presidente.js';

const clamp = (x, a, b) => Math.round(Math.max(a, Math.min(b, x)) * 10) / 10; // un decimal, sin arrastre de flotantes
export const TIPOS_PEDIDO = ['presupuesto', 'masa', 'fichaje'];
const AJ_DIF = {facil: 20, medio: 0, dificil: -10, hardcore: -20, leyenda: -30};
const AJ_PERFIL = {mecenas: 15, austero: -15, fondo: -10, ultra: 0, politico: 0};
// Bloqueos de mercado automáticos (reales) desde medio: LaLiga (LCPD) y Serie A (CLA 0,7). Ver OBJETIVOS-Y-FFP.md.
// Qué cuenta como "lo mismo": en fichajes, el mismo jugador; en presupuesto y masa, el mismo tipo por un monto parecido o mayor.
const claveJugador = j => (j?.id ?? j?.nombre ?? '').toString().toLowerCase();
function mismoPedido(previo, pedido) {
  if (previo.tipo !== pedido.tipo) return false;
  if (pedido.tipo === 'fichaje') return !!claveJugador(pedido.jugador) && previo.jugador === claveJugador(pedido.jugador);
  return previo.montoPedidoM == null || pedido.montoM >= previo.montoPedidoM * 0.8;
}
const BLOQUEO_AUTOMATICO = new Set(['LaLiga', 'Serie A']);

/** Estado financiero de la carrera: lo gastado y lo vendido se lleva en carrera.mercado. */
export function estadoMercado(carrera, club) {
  const f = finanzas(club, carrera.dificultad);
  const m = carrera.mercado || {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0};
  const r = REGLAS[carrera.dificultad];
  const presupuestoBase = f.presupuesto ? f.presupuesto.central : null;
  const deVentas = r.reinvierteVentas != null ? m.vendidoM * r.reinvierteVentas : m.vendidoM * 0.5;
  const disponibleM = presupuestoBase == null ? null : +(presupuestoBase + m.extraPresupuestoM + deVentas - m.gastadoM).toFixed(1);
  const masaM = f.masaActual ? +(f.masaActual.central + m.masaAltasM - m.masaBajasM).toFixed(1) : null;
  const topeM = f.topeSalarial ? +(f.topeSalarial.central + m.extraMasaM).toFixed(1) : null;
  return {disponibleM, masaM, topeM, usoMasa: masaM != null && topeM ? +(masaM / topeM).toFixed(3) : null, mercado: m, estimado: true};
}

function voluntad(carrera, club) {
  const perfil = club.presidente?.perfil ?? null;
  return clamp(carrera.confianza.presidente + AJ_DIF[carrera.dificultad] + (AJ_PERFIL[perfil] ?? 0), 0, 120);
}

/**
 * pedido: {tipo: 'presupuesto'|'masa', montoM} o {tipo: 'fichaje', jugador:{nombre, edad, valorM, sueldoM}, precioM}
 * Devuelve {decision: 'acepta'|'contraoferta'|'rechaza', aprobadoM, texto, motivos[], respuestas[], tension}
 */
export function pedirAlPresidente(carrera, club, pedidoOriginal) {
  let pedido = pedidoOriginal;
  if (!TIPOS_PEDIDO.includes(pedido.tipo)) throw new Error(`Pedido inválido: ${pedido.tipo}`);
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  const dif = carrera.dificultad, r = REGLAS[dif], perfil = club.presidente?.perfil ?? null;
  const est = estadoMercado(carrera, club);
  const motivos = [];
  const ahora = carrera.partidos.length;
  const ultimo = (carrera.negociaciones || []).filter(n => mismoPedido(n, pedido)).at(-1);
  if (ultimo && (ultimo.decision === 'rechaza' || ultimo.aprobadoM === 0) && ahora - ultimo.enPartido < 2) {
    return cerrar(carrera, pedido, 'rechaza', 0, 'Ya lo hablamos hace poco. La respuesta sigue siendo no.', ['Pediste lo mismo hace menos de 2 partidos'], est);
  }
  if (pedido.tipo === 'fichaje' && !(pedido.jugador?.sueldoM > 0)) {
    // Sin sueldo cargado: se estima en el 10% anual de lo que vale (o de lo que se paga). Siempre marcado como estimado.
    const base = pedido.jugador?.valorM ?? pedido.precioM;
    pedido = {...pedido, jugador: {...(pedido.jugador || {}), sueldoM: +Math.max(0.5, base * 0.1).toFixed(1), sueldoEstimado: true}};
    motivos.push(`Sueldo estimado ≈ ${pedido.jugador.sueldoM} M€ por año`);
  }
  let v = voluntad(carrera, club);
  let monto = pedido.tipo === 'fichaje' ? pedido.precioM : pedido.montoM;
  if (!(monto > 0)) throw new Error('El monto tiene que ser mayor a 0');

  if (pedido.tipo === 'fichaje' && est.disponibleM != null && est.disponibleM <= 0 && dif !== 'facil') {
    return cerrar(carrera, pedido, 'rechaza', 0, 'No queda un euro. Si querés comprar, primero vendé.', [`Disponible ≈ ${est.disponibleM} M€ (estimado)`], est);
  }
  if (pedido.tipo === 'fichaje') {
    const reglas = puedeFichar(dif, {edad: pedido.jugador?.edad, sueldoM: pedido.jugador?.sueldoM ?? null, altasEnVentana: est.mercado.altasVentana, sueldoMasAltoM: carrera.sueldoMasAltoM ?? null});
    if (!reglas.ok) return cerrar(carrera, pedido, 'rechaza', 0, 'Eso no se puede hacer con las reglas que acordamos.', reglas.motivos, est);
    if (perfil === 'fondo' && est.mercado.vendidoM < est.mercado.gastadoM + monto) { v -= 15; motivos.push('El fondo quiere vender antes de comprar'); }
    if (est.disponibleM != null && monto > est.disponibleM) { v -= 20; motivos.push(`Cuesta ${monto} M€ y quedan ≈ ${Math.max(0, est.disponibleM)} M€ (estimado)`); }
    if (perfil === 'ultra' && (pedido.jugador?.valorM ?? 0) >= 50) { v += 10; motivos.push('Al presidente le encantan los nombres grandes'); }
    if ((pedido.jugador?.edad ?? 99) <= 21) { v += 5; motivos.push('Es joven: se puede revalorizar'); }
  }
  if (pedido.tipo === 'presupuesto') {
    if (est.disponibleM == null) { v -= 20; motivos.push('Sin estimado de presupuesto para este club: decide solo por confianza'); }
    else {
      const proporcion = est.disponibleM > 0 ? monto / est.disponibleM : 2;
      v -= Math.min(50, proporcion * 40);
      motivos.push(est.disponibleM > 0 ? `Pedís ${Math.round(proporcion * 100)}% de lo que queda disponible` : 'No queda presupuesto disponible');
    }
    if (r.reinvierteVentas != null) { v -= 25; motivos.push('En esta dificultad solo se reinvierte lo que se vende'); }
  }
  if (pedido.tipo === 'masa' || (pedido.tipo === 'fichaje' && pedido.jugador?.sueldoM)) {
    const extra = pedido.tipo === 'masa' ? monto : pedido.jugador.sueldoM;
    if (est.masaM == null || est.topeM == null) motivos.push('Sin estimado de masa salarial: no se puede controlar el fair play');
    else if (est.masaM + extra > est.topeM) {
      const exceso = +((est.masaM + extra) / est.topeM - 1).toFixed(3);
      motivos.push(`La masa pasaría el tope en ${Math.round(exceso * 100)}% (estimado)`);
      if (dif === 'facil') motivos.push('Aviso de fair play: en fácil no hay sanción');
      else if (BLOQUEO_AUTOMATICO.has(club.liga)) return cerrar(carrera, pedido, 'rechaza', 0, club.liga === 'LaLiga' ? 'LaLiga no nos dejaría inscribirlo: nos pasamos del límite.' : 'Con la Serie A nos bloquean el mercado si pasamos el 70%.', motivos, est);
      else if (['hardcore', 'leyenda'].includes(dif)) return cerrar(carrera, pedido, 'rechaza', 0, 'Con el fair play encima no puedo firmar eso: nos prohíben inscribir.', motivos, est);
      else v -= 20 + exceso * 100;
    }
  }
  v = clamp(v, 0, 120);
  if (v >= 60) return cerrar(carrera, pedido, 'acepta', monto, perfil === 'mecenas' ? 'Hecho. Si es para ganar, se hace.' : 'Está bien. Confío en vos, no me falles.', motivos, est);
  if (v >= 35) {
    const contra = +(monto * (0.4 + (v - 35) / 50)).toFixed(1);
    return cerrar(carrera, pedido, 'contraoferta', contra, `Así no. Te puedo dar ${contra} M€ y ni un euro más.`, motivos, est);
  }
  return cerrar(carrera, pedido, 'rechaza', 0, perfil === 'austero' ? 'No hay plata para eso. Arreglate con lo que tenés.' : 'No. Primero quiero ver resultados.', motivos, est);
}

function cerrar(carrera, pedido, decision, aprobadoM, texto, motivos, est) {
  const respuestas = decision === 'contraoferta'
    ? [{id: 'aceptar', texto: 'Acepto lo que me ofrece.', efectos: {presidente: +2}},
       {id: 'insistir', texto: 'Necesito el monto completo, si no no llegamos.', efectos: {presidente: -6}, insistir: true},
       {id: 'retirar', texto: 'Está bien, lo dejamos para más adelante.', efectos: {presidente: +1}}]
    : decision === 'rechaza'
      ? [{id: 'aceptar', texto: 'Entendido.', efectos: {presidente: +1}}, {id: 'insistir', texto: 'Le pido que lo reconsidere.', efectos: {presidente: -5}, insistir: true}]
      : [{id: 'aceptar', texto: 'Gracias, presidente.', efectos: {presidente: 0}}];
  return {decision, aprobadoM, texto, motivos, respuestas, pedido, estado: est, tension: tension(carrera.confianza.presidente)};
}

/** Aplica la negociación con la respuesta elegida. Insistir en un rechazo nunca da vuelta la decisión, solo cuesta confianza. */
export function cerrarNegociacion(carrera, neg, respuestaId) {
  const resp = neg.respuestas.find(r => r.id === respuestaId);
  if (!resp) throw new Error('Respuesta inexistente');
  const techo = 100;
  const confianza = {...carrera.confianza, presidente: clamp(carrera.confianza.presidente + (resp.efectos.presidente || 0), 0, techo)};
  const m = {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0, ...(carrera.mercado || {})};
  let final = 'nada';
  const monto = neg.decision === 'acepta' ? neg.aprobadoM : neg.decision === 'contraoferta' && respuestaId === 'aceptar' ? neg.aprobadoM : 0;
  if (monto > 0) {
    final = 'aprobado';
    if (neg.pedido.tipo === 'presupuesto') m.extraPresupuestoM += monto;
    if (neg.pedido.tipo === 'masa') m.extraMasaM += monto;
    if (neg.pedido.tipo === 'fichaje') { m.gastadoM += monto; m.altasVentana += 1; m.masaAltasM += neg.pedido.jugador?.sueldoM ?? 0; }
  }
  const registro = {tipo: neg.pedido.tipo, jugador: neg.pedido.tipo === 'fichaje' ? claveJugador(neg.pedido.jugador) : null, montoPedidoM: neg.pedido.tipo === 'fichaje' ? neg.pedido.precioM : neg.pedido.montoM, decision: neg.decision, respuesta: respuestaId, aprobadoM: monto, enPartido: carrera.partidos.length};
  return {...carrera, confianza, mercado: m, negociaciones: [...(carrera.negociaciones || []), registro], ultimaNegociacion: final};
}

/** Registrar una venta (suma al saldo y libera masa). */
export function registrarVenta(carrera, {precioM, sueldoM = 0}) {
  const m = {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0, ...(carrera.mercado || {})};
  m.vendidoM += precioM; m.masaBajasM += sueldoM;
  return {...carrera, mercado: m};
}
export function nuevaVentana(carrera) { return {...carrera, mercado: {...(carrera.mercado || {}), altasVentana: 0}}; }
