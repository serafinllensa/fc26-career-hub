// Motor FC: fixture, carga de resultados, resumen y forma.
// Partido (acordado con Frontend): {id, comp, jornada, rivalId, local, gf, gc, goleadores:[jugadorId], fecha}
export const COMPETICIONES = ['liga', 'copa', 'ucl', 'uel', 'uecl'];

/**
 * Fixture de liga a doble rueda. Si Datos carga el oficial (data/fixtures/<liga>.json:
 * {fuente, fecha, jornadas:[{n, fecha, partidos:[{local, visitante}]}]}) se usa ese; si no, se genera y queda provisorio.
 */
export function fixtureLiga(clubIds, clubId, oficial = null) {
  if (oficial?.jornadas?.length) {
    const out = [];
    for (const j of oficial.jornadas) for (const p of j.partidos) {
      if (p.local !== clubId && p.visitante !== clubId) continue;
      const local = p.local === clubId, rr = p.resultadoReal;
      out.push({jornada: j.n, fecha: p.fecha ?? j.fecha ?? null, rivalId: local ? p.visitante : p.local, local, comp: 'liga', provisorio: false, fuente: oficial.fuente,
        // resultadoReal: desde el lado de TU club (gf = tus goles). resultadoRealLV: en orden local-visitante, para mostrar igual que el marcador.
        resultadoReal: rr ? {gf: local ? rr.gl : rr.gv, gc: local ? rr.gv : rr.gl} : null,
        resultadoRealLV: rr ? {local: rr.gl, visitante: rr.gv} : null, reprogramado: !!p.reprogramado});
    }
    return out.sort((a, b) => a.jornada - b.jornada);
  }
  const ids = [...clubIds].sort();
  if (ids.length % 2) ids.push(null);
  const n = ids.length, rondas = n - 1, ida = [];
  let rot = ids.slice(1);
  for (let r = 0; r < rondas; r++) {
    const fila = [ids[0], ...rot];
    for (let i = 0; i < n / 2; i++) {
      const a = fila[i], b = fila[n - 1 - i];
      if (a == null || b == null) continue;
      const aLocal = r % 2 === 0; // alterna cada jornada; al cruzar de mitad, como mucho 2 seguidos
      if (a === clubId || b === clubId) ida.push({jornada: r + 1, rivalId: a === clubId ? b : a, local: a === clubId ? aLocal : !aLocal});
    }
    rot = [rot[rot.length - 1], ...rot.slice(0, -1)];
  }
  const vuelta = ida.map(p => ({...p, jornada: p.jornada + rondas, local: !p.local}));
  return [...ida, ...vuelta].map(p => ({...p, comp: 'liga', fecha: null, provisorio: true}));
}

export function validarPartido(p) {
  const errores = [];
  if (!COMPETICIONES.includes(p.comp)) errores.push(`comp inválida: ${p.comp}`);
  if (typeof p.local !== 'boolean') errores.push('local tiene que ser true o false');
  for (const k of ['gf', 'gc']) if (!Number.isInteger(p[k]) || p[k] < 0 || p[k] > 30) errores.push(`${k} inválido`);
  if (!p.rivalId) errores.push('falta rivalId');
  if (p.goleadores && p.goleadores.length > p.gf) errores.push('hay más goleadores que goles');
  return errores;
}

export const resultado = p => (p.gf > p.gc ? 'G' : p.gf === p.gc ? 'E' : 'P');

/** Resumen de una competición (o de todas): PJ, PG, PE, PP, GF, GC, DG, Pts. */
export function resumen(partidos, comp = null) {
  const r = {pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, dg: 0, pts: 0};
  for (const p of partidos) {
    if (comp && p.comp !== comp) continue;
    r.pj++; r.gf += p.gf; r.gc += p.gc;
    const x = resultado(p);
    if (x === 'G') { r.pg++; r.pts += 3; } else if (x === 'E') { r.pe++; r.pts += 1; } else r.pp++;
  }
  r.dg = r.gf - r.gc;
  return r;
}

// Misma competición: manda la jornada (Serafin juega con el calendario de EA, no con las reprogramaciones reales).
// Entre competiciones distintas: manda la fecha.
const orden = (a, b) => (a.comp === b.comp && a.jornada != null && b.jornada != null
  ? a.jornada - b.jornada
  : (a.fecha && b.fecha ? a.fecha.localeCompare(b.fecha) : 0) || (a.jornada ?? 0) - (b.jornada ?? 0));
export function forma(partidos, n = 5) { return [...partidos].sort(orden).slice(-n).map(resultado); }
export function rachaSinGanar(partidos) {
  let k = 0;
  for (const p of [...partidos].sort(orden).reverse()) { if (resultado(p) === 'G') break; k++; }
  return k;
}
export function goleadores(partidos) {
  const m = new Map();
  for (const p of partidos) for (const g of p.goleadores || []) m.set(g, (m.get(g) || 0) + 1);
  return [...m.entries()].map(([jugadorId, goles]) => ({jugadorId, goles})).sort((a, b) => b.goles - a.goles);
}

/**
 * Análisis de un partido (sin IA, con reglas). ctx: {nivelPropio, nivelRival, partidosPrevios, plantilla:[{id, nombre}]}
 * Devuelve {titular, lineas[], sensacion: 'muy-bien'|'bien'|'normal'|'mal'|'muy-mal'}.
 */
export function analizarPartido(p, {nivelPropio = 3, nivelRival = 3, partidosPrevios = [], plantilla = []} = {}) {
  const r = resultado(p), dg = p.gf - p.gc, dif = nivelPropio - nivelRival;
  const nombre = id => plantilla.find(j => j.id === id)?.nombre || null;
  const esperado = dif >= 2 ? 'favorito claro' : dif === 1 ? 'favorito' : dif === 0 ? 'parejo' : dif === -1 ? 'no favorito' : 'muy no favorito';
  let sensacion = 'normal', titular;
  if (r === 'G') { sensacion = dif <= -1 ? 'muy-bien' : dg >= 3 ? 'muy-bien' : 'bien'; titular = dif <= -1 ? 'Golpe de autoridad contra un rival superior' : dg >= 3 ? 'Goleada y partido sin discusión' : 'Victoria que suma'; }
  else if (r === 'E') { sensacion = dif >= 2 ? 'mal' : dif <= -1 ? 'bien' : 'normal'; titular = dif >= 2 ? 'Empate que sabe a derrota' : dif <= -1 ? 'Punto valioso ante un rival más fuerte' : 'Empate repartido'; }
  else { sensacion = dif >= 1 || dg <= -3 ? 'muy-mal' : dif <= -1 ? 'normal' : 'mal'; titular = dg <= -3 ? 'Goleada en contra: alarma' : dif >= 1 ? 'Derrota inesperada' : dif <= -1 ? 'Derrota lógica ante un rival superior' : 'Derrota en un partido parejo'; }
  const lineas = [`Partido ${esperado} ${p.local ? 'de local' : 'de visitante'}: ${p.gf}-${p.gc}.`];
  if (p.gc === 0) lineas.push('Valla invicta.');
  if (p.gc >= 3) lineas.push(`La defensa recibió ${p.gc} goles.`);
  if (p.gf === 0) lineas.push('El equipo no convirtió.');
  const goles = new Map(); for (const g of p.goleadores || []) goles.set(g, (goles.get(g) || 0) + 1);
  for (const [id, n] of goles) { const nm = nombre(id); if (nm && n >= 3) lineas.push(`Hat-trick de ${nm}.`); else if (nm && n === 2) lineas.push(`Doblete de ${nm}.`); }
  const todos = [...partidosPrevios.filter(x => x.id !== p.id), p];
  const f = forma(todos), racha = rachaSinGanar(todos);
  if (f.length >= 3) lineas.push(`Forma: ${f.join(' ')}.`);
  if (racha >= 3) lineas.push(`Van ${racha} partidos sin ganar.`);
  const ganados = (() => { let k = 0; for (const x of [...todos].reverse()) { if (resultado(x) !== 'G') break; k++; } return k; })();
  if (ganados >= 3) lineas.push(`${ganados} victorias seguidas.`);
  if (p.resultadoReal) lineas.push(`En la vida real terminó ${p.resultadoReal.gf}-${p.resultadoReal.gc}.`);
  return {titular, lineas, sensacion};
}
