// Oficina del presidente, formato "negociación": exigencias a la izquierda, reunión con tensión y tres respuestas a la derecha.
import {aviso} from '../avisos.js';
// Todo sale del Motor: restricciones, finanzas, paciencia, confianza, tensión y eventos.
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, est} from '../util.js';
import {href} from '../router.js';
import {activa, responder, deOficina} from '../carrera.js';
import {pestanasOficina} from '../nav.js';
import {negociacion, iniciales} from '../negociacion.js';
import {fmtM} from '../util.js';

const sig = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);
const efectos = e => ['presidente', 'vestuario', 'hinchas'].filter(k => e?.[k]).map(k => `<span class="badge ${e[k] > 0 ? 'ok' : 'peligro'}">${k[0].toUpperCase() + k.slice(1)} ${sig(e[k])}</span>`).join('');
const BANDERA = {plazo: v => `Plazo de ${v} partidos`, pideRefuerzos: () => 'Pedido de refuerzos', presupuestoExtraPct: v => `Presupuesto +${v}%`, renovaciones: () => 'Renovaciones', fin: () => 'Fin del ciclo'};
const banderas = b => Object.entries(b || {}).map(([k, v]) => BANDERA[k] ? `<span class="badge neutro">${esc(BANDERA[k](v))}</span>` : '').join('');
const color = v => v >= 65 ? 'var(--ok)' : v >= 45 ? 'var(--alerta)' : 'var(--peligro)';

// Cada restricción como etiqueta y valor (Diseño): "Altas por ventana · 3 máximo".
function partirRestriccion(r){
  const t = r.texto || '', m = t.match(/superar ([\d.,]+)\s*veces/i);
  switch (r.id) {
    case 'altas': return ['Altas por ventana', `${r.valor} máximo`];
    case 'edad-fichajes': return ['Edad de los fichajes', `Hasta ${r.valor} años`];
    case 'sueldo-max': return ['Sueldo máximo', m ? `${m[1].replace('.', ',')}× el más alto` : 'El más alto actual'];
    case 'sub21': return ['Juveniles sub-21', `${r.valor} con minutos`];
    case 'solo-ventas': return ['Presupuesto', '50% de lo que vendas'];
    case 'idolos': return ['Capitán e ídolos', 'Se venden con su OK'];
    default: return [esc(t), ''];
  }
}

export default {
  titulo: 'Oficina del presidente',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para entrar a la oficina.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const c = ctx.carrera, dif = c?.dificultad || 'medio', club = ctx.club;
    const carTmp = c || motor.crearCarrera({club, dificultad: dif, plantilla: []});
    const em = motor.estadoMercado(carTmp, club), pac = motor.paciencia(dif), rest = motor.restricciones(dif);
    const conf = c?.confianza?.presidente ?? pac.inicial, ten = motor.tension(conf);
    const evs = deOficina(c, 'presidente'), pend = evs.filter(e => !e.respondido);
    const ev = pend[pend.length - 1];
    const pasados = evs.filter(e => e.respondido).slice(-5).reverse();
    const q = params.club ? {club: params.club} : undefined;
    const N = negociacion(c?.id || 'previa');
    if (c && N.estado.auto && !ev && !c.estado?.finalizada) { try { N.pedir(c, club); } catch (err) { console.warn(err.message); } }
    const fila = (k, v, extra = '') => `<div class="fila-dato ${extra}"><span>${k}</span><span>${v}</span></div>`;
    el.innerHTML = banda(ctx) + `
      ${pestanasOficina('presidente', params)}
      ${c ? '' : '<p class="meta"><span class="badge neutro">Vista previa</span> Dificultad Medio. Las reuniones aparecen cuando cargás resultados en una carrera.</p>'}
      <div class="grilla g2" style="align-items:start">
        <section>
          <h2 class="h1" style="font-size:var(--t-xl);margin-bottom:var(--e4)">Exigencias de la directiva</h2>
          ${fila('Temporada', `${esc(c?.temporada || '2026/27')} · ${motor.NOMBRE_DIFICULTAD[dif]}`)}
          ${fila('Presupuesto disponible', `${est(em.disponibleM)}`, 'sel')}
          ${fila('Masa salarial / tope', em.masaM == null || em.topeM == null ? 'Sin estimado' : `≈ ${fmtM(em.masaM)} / ${fmtM(em.topeM)}`)}
          ${rest.map(r => fila(...partirRestriccion(r))).join('')}
          ${fila('Si fallás el objetivo principal', pac.despidoSiFallaObjetivo ? '<span style="color:var(--peligro)">Despido</span>' : 'Revisión del ciclo')}
          <div class="entre" style="margin-top:var(--e4)"><span class="badge estimado">Montos estimados</span><span class="fuente">estadoMercado del Motor: se actualiza con cada fichaje</span></div>
          <div class="tarjeta" style="margin-top:var(--e5)">
            <div class="entre" style="margin:0"><span class="etiqueta">Confianza del presidente</span><b class="num" style="font:800 var(--t-2xl)/1 var(--f-display);color:${color(conf)}">${Math.round(conf)}</b></div>
            <div class="medidor ${conf >= 65 ? '' : conf >= 45 ? 'medio' : 'bajo'}" style="margin-top:var(--e3)"><span style="width:${Math.max(2, conf)}%"></span></div>
            <p class="meta" style="margin:var(--e3) 0 0">${pac.ultimatumTrasSinGanar ? `Ultimátum a los ${pac.ultimatumTrasSinGanar} partidos sin ganar.` : 'Sin ultimátums en esta dificultad.'}${pac.techo < 100 ? ` La confianza no pasa de ${pac.techo}.` : ''}${c ? ` Vestuario ${Math.round(c.confianza.vestuario)} · Hinchas ${Math.round(c.confianza.hinchas)}.` : ''}</p>
          </div>
          ${ev || c?.estado?.finalizada ? '' : N.formulario(!c, href('mercado', q))}
        </section>
        <section style="display:flex;flex-direction:column;align-items:center;gap:var(--e4);text-align:center">
          <div class="etiqueta" style="letter-spacing:.12em">Reunión en la oficina</div>
          <div class="tarjeta brillo llamada" style="width:100%;display:flex;gap:var(--e3);align-items:center"><div class="avatar" aria-hidden="true">${esc(iniciales(club.presidente?.nombre))}</div><div style="flex:1;text-align:left"><div style="color:var(--ok);font-weight:600;font-size:var(--t-sm)">${ev || N.estado.hilo.length ? 'En reunión con' : 'Despacho de'}</div><div class="h3">${esc(club.presidente?.nombre || 'Presidente')}</div><div class="meta">${esc(club.nombre)}</div></div></div>
          <span class="tension ${ten.nivel}">${esc(ten.texto)}</span>
          ${ev ? `<h3 class="h2">${esc(ev.titulo)}</h3><p class="cita">“${esc(ev.texto)}”</p>
            <div class="respuestas" style="width:100%">${ev.respuestas.map(r => `<button class="respuesta" data-ev="${esc(ev.id)}" data-r="${esc(r.id)}" style="text-align:left"><b>“${esc(r.texto)}”</b><div class="efectos" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${efectos(r.efectos)}${banderas(r.bandera)}</div></button>`).join('')}</div>`
          : c?.estado?.finalizada ? '<p class="cita">El ciclo terminó. Podés empezar una carrera nueva desde Mis carreras.</p>' : N.charla(club.presidente?.nombre || 'Presidente')}
          ${pasados.length ? `<div class="tarjeta" style="width:100%;text-align:left"><div class="etiqueta" style="margin-bottom:var(--e2)">Reuniones anteriores</div>${pasados.map(e => `<div class="fila-dato"><span>${esc(e.titulo)}</span><span class="meta">${esc(e.respuestas.find(r => r.id === e.respondido)?.texto.slice(0, 40) || '')}…</span></div>`).join('')}</div>` : ''}
        </section>
      </div>`;
    el.onclick = e => {
      const b = e.target.closest('[data-ev],[data-tipo],[data-m],[data-pedir],[data-neg-r],[data-limpiar]'); if (!b) return;
      try {
        if (b.dataset.ev) { if (!activa()) return; responder(b.dataset.ev, b.dataset.r); }
        else if (b.dataset.tipo) N.tipo(b.dataset.tipo);
        else if (b.dataset.m) N.monto(Number(b.dataset.m));
        else if (b.dataset.pedir !== undefined && c) N.pedir(activa(), club);
        else if (b.dataset.negR && c) N.responder(b.dataset.negR);
        else if (b.dataset.limpiar !== undefined) N.limpiar();
        const enfocar = b.dataset.pedir !== undefined || b.dataset.negR;
        Promise.resolve(this.render(el, params, viejo)).then(() => { if (enfocar && innerWidth < 960) el.querySelector('.hilo')?.lastElementChild?.scrollIntoView({block: 'center', behavior: 'smooth'}); });
      } catch (err) { aviso(err.message, {tipo: 'peligro'}); }
    };
  }
};
