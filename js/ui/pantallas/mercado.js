// Mercado y finanzas: negociación con el presidente (pedirAlPresidente / cerrarNegociacion) y medidor de fair play (estadoMercado).
import * as datos from '../datos.js';
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtM, fmtContrato, est} from '../util.js';
import {href} from '../router.js';
import {ovr, claseOvr} from '../ea.js';
import {pedidoDesdeMercado, iniciales} from '../negociacion.js';
import {ir} from '../router.js';

const LCPD = {'fc-barcelona': [582.76, 'EFE'], 'real-madrid': [832.78, 'EFE']}; // dato citado por Diseño (EFE)

export default {
  titulo: 'Mercado y finanzas',
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para negociar.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const club = ctx.club, todos = await datos.clubes(); if (viejo()) return;
    const plProp = await datos.plantilla(club.id).catch(() => ({jugadores: []}));
    const previa = !ctx.carrera;
    const car = () => ctx.carrera || motor.crearCarrera({club, dificultad: 'medio', plantilla: plProp.jugadores});
    const ligaOrd = [club.liga, ...new Set(todos.map(c => c.liga).filter(l => l !== club.liga))];
    const s = {tab: 'fichaje', clubObj: null, jug: null, precio: null, monto: 20, neg: null, cerrado: null, J: []};
    const rivales = todos.filter(c => c.id !== club.id);
    s.clubObj = rivales.filter(c => c.liga === club.liga).sort((a, b) => (b.valorPlantillaM || 0) - (a.valorPlantillaM || 0))[0] || rivales[0];

    const cargarClub = async id => {
      s.clubObj = todos.find(c => c.id === id);
      s.J = (await datos.plantilla(id).catch(() => ({jugadores: []}))).jugadores.slice().sort((a, b) => (ovr(b) || 0) - (ovr(a) || 0) || (b.valorM || 0) - (a.valorM || 0));
      s.jug = s.J[0] || null; s.precio = s.jug?.valorM ? Math.round(s.jug.valorM * 1.2) : 10;
    };
    await cargarClub(s.clubObj.id); if (viejo()) return;

    const ffp = em => {
      const uso = em.usoMasa != null ? Math.round(em.usoMasa * 100) : null;
      const col = uso == null ? 'var(--tinta-2)' : uso >= 100 ? 'var(--peligro)' : uso >= 85 ? 'var(--alerta)' : 'var(--ok)';
      const l = LCPD[club.id];
      return `<section class="tarjeta" style="margin-top:var(--e6)"><header><h2 class="h2">Fair play financiero</h2><span class="badge estimado">Estimado por Motor</span></header>
        <div class="meta">Masa salarial sobre el tope que te da la directiva</div>
        ${uso == null ? '<p class="meta sin-verificar">Sin datos suficientes para estimar la masa salarial de este club.</p>' : `
        <div style="display:flex;align-items:baseline;gap:var(--e3);margin:var(--e3) 0"><b class="num" style="font:800 var(--t-3xl)/1 var(--f-display);color:${col}">${uso}%</b><span class="meta">≈ ${fmtM(em.masaM)} de ${fmtM(em.topeM)}</span></div>
        <div class="ffp" style="margin:var(--e6) 4px var(--e8)"><span class="aguja" style="left:${Math.min(uso, 100)}%"><b class="num">${uso}%</b></span><span class="marca" style="left:85%">85%<br>Alerta</span><span class="marca" style="left:99%">100%<br>Tope</span></div>`}
        <div class="fila-dato"><span>Disponible para fichar</span><span>${est(em.disponibleM)}</span></div>
        <div class="fila-dato"><span>Margen de masa salarial</span><span>${em.topeM != null && em.masaM != null ? '≈ ' + fmtM(Math.max(0, +(em.topeM - em.masaM).toFixed(1))) : 'Sin estimado'}</span></div>
        ${club.liga === 'LaLiga' ? `<div class="regla"><span class="badge info">LaLiga</span><div><b>Límite de coste de plantilla: ${l ? l[0].toLocaleString('es-AR') + ' M€' : '<span class="sin-verificar">Sin dato</span>'}</b><div class="meta">Dentro del límite fichás con la regla 1:1. Sin margen no podés inscribir.${l ? ` Fuente: ${l[1]}.` : ''}</div></div></div>` : ''}
        ${club.liga === 'Serie A' ? '<div class="regla"><span class="badge info">Serie A</span><div><b>Indicador de coste 0,7</b><div class="meta">Si te pasás, bloqueo del mercado desde Medio.</div></div></div>' : ''}
        <div class="regla"><span class="badge neutro">UEFA</span><div><b>Tope 70%</b><div class="meta">Costo de plantilla sobre ingresos. Si te pasás, multa; si te pasás mucho, menos altas en la lista.</div></div></div></section>`;
    };

    const pintar = () => {
      const c = car(), em = motor.estadoMercado(c, club), j = s.jug;
      const izq = `
          <h2 class="h1" style="font-size:var(--t-xl);margin-bottom:var(--e4)">Fichar jugador</h2>
          <label class="campo" style="margin-bottom:var(--e2)"><select data-club aria-label="Club del jugador">${ligaOrd.map(l => `<optgroup label="${esc(l)}">${rivales.filter(x => x.liga === l).map(x => `<option value="${esc(x.id)}" ${x.id === s.clubObj.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</optgroup>`).join('')}</select></label>
          <label class="campo"><select data-jug aria-label="Jugador">${s.J.map(x => `<option value="${esc(x.id)}" ${x.id === j?.id ? 'selected' : ''}>${esc(x.nombre)} · ${esc(x.pos || '')}${ovr(x) != null ? ' · ' + ovr(x) : ''}</option>`).join('')}</select></label>
          <div class="fila-dato" style="margin-top:var(--e3)"><span>Incorporación</span><span>Inmediata</span></div>
          <div class="fila-dato sel"><span>Monto del pase</span><span><button class="paso-mini" data-p="-5" aria-label="Bajar 5 M€">◂</button> ${fmtM(s.precio)} <button class="paso-mini" data-p="5" aria-label="Subir 5 M€">▸</button></span></div>
          <div class="fila-dato"><span>Valor de mercado</span><span>${fmtM(j?.valorM)}</span></div>
          <div class="fila-dato"><span>Sueldo</span><span class="meta" style="text-transform:none">Sin dato público</span></div>`;
      const ten = motor.tension(c.confianza.presidente);
      el.innerHTML = banda(ctx) + `
        ${previa ? '<p class="meta"><span class="badge neutro">Vista previa</span> Dificultad Medio y confianza inicial. Empezá una carrera para negociar de verdad.</p>' : ''}
        <div class="grilla merc" style="align-items:start">
          <section>${izq}
            <div class="resumen-pago"><div><span>Presupuesto disponible</span><b>${est(em.disponibleM)}</b></div><div><span>Tope de masa salarial</span><b>${est(em.topeM)}</b></div><span class="badge estimado" style="justify-self:start">Estimado por Motor</span></div>
            <div style="display:flex;justify-content:center;margin-top:var(--e5)"><button class="btn primario" data-pedir style="min-width:220px" ${previa || !j ? 'disabled' : ''}>Pedir el visto bueno</button></div>
            <p class="meta" style="text-align:center;margin:var(--e2) 0 0">La negociación sigue en la <a href="${href('presidente')}">oficina del presidente</a>. Ahí también pedís más presupuesto o masa salarial.</p>
            ${ffp(em)}
          </section>
          <section style="display:flex;flex-direction:column;align-items:center;gap:var(--e4);text-align:center">
            <div class="etiqueta" style="letter-spacing:.12em">Objetivo de fichaje</div>
            <div class="tarjeta brillo llamada" style="width:100%;display:flex;gap:var(--e3);align-items:center"><div class="avatar" aria-hidden="true">${esc(iniciales(club.presidente?.nombre))}</div><div style="flex:1;text-align:left"><div style="color:var(--ok);font-weight:600;font-size:var(--t-sm)">Decide el presidente</div><div class="h3">${esc(club.presidente?.nombre || 'Presidente')}</div><div class="meta">${esc(club.nombre)}${club.presidente?.perfil ? ' · perfil ' + esc(club.presidente.perfil) : ''}</div></div></div>
            <span class="tension ${ten.nivel}">${esc(ten.texto)} · confianza ${Math.round(c.confianza.presidente)}</span>
            ${s.tab === 'fichaje' && j ? `<div class="jugador-card" style="text-align:left"><span class="fondo-pos">${esc(j.ea?.posEA || j.pos || '')}</span>
              <div class="ap">${esc(j.nombre.split(' ').slice(0, -1).join(' ')) || '&nbsp;'}</div><div class="nom">${esc(j.nombre.split(' ').slice(-1)[0])}</div>
              <div class="fila-dato"><span>Edad · Pos.</span><span>${j.edad ?? '—'} · ${esc(j.pos || '—')}</span></div>
              <div class="fila-dato"><span>Media EA</span><span>${ovr(j) != null ? `<span class="ovr-chip ${claseOvr(ovr(j))}">${ovr(j)}</span>` : '<span class="sin-verificar">Sin media de EA</span>'}</span></div>
              <div class="fila-dato"><span>Club</span><span>${esc(s.clubObj.corto || s.clubObj.nombre)}</span></div>
              <div class="fila-dato" style="border:0"><span>Contrato</span><span>${fmtContrato(j.contratoHasta) || 'Sin dato'}</span></div></div>` : ''}
          </section>
        </div>`;
    };

    el.onchange = async e => {
      if (e.target.matches('[data-club]')) { await cargarClub(e.target.value); if (!viejo()) pintar(); }
      if (e.target.matches('[data-jug]')) { s.jug = s.J.find(x => x.id === e.target.value); s.precio = s.jug?.valorM ? Math.round(s.jug.valorM * 1.2) : 10; pintar(); }
    };
    el.onclick = e => {
      const b = e.target.closest('[data-p],[data-pedir]'); if (!b) return;
      if (b.dataset.p) { s.precio = Math.max(1, (s.precio || 0) + Number(b.dataset.p)); pintar(); }
      else if (b.dataset.pedir !== undefined && !previa && s.jug) {
        pedidoDesdeMercado(ctx.carrera.id, {id: s.jug.id, nombre: s.jug.nombre, edad: s.jug.edad, valorM: s.jug.valorM, sueldoM: null, club: s.clubObj.nombre}, s.precio);
        ir('presidente');
      }
    };
    pintar();
  }
};
