import {listar, activa, activar, borrar, exportar, importar} from '../carrera.js';
import {confirmar} from '../avisos.js';
import {href, ir} from '../router.js';
import {esc, fmtFecha} from '../util.js';
import * as datos from '../datos.js';
import {escudo} from '../club.js';
import {NOMBRE_DIFICULTAD, resumen} from '../../motor/index.js';

export default {
  titulo: 'Mis carreras', sinNav: true,
  async render(el){
    const lista = listar(), act = activa();
    let clubs = []; try { clubs = await datos.clubes(); } catch {}
    const clubDe = c => clubs.find(x => x.id === c.club?.id) || c.club || {};
    const tarjeta = c => { const r = resumen(c.partidos || [], 'liga');
      return `<article class="tarjeta carrera-item">${escudo(clubDe(c))}
        <div style="flex:1;min-width:0"><div class="h3">${esc(c.club?.nombre)}</div>
          <div class="meta">${esc(NOMBRE_DIFICULTAD[c.dificultad] || c.dificultad)} · ${esc(c.temporada)} · ${r.pj} PJ, ${r.pts} pts${c.estado?.despedido ? ' · <span class="sin-verificar">Despedido</span>' : ''}</div>
          <div class="meta" style="font-size:var(--t-xs)">Guardada ${fmtFecha((c.guardada || c.creada || '').slice(0, 10))}${act?.id === c.id ? ' · activa' : ''}</div></div>
        <div class="fila-h acciones"><button class="btn primario" data-seguir="${esc(c.id)}">Continuar</button>
          <button class="btn secundario" data-exportar="${esc(c.id)}" aria-label="Exportar a archivo">Exportar</button>
          <button class="btn fantasma" data-borrar="${esc(c.id)}" aria-label="Borrar carrera">Borrar</button></div></article>`; };
    el.innerHTML = `
      <header class="cabeza"><div class="etiqueta">EA FC 26 · Modo carrera · 2026/27</div>
        <h1 class="h1" style="margin-top:6px">FC26 Career Hub</h1>
        <p>Tu centro de control al lado de la consola: plantilla real, objetivos, directiva y vestuario.</p></header>
      <div class="entre"><h2 class="h2">Carreras guardadas</h2><div class="fila-h"><label class="btn secundario" style="cursor:pointer">Importar<input type="file" accept=".json,application/json" data-importar hidden></label><a class="btn primario" href="${href('nueva')}">Nueva carrera</a></div></div>
      <div data-aviso></div>
      <div class="grilla">${lista.length ? lista.map(tarjeta).join('') : `<div class="vacio"><h2 class="h2">Todavía no hay carreras</h2><p>Elegí o sorteá uno de los 96 clubes de las 5 grandes ligas y arrancá.</p><a class="btn primario" href="${href('nueva')}">Empezar</a></div>`}</div>`;
    const aviso = (t, tipo = 'error') => { el.querySelector('[data-aviso]').innerHTML = `<p class="badge ${tipo === 'error' ? 'peligro' : 'ok'}" role="${tipo === 'error' ? 'alert' : 'status'}" style="margin-bottom:var(--e3)">${esc(t)}</p>`; };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-seguir],[data-exportar],[data-borrar]'); if (!b) return;
      const c = lista.find(x => x.id === (b.dataset.seguir || b.dataset.exportar || b.dataset.borrar));
      if (b.dataset.seguir) { activar(c.id); ir('panel'); }
      else if (b.dataset.exportar) {
        const url = URL.createObjectURL(new Blob([exportar(c)], {type: 'application/json'}));
        const a = Object.assign(document.createElement('a'), {href: url, download: `fc26-${c.club?.id}-${(c.temporada || '').replace('/', '-')}.json`});
        a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (b.dataset.borrar) confirmar({titulo: `¿Borrar la carrera con ${c.club?.nombre}?`, texto: 'Exportala antes si la querés conservar. No se puede deshacer.', si: 'Borrar', peligro: true}).then(ok => { if (ok) { borrar(c.id); this.render(el); } });
    });
    el.querySelector('[data-importar]').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const c = importar(await f.text()); this.render(el); setTimeout(() => aviso(`Carrera con ${c.club?.nombre} importada.`, 'ok'), 0); }
      catch (err) { aviso(`No se pudo importar: ${err.message}`); }
    });
  }
};
