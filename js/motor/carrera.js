// Motor FC: carrera guardada (formato del BRIEF) + guardar, cargar, exportar, importar.
import {paciencia, REGLAS} from './dificultades.js';
import {objetivosPlazos} from './plazos.js';
import {finanzas} from './estimados.js';
import {validarPartido} from './calendario.js';

export const VERSION = 1;
const CLAVE = 'fc26.carreras';

export function crearCarrera({club, dt = null, dificultad, plantilla = [], temporada = '2026/27'}) {
  if (!REGLAS[dificultad]) throw new Error(`Dificultad inválida: ${dificultad}`);
  const pac = paciencia(dificultad);
  return {
    version: VERSION, id: `c${Date.now().toString(36)}`, creada: new Date().toISOString(),
    club: {id: club.id, nombre: club.nombre, nivel: club.nivel, liga: club.liga, ...(club.division === 2 ? {division: 2, reserva: !!club.reserva} : {})},
    dt: dt ? {id: dt.id, nombre: dt.nombre} : null,
    dificultad, temporada, plantilla: plantilla.map(j => j.id ?? j),
    partidos: [], finanzas: finanzas(club, dificultad),
    objetivos: objetivosPlazos(club, dificultad),
    confianza: {presidente: pac.inicial, vestuario: 65, hinchas: 65},
    estado: {ultimatums: 0, despedido: false},
    eventos: [], trofeos: [],
  };
}

export function agregarPartido(carrera, partido) {
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó: no se pueden cargar más partidos');
  const errores = validarPartido(partido);
  if (errores.length) throw new Error(errores.join('; '));
  const p = {id: partido.id ?? `p${carrera.partidos.length + 1}`, ...partido};
  return {...carrera, partidos: [...carrera.partidos.filter(x => x.id !== p.id), p]};
}

const r1 = x => (typeof x === 'number' ? Math.round(x * 10) / 10 : x);
/** Deja la confianza con un decimal (también limpia guardados viejos con errores de flotantes). */
export function normalizar(carrera) {
  const c = carrera.confianza || {};
  return {...carrera, confianza: Object.fromEntries(Object.entries(c).map(([k, v]) => [k, r1(v)]))};
}
export function exportar(carrera) { return JSON.stringify(normalizar(carrera), null, 2); }
export function importar(texto) {
  let c;
  try { c = JSON.parse(texto); } catch { throw new Error('El archivo no es un JSON válido'); }
  for (const k of ['version', 'club', 'dificultad', 'temporada', 'partidos', 'confianza']) if (!(k in c)) throw new Error(`Falta el campo ${k}`);
  if (c.version > VERSION) throw new Error('La carrera es de una versión más nueva de la app');
  for (const p of c.partidos) { const e = validarPartido(p); if (e.length) throw new Error(`Partido ${p.id}: ${e.join('; ')}`); }
  return c;
}

// storage: cualquier objeto con getItem/setItem (localStorage en la app, un mock en los tests).
export function listar(storage) { try { return JSON.parse(storage.getItem(CLAVE) || '[]'); } catch { return []; } }
export function guardar(storage, carrera) {
  const todas = listar(storage).filter(c => c.id !== carrera.id);
  storage.setItem(CLAVE, JSON.stringify([...todas, {...normalizar(carrera), guardada: new Date().toISOString()}]));
}
export function cargar(storage, id) { return listar(storage).find(c => c.id === id) || null; }
export function borrar(storage, id) { storage.setItem(CLAVE, JSON.stringify(listar(storage).filter(c => c.id !== id))); }

/** Resumen para la pantalla de cierre (despido o fin de ciclo). */
export function resumenCarrera(carrera, resumenFn) {
  const ps = carrera.partidos || [];
  let pg = 0, pe = 0, pp = 0, gf = 0, gc = 0;
  for (const p of ps) { gf += p.gf; gc += p.gc; if (p.gf > p.gc) pg++; else if (p.gf === p.gc) pe++; else pp++; }
  return {
    club: carrera.club.nombre, dificultad: carrera.dificultad, temporada: carrera.temporada,
    finalizada: !!carrera.estado?.finalizada, motivo: carrera.estado?.motivoFin ?? null,
    partidos: ps.length, pg, pe, pp, gf, gc, efectividad: ps.length ? Math.round(((pg * 3 + pe) / (ps.length * 3)) * 100) : 0,
    confianzaFinal: carrera.confianza, ultimatums: carrera.estado?.ultimatums ?? 0, trofeos: carrera.trofeos?.length ?? 0,
    listaTrofeos: carrera.trofeos || [], trofeosPorComp: (carrera.trofeos || []).reduce((a, t) => ({...a, [t.comp]: (a[t.comp] || 0) + 1}), {}),
  };
}

// Trofeos: el jugador marca "La gané". Ganar un título sube la confianza (más si es la Champions o la liga).
const PESO_TROFEO = {champions: {presidente: 12, hinchas: 15}, liga: {presidente: 10, hinchas: 12}};
const r1t = x => Math.round(x * 10) / 10;
export function registrarTrofeo(carrera, {comp, temporada = carrera.temporada, nombre = null}) {
  if (!comp) throw new Error('Falta la competición');
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  const ya = (carrera.trofeos || []).some(t => t.comp === comp && t.temporada === temporada);
  if (ya) return {carrera, nuevo: false, efectos: {presidente: 0, hinchas: 0}};
  const e = PESO_TROFEO[comp] || {presidente: 6, hinchas: 8};
  const techo = 100, c = carrera.confianza;
  const confianza = {...c, presidente: r1t(Math.min(techo, c.presidente + e.presidente)), hinchas: r1t(Math.min(100, c.hinchas + e.hinchas))};
  const trofeo = {comp, temporada, nombre, efectos: e};
  return {carrera: {...carrera, confianza, trofeos: [...(carrera.trofeos || []), trofeo]}, nuevo: true, efectos: e};
}
/** Para deshacer un "La gané" marcado por error: revierte también la confianza. */
export function quitarTrofeo(carrera, {comp, temporada = carrera.temporada}) {
  const t = (carrera.trofeos || []).find(x => x.comp === comp && x.temporada === temporada);
  if (!t) return carrera;
  const e = t.efectos || {presidente: 0, hinchas: 0}, c = carrera.confianza;
  return {...carrera, trofeos: carrera.trofeos.filter(x => x !== t),
    confianza: {...c, presidente: r1t(Math.max(0, c.presidente - e.presidente)), hinchas: r1t(Math.max(0, c.hinchas - e.hinchas))}};
}
