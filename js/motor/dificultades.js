// Motor FC: tabla de dificultades (aprobada por Donato, 2026-10-10). Sin DOM, sin red.
export const DIFICULTADES = ['facil', 'medio', 'dificil', 'hardcore', 'leyenda'];
export const NOMBRE_DIFICULTAD = {facil: 'Fácil', medio: 'Medio', dificil: 'Difícil', hardcore: 'Hardcore', leyenda: 'Leyenda'};

// Escalones de liga (de menor a mayor exigencia). El objetivo base por nivel es un índice acá.
export const ESCALONES_LIGA = [
  {id: 'permanencia', texto: 'Salvarse del descenso', puestoMax: null},
  {id: 'top12', texto: 'Terminar entre los 12 primeros', puestoMax: 12},
  {id: 'top10', texto: 'Terminar entre los 10 primeros', puestoMax: 10},
  {id: 'europa', texto: 'Clasificar a Europa (top 6–7)', puestoMax: 7},
  {id: 'top4', texto: 'Terminar en el top 4 (Champions)', puestoMax: 4},
  {id: 'titulo', texto: 'Ganar la liga', puestoMax: 1},
];
const BASE_LIGA = {1: 0, 2: 2, 3: 3, 4: 4, 5: 5};
// Objetivo europeo por nivel y dificultad (solo N4 y N5 tienen Champions asegurada como meta).
const UCL = {
  fase: {id: 'ucl-fase', texto: 'Pasar la fase de liga de Champions'},
  octavos: {id: 'ucl-octavos', texto: 'Llegar a octavos de Champions'},
  cuartos: {id: 'ucl-cuartos', texto: 'Llegar a cuartos de Champions'},
  semis: {id: 'ucl-semis', texto: 'Llegar a semis de Champions'},
  titulo: {id: 'ucl-titulo', texto: 'Ganar la Champions'},
};
const EXTRA = {
  5: {facil: 'octavos', medio: 'semis', dificil: 'semis', hardcore: 'semis', leyenda: 'titulo'},
  4: {facil: 'fase', medio: 'octavos', dificil: 'cuartos', hardcore: 'cuartos', leyenda: 'semis'},
};
const COPA_NACIONAL = {
  'Premier League': 'FA Cup', 'LaLiga': 'Copa del Rey', 'Serie A': 'Coppa Italia',
  'Bundesliga': 'DFB-Pokal', 'Ligue 1': 'Coupe de France',
};

export const REGLAS = {
  facil:    {escalon: -1, presupuesto: 1.5,  tope: 1.15, altasMax: null, edadMaxFichaje: null, sueldoMaxFactor: null, sub21: 0, protegeIdolos: false, reinvierteVentas: null,
             paciencia: {inicial: 80, ultimatumTrasSinGanar: null, despidoTemp1: false, despidoSiFallaObjetivo: false, ultimatumsParaDespido: null, techo: 100}},
  medio:    {escalon: 0, presupuesto: 1.0,  tope: 1.05, altasMax: null, edadMaxFichaje: null, sueldoMaxFactor: 1.5, sub21: 0, protegeIdolos: false, reinvierteVentas: null,
             paciencia: {inicial: 65, ultimatumTrasSinGanar: 6, despidoTemp1: true, despidoSiFallaObjetivo: false, ultimatumsParaDespido: 3, techo: 100}},
  dificil:  {escalon: 1, presupuesto: 0.7,  tope: 1.0,  altasMax: 4, edadMaxFichaje: null, sueldoMaxFactor: 1.5, sub21: 0, protegeIdolos: false, reinvierteVentas: null,
             paciencia: {inicial: 55, ultimatumTrasSinGanar: 4, despidoTemp1: true, despidoSiFallaObjetivo: false, ultimatumsParaDespido: 3, techo: 100}},
  hardcore: {escalon: 1, presupuesto: 0.35, tope: 0.9,  altasMax: 3, edadMaxFichaje: 30, sueldoMaxFactor: 1.0, sub21: 0, protegeIdolos: false, reinvierteVentas: null, copa: true,
             paciencia: {inicial: 45, ultimatumTrasSinGanar: 3, despidoTemp1: true, despidoSiFallaObjetivo: true, ultimatumsParaDespido: 2, techo: 100}},
  leyenda:  {escalon: 2, presupuesto: 0,    tope: 0.8,  altasMax: 2, edadMaxFichaje: 30, sueldoMaxFactor: 1.0, sub21: 3, protegeIdolos: true, reinvierteVentas: 0.5, copa: true,
             paciencia: {inicial: 35, ultimatumTrasSinGanar: 2, despidoTemp1: true, despidoSiFallaObjetivo: true, ultimatumsParaDespido: 2, techo: 70}},
};

function validar(nivel, dificultad) {
  if (![1, 2, 3, 4, 5].includes(nivel)) throw new Error(`Nivel de club inválido: ${nivel}`);
  if (!REGLAS[dificultad]) throw new Error(`Dificultad inválida: ${dificultad}`);
}

/** Objetivos de la temporada para un club ({nivel, liga}) y una dificultad. */
// Copa nacional: escalera por nivel, corrida por dificultad (pedido de Serafin: el Barça en medio tiene que ganar la Copa).
const ESC_COPA = [null, 'octavos', 'cuartos', 'semis', 'final', 'titulo'];
const TXT_COPA = {octavos: 'Llegar a octavos de la', cuartos: 'Llegar a cuartos de la', semis: 'Llegar a semis de la', final: 'Llegar a la final de la', titulo: 'Ganar la'};
const BASE_COPA = {1: 0, 2: 1, 3: 2, 4: 3, 5: 5};
const CORRE_COPA = {facil: -1, medio: 0, dificil: 1, hardcore: 2, leyenda: 2};
export function objetivoCopa(club, dificultad) {
  if (club.nivel === 1 && dificultad === 'leyenda') return null;
  const i = Math.max(0, Math.min(5, BASE_COPA[club.nivel] + CORRE_COPA[dificultad]));
  if (!ESC_COPA[i]) return null;
  const nombre = COPA_NACIONAL[club.liga] || 'copa nacional';
  return {tipo: 'copa', principal: false, id: 'copa-' + ESC_COPA[i], texto: `${TXT_COPA[ESC_COPA[i]]} ${nombre}`};
}

export function objetivos(club, dificultad) {
  const nivel = club.nivel;
  validar(nivel, dificultad);
  const r = REGLAS[dificultad];
  let idx = Math.max(0, Math.min(ESCALONES_LIGA.length - 1, BASE_LIGA[nivel] + r.escalon));
  if (nivel === 1 && dificultad === 'leyenda') idx = 2; // N1 leyenda: top 10 y nada más (ajuste Donato)
  const lista = [{tipo: 'liga', principal: true, ...ESCALONES_LIGA[idx]}];
  if (!(nivel === 1 && dificultad === 'leyenda')) {
    const extra = EXTRA[nivel] ? UCL[EXTRA[nivel][dificultad]] : null;
    if (extra) lista.push({tipo: 'europa', principal: false, ...extra});
    const copa = objetivoCopa(club, dificultad);
    if (copa) lista.push(copa);
  }
  return lista;
}

/** Restricciones del mercado y del vestuario. sueldoMasAltoM: sueldo anual más alto actual (si se conoce). */
export function restricciones(dificultad, sueldoMasAltoM = null) {
  validar(1, dificultad);
  const r = REGLAS[dificultad];
  const out = [];
  if (r.reinvierteVentas != null) out.push({id: 'solo-ventas', texto: `No hay presupuesto fijo: solo se reinvierte el ${r.reinvierteVentas * 100}% de lo que vendas`});
  if (r.altasMax) out.push({id: 'altas', valor: r.altasMax, texto: `Hasta ${r.altasMax} altas por ventana`});
  if (r.edadMaxFichaje) out.push({id: 'edad-fichajes', valor: r.edadMaxFichaje, texto: `No se puede fichar a jugadores de más de ${r.edadMaxFichaje} años (la plantilla actual no cuenta)`});
  if (r.sueldoMaxFactor) out.push({id: 'sueldo-max', valor: sueldoMasAltoM != null ? +(sueldoMasAltoM * r.sueldoMaxFactor).toFixed(1) : null,
    texto: r.sueldoMaxFactor === 1 ? 'Ningún sueldo nuevo puede superar al más alto de la plantilla' : `Ningún sueldo nuevo puede superar ${r.sueldoMaxFactor} veces al más alto de la plantilla`});
  if (r.sub21) out.push({id: 'sub21', valor: r.sub21, texto: `${r.sub21} jugadores sub-21 tienen que sumar minutos`});
  if (r.protegeIdolos) out.push({id: 'idolos', texto: 'No se puede vender al capitán ni a los ídolos sin el OK del presidente'});
  return out;
}

/** ¿Este fichaje respeta las reglas? Devuelve {ok, motivos[]}. */
export function puedeFichar(dificultad, {edad, sueldoM = null, altasEnVentana = 0, sueldoMasAltoM = null}) {
  validar(1, dificultad);
  const r = REGLAS[dificultad], motivos = [];
  if (r.altasMax && altasEnVentana >= r.altasMax) motivos.push(`Ya hiciste las ${r.altasMax} altas permitidas en esta ventana`);
  if (r.edadMaxFichaje && edad > r.edadMaxFichaje) motivos.push(`Tiene ${edad} años y el máximo para fichar es ${r.edadMaxFichaje}`);
  if (r.sueldoMaxFactor && sueldoM != null && sueldoMasAltoM != null && sueldoM > sueldoMasAltoM * r.sueldoMaxFactor) motivos.push('El sueldo supera el tope individual');
  return {ok: motivos.length === 0, motivos};
}

export function paciencia(dificultad) { validar(1, dificultad); return {...REGLAS[dificultad].paciencia}; }
