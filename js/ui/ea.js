// Datos del juego (EA FC 26), separados de los de la vida real (Transfermarkt). Misma lógica que diseno/maquetas/comun.js.
import {lineaDe} from './util.js';
export const ovr = j => j?.ea && j.ea.ovr != null ? j.ea.ovr : null;
export const claseOvr = v => v == null ? '' : v >= 75 ? 'oro' : v >= 65 ? 'plata' : 'bronce';
export const chipOvr = j => { const v = ovr(j); return v == null ? '<span class="meta" title="Sin ficha en EA">—</span>' : `<span class="ovr-chip ${claseOvr(v)} num">${v}</span>`; };
// Promedios estilo "Classic Match": media EA de los mejores de cada línea (ATA 3, MED 3, DEF 4 + arquero).
export function lineasEA(J){
  const top = (l, n) => { const v = J.filter(j => lineaDe(j.pos) === l && ovr(j) != null).map(ovr).sort((a, b) => b - a).slice(0, n); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  const por = top('por', 1), def = top('def', 4);
  return {ata: top('del', 3), med: top('med', 3), def: por != null && def != null ? Math.round((def * 4 + por) / 5) : def};
}
// Once ideal por media EA, en la formación pedida (por defecto 4-3-3). Cada puesto trae x/y (%) para la pizarra.
const P = {POR: ['POR'], LI: ['LI', 'CAI'], LD: ['LD', 'CAD'], DFC: ['DFC', 'LD', 'LI', 'MCD'], CAI: ['CAI', 'LI', 'MI', 'EI'], CAD: ['CAD', 'LD', 'MD', 'ED'], MCD: ['MCD', 'MC'], MC: ['MC', 'MCD', 'MCO'], MCO: ['MCO', 'MC', 'SD', 'EI', 'ED'], MI: ['MI', 'EI', 'CAI'], MD: ['MD', 'ED', 'CAD'], EI: ['EI', 'MI', 'DC'], ED: ['ED', 'MD', 'DC'], DC: ['DC', 'SD', 'EI', 'ED']};
const fila = (y, roles) => roles.map((r, i) => [r, Math.round((100 / (roles.length + 1)) * (i + 1)), y]);
export const FORMAS = {
  '4-3-3': [...fila(72, ['LI', 'DFC', 'DFC', 'LD']), ...fila(52, ['MC', 'MCD', 'MC']), ...fila(22, ['EI', 'DC', 'ED'])],
  '4-2-3-1': [...fila(72, ['LI', 'DFC', 'DFC', 'LD']), ...fila(60, ['MCD', 'MCD']), ...fila(38, ['MI', 'MCO', 'MD']), ...fila(16, ['DC'])],
  '4-4-2': [...fila(72, ['LI', 'DFC', 'DFC', 'LD']), ...fila(50, ['MI', 'MC', 'MC', 'MD']), ...fila(20, ['DC', 'DC'])],
  '4-1-4-1': [...fila(72, ['LI', 'DFC', 'DFC', 'LD']), ...fila(62, ['MCD']), ...fila(42, ['MI', 'MC', 'MC', 'MD']), ...fila(16, ['DC'])],
  '3-5-2': [...fila(72, ['DFC', 'DFC', 'DFC']), ...fila(50, ['CAI', 'MC', 'MCD', 'MC', 'CAD']), ...fila(20, ['DC', 'DC'])],
  '3-4-3': [...fila(72, ['DFC', 'DFC', 'DFC']), ...fila(52, ['CAI', 'MC', 'MC', 'CAD']), ...fila(22, ['EI', 'DC', 'ED'])],
  '5-3-2': [...fila(70, ['CAI', 'DFC', 'DFC', 'DFC', 'CAD']), ...fila(50, ['MC', 'MCD', 'MC']), ...fila(20, ['DC', 'DC'])],
  '5-4-1': [...fila(70, ['CAI', 'DFC', 'DFC', 'DFC', 'CAD']), ...fila(48, ['MI', 'MC', 'MC', 'MD']), ...fila(18, ['DC'])],
};
export function onceEA(J, formacion = '4-3-3'){
  const forma = FORMAS[formacion] || FORMAS['4-3-3'];
  const res = [['POR', 50, 92], ...forma].map(([rol, x, y]) => ({rol, x, y, j: null}));
  // Encaje: 0 = posición principal, 1 = secundaria, 2 = parecida (extremo de carrilero o delantero, etc.).
  const encaje = (j, rol) => j.pos === rol ? 0 : (j.posSec || []).includes(rol) ? 1 : rol !== 'POR' && j.pos !== 'POR' && (P[rol] || []).includes(j.pos) ? 2 : 9;
  const orden = [...J].sort((a, b) => (ovr(b) || 0) - (ovr(a) || 0) || (b.valorM || 0) - (a.valorM || 0));
  const usados = new Set();
  // 1) puesto principal o secundario, 2) puesto parecido, 3) el mejor que sobre. Siempre eligen primero los de más media.
  for (const tope of [1, 2]) for (const j of orden) {
    if (usados.has(j)) continue;
    const libres = res.filter(r => !r.j).map(r => ({r, e: encaje(j, r.rol)})).filter(x => x.e <= tope).sort((a, b) => a.e - b.e);
    if (libres.length) { libres[0].r.j = j; usados.add(j); }
  }
  for (const r of res.filter(x => !x.j)) { const j = orden.find(j => !usados.has(j) && (r.rol === 'POR') === (j.pos === 'POR')); if (j) { r.j = j; usados.add(j); } }
  // 4) Las 3 figuras de campo nunca quedan en el banco: entran en un puesto parecido en lugar del de menos media.
  for (const j of orden.filter(j => j.pos !== 'POR').slice(0, 3)) {
    if (usados.has(j)) continue;
    const r = res.filter(r => r.j && encaje(j, r.rol) <= 2 && (ovr(r.j) || 0) < (ovr(j) || 0)).sort((a, b) => (ovr(a.j) || 0) - (ovr(b.j) || 0))[0];
    if (r) { usados.delete(r.j); r.j = j; usados.add(j); }
  }
  return res;
}
export const estrellitas = (n, max = 5) => `${'★'.repeat(n || 0)}<span style="opacity:.25">${'★'.repeat(max - (n || 0))}</span>`;
export const apellido = n => { const p = String(n).split(' '); const u = p[p.length - 1]; return p.length > 1 && /^(Junior|Júnior|Jr\.?)$/i.test(u) ? p[0] : u; };
