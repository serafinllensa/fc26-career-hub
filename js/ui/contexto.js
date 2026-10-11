// Resuelve el club de la pantalla: ?club= (vista previa) o la carrera activa.
import * as datos from './datos.js';
import {activa} from './carrera.js';
import {aplicarClub, escudo} from './club.js';
import {esc} from './util.js';

const DIF = {facil:['Fácil',1], medio:['Medio',2], dificil:['Difícil',3], hardcore:['Hardcore',4], leyenda:['Leyenda',5]};

export async function contextoClub(params){
  const c = activa();
  const id = params.club || c?.club?.id;
  if (!id) return null;
  let club, aviso = '';
  try { club = await datos.club(id); }
  catch (e) { club = {id, nombre:id, corto:id.slice(0,3)}; aviso = `Sin datos del club (${e.motivo}).`; }
  aplicarClub(club);
  return {club, carrera: params.club ? null : c, dificultad: c?.dificultad, aviso};
}

export function banda({club, dificultad, aviso}){
  const [nom, n] = DIF[dificultad] || [];
  const barras = n ? [1,2,3,4,5].map(i => `<b class="${i <= n ? 'on' : ''}"></b>`).join('') : '';
  return `<header class="banda"><div class="fila">${escudo(club, 'lg')}<div style="flex:1;min-width:0">
    <div class="etiqueta" style="color:inherit;opacity:.75">${esc(club.liga || 'Liga sin dato')} · Temporada 2026/27</div>
    <h1 class="nombre">${esc(club.nombre)}</h1>
    <div class="fila" style="margin-top:8px;gap:8px;flex-wrap:wrap">${nom ? `<span class="dif">${nom} <i>${barras}</i></span>` : '<span class="badge neutro">Vista previa</span>'}${aviso ? `<span class="badge alerta">${esc(aviso)}</span>` : ''}</div>
  </div></div></header>`;
}
