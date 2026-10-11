// Motor FC: el DT detecta puestos flojos y pide refuerzos que encajen con su idea. Podés aceptar, discutir o proponerle otro.
import {preferenciasDT} from './dts.js';
import {puedeFichar} from './dificultades.js';

export const GRUPO_POS = {POR: 'POR', DFC: 'DFC', LD: 'LAT', LI: 'LAT', CAD: 'LAT', CAI: 'LAT', MCD: 'MED', MC: 'MED', MCO: 'MED', MD: 'EXT', MI: 'EXT', ED: 'EXT', EI: 'EXT', DC: 'DEL', SD: 'DEL'};
export const NOMBRE_GRUPO = {POR: 'arquero', DFC: 'central', LAT: 'lateral', MED: 'mediocampista', EXT: 'extremo', DEL: 'delantero'};
const ovrDe = j => j?.ea?.ovr ?? j?.ovr ?? null;
const stat = (j, k) => j?.ea?.[k] ?? j?.[k] ?? null;

/** Cuántos de cada grupo pide la formación (ej. 4-3-3: POR 1, DFC 2, LAT 2, MED 3, DEL 1, EXT 2). */
export function necesidades(formacion) {
  const f = String(formacion || '4-3-3').toLowerCase();
  const n = f.match(/\d/g)?.map(Number) || [4, 3, 3];
  const def = n[0], del = n[n.length - 1], med = n.slice(1, -1).reduce((a, b) => a + b, 0);
  const out = {POR: 1, DFC: def >= 4 ? 2 : 3, LAT: def === 4 ? 2 : def === 5 ? 2 : 0, MED: 0, EXT: 0, DEL: 0};
  if (def === 3) { out.EXT = 2; out.MED = Math.max(1, med - 2); } else out.MED = med;
  if (del === 3) { out.DEL = 1; out.EXT += 2; } else out.DEL = del;
  if (def === 5) out.DFC = 3;
  return out;
}
const grupoDe = j => GRUPO_POS[j.pos] ?? null;
const grupos = j => [grupoDe(j), ...(j.posSec || []).map(p => GRUPO_POS[p])].filter(Boolean);
export const NOMBRE_ESTILO = {posesion: 'posesión', 'presion-alta': 'presión alta', transiciones: 'transiciones', contragolpe: 'contragolpe', 'bloque-bajo': 'bloque bajo', 'juego-directo': 'juego directo', juveniles: 'apuesta por juveniles'};
const ne = e => NOMBRE_ESTILO[e] ?? e;

/** Puestos flojos: el titular del grupo está 5+ por debajo del promedio del once, o no hay recambio (menos de 2 por puesto). */
export function detectarFalencias(plantilla, formacion) {
  const nec = necesidades(formacion), conOvr = plantilla.filter(j => ovrDe(j) != null);
  const porGrupo = g => conOvr.filter(j => grupos(j).includes(g)).sort((a, b) => ovrDe(b) - ovrDe(a));
  const once = Object.entries(nec).flatMap(([g, k]) => porGrupo(g).slice(0, k));
  const prom = once.length ? once.reduce((s, j) => s + ovrDe(j), 0) / once.length : null;
  const out = [];
  for (const [g, k] of Object.entries(nec)) {
    if (!k) continue;
    const l = porGrupo(g), titulares = l.slice(0, k);
    const peor = titulares.length < k ? null : ovrDe(titulares[k - 1]);
    if (titulares.length < k) out.push({grupo: g, motivo: `No hay ${k} ${NOMBRE_GRUPO[g]}${k > 1 ? 'es' : ''} para la formación`, gravedad: 3, referenciaOvr: prom});
    else if (prom != null && peor <= prom - 5) out.push({grupo: g, motivo: `El ${NOMBRE_GRUPO[g]} titular más flojo (${peor}) está ${Math.round(prom - peor)} abajo del promedio del once`, gravedad: 2, referenciaOvr: peor});
    else if (l.length < k * 2 && g !== 'POR') out.push({grupo: g, motivo: `Falta recambio de ${NOMBRE_GRUPO[g]}`, gravedad: 1, referenciaOvr: ovrDe(l[l.length - 1])});
    else if (g === 'POR' && l.length < 2) out.push({grupo: g, motivo: 'No hay arquero suplente', gravedad: 1, referenciaOvr: ovrDe(l[0])});
  }
  return {promedioOnce: prom == null ? null : Math.round(prom * 10) / 10, falencias: out.sort((a, b) => b.gravedad - a.gravedad)};
}

// Qué mira cada estilo en un jugador (stats de EA).
const PERFIL_ESTILO = {posesion: ['pas', 'dri'], 'presion-alta': ['pac', 'phy'], transiciones: ['pac', 'dri'], contragolpe: ['pac', 'sho'], 'bloque-bajo': ['def', 'phy'], 'juego-directo': ['phy', 'sho']};
function encaje(j, estilos) {
  const m = []; let p = 0;
  for (const e of estilos) {
    const ks = PERFIL_ESTILO[e]; if (!ks) continue;
    const v = ks.map(k => stat(j, k)).filter(x => x != null);
    if (v.length && v.reduce((a, b) => a + b, 0) / v.length >= 75) { p += 1; m.push(`Encaja con su estilo de ${ne(e)}`); }
  }
  if (estilos.includes('juveniles') && j.edad <= 23) { p += 1; m.push('Es joven, como le gusta'); }
  return {p, m};
}

/** El DT sugiere hasta 3 jugadores para una falencia, de una lista de candidatos (jugadores de otros clubes, con club). */
// Realista = alcanzable: no se lo saca a un club más grande ni a un rival directo (mismo nivel y misma liga),
// y no es una estrella muy por encima del once (media <= promedio del once + 4). Pasá {clubes, promedioOnce}.
export function alcanzable(j, carrera, {clubes = null, promedioOnce = null} = {}) {
  const motivos = [];
  const suyo = clubes && j.club ? clubes.find(c => c.id === j.club) : null;
  const nivelPropio = carrera.club?.nivel, ligaPropia = carrera.club?.liga;
  if (j.club && j.club === carrera.club?.id) return {ok: false, motivos: ['Ya es del club']};
  if (suyo?.nivel != null && nivelPropio != null) {
    if (suyo.nivel > nivelPropio) motivos.push('Juega en un club más grande: no lo van a largar');
    else if (suyo.nivel === nivelPropio && suyo.liga === ligaPropia) motivos.push('Es de un rival directo');
  }
  if (promedioOnce != null && ovrDe(j) != null && ovrDe(j) > promedioOnce + 4) motivos.push('Está muy por encima del plantel: no vendría');
  return {ok: motivos.length === 0, motivos};
}

export function sugerirRefuerzos(carrera, dt, falencia, candidatos, {disponibleM = null, n = 3, clubes = null, promedioOnce = null} = {}) {
  const pref = preferenciasDT(dt), dif = carrera.dificultad;
  const techo = falencia.gravedad === 1 && promedioOnce != null ? promedioOnce + 1 : Infinity; // para recambio no hace falta una figura
  return candidatos
    .filter(j => grupoDe(j) === falencia.grupo && ovrDe(j) != null && ovrDe(j) > (falencia.referenciaOvr ?? 0) + 1 && ovrDe(j) <= techo)
    .filter(j => alcanzable(j, carrera, {clubes, promedioOnce}).ok)
    .filter(j => puedeFichar(dif, {edad: j.edad}).ok)
    .filter(j => disponibleM == null || (j.valorM ?? Infinity) <= Math.max(disponibleM, 0))
    .map(j => { const e = encaje(j, pref.estilos); return {jugador: j, puntaje: (ovrDe(j) - (falencia.referenciaOvr ?? 0)) * 2 + e.p * 4 - Math.max(0, j.edad - 29), motivos: [`Mejora el puesto (${ovrDe(j)} de media)`, ...e.m]}; })
    .sort((a, b) => b.puntaje - a.puntaje || (a.jugador.valorM ?? 0) - (b.jugador.valorM ?? 0))
    .slice(0, n).map(x => ({...x, estimadoEstilo: pref.estiloEstimado}));
}

/** Le proponés otro jugador al DT para esa falencia: 'de-acuerdo' | 'duda' | 'no', con motivos y respuestas. */
export function opinarJugador(carrera, dt, falencia, jugador, opciones = {}) {
  const pref = preferenciasDT(dt), m = [];
  let p = 0;
  const alc = alcanzable(jugador, carrera, opciones);
  if (!alc.ok) { p -= 1; m.push(...alc.motivos.map(x => `Me gusta la idea, pero: ${x.toLowerCase()}`)); }
  const enPuesto = grupoDe(jugador) === falencia.grupo, secundario = !enPuesto && grupos(jugador).includes(falencia.grupo);
  const o = ovrDe(jugador);
  if (!enPuesto && !secundario) { p -= 4; m.push(`No es ${NOMBRE_GRUPO[falencia.grupo]}: no me resuelve el puesto`); }
  else if (secundario) { p -= 1; m.push(`Puede jugar de ${NOMBRE_GRUPO[falencia.grupo]}, pero no es su puesto principal`); }
  if (!enPuesto && !secundario) { /* sin comparar la media: no juega ahí */ }
  else if (o == null) m.push('Sin media de EA: lo tengo que ver');
  else if (o > (falencia.referenciaOvr ?? 0) + 1) { p += 2; m.push(`Mejora el puesto (${o})`); }
  else { p -= 2; m.push(`No mejora lo que tengo (${o})`); }
  const e = encaje(jugador, pref.estilos); p += e.p; m.push(...e.m);
  if (!e.p && pref.estilos.length) m.push(`No es el perfil que busco para jugar con ${pref.estilos.map(ne).join(' y ')}${pref.estiloEstimado ? ' (estimado)' : ''}`);
  const reglas = puedeFichar(carrera.dificultad, {edad: jugador.edad});
  if (!reglas.ok) { p -= 3; m.push(...reglas.motivos); }
  const opinion = p >= 3 ? 'de-acuerdo' : p >= 1 ? 'duda' : 'no';
  const texto = {'de-acuerdo': 'Me gusta. Si el presidente lo aprueba, lo quiero.', duda: 'Puede ser, pero no me termina de convencer.', no: 'No es lo que necesito.'}[opinion];
  const respuestas = opinion === 'de-acuerdo'
    ? [{id: 'pedir', texto: 'Se lo pido al presidente.', efectos: {relacion: +2}, pedirAlPresidente: true}]
    : [{id: 'insistir', texto: 'Confío en él, lo pedimos igual.', efectos: {relacion: opinion === 'no' ? -5 : -2}, pedirAlPresidente: true},
       {id: 'otra', texto: 'Te propongo otro.', efectos: {relacion: 0}},
       {id: 'ceder', texto: 'Tenés razón, buscamos otro perfil.', efectos: {relacion: +2}}];
  return {opinion, texto, motivos: m, respuestas, respaldoDT: opinion === 'de-acuerdo'};
}

/** Aplica la respuesta a una sugerencia o charla de refuerzos (solo relación con el DT; el fichaje lo decide el presidente). */
export function responderRefuerzo(carrera, charla, respuestaId) {
  const r = charla.respuestas.find(x => x.id === respuestaId);
  if (!r) throw new Error('Respuesta inexistente');
  const rel = Math.max(0, Math.min(100, (carrera.relacionDT ?? 60) + (r.efectos.relacion || 0)));
  return {carrera: {...carrera, relacionDT: rel}, pedirAlPresidente: !!r.pedirAlPresidente, respaldoDT: charla.respaldoDT && respuestaId === 'pedir'};
}
