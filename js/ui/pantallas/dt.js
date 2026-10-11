// Oficina del DT: once ideal por media EA, DT real (dts.json), charlas y eventos del vestuario (Motor).
import {aviso, cartel, cartelSiNuevo} from '../avisos.js';
import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando} from '../util.js';
import {href} from '../router.js';
import {ovr, onceEA, apellido} from '../ea.js';
import {pestanasOficina} from '../nav.js';
import * as motor from '../../motor/index.js';
import {charla, responder, deOficina, activa, conCarrera, onceCarrera, actualizar} from '../carrera.js';
import {pedidoDesdeMercado} from '../negociacion.js';
import {ir} from '../router.js';
const ESTILO = {posesion: 'Posesión', 'presion-alta': 'Presión alta', transiciones: 'Transiciones', contragolpe: 'Contragolpe', 'bloque-bajo': 'Bloque bajo', 'juego-directo': 'Juego directo', juveniles: 'Juveniles'};

// Refuerzos que pide el DT: estado por carrera (sobrevive a los re-render) y candidatos de las 96 plantillas, cargados una sola vez.
const REF = new Map(); let CANDIDATOS = null;
async function candidatos(todos){
  if (CANDIDATOS) return CANDIDATOS;
  const ps = await Promise.all(todos.map(c => datos.plantilla(c.id).then(p => p.jugadores.map(j => ({...j, club: c.id}))).catch(() => [])));
  return (CANDIDATOS = ps.flat());
}
export default {
  titulo: 'Oficina del DT',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para entrar a la oficina.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const [lista, todos] = await Promise.all([datos.dts().catch(() => []), datos.clubes().catch(() => [])]);
    const dt = (ctx.carrera?.dt && lista.find(d => d.id === ctx.carrera.dt.id)) || lista.find(d => d.clubActual === ctx.club.id) || null;
    const esDeCarrera = !!(ctx.carrera?.dt && dt && dt.id === ctx.carrera.dt.id);
    const nomClub = id => todos.find(c => c.id === id)?.nombre || id;
    const c = ctx.carrera, vest = c?.confianza?.vestuario;
    const f3 = c ? motor.forma(c.partidos, 3) : [], malos = f3.filter(x => x === 'P').length, buenos = f3.filter(x => x === 'G').length;
    const gastada = c && c.ultimaCharla != null && c.partidos.length - c.ultimaCharla < 2;
    const CH = [
      ['motivar', '💪', 'Motivar', malos >= 2 ? 'Vienen golpeados: les sirve un empujón.' : 'Para levantar el ánimo antes del partido.'],
      ['exigir', '📣', 'Exigir', buenos >= 2 ? 'Vienen ganando: puede caer mal.' : 'Subir la exigencia y el compromiso.'],
      ['calmar', '🤝', 'Calmar', malos >= 2 ? 'Bajar la tensión después de las derrotas.' : 'Cuando hay nervios en el grupo.'],
    ];
    const evDT = deOficina(c, 'dt').filter(e => !e.respondido).slice(-1)[0];
    let pl; try { pl = await datos.plantilla(ctx.club.id); } catch (e) { el.innerHTML = banda(ctx) + estado('Sin plantilla', esc(e.message), 'error'); return; }
    if (viejo()) return;
    pl = conCarrera(pl, ctx.carrera);
    const form = ctx.carrera?.tactica?.formacion || '4-3-3';
    const once = onceCarrera(pl.jugadores, ctx.carrera, onceEA), conMedia = once.filter(o => o.j && ovr(o.j) != null);
    const media = conMedia.length ? Math.round(conMedia.reduce((a, o) => a + ovr(o.j), 0) / conMedia.length) : null;
    const posCorta = {POR:'PO', DFC:'DEF', LI:'LI', LD:'LD', CAI:'LI', CAD:'LD', MCD:'MCD', MC:'MC', MCO:'MCO', MI:'MI', MD:'MD', EI:'EI', ED:'ED', DC:'DC', SD:'DC'};
    const fichas = once.map(o => o.j ? `<div class="ficha-cancha fc-carta" style="left:${o.x}%;top:${o.y}%"><b>${esc(apellido(o.j.nombre))}</b><small>${esc(posCorta[o.rol] || o.rol)}</small></div>` : '').join('');
    const q = params.club ? {club: params.club} : undefined;
    const pref = dt ? motor.preferenciasDT(dt) : null;
    const rs = REF.get(c?.id) || {fal: null, sugs: null, charla: null, aviso: null, cargando: false}; if (c) REF.set(c.id, rs);
    const fals = c ? (motor.detectarFalencias(pl.jugadores, form).falencias || []).slice(0, 3) : [];
    const OPI = {'de-acuerdo': ['acepta', 'De acuerdo'], duda: ['contraoferta', 'Duda'], no: ['rechaza', 'No lo quiere']};
    const nomC = id => todos.find(x => x.id === id)?.nombre || id;
    const refuerzos = !c ? '' : `<div class="tarjeta"><header><span class="etiqueta">Lo que pide el DT</span>${fals.length ? `<span class="badge alerta">${fals.length} ${fals.length === 1 ? 'puesto flojo' : 'puestos flojos'}</span>` : '<span class="badge ok">Plantel completo</span>'}</header>
      ${fals.length ? fals.map((f, i) => `<button class="rol" data-fal="${i}" aria-pressed="${rs.fal === i}"><b>${esc(f.grupo)}</b><span class="meta">${'●'.repeat(f.gravedad)}${'○'.repeat(3 - f.gravedad)}</span><small>${esc(f.motivo)}</small></button>`).join('') : '<p class="meta" style="margin:0">El DT no ve puestos flojos en el once de hoy.</p>'}
      ${rs.cargando ? '<p class="meta">Buscando jugadores que encajen…</p>' : ''}
      ${rs.sugs && rs.fal != null ? `<div class="etiqueta" style="margin-top:var(--e4)">Te sugiere</div>
        ${rs.sugs.length ? rs.sugs.map(x => `<div class="fila-dato"><span style="min-width:0"><b>${esc(x.jugador.nombre)}</b> <small class="meta">${esc(x.jugador.pos || '')} · ${esc(nomC(x.jugador.club))} · ${ovr(x.jugador) ?? '—'}${x.jugador.valorM ? ' · ' + x.jugador.valorM + ' M€' : ''}</small><br><small class="meta">${(x.motivos || []).map(esc).join(' · ')}${x.estimadoEstilo ? ' (estilo estimado)' : ''}</small></span><span><button class="btn secundario" data-opinar="${esc(x.jugador.id)}" style="min-height:36px">Hablarlo</button></span></div>`).join('') : '<p class="meta">No encontró jugadores alcanzables que mejoren el puesto con la plata disponible.</p>'}
        <div class="etiqueta" style="margin-top:var(--e4)">O proponele otro</div>
        <div class="fila-h" style="gap:var(--e2);margin-top:6px"><label class="campo" style="flex:1"><select data-otro-j data-buscar="Buscá por nombre, club o puesto" aria-label="Jugador a proponer"><option value="">Elegí un jugador</option>${(CANDIDATOS || []).filter(j => j.club !== ctx.club.id).slice().sort((a, b) => (ovr(b) ?? 0) - (ovr(a) ?? 0)).slice(0, 600).map(j => `<option value="${esc(j.club + '|' + j.id)}" data-extra="${esc(`${j.pos || ''} · ${ovr(j) ?? '—'} · ${nomC(j.club)}`)}">${esc(j.nombre)}</option>`).join('')}</select></label><button class="btn secundario" data-proponer-j>Proponer</button></div>
` : ''}
      ${rs.charla ? `<div class="hilo" style="margin-top:var(--e4)"><div class="globo el"><div class="quien">${esc(dt?.nombre || 'El DT')}<span class="dec ${OPI[rs.charla.opinion]?.[0] || ''}">${OPI[rs.charla.opinion]?.[1] || esc(rs.charla.opinion)}</span></div><b>${esc(rs.charla.jugador.nombre)}</b>. ${esc(rs.charla.texto || '')}${rs.charla.motivos?.length ? `<div class="motivos">${rs.charla.motivos.map(m => `<div>${esc(m)}</div>`).join('')}</div>` : ''}</div></div>
        <div class="opc" style="margin-top:var(--e3)">${rs.charla.respuestas.map(r => { const e = r.efectos?.relacion || 0; return `<button data-ref-r="${esc(r.id)}"><span>${esc(r.texto)}</span><span class="ef" style="color:${e > 0 ? 'var(--ok)' : e < 0 ? 'var(--peligro)' : 'var(--tinta-3)'}">${r.pedirAlPresidente ? 'Va al presidente' : e ? (e > 0 ? '+' : '') + e + ' relación' : 'sin costo'}</span></button>`; }).join('')}</div>` : ''}
      ${rs.aviso ? `<p class="badge ok" role="status" style="margin-top:var(--e3);white-space:normal">${esc(rs.aviso)}</p>` : ''}
      <p class="fuente" style="margin-top:var(--e3)">Solo sugiere jugadores alcanzables: que no vengan de un club más grande ni de un rival directo y que entren en la plata disponible.</p></div>`;
    el.innerHTML = banda(ctx) + `
      ${pestanasOficina('dt', params)}
      <div class="grilla g2" style="align-items:start">
        <section><div class="entre" style="margin-bottom:var(--e3)"><div><div class="etiqueta">${c?.alineacion?.[form] ? 'Tu once' : 'Once ideal por media EA'}</div><h2 class="h1" style="font-size:var(--t-2xl)">${esc(form)}</h2></div><div style="text-align:right"><div class="etiqueta">Media del once</div><div class="ovr-xl num" style="font-size:var(--t-3xl)">${media ?? '—'}</div></div></div>
          <div class="cancha">${fichas}</div>
          <p class="fuente" style="margin-top:var(--e3)">Jugadores y medias reales (Transfermarkt y base oficial EA FC 26). El once y la formación salen de <a href="${href('tacticas', q)}">Tácticas y FC IQ</a>.</p></section>
        <section style="display:flex;flex-direction:column;gap:var(--e4)">
          <div class="tarjeta brillo llamada" style="width:100%;display:flex;gap:var(--e3);align-items:center"><div class="avatar" aria-hidden="true">${dt ? esc(dt.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')) : 'DT'}</div><div style="flex:1;min-width:0"><div style="color:var(--ok);font-weight:600;font-size:var(--t-sm)">${esDeCarrera ? 'Tu director técnico' : dt ? 'DT actual del club' : 'Director técnico'}</div><div class="h3">${dt ? esc(dt.nombre) : 'Sin DT elegido'}</div><div class="meta">${dt ? `${esc(dt.nacCodigo || dt.nac || '')}${dt.edad ? ' · ' + dt.edad + ' años' : ''}${dt.formaciones?.length ? ' · ' + esc(dt.formaciones.join(', ')) : ''}` : 'Elegilo al empezar la carrera'}</div></div></div>
          <div class="tarjeta"><header><span class="etiqueta">Idea de juego</span>${dt?.filosofia?.length ? '' : '<span class="badge neutro">Consulta</span>'}</header>
            ${dt ? `<div class="fila-dato"><span>Formación preferida</span><span>${esc(pref?.formacion || dt.formaciones?.[0] || 'Sin dato')}</span></div>
              ${pref?.estilos?.length ? `<div class="fila-dato"><span>Estilo</span><span>${esc(pref.estilos.map(x => ESTILO[x] || x).join(' y '))} <small class="meta">${pref.estiloEstimado ? 'estimado' : 'con fuente'}</small></span></div>` : '<p class="meta" style="margin:var(--e2) 0">La filosofía queda vacía hasta tener una fuente citable. Nada inventado.</p>'}
              <div class="fila-dato"><span>Dirigió</span><span style="text-align:right">${esc((dt.clubesDirigidos || []).map(nomClub).join(', ') || 'Ningún club de la v1')}</span></div>
              ${(dt.clubesJugados || []).length ? `<div class="fila-dato"><span>Jugó en</span><span style="text-align:right">${esc(dt.clubesJugados.map(nomClub).join(', '))}</span></div>` : ''}
              <p class="fuente" style="margin:var(--e2) 0 0">Transfermarkt · ${esc(dt.fuentes?.[0]?.fecha || '')}</p>` : '<p class="meta" style="margin:0">Sin datos del DT.</p>'}</div>
          <div class="tarjeta"><div class="entre" style="margin:0"><span class="etiqueta">Confianza del vestuario</span><b class="num" style="font:800 var(--t-2xl)/1 var(--f-display)">${vest != null ? Math.round(vest) : '—'}</b></div>
            <div class="medidor ${vest == null || vest >= 65 ? '' : vest >= 45 ? 'medio' : 'bajo'}" style="margin-top:var(--e3)"><span style="width:${vest ?? 0}%"></span></div>
            <p class="meta" style="margin:var(--e3) 0 0">${vest != null ? 'Sube con las victorias y con las respuestas que cuidan al plantel.' : 'Empezá una carrera para seguirla.'}${c?.rendimiento?.[c.temporada] ? ` Tiene cargado el rendimiento de ${esc(c.temporada)}: lo usa, junto con el presidente, cuando le preguntás si renovar.` : ''}</p></div>
          ${evDT ? `<div class="tarjeta brillo" style="border-color:var(--alerta)"><div class="etiqueta">En el vestuario</div><h3 class="h3" style="margin:4px 0">${esc(evDT.titulo)}</h3><p class="cita" style="text-align:left;margin:0 0 var(--e2)">“${esc(evDT.texto)}”</p>
            <div class="respuestas">${evDT.respuestas.map(r => `<button class="respuesta" data-ev="${esc(evDT.id)}" data-r="${esc(r.id)}" style="text-align:left"><b>“${esc(r.texto)}”</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${['vestuario', 'presidente'].filter(k => r.efectos?.[k]).map(k => `<span class="badge ${r.efectos[k] > 0 ? 'ok' : 'peligro'}">${k[0].toUpperCase() + k.slice(1)} ${r.efectos[k] > 0 ? '+' : '−'}${Math.abs(r.efectos[k])}</span>`).join('')}</div></button>`).join('')}</div></div>` : ''}
          ${refuerzos}
          <div class="tarjeta"><header><span class="etiqueta">Charla con el plantel</span>${c ? '' : '<span class="badge neutro">Vista previa</span>'}</header>
            <div class="charlas">${CH.map(([id, ic, t, ctxt]) => `<button class="charla ${gastada ? 'gastada' : ''}" data-charla="${id}" ${c ? '' : 'disabled'}><span class="ic" aria-hidden="true">${ic}</span><b>${t}</b><small>${gastada ? 'Ya les hablaste hace poco' : ctxt}</small></button>`).join('')}</div>
            <p class="meta" data-resultado-charla style="margin:var(--e3) 0 0">${c ? 'Hablar en cada partido le quita fuerza al mensaje.' : 'Empezá una carrera para hablar con el plantel.'}</p></div>
        </section>
      </div>`;
    el.onclick = async e => {
      const b = e.target.closest('[data-charla],[data-ev],[data-fal],[data-opinar],[data-proponer-j],[data-ref-r]'); if (!b || !activa()) return;
      const otra = () => this.render(el, params, viejo);
      try {
        if (b.dataset.fal != null) { rs.fal = Number(b.dataset.fal); rs.sugs = null; rs.charla = null; rs.aviso = null; rs.cargando = true; otra();
          candidatos(todos).then(cand => { const cc = activa(); const em = motor.estadoMercado(cc, ctx.club); const f = motor.detectarFalencias(pl.jugadores, form);
            rs.sugs = motor.sugerirRefuerzos(cc, dt, f.falencias[rs.fal], cand, {disponibleM: em.disponibleM, clubes: todos, promedioOnce: f.promedioOnce}); rs.cargando = false; otra(); }); return; }
        if (b.dataset.opinar || b.dataset.proponerJ !== undefined) {
          let j = null;
          if (b.dataset.opinar) j = rs.sugs.find(x => x.jugador.id === b.dataset.opinar)?.jugador;
          else { const v = el.querySelector('[data-otro-j]').value; j = (CANDIDATOS || []).find(x => `${x.club}|${x.id}` === v); if (!j) { aviso('Elegí un jugador de la lista.', {tipo: 'alerta'}); return; } }
          const f = motor.detectarFalencias(pl.jugadores, form).falencias[rs.fal];
          rs.charla = {...motor.opinarJugador(activa(), dt, f, j, {clubes: todos}), jugador: j}; rs.aviso = null;
          const tono = rs.charla.opinion === 'no' ? 'peligro' : rs.charla.opinion === 'de-acuerdo' ? 'ok' : 'alerta';
          await cartel({cargo: 'Director técnico', quien: dt?.nombre || 'El DT', texto: `${rs.charla.jugador.nombre}. ${rs.charla.texto || ''}`, tono});
          otra(); return;
        }
        if (b.dataset.refR && rs.charla) {
          const ch = rs.charla, r = motor.responderRefuerzo(activa(), ch, b.dataset.refR); actualizar(() => r.carrera); rs.charla = null;
          if (r.pedirAlPresidente) { const j = ch.jugador; pedidoDesdeMercado(activa().id, {id: j.id, nombre: j.nombre, edad: j.edad, valorM: j.valorM, sueldoM: null, club: nomC(j.club), respaldoDT: !!r.respaldoDT}, Math.max(1, Math.round((j.valorM || 10) * 1.1))); ir('presidente'); return; }
          rs.aviso = b.dataset.refR === 'otra' ? 'Proponele otro jugador.' : b.dataset.refR === 'ceder' ? 'Buscamos otro perfil.' : 'Listo.'; otra(); return;
        }
        if (b.dataset.charla) { const r = charla(b.dataset.charla); await cartel({cargo: 'Director técnico', quien: dt?.nombre || 'El DT', texto: r.texto, tono: r.efecto < 0 ? 'no' : 'renovar'}); this.render(el, params, viejo); }
        else { responder(b.dataset.ev, b.dataset.r); this.render(el, params, viejo); }
      } catch (err) { aviso(err.message, {tipo: 'peligro'}); }
    };
    if (evDT) cartelSiNuevo('dt-' + evDT.id, {cargo: 'Director técnico', quien: dt?.nombre || 'El DT', texto: evDT.texto, tono: 'alerta'});
  }
};
