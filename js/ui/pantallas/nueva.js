// Nueva carrera · paso 1: elegir club como en EA FC.
// Arriba el país, al centro un club de esa liga, abajo la división.
import * as datos from '../datos.js';
import {href, ir} from '../router.js';
import {esc, estado, cargando} from '../util.js';
import {escudo} from '../club.js';
import {aviso} from '../avisos.js';

const PAISES = [
  {liga: 'Premier League', pais: 'Inglaterra', bandera: '🇬🇧', segunda: 'Championship'},
  {liga: 'LaLiga', pais: 'España', bandera: '🇪🇸', segunda: 'Segunda División'},
  {liga: 'Serie A', pais: 'Italia', bandera: '🇮🇹', segunda: 'Serie B'},
  {liga: 'Bundesliga', pais: 'Alemania', bandera: '🇩🇪', segunda: '2. Bundesliga'},
  {liga: 'Ligue 1', pais: 'Francia', bandera: '🇫🇷', segunda: 'Ligue 2'},
];

export default {
  titulo: 'Nueva carrera', sinNav: true,
  async render(el, params, viejo){
    el.innerHTML = `<div class="picker">${cargando(3)}</div>`;
    let todos;
    try { todos = await datos.clubes(); }
    catch (e) {
      if (viejo()) return;
      el.innerHTML = estado('Faltan los clubes', `No se pudo cargar la base: ${esc(e.motivo || e.message)}`, 'error');
      return;
    }
    if (viejo()) return;
    const deLiga = (liga) => todos.filter(c => c.liga === liga).sort((a, b) => (b.nivel || 0) - (a.nivel || 0) || (a.actual?.posicion ?? 99) - (b.actual?.posicion ?? 99) || a.nombre.localeCompare(b.nombre, 'es'));
    let iPais = Math.max(0, PAISES.findIndex(p => p.liga === params.liga));
    let iClub = 0;
    let iDiv = params.div === '2' ? 2 : 1;
    const listaActual = () => deLiga(iDiv === 2 ? PAISES[iPais].segunda : PAISES[iPais].liga);
    const pintar = () => {
      const pais = PAISES[iPais];
      const lista = listaActual();
      const nombreLiga = iDiv === 2 ? pais.segunda : pais.liga;
      if (iClub >= lista.length) iClub = 0;
      const c = lista[iClub] || null;
      const n = c?.nivel || 0;
      const paises = PAISES.map((p, i) => `<button type="button" class="picker-pais ${i === iPais ? 'on' : ''}" data-ir-pais="${i}" aria-pressed="${i === iPais}"><span class="picker-bandera" aria-hidden="true">${p.bandera}</span><b>${esc(p.pais)}</b></button>`).join('');
      const lugar = c ? [c.ciudad, c.estadio].filter(Boolean).join(' · ') : '';
      const tabla = c?.actual?.posicion ? `${c.actual.posicion}º` : '';
      const carta = c ? `<a class="picker-carta" href="${href('nueva/dt', {club: c.id})}" style="--pick:${esc((c.colores?.principal) || '#1f6f5b')}">
            <div class="picker-liga">${esc(nombreLiga)}</div>
            <div class="picker-escudo">${escudo(c, 'lg')}</div>
            <div class="picker-nombre">${esc(c.nombre)}</div>
            <div class="picker-stars" aria-label="Nivel ${n} de 5">${'★'.repeat(n)}<span>${'★'.repeat(Math.max(0, 5 - n))}</span></div>
            ${lugar ? `<div class="picker-lugar">${esc(lugar)}</div>` : ''}
            <div class="picker-cuenta">${tabla ? tabla + ' · ' : ''}${iClub + 1} / ${lista.length}</div>
          </a>` : `<div class="picker-carta vacia"><p>No hay clubes de esta liga.</p></div>`;
      el.innerHTML = `<div class="picker">
        <div class="picker-top">
          <button type="button" class="picker-flecha" data-pais="-1" aria-label="País anterior">‹</button>
          <div class="picker-paises" role="tablist" aria-label="País">${paises}</div>
          <button type="button" class="picker-flecha" data-pais="1" aria-label="País siguiente">›</button>
        </div>
        <div class="picker-medio">
          <button type="button" class="picker-flecha grande" data-club="-1" aria-label="Club anterior" ${lista.length < 2 ? 'disabled' : ''}>‹</button>
          ${carta}
          <button type="button" class="picker-flecha grande" data-club="1" aria-label="Club siguiente" ${lista.length < 2 ? 'disabled' : ''}>›</button>
        </div>
        <div class="picker-div" role="group" aria-label="División">
          <button type="button" class="picker-div-btn ${iDiv === 1 ? 'on' : ''}" data-div="1" aria-pressed="${iDiv === 1}">1ª división</button>
          <button type="button" class="picker-div-btn ${iDiv === 2 ? 'on' : ''}" data-div="2" aria-pressed="${iDiv === 2}">2ª división</button>
        </div>
        <p class="picker-nota">${c?.formato ? esc(c.formato) : 'Deslizá el escudo o usá las flechas. Un club por vez, como en el juego.'}</p>
        <div class="picker-acciones">
          ${c ? `<a class="btn primario" href="${href('nueva/dt', {club: c.id})}">Elegir ${esc(c.corto || c.nombre)}</a>` : ''}
          <button type="button" class="btn secundario" data-sortear ${lista.length ? '' : 'disabled'}>Sortear</button>
        </div>
        <p class="picker-volver"><a class="btn fantasma" href="${href('inicio', {quedate: 1})}">← Volver</a></p>
      </div>`;
      history.replaceState(null, '', href('nueva', {liga: pais.liga, ...(iDiv === 2 ? {div: 2} : {})}));
      el.querySelector('.picker-pais.on')?.scrollIntoView({inline: 'center', block: 'nearest', behavior: 'smooth'});
    };
    const mover = (deltaPais, deltaClub) => {
      if (deltaPais) {
        iPais = (iPais + deltaPais + PAISES.length) % PAISES.length;
        iClub = 0;
      }
      if (deltaClub) {
        const n = listaActual().length || 1;
        iClub = (iClub + deltaClub + n) % n;
      }
      pintar();
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pais],[data-ir-pais],[data-club],[data-div],[data-sortear]'); if (!b) return;
      if (b.dataset.irPais != null) { iPais = Number(b.dataset.irPais); iClub = 0; pintar(); }
      else if (b.dataset.pais) mover(Number(b.dataset.pais), 0);
      else if (b.dataset.club) mover(0, Number(b.dataset.club));
      else if (b.dataset.div) { iDiv = Number(b.dataset.div) === 2 ? 2 : 1; pintar(); }
      else if (b.dataset.sortear !== undefined) {
        const lista = listaActual();
        if (!lista.length) { aviso('No hay clubes para sortear en esta división.', {tipo: 'alerta'}); return; }
        ir('nueva/dt', {club: lista[Math.floor(Math.random() * lista.length)].id, sorteo: 1});
      }
    });
    let px = 0, py = 0, arrastro = false;
    el.addEventListener('pointerdown', e => {
      if (!e.target.closest('.picker-carta')) return;
      px = e.clientX; py = e.clientY; arrastro = false;
    });
    el.addEventListener('pointerup', e => {
      if (!px) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      px = 0;
      if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      arrastro = true;
      mover(0, dx < 0 ? 1 : -1);
    });
    el.addEventListener('click', e => {
      if (arrastro && e.target.closest('.picker-carta')) { arrastro = false; e.preventDefault(); }
    }, true);
    el.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') mover(0, -1);
      else if (e.key === 'ArrowRight') mover(0, 1);
      else if (e.key === 'ArrowUp') mover(-1, 0);
      else if (e.key === 'ArrowDown') mover(1, 0);
    });
    pintar();
  }
};
