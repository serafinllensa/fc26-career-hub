// Calendario: rivales reales de la liga. El ORDEN del fixture es de ejemplo hasta que Motor cargue el oficial.
// Los resultados son los que carga el jugador; nada inventado.
import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtFecha} from '../util.js';
import {href} from '../router.js';
import {escudo} from '../club.js';
import {partidos, resultado} from '../carrera.js';
import * as motor from '../../motor/index.js';
import {cierreCarrera} from '../cierre.js';

// Fixture del Motor (oficial si Datos publica data/fixtures/<liga>.json; si no, doble rueda provisoria).
const SLUG = l => l.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
export async function fixture(club, todos){
  const oficial = await datos.fixture(SLUG(club.liga)).catch(() => null);
  const ids = todos.filter(c => c.liga === club.liga).map(c => c.id);
  const por = new Map(todos.map(c => [c.id, c]));
  const repro = new Set();
  for (const j of oficial?.jornadas || []) for (const p of j.partidos) if (p.reprogramado && (p.local === club.id || p.visitante === club.id)) repro.add(j.n);
  return motor.fixtureLiga(ids, club.id, oficial).map(f => ({...f, reprogramado: f.reprogramado ?? repro.has(f.jornada), real: f.resultadoReal || null, realLV: f.resultadoRealLV || null, rival: por.get(f.rivalId) || {id: f.rivalId, nombre: f.rivalId}}));
}

const MES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
const diaMes = f => `${Number(f.slice(8, 10))} ${MES[Number(f.slice(5, 7)) - 1]}`;

export default {
  titulo: 'Calendario',
  async render(el, params, viejo){
    el.innerHTML = cargando(6);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para ver el calendario.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    let todos; try { todos = await datos.clubes(); } catch (e) { el.innerHTML = banda(ctx) + estado('Faltan los clubes', esc(e.message), 'error'); return; }
    if (viejo()) return;
    const fx = await fixture(ctx.club, todos), jugados = ctx.carrera ? partidos() : [];
    const de = j => jugados.find(p => p.comp === 'liga' && p.jornada === j);
    const provisorio = fx.some(f => f.provisorio);
    const hoy = new Date().toISOString().slice(0, 10);
    const prox = fx.find(f => !de(f.jornada) && !f.real && (!f.fecha || f.fecha >= hoy)) || fx.find(f => !de(f.jornada));
    const q = params.club ? {club: params.club} : {};
    const R = motor.resumen(jugados), forma = motor.forma(jugados, 5);
    const fila = f => { const p = de(f.jornada), es = f === prox;
      return `<a class="jornada ${es ? 'proxima' : ''}" href="${href('partido', {...q, jornada: f.jornada})}" style="text-decoration:none;color:inherit"><div class="fecha"><span class="etiqueta">${f.fecha ? diaMes(f.fecha) : 'Jorn.'}</span><b class="num">${f.jornada}</b>${f.reprogramado ? '<span class="chip-repro" title="En la vida real este partido se jugó en otra fecha">Reprogramado</span>' : ''}</div>
        <div class="partido">${escudo(f.rival, 'sm')}<div style="min-width:0"><div class="rival">${f.local ? 'vs' : 'en'} ${esc(f.rival.nombre)}</div><div class="meta" style="display:flex;gap:6px;align-items:center"><span class="comp">${esc(ctx.club.liga)}</span>${f.local ? 'Local' : 'Visitante'}</div></div></div>
        ${p ? `<span class="res ${resultado(p)} num">${p.gf}–${p.gc}</span>` : f.real ? `<span class="res real num" title="Resultado real (${esc(f.fuente ? 'Transfermarkt' : 'fuente oficial')}); cargá el tuyo">${f.real.gf}–${f.real.gc}<small>Real</small></span>` : es && !fin ? '<span class="btn primario" style="min-height:36px;padding:0 14px">Cargar</span>' : '<span class="meta">Por jugar</span>'}</a>`; };
    const fin = ctx.carrera?.estado?.finalizada;
    el.innerHTML = banda(ctx) + (fin ? cierreCarrera(ctx.carrera) : '') + `<div class="grilla g-panel">
      <section><div class="entre" style="margin-bottom:var(--e3)"><h2 class="h1" style="font-size:var(--t-2xl)">Calendario</h2>${provisorio ? '<span class="badge ejemplo" title="Rivales reales; el orden es provisorio">Fixture provisorio</span>' : '<span class="badge ok">Fixture oficial</span>'}</div>
        <div class="jornadas">${fx.map(fila).join('')}</div>
        <p class="fuente" style="margin-top:var(--e3)">Rivales reales de ${esc(ctx.club.liga)} 2026/27. ${provisorio ? 'El orden de las jornadas es provisorio (doble rueda del Motor) hasta tener el fixture oficial de la liga.' : 'Fixture oficial de la liga (' + (fx[0]?.fuente ? 'vía Transfermarkt' : 'fuente oficial') + '). Los resultados en gris son los reales; los tuyos se cargan aparte.'} Champions y copa se suman con el calendario europeo.</p></section>
      <div class="grilla" style="align-content:start">
        <section class="tarjeta"><header><h2 class="h2">Forma</h2></header>
          ${jugados.length ? `<div class="forma">${forma.map(r => `<span class="${r.toLowerCase()}">${r}</span>`).join('')}</div>
          <div class="grilla g3" style="margin-top:var(--e4);gap:var(--e3)"><div class="kpi"><div class="etiqueta">Puntos</div><div class="valor num">${R.pts}</div></div><div class="kpi"><div class="etiqueta">Goles</div><div class="valor num">${R.gf}–${R.gc}</div></div><div class="kpi"><div class="etiqueta">G-E-P</div><div class="valor num">${R.pg}-${R.pe}-${R.pp}</div></div></div>`
          : `<p class="meta" style="margin:0">${ctx.carrera ? 'Todavía no cargaste resultados. Jugá el partido en la consola y cargalo acá.' : 'En la vista previa no se guardan resultados. Empezá una carrera para cargarlos.'}</p>`}</section>
        ${prox && !fin ? `<section class="tarjeta brillo"><header><h2 class="h2">Próximo</h2></header><div style="display:flex;align-items:center;gap:var(--e3)">${escudo(prox.rival)}<div><div class="h3">${prox.local ? 'vs' : 'en'} ${esc(prox.rival.nombre)}</div><div class="meta">${prox.fecha ? fmtFecha(prox.fecha) + ' · ' : ''}Jornada ${prox.jornada} · ${esc(ctx.club.liga)}</div></div></div><a class="btn primario" href="${href('partido', {...q, jornada: prox.jornada})}" style="width:100%;margin-top:var(--e4)">Cargar resultado</a></section>` : ''}
      </div></div>`;
  }
};
