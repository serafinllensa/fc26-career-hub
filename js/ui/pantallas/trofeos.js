// Trofeos e historial: vitrina de la carrera (carrera.trofeos), temporada en curso y el historial REAL del club (clubes.json, Transfermarkt).
import {aviso} from '../avisos.js';
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtFecha} from '../util.js';
import {href} from '../router.js';
import {actualizar} from '../carrera.js';
import {cierreCarrera} from '../cierre.js';

const COPAS = {'LaLiga': ['Copa del Rey', 'Supercopa de España'], 'Premier League': ['FA Cup', 'EFL Cup'], 'Serie A': ['Coppa Italia', 'Supercoppa Italiana'], 'Bundesliga': ['DFB-Pokal', 'DFL-Supercup'], 'Ligue 1': ['Coupe de France', 'Trophée des Champions']};
const EURO = {ucl: 'Champions', uel: 'Europa League', uecl: 'Conference'};
const RONDA = {fase: 'fase de liga', previa: 'previa', playoff: 'playoff', octavos: 'octavos', cuartos: 'cuartos', semis: 'semis', final: 'final', campeon: 'campeón'};
const europa = l => (l || []).filter(x => !/previa/.test(x)).map(x => { const [c, r] = x.split(':'); return r === 'campeon' ? `Campeón de ${EURO[c] || c}` : `${RONDA[r] || r} de ${EURO[c] || c}`; }).join(' · ');

// Ids de competición para el Motor (liga y champions pesan más); el nombre real va en `nombre`.
const idComp = (n, liga) => n === liga ? 'liga' : n === 'Champions League' ? 'champions' : n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

export default {
  titulo: 'Trofeos',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para armar tu vitrina.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const club = ctx.club;
    const s = {aviso: null};
    const pintar = () => {
      const c = ctx.carrera, temp = c?.temporada || '2026/27';
      const comps = [club.liga, ...(COPAS[club.liga] || []), 'Champions League', 'Europa League', 'Conference League'];
      const tro = c?.trofeos || [], es = (t, n) => t.comp === idComp(n, club.liga) || t.comp === n, veces = n => tro.filter(t => es(t, n)).length, esta = n => tro.some(t => es(t, n) && t.temporada === temp);
      const R = c ? motor.resumen(c.partidos || [], 'liga') : null;
      const hist = [...(club.historial || [])].reverse();
      el.innerHTML = banda(ctx) + (c?.estado?.finalizada ? cierreCarrera(c) : '') + `
        <div class="entre" style="margin:var(--e4) 0"><div><div class="etiqueta">Tu carrera</div><h1 class="h1">Vitrina</h1></div>${c ? `<span class="badge neutro">${tro.length} ${tro.length === 1 ? 'título' : 'títulos'}</span>` : '<span class="badge neutro">Vista previa</span>'}</div>
        <div class="vitrina">${comps.map(n => { const v = veces(n);
          return `<div class="copa ${v ? 'ganada' : ''}">${v ? `<span class="veces num">×${v}</span>` : ''}<div class="icono" aria-hidden="true">🏆</div><div class="n">${esc(n)}</div><div class="t">${esta(n) ? `Ganada en ${esc(temp)}` : v ? 'Ganada' : 'En juego'}</div>
            ${c && !c.estado?.finalizada ? `<button class="btn fantasma" data-copa="${esc(n)}" style="min-height:30px;margin-top:6px;font-size:var(--t-xs)">${esta(n) ? 'Quitar' : 'La gané'}</button>` : ''}</div>`; }).join('')}</div>
        ${s.aviso ? `<p class="badge ok" role="status" style="margin-top:var(--e3)">${esc(s.aviso)}</p>` : ''}
        <p class="fuente" style="margin-top:var(--e3)">La vitrina muestra solo lo que ganás en tu carrera; lo marcás vos cuando lo ganás en la consola. Al final de la temporada, los goles, las asistencias, las vallas invictas y la nota de cada jugador se cargan en <a href="${href('plantilla', {...(params.club ? {club: params.club} : {}), rend: 1})}">Plantilla → Rendimiento</a>. El DT y el presidente los usan para opinar de las renovaciones.</p>
        <h2 class="h2" style="margin:var(--e8) 0 var(--e3)">Historial de la carrera</h2>
        <div class="linea-tiempo">
          <div class="temporada"><b class="num" style="font:800 var(--t-lg)/1 var(--f-display)">${esc(temp)}</b><div><div style="font-weight:600">${R && R.pj ? `${R.pj} partidos de liga · ${R.pts} puntos · ${R.pg}-${R.pe}-${R.pp}` : 'Sin partidos cargados'}${tro.filter(t => t.temporada === temp).map(t => ' · Campeón de ' + esc(t.nombre || t.comp)).join('')}</div><div class="meta">${c ? `Confianza del presidente ${Math.round(c.confianza.presidente)} · Vestuario ${Math.round(c.confianza.vestuario)}` : 'Empezá una carrera para seguirla'}</div></div><span class="badge ${c?.estado?.finalizada ? 'peligro' : 'ok'}">${c?.estado?.finalizada ? 'Terminada' : 'En curso'}</span></div>
        </div>
        <h2 class="h2" style="margin:var(--e8) 0 var(--e3)">Historial real de ${esc(club.corto || club.nombre)}</h2>
        ${hist.length ? `<div class="linea-tiempo">${club.actual ? `<div class="temporada"><b class="num" style="font:800 var(--t-lg)/1 var(--f-display)">${esc(club.actual.temporada || '26/27')}</b><div><div style="font-weight:600">Hoy ${club.actual.posicion}º en ${esc(club.liga)} · ${club.actual.puntos} pts en ${club.actual.pj} PJ</div><div class="meta">Tabla real al ${fmtFecha(club.actual.fecha)}</div></div><span class="badge neutro">Vida real</span></div>` : ''}
          ${hist.map(h => `<div class="temporada"><b class="num" style="font:800 var(--t-lg)/1 var(--f-display)">${esc(h.temporada)}</b><div><div style="font-weight:600">${h.posicion ?? '—'}º en ${esc(h.liga || h.division)}${h.divisionNivel > 1 ? ` (división ${h.divisionNivel})` : ''}${h.puntos != null ? ` · ${h.puntos} pts` : ''}</div><div class="meta">${[europa(h.europa), h.copa?.comp ? `${esc(h.copa.comp)}: ${esc(h.copa.rondaES || h.copa.ronda)}` : ''].filter(Boolean).join(' · ') || 'Sin Europa'}</div></div>${h.posicion === 1 && h.divisionNivel === 1 ? '<span class="badge ok">Campeón</span>' : ''}</div>`).join('')}</div>
          <p class="fuente" style="margin-top:var(--e3)">Transfermarkt, consultado el ${fmtFecha(club.actual?.fecha)}.</p>` : '<p class="meta">Sin historial cargado para este club.</p>'}`;
    };
    el.onclick = e => {
      const b = e.target.closest('[data-copa]'); if (!b || !ctx.carrera) return;
      const temp = ctx.carrera.temporada, n = b.dataset.copa, id = idComp(n, club.liga);
      let ef = null;
      try {
        ctx.carrera = actualizar(c => { const viejo = (c.trofeos || []).find(x => (x.comp === id || x.comp === n) && x.temporada === temp); if (viejo) return motor.quitarTrofeo(c, {comp: viejo.comp, temporada: temp}); const r = motor.registrarTrofeo(c, {comp: id, temporada: temp, nombre: n}); ef = r.efectos; return r.carrera; });
      } catch (err) { aviso(err.message, {tipo: 'peligro'}); return; }
      s.aviso = ef ? `¡Campeón de ${n}! Presidente +${ef.presidente ?? 0} · Hinchas +${ef.hinchas ?? 0}` : `Quitado ${n}; la confianza vuelve a como estaba.`;
      pintar();
    };
    pintar();
  }
};
