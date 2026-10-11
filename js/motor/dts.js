// Motor FC: sugerencia de los 5 DTs más afines a un club. Formato de dts.json del BRIEF.
// La filosofía puede venir como texto ('posesion') o como ficha con fuente ({valor|tag|id, fuente}). Sin fuente no cuenta.
export function etiquetasFilosofia(dt) {
  return (dt?.filosofia || []).map(f => (typeof f === 'string' ? f : f && (f.fuente || f.url) ? (f.valor ?? f.tag ?? f.id) : null)).filter(Boolean);
}
export const esLibre = dt => dt.estado === 'libre' || (!dt.clubActual && dt.estado !== 'seleccion');
export const esSeleccion = dt => dt.estado === 'seleccion';
export const PESOS = {dirigio: 40, jugo: 25, nivel: 15, filosofia: 12, liga: 5, libre: 3};

function nivelAfinidad(dtNivel, clubNivel) {
  if (dtNivel == null || clubNivel == null) return 0;
  const d = dtNivel - clubNivel;
  if (d === 0) return 1;
  if (d === 1) return 0.8;       // un DT un poco "grande" para el club suma
  if (d === -1) return 0.6;
  if (d === 2) return 0.3;       // muy grande: difícil que acepte
  return 0;
}

/** Puntaje 0–100 y motivos legibles de por qué el DT encaja. */
export function afinidad(dt, club) {
  const motivos = [];
  let p = 0;
  if ((dt.clubesDirigidos || []).includes(club.id)) { p += PESOS.dirigio; motivos.push(`Ya dirigió al ${club.corto || club.nombre}`); }
  if ((dt.clubesJugados || []).includes(club.id)) { p += PESOS.jugo; motivos.push(`Jugó en el ${club.corto || club.nombre}`); }
  const n = nivelAfinidad(dt.nivel, club.nivel);
  if (n > 0) { p += PESOS.nivel * n; if (n >= 0.8) motivos.push('Su nivel va con el del club'); }
  const fil = etiquetasFilosofia(dt), est = club.estilo || [];
  const comunes = fil.filter(t => est.includes(t));
  if (est.length && comunes.length) { p += PESOS.filosofia * Math.min(1, comunes.length / Math.min(est.length, 2)); motivos.push(`Comparte la idea de juego: ${comunes.join(', ')}`); }
  else if (!est.length && fil.length && club.identidad?.length) {
    // Sin estilo cargado para el club, se cruza con su identidad (ej. cantera -> DT que promueve juveniles).
    const PUENTE = {cantera: 'juveniles', 'juego-de-posicion': 'posesion', 'presion-alta': 'presion-alta'};
    const c2 = club.identidad.map(t => PUENTE[t]).filter(t => t && fil.includes(t));
    if (c2.length) { p += PESOS.filosofia * 0.5; motivos.push(`Va con la identidad del club: ${c2.join(', ')}`); }
  }
  if (club.ligaClubes && (dt.clubesDirigidos || []).some(id => club.ligaClubes.includes(id) && id !== club.id)) { p += PESOS.liga; motivos.push('Conoce la liga'); }
  if (esLibre(dt)) { p += PESOS.libre; motivos.push('Está libre'); }
  else if (esSeleccion(dt)) motivos.push(`Dirige una selección${dt.rolActual || dt.seleccion ? '' : ''}`);
  return {puntaje: Math.round(p * 10) / 10, motivos};
}

// ---- Categoría real del DT (no hereda el nivel del club más grande que tocó) ----
const HOY = new Date('2026-10-11');
const ROLES_DT = new Set(['Manager', 'Head Coach', 'Player-Coach']);
function fecha(txt) {
  const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(txt || '');
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}`) : null;
}
/** Etapas como primer entrenador: {clubId, club, desde, hasta, anios, vigente}. */
export function etapasDT(dt) {
  return (dt.historialDT || []).filter(h => ROLES_DT.has(h.rol)).map(h => {
    const desde = fecha(h.desde), vigente = /expected/i.test(h.hasta || '') || !h.hasta;
    const hasta = vigente ? HOY : fecha(h.hasta);
    const anios = desde && hasta ? Math.max(0, (hasta - desde) / 31557600000) : null;
    return {clubId: h.clubId ?? null, club: h.club, desde, hasta, anios, vigente};
  });
}
function nivelesDe(opts) { return opts.niveles ?? (opts.clubes ? new Map(opts.clubes.map(c => [c.id, c.nivel])) : null); }
const nivelDe = (opts, id) => (id && opts.niveles ? (opts.niveles instanceof Map ? opts.niveles.get(id) : opts.niveles[id]) : null) ?? null;
/** Nivel de cada etapa: el del club, -2 si duró menos de una temporada, -1 si menos de 1,5; -1 si terminó hace más de 5 años, -2 si más de 10. */
function nivelEtapa(e, L) {
  if (L == null || e.anios == null) return null;
  let n = L - (e.anios < 0.9 ? 2 : e.anios < 1.5 ? 1 : 0);
  const hace = e.vigente ? 0 : (HOY - e.hasta) / 31557600000;
  if (hace > 10) n -= 2; else if (hace > 5) n -= 1;
  return Math.max(1, n);
}
export function categoriaDT(dt, opciones = {}) {
  const opts = {...opciones, niveles: nivelesDe(opciones)};
  if (!opts.niveles) return dt.nivel ?? null;
  const ns = etapasDT(dt).map(e => nivelEtapa(e, nivelDe(opts, e.clubId))).filter(n => n != null);
  return ns.length ? Math.max(...ns) : Math.min(dt.nivel ?? 2, 2);
}

/**
 * 5 opciones: primero el DT actual del club (marcado actual: true) y después 4 realistas.
 * Realista = categoría del DT >= nivel del club - 1, libre o "traíble" (su club actual es de menor nivel), y con vínculo o encaje.
 * Pasá {clubes} (con su nivel del Motor) para que la categoría se calcule por etapas; sin eso usa dt.nivel.
 */
export function sugerirDTs(club, dts, n = 5, opciones = {}) {
  const opts = {...opciones, niveles: nivelesDe(opciones)};
  const actual = dts.find(dt => dt.clubActual === club.id) || null;
  const salida = [];
  if (actual && opciones.incluirActual !== false) salida.push({dt: actual, puntaje: null, motivos: ['DT actual del club'], actual: true, categoria: categoriaDT(actual, opts)});
  const resto = dts.filter(dt => dt !== actual).map(dt => {
    const cat = categoriaDT(dt, opts);
    const {puntaje, motivos} = afinidad(dt, club);
    let p = puntaje;
    // El vínculo de haberlo dirigido solo vale completo si fue una etapa de verdad (1,5 temporadas o más).
    const etapa = etapasDT(dt).filter(e => e.clubId === club.id).sort((a, b) => (b.anios ?? 0) - (a.anios ?? 0))[0];
    if (etapa && etapa.anios != null && etapa.anios < 1.5) {
      p -= PESOS.dirigio * (etapa.anios < 0.9 ? 0.75 : 0.4);
      const i = motivos.findIndex(m => m.startsWith('Ya dirigió'));
      if (i >= 0) motivos[i] = `Dirigió al ${club.corto || club.nombre} poco tiempo`;
    } else if (etapa?.desde) {
      const i = motivos.findIndex(m => m.startsWith('Ya dirigió'));
      if (i >= 0) motivos[i] += ` (${etapa.desde.getFullYear()}–${etapa.vigente ? 'hoy' : etapa.hasta.getFullYear()})`;
    }
    const nivelSuClub = dt.clubActual ? nivelDe(opts, dt.clubActual) : null;
    const libre = esLibre(dt);
    const traible = libre || esSeleccion(dt) || nivelSuClub == null || nivelSuClub < club.nivel;
    if (!libre && nivelSuClub != null && nivelSuClub === club.nivel) { p -= 15; motivos.push('Difícil de sacar: dirige un club del mismo nivel'); }
    const nivelOk = cat != null && cat >= club.nivel - 1 && cat <= club.nivel + 1;
    if (cat != null && cat < club.nivel) p -= 10;
    const vinculo = (dt.clubesDirigidos || []).includes(club.id) || (dt.clubesJugados || []).includes(club.id);
    const edadOk = dt.edad == null || dt.edad <= 72; // retirados o casi: quedan en el buscador, no en las sugerencias
    return {dt, puntaje: Math.round(p * 10) / 10, motivos, actual: false, categoria: cat, traible: traible && edadOk,
      apto: edadOk && nivelOk && (traible || (nivelSuClub === club.nivel && vinculo))};
  });
  const orden = (a, b) => b.puntaje - a.puntaje || (b.categoria || 0) - (a.categoria || 0) || a.dt.nombre.localeCompare(b.dt.nombre);
  let candidatos = resto.filter(r => r.apto && r.puntaje > 0).sort(orden);
  if (candidatos.length < n - salida.length) {
    // Si no alcanzan, se completa con los de nivel justo aunque no tengan vínculo, nunca con los de un club más grande.
    const extra = resto.filter(r => !candidatos.includes(r) && r.traible && (r.categoria ?? 0) >= club.nivel - 1).sort(orden);
    candidatos = [...candidatos, ...extra];
  }
  return [...salida, ...candidatos.slice(0, n - salida.length)];
}

/** Buscador para "Elegir otro DT": texto (nombre), soloLibres, nac (código o nombre). Ordena por categoría y nombre. */
export function buscarDTs(dts, {texto = '', soloLibres = false, nac = null} = {}, opciones = {}) {
  const opts = {...opciones, niveles: nivelesDe(opciones)};
  const q = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return dts.filter(dt => (!q || dt.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q))
      && (!soloLibres || esLibre(dt)) && (!nac || dt.nacCodigo === nac || dt.nac === nac))
    .map(dt => ({dt, categoria: categoriaDT(dt, opts), libre: esLibre(dt)}))
    .sort((a, b) => (b.categoria || 0) - (a.categoria || 0) || a.dt.nombre.localeCompare(b.dt.nombre));
}

/** Sorteo de DT entre los afines (con semilla opcional para reproducir). */
export function sortearDT(club, dts, rnd = Math.random) {
  const top = sugerirDTs(club, dts, 11).filter(s => !s.actual); // sortear = cambiar de DT
  if (!top.length) return null;
  return top[Math.floor(rnd() * top.length)].dt;
}

// ---- Preferencias del DT: formación y estilo. Con fuente si la hay; si no, estimadas con semilla (siempre las mismas para ese DT). ----
export const ESTILOS_DT = ['posesion', 'presion-alta', 'transiciones', 'contragolpe', 'bloque-bajo', 'juego-directo'];
const FORMACIONES_COMUNES = ['4-2-3-1', '4-3-3 Attacking', '4-4-2', '3-4-2-1', '3-5-2 flat', '4-1-4-1', '5-3-2', '4-3-3'];
function semilla(txt) { let h = 2166136261; for (const ch of String(txt)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rnd(seed) { let x = seed || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 10000) / 10000; }; }
// Afinidad estilo-formación para que lo estimado sea coherente (línea de 3/5 atrás tira a transiciones y contragolpe).
const AFIN_LINEA = {3: ['transiciones', 'contragolpe', 'presion-alta', 'juego-directo'], 4: ['posesion', 'presion-alta', 'transiciones', 'contragolpe'], 5: ['bloque-bajo', 'contragolpe', 'juego-directo']};
export function preferenciasDT(dt) {
  const conFuente = etiquetasFilosofia(dt).filter(e => ESTILOS_DT.includes(e) || e === 'juveniles');
  const r = rnd(semilla(dt.id));
  const formacion = dt.formaciones?.[0] ?? FORMACIONES_COMUNES[Math.floor(r() * FORMACIONES_COMUNES.length)];
  const formacionEstimada = !dt.formaciones?.length;
  if (conFuente.length) return {formacion, formacionEstimada, estilos: conFuente, estiloEstimado: false, fuente: 'con fuente'};
  const linea = parseInt(String(formacion)[0], 10);
  const pool = AFIN_LINEA[linea] || ESTILOS_DT;
  const a = pool[Math.floor(r() * pool.length)];
  const resto = ESTILOS_DT.filter(e => e !== a && !(a === 'posesion' && e === 'bloque-bajo') && !(a === 'bloque-bajo' && e === 'posesion'));
  const estilos = r() < 0.6 ? [a, resto[Math.floor(r() * resto.length)]] : [a];
  return {formacion, formacionEstimada, estilos, estiloEstimado: true, fuente: 'estimado'};
}
