// Motor FC: motor de eventos del presidente. Sin IA: reglas + plantillas de diálogo.
// Cada resultado mueve la confianza según lo esperado (nivel propio vs rival), la dificultad y el perfil del presidente.
// Algunos momentos abren una reunión con 3 respuestas; cada respuesta tiene consecuencias reales sobre la carrera.
import {paciencia} from './dificultades.js';
import {resultado, rachaSinGanar, forma} from './calendario.js';

const MULT_DIF = {facil: 0.6, medio: 1, dificil: 1.2, hardcore: 1.5, leyenda: 1.8};
const clamp = (x, a, b) => Math.round(Math.max(a, Math.min(b, x)) * 10) / 10; // un decimal, sin arrastre de flotantes

/** Cuánto sube o baja la confianza del presidente por un partido. */
export function deltaPartido({nivelPropio, nivelRival, dificultad, perfil = null, comp = 'liga'}, p) {
  const dif = (nivelPropio ?? 3) - (nivelRival ?? 3); // >0: éramos favoritos
  const r = resultado(p);
  let d = r === 'G' ? 3 - dif * 0.5 : r === 'E' ? -dif * 1.0 : -3 - dif * 1.0;
  if (r === 'G' && p.gf - p.gc >= 3) d += 1;
  if (r === 'P' && p.gc - p.gf >= 3) d -= 2;
  if (comp !== 'liga') d *= 1.3;
  d = clamp(d, -6, 5); // un solo partido nunca define un ciclo
  d = d < 0 ? d * MULT_DIF[dificultad] * (perfil === 'ultra' ? 1.5 : 1) : d / MULT_DIF[dificultad];
  return Math.round(d * 10) / 10;
}

export function tension(confianza) {
  if (confianza >= 65) return {nivel: 'baja', texto: 'Baja tensión'};
  if (confianza >= 45) return {nivel: 'media', texto: 'Tensión media'};
  if (confianza >= 30) return {nivel: 'alta', texto: 'Tensión alta'};
  return {nivel: 'critica', texto: 'Al borde del despido'};
}

// Reuniones: cada respuesta trae efectos {presidente, vestuario, hinchas} y banderas opcionales.
const REUNIONES = {
  ultimatum: (ctx) => ({
    tipo: 'ultimatum', titulo: 'Reunión urgente con el presidente',
    texto: `Llevamos ${ctx.racha} partidos sin ganar. Esto no es lo que hablamos al firmar. Necesito ver una reacción ya.`,
    respuestas: [
      {id: 'asumir', texto: 'Tiene razón. Asumo la responsabilidad y en los próximos 3 partidos se ve el cambio.', efectos: {presidente: +4, vestuario: 0, hinchas: +2}, bandera: {plazo: 3}},
      {id: 'refuerzos', texto: 'Con esta plantilla no alcanza. Necesito refuerzos en enero.', efectos: {presidente: -3, vestuario: -4, hinchas: 0}, bandera: {pideRefuerzos: true}},
      {id: 'proyecto', texto: 'Hay un proyecto. Le pido paciencia, los resultados van a llegar.', efectos: {presidente: ctx.dificultad === 'facil' || ctx.dificultad === 'medio' ? +2 : -5, vestuario: +3, hinchas: -2}},
    ],
  }),
  elogio: (ctx) => ({
    tipo: 'elogio', titulo: 'El presidente quiere verte',
    texto: `Muy buena racha: ${ctx.forma.join(' ')}. La gente está contenta. ¿Qué necesitás para seguir así?`,
    respuestas: [
      {id: 'renovar', texto: 'Quiero renovar a los pilares del equipo.', efectos: {presidente: +1, vestuario: +5, hinchas: +1}, bandera: {renovaciones: true}},
      {id: 'presupuesto', texto: 'Un poco más de margen en el próximo mercado.', efectos: {presidente: -1, vestuario: 0, hinchas: 0}, bandera: {presupuestoExtraPct: 10}},
      {id: 'nada', texto: 'Nada, seguimos con el plan. El mérito es de los jugadores.', efectos: {presidente: +3, vestuario: +3, hinchas: +2}},
    ],
  }),
  aviso: (ctx) => ({
    tipo: 'aviso', titulo: 'Llamado de atención del presidente',
    texto: ctx.goleadas >= 2 ? `Perder así no es aceptable para este club. Quiero saber qué está pasando.` : `No me gusta lo que veo. Así no llegamos a los objetivos.`,
    respuestas: [
      {id: 'autocritica', texto: 'Tiene razón. Ya hablé con el plantel y vamos a corregirlo.', efectos: {presidente: +3, vestuario: -1, hinchas: +1}},
      {id: 'defender', texto: 'El equipo está dejando todo. Fueron partidos puntuales.', efectos: {presidente: -2, vestuario: +4, hinchas: 0}},
      {id: 'cambios', texto: 'Voy a hacer cambios en el once desde el próximo partido.', efectos: {presidente: +2, vestuario: -3, hinchas: +2}, bandera: {cambiosOnce: true}},
    ],
  }),
  despido: (ctx) => ({
    tipo: 'despido', titulo: 'Fin del ciclo',
    texto: `El directorio decidió prescindir de tus servicios. Gracias por el trabajo.`,
    respuestas: [{id: 'aceptar', texto: 'Entendido. Gracias por la oportunidad.', efectos: {presidente: 0, vestuario: 0, hinchas: 0}, bandera: {fin: true}}],
  }),
};

const pendiente = (carrera, tipo, extra = () => true) => (carrera.eventos || []).some(e => e.tipo === tipo && !e.respondido && extra(e));

/**
 * Procesa un partido cargado o corregido. ctx: {nivelRival, perfil}
 * - Partido nuevo: mueve la confianza y puede generar eventos.
 * - Partido corregido (mismo id ya procesado): revierte lo que había sumado, aplica el valor nuevo y NO genera eventos.
 * - Si ya hay un evento del mismo tipo sin contestar, no se genera otro (el ultimátum igual cuenta para el despido).
 * - Con la carrera terminada (despido) no hace nada.
 */
export function procesarPartido(carrera, partido, {nivelRival = 3, perfil = null} = {}) {
  if (carrera.estado?.despedido || carrera.estado?.finalizada) return {carrera, eventos: [], delta: 0, tension: tension(carrera.confianza.presidente), cerrada: true};
  const pac = paciencia(carrera.dificultad);
  const aplicado = {...(carrera.aplicado || {})};
  const previo = aplicado[partido.id];
  const d = deltaPartido({nivelPropio: carrera.club.nivel, nivelRival, dificultad: carrera.dificultad, perfil, comp: partido.comp}, partido);
  const r = resultado(partido);
  const nuevo = {presidente: d, vestuario: r === 'G' ? 2 : r === 'E' ? 0 : -2, hinchas: +(d * 1.2).toFixed(1)};
  const base = previo
    ? {presidente: carrera.confianza.presidente - previo.presidente, vestuario: carrera.confianza.vestuario - previo.vestuario, hinchas: carrera.confianza.hinchas - previo.hinchas}
    : carrera.confianza;
  const conf = {
    presidente: clamp(base.presidente + nuevo.presidente, 0, pac.techo),
    vestuario: clamp(base.vestuario + nuevo.vestuario, 0, 100),
    hinchas: clamp(base.hinchas + nuevo.hinchas, 0, 100),
  };
  aplicado[partido.id] = nuevo;
  const partidos = carrera.partidos.some(p => p.id === partido.id)
    ? carrera.partidos.map(p => (p.id === partido.id ? partido : p))
    : [...carrera.partidos, partido];
  const estado = {...(carrera.estado || {ultimatums: 0, despedido: false})};
  const eventos = [];
  if (!previo) {
    const racha = rachaSinGanar(partidos), f = forma(partidos);
    const goleadas = partidos.slice(-3).filter(x => x.gc - x.gf >= 3).length;
    const ctx = {racha, forma: f, dificultad: carrera.dificultad, goleadas};
    const ultimoAviso = [...(carrera.eventos || [])].reverse().find(e => e.tipo === 'aviso');
    const avisoReciente = ultimoAviso && partidos.slice(-2, -1).some(p => p.id === ultimoAviso.partidoId);
    if (pac.ultimatumTrasSinGanar && racha > 0 && racha % pac.ultimatumTrasSinGanar === 0) {
      estado.ultimatums++;
      const puedeEchar = pac.despidoTemp1 && pac.ultimatumsParaDespido && estado.ultimatums >= pac.ultimatumsParaDespido;
      if (puedeEchar || (estado.ultimatums >= 2 && conf.presidente < 15)) { estado.despedido = true; estado.finalizada = true; estado.motivoFin = 'despido'; eventos.push(REUNIONES.despido(ctx)); }
      else if (!pendiente(carrera, 'ultimatum')) eventos.push(REUNIONES.ultimatum(ctx));
    } else if (pac.ultimatumTrasSinGanar && r !== 'G' && !avisoReciente && !pendiente(carrera, 'aviso') && !pendiente(carrera, 'ultimatum')
      && (goleadas >= 2 || (racha === Math.ceil(pac.ultimatumTrasSinGanar / 2) && carrera.club.nivel >= 3) || (conf.presidente < 35 && carrera.confianza.presidente >= 35))) {
      eventos.push(REUNIONES.aviso(ctx));
    } else if (f.length >= 5 && f.every(x => x === 'G') && !pendiente(carrera, 'elogio')) {
      eventos.push(REUNIONES.elogio(ctx));
    }
  }
  const conId = eventos.map((e, i) => ({...e, id: `e${(carrera.eventos?.length || 0) + i + 1}`, partidoId: partido.id, respondido: null, oficina: 'presidente'}));
  return {carrera: {...carrera, partidos, confianza: conf, estado, aplicado, eventos: [...(carrera.eventos || []), ...conId]}, eventos: conId, delta: +(conf.presidente - (previo ? carrera.confianza.presidente : base.presidente)).toFixed(1),
    deltas: Object.fromEntries(['presidente', 'vestuario', 'hinchas'].map(k => [k, +(conf[k] - carrera.confianza[k]).toFixed(1)])),
    tension: tension(conf.presidente), corregido: !!previo, etiqueta: previo ? 'Resultado corregido' : null, cerrada: !!estado.finalizada};
}

/** Aplica la respuesta elegida en una reunión. */
export function responder(carrera, eventoId, respuestaId) {
  const pac = paciencia(carrera.dificultad);
  const ev = carrera.eventos.find(e => e.id === eventoId);
  if (!ev) throw new Error('Evento inexistente');
  if (ev.respondido) throw new Error('Esa reunión ya se respondió');
  const resp = ev.respuestas.find(r => r.id === respuestaId);
  if (!resp) throw new Error('Respuesta inexistente');
  const c = carrera.confianza, e = {presidente: 0, vestuario: 0, hinchas: 0, ...resp.efectos};
  const confianza = {
    presidente: clamp(c.presidente + e.presidente, 0, pac.techo),
    vestuario: clamp(c.vestuario + e.vestuario, 0, 100),
    hinchas: clamp(c.hinchas + e.hinchas, 0, 100),
  };
  const banderas = {...(carrera.banderas || {}), ...(resp.bandera || {})};
  const eventos = carrera.eventos.map(x => (x.id === eventoId ? {...x, respondido: respuestaId} : x));
  return {...carrera, confianza, banderas, eventos};
}
