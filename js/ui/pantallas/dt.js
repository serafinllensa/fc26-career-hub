// Oficina del DT: once ideal por media EA, DT real (dts.json), charlas y eventos del vestuario (Motor).
import * as datos from '../datos.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando} from '../util.js';
import {href} from '../router.js';
import {ovr, claseOvr, onceEA, apellido} from '../ea.js';
import {pestanasOficina} from '../nav.js';
import * as motor from '../../motor/index.js';
import {charla, responder, deOficina, activa} from '../carrera.js';

const XY = [[50,90],[16,70],[38,74],[62,74],[84,70],[28,48],[50,56],[72,48],[18,22],[50,15],[82,22]];
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
    const once = onceEA(pl.jugadores), conMedia = once.filter(o => o.j && ovr(o.j) != null);
    const media = conMedia.length ? Math.round(conMedia.reduce((a, o) => a + ovr(o.j), 0) / conMedia.length) : null;
    const fichas = once.map((o, i) => o.j ? `<div class="ficha-cancha" style="left:${XY[i][0]}%;top:${XY[i][1]}%"><span class="ovr-chip ${claseOvr(ovr(o.j)) || 'bronce'}">${ovr(o.j) ?? '—'}</span><span>${esc(apellido(o.j.nombre))}</span><small>${o.rol}</small></div>` : '').join('');
    const q = params.club ? {club: params.club} : undefined;
    el.innerHTML = banda(ctx) + `
      ${pestanasOficina('dt', params)}
      <div class="grilla g2" style="align-items:start">
        <section><div class="entre" style="margin-bottom:var(--e3)"><div><div class="etiqueta">Once ideal por media EA</div><h2 class="h1" style="font-size:var(--t-2xl)">4-3-3</h2></div><div style="text-align:right"><div class="etiqueta">Media del once</div><div class="ovr-xl num" style="font-size:var(--t-3xl)">${media ?? '—'}</div></div></div>
          <div class="cancha">${fichas}</div>
          <p class="fuente" style="margin-top:var(--e3)">Jugadores y medias reales (Transfermarkt y base oficial EA FC 26). ${dt?.formaciones?.[0] && dt.formaciones[0] !== '4-3-3' ? `El DT prefiere ${esc(dt.formaciones[0])}; la pizarra en esa formación llega con Tácticas.` : ''}</p></section>
        <section style="display:flex;flex-direction:column;gap:var(--e4)">
          <div class="tarjeta brillo llamada" style="width:100%;display:flex;gap:var(--e3);align-items:center"><div class="avatar" aria-hidden="true">${dt ? esc(dt.nombre.split(' ').map(w => w[0]).slice(0, 2).join('')) : 'DT'}</div><div style="flex:1;min-width:0"><div style="color:var(--ok);font-weight:600;font-size:var(--t-sm)">${esDeCarrera ? 'Tu director técnico' : dt ? 'DT actual del club' : 'Director técnico'}</div><div class="h3">${dt ? esc(dt.nombre) : 'Sin DT elegido'}</div><div class="meta">${dt ? `${esc(dt.nacCodigo || dt.nac || '')}${dt.edad ? ' · ' + dt.edad + ' años' : ''}${dt.formaciones?.length ? ' · ' + esc(dt.formaciones.join(', ')) : ''}` : 'Elegilo al empezar la carrera'}</div></div></div>
          <div class="tarjeta"><header><span class="etiqueta">Idea de juego</span>${dt?.filosofia?.length ? '' : '<span class="badge neutro">Consulta</span>'}</header>
            ${dt ? `<div class="fila-dato"><span>Formación preferida</span><span>${esc(dt.formaciones?.[0] || 'Sin dato')}</span></div>
              ${dt.filosofia?.length ? `<div class="fila-dato"><span>Filosofía</span><span>${esc(dt.filosofia.join(', '))}</span></div>` : '<p class="meta" style="margin:var(--e2) 0">La filosofía queda vacía hasta tener una fuente citable. Nada inventado.</p>'}
              <div class="fila-dato"><span>Dirigió</span><span style="text-align:right">${esc((dt.clubesDirigidos || []).map(nomClub).join(', ') || 'Ningún club de la v1')}</span></div>
              ${(dt.clubesJugados || []).length ? `<div class="fila-dato"><span>Jugó en</span><span style="text-align:right">${esc(dt.clubesJugados.map(nomClub).join(', '))}</span></div>` : ''}
              <p class="fuente" style="margin:var(--e2) 0 0">Transfermarkt · ${esc(dt.fuentes?.[0]?.fecha || '')}</p>` : '<p class="meta" style="margin:0">Sin datos del DT.</p>'}</div>
          <div class="tarjeta"><div class="entre" style="margin:0"><span class="etiqueta">Confianza del vestuario</span><b class="num" style="font:800 var(--t-2xl)/1 var(--f-display)">${vest != null ? Math.round(vest) : '—'}</b></div>
            <div class="medidor ${vest == null || vest >= 65 ? '' : vest >= 45 ? 'medio' : 'bajo'}" style="margin-top:var(--e3)"><span style="width:${vest ?? 0}%"></span></div>
            <p class="meta" style="margin:var(--e3) 0 0">${vest != null ? 'Sube con las victorias y con las respuestas que cuidan al plantel.' : 'Empezá una carrera para seguirla.'}</p></div>
          ${evDT ? `<div class="tarjeta brillo" style="border-color:var(--alerta)"><div class="etiqueta">En el vestuario</div><h3 class="h3" style="margin:4px 0">${esc(evDT.titulo)}</h3><p class="cita" style="text-align:left;margin:0 0 var(--e2)">“${esc(evDT.texto)}”</p>
            <div class="respuestas">${evDT.respuestas.map(r => `<button class="respuesta" data-ev="${esc(evDT.id)}" data-r="${esc(r.id)}" style="text-align:left"><b>“${esc(r.texto)}”</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${['vestuario', 'presidente'].filter(k => r.efectos?.[k]).map(k => `<span class="badge ${r.efectos[k] > 0 ? 'ok' : 'peligro'}">${k[0].toUpperCase() + k.slice(1)} ${r.efectos[k] > 0 ? '+' : '−'}${Math.abs(r.efectos[k])}</span>`).join('')}</div></button>`).join('')}</div></div>` : ''}
          <div class="tarjeta"><header><span class="etiqueta">Charla con el plantel</span>${c ? '' : '<span class="badge neutro">Vista previa</span>'}</header>
            <div class="charlas">${CH.map(([id, ic, t, ctxt]) => `<button class="charla ${gastada ? 'gastada' : ''}" data-charla="${id}" ${c ? '' : 'disabled'}><span class="ic" aria-hidden="true">${ic}</span><b>${t}</b><small>${gastada ? 'Ya les hablaste hace poco' : ctxt}</small></button>`).join('')}</div>
            <p class="meta" data-resultado-charla style="margin:var(--e3) 0 0">${c ? 'Hablar en cada partido le quita fuerza al mensaje.' : 'Empezá una carrera para hablar con el plantel.'}</p></div>
        </section>
      </div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-charla],[data-ev]'); if (!b || !activa()) return;
      try {
        if (b.dataset.charla) { const r = charla(b.dataset.charla); this.render(el, params, viejo).then(() => { const m = el.querySelector('[data-resultado-charla]'); if (m) m.innerHTML = `<b style="color:${r.efecto > 0 ? 'var(--ok)' : r.efecto < 0 ? 'var(--peligro)' : 'inherit'}">Vestuario ${r.efecto > 0 ? '+' : r.efecto < 0 ? '−' : '±'}${Math.abs(r.efecto)}.</b> ${esc(r.texto)}`; }); }
        else { responder(b.dataset.ev, b.dataset.r); this.render(el, params, viejo); }
      } catch (err) { alert(err.message); }
    };
  }
};
