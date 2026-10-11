// Nueva carrera · pasos 2 (DT) y 3 (dificultad). Usa el Motor para sugerencias, objetivos y finanzas.
import * as datos from '../datos.js';
import * as motor from '../../motor/index.js';
import {href, ir} from '../router.js';
import {esc, estado, cargando} from '../util.js';
import {aplicarClub, escudo} from '../club.js';
import {empezar} from '../carrera.js';
import {estrellitas} from '../ea.js';

const cabeza = (paso, titulo, club) => `<header class="cabeza"><div class="etiqueta">Nueva carrera · Paso ${paso} de 3</div>
  <div class="fila-h" style="margin-top:8px;gap:var(--e3)">${escudo(club)}<div><h1 class="h1">${titulo}</h1><p style="margin:2px 0 0">${esc(club.nombre)} · ${esc(club.liga)}</p></div></div>
  <div class="pasos">${[1,2,3].map(i => `<span class="${i <= paso ? 'on' : ''}"></span>`).join('')}</div></header>`;

async function clubDe(params, el){
  try { const c = await datos.club(params.club); aplicarClub(c); return c; }
  catch (e) { el.innerHTML = estado('No encontramos el club', esc(e.message), 'error', `<a class="btn secundario" href="${href('nueva')}">Elegir otro</a>`); return null; }
}

const NAC = (() => { try { const d = new Intl.DisplayNames(['es'], {type: 'region'}); return c => { try { return c ? d.of(c) : ''; } catch { return ''; } }; } catch { return () => ''; } })();
const NAC_UK = {'GB-ENG': 'Inglaterra', 'GB-SCT': 'Escocia', 'GB-WLS': 'Gales', 'GB-NIR': 'Irlanda del Norte'};
const nacDe = dt => NAC_UK[dt.nacCodigo] || NAC(dt.nacCodigo) || dt.nac || 'Sin dato';
// Nombre en español de una selección ("France" -> "Francia"), usando los códigos que ya traen los DTs.
let COD = null; const paisEs = (lista, nombre) => { COD ||= new Map(lista.map(d => [d.nac, d.nacCodigo])); const c = COD.get(nombre); return (c && (NAC_UK[c] || NAC(c))) || nombre; };
const chipEstado = (dt, libre) => libre ? '<span class="chip-libre">Libre</span>' : dt.estado === 'seleccion' ? '<span class="chip-libre sel">Selección</span>' : '';
const nombreClub = (clubes, id) => clubes.find(c => c.id === id)?.nombre || null;

// Ficha de un DT dentro de la hoja "Elegir otro DT".
function fichaDT(r, clubes, club, lista){
  const dt = r.dt, dir = (dt.clubesDirigidos || []).map(id => nombreClub(clubes, id)).filter(Boolean), jug = (dt.clubesJugados || []).map(id => nombreClub(clubes, id)).filter(Boolean);
  const actual = dt.clubActual ? nombreClub(clubes, dt.clubActual) : dt.estado === 'seleccion' && dt.ultimoClubDT?.club ? `Selección de ${paisEs(lista, dt.ultimoClubDT.club)}` : null, ultimo = dt.ultimoClubDT?.club;
  const fuente = dt.fuentes?.[0]?.url;
  return `<button class="btn fantasma" data-volver-lista style="padding-left:0">← Volver a la lista</button>
    <div class="entre" style="margin:var(--e3) 0"><div><h2 class="h2" style="margin:0">${esc(dt.nombre)}</h2><p class="meta" style="margin:4px 0 0">${esc(nacDe(dt))}${dt.edad ? ` · ${esc(dt.edad)} años` : ''}</p></div>
      <span class="estrellas-dt" aria-label="Categoría ${r.categoria ?? 'sin dato'} de 5">${estrellitas(r.categoria || 0)}</span></div>
    ${chipEstado(dt, r.libre)}
    <div style="margin-top:var(--e3)">
      <div class="fila-dato"><span>${dt.estado === 'seleccion' ? 'Dirige' : actual ? 'Club actual' : 'Último club'}</span><span>${esc(actual || ultimo || 'Sin dato')}</span></div>
      <div class="fila-dato"><span>Formación preferida</span><span>${esc((dt.formaciones?.[0] || 'Sin dato').replace(/ (Attacking|Defending|Defensive|Flat|Diamond)$/i, ''))}</span></div>
      <div class="fila-dato"><span>Dirigió (5 grandes ligas)</span><span style="text-align:right">${dir.length ? esc(dir.slice(0, 4).join(', ')) + (dir.length > 4 ? ` y ${dir.length - 4} más` : '') : 'Ninguno'}</span></div>
      ${jug.length ? `<div class="fila-dato"><span>Jugó en</span><span style="text-align:right">${esc(jug.slice(0, 3).join(', '))}</span></div>` : ''}
    </div>
    ${fuente ? `<p class="fuente" style="margin-top:var(--e3)">Fuente: <a href="${esc(fuente)}" target="_blank" rel="noopener">Transfermarkt</a></p>` : ''}
    <a class="btn primario" style="width:100%;margin-top:var(--e4)" href="${href('nueva/dificultad', {club: club.id, dt: dt.id})}">Elegir a ${esc(dt.nombre)}</a>`;
}

function abrirOtroDT(lista, clubes, club){
  const s = {texto: '', libres: false, nac: '', sel: null};
  const nacs = [...new Map(lista.filter(d => d.nacCodigo || d.nac).map(d => [d.nacCodigo || d.nac, nacDe(d)])).entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  document.querySelector('.hoja-fondo')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<div class="hoja-fondo" data-cerrar><div class="hoja otro-dt" role="dialog" aria-modal="true" aria-labelledby="odt-tit"><div class="tirador" aria-hidden="true"></div><div data-cuerpo></div></div></div>`);
  const fondo = document.querySelector('.hoja-fondo'), cuerpo = fondo.querySelector('[data-cuerpo]');
  const filas = () => {
    const r = motor.buscarDTs(lista, {texto: s.texto, soloLibres: s.libres, nac: s.nac || null}, {clubes});
    return r.length ? r.slice(0, 80).map(x => { const ult = x.dt.clubActual ? nombreClub(clubes, x.dt.clubActual) : x.dt.estado === 'seleccion' && x.dt.ultimoClubDT?.club ? `Selección de ${paisEs(lista, x.dt.ultimoClubDT.club)}` : x.dt.ultimoClubDT?.club;
      return `<button class="fila-dt" data-dt="${esc(x.dt.id)}"><span class="nom"><b>${esc(x.dt.nombre)}</b><small>${esc(nacDe(x.dt))}${ult ? ` · ${esc(ult)}` : ''}</small></span>${chipEstado(x.dt, x.libre)}<span class="estrellas-dt">${estrellitas(x.categoria || 0)}</span></button>`; }).join('')
      + (r.length > 80 ? `<p class="meta" style="text-align:center">Y ${r.length - 80} más. Afiná la búsqueda.</p>` : '')
      : '<p class="meta" style="text-align:center;padding:var(--e5) 0">No hay DTs con esos filtros.</p>';
  };
  const total = () => motor.buscarDTs(lista, {texto: s.texto, soloLibres: s.libres, nac: s.nac || null}, {clubes}).length;
  const pintar = () => {
    if (s.sel) { const r = motor.buscarDTs(lista, {}, {clubes}).find(x => x.dt.id === s.sel); cuerpo.innerHTML = fichaDT(r, clubes, club, lista); return; }
    cuerpo.innerHTML = `<div class="entre" style="margin-bottom:var(--e3)"><h2 id="odt-tit" class="h2" style="margin:0">Elegir otro DT</h2><button class="btn fantasma" data-cerrar aria-label="Cerrar">✕</button></div>
      <label class="campo"><span aria-hidden="true">⌕</span><input type="search" data-q placeholder="Buscar por nombre" value="${esc(s.texto)}" autocomplete="off" aria-label="Buscar DT por nombre"></label>
      <div class="filtros-dt"><button class="chip" data-libres aria-pressed="${s.libres}">Solo libres</button>
        <label class="campo" style="flex:1;min-width:0"><select data-nac aria-label="Nacionalidad"><option value="">Todas las nacionalidades</option>${nacs.map(([k, t]) => `<option value="${esc(k)}" ${k === s.nac ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
      <p class="meta" data-total style="margin:var(--e2) 0">${total()} DTs reales · ordenados por categoría</p>
      <div class="lista-dt" data-lista>${filas()}</div>`;
    const q = cuerpo.querySelector('[data-q]');
    q.oninput = () => { s.texto = q.value; cuerpo.querySelector('[data-lista]').innerHTML = filas(); cuerpo.querySelector('[data-total]').textContent = `${total()} DTs reales · ordenados por categoría`; };
    cuerpo.querySelector('[data-nac]').onchange = e => { s.nac = e.target.value; pintar(); };
  };
  fondo.onclick = e => {
    if (e.target === fondo || e.target.closest('button[data-cerrar]')) { fondo.remove(); return; }
    const b = e.target.closest('[data-dt],[data-libres],[data-volver-lista]'); if (!b) return;
    if (b.dataset.dt) s.sel = b.dataset.dt; else if (b.dataset.libres !== undefined) s.libres = !s.libres; else s.sel = null;
    pintar(); fondo.querySelector('.hoja').scrollTop = 0;
  };
  document.addEventListener('keydown', function esc_(e){ if (e.key === 'Escape') { fondo.remove(); document.removeEventListener('keydown', esc_); } });
  pintar(); fondo.querySelector('[data-q]')?.focus({preventScroll: true});
}

export const dt = {
  titulo: 'Elegí el DT', sinNav: true,
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const club = await clubDe(params, el); if (!club || viejo()) return;
    let lista = null, motivo = '', clubes = [];
    try { [lista, clubes] = await Promise.all([datos.dts(), datos.clubes()]); } catch (e) { motivo = e.motivo || e.message; }
    if (viejo()) return;
    const sug = lista ? motor.sugerirDTs(club, lista, 5, {clubes}) : [];
    el.innerHTML = cabeza(2, 'Elegí el DT', club) + (lista
      ? `<p class="meta">Primero tu DT actual. Después, los 4 que mejor encajan con el club por nivel, vínculo e idea de juego, libres o que se puedan traer.</p>
         <div class="grilla">${sug.map(s => `<a class="tarjeta tarjeta-dt ${s.actual ? 'actual' : ''}" style="text-decoration:none;color:inherit" href="${href('nueva/dificultad', {club:club.id, dt:s.dt.id})}">
           <header><span class="h3">${esc(s.dt.nombre)}${s.actual ? ' <span class="chip-actual">DT actual</span>' : ''}</span>${s.categoria != null ? `<span class="estrellas-dt" aria-label="Categoría ${s.categoria} de 5">${estrellitas(s.categoria)}</span>` : ''}</header>
           <p class="meta" style="margin:0">${esc(nacDe(s.dt))}${(s.motivos || []).length ? ' · ' + s.motivos.map(esc).join(' · ') : s.actual ? ' · Sigue en el cargo' : ''}</p></a>`).join('')}</div>
         <div style="display:flex;justify-content:center;margin-top:var(--e5)"><button class="btn secundario" data-otro-dt style="min-width:240px">Elegir otro DT</button></div>`
      : estado('Faltan los DTs', `Todavía no se puede cargar <code>data/dts.json</code> (${esc(motivo)}). Mientras, podés seguir sin DT.`, '',
          `<a class="btn secundario" href="${href('nueva/dificultad', {club:club.id})}">Seguir sin DT</a>`))
      + `<p style="margin-top:var(--e6)"><a class="btn fantasma" href="${href('nueva')}">← Cambiar club</a></p>`;
    el.onclick = e => { if (e.target.closest('[data-otro-dt]')) abrirOtroDT(lista, clubes, club); };
  }
};

export const dificultad = {
  titulo: 'Dificultad', sinNav: true,
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const club = await clubDe(params, el); if (!club || viejo()) return;
    const tarjeta = d => {
      const obj = motor.objetivos(club, d), fin = motor.finanzas(club, d), pac = motor.paciencia(d);
      return `<button class="tarjeta" data-dif="${d}" style="text-align:left;font:inherit;color:inherit;cursor:pointer">
        <header><span class="h2">${motor.NOMBRE_DIFICULTAD[d]}</span><span class="badge neutro">Paciencia ${pac.inicial}</span></header>
        <ul style="margin:0 0 var(--e3);padding-left:18px">${obj.map(o => `<li${o.principal ? ' style="font-weight:600"' : ''}>${esc(o.texto)}</li>`).join('')}</ul>
        <div class="meta">Fichajes: ${esc(fin.texto.presupuesto)}</div><div class="meta">Tope salarial: ${esc(fin.texto.topeSalarial)}</div></button>`;
    };
    el.innerHTML = cabeza(3, 'Dificultad', club)
      + `<p class="meta">Objetivos de la temporada y límites de la directiva según el nivel del club. Los montos son estimados del Motor.</p>
         <div class="grilla g2">${motor.DIFICULTADES.map(tarjeta).join('')}</div>
         <p style="margin-top:var(--e6)"><a class="btn fantasma" href="${href('nueva/dt', {club:club.id})}">← Cambiar DT</a></p>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-dif]'); if (!b) return;
      b.disabled = true;
      Promise.all([datos.plantilla(club.id).catch(() => ({jugadores: []})), params.dt ? datos.dts().catch(() => []) : []]).then(([pl, lista]) => {
        empezar({club, dt: lista.find?.(d => d.id === params.dt) || null, dificultad: b.dataset.dif, plantilla: pl.jugadores});
        ir('panel');
      });
    });
  }
};
