// Carga de las fotos fechadas de data/ (contrato del BRIEF). Cachea, valida y nunca inventa:
// si un archivo falta o viene roto, la pantalla muestra el estado real.
const BASE = new URL('../../data/', import.meta.url);
const cache = new Map();

export class ErrorDatos extends Error {
  constructor(archivo, motivo){ super(`${archivo}: ${motivo}`); this.archivo = archivo; this.motivo = motivo; }
}

async function cargar(ruta){
  if (cache.has(ruta)) return cache.get(ruta);
  const p = (async () => {
    let r;
    try { r = await fetch(new URL(ruta, BASE), {cache:'no-cache'}); }
    catch { throw new ErrorDatos(ruta, 'sin conexión con el sitio'); }
    if (r.status === 404) throw new ErrorDatos(ruta, 'todavía no existe');
    if (!r.ok) throw new ErrorDatos(ruta, `error ${r.status}`);
    try { return await r.json(); } catch { throw new ErrorDatos(ruta, 'el JSON está mal formado'); }
  })();
  cache.set(ruta, p);
  p.catch(() => cache.delete(ruta)); // permite reintentar
  return p;
}

// Avisos de contrato: se loguean una vez para que Datos FC y QA los vean en consola.
const avisados = new Set();
function avisar(archivo, faltan){
  const k = archivo + faltan.join();
  if (faltan.length && !avisados.has(k)) { avisados.add(k); console.warn(`[datos] ${archivo}: faltan campos del contrato → ${faltan.join(', ')}`); }
}
const faltantes = (obj, campos) => campos.filter(c => !(c in obj));

import {calcularNiveles} from '../motor/index.js';
const CAMPOS_CLUB = ['id','nombre','corto','pais','liga','nivel','colores','fuentes'];
const CAMPOS_JUG = ['id','nombre','pos','edad','nac','valorM','contratoHasta','dorsal','verificado'];

// El nivel que se muestra es el del Motor (calcularNiveles), no el que trae clubes.json.
let conNivel = null;
export function clubes(){
  if (conNivel) return conNivel;
  conNivel = (async () => {
    const lista = await cargar('clubes.json');
    if (!Array.isArray(lista)) throw new ErrorDatos('clubes.json', 'se esperaba una lista');
    lista.forEach(c => avisar(`clubes.json#${c.id}`, faltantes(c, CAMPOS_CLUB)));
    const ligas = await cargar('ligas.json').catch(() => null);
    try {
      const n = new Map(calcularNiveles(lista, ligas ? {ligas} : {}).map(x => [x.id, x]));
      return lista.map(c => n.has(c.id) ? {...c, nivelDatos: c.nivel, nivel: n.get(c.id).nivel, nivelMotivo: n.get(c.id).motivo} : c);
    } catch (e) { console.warn('[datos] calcularNiveles falló, uso el nivel de clubes.json:', e.message); return lista; }
  })();
  conNivel.catch(() => { conNivel = null; });
  return conNivel;
}
export async function club(id){
  const c = (await clubes()).find(c => c.id === id);
  if (!c) throw new ErrorDatos('clubes.json', `no está el club "${id}"`);
  return c;
}
export async function plantilla(clubId){
  if (!/^[a-z0-9-]+$/.test(clubId)) throw new ErrorDatos('plantillas', 'id de club inválido');
  const p = await cargar(`plantillas/${clubId}.json`);
  if (!Array.isArray(p?.jugadores)) throw new ErrorDatos(`plantillas/${clubId}.json`, 'falta "jugadores"');
  p.jugadores.forEach(j => avisar(`plantillas/${clubId}.json#${j.id}`, faltantes(j, CAMPOS_JUG)));
  return p;
}
export const dts = () => cargar('dts.json');
export const fixture = liga => cargar(`fixtures/${liga}.json`);
export const fciq = () => cargar('fciq.json');
