// Motor FC: finanzas cargadas desde el juego. EA pone sueldos y presupuestos propios, así que el jugador carga
// la masa salarial y el presupuesto que le da su modo carrera, y los límites salen de esos números + dificultad + salud del club.
import {REGLAS} from './dificultades.js';
import {finanzas} from './estimados.js';

const r1 = x => Math.round(x * 10) / 10;
// Salud económica: solo con fuente. Ligue 1: clubes encuadrados por la DNCG (decisiones del 26-06-2026, ver OBJETIVOS-Y-FFP.md).
export const SALUD_CON_FUENTE = {
  'olympique-marseille': {salud: 'ajustada', fuente: 'https://www.lfp.fr/article/dncg-releve-de-decisions-du-26-juin-2026', nota: 'Masa salarial encuadrada por la DNCG'},
  'olympique-lyon': {salud: 'ajustada', fuente: 'https://www.lfp.fr/article/dncg-releve-de-decisions-du-26-juin-2026', nota: 'Masa salarial encuadrada por la DNCG'},
  'as-monaco': {salud: 'ajustada', fuente: 'https://www.lfp.fr/article/dncg-releve-de-decisions-du-26-juin-2026', nota: 'Masa salarial encuadrada por la DNCG'},
};
const F_SALUD = {sana: {presupuesto: 1.1, tope: 1.04}, ajustada: {presupuesto: 0.85, tope: 0.88}, crisis: {presupuesto: 0.6, tope: 0.82}, null: {presupuesto: 1, tope: 1}};
export const factoresSalud = salud => F_SALUD[salud] ?? F_SALUD.null;

export function saludClub(club, override = null) {
  if (override) return {salud: override, fuente: 'elegida por el jugador'};
  if (club.saludEconomica?.salud) return club.saludEconomica;
  return SALUD_CON_FUENTE[club.id] ?? {salud: null, fuente: null, nota: 'Sin dato con fuente: neutral'};
}

/** Pasar el sueldo semanal del juego (miles de €) a M€ por año. */
export const semanalAAnualM = k => r1((k * 52) / 1000);

/**
 * El jugador carga lo que muestra el juego: masa salarial actual y presupuesto de fichajes (M€ por año).
 * salud opcional ('sana' | 'ajustada' | 'crisis') si el jugador quiere forzarla.
 */
export function configurarFinanzas(carrera, club, {masaJuegoM, presupuestoJuegoM, salud = null}) {
  if (!(masaJuegoM > 0)) throw new Error('Cargá la masa salarial del juego (mayor a 0)');
  if (!(presupuestoJuegoM >= 0)) throw new Error('Cargá el presupuesto del juego (0 o más)');
  const r = REGLAS[carrera.dificultad], s = saludClub(club, salud), f = factoresSalud(s.salud);
  const mecenas = club.presidente?.perfil === 'mecenas' ? 1.1 : 1;
  // Números cargados a mano: la salud no toca el presupuesto. Solo aprieta el tope salarial.
  const presupuestoM = r.presupuesto === 0 ? 0 : r1(presupuestoJuegoM * r.presupuesto * mecenas);
  const topeM = r1(masaJuegoM * r.tope * f.tope);
  const fj = {masaJuegoM: r1(masaJuegoM), presupuestoJuegoM: r1(presupuestoJuegoM), presupuestoM, topeM, salud: s, manual: true,
    explicacion: [
      `Presupuesto: ${presupuestoJuegoM} M€ del juego × ${r.presupuesto} por la dificultad${mecenas !== 1 ? ' × 1,1 por presidente mecenas' : ''}. La salud no lo cambia porque lo cargaste vos.`,
      `Tope salarial: ${masaJuegoM} M€ × ${r.tope} por la dificultad${f.tope !== 1 ? ` × ${f.tope} por salud ${s.salud}` : ''}`,
      ...(r.reinvierteVentas != null ? [`Solo se reinvierte el ${r.reinvierteVentas * 100}% de las ventas`] : []),
    ]};
  return {...carrera, finanzasJuego: fj};
}

/** Sin números del juego: la salud (si no es neutral) sí mueve el presupuesto estimado y el tope. */
export function aplicarSaludEstimada(carrera, club, salud = null) {
  const s = saludClub(club, salud);
  if (!s.salud) return carrera;
  const est = finanzas(club, carrera.dificultad), f = factoresSalud(s.salud);
  const p0 = est.presupuesto?.central ?? 0, t0 = est.topeSalarial?.central ?? 0;
  const presupuestoM = est.presupuesto == null ? null : (p0 === 0 ? 0 : r1(p0 * f.presupuesto));
  const topeM = est.topeSalarial == null ? null : r1(t0 * f.tope);
  return {...carrera, finanzasJuego: {
    estimado: true, manual: false,
    presupuestoJuegoM: est.presupuesto?.central ?? null, masaJuegoM: est.masaActual?.central ?? null,
    presupuestoM, topeM, salud: s,
    explicacion: [
      `Presupuesto estimado × ${f.presupuesto} por salud ${s.salud}`,
      `Tope salarial estimado × ${f.tope} por salud ${s.salud}`,
    ],
  }};
}

// Sanciones por dificultad y liga. Los mecanismos son los reales (OBJETIVOS-Y-FFP.md); los montos de multa son regla de la app.
const BLOQUEO_LIGA = new Set(['LaLiga', 'Serie A']);
export const MULTA_SOBRE_EXCESO = 0.5; // regla de la app: multa = 50% del exceso anual
export function evaluarFairPlay(carrera, club, est) {
  const dif = carrera.dificultad;
  const uso = est.usoMasa;
  if (uso == null) return {estado: 'sin-dato', uso: null, sancion: null, texto: 'Sin datos para controlar el fair play'};
  if (uso <= 0.85) return {estado: 'ok', uso, sancion: null, texto: 'Dentro del límite'};
  if (uso <= 1) return {estado: 'aviso', uso, sancion: null, texto: `Al ${Math.round(uso * 100)}% del tope`};
  const excesoM = r1(est.masaM - est.topeM), reinc = carrera.fairPlay?.incumplimientos ?? 0;
  const s = {bloqueo: false, multaM: 0, puntos: 0, recorteTope: 0, sinEuropa: false, textos: []};
  if (dif === 'facil') return {estado: 'excedido', uso, excesoM, sancion: null, texto: 'Te pasaste del tope (en fácil es solo un aviso)'};
  if (BLOQUEO_LIGA.has(club.liga)) { s.bloqueo = true; s.textos.push(club.liga === 'LaLiga' ? 'LaLiga no inscribe altas hasta volver al límite' : 'Serie A: mercado bloqueado a saldo cero'); }
  else { s.multaM = r1(excesoM * MULTA_SOBRE_EXCESO); s.textos.push(`Multa de ${s.multaM} M€ (50% del exceso, regla de la app)`); }
  if (dif === 'dificil' || dif === 'hardcore' || dif === 'leyenda') { s.recorteTope = 0.05; s.textos.push('Te recortan el tope un 5% para lo que queda de temporada'); }
  if (dif === 'hardcore' || dif === 'leyenda') { s.bloqueo = true; s.textos.push('Prohibido inscribir fichajes hasta volver al límite'); }
  if (dif === 'leyenda') { s.puntos = reinc ? 6 : 3; s.textos.push(`Descuento de ${s.puntos} puntos en la liga`); if (reinc) { s.sinEuropa = true; s.textos.push('Reincidencia: exclusión de Europa la próxima temporada'); } }
  return {estado: 'excedido', uso, excesoM, sancion: s, texto: s.textos.join('. ')};
}

/** Se llama al cerrar cada ventana: si estás excedido, aplica la sanción (multa al presupuesto, recorte, confianza). */
export function cierreDeVentana(carrera, club, est) {
  const fp = evaluarFairPlay(carrera, club, est);
  const base = {...carrera, mercado: {...(carrera.mercado || {}), altasVentana: 0}};
  if (fp.estado !== 'excedido' || !fp.sancion) return {carrera: base, fairPlay: fp};
  const s = fp.sancion, m = {gastadoM: 0, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, ...(base.mercado)};
  m.multasM = r1((m.multasM || 0) + s.multaM);
  const fj = base.finanzasJuego && s.recorteTope ? {...base.finanzasJuego, topeM: r1(base.finanzasJuego.topeM * (1 - s.recorteTope))} : base.finanzasJuego;
  const historial = [...(base.fairPlay?.historial || []), {temporada: base.temporada, enPartido: base.partidos.length, ...s}];
  return {
    carrera: {...base, mercado: m, finanzasJuego: fj, bloqueoInscripciones: s.bloqueo,
      fairPlay: {incumplimientos: (base.fairPlay?.incumplimientos ?? 0) + 1, historial, puntosDescontados: (base.fairPlay?.puntosDescontados ?? 0) + s.puntos, sinEuropa: s.sinEuropa || !!base.fairPlay?.sinEuropa},
      confianza: {...base.confianza, presidente: Math.max(0, r1(base.confianza.presidente - 8))}},
    fairPlay: fp,
  };
}
