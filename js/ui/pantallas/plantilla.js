import {conCarrera, actualizar} from '../carrera.js';
import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, ICONO, lineaDe, ORDEN, NOMBRE_LINEA, fmtM, fmtNum, fmtFecha, fmtContrato, norm} from '../util.js';
import {href} from '../router.js';
import {chipOvr, estrellitas, ovr} from '../ea.js';
import * as motor from '../../motor/index.js';
import {aviso, confirmar} from '../avisos.js';

const POS = ['POR', 'DFC', 'LI', 'LD', 'CAI', 'CAD', 'MCD', 'MC', 'MCO', 'MI', 'MD', 'EI', 'ED', 'DC'];
let CATALOGO = null;
async function catalogo(){
  if (CATALOGO) return CATALOGO;
  const cs = await datos.clubes();
  const ps = await Promise.all(cs.map(c => datos.plantilla(c.id).then(p => p.jugadores.map(j => ({...j, clubOrigen: c.nombre, clubId: c.id}))).catch(() => [])));
  return (CATALOGO = ps.flat());
}
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
    const plBase = pl;
    const dts = await datos.dts().catch(() => []);
    if (viejo()) return;
    let J = conCarrera(plBase, ctx.carrera).jugadores;
    const refrescar = () => { J = conCarrera(plBase, ctx.carrera).jugadores; if (sel) sel = J.find(x => x.id === sel.id) || null; };
    const n0 = {por:0, def:0, med:0, del:0};
    J.forEach(j => n0[lineaDe(j.pos)]++);
    const edades = J.filter(j => j.edad != null);
    const f = {q:'', linea:'', orden:'pos'};
    let sel = null; // la ficha arranca cerrada: se abre solo al tocar un jugador
    let panel = params.rend ? 'rend' : null; // 'sumar' | 'rend' | null
    let rendTemp = ctx.carrera?.temporada || '2026/27';
    let opinion = null;
    let altaQ = '';
    let manual = false;
    const tempAct = ctx.carrera?.temporada || '2026/27';
    const tempAnt = motor.temporadaPrevia(tempAct);
    const sueldoDe = j => j.sueldoM != null ? j.sueldoM : '';
    const ficha = j => {
      if (!j) return '';
      const ea = j.ea && j.ea.ovr != null ? j.ea : null;
      return `<button class="cerrar" type="button" data-cerrar-ficha aria-label="Cerrar ficha">✕</button><div class="cab"><div class="num-xl num" title="${ea ? 'Media EA FC 26' : 'Dorsal'}">${ea ? ea.ovr : (j.dorsal ?? '–')}</div><div><div class="posg"><b>${esc(j.pos ?? '—')}</b>${(j.posSec || []).map(x => ' · ' + esc(x)).join('')}</div><div class="nombre-j">${esc(j.nombre)}</div><div class="meta">${esc(j.nacCodigo || j.nac)} · ${esc(ctx.club.nombre)}${ea ? ` · #${j.dorsal ?? '–'}` : ''}</div></div></div>
      <div class="etiqueta" style="margin-top:var(--e5)">EA FC 26${ea?.fecha ? ' · ' + fmtFecha(ea.fecha) : ''}</div>
      ${ea ? `<div class="datos" style="grid-template-columns:repeat(6,1fr);margin-top:var(--e2);padding-top:0;border:0">${['pac','sho','pas','dri','def','phy'].map((k, i) => `<div><div class="etiqueta">${(j.pos === 'POR' ? ['DIV','HAN','KIC','REF','SPD','POS'] : ['PAC','SHO','PAS','DRI','DEF','PHY'])[i]}</div><b class="num">${ea[k] ?? '—'}</b></div>`).join('')}</div>`
           : '<p class="meta sin-verificar" style="margin:var(--e2) 0 0">Este jugador no tiene ficha en la base de EA. No inventamos la media.</p>'}
      ${ea ? `<p class="meta" style="margin:var(--e2) 0 0">${ea.posEA ? 'En el juego: ' + esc(ea.posEA) + ' · ' : ''}${ea.pieHabil ? 'Pie ' + esc(ea.pieHabil) + ' · ' : ''}Filigranas ${estrellitas(ea.filigranas)} · Pierna mala ${estrellitas(ea.piernaMala)}</p>` : ''}
      ${ea?.equipoEA && ea.equipoEA !== ctx.club.nombre ? `<div class="aviso-equipoea">En EA figura en ${esc(ea.equipoEA)} (pase 26/27 cargado a mano)</div>` : ''}
      <div class="etiqueta" style="margin-top:var(--e5)">Transfermarkt · ${fmtFecha(pl.fecha)}</div>
      <div class="datos" style="margin-top:var(--e2)"><div><div class="etiqueta">Edad</div><b class="num">${j.edad ?? '—'}</b></div><div><div class="etiqueta">Valor de mercado</div><b class="num">${fmtM(j.valorM)}</b></div><div><div class="etiqueta">Contrato</div><b class="num">${contrato(j)}</b></div></div>
      ${(j.sinVerificar || []).length ? `<p class="meta sin-verificar" style="margin:var(--e4) 0 0">Sin verificar: ${j.sinVerificar.map(esc).join(', ')}</p>` : ''}
      <div class="interes"><span class="etiqueta" style="color:var(--tinta-2)">Fuentes</span><span>${j.tmUrl ? `<a class="fuente" href="${esc(j.tmUrl)}" target="_blank" rel="noopener" style="color:#fff;font-weight:700;display:inline">Transfermarkt ↗</a>` : ''}${ea?.fuente ? ` · <a class="fuente" href="${esc(ea.fuente)}" target="_blank" rel="noopener" style="color:#fff;font-weight:700;display:inline">EA ↗</a>` : ''}</span></div>
      ${ctx.carrera ? `<div class="bloque"><div class="etiqueta">Tu modo carrera</div>
        <p class="meta" style="margin:6px 0 0">La media, el contrato y el sueldo de acá son los de tu partida. No cambian la base.</p>
        <div class="ficha-edit">
          <label>OVR<input type="number" min="40" max="99" step="1" data-ovr value="${ovr(j) ?? ''}" inputmode="numeric"></label>
          <label>Contrato hasta<input type="month" data-contrato value="${esc(j.contratoHasta || '')}"></label>
          <label>Sueldo anual (millones de euros)<input type="number" min="0" max="80" step="0.1" data-sueldo value="${sueldoDe(j)}" inputmode="decimal"></label>
          <button class="btn primario" type="button" data-guardar-ficha>Guardar ficha</button>
          <button class="btn secundario" type="button" data-preguntar>Preguntarle al DT si renovar</button>
          <button class="btn fantasma" type="button" data-sacar>Sacar del plantel</button>
        </div>
        ${opinion && opinion.id === j.id ? `<div class="opinion">${opinion.dt ? `<article><div class="quien ${opinion.dt.decision}">${esc(ctx.carrera.dt?.nombre || 'Director técnico')} · ${esc(opinion.dt.titulo)}</div><p class="meta" style="margin:0">${esc(opinion.dt.texto)}</p></article>` : '<article><p class="meta" style="margin:0">Esta carrera no tiene DT. Igual podés leer al presidente.</p></article>'}<article><div class="quien ${opinion.presidente.decision}">${esc(ctx.club.presidente?.nombre || 'Presidente')} · ${esc(opinion.presidente.titulo)}</div><p class="meta" style="margin:0">${esc(opinion.presidente.texto)}</p></article></div>` : ''}</div>` : ''}`;
    };
    const elegir = id => {
      const j = J.find(x => x.id === id); if (!j) return;
      sel = j; marcar();
      $('[data-ficha]').innerHTML = ficha(j); $('.plantel')?.classList.add('con-ficha');
    };
    const marcar = () => el.querySelectorAll('[data-j]').forEach(tr => { const on = !!sel && tr.dataset.j === sel.id; tr.classList.toggle('sel', on); if (tr.tagName === 'TR') tr.setAttribute('aria-selected', on); });
    const cerrarFicha = () => { if (!sel) return; const id = sel.id; sel = null; marcar(); $('.plantel')?.classList.remove('con-ficha'); el.querySelector(`tr[data-j="${CSS.escape(id)}"]`)?.focus({preventScroll: true}); };
    el.innerHTML = banda(ctx) + `
      <div class="entre"><div><h2 class="h1">Plantilla</h2><p class="fuente" style="margin:6px 0 0"><span class="verif"></span> Datos de <a href="${esc(pl.fuente)}" target="_blank" rel="noopener">Transfermarkt</a> · consulta ${fmtFecha(pl.fecha)}</p><p class="meta" style="margin:6px 0 0">Sacá o sumá jugadores cuando quieras. En la ficha se editan el OVR, el contrato y el sueldo, y se le pregunta al DT si renovar.</p></div></div>
      <div class="resumen">
        <div class="tarjeta kpi"><div class="etiqueta">Valor total</div><div class="valor num">${fmtNum(J.reduce((a, j) => a + (j.valorM || 0), 0))}<small>M€</small></div></div>
        <div class="tarjeta kpi"><div class="etiqueta">Jugadores</div><div class="valor num">${J.length}</div></div>
        <div class="tarjeta kpi"><div class="etiqueta">Vencen 2027</div><div class="valor num" style="color:var(--alerta)">${J.filter(j => venceEn(j)).length}</div></div>
        <div class="tarjeta kpi solo-esc"><div class="etiqueta">Edad media</div><div class="valor num">${edades.length ? fmtNum(edades.reduce((a, j) => a + j.edad, 0) / edades.length) : '—'}</div></div>
        <div class="tarjeta kpi solo-esc"><div class="etiqueta">Sub-21</div><div class="valor num">${J.filter(j => j.edad != null && j.edad <= 21).length}</div></div>
      </div>
      <div class="fila-h" style="flex-wrap:wrap"><label class="campo" style="min-width:220px">${ICONO.buscar}<input type="search" placeholder="Buscar jugador o país" aria-label="Buscar jugador" data-q></label>
        <label class="campo" style="flex:none"><select aria-label="Ordenar" data-orden data-etiqueta="Ordenar"><option value="pos">Por posición</option><option value="media">Por media EA</option><option value="valor">Por valor</option><option value="edad">Por edad</option><option value="contrato">Por contrato</option></select></label></div>
      <div class="chips" role="group" aria-label="Filtrar por línea">
        <button class="chip" data-linea="" aria-pressed="true">Todos ${J.length}</button>
        ${Object.keys(n0).map(l => `<button class="chip" data-linea="${l}" aria-pressed="false">${NOMBRE_LINEA[l]} ${n0[l]}</button>`).join('')}
        <button class="chip" data-linea="vence" aria-pressed="false">Vencen 2027</button></div>
      <div class="fila-h" style="flex-wrap:wrap;margin-bottom:var(--e3)">
        <button class="btn secundario" type="button" data-panel="sumar">Sumar jugador</button>
        <button class="btn secundario" type="button" data-panel="rend">Rendimiento de la temporada</button>
      </div>
      <div data-extra></div>
      <div data-res></div>`;
    const $ = s => el.querySelector(s);
    const pintar = () => {
      const n = {por:0, def:0, med:0, del:0};
      J.forEach(j => n[lineaDe(j.pos)]++);
      el.querySelectorAll('[data-linea]').forEach(b => {
        const l = b.dataset.linea;
        if (!l) b.textContent = `Todos ${J.length}`;
        else if (l !== 'vence') b.textContent = `${NOMBRE_LINEA[l]} ${n[l]}`;
      });
      const r = J.filter(j => (!f.linea || (f.linea === 'vence' ? venceEn(j) : lineaDe(j.pos) === f.linea)) && (!f.q || norm(`${j.nombre} ${j.nac} ${j.pos}`).includes(norm(f.q)))).sort(ORDENES[f.orden]);
      if (!r.length) { $('[data-res]').innerHTML = estado('Sin resultados', 'Ningún jugador coincide con la búsqueda.'); return; }
      let filas = '', ult = '';
      for (const j of r) {
        const l = lineaDe(j.pos);
        if (f.orden === 'pos' && l !== ult) { filas += `<li class="sep"><span class="etiqueta">${NOMBRE_LINEA[l]}</span><span class="etiqueta">${r.filter(x => lineaDe(x.pos) === l).length}</span></li>`; ult = l; }
        filas += `<li data-j="${esc(j.id)}" class="${j === sel ? 'sel' : ''}" role="button" tabindex="0"><span class="dorsal num">${j.dorsal ?? '–'}</span><div style="min-width:0"><div class="nom">${esc(j.nombre)}</div><div class="sub"><span class="pos ${l}">${esc(j.pos)}</span><span class="num">${j.edad ?? '—'} años</span>·<span>${esc(j.nacCodigo || j.nac)}</span>·<span class="num ${venceEn(j) ? 'vence' : ''}">${contrato(j)}</span></div></div><div class="val num" style="display:flex;gap:10px;align-items:center">${chipOvr(j)}<span>${fmtNum(j.valorM)}<small>M€</small></span></div></li>`;
      }
      if (sel && !r.includes(sel)) sel = null;
      $('[data-res]').innerHTML = `<ul class="filas">${filas}</ul>
        <div class="plantel ${sel ? 'con-ficha' : ''}"><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Pos.</th><th title="Media EA FC 26">Media</th><th>#</th><th>Jugador</th><th class="der">Edad</th><th>Nac.</th><th class="der">Valor</th><th>Contrato</th><th>Estado</th></tr></thead><tbody>
        ${r.map(j => `<tr data-j="${esc(j.id)}" tabindex="0" class="${j === sel ? 'sel' : ''}" aria-selected="${j === sel}"><td><span class="pos ${lineaDe(j.pos)}">${esc(j.pos ?? '—')}</span></td><td>${chipOvr(j)}</td><td class="num" style="font:800 var(--t-lg)/1 var(--f-display);color:var(--tinta-2)">${j.dorsal ?? '–'}</td><td style="font-weight:600">${esc(j.nombre)}</td><td class="der num">${j.edad ?? '—'}</td><td class="meta">${esc(j.nacCodigo || j.nac)}</td><td class="der num" style="font-weight:700">${fmtM(j.valorM)}</td><td class="num ${venceEn(j) ? 'vence' : ''}">${contrato(j)}</td><td>${estadoJ(j)}</td></tr>`).join('')}
        </tbody></table></div><aside class="ficha tarjeta brillo" aria-label="Ficha del jugador elegido" aria-live="polite" data-ficha>${ficha(sel)}</aside></div>`;
    };
    const pintarExtra = () => {
      const box = $('[data-extra]'); if (!box) return;
      if (!ctx.carrera) { box.innerHTML = ''; return; }
      if (panel === 'sumar') {
        box.innerHTML = `<section class="alta-box"><div class="entre" style="margin:0"><h3 class="h2" style="margin:0">Sumar al plantel</h3><button class="btn fantasma" type="button" data-panel="">Cerrar</button></div>
          <p class="meta">Buscá en las cinco ligas a alguien que ya fichaste, o cargá a mano al que no está en la base. Para sacar a uno, abrí su ficha.</p>
          <label class="campo">${ICONO.buscar}<input type="search" data-alta-q placeholder="Nombre del jugador" aria-label="Buscar para sumar" value="${esc(altaQ)}"></label>
          <div class="lista-alta" data-alta-res></div>
          <button class="btn fantasma" type="button" data-manual style="margin-top:8px">${manual ? 'Ocultar carga manual' : 'Cargarlo a mano'}</button>
          ${manual ? `<div class="alta-form" style="margin-top:var(--e3);display:grid;gap:8px">
            <label>Nombre<input data-man-nom placeholder="Nombre y apellido" autocomplete="off"></label>
            <div class="fila-h"><label style="flex:1">Posición<select data-man-pos>${POS.map(p => `<option>${p}</option>`).join('')}</select></label><label style="flex:1">Edad<input data-man-edad type="number" min="15" max="45" value="25"></label></div>
            <div class="fila-h"><label style="flex:1">Media<input data-man-ovr type="number" min="40" max="99" placeholder="78"></label><label style="flex:1">Contrato<input data-man-con type="month" value="2029-06"></label></div>
            <label>Sueldo anual (M€)<input data-man-sueldo type="number" min="0" step="0.1" placeholder="4,5"></label>
            <button class="btn primario" type="button" data-crear>Sumar al plantel</button>
          </div>` : ''}</section>`;
        return;
      }
      if (panel === 'rend') {
        const map = ctx.carrera.rendimiento?.[rendTemp] || {};
        const filas = [...J].sort((a, b) => (ORDEN[a.pos] ?? 99) - (ORDEN[b.pos] ?? 99) || a.nombre.localeCompare(b.nombre, 'es'));
        box.innerHTML = `<section class="rend-box" id="rendimiento"><div class="entre" style="margin:0"><div><h3 class="h2" style="margin:0">Rendimiento de la temporada</h3><p class="meta" style="margin:4px 0 0">Goles, asistencias, vallas invictas y valoración promedio. El DT y el presidente los usan cuando opinan de una renovación.</p></div><button class="btn fantasma" type="button" data-panel="">Cerrar</button></div>
          <div class="neg-tipos" style="margin:var(--e3) 0"><button type="button" class="chip" data-temp="${esc(tempAct)}" aria-pressed="${rendTemp === tempAct}">Esta · ${esc(tempAct)}</button>${tempAnt ? `<button type="button" class="chip" data-temp="${esc(tempAnt)}" aria-pressed="${rendTemp === tempAnt}">Anterior · ${esc(tempAnt)}</button>` : ''}</div>
          <div style="overflow:auto"><table class="rend-tabla"><thead><tr><th>Jugador</th><th>Goles</th><th>Asist.</th><th>Vallas</th><th>Nota</th></tr></thead><tbody>
          ${filas.map(j => { const s = map[j.id] || {}; return `<tr data-rend-id="${esc(j.id)}"><td><b>${esc(j.nombre)}</b><div class="meta">${esc(j.pos || '')}</div></td><td><input data-g inputmode="numeric" min="0" value="${s.goles ?? ''}" aria-label="Goles de ${esc(j.nombre)}"></td><td><input data-a inputmode="numeric" min="0" value="${s.asistencias ?? ''}" aria-label="Asistencias de ${esc(j.nombre)}"></td><td><input data-v inputmode="numeric" min="0" value="${s.vallas ?? ''}" aria-label="Vallas de ${esc(j.nombre)}"></td><td><input data-n inputmode="decimal" min="0" max="10" step="0.1" value="${s.nota ?? ''}" aria-label="Nota de ${esc(j.nombre)}"></td></tr>`; }).join('')}
          </tbody></table></div>
          <button class="btn primario" type="button" data-guardar-rend style="margin-top:var(--e3)">Guardar ${esc(rendTemp)}</button></section>`;
        return;
      }
      box.innerHTML = '';
    };
    $('[data-q]').addEventListener('input', e => { f.q = e.target.value; pintar(); });
    $('[data-orden]').addEventListener('change', e => { f.orden = e.target.value; pintar(); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Escape') { cerrarFicha(); return; }
      const tr = e.target.closest('[data-j]'); if (!tr) return;
      if (tr.tagName === 'LI' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); elegir(tr.dataset.j); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(tr.dataset.j); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); const sig = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling; if (sig) { sig.focus(); elegir(sig.dataset.j); } }
    });
    el.addEventListener('input', async e => {
      if (!e.target.matches('[data-alta-q]')) return;
      altaQ = e.target.value;
      const lista = $('[data-alta-res]'); if (!lista) return;
      if (norm(altaQ).length < 2) { lista.innerHTML = '<p class="meta">Escribí al menos dos letras.</p>'; return; }
      lista.innerHTML = '<p class="meta">Buscando en las cinco ligas…</p>';
      const all = await catalogo();
      if ($('[data-alta-q]')?.value !== altaQ) return;
      const en = new Set(J.map(j => j.id));
      const r = all.filter(j => !en.has(j.id) && norm(`${j.nombre} ${j.pos} ${j.clubOrigen}`).includes(norm(altaQ))).slice(0, 14);
      lista.innerHTML = r.length ? r.map(j => `<button type="button" data-sumar="${esc(j.id)}"><span>${esc(j.nombre)}<small class="meta" style="display:block">${esc(j.pos || '—')} · ${esc(j.clubOrigen)}${ovr(j) != null ? ' · ' + ovr(j) : ''}</small></span></button>`).join('') : '<p class="meta">No está en la base. Cargalo a mano.</p>';
    });
    el.addEventListener('click', async e => {
      const acc = e.target.closest('[data-guardar-ficha],[data-preguntar],[data-sacar],[data-panel],[data-manual],[data-crear],[data-sumar],[data-temp],[data-guardar-rend]');
      if (acc) {
        try {
          if (acc.dataset.panel !== undefined) { panel = panel === acc.dataset.panel ? null : (acc.dataset.panel || null); pintarExtra(); if (panel === 'sumar' && altaQ) $('[data-alta-q]')?.dispatchEvent(new Event('input', {bubbles: true})); return; }
          if (acc.dataset.manual !== undefined) { manual = !manual; pintarExtra(); return; }
          if (acc.dataset.temp) { rendTemp = acc.dataset.temp; pintarExtra(); return; }
          if (acc.dataset.guardarFicha !== undefined && sel && ctx.carrera) {
            const o = $('[data-ovr]')?.value, cto = $('[data-contrato]')?.value, su = $('[data-sueldo]')?.value;
            ctx.carrera = actualizar(c => motor.editarFicha(c, sel.id, {ovr: o, contratoHasta: cto, sueldoM: su}));
            refrescar(); aviso('Ficha guardada', {tipo: 'ok'}); pintar(); return;
          }
          if (acc.dataset.preguntar !== undefined && sel && ctx.carrera) {
            const dt = ctx.carrera.dt ? dts.find(d => d.id === ctx.carrera.dt.id) : null;
            opinion = {...motor.opinionRenovacion({dt, jugador: sel, actual: ctx.carrera.rendimiento?.[tempAct]?.[sel.id] || null, anterior: tempAnt ? (ctx.carrera.rendimiento?.[tempAnt]?.[sel.id] || null) : null, sueldoM: sel.sueldoM ?? null}), id: sel.id};
            pintar(); return;
          }
          if (acc.dataset.sacar !== undefined && sel && ctx.carrera) {
            const ok = await confirmar({titulo: `Sacar a ${sel.nombre}`, texto: 'Deja de estar en tu plantel, en la táctica y en el mercado. Lo podés volver a sumar.', si: 'Sacar', peligro: true});
            if (!ok) return;
            const id = sel.id;
            ctx.carrera = actualizar(c => motor.sacarDelPlantel(c, id));
            sel = null; opinion = null; refrescar(); aviso('Sacado del plantel', {tipo: 'ok'}); pintar(); return;
          }
          if (acc.dataset.sumar && ctx.carrera) {
            const j = (CATALOGO || []).find(x => x.id === acc.dataset.sumar); if (!j) return;
            ctx.carrera = actualizar(c => motor.sumarAlPlantel(c, j, {copia: j.clubId !== ctx.club.id}));
            refrescar(); aviso(`${j.nombre} está en el plantel`, {tipo: 'ok'}); pintar(); pintarExtra(); return;
          }
          if (acc.dataset.crear !== undefined && ctx.carrera) {
            const nombre = $('[data-man-nom]')?.value.trim();
            if (!nombre) { aviso('Poné el nombre.', {tipo: 'alerta'}); return; }
            const edad = Number($('[data-man-edad]')?.value);
            const jug = {id: `manual-${Date.now().toString(36)}`, nombre, pos: $('[data-man-pos]')?.value || 'MC', edad: Number.isFinite(edad) ? edad : null, ovr: $('[data-man-ovr]')?.value || null, contratoHasta: $('[data-man-con]')?.value || null, sueldoM: $('[data-man-sueldo]')?.value || null, manual: true, clubOrigen: 'Carga manual'};
            ctx.carrera = actualizar(c => motor.sumarAlPlantel(c, jug));
            if (jug.ovr || jug.contratoHasta || jug.sueldoM) ctx.carrera = actualizar(c => motor.editarFicha(c, jug.id, {ovr: jug.ovr, contratoHasta: jug.contratoHasta, sueldoM: jug.sueldoM}));
            refrescar(); aviso(`${nombre} está en el plantel`, {tipo: 'ok'}); pintar(); return;
          }
          if (acc.dataset.guardarRend !== undefined && ctx.carrera) {
            const filas = {};
            el.querySelectorAll('[data-rend-id]').forEach(tr => { filas[tr.dataset.rendId] = {goles: tr.querySelector('[data-g]').value, asistencias: tr.querySelector('[data-a]').value, vallas: tr.querySelector('[data-v]').value, nota: tr.querySelector('[data-n]').value}; });
            ctx.carrera = actualizar(c => motor.cargarRendimiento(c, rendTemp, filas));
            aviso(`Rendimiento de ${rendTemp} guardado. El DT y el presidente ya lo tienen en cuenta.`, {tipo: 'ok', ms: 4200});
            return;
          }
        } catch (err) { aviso(err.message, {tipo: 'peligro'}); }
        return;
      }
      if (e.target.closest('[data-cerrar-ficha]')) { cerrarFicha(); return; }
      const tr = e.target.closest('[data-j]'); if (tr) { if (sel?.id === tr.dataset.j) cerrarFicha(); else elegir(tr.dataset.j); return; }
      const b = e.target.closest('[data-linea]');
      if (!b) { if (sel && !e.target.closest('.ficha')) cerrarFicha(); return; }
      f.linea = b.dataset.linea;
      el.querySelectorAll('[data-linea]').forEach(x => x.setAttribute('aria-pressed', x === b));
      pintar();
    });
    pintar();
    pintarExtra();
    const res = $('[data-res]'), fueraFicha = e => { if (!res.isConnected) { document.removeEventListener('pointerdown', fueraFicha); return; } if (sel && !el.contains(e.target) && !e.target.closest('.desp-lista,.hoja-fondo')) cerrarFicha(); };
    document.addEventListener('pointerdown', fueraFicha);
    const onEsc = e => { if (!res.isConnected) { document.removeEventListener('keydown', onEsc); return; } if (e.key === 'Escape' && !e.defaultPrevented) cerrarFicha(); };
    document.addEventListener('keydown', onEsc);
  }
};
