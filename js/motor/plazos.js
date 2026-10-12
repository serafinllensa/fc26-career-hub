// Motor FC: objetivos en tres plazos (aprobado por Donato). Categorías: deportivo, cantera, economico, institucional, desarrollo.
// La identidad del club (tags de Datos) decide QUÉ aparece; nivel y dificultad deciden CUÁNTO y CUÁNDO.
import {objetivos, REGLAS} from './dificultades.js';

export const PLAZOS = {facil: [1, 4, 6], medio: [1, 3, 5], dificil: [1, 3, 5], hardcore: [1, 2, 4], leyenda: [1, 2, 3]};
export const CANTERA_NOMBRE = {'fc-barcelona': 'La Masia', 'athletic-bilbao': 'Lezama', 'real-madrid': 'La Fábrica', 'ajax': 'De Toekomst'};

// Regla financiera de cada liga (ver OBJETIVOS-Y-FFP.md para las fuentes).
export const REGLA_LIGA = {
  'Premier League': {id: 'scr-premier', tope: 0.85, texto: 'Mantener el costo de plantilla por debajo del 85% de los ingresos (SCR de la Premier)'},
  'LaLiga': {id: 'lcpd', tope: null, texto: 'Mantenerse dentro del Límite de Coste de Plantilla Deportiva (regla 1:1)'},
  'Serie A': {id: 'cla-seriea', tope: 0.7, texto: 'Mantener el costo del trabajo por debajo del 70% de los ingresos (sin bloqueo de mercado)'},
  'Bundesliga': {id: 'kaderkosten', tope: 0.7, texto: 'Cumplir la regla de costo de plantilla de la DFL (70%)'},
  'Ligue 1': {id: 'dncg', tope: null, texto: 'Pasar el control de la DNCG sin encuadramiento de la masa salarial'},
  // Segunda: misma familia de control, sin un porcentaje que la fuente no dé para esta categoría.
  'Championship': {id: 'efl-psr', tope: null, texto: 'Pasar el control de rentabilidad y sostenibilidad de la EFL (sin un porcentaje cargado para el Championship)'},
  'Segunda División': {id: 'lcpd-2', tope: null, texto: 'Mantenerse dentro del control económico de LaLiga en Segunda (el límite de este club no está cargado)'},
  'Serie B': {id: 'figc-b', tope: null, texto: 'Pasar el control económico de la FIGC en Serie B (sin un tope numérico cargado)'},
  '2. Bundesliga': {id: 'dfl-2', tope: null, texto: 'Cumplir la licencia y el control de la DFL en la 2. Bundesliga (sin un porcentaje inventado)'},
  'Ligue 2': {id: 'dncg-2', tope: null, texto: 'Pasar el control de la DNCG en Ligue 2 (sin un tope numérico cargado)'},
};
const UEFA = {id: 'scr-uefa', tope: 0.7, texto: 'Cumplir el tope de 70% de la UEFA (costo de plantilla sobre ingresos)'};

const MED = {
  5: {id: 'med-ligas', texto: n => `Ganar al menos 2 ligas en ${n} temporadas`},
  4: {id: 'med-titulo', texto: n => `Ganar un título (liga, copa o Europa) en ${n} temporadas y jugar Champions todas`},
  3: {id: 'med-ucl', texto: n => `Clasificar a la Champions al menos una vez en ${n} temporadas`},
  2: {id: 'med-europa', texto: n => `Clasificar a una copa europea al menos una vez en ${n} temporadas`},
  1: {id: 'med-consolidar', texto: n => `Consolidarse en Primera: terminar entre los 12 primeros en la temporada ${n}`},
};
const LAR = {
  5: {id: 'lar-ucl', texto: n => `Ganar la Champions al menos una vez en ${n} temporadas`},
  4: {id: 'lar-liga', texto: n => `Ganar la liga o una copa europea en ${n} temporadas`},
  3: {id: 'lar-titulo', texto: n => `Ganar un título y ser fijo en Europa en ${n} temporadas`},
  2: {id: 'lar-europa2', texto: n => `Jugar en Europa al menos 2 veces en ${n} temporadas`},
  1: {id: 'lar-europa', texto: n => `Llevar al club a Europa al menos una vez en ${n} temporadas`},
};
const DUREZA = {facil: 0, medio: 1, dificil: 2, hardcore: 3, leyenda: 4};

function o(categoria, id, texto, extra = {}) { return {categoria, id, texto, ...extra}; }

/** {plazos:{corto,mediano,largo} (en temporadas), corto:[], mediano:[], largo:[]} */
export function objetivosPlazos(club, dificultad) {
  const [c, m, l] = PLAZOS[dificultad];
  const id = new Set(club.identidad || []);
  const d = DUREZA[dificultad], nivel = club.nivel, r = REGLAS[dificultad];
  const corto = objetivos(club, dificultad).map(x => ({categoria: 'deportivo', ...x}));
  const mediano = club.division === 2
    ? [o('deportivo', club.reserva ? 'med-filial' : 'med-ascenso', club.reserva ? `Seguir siendo competitivo en ${m} temporadas: un filial no asciende` : `Ascender a primera en ${m} temporadas`)]
    : [o('deportivo', MED[nivel].id, MED[nivel].texto(m))];
  const largo = club.division === 2
    ? [o('deportivo', club.reserva ? 'lar-filial' : 'lar-primera', club.reserva ? `Mantener al filial en la categoría en ${l} temporadas` : `Afirmarse en primera en ${l} temporadas`)]
    : [o('deportivo', LAR[nivel].id, LAR[nivel].texto(l))];

  // Cantera
  const cantera = CANTERA_NOMBRE[club.id] || 'la cantera';
  if (id.has('cantera')) {
    corto.push(o('cantera', 'debuts', `Que debuten ${1 + Math.ceil(d / 2)} juveniles de ${cantera}`));
    corto.push(o('cantera', 'minutos-juveniles', `Que ${2 + Math.floor(d / 2)} juveniles de ${cantera} pasen los 1.000 minutos`));
    largo.push(o('cantera', 'base-cantera', `Que al menos 4 titulares habituales salgan de ${cantera}`));
  } else if (r.sub21) {
    corto.push(o('cantera', 'sub21', `${r.sub21} jugadores sub-21 tienen que sumar minutos`));
  }
  // Económico (desde medio la regla de la liga es objetivo, no solo aviso)
  const regla = REGLA_LIGA[club.liga];
  if (regla && d >= 1) corto.push(o('economico', regla.id, regla.texto, {tope: regla.tope}));
  if (d >= 1 && nivel >= 3 && club.division !== 2) mediano.push(o('economico', UEFA.id, UEFA.texto, {tope: UEFA.tope}));
  if (id.has('vendedor')) {
    corto.push(o('economico', 'saldo-ventas', 'Cerrar la temporada con más ventas que compras'));
    mediano.push(o('desarrollo', 'revalorizar', `Subir ${20 + d * 5}% el valor de la plantilla en ${m} temporadas`, {pct: 20 + d * 5}));
  } else if (d >= 1) {
    mediano.push(o('desarrollo', 'revalorizar', `Subir ${5 + d * 5}% el valor de la plantilla en ${m} temporadas`, {pct: 5 + d * 5}));
  }
  if (club.presidente?.perfil === 'fondo') corto.push(o('economico', 'saldo-fondo', 'El fondo exige que lo vendido supere a lo comprado'));
  // Institucional
  if (id.has('club-de-socios') || r.protegeIdolos) corto.push(o('institucional', 'idolos', 'No vender al capitán ni a los ídolos sin el OK del presidente'));
  if (id.has('club-de-socios')) mediano.push(o('institucional', 'deuda', 'No aumentar la deuda del club'));
  if (id.has('ganador-inmediato') && d >= 1) corto.push(o('institucional', 'ganar-ya', 'El presidente quiere títulos ya: la paciencia baja un 20%'));
  return {plazos: {corto: c, mediano: m, largo: l}, corto, mediano, largo};
}
