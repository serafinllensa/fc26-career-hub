import * as datos from '../datos.js';
import {cierreCarrera} from '../cierre.js';
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtNum, fmtFecha} from '../util.js';
import {href} from '../router.js';

export default {
  titulo: 'Panel',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Elegí un club y una dificultad para arrancar.', '', `<a class="btn club" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const {club} = ctx, dif = ctx.dificultad || 'medio';
    let pl = null; try { pl = await datos.plantilla(club.id); } catch {}
    if (viejo()) return;
    let pz = null, fin = null;
    try { pz = ctx.carrera?.objetivos || motor.objetivosPlazos(club, dif); fin = motor.finanzas(club, dif); } catch (e) { console.warn('[panel]', e.message); }
    const CAT = {deportivo:'Deportivo', cantera:'Cantera', economico:'Económico', institucional:'Institucional', desarrollo:'Desarrollo'};
    const lista = arr => `<ul style="margin:0;padding-left:18px">${arr.map(o => `<li${o.principal ? ' style="font-weight:600"' : ''}>${esc(o.texto)} <span class="badge neutro" style="font-size:10px">${CAT[o.categoria] || ''}</span></li>`).join('')}</ul>`;
    const conf = ctx.carrera?.confianza;
    const rest = motor.restricciones(dif);
    const fj = ctx.carrera?.finanzasJuego;
    const finHtml = fj
      ? `<section class="tarjeta"><header><h2 class="h2">Finanzas</h2><span class="badge neutro">Según el juego</span></header>
          <div class="etiqueta">Presupuesto de fichajes</div><p class="h3" style="margin:4px 0 var(--e3)">${fj.presupuestoM} M€</p>
          <div class="etiqueta">Tope salarial</div><p class="h3" style="margin:4px 0 0">${fj.topeM} M€</p>
          <p class="meta" style="margin-top:var(--e3)">Base del juego: ${fj.presupuestoJuegoM} M€ fichajes · ${fj.masaJuegoM} M€ masa${fj.salud?.salud ? ` · salud ${fj.salud.salud}` : ''}</p>
          ${conf ? `<div class="etiqueta" style="margin-top:var(--e4)">Confianza</div><div class="meta">Presidente ${Math.round(conf.presidente)} · Vestuario ${Math.round(conf.vestuario)} · Hinchas ${Math.round(conf.hinchas)}</div>` : ''}
        </section>`
      : `<section class="tarjeta"><header><h2 class="h2">Finanzas</h2><span class="badge estimado">Estimado</span></header>
          <div class="etiqueta">Presupuesto de fichajes</div><p class="h3" style="margin:4px 0 var(--e3)">${esc(fin?.texto.presupuesto ?? 'Sin dato')}</p>
          <div class="etiqueta">Tope salarial</div><p class="h3" style="margin:4px 0 0">${esc(fin?.texto.topeSalarial ?? 'Sin dato')}</p>
          ${conf ? `<div class="etiqueta" style="margin-top:var(--e4)">Confianza</div><div class="meta">Presidente ${Math.round(conf.presidente)} · Vestuario ${Math.round(conf.vestuario)} · Hinchas ${Math.round(conf.hinchas)}</div>` : ''}
        </section>`;
    el.innerHTML = banda(ctx) + (ctx.carrera?.estado?.finalizada ? cierreCarrera(ctx.carrera) : '') + `
      ${ctx.dificultad ? '' : '<p class="meta"><span class="badge neutro">Vista previa</span> Mostrando la dificultad Medio.</p>'}
      <div class="grilla g-panel">
        <section class="tarjeta"><header><h2 class="h2">Objetivos</h2><span class="badge neutro">${motor.NOMBRE_DIFICULTAD[dif]}</span></header>
          ${pz ? `<h3 class="etiqueta" style="margin:0 0 var(--e2)">Esta temporada</h3>${lista(pz.corto)}
            <h3 class="etiqueta" style="margin:var(--e4) 0 var(--e2)">En ${pz.plazos.mediano} temporadas</h3>${lista(pz.mediano)}
            <h3 class="etiqueta" style="margin:var(--e4) 0 var(--e2)">En ${pz.plazos.largo} temporadas</h3>${lista(pz.largo)}` : '<p class="meta">El club no tiene nivel cargado, así que el Motor no puede calcular objetivos.</p>'}
          ${rest.length ? `<h3 class="etiqueta" style="margin:var(--e5) 0 var(--e2)">Restricciones</h3><ul style="margin:0;padding-left:18px" class="meta">${rest.map(r => `<li>${esc(r.texto)}</li>`).join('')}</ul>` : ''}
        </section>
        ${finHtml}
      </div>
      <div class="grilla g3" style="margin-top:var(--e4)">
        <a class="tarjeta kpi" style="text-decoration:none;color:inherit" href="${href('plantilla', params.club ? {club: params.club} : undefined)}"><div class="etiqueta">Valor de plantilla</div><div class="valor num">${fmtNum(club.valorPlantillaM)}<small>M€</small></div><div class="det">${pl ? `${pl.jugadores.length} jugadores · Transfermarkt, ${fmtFecha(pl.fecha)}` : 'Plantilla no disponible'}</div></a>
        <div class="tarjeta kpi"><div class="etiqueta">Estadio</div><div class="h3" style="margin-top:6px">${esc(club.estadio || 'Sin dato')}</div></div>
        <div class="tarjeta kpi" title="${esc(club.nivelMotivo || '')}"><div class="etiqueta">Nivel del club</div><div class="valor num">${club.nivel ?? '—'}<small>/5</small></div><div class="det">${esc(club.nivelMotivo || '')}</div></div>
      </div>`;
  }
};
