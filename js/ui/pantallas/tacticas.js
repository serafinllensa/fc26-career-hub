// Tácticas y FC IQ: once ideal con roles reales de fciq.json (EA) y charla táctica con el DT (proponerTactica / cerrarCharlaTactica).
import {aviso} from '../avisos.js';
import {cartel} from '../avisos.js';
import * as datos from '../datos.js';
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtFecha, lineaDe} from '../util.js';
import {href} from '../router.js';
import {ovr, claseOvr, onceEA, apellido, FORMAS, fueraDePosicion} from '../ea.js';
import {conCarrera, onceCarrera} from '../carrera.js';
import {actualizar} from '../carrera.js';

const XY = [[50,90],[16,70],[38,74],[62,74],[84,70],[28,48],[50,56],[72,48],[18,22],[50,15],[82,22]];
const FORMACIONES = ['4-3-3', '4-2-3-1', '4-4-2', '4-1-4-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];
const ESTILO = {'posesion': 'Posesión', 'presion-alta': 'Presión alta', 'transiciones': 'Transiciones', 'contragolpe': 'Contragolpe', 'bloque-bajo': 'Bloque bajo', 'juego-directo': 'Juego directo'};
const REAC = {acepta: 'Acepta', discute: 'Discute', resiste: 'Se resiste'};

export default {
  titulo: 'Tácticas y FC IQ',
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para armar la táctica.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const club = ctx.club;
    let [pl, fciq, dts] = await Promise.all([datos.plantilla(club.id).catch(() => ({jugadores: []})), datos.fciq().catch(() => null), datos.dts().catch(() => [])]);
    if (viejo()) return;
    pl = conCarrera(pl, ctx.carrera);
    const dt = (ctx.carrera?.dt && dts.find(d => d.id === ctx.carrera.dt.id)) || dts.find(d => d.clubActual === club.id) || null;
    const previa = !ctx.carrera;
    const car = () => ctx.carrera || motor.crearCarrera({club, dt, dificultad: 'medio', plantilla: pl.jugadores});
    let once = onceCarrera(pl.jugadores, ctx.carrera, onceEA);
    const pref = dt ? motor.preferenciasDT(dt) : null;
    const posDe = p => fciq?.posiciones.find(x => x.pos.includes(p));
    const s = {sel: once.findIndex(o => o.rol === 'DC'), formacion: dt?.formaciones?.[0] && dt.formaciones[0] !== '4-3-3' ? '4-3-3' : '3-5-2', estilo: '', charla: null, cerrada: null};
    if (s.sel < 0) s.sel = 0;
    const rolesDe = () => ctx.carrera?.roles || {};
    const rolDe = o => { const R = posDe(o.rol)?.roles || [], g = rolesDe()[o.j?.id]; const elegido = R.find(x => x.id === g?.rol) || null, r = elegido || R[0] || null; return {R, r, porDefecto: !elegido && !!r, foco: g?.foco ?? (r?.focos?.[0]?.focoEA || null)}; };

    const pintar = () => {
      const c = car(), t = c.tactica; once = onceCarrera(pl.jugadores, c, onceEA); const form = t?.formacion || '4-3-3', propio = !!c.alineacion?.[form];
      const enCancha = new Set(once.map(x => x.j).filter(Boolean)), resto = pl.jugadores.filter(j => !enCancha.has(j)).sort((a, b) => (ovr(b) ?? -1) - (ovr(a) ?? -1)), supl = resto.slice(0, 12), resv = resto.slice(12);
      const filaBanco = j => `<button class="banco-j" data-banco="${esc(j.id)}" draggable="${!previa}" ${previa ? 'disabled' : ''}><span class="pos ${lineaDe(j.pos)}">${esc(j.pos || '—')}</span><span class="nom">${esc(j.nombre)}${j.canterano ? ' <small class="meta">Cantera</small>' : ''}</span><span class="ovr-chip ${claseOvr(ovr(j)) || 'bronce'}">${ovr(j) ?? '—'}</span></button>`; if (!once[s.sel]) s.sel = 0; const o = once[s.sel], {R, r, foco, porDefecto} = rolDe(o);
      const fichas = once.map((x, i) => { if (!x.j) return ''; const info = rolDe(x), rr = info.r;
        const fu = fueraDePosicion(x.j, x.rol);
        const focoNom = rr?.focos?.find(f => f.focoEA === info.foco)?.foco || '';
        const pos = {POR:'PO', DFC:'DEF', LI:'LI', LD:'LD', CAI:'LI', CAD:'LD', MCD:'MCD', MC:'MC', MCO:'MCO', MI:'MI', MD:'MD', EI:'EI', ED:'ED', DC:'DC', SD:'DC'}[x.rol] || x.rol;
        const correr = t => { const raw = String(t || '—'); const s = esc(raw); const largo = raw.length > 15; return `<span class="fc-run${largo ? ' mueve' : ''}"><span>${s}${largo ? '   ·   ' + s : ''}</span></span>`; };
        return `<button class="ficha-cancha fc-carta ${i === s.sel ? 'on' : ''}${fu ? ' fuera' : ''}" data-sel="${i}" draggable="${!previa}" style="left:${x.x}%;top:${x.y}%" aria-label="${esc(x.j.nombre)}, ${esc(rr?.rol || x.rol)}, ${esc(pos)}"><b>${esc(apellido(x.j.nombre))}</b>${correr(rr?.rol || x.rol)}${correr(focoNom)}<small>${esc(pos)}</small></button>`; }).join('');
      const roles = R.map(x => { const on = r?.id === x.id;
        return `<button class="rol" data-rol="${esc(x.id)}" aria-pressed="${on}" ${previa ? 'disabled' : ''}><b>${esc(x.rol)}</b>${x.nuevoFC26 ? '<span class="nuevo">Nuevo FC 26</span>' : '<span></span>'}<small>${esc(x.rolEA)} (nombre oficial EA)${on && porDefecto ? ' · por defecto' : ''}</small>
          ${on ? `<div class="focos">${x.focos.map(f => `<span class="foco ${foco === f.focoEA ? 'on' : ''}" role="button" tabindex="0" data-foco="${esc(f.focoEA)}">${esc(f.foco)}${f.nuevoFC26 ? ' · nuevo' : ''}</span>`).join('')}</div>` : ''}</button>`; }).join('');
      const ch = s.charla;
      el.innerHTML = banda(ctx) + `
        ${previa ? '<p class="meta"><span class="badge neutro">Vista previa</span> Empezá una carrera para guardar roles y hablar con el DT.</p>' : ''}
        <div class="grilla tac" style="align-items:start">
          <section>
            <div class="entre" style="margin-bottom:var(--e3)"><div><div class="etiqueta">${propio ? 'Tu once' : 'Once ideal por media EA'}</div><h1 class="h1" style="font-size:var(--t-2xl)">${esc(t?.formacion || '4-3-3')}</h1></div>
              ${t ? `<span class="badge ${t.pruebaHasta ? 'alerta' : t.impuesta ? 'peligro' : 'ok'}">${t.pruebaHasta ? `A prueba hasta el partido ${t.pruebaHasta}` : t.impuesta ? 'Impuesta al DT' : 'Acordada con el DT'}</span>` : '<span class="badge neutro">Sin charla con el DT</span>'}</div>
            <div class="cancha">${fichas}</div>
            <div class="banco tarjeta" style="margin-top:var(--e4)">
              <header><h2 class="h2">Suplentes <span class="meta">${supl.length}</span></h2>${propio ? '<button class="btn fantasma" data-reset>Volver al once ideal</button>' : ''}</header>
              <p class="meta" style="margin:0 0 var(--e2)">${previa ? 'Empezá una carrera para armar tu once.' : `Elegí un jugador en la cancha y tocá uno del banco para cambiarlos${matchMedia('(hover:hover)').matches ? ', o arrastralo' : ''}. Se guarda para ${esc(form)} y lo usa la carga de resultados.`}</p>
              <div class="lista-banco">${supl.map(filaBanco).join('') || '<p class="meta">Sin suplentes.</p>'}</div>
              ${resv.length ? `<details class="reservas"><summary><span class="etiqueta">Reservas · ${resv.length}</span></summary><div class="lista-banco">${resv.map(filaBanco).join('')}</div></details>` : ''}
            </div>
            <p class="fuente" style="margin-top:var(--e3)">Once y medias de la base EA FC 26, dibujado en ${esc(FORMAS[t?.formacion] ? t.formacion : '4-3-3')}. Tocá un jugador para elegir su rol o cambiarlo. Roles y focos: ${fciq ? `${fciq.fuentes.length} fuentes de EA, consultadas el ${fmtFecha(fciq.fecha)}` : 'sin fciq.json'}.</p>
          </section>
          <section style="display:flex;flex-direction:column;gap:var(--e4)">
            ${o?.j ? `<div class="tarjeta brillo"><div class="etiqueta">Jugador elegido</div>
              <div style="display:flex;align-items:flex-end;gap:var(--e4);margin-top:var(--e3)"><div class="ovr-xl num">${ovr(o.j) ?? '—'}</div><div style="min-width:0"><div style="font:800 var(--t-md)/1 var(--f-display);color:var(--tinta-2)"><b style="color:#fff">${esc(o.rol)}</b> · ${esc(posDe(o.rol)?.posEA || '')}</div><div style="font:800 var(--t-2xl)/1 var(--f-display);text-transform:uppercase;overflow-wrap:anywhere">${esc(o.j.nombre)}</div></div></div>
              <div class="etiqueta" style="margin-top:var(--e5)">Rol FC IQ · ${R.length} disponibles</div>
              <div class="roles">${roles || '<p class="meta">Sin roles para esta posición en fciq.json.</p>'}</div>
              <div class="etiqueta" style="margin-top:var(--e4)">Familiaridad</div>
              <div class="fam"><span>Rol</span><span>Rol+</span><span style="color:var(--menta)">Rol++</span></div>
              <p class="fuente" style="margin-top:var(--e2)">En el modo carrera, los roles de la Visión del DT suben un nivel: con DT Plata hasta Rol+ y con DT Oro hasta Rol++. Las traducciones son nuestras, no las del juego.</p></div>` : ''}
            <div class="tarjeta"><header><h2 class="h2">Charla táctica${dt ? ' con ' + esc(dt.nombre) : ''}</h2>${c.relacionDT != null ? `<span class="badge neutro">Relación ${Math.round(c.relacionDT)}</span>` : ''}</header>
              ${dt ? `<div class="fila-dato"><span>Su formación</span><span>${esc(pref?.formacion || dt.formaciones?.[0] || 'Sin dato')} <small class="meta">${pref?.formacionEstimada ? 'estimada' : 'Transfermarkt'}</small></span></div>
                <div class="fila-dato"><span>Su idea de juego</span><span>${pref?.estilos?.length ? esc(pref.estilos.map(e => ESTILO[e] || e).join(' y ')) : 'Sin dato'} ${pref?.estilos?.length ? `<small class="meta">${pref.estiloEstimado ? 'estimado' : 'con fuente'}</small>` : ''}</span></div>
                <div class="etiqueta" style="margin-top:var(--e3)">Le proponés</div>
                <div class="form-sel">${FORMACIONES.map(f => `<button class="chip" data-form="${f}" aria-pressed="${f === s.formacion}">${f}</button>`).join('')}</div>
                <label class="campo" style="margin-top:var(--e3)"><select data-estilo aria-label="Estilo"><option value="">Sin estilo</option>${motor.ESTILOS.map(e => `<option value="${e}" ${e === s.estilo ? 'selected' : ''}>${ESTILO[e] || e}</option>`).join('')}</select></label>
                <button class="btn primario" data-proponer style="width:100%;margin-top:var(--e3)" ${previa ? 'disabled' : ''}>Proponerle ${esc(s.formacion)}</button>
                ${ch ? `<span class="reac ${ch.reaccion}" style="margin-top:var(--e4)">${REAC[ch.reaccion]}</span>
                  <p class="cita" style="text-align:left;max-width:none;font-size:var(--t-md);margin-top:var(--e3)">${esc(ch.texto.replace(/^[^:]+:\s*/, ''))}</p>
                  ${ch.motivos.map(m => `<p class="meta" style="margin:4px 0">· ${esc(m)}</p>`).join('')}
                  ${s.cerrada ? `<p class="badge ok" role="status" style="margin-top:var(--e3)">${esc(s.cerrada)}</p>` : `<div class="respuestas" style="margin-top:var(--e3)">${ch.respuestas.map(r => `<button class="btn ${r.id === 'probar' || r.id === 'confirmar' ? 'primario' : 'secundario'}" data-resp="${r.id}" style="width:100%;justify-content:space-between"><span>${esc(r.texto)}</span><small class="meta">${r.efectos.relacion > 0 ? '+' : '−'}${Math.abs(r.efectos.relacion)} relación</small></button>`).join('')}</div>`}` : ''}
                <p class="fuente" style="margin-top:var(--e3)">${pref?.estiloEstimado ? 'Su idea de juego es estimada: no hay una fuente que la describa, así que el Motor la asigna siempre igual para este DT.' : 'Su idea de juego sale de una fuente citada (Wikipedia, sección de estilo).'} La defiende en la charla.</p>`
              : '<p class="meta">Sin DT cargado para este club.</p>'}
            </div>
          </section>
        </div>`;
    };
    // Cambios en el once: un jugador del banco entra en el puesto i, o dos de la cancha cambian de lugar.
    const guardarOnce = ids => { const f = car().tactica?.formacion || '4-3-3'; ctx.carrera = actualizar(c => ({...c, alineacion: {...(c.alineacion || {}), [f]: ids}})); };
    const cambiar = (i, idBanco) => { const ids = once.map(x => x.j?.id || null); ids[i] = idBanco; guardarOnce(ids); };
    const permutar = (a, b) => { const ids = once.map(x => x.j?.id || null); [ids[a], ids[b]] = [ids[b], ids[a]]; guardarOnce(ids); s.sel = b; };
    el.ondragstart = e => { const f = e.target.closest('[data-sel],[data-banco]'); if (!f || previa) return; e.dataTransfer.setData('text/plain', f.dataset.sel != null ? 'c:' + f.dataset.sel : 'b:' + f.dataset.banco); e.dataTransfer.effectAllowed = 'move'; };
    el.ondragover = e => { if (e.target.closest('[data-sel]')) { e.preventDefault(); e.target.closest('[data-sel]').classList.add('soltar'); } };
    el.ondragleave = e => e.target.closest?.('[data-sel]')?.classList.remove('soltar');
    el.ondrop = e => { const d = e.target.closest('[data-sel]'); if (!d) return; e.preventDefault(); const v = e.dataTransfer.getData('text/plain'), i = Number(d.dataset.sel);
      try { if (v.startsWith('c:')) permutar(Number(v.slice(2)), i); else if (v.startsWith('b:')) { cambiar(i, v.slice(2)); s.sel = i; } } catch (err) { aviso(err.message, {tipo: 'peligro'}); return; } pintar(); };
    el.onchange = e => { if (e.target.matches('[data-estilo]')) { s.estilo = e.target.value; s.charla = null; pintar(); } };
    el.onclick = e => {
      const b = e.target.closest('[data-sel],[data-rol],[data-foco],[data-form],[data-proponer],[data-resp],[data-banco],[data-reset]'); if (!b) return;
      let decir = null;
      try {
        if (b.dataset.banco) { if (previa) return; cambiar(s.sel, b.dataset.banco); }
        else if (b.dataset.reset !== undefined) { const f = car().tactica?.formacion || '4-3-3'; ctx.carrera = actualizar(c => { const a = {...(c.alineacion || {})}; delete a[f]; return {...c, alineacion: a}; }); }
        else if (b.dataset.sel) s.sel = Number(b.dataset.sel);
        else if (b.dataset.foco && !previa) { const id = once[s.sel].j.id; ctx.carrera = actualizar(c => ({...c, roles: {...(c.roles || {}), [id]: {...(c.roles || {})[id], foco: b.dataset.foco}}})); }
        else if (b.dataset.rol && !previa) { const id = once[s.sel].j.id; ctx.carrera = actualizar(c => ({...c, roles: {...(c.roles || {}), [id]: {rol: b.dataset.rol, foco: null}}})); }
        else if (b.dataset.form) { s.formacion = b.dataset.form; s.charla = null; s.cerrada = null; }
        else if (b.dataset.proponer !== undefined && !previa) {
          s.charla = motor.proponerTactica(car(), dt, {formacion: s.formacion, estilo: s.estilo || null}); s.cerrada = null;
          decir = {cargo: 'Director técnico', quien: dt?.nombre || 'El DT', texto: String(s.charla.texto || '').replace(/^[^:]+:\s*/, '').replace(/^"|"$/g, '')};
        }
        else if (b.dataset.resp && s.charla) {
          const antes = car().relacionDT ?? 60;
          ctx.carrera = actualizar(c => motor.cerrarCharlaTactica(c, s.charla, b.dataset.resp));
          const d = Math.round((ctx.carrera.relacionDT ?? 60) - antes), t = ctx.carrera.tactica;
          s.cerrada = `${t.pruebaHasta ? `Se prueba ${t.formacion} 3 partidos.` : `Jugamos ${t.formacion}.`} Relación con el DT ${d >= 0 ? '+' : ''}${d}.`;
          decir = {cargo: 'Director técnico', quien: dt?.nombre || 'El DT', texto: s.cerrada};
        }
      } catch (err) { aviso(err.message, {tipo: 'peligro'}); return; }
      pintar();
      if (decir) cartel(decir);
    };
    pintar();
  }
};
