// Opinión de renovación. La calidad (media) pesa poco a propósito:
// un jugador puede ser muy bueno y no encajar en el equipo.

const LINEA = {POR: 'por', DFC: 'def', LD: 'def', LI: 'def', CAD: 'def', CAI: 'def', MCD: 'med', MC: 'med', MCO: 'med', MD: 'med', MI: 'med', ED: 'del', EI: 'del', DC: 'del', SD: 'del'};
const linea = p => LINEA[p] || 'med';

function semilla(txt) {
  let h = 2166136261;
  for (const ch of String(txt)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rnd(seed) {
  let x = seed || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; };
}
const n1 = v => (v ?? 0).toLocaleString('es-AR', {maximumFractionDigits: 1});
const notaTxt = v => v == null ? null : Number(v).toLocaleString('es-AR', {minimumFractionDigits: 1, maximumFractionDigits: 1});

function encajaPuesto(jugador, formacion) {
  const f = String(formacion || '4-3-3').replace(/ (Attacking|Defending|Defensive|Flat|Diamond)$/i, '');
  const lineaN = parseInt(f, 10);
  const base = lineaN === 3 ? ['DFC', 'CAI', 'CAD', 'MC', 'MCD', 'MCO', 'DC', 'EI', 'ED']
    : lineaN === 5 ? ['DFC', 'CAI', 'CAD', 'MC', 'MCD', 'MI', 'MD', 'DC']
    : ['DFC', 'LI', 'LD', 'MC', 'MCD', 'MCO', 'MI', 'MD', 'EI', 'ED', 'DC'];
  if (jugador.pos === 'POR') return true;
  return base.includes(jugador.pos) || (jugador.posSec || []).some(p => base.includes(p));
}

/** 0..1. El gusto es del DT (siempre el mismo para ese par) y el puesto. La media no entra. */
export function gustoDT(dt, jugador) {
  const r = rnd(semilla(`${dt?.id || 'sin-dt'}|${jugador.id}`))();
  const encaja = encajaPuesto(jugador, dt?.formaciones?.[0]);
  const gusto = Math.max(0, Math.min(1, r * 0.72 + (encaja ? 0.28 : 0)));
  return {gusto, encaja};
}

/** null si no hay nada cargado. La nota manda; goles, asistencias y vallas ajustan según el puesto. */
export function puntajeRendimiento(jugador, s) {
  if (!s) return null;
  const vacio = s.nota == null && !s.goles && !s.asistencias && !s.vallas;
  if (vacio) return null;
  const l = linea(jugador.pos);
  let prod = 0;
  if (l === 'del') prod = Math.min(1, ((s.goles || 0) * 1.15 + (s.asistencias || 0) * 0.55) / 22);
  else if (l === 'med') prod = Math.min(1, ((s.goles || 0) * 0.8 + (s.asistencias || 0) * 1.05) / 16);
  else if (l === 'def') prod = Math.min(1, ((s.vallas || 0) * 1.3 + (s.goles || 0) * 0.45 + (s.asistencias || 0) * 0.35) / 18);
  else prod = Math.min(1, ((s.vallas || 0) * 1.5 + (s.asistencias || 0) * 0.2) / 18);
  if (s.nota == null) return prod;
  return Math.max(0, Math.min(1, (s.nota / 10) * 0.74 + prod * 0.26));
}

function fraseGusto(gusto, encaja) {
  if (gusto >= 0.72) return encaja
    ? 'Me gusta para este equipo: es el perfil que busco en su puesto.'
    : 'Me gusta cómo juega, aunque no nace en el puesto que más uso.';
  if (gusto >= 0.46) return encaja
    ? 'No es de los míos, pero el puesto le queda y lo puedo hacer jugar.'
    : 'Me da igual: ni me entusiasma ni le queda del todo el esquema.';
  return encaja
    ? 'El puesto le queda y aun así no me convence. Prefiero a otros con menos cartel.'
    : 'No me cierra. No es su puesto en mi esquema y el perfil tampoco es el que quiero.';
}

function juicio(p) {
  if (p == null) return null;
  if (p >= 0.75) return 'un rendimiento de titular que no se discute';
  if (p >= 0.58) return 'un rendimiento correcto';
  if (p >= 0.45) return 'un rendimiento del montón';
  return 'un rendimiento flojo';
}
function detalle(s, pos) {
  if (!s) return '';
  const bits = [];
  const nota = notaTxt(s.nota);
  if (nota) bits.push(`nota ${nota}`);
  if (s.goles) bits.push(`${s.goles} ${s.goles === 1 ? 'gol' : 'goles'}`);
  if (s.asistencias) bits.push(`${s.asistencias} ${s.asistencias === 1 ? 'asistencia' : 'asistencias'}`);
  if (s.vallas && (pos === 'POR' || linea(pos) === 'def')) bits.push(`${s.vallas} ${s.vallas === 1 ? 'valla invicta' : 'vallas invictas'}`);
  return bits.length ? ` (${bits.join(', ')})` : '';
}

function decidir(partes, reglas) {
  const w = partes.reduce((a, p) => a + p.peso, 0) || 1;
  let total = partes.reduce((a, p) => a + p.valor * p.peso, 0) / w;
  let decision = total >= 0.64 ? 'renovar' : total >= 0.46 ? 'dudar' : 'no';
  if (reglas) decision = reglas(decision, total) || decision;
  return {decision, total};
}

/**
 * dt puede ser null. actual/anterior: {goles, asistencias, vallas, nota} o null.
 * Devuelve {decision, titulo, texto, motivos} del DT y del presidente.
 */
export function opinionRenovacion({dt, jugador, actual = null, anterior = null, sueldoM = null} = {}) {
  const ovr = jugador?.ea?.ovr ?? jugador?.ovr ?? null;
  const {gusto, encaja} = gustoDT(dt, jugador);
  const pAct = puntajeRendimiento(jugador, actual);
  const pAnt = puntajeRendimiento(jugador, anterior);
  const calidad = ovr == null ? null : Math.max(0, Math.min(1, (ovr - 55) / 40));

  const partesDT = [
    {id: 'gusto', valor: gusto, peso: 0.45},
    pAct != null && {id: 'actual', valor: pAct, peso: 0.32},
    pAnt != null && {id: 'anterior', valor: pAnt, peso: 0.18},
    calidad != null && {id: 'calidad', valor: calidad, peso: 0.05},
  ].filter(Boolean);
  const dtDec = decidir(partesDT, decision => {
    if (gusto < 0.34 && (pAct == null || pAct < 0.7) && decision === 'renovar') return 'dudar';
    if (pAct != null && pAct < 0.4 && pAnt != null && pAnt < 0.48) return 'no';
    if (pAct != null && pAct >= 0.8 && gusto >= 0.42) return 'renovar';
    return decision;
  });

  const sueldo = sueldoM ?? jugador?.sueldoM ?? null;
  const rinde = pAct ?? pAnt ?? (calidad != null ? calidad * 0.55 : 0.5);
  const dinero = sueldo == null ? null : Math.max(0, Math.min(1, 1 - Math.min(1, sueldo / 16) * (1.2 - rinde)));
  const partesP = [
    pAct != null && {valor: pAct, peso: 0.4},
    pAnt != null && {valor: pAnt, peso: 0.18},
    dinero != null && {valor: dinero, peso: 0.32},
    calidad != null && {valor: calidad, peso: 0.1},
  ].filter(Boolean);
  const pDec = decidir(partesP.length ? partesP : [{valor: 0.5, peso: 1}], decision => {
    if (sueldo != null && sueldo >= 10 && (pAct == null || pAct < 0.55) && decision === 'renovar') return 'dudar';
    if (sueldo != null && sueldo >= 14 && pAct != null && pAct < 0.45) return 'no';
    if (sueldo != null && sueldo <= 3 && pAct != null && pAct >= 0.5) return decision === 'no' ? 'dudar' : decision;
    return decision;
  });

  const titulo = {renovar: 'Lo renovaría', dudar: 'Lo pensaría', no: 'No lo renovaría'};
  const motivos = [fraseGusto(gusto, encaja)];
  const fAct = pAct == null ? null : `Esta temporada veo ${juicio(pAct)}${detalle(actual, jugador.pos)}.`;
  const fAnt = pAnt == null ? null : `La temporada pasada fue ${juicio(pAnt)}${detalle(anterior, jugador.pos)}.`;
  if (fAct) motivos.push(fAct);
  if (fAnt) motivos.push(fAnt);
  if (!fAct && !fAnt) motivos.push('Todavía no cargaste goles, asistencias, vallas ni la nota. Cuando lo hagas, al final de la temporada, la respuesta cambia.');
  if (ovr != null) motivos.push(`La media (${ovr}) casi no me mueve: un jugador puede ser muy bueno y no encajar acá.`);
  else motivos.push('No tengo media cargada, y tampoco sería lo que más mire.');

  const cierre = {renovar: 'Yo lo renovaría.', dudar: 'No lo ataría por mucho tiempo.', no: 'Yo no lo renovaría.'};
  const textoDT = `${cierre[dtDec.decision]} ${motivos.join(' ')}`;

  const motP = [];
  if (fAct) motP.push(fAct);
  if (fAnt) motP.push(fAnt);
  if (!fAct && !fAnt) motP.push('Sin números de la temporada no puedo defender el gasto. Cargá el rendimiento y lo miro de nuevo.');
  if (sueldo == null) motP.push('No hay sueldo cargado, así que no sé si el contrato es viable.');
  else if (sueldo >= 12 && (pAct == null || pAct < 0.6)) motP.push(`Por ${n1(sueldo)} millones al año, el rendimiento no alcanza.`);
  else if (sueldo <= 4 && (pAct == null || pAct >= 0.45)) motP.push(`El sueldo (${n1(sueldo)} millones) es manejable.`);
  else motP.push(`El sueldo es ${n1(sueldo)} millones al año: entra en la cuenta, no decide solo.`);
  if (ovr != null && ovr >= 84 && dtDec.decision === 'no') motP.push(`Que tenga ${ovr} de media no me obliga a pagarle otro ciclo si no rinde ni encaja.`);
  const cierreP = {renovar: 'Desde la directiva, lo renovaría.', dudar: 'Desde la directiva, solo si baja el sueldo o firma corto.', no: 'Desde la directiva, no lo renovaría.'};
  const textoP = `${cierreP[pDec.decision]} ${motP.join(' ')}`;

  return {
    dt: dt ? {decision: dtDec.decision, titulo: titulo[dtDec.decision], texto: textoDT, motivos, gusto} : null,
    presidente: {decision: pDec.decision, titulo: titulo[pDec.decision], texto: textoP, motivos: motP},
  };
}
