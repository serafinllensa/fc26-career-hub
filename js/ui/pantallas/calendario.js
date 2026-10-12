// Calendario: arranca vacío. El jugador agrega cada partido (competición, rival, local/visitante)
// sobre la fecha que elige, y después carga el resultado.
import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtFecha} from '../util.js';
import {href} from '../router.js';
import {escudo} from '../club.js';
import {partidos, resultado, actualizar} from '../carrera.js';
import * as motor from '../../motor/index.js';
import {cierreCarrera} from '../cierre.js';
import {aviso, confirmar} from '../avisos.js';

const COPA = {'Premier League': 'FA Cup', LaLiga: 'Copa del Rey', 'Serie A': 'Coppa Italia', Bundesliga: 'DFB-Pokal', 'Ligue 1': 'Coupe de France', Championship: 'FA Cup', 'Segunda División': 'Copa del Rey', 'Serie B': 'Coppa Italia', '2. Bundesliga': 'DFB-Pokal', 'Ligue 2': 'Coupe de France'};
export function nombreComp(id, liga){
  if (id === 'liga') return liga || 'Liga';
  if (id === 'copa') return COPA[liga] || 'Copa';
  return {ucl: 'Champions League', uel: 'Europa League', uecl: 'Conference League'}[id] || id;
}
const COMPS = ['liga', 'copa', 'ucl', 'uel', 'uecl'];
const MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESC = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DOW = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);

function entradas(carrera, clubes){
  const por = new Map((clubes || []).map(c => [c.id, c]));
  const fx = carrera?.fixture || [];
  const ids = new Set(fx.map(f => f.id));
  const legado = (carrera?.partidos || []).filter(p => p?.id && !ids.has(p.id) && !fx.some(f => f.id === p.fixtureId)).map(p => ({
    id: p.id, fecha: p.fecha || null, comp: p.comp, rivalId: p.rivalId, local: !!p.local, legado: true,
  }));
  return [...fx, ...legado]
    .map(f => ({...f, rival: por.get(f.rivalId) || {id: f.rivalId, nombre: f.rivalId || 'Rival'}}))
    .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
}

export default {
  titulo: 'Calendario',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para armar el calendario.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    let todos = [];
    try { todos = await datos.clubes(); } catch (e) { el.innerHTML = banda(ctx) + estado('Faltan los clubes', esc(e.message), 'error'); return; }
    if (viejo()) return;
    const rivales = todos.filter(c => c.id !== ctx.club.id);
    const fin = ctx.carrera?.estado?.finalizada;
    const q = params.club ? {club: params.club} : {};
    const hoy = hoyISO();
    const ui = {y: 2026, m: 7, sel: hoy >= '2026-08-01' && hoy <= '2027-07-31' ? hoy : '2026-08-15', comp: 'liga', rivalId: rivales.find(c => c.liga === ctx.club.liga)?.id || rivales[0]?.id || '', local: true};
    if (ui.sel.slice(0, 7) !== `${ui.y}-${String(ui.m + 1).padStart(2, '0')}`) {
      ui.y = Number(ui.sel.slice(0, 4)); ui.m = Number(ui.sel.slice(5, 7)) - 1;
    }
    const $ = s => el.querySelector(s);
    const lista = () => entradas(ctx.carrera, todos);
    const jugado = f => (ctx.carrera ? partidos() : []).find(p => p.id === f.id || p.fixtureId === f.id);

    const pintar = () => {
      const fx = lista();
      const delDia = fx.filter(f => f.fecha === ui.sel);
      const primero = new Date(ui.y, ui.m, 1);
      const huecos = (primero.getDay() + 6) % 7;
      const dias = new Date(ui.y, ui.m + 1, 0).getDate();
      const celdas = [...Array(huecos).fill(null), ...Array.from({length: dias}, (_, i) => i + 1)];
      while (celdas.length % 7) celdas.push(null);
      const conFecha = new Set(fx.map(f => f.fecha).filter(Boolean));
      const R = motor.resumen(ctx.carrera ? partidos() : []), forma = motor.forma(ctx.carrera ? partidos() : [], 5);
      const prox = fx.find(f => f.fecha && f.fecha >= hoy && !jugado(f)) || fx.find(f => !jugado(f));
      const fila = f => {
        const p = jugado(f);
        const res = p ? `<span class="res ${resultado(p)} num">${p.gf}–${p.gc}</span>` : '<span class="meta">Por jugar</span>';
        return `<div class="jornada ${f === prox ? 'proxima' : ''}"><div class="fecha"><span class="etiqueta">${f.fecha ? `${Number(f.fecha.slice(8))} ${MESC[Number(f.fecha.slice(5, 7)) - 1]}` : 'S/F'}</span></div>
          <div class="partido">${escudo(f.rival, 'sm')}<div style="min-width:0"><div class="rival">${f.local ? 'vs' : 'en'} ${esc(f.rival.nombre)}</div><div class="meta" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="comp ${f.comp === 'ucl' ? 'ucl' : f.comp === 'copa' ? 'copa' : ''}">${esc(nombreComp(f.comp, ctx.club.liga))}</span>${f.local ? 'Local' : 'Visitante'}</div></div></div>
          <div style="display:flex;align-items:center;gap:8px">${res}${fin ? '' : `${p ? '' : `<a class="btn primario" style="min-height:36px;padding:0 12px" href="${href('partido', {...q, partido: f.id})}">Cargar</a>`}<button class="btn fantasma" data-quitar="${esc(f.id)}" style="min-height:36px;padding:0 8px" aria-label="Quitar partido">✕</button>`}</div></div>`;
      };
      el.innerHTML = banda(ctx) + (fin ? cierreCarrera(ctx.carrera) : '') + `<div class="cal-layout">
        <section>
          <div class="entre" style="margin-bottom:var(--e2)"><h2 class="h1" style="font-size:var(--t-2xl)">Calendario</h2><span class="badge neutro">${fx.length ? fx.length + (fx.length === 1 ? ' partido' : ' partidos') : 'Fixture vacío'}</span></div>
          <p class="meta" style="margin-top:0">Arranca vacío. Elegí el día, el rival, la competición y si jugás de local o de visitante. El resultado se carga después, cuando lo jugaste en la consola.</p>
          <div class="tarjeta" style="margin-top:var(--e4)">
            <div class="mes-nav"><button class="btn fantasma" type="button" data-mes="-1" aria-label="Mes anterior">←</button><b class="h3" style="margin:0">${MES[ui.m]} ${ui.y}</b><button class="btn fantasma" type="button" data-mes="1" aria-label="Mes siguiente">→</button></div>
            <div class="cal-grid">${DOW.map(d => `<div class="cal-dow">${d}</div>`).join('')}${celdas.map(d => d == null ? '<button class="cal-dia vacio" tabindex="-1" type="button"></button>' : (() => { const id = iso(ui.y, ui.m, d); return `<button type="button" class="cal-dia ${id === ui.sel ? 'sel' : ''} ${id === hoy ? 'hoy' : ''}" data-dia="${id}" aria-pressed="${id === ui.sel}" aria-label="${d} de ${MES[ui.m]}">${d}${conFecha.has(id) ? '<span class="punto"></span>' : ''}</button>`; })()).join('')}</div>
          </div>
          <h3 class="h2" style="margin:var(--e5) 0 var(--e3)">Partidos cargados</h3>
          ${fx.length ? `<div class="jornadas">${fx.map(fila).join('')}</div>` : '<p class="meta">Todavía no hay partidos. Elegí una fecha y agregá el primero.</p>'}
        </section>
        <div class="grilla" style="align-content:start">
          <section class="tarjeta"><header><h2 class="h2">${fmtFecha(ui.sel)}</h2></header>
            ${delDia.length ? delDia.map(fila).join('') : '<p class="meta" style="margin:0">No hay partido este día.</p>'}
            ${fin ? '' : `<div class="etiqueta" style="margin-top:var(--e4)">Agregar partido</div>
            <label class="campo" style="margin-top:8px"><select data-comp aria-label="Competición">${COMPS.map(c => `<option value="${c}" ${c === ui.comp ? 'selected' : ''}>${esc(nombreComp(c, ctx.club.liga))}</option>`).join('')}</select></label>
            <label class="campo" style="margin-top:8px"><select data-rival data-buscar="Buscar rival" aria-label="Rival">${todos.reduce((html, c, i, arr) => { const prev = arr[i - 1]; const abre = !prev || prev.liga !== c.liga; const cierra = !arr[i + 1] || arr[i + 1].liga !== c.liga; return html + (abre ? `<optgroup label="${esc(c.liga)}">` : '') + (c.id === ctx.club.id ? '' : `<option value="${esc(c.id)}" ${c.id === ui.rivalId ? 'selected' : ''}>${esc(c.nombre)}</option>`) + (cierra ? '</optgroup>' : ''); }, '')}</select></label>
            <div class="neg-tipos" style="margin-top:var(--e3)"><button type="button" class="chip" data-local="1" aria-pressed="${ui.local}">Local</button><button type="button" class="chip" data-local="0" aria-pressed="${!ui.local}">Visitante</button></div>
            <button class="btn primario" type="button" data-agregar style="width:100%;margin-top:var(--e3)" ${ctx.carrera ? '' : 'disabled'}>Agregar a esta fecha</button>
            ${ctx.carrera ? '' : '<p class="meta">En la vista previa no se guarda. Empezá una carrera.</p>'}`}</section>
          <section class="tarjeta"><header><h2 class="h2">Forma</h2></header>
            ${(ctx.carrera && partidos().length) ? `<div class="forma">${forma.map(r => `<span class="${r.toLowerCase()}">${r}</span>`).join('')}</div>
            <div class="grilla g3" style="margin-top:var(--e4);gap:var(--e3)"><div class="kpi"><div class="etiqueta">Puntos</div><div class="valor num">${R.pts}</div></div><div class="kpi"><div class="etiqueta">Goles</div><div class="valor num">${R.gf}–${R.gc}</div></div><div class="kpi"><div class="etiqueta">G-E-P</div><div class="valor num">${R.pg}-${R.pe}-${R.pp}</div></div></div>`
            : '<p class="meta" style="margin:0">Todavía no cargaste resultados. Agregá el partido y después el marcador.</p>'}</section>
        </div></div>`;
    };
    pintar();
    el.onchange = e => {
      if (e.target.matches('[data-comp]')) ui.comp = e.target.value;
      if (e.target.matches('[data-rival]')) ui.rivalId = e.target.value;
    };
    el.onclick = async e => {
      const b = e.target.closest('[data-mes],[data-dia],[data-local],[data-agregar],[data-quitar]'); if (!b) return;
      if (b.dataset.mes) {
        ui.m += Number(b.dataset.mes);
        if (ui.m < 0) { ui.m = 11; ui.y--; }
        if (ui.m > 11) { ui.m = 0; ui.y++; }
        pintar(); return;
      }
      if (b.dataset.dia) { ui.sel = b.dataset.dia; pintar(); return; }
      if (b.dataset.local != null) { ui.local = b.dataset.local === '1'; pintar(); return; }
      if (b.dataset.agregar != null) {
        if (!ctx.carrera || fin) return;
        try {
          ctx.carrera = actualizar(c => motor.agregarAlFixture(c, {fecha: ui.sel, comp: ui.comp, rivalId: ui.rivalId, local: ui.local}));
          aviso('Partido agregado', {tipo: 'ok'});
        } catch (err) { aviso(err.message, {tipo: 'peligro'}); return; }
        pintar(); return;
      }
      if (b.dataset.quitar) {
        if (!ctx.carrera || fin) return;
        const ok = await confirmar({titulo: 'Quitar este partido', texto: 'También se borra el resultado, si ya lo habías cargado.', si: 'Quitar', peligro: true});
        if (!ok) return;
        try { ctx.carrera = actualizar(c => motor.quitarDelFixture(c, b.dataset.quitar)); }
        catch (err) { aviso(err.message, {tipo: 'peligro'}); return; }
        pintar();
      }
    };
  }
};
