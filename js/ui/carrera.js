// Adaptador de la carrera para la UI: todo el guardado y la lógica son del Motor (js/motor/carrera.js y presidente.js).
// Acá solo se recuerda cuál es la carrera activa.
import * as motor from '../motor/index.js';
const ACTIVA = 'fc26.activaId';
const st = () => localStorage;

export const listar = () => motor.listar(st()).sort((a, b) => (b.guardada || '').localeCompare(a.guardada || ''));
export function activa(){ const id = st().getItem(ACTIVA); return id ? motor.cargar(st(), id) : null; }
export function activar(id){ st().setItem(ACTIVA, id); }
function guardar(c){ motor.guardar(st(), c); activar(c.id); return c; }

export function empezar({club, dt = null, dificultad, plantilla = []}){
  return guardar(motor.crearCarrera({club, dt, dificultad, plantilla}));
}
export function cerrar(){ st().removeItem(ACTIVA); }
export function borrar(id){ motor.borrar(st(), id); if (st().getItem(ACTIVA) === id) cerrar(); }

export const partidos = () => activa()?.partidos || [];
// Guarda el partido y deja que el presidente reaccione. Devuelve {eventos, tension, delta}.
export function guardarPartido(p, {nivelRival, perfil, plantilla = []} = {}){
  let c = activa(); if (!c) throw new Error('No hay carrera activa');
  c = motor.agregarPartido(c, p);
  const guardado = c.partidos.find(x => x.id === p.id);
  const r = motor.procesarPartido(c, guardado, {nivelRival, perfil});
  const v = motor.procesarVestuario(r.carrera, guardado, {plantilla, titulares: p.titulares || null});
  const t = motor.evaluarPrueba(v.carrera);
  guardar(t.carrera);
  return {...r, carrera: t.carrera, prueba: t.resultado, eventos: [...(r.eventos || []), ...v.eventos]};
}
// Cambio puntual de la carrera activa con una función del Motor (negociación, charla táctica, roles).
export function actualizar(fn){ const c = activa(); if (!c) throw new Error('No hay carrera activa'); return guardar(fn(c));
}
export function charla(tipo){ const r = motor.charlaVestuario(activa(), tipo); guardar(r.carrera); return r; }
// Evento de la oficina del DT o del presidente (Motor marca los del vestuario con oficina:'dt').
export const deOficina = (c, o) => (c?.eventos || []).filter(e => (e.oficina === 'dt' ? 'dt' : 'presidente') === o);
export function responder(eventoId, respuestaId){ return guardar(motor.responder(activa(), eventoId, respuestaId)); }
export const exportar = c => motor.exportar(c);
export function importar(texto){
  const c = motor.importar(texto);
  if (!c.id) c.id = `c${Date.now().toString(36)}`;
  return guardar(c);
}
export const resultado = p => p.gf > p.gc ? 'g' : p.gf === p.gc ? 'e' : 'p';

// Plantel real de la carrera: saca a los vendidos y cedidos, y suma los juveniles que subieron de la cantera.
export function conCarrera(pl, c){
  if (!c || !pl) return pl;
  const ids = Array.isArray(c.plantilla) && c.plantilla.length ? new Set(c.plantilla) : null;
  const base = ids ? pl.jugadores.filter(j => ids.has(j.id)) : pl.jugadores.slice();
  const juv = (c.cantera || []).filter(x => !ids || ids.has(x.id)).map(x => ({id: x.id, nombre: x.nombre, pos: x.pos, posSec: [], edad: x.edad, nac: null, valorM: null, dorsal: null, canterano: true, pot: x.pot ?? null, ea: x.ovr != null ? {ovr: x.ovr} : null}));
  return {...pl, jugadores: [...base, ...juv]};
}
// Once de la carrera: el que eligió el jugador en Tácticas para esa formación, o el ideal por media EA.
export function onceCarrera(J, c, onceEA){
  const form = c?.tactica?.formacion || '4-3-3', base = onceEA(J, form), guard = c?.alineacion?.[form];
  if (!Array.isArray(guard) || guard.length !== base.length) return base;
  const porId = new Map(J.map(j => [j.id, j])), usados = new Set();
  const res = base.map((slot, i) => { const j = porId.get(guard[i]); if (j && !usados.has(j)) { usados.add(j); return {...slot, j}; } return {...slot, j: null}; });
  // Si alguien guardado ya no está (vendido o cedido), entra el mejor que encaje y esté libre.
  base.forEach((slot, i) => { if (!res[i].j && slot.j && !usados.has(slot.j)) { res[i].j = slot.j; usados.add(slot.j); } });
  res.forEach(r => { if (!r.j) { const j = J.filter(x => !usados.has(x) && (r.rol === 'POR') === (x.pos === 'POR')).sort((a, b) => (b.ea?.ovr || 0) - (a.ea?.ovr || 0))[0]; if (j) { r.j = j; usados.add(j); } } });
  return res;
}
