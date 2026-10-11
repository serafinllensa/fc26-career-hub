import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, ICONO, lineaDe, ORDEN, NOMBRE_LINEA, fmtM, fmtNum, fmtFecha, fmtContrato, norm} from '../util.js';
import {href} from '../router.js';
import {chipOvr, estrellitas} from '../ea.js';

const venceEn = (j, temp = '2027-06') => j.contratoHasta && j.contratoHasta <= temp;
const ORDENES = {
  pos: (a, b) => (ORDEN[a.pos] ?? 99) - (ORDEN[b.pos] ?? 99) || (b.valorM ?? 0) - (a.valorM ?? 0),
  media: (a, b) => (b.ea?.ovr ?? -1) - (a.ea?.ovr ?? -1),
  valor: (a, b) => (b.valorM ?? -1) - (a.valorM ?? -1),
  edad: (a, b) => (a.edad ?? 99) - (b.edad ?? 99),
  contrato: (a, b) => (a.contratoHasta || '9999').localeCompare(b.contratoHasta || '9999'),
};
const contrato = j => fmtContrato(j.contratoHasta) ?? '<span class="sin-verificar">Sin dato</span>';
const estadoJ = j => !j.verificado || !j.contratoHasta || j.valorM == null ? '<span class="estado-ico alerta" title="Tiene campos sin verificar">!</span>' : venceEn(j) ? '<span class="estado-ico info" title="Vence en 2027">◷</span>' : '<span class="estado-ico ok" title="Verificado contra la fuente">✓</span>';
const verif = j => `<a href="${esc(j.tmUrl || '#')}" target="_blank" rel="noopener" class="fuente" title="${j.verificado ? 'Verificado contra la fuente' : 'Sin verificar'}"><span class="verif ${j.verificado ? '' : 'no'}"></span>TM</a>`;

export default {
  titulo: 'Plantilla',
  async render(el, params, viejo){
    el.innerHTML = cargando(6);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para ver la plantilla.', '', `<a class="btn club" href="${href('nueva')}">Nueva carrera</a>`); return; }
    let pl;
    try { pl = await datos.plantilla(ctx.club.id); }
    catch (e) { if (!viejo()) el.innerHTML = banda(ctx) + estado('No se pudo cargar la plantilla', esc(e.message), 'error'); return; }
    if (viejo()) return;
    const J = pl.jugadores, n = {por:0, def:0, med:0, del:0};
    J.forEach(j => n[lineaDe(j.pos)]++);
    const edades = J.filter(j => j.edad != null);
    const f = {q:'', linea:'', orden:'pos'};
    let sel = [...J].sort((a, b) => (b.valorM ?? -1) - (a.valorM ?? -1))[0];
    const ficha = j => {
      if (!j) return '';
      const ea = j.ea && j.ea.ovr != null ? j.ea : null;
      return `<div class="cab"><div class="num-xl num" title="${ea ? 'Media EA FC 26' : 'Dorsal'}">${ea ? ea.ovr : (j.dorsal ?? '–')}</div><div><div class="posg"><b>${esc(j.pos ?? '—')}</b>${(j.posSec || []).map(x => ' · ' + esc(x)).join('')}</div><div class="nombre-j">${esc(j.nombre)}</div><div class="meta">${esc(j.nacCodigo || j.nac)} · ${esc(ctx.club.nombre)}${ea ? ` · #${j.dorsal ?? '–'}` : ''}</div></div></div>
      <div class="etiqueta" style="margin-top:var(--e5)">EA FC 26${ea?.fecha ? ' · ' + fmtFecha(ea.fecha) : ''}</div>
      ${ea ? `<div class="datos" style="grid-template-columns:repeat(6,1fr);margin-top:var(--e2);padding-top:0;border:0">${['pac','sho','pas','dri','def','phy'].map(k => `<div><div class="etiqueta">${k.toUpperCase()}</div><b class="num">${ea[k] ?? '—'}</b></div>`).join('')}</div>`
           : '<p class="meta sin-verificar" style="margin:var(--e2) 0 0">Este jugador no tiene ficha en la base de EA. No inventamos la media.</p>'}
      ${ea ? `<p class="meta" style="margin:var(--e2) 0 0">${ea.posEA ? 'En el juego: ' + esc(ea.posEA) + ' · ' : ''}${ea.pieHabil ? 'Pie ' + esc(ea.pieHabil) + ' · ' : ''}Filigranas ${estrellitas(ea.filigranas)} · Pierna mala ${estrellitas(ea.piernaMala)}</p>` : ''}
      ${ea?.equipoEA && ea.equipoEA !== ctx.club.nombre ? `<div class="aviso-equipoea">En EA figura en ${esc(ea.equipoEA)} (pase 26/27 cargado a mano)</div>` : ''}
      <div class="etiqueta" style="margin-top:var(--e5)">Transfermarkt · ${fmtFecha(pl.fecha)}</div>
      <div class="datos" style="margin-top:var(--e2)"><div><div class="etiqueta">Edad</div><b class="num">${j.edad ?? '—'}</b></div><div><div class="etiqueta">Valor de mercado</div><b class="num">${fmtM(j.valorM)}</b></div><div><div class="etiqueta">Contrato</div><b class="num">${contrato(j)}</b></div></div>
      ${(j.sinVerificar || []).length ? `<p class="meta sin-verificar" style="margin:var(--e4) 0 0">Sin verificar: ${j.sinVerificar.map(esc).join(', ')}</p>` : ''}
      <div class="interes"><span class="etiqueta" style="color:var(--tinta-2)">Fuentes</span><span>${j.tmUrl ? `<a class="fuente" href="${esc(j.tmUrl)}" target="_blank" rel="noopener" style="color:#fff;font-weight:700;display:inline">Transfermarkt ↗</a>` : ''}${ea?.fuente ? ` · <a class="fuente" href="${esc(ea.fuente)}" target="_blank" rel="noopener" style="color:#fff;font-weight:700;display:inline">EA ↗</a>` : ''}</span></div>`;
    };
    const elegir = id => {
      const j = J.find(x => x.id === id); if (!j) return;
      sel = j;
      el.querySelectorAll('tr[data-j]').forEach(tr => { const on = tr.dataset.j === id; tr.classList.toggle('sel', on); tr.setAttribute('aria-selected', on); });
      $('[data-ficha]').innerHTML = ficha(j);
    };
    el.innerHTML = banda(ctx) + `
      <div class="entre"><div><h2 class="h1">Plantilla</h2><p class="fuente" style="margin:6px 0 0"><span class="verif"></span> Datos de <a href="${esc(pl.fuente)}" target="_blank" rel="noopener">Transfermarkt</a> · consulta ${fmtFecha(pl.fecha)}</p></div></div>
      <div class="resumen">
        <div class="tarjeta kpi"><div class="etiqueta">Valor total</div><div class="valor num">${fmtNum(J.reduce((a, j) => a + (j.valorM || 0), 0))}<small>M€</small></div></div>
        <div class="tarjeta kpi"><div class="etiqueta">Jugadores</div><div class="valor num">${J.length}</div></div>
        <div class="tarjeta kpi"><div class="etiqueta">Vencen 2027</div><div class="valor num" style="color:var(--alerta)">${J.filter(j => venceEn(j)).length}</div></div>
        <div class="tarjeta kpi solo-esc"><div class="etiqueta">Edad media</div><div class="valor num">${edades.length ? fmtNum(edades.reduce((a, j) => a + j.edad, 0) / edades.length) : '—'}</div></div>
        <div class="tarjeta kpi solo-esc"><div class="etiqueta">Sub-21</div><div class="valor num">${J.filter(j => j.edad != null && j.edad <= 21).length}</div></div>
      </div>
      <div class="fila-h" style="flex-wrap:wrap"><label class="campo" style="min-width:220px">${ICONO.buscar}<input type="search" placeholder="Buscar jugador o país" aria-label="Buscar jugador" data-q></label>
        <label class="campo" style="flex:none"><select aria-label="Ordenar" data-orden><option value="pos">Por posición</option><option value="media">Por media EA</option><option value="valor">Por valor</option><option value="edad">Por edad</option><option value="contrato">Por contrato</option></select></label></div>
      <div class="chips" role="group" aria-label="Filtrar por línea">
        <button class="chip" data-linea="" aria-pressed="true">Todos ${J.length}</button>
        ${Object.keys(n).map(l => `<button class="chip" data-linea="${l}" aria-pressed="false">${NOMBRE_LINEA[l]} ${n[l]}</button>`).join('')}
        <button class="chip" data-linea="vence" aria-pressed="false">Vencen 2027</button></div>
      <div data-res></div>`;
    const $ = s => el.querySelector(s);
    const pintar = () => {
      const r = J.filter(j => (!f.linea || (f.linea === 'vence' ? venceEn(j) : lineaDe(j.pos) === f.linea)) && (!f.q || norm(`${j.nombre} ${j.nac} ${j.pos}`).includes(norm(f.q)))).sort(ORDENES[f.orden]);
      if (!r.length) { $('[data-res]').innerHTML = estado('Sin resultados', 'Ningún jugador coincide con la búsqueda.'); return; }
      let filas = '', ult = '';
      for (const j of r) {
        const l = lineaDe(j.pos);
        if (f.orden === 'pos' && l !== ult) { filas += `<li class="sep"><span class="etiqueta">${NOMBRE_LINEA[l]}</span><span class="etiqueta">${r.filter(x => lineaDe(x.pos) === l).length}</span></li>`; ult = l; }
        filas += `<li><span class="dorsal num">${j.dorsal ?? '–'}</span><div style="min-width:0"><div class="nom">${esc(j.nombre)}</div><div class="sub"><span class="pos ${l}">${esc(j.pos)}</span><span class="num">${j.edad ?? '—'} años</span>·<span>${esc(j.nacCodigo || j.nac)}</span>·<span class="num ${venceEn(j) ? 'vence' : ''}">${contrato(j)}</span></div></div><div class="val num" style="display:flex;gap:10px;align-items:center">${chipOvr(j)}<span>${fmtNum(j.valorM)}<small>M€</small></span></div></li>`;
      }
      if (!r.includes(sel)) sel = r[0];
      $('[data-res]').innerHTML = `<ul class="filas">${filas}</ul>
        <div class="plantel"><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Pos.</th><th title="Media EA FC 26">Media</th><th>#</th><th>Jugador</th><th class="der">Edad</th><th>Nac.</th><th class="der">Valor</th><th>Contrato</th><th>Estado</th></tr></thead><tbody>
        ${r.map(j => `<tr data-j="${esc(j.id)}" tabindex="0" class="${j === sel ? 'sel' : ''}" aria-selected="${j === sel}"><td><span class="pos ${lineaDe(j.pos)}">${esc(j.pos ?? '—')}</span></td><td>${chipOvr(j)}</td><td class="num" style="font:800 var(--t-lg)/1 var(--f-display);color:var(--tinta-2)">${j.dorsal ?? '–'}</td><td style="font-weight:600">${esc(j.nombre)}</td><td class="der num">${j.edad ?? '—'}</td><td class="meta">${esc(j.nacCodigo || j.nac)}</td><td class="der num" style="font-weight:700">${fmtM(j.valorM)}</td><td class="num ${venceEn(j) ? 'vence' : ''}">${contrato(j)}</td><td>${estadoJ(j)}</td></tr>`).join('')}
        </tbody></table></div><aside class="ficha tarjeta brillo" aria-label="Ficha del jugador elegido" aria-live="polite" data-ficha>${ficha(sel)}</aside></div>`;
    };
    $('[data-q]').addEventListener('input', e => { f.q = e.target.value; pintar(); });
    $('[data-orden]').addEventListener('change', e => { f.orden = e.target.value; pintar(); });
    el.addEventListener('keydown', e => {
      const tr = e.target.closest('tr[data-j]'); if (!tr) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(tr.dataset.j); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const sig = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling; if (sig) { sig.focus(); elegir(sig.dataset.j); } }
    });
    el.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-j]'); if (tr) { elegir(tr.dataset.j); return; }
      const b = e.target.closest('[data-linea]'); if (!b) return;
      f.linea = b.dataset.linea;
      el.querySelectorAll('[data-linea]').forEach(x => x.setAttribute('aria-pressed', x === b));
      pintar();
    });
    pintar();
  }
};
