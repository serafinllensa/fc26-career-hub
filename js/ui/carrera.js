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
