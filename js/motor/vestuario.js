// Motor FC: oficina del DT. Vestuario, charlas y eventos de jugadores. Reglas, sin IA.
import {resultado, forma} from './calendario.js';
const clamp = (x, a, b) => Math.round(Math.max(a, Math.min(b, x)) * 10) / 10; // un decimal, sin arrastre de flotantes
const DUREZA = {facil: 0.6, medio: 1, dificil: 1.2, hardcore: 1.4, leyenda: 1.6};

/** Charla que inicia el jugador: 'motivar' | 'exigir' | 'calmar'. El efecto depende del momento del equipo. */
export const CHARLAS = {
  motivar: {texto: 'Charla para motivar al plantel'},
  exigir: {texto: 'Charla para exigir más'},
  calmar: {texto: 'Charla para bajar la presión'},
};
export function charlaVestuario(carrera, tipo) {
  if (!CHARLAS[tipo]) throw new Error(`Charla inválida: ${tipo}`);
  const f = forma(carrera.partidos, 3);
  const malos = f.filter(x => x === 'P').length, buenos = f.filter(x => x === 'G').length;
  const ultima = carrera.ultimaCharla ?? -99, ahora = carrera.partidos.length;
  const repetida = ahora - ultima < 2; // charlar cada partido pierde efecto
  let v = 0, texto;
  if (tipo === 'motivar') { v = malos >= 2 ? 6 : buenos >= 2 ? 1 : 3; texto = malos >= 2 ? 'El plantel respondió bien: necesitaban un empujón.' : 'Lo escucharon, pero el equipo ya venía arriba.'; }
  if (tipo === 'exigir') { v = buenos >= 2 ? -4 : malos >= 2 ? 3 : 0; texto = buenos >= 2 ? 'Cayó mal: el equipo venía ganando y sintió que no se valoraba.' : malos >= 2 ? 'El mensaje llegó: saben que así no alcanza.' : 'Reacciones divididas en el vestuario.'; }
  if (tipo === 'calmar') { v = malos >= 2 ? 4 : 1; texto = malos >= 2 ? 'Bajó la tensión, el grupo respira.' : 'No había mucho que calmar.'; }
  if (repetida) { v = Math.min(v, 0) - 1; texto = 'Ya hablaste hace poco: el mensaje perdió fuerza.'; }
  const vestuario = clamp(carrera.confianza.vestuario + v, 0, 100);
  return {carrera: {...carrera, confianza: {...carrera.confianza, vestuario}, ultimaCharla: ahora}, efecto: v, texto};
}

/**
 * Eventos del vestuario tras un partido. ctx: {plantilla:[{id, nombre, edad, contratoHasta, valorM}], titulares?:[ids]}
 * Tipos: 'goleador-renovacion' (3 partidos seguidos convirtiendo y contrato que vence pronto), 'vestuario-dividido', 'reclamo-minutos'.
 */
const pendiente = (carrera, tipo, jugadorId = null) => (carrera.eventos || []).some(e => e.tipo === tipo && !e.respondido && (jugadorId == null || e.jugadorId === jugadorId));

export function procesarVestuario(carrera, partido, {plantilla = [], titulares = null} = {}) {
  titulares = titulares ?? partido.titulares ?? null;
  const eventos = [];
  // Corregir un partido viejo o una carrera terminada no genera eventos nuevos.
  if (carrera.estado?.finalizada || (carrera.vestuarioProcesado || []).includes(partido.id)) return {carrera, eventos};
  carrera = {...carrera, vestuarioProcesado: [...(carrera.vestuarioProcesado || []), partido.id]};
  const ps = carrera.partidos;
  const nombre = id => plantilla.find(j => j.id === id)?.nombre ?? 'un jugador';
  const k = DUREZA[carrera.dificultad] ?? 1;
  // Goleador en racha con contrato corto
  const ult3 = ps.slice(-3);
  if (ult3.length === 3) {
    for (const id of new Set(partido.goleadores || [])) {
      if (!ult3.every(p => (p.goleadores || []).includes(id))) continue;
      const j = plantilla.find(x => x.id === id);
      const anio = carrera.temporada ? +String(carrera.temporada).slice(0, 4) : 2026;
      if (j?.contratoHasta && +j.contratoHasta.slice(0, 4) <= anio + 1 && !pendiente(carrera, 'goleador-renovacion', id)) {
        eventos.push({tipo: 'goleador-renovacion', jugadorId: id, titulo: `${nombre(id)} pide renovar`, texto: `${nombre(id)} convirtió en los últimos 3 partidos y su contrato vence en ${j.contratoHasta}. Quiere hablar de su futuro.`,
          respuestas: [
            {id: 'renovar', texto: 'Le ofrecemos renovar ya.', efectos: {vestuario: +3, presidente: -1}, bandera: {renovar: id}},
            {id: 'fin', texto: 'Lo hablamos a fin de temporada.', efectos: {vestuario: -2 * k, presidente: 0}},
            {id: 'vender', texto: 'Si no renueva, lo vendemos en la próxima ventana.', efectos: {vestuario: -4 * k, presidente: +2}, bandera: {transferible: id}},
          ]});
      }
    }
  }
  // Vestuario dividido
  const v = carrera.confianza.vestuario;
  if (v < 40 && !pendiente(carrera, 'vestuario-dividido')) {
    eventos.push({tipo: 'vestuario-dividido', titulo: 'El vestuario está partido', texto: 'Hay un grupo de referentes que no está de acuerdo con cómo se maneja el equipo.',
      respuestas: [
        {id: 'reunion', texto: 'Me junto con los capitanes a solas.', efectos: {vestuario: +6, presidente: 0}},
        {id: 'mano-dura', texto: 'El que no está conforme, se sienta en el banco.', efectos: {vestuario: -3 * k, presidente: +2}},
        {id: 'ceder', texto: 'Escucho sus pedidos y ajusto el plan.', efectos: {vestuario: +4, presidente: -3}},
      ]});
  }
  // Reclamo de minutos: titular valioso que no está entre los titulares de los últimos 3 (si la UI informa titulares)
  if (Array.isArray(titulares) && ult3.length === 3) {
    const caros = [...plantilla].sort((a, b) => (b.valorM ?? 0) - (a.valorM ?? 0)).slice(0, 8);
    const sinJugar = caros.find(j => ult3.every(p => !(p.titulares || []).includes(j.id)));
    if (sinJugar && !pendiente(carrera, 'reclamo-minutos', sinJugar.id)) eventos.push({tipo: 'reclamo-minutos', jugadorId: sinJugar.id, titulo: `${sinJugar.nombre} quiere jugar`, texto: `${sinJugar.nombre} no fue titular en los últimos 3 partidos y pidió una explicación.`,
      respuestas: [
        {id: 'prometer', texto: 'Va a tener su oportunidad en el próximo partido.', efectos: {vestuario: +2, presidente: 0}, bandera: {prometidoTitular: sinJugar.id}},
        {id: 'competencia', texto: 'Tiene que ganarse el lugar en los entrenamientos.', efectos: {vestuario: -2 * k, presidente: +1}},
        {id: 'salida', texto: 'Si no está conforme, puede buscar club en enero.', efectos: {vestuario: -5 * k, presidente: 0}, bandera: {transferible: sinJugar.id}},
      ]});
  }
  const base = carrera.eventos?.length || 0;
  const conId = eventos.map((e, i) => ({...e, id: `e${base + i + 1}`, partidoId: partido.id, respondido: null, oficina: 'dt'}));
  return {carrera: {...carrera, eventos: [...(carrera.eventos || []), ...conId]}, eventos: conId};
}
