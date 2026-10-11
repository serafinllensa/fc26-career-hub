// Tarjeta de fin de carrera (despido u otro motivo) con el resumen del Motor.
import {resumenCarrera, NOMBRE_DIFICULTAD} from '../motor/index.js';
import {esc} from './util.js';
import {href} from './router.js';
const MOTIVO = {despido: 'El directorio decidió prescindir de tus servicios.'};
export function cierreCarrera(c){
  const r = resumenCarrera(c);
  const k = (t, v) => `<div class="kpi"><div class="etiqueta">${t}</div><div class="valor num">${v}</div></div>`;
  return `<section class="tarjeta brillo cierre" style="border-color:var(--peligro)">
    <div class="etiqueta">Fin del ciclo · ${esc(r.club)} · ${esc(NOMBRE_DIFICULTAD[r.dificultad] || r.dificultad)} · ${esc(r.temporada)}</div>
    <h2 class="h2" style="margin:6px 0">Carrera terminada</h2><p class="meta" style="margin:0">${esc(MOTIVO[r.motivo] || 'La carrera terminó.')} No se pueden cargar más partidos.</p>
    <div class="grilla g3" style="margin-top:var(--e4);gap:var(--e3)">${k('Partidos', r.partidos)}${k('G-E-P', `${r.pg}-${r.pe}-${r.pp}`)}${k('Efectividad', r.efectividad + '%')}${k('Goles', `${r.gf}–${r.gc}`)}${k('Ultimátums', r.ultimatums)}${k('Confianza final', Math.round(r.confianzaFinal?.presidente ?? 0))}</div>
    <div class="fila-h" style="margin-top:var(--e4);flex-wrap:wrap"><a class="btn primario" href="${href('nueva')}">Nueva carrera</a><a class="btn secundario" href="#/inicio">Mis carreras</a></div></section>`;
}
