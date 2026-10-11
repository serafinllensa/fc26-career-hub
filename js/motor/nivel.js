// Motor FC: nivel del club (1 a 5). Criterio de Serafin/Donato: pesa el rendimiento reciente, no la grandeza.
// Datos que usa (de Datos FC, con fuente): historial[{temporada, division, posicion, europa}], actual{posicion},
// coefUEFA, ingresosM, valorPlantillaM. Fuerza de liga: coeficiente UEFA de asociación (data/ligas.json) si está.
export const PESOS_NIVEL = {rendimiento: 0.50, actual: 0.15, coefUEFA: 0.10, ingresos: 0.10, valor: 0.15}; // rendimiento + actual = 65% (Donato)
export const CUPOS_NIVEL = {5: 9, 4: 15, 3: 22, 2: 25}; // N1 = el resto (cupos aprobados por Serafin, 2026-10-11)
// Ajustes manuales: se aplican DESPUÉS del cálculo, así un recálculo nunca los pisa.
export const AJUSTES_MANUALES = {
  'borussia-dortmund': {nivel: 4, motivo: 'Decisión de Serafin (2026-10-11)'},
  'manchester-united': {nivel: 4, motivo: 'Decisión de Serafin (2026-10-11): 3° en la Premier 2025/26'},
};
export const PESO_TEMPORADAS = [0.35, 0.25, 0.18, 0.12, 0.10]; // de la más reciente a la más vieja
export const EQUIPOS_LIGA = {'Premier League': 20, 'LaLiga': 20, 'Serie A': 20, 'Bundesliga': 18, 'Ligue 1': 18};
export const PREMIO_EUROPA = {ucl: {campeon: 0.25, final: 0.2, semis: 0.15, cuartos: 0.11, octavos: 0.08, playoff: 0.05, fase: 0.03},
  uel: {campeon: 0.12, final: 0.1, semis: 0.08, cuartos: 0.06, octavos: 0.04, playoff: 0.03, fase: 0.02},
  uecl: {campeon: 0.07, final: 0.06, semis: 0.05, cuartos: 0.04, octavos: 0.03, playoff: 0.02, fase: 0.01}};

/** fuerzaLiga: {liga: factor 0.8–1}. Se arma desde coeficientes de asociación; sin dato, 1 para todas. */
export function fuerzaLigas(ligas = null) {
  if (!ligas?.length) return {};
  const max = Math.max(...ligas.map(l => l.coef || 0)) || 1;
  return Object.fromEntries(ligas.map(l => [l.liga, +(0.8 + 0.2 * (l.coef || 0) / max).toFixed(3)]));
}

/** Puntaje 0–1 de una temporada: puesto en la tabla, división, fuerza de la liga y premio por Europa. */
export function puntoTemporada(h, liga, fuerza = {}) {
  if (!h || h.posicion == null) return null;
  const n = h.equipos || (h.pj ? h.pj / 2 + 1 : null) || EQUIPOS_LIGA[liga] || 20;
  const div = h.divisionNivel ?? (typeof h.division === 'number' ? h.division : 1);
  let p = 1 - (h.posicion - 1) / (n - 1);
  if (div === 2) p = 0.2 * p - 0.05;      // en segunda: lo mejor que puede sumar es 0.15
  else if (div >= 3) p = 0.1 * p - 0.05;  // en tercera o más abajo: casi nada
  else p *= (fuerza[liga] ?? 1);
  // Europa: puede venir como 'ucl:semis' o como lista (si bajó de UCL a UEL); cuenta la mejor. 'previa' = 0.
  const eu = Array.isArray(h.europa) ? h.europa : h.europa ? [h.europa] : [];
  p += Math.max(0, ...eu.map(e => { const [comp, ronda] = String(e).split(':'); return PREMIO_EUROPA[comp]?.[ronda] ?? 0; }));
  return +Math.max(0, Math.min(1.2, p)).toFixed(4);
}

/** Rendimiento de las últimas 5 temporadas (ponderado) + tendencia. */
export function rendimiento(club, fuerza = {}) {
  const hist = [...(club.historial || [])].sort((a, b) => String(b.temporada).localeCompare(String(a.temporada))).slice(0, 5);
  const pts = hist.map(h => puntoTemporada(h, h.liga || club.liga, fuerza));
  let suma = 0, peso = 0;
  pts.forEach((p, i) => { if (p != null) { suma += p * PESO_TEMPORADAS[i]; peso += PESO_TEMPORADAS[i]; } });
  if (!peso) return {valor: null, tendencia: 0, temporadas: 0};
  // Tendencia: últimas 2 contra las 2 anteriores (±0.06 como máximo).
  const rec = pts.slice(0, 2).filter(x => x != null), ant = pts.slice(2, 4).filter(x => x != null);
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const tendencia = rec.length && ant.length ? Math.max(-0.06, Math.min(0.06, (avg(rec) - avg(ant)) * 0.3)) : 0;
  return {valor: suma / peso + tendencia, tendencia: +tendencia.toFixed(3), temporadas: pts.filter(x => x != null).length};
}

function percentiles(items, f) {
  const vals = items.map(c => ({id: c.id, v: f(c)})).filter(x => x.v != null).sort((a, b) => a.v - b.v);
  const out = new Map(), n = vals.length;
  for (let i = 0; i < n;) {
    let j = i; while (j + 1 < n && vals[j + 1].v === vals[i].v) j++;
    const p = n > 1 ? ((i + j) / 2) / (n - 1) : 1;
    for (let k = i; k <= j; k++) out.set(vals[k].id, p);
    i = j + 1;
  }
  return out;
}

export function puntajesNivel(clubes, {ligas = null} = {}) {
  const N = clubes.length, fuerza = fuerzaLigas(ligas);
  const rend = new Map(clubes.map(c => [c.id, rendimiento(c, fuerza)]));
  const pr = percentiles(clubes, c => rend.get(c.id).valor);
  const pa = percentiles(clubes, c => (c.actual?.posicion == null ? null : (1 - (c.actual.posicion - 1) / ((EQUIPOS_LIGA[c.liga] || 20) - 1)) * (fuerza[c.liga] ?? 1)));
  const pu = percentiles(clubes, c => c.coefUEFA ?? 0); // null = no jugó en Europa (verificado) = 0
  const pv = percentiles(clubes, c => c.valorPlantillaM);
  // Ingresos: Deloitte solo publica a los que más facturan, así que esos van en la parte alta de la escala de 96.
  // Al que no tiene dato no se le inventa ni se le baja la nota: esa parte no cuenta y su peso se reparte (pedido de Donato).
  const con = clubes.filter(c => c.ingresosM != null), pi = new Map(), corte = N > 1 ? (N - con.length) / (N - 1) : 0;
  for (const [k, v] of percentiles(con, c => c.ingresosM)) pi.set(k, corte + v * (1 - corte));
  return clubes.map(c => {
    const partes = {rendimiento: pr.get(c.id), actual: pa.get(c.id), coefUEFA: pu.get(c.id), ingresos: pi.get(c.id), valor: pv.get(c.id)};
    let suma = 0, peso = 0;
    for (const [k, v] of Object.entries(partes)) if (v != null) { suma += v * PESOS_NIVEL[k]; peso += PESOS_NIVEL[k]; }
    const estimados = [];
    if (c.ingresosM == null) estimados.push('ingresos');
    if (partes.rendimiento == null) estimados.push('rendimiento');
    if (partes.actual == null) estimados.push('actual');
    return {id: c.id, puntaje: peso ? +(suma / peso).toFixed(3) : null, partes, estimados, tendencia: rend.get(c.id).tendencia};
  });
}

const RONDA = {campeon: 'campeón', final: 'final', semis: 'semis', cuartos: 'cuartos', octavos: 'octavos', playoff: 'playoff', fase: 'fase', previa: 'previa'};
const COMP = {ucl: 'Champions', uel: 'Europa League', uecl: 'Conference'};
/** Una línea con el porqué del nivel, con los datos reales del club. */
export function motivoNivel(club, p) {
  const hist = [...(club?.historial || [])].sort((a, b) => String(a.temporada).localeCompare(String(b.temporada))).slice(-5);
  const pos = hist.map(h => `${h.posicion}°${(h.divisionNivel ?? 1) > 1 ? ` (${h.divisionNivel}ª div.)` : ''}`).join(', ');
  let mejor = null, mejorP = 0;
  for (const h of hist) for (const e of (Array.isArray(h.europa) ? h.europa : h.europa ? [h.europa] : [])) {
    const [c, r] = String(e).split(':'); const v = PREMIO_EUROPA[c]?.[r] ?? 0;
    if (v > mejorP) { mejorP = v; mejor = `${COMP[c]} ${RONDA[r]} ${h.temporada}`; }
  }
  const partes = [];
  if (pos) partes.push(`Últimas ${hist.length}: ${pos}`);
  if (mejor) partes.push(`mejor en Europa: ${mejor}`);
  if (club?.actual?.posicion != null) partes.push(`hoy ${club.actual.posicion}°`);
  if (p.tendencia >= 0.02) partes.push('viene en subida');
  if (p.tendencia <= -0.02) partes.push('viene en caída');
  let t = partes.join('; ') || 'Sin historial cargado';
  if (p.estimados.includes('ingresos')) t += ' (sin dato de ingresos, no resta)';
  return t + '.';
}

export function calcularNiveles(clubes, opciones = {}) {
  const p = puntajesNivel(clubes, opciones).sort((a, b) => (b.puntaje ?? -1) - (a.puntaje ?? -1));
  const by = new Map(clubes.map(c => [c.id, c]));
  const escala = clubes.length / 96, cortes = [];
  let acc = 0;
  for (const n of [5, 4, 3, 2]) { acc += Math.round(CUPOS_NIVEL[n] * escala); cortes.push([n, acc]); }
  const ajustes = opciones.ajustes ?? AJUSTES_MANUALES;
  return p.map((c, i) => {
    const calculado = (cortes.find(([, hasta]) => i < hasta) || [1])[0];
    const aj = ajustes[c.id];
    return {...c, nivel: aj ? aj.nivel : calculado, nivelCalculado: calculado, ajuste: aj ? aj.motivo : null,
      motivo: motivoNivel(by.get(c.id), c) + (aj ? ` Ajuste manual: ${aj.motivo}.` : '')};
  });
}
