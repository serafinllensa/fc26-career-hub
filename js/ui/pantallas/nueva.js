// Nueva carrera · paso 1: elegir o sortear club. Pensado para 96 clubes: búsqueda, filtro por liga y por nivel.
import * as datos from '../datos.js';
import {href, ir} from '../router.js';
import {LIGAS, ICONO, esc, norm, estado, cargando} from '../util.js';
import {estiloClub, escudo, ciudad} from '../club.js';

const tarjeta = c => `<a class="club" href="${href('nueva/dt', {club:c.id})}" style="${estiloClub(c)}">
  ${escudo(c)}
  <div style="flex:1;min-width:0"><div class="h3">${esc(c.nombre)}</div><div class="meta">${esc([ciudad(c), c.estadio].filter(Boolean).join(' · '))}</div></div>
  <div style="text-align:right">${c.nivel ? `<div class="estrellas" aria-label="Nivel ${c.nivel} de 5">${'★'.repeat(c.nivel)}<span style="opacity:.25">${'★'.repeat(5 - c.nivel)}</span></div>` : '<span class="sin-verificar">Nivel</span>'}</div></a>`;

export default {
  titulo: 'Nueva carrera', sinNav: true,
  async render(el, params, viejo){
    const f = {q: params.q || '', liga: params.liga || '', nivel: Number(params.nivel) || 0};
    el.innerHTML = `
      <header class="cabeza"><div class="etiqueta">Nueva carrera · Paso 1 de 3</div><h1 class="h1" style="margin-top:6px">Elegí tu club</h1>
        <p>Los clubes de las 5 grandes ligas de Europa, temporada 2026/27.</p><div class="pasos"><span class="on"></span><span></span><span></span></div></header>
      <div class="fila-h"><label class="campo">${ICONO.buscar}<input type="search" placeholder="Buscar club, ciudad o estadio" aria-label="Buscar club" value="${esc(f.q)}" data-q></label>
        <button class="btn secundario" data-sortear disabled style="flex:none" aria-label="Sortear club">Sortear</button></div>
      <div class="chips" role="group" aria-label="Liga" data-ligas></div>
      <div class="chips" role="group" aria-label="Nivel" style="margin-top:0" data-niveles></div>
      <div data-lista>${cargando(6)}</div>
      <p style="margin-top:var(--e6)"><a class="btn fantasma" href="#/inicio">← Volver</a></p>`;
    let todos;
    try { todos = await datos.clubes(); }
    catch (e) {
      if (viejo()) return;
      el.querySelector('[data-lista]').innerHTML = estado('Faltan los clubes', `No se pudo cargar <code>data/clubes.json</code>: ${esc(e.motivo)}. Datos FC lo está armando con fuente y fecha.`, 'error');
      return;
    }
    if (viejo()) return;
    const $ = s => el.querySelector(s);
    const pintarChips = () => {
      $('[data-ligas]').innerHTML = `<button class="chip" data-liga="" aria-pressed="${!f.liga}">Todas</button>` + LIGAS.map(l => `<button class="chip" data-liga="${l.id}" aria-pressed="${f.liga === l.id}">${l.id}</button>`).join('');
      $('[data-niveles]').innerHTML = `<button class="chip" data-nivel="0" aria-pressed="${!f.nivel}">Cualquier nivel</button>` + [5,4,3,2,1].map(n => `<button class="chip" data-nivel="${n}" aria-pressed="${f.nivel === n}" aria-label="Nivel ${n}">${'★'.repeat(n)}</button>`).join('');
    };
    const filtrados = () => todos.filter(c => (!f.liga || c.liga === f.liga) && (!f.nivel || c.nivel === f.nivel) && (!f.q || norm(`${c.nombre} ${c.corto} ${c.sigla} ${c.ciudad} ${c.estadio}`).includes(norm(f.q))));
    const pintarLista = () => {
      const r = filtrados();
      $('[data-sortear]').disabled = !r.length;
      $('[data-lista]').innerHTML = !r.length ? estado('Sin resultados', 'Probá con otro nombre o sacá algún filtro.')
        : LIGAS.filter(l => r.some(c => c.liga === l.id)).map(l => {
            const de = r.filter(c => c.liga === l.id).sort((a, b) => (b.nivel || 0) - (a.nivel || 0) || a.nombre.localeCompare(b.nombre, 'es'));
            const total = todos.filter(c => c.liga === l.id).length;
            return `<div class="liga-tit"><h2 class="h2">${l.id}</h2><span class="meta">${de.length} de ${total}${total < l.clubes ? ` <span class="badge alerta">faltan ${l.clubes - total}</span>` : ''}</span></div><div class="lista">${de.map(tarjeta).join('')}</div>`;
          }).join('');
      history.replaceState(null, '', href('nueva', Object.fromEntries(Object.entries(f).filter(([, v]) => v))));
    };
    $('[data-q]').addEventListener('input', e => { f.q = e.target.value; pintarLista(); });
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-liga],[data-nivel],[data-sortear]'); if (!b) return;
      if (b.dataset.sortear !== undefined) { const r = filtrados(); ir('nueva/dt', {club: r[Math.floor(Math.random() * r.length)].id, sorteo: 1}); return; } // Motor FC traerá el sorteo con semilla
      if (b.dataset.liga !== undefined) f.liga = b.dataset.liga; else f.nivel = Number(b.dataset.nivel);
      pintarChips(); pintarLista();
    });
    pintarChips(); pintarLista();
  }
};
