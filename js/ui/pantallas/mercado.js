// Mercado y finanzas: negociación con el presidente (pedirAlPresidente / cerrarNegociacion) y medidor de fair play (estadoMercado).
import {conCarrera, actualizar} from '../carrera.js';
import * as datos from '../datos.js';
import * as motor from '../../motor/index.js';
import {contextoClub, banda} from '../contexto.js';
import {esc, estado, cargando, fmtM, fmtContrato, est} from '../util.js';
import {href} from '../router.js';
import {ovr, claseOvr} from '../ea.js';
import {pedidoDesdeMercado, iniciales} from '../negociacion.js';
import {ir} from '../router.js';
import {aviso, confirmar} from '../avisos.js';

const LCPD = {'fc-barcelona': [582.76, 'EFE'], 'real-madrid': [832.78, 'EFE']}; // dato citado por Diseño (EFE)

export default {
  titulo: 'Mercado y finanzas',
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para negociar.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    const club = ctx.club, todos = await datos.clubes(); if (viejo()) return;
    const plBase = await datos.plantilla(club.id).catch(() => ({jugadores: []}));
    let plProp = conCarrera(plBase, ctx.carrera);
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

    const pintarBase = () => {
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
    // ---- Finanzas del juego, salidas y cantera (tanda 2) ----
    const sx = {tab: 'fichar', editFin: false, sal: {id: null, tipo: 'venta', precio: null, meses: 12}, prop: null, aviso: null, cierre: null, otro: false};
    const sueldoDe = j => j.sueldoM ?? +Math.max(0.5, (j.valorM || 0) * 0.1).toFixed(1);
    const POS = ['POR', 'DFC', 'LI', 'LD', 'MCD', 'MC', 'MCO', 'MI', 'MD', 'EI', 'ED', 'DC'];
    const num = sel => { const v = el.querySelector(sel)?.value; const n = v === '' || v == null ? NaN : Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
    const extra = () => {
      const c = car(); plProp = conCarrera(plBase, c);
      const em = motor.estadoMercado(c, club), fj = c.finanzasJuego, fp = motor.evaluarFairPlay(c, club, em);
      const mios = plProp.jugadores.slice().sort((a, b) => (ovr(b) ?? -1) - (ovr(a) ?? -1));
      const jsal = mios.find(j => j.id === sx.sal.id) || mios[0]; if (jsal && sx.sal.id !== jsal.id) { sx.sal.id = jsal.id; sx.sal.precio = jsal.valorM ? Math.round(jsal.valorM) : 5; }
      const trans = c.transferibles?.[jsal?.id];
      const pr = sx.prop, DECP = {acepta: ['acepta', 'Acepta'], condiciona: ['contraoferta', 'Con condiciones'], rechaza: ['rechaza', 'Rechaza']}, OPDT = {'de-acuerdo': ['acepta', 'De acuerdo'], duda: ['contraoferta', 'Duda'], 'en-contra': ['rechaza', 'En contra']};
      const salidas = (c.salidas || []).slice().reverse(), cant = (c.cantera || []);
      const finForm = `<div class="grilla g2" style="margin-top:var(--e3)">
          <div><div class="etiqueta">Presupuesto de fichajes del juego (M€)</div><label class="campo" style="margin-top:6px"><input type="number" inputmode="decimal" min="0" step="0.1" data-fj-pres value="${fj?.presupuestoJuegoM ?? ''}" placeholder="Ej. 85"></label></div>
          <div><div class="etiqueta">Masa salarial del juego</div><div class="fila-h" style="margin-top:6px;gap:var(--e2)"><label class="campo" style="flex:1"><input type="number" inputmode="decimal" min="0" step="0.1" data-fj-masa value="${fj?.masaJuegoM ?? ''}" placeholder="Ej. 320"></label>
            <label class="campo" style="flex:none"><select data-fj-unidad aria-label="Unidad"><option value="anual">M€ por año</option><option value="semanal">mil € por semana</option></select></label></div></div>
          <div><div class="etiqueta">Salud económica del club</div><label class="campo" style="margin-top:6px"><select data-fj-salud aria-label="Salud económica"><option value="">Según los datos (${esc(motor.saludClub ? (motor.saludClub(club).salud || 'neutral') : 'neutral')})</option><option value="sana" ${fj?.salud?.salud === 'sana' && fj?.salud?.fuente === 'elegida por el jugador' ? 'selected' : ''}>Sana</option><option value="ajustada" ${fj?.salud?.salud === 'ajustada' && fj?.salud?.fuente === 'elegida por el jugador' ? 'selected' : ''}>Ajustada</option><option value="crisis" ${fj?.salud?.salud === 'crisis' && fj?.salud?.fuente === 'elegida por el jugador' ? 'selected' : ''}>En crisis</option></select></label></div>
          <div style="display:flex;align-items:flex-end;gap:var(--e2)"><button class="btn primario" data-fj-guardar style="flex:1">Aplicar a la carrera</button>${fj ? '<button class="btn secundario" data-fj-cancelar>Cancelar</button>' : ''}</div></div>`;
      return `<section class="tarjeta" data-fin style="margin-top:var(--e6)"><header><h2 class="h2">Finanzas de tu modo carrera</h2><span class="badge ${fj ? 'ok' : 'estimado'}">${fj ? 'Cargadas del juego' : 'Estimado por Motor'}</span></header>
          ${fj && !sx.editFin ? `<div class="fila-dato"><span>Presupuesto del juego</span><span>${fmtM(fj.presupuestoJuegoM)}</span></div><div class="fila-dato"><span>Masa salarial del juego</span><span>${fmtM(fj.masaJuegoM)} por año</span></div>
            <div class="fila-dato sel"><span>Te da la directiva</span><span>${fmtM(fj.presupuestoM)} · tope ${fmtM(fj.topeM)}</span></div>
            ${(fj.explicacion || []).map(t => `<p class="meta" style="margin:4px 0">· ${esc(t)}</p>`).join('')}
            ${fj.salud?.salud ? `<p class="meta" style="margin:4px 0">· Salud ${esc(fj.salud.salud)} (${esc(fj.salud.nota || fj.salud.fuente || '')})</p>` : ''}
            <button class="btn secundario" data-fj-editar style="margin-top:var(--e3)">Editar</button>`
          : `<p class="meta" style="margin:0">${fj ? 'Corregí los números que te muestra el juego.' : 'EA pone sueldos más bajos que los reales. Cargá el presupuesto y la masa salarial que te muestra tu modo carrera, y los límites, las exigencias y las multas salen de esos números, de la dificultad y de la salud del club.'}</p>${previa ? '' : finForm}`}
          <div class="entre" style="margin-top:var(--e5);align-items:center"><div><div class="etiqueta">Fair play al cierre de la ventana</div><p style="margin:6px 0 0"><span class="reac ${fp.estado === 'ok' ? 'acepta' : fp.estado === 'aviso' ? 'contraoferta' : fp.estado === 'excedido' ? 'rechaza' : ''}">${esc({ok: 'En regla', aviso: 'Al límite', excedido: 'Excedido', 'sin-dato': 'Sin dato'}[fp.estado] || fp.estado)}</span> <span class="meta">${esc(fp.texto || '')}</span></p>
            ${fp.sancion ? `<p class="meta" style="margin:6px 0 0;color:var(--peligro)">Si cerrás así: ${esc(typeof fp.sancion === 'string' ? fp.sancion : fp.sancion.texto || JSON.stringify(fp.sancion))}</p>` : ''}</div>
            <button class="btn secundario" data-cierre ${previa ? 'disabled' : ''}>Cerrar ventana de pases</button></div>
          ${sx.cierre ? `<p class="badge ${sx.cierre.ok ? 'ok' : 'peligro'}" role="status" style="margin-top:var(--e3);white-space:normal">${esc(sx.cierre.texto)}</p>` : ''}
        </section>
        <div data-salcant style="margin-top:var(--e6)">
        <section class="tarjeta" data-tab="salidas"><header><h2 class="h2">Vender o ceder</h2>${trans ? `<span class="badge alerta">${trans === 'cesion' || trans?.tipo === 'cesion' ? 'Para ceder' : 'En venta'}</span>` : ''}</header>
          ${previa ? '<p class="meta">Empezá una carrera para manejar las salidas.</p>' : `
          <label class="campo"><select data-sal-jug data-buscar="Buscá en tu plantel" aria-label="Jugador del plantel">${mios.map(j => `<option value="${esc(j.id)}" data-extra="${esc(`${j.pos || ''}${ovr(j) != null ? ' · ' + ovr(j) : ''}${j.valorM ? ' · ' + fmtM(j.valorM) : ''}`)}" ${j.id === jsal?.id ? 'selected' : ''}>${esc(j.nombre)}</option>`).join('')}</select></label>
          ${jsal ? `<p class="meta" style="margin:6px 0 0">Sueldo ${jsal.sueldoM != null ? fmtM(jsal.sueldoM) : `estimado ≈ ${fmtM(sueldoDe(jsal))}`} por año: es lo que libera de la masa salarial si se va.</p>` : ''}
          <div class="neg-tipos" style="margin-top:var(--e3)"><button class="chip" data-sal-tipo="venta" aria-pressed="${sx.sal.tipo === 'venta'}">Venta</button><button class="chip" data-sal-tipo="cesion" aria-pressed="${sx.sal.tipo === 'cesion'}">Cesión</button></div>
          ${sx.sal.tipo === 'venta' ? `<div class="monto"><button data-sal-p="-1" aria-label="Menos 1 M€">−</button><b class="num">${fmtM(sx.sal.precio)}</b><button data-sal-p="1" aria-label="Más 1 M€">+</button></div>` : ''}
          <button class="btn primario" data-sal-proponer style="width:100%;margin-top:var(--e3)">Proponérselo al presidente</button>
          ${pr ? `<div class="hilo" style="margin-top:var(--e4)">
            <div class="globo el"><div class="quien">${esc(club.presidente?.nombre || 'Presidente')}<span class="dec ${DECP[pr.presidente.decision]?.[0] || ''}">${DECP[pr.presidente.decision]?.[1] || esc(pr.presidente.decision)}</span></div>${esc(pr.presidente.texto)}${pr.presidente.motivos?.length ? `<div class="motivos">${pr.presidente.motivos.map(m => `<div>${esc(m)}</div>`).join('')}</div>` : ''}${pr.precioMinimoM ? `<div class="motivos"><div>No menos de ${fmtM(pr.precioMinimoM)}</div></div>` : ''}</div>
            <div class="globo el"><div class="quien">${esc(c.dt?.nombre || 'El DT')}<span class="dec ${OPDT[pr.dt.opinion]?.[0] || ''}">${OPDT[pr.dt.opinion]?.[1] || esc(pr.dt.opinion)}</span></div>${(pr.dt.motivos || []).map(esc).join('. ')}</div></div>
            <div class="opc" style="margin-top:var(--e3)">${pr.respuestas.map(r => { const e = r.efectos?.presidente || 0; return `<button data-sal-r="${esc(r.id)}"><span>${esc(r.texto)}</span><span class="ef" style="color:${e > 0 ? 'var(--ok)' : e < 0 ? 'var(--peligro)' : 'var(--tinta-3)'}">${e ? (e > 0 ? '+' : '') + e + ' conf.' : 'sin costo'}</span></button>`; }).join('')}</div>` : ''}
          ${sx.aviso ? `<p class="badge ok" role="status" style="margin-top:var(--e3);white-space:normal">${esc(sx.aviso)}</p>` : ''}
          <div class="etiqueta" style="margin-top:var(--e5)">Llegó la oferta en el juego</div>
          <p class="meta" style="margin:4px 0 var(--e2)">Cargá adónde fue ${esc(jsal?.nombre || 'el jugador')} y por cuánto${sx.sal.tipo === 'cesion' ? ', o por cuántos meses' : ''}.</p>
          <label class="campo"><select data-of-club data-buscar="Buscá el club de destino" aria-label="Club de destino"><option value="">Elegí el club de destino</option>${ligaOrd.map(l => `<optgroup label="${esc(l)}">${rivales.filter(x => x.liga === l).map(x => `<option value="${esc(x.nombre)}" ${sx.destino === x.nombre ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</optgroup>`).join('')}<optgroup label="Otro"><option value="__otro" ${sx.otro ? 'selected' : ''}>Otro club (fuera de las 5 ligas)</option></optgroup></select></label>
          ${sx.otro ? '<label class="campo" style="margin-top:var(--e2)"><input data-of-otro placeholder="Nombre del club" autocomplete="off"></label>' : ''}
          ${trans?.precioMinimoM && sx.sal.tipo === 'venta' ? `<p class="meta" style="margin:6px 0 0">${esc(club.presidente?.nombre || 'El presidente')} pidió no menos de ${fmtM(trans.precioMinimoM)}.</p>` : ''}
          <div class="fila-h" style="margin-top:var(--e2);gap:var(--e2)">${sx.sal.tipo === 'venta' ? `<label class="campo" style="flex:1"><input type="number" inputmode="decimal" min="0" step="0.5" data-of-precio placeholder="Precio (M€)" value="${sx.sal.precio ?? ''}"></label>`
            : `<div class="neg-tipos" style="flex:none;margin:0">${[6, 12, 18].map(m => `<button class="chip" data-of-m="${m}" aria-pressed="${sx.sal.meses === m}">${m} meses</button>`).join('')}</div><label class="campo" style="flex:1"><input type="number" inputmode="decimal" min="0" step="0.5" data-of-opcion placeholder="Opción de compra (M€)"></label>`}</div>
          <button class="btn secundario" data-of-registrar style="width:100%;margin-top:var(--e3)">Registrar ${sx.sal.tipo === 'venta' ? 'la venta' : 'la cesión'}</button>`}
          ${salidas.length ? `<div class="etiqueta" style="margin-top:var(--e5)">Salidas de la temporada</div>${salidas.map(x => `<div class="fila-dato"><span>${esc(x.nombre)} <small class="meta">${x.tipo === 'venta' ? 'vendido' : x.devuelto ? 'volvió de cesión' : 'cedido'} a ${esc(x.clubDestino)}</small></span><span>${x.tipo === 'venta' ? fmtM(x.precioM) : `${x.meses} meses`}${x.tipo === 'cesion' && !x.devuelto ? ` <button class="btn fantasma" data-vuelve="${esc(x.jugadorId)}" style="min-height:32px;padding:0 10px">Volvió</button>` : ''}</span></div>`).join('')}` : ''}
        </section>
        <section class="tarjeta" data-tab="cantera"><header><h2 class="h2">Subir de la cantera</h2>${cant.length ? `<span class="badge neutro">${cant.length} en el plantel</span>` : ''}</header>
          ${previa ? '<p class="meta">Empezá una carrera para subir juveniles.</p>' : `
          <p class="meta" style="margin:0 0 var(--e3)">Cargá al juvenil que subiste en el juego. Entra al plantel, a la plantilla y al banco de Tácticas.${(club.identidad || []).some?.(x => /cantera|masia|juvenil/i.test(x)) ? ' Este club vive de su cantera: el presidente y los hinchas lo valoran.' : ''}</p>
          <label class="campo"><input data-cj-nombre placeholder="Nombre y apellido" autocomplete="off"></label>
          <div class="fila-h" style="margin-top:var(--e2);gap:var(--e2)"><label class="campo" style="flex:1"><select data-cj-pos aria-label="Posición">${POS.map(x => `<option>${x}</option>`).join('')}</select></label><label class="campo" style="flex:1"><input type="number" min="15" max="21" data-cj-edad placeholder="Edad" value="17"></label></div>
          <div class="fila-h" style="margin-top:var(--e2);gap:var(--e2)"><label class="campo" style="flex:1"><input type="number" min="40" max="99" data-cj-ovr placeholder="Media"></label><label class="campo" style="flex:1"><input type="number" min="40" max="99" data-cj-pot placeholder="Potencial"></label></div>
          <button class="btn primario" data-cj-subir style="width:100%;margin-top:var(--e3)">Subir al primer equipo</button>`}
          ${cant.length ? `<div style="margin-top:var(--e4)">${cant.map(x => `<div class="fila-dato"><span>${esc(x.nombre)} <small class="meta">${esc(x.pos)} · ${x.edad} años</small></span><span>${x.ovr ?? '—'}${x.pot ? ` <small class="meta">pot. ${x.pot}</small>` : ''}</span></div>`).join('')}</div>` : ''}
        </section></div>`;
    };
    const SEG = [['fichar', 'Fichar'], ['salidas', 'Salidas'], ['cantera', 'Cantera']];
    const pintar = () => {
      pintarBase(); el.insertAdjacentHTML('beforeend', extra());
      const t = sx.tab, grid = el.querySelector('.grilla.merc');
      grid.insertAdjacentHTML('beforebegin', `<nav class="segmento" aria-label="Secciones del mercado">${SEG.map(([k, n]) => `<a href="#" data-seg="${k}" ${k === t ? 'aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`);
      if (t !== 'fichar') grid.remove();
      if (t === 'cantera') el.querySelector('[data-fin]')?.remove();
      el.querySelectorAll('[data-salcant] [data-tab]').forEach(x => { if (x.dataset.tab !== t) x.remove(); });
      if (t === 'fichar') el.querySelector('[data-salcant]')?.remove();
      else { const fin = el.querySelector('[data-fin]'), sc = el.querySelector('[data-salcant]'); if (fin && sc) { sc.after(fin); } }
    };
    const SEL_EXTRA = '[data-seg],[data-fj-editar],[data-fj-cancelar],[data-fj-guardar],[data-cierre],[data-sal-tipo],[data-sal-p],[data-sal-proponer],[data-sal-r],[data-of-registrar],[data-of-m],[data-vuelve],[data-cj-subir]';
    const manejarExtra = async e => {
      const b = e.target.closest(SEL_EXTRA); if (!b) return false; if (b.dataset.seg) { e.preventDefault(); sx.tab = b.dataset.seg; pintar(); return true; }
      if (previa) return true;
      const c = car(), jsal = plProp.jugadores.find(j => j.id === sx.sal.id);
      try {
        if (b.dataset.fjEditar !== undefined) sx.editFin = true;
        else if (b.dataset.fjCancelar !== undefined) sx.editFin = false;
        else if (b.dataset.fjGuardar !== undefined) {
          const pres = num('[data-fj-pres]'), masa0 = num('[data-fj-masa]'), uni = el.querySelector('[data-fj-unidad]')?.value, salud = el.querySelector('[data-fj-salud]')?.value || undefined;
          if (pres == null || masa0 == null) { aviso('Cargá el presupuesto y la masa salarial que te muestra el juego.', {tipo: 'alerta'}); return true; }
          const masa = uni === 'semanal' ? motor.semanalAAnualM(masa0) : masa0;
          ctx.carrera = actualizar(x => motor.configurarFinanzas(x, club, {masaJuegoM: masa, presupuestoJuegoM: pres, ...(salud ? {salud} : {})})); sx.editFin = false;
        }
        else if (b.dataset.cierre !== undefined) {
          if (!await confirmar({titulo: '¿Cerrar la ventana de pases?', texto: 'Se aplica la sanción de fair play si corresponde y se reinician las altas.', si: 'Cerrar la ventana'})) return true;
          let fp; ctx.carrera = actualizar(x => { const r = motor.cierreDeVentana(x, club, motor.estadoMercado(x, club)); fp = r.fairPlay; return r.carrera; });
          sx.cierre = {ok: !fp?.sancion, texto: `Ventana cerrada. ${fp?.texto || ''}${fp?.sancion ? ' · ' + (typeof fp.sancion === 'string' ? fp.sancion : fp.sancion.texto || '') : ''}`};
        }
        else if (b.dataset.ofM) { sx.sal.meses = Number(b.dataset.ofM); }
        else if (b.dataset.salTipo) { sx.sal.tipo = b.dataset.salTipo; sx.prop = null; }
        else if (b.dataset.salP) { sx.sal.precio = Math.max(0, (sx.sal.precio || 0) + Number(b.dataset.salP)); sx.prop = null; }
        else if (b.dataset.salProponer !== undefined && jsal) { sx.prop = sx.ultProp = motor.proponerSalida(c, club, {tipo: sx.sal.tipo, jugador: jsal, precioPedidoM: sx.sal.tipo === 'venta' ? sx.sal.precio : undefined, plantilla: plProp.jugadores}); sx.aviso = null; }
        else if (b.dataset.salR && sx.prop) { const pr = sx.prop, r = pr.respuestas.find(x => x.id === b.dataset.salR); ctx.carrera = actualizar(x => motor.responderSalida(x, pr, b.dataset.salR)); sx.prop = null;
          sx.aviso = b.dataset.salR === 'otra' ? 'Proponé otra cosa: cambiá el precio, el tipo o el jugador.' : b.dataset.salR === 'dejar' ? 'Lo dejamos así.' : ctx.carrera.transferibles?.[jsal.id] ? `${jsal.nombre} queda ${sx.sal.tipo === 'venta' ? 'en venta' : 'para ceder'}. Cuando llegue la oferta en el juego, cargala abajo.` : (r?.texto || 'Listo.'); }
        else if (b.dataset.ofRegistrar !== undefined && jsal) {
          const sv = el.querySelector('[data-of-club]')?.value, destino = (sv === '__otro' ? el.querySelector('[data-of-otro]')?.value : sv)?.trim(); if (!destino) { aviso('Elegí el club de destino.', {tipo: 'alerta'}); return true; }
          const d = sx.sal.tipo === 'venta' ? {precioM: num('[data-of-precio]')} : {meses: sx.sal.meses, opcionCompraM: num('[data-of-opcion]') ?? undefined};
          if (sx.sal.tipo === 'venta' && d.precioM == null) { aviso('Cargá el precio de la venta.', {tipo: 'alerta'}); return true; }
          const minimo = c.transferibles?.[jsal.id]?.precioMinimoM ?? (sx.ultProp?.jugador.id === jsal.id ? sx.ultProp.precioMinimoM : null);
          const ctl = motor.controlarSalida ? motor.controlarSalida(c, {tipo: sx.sal.tipo, jugador: {id: jsal.id, nombre: jsal.nombre, valorM: jsal.valorM, sueldoM: jsal.sueldoM}, precioM: d.precioM}) : null;
          const bajo = ctl ? !!ctl.bajoMinimo : sx.sal.tipo === 'venta' && minimo != null && d.precioM < minimo;
          const ok = await confirmar(bajo
            ? {titulo: 'Por debajo de lo que pidió el presidente', texto: ctl?.avisos?.length ? ctl.avisos.join(' ') : `${club.presidente?.nombre || 'El presidente'} dijo no menos de ${fmtM(minimo)} y vas a registrar ${fmtM(d.precioM)}. Le va a costar confianza.`, si: 'Registrar igual', peligro: true}
            : {titulo: `¿Registrar ${sx.sal.tipo === 'venta' ? 'la venta' : 'la cesión'}?`, texto: `${jsal.nombre} a ${destino}${sx.sal.tipo === 'venta' ? ` por ${fmtM(d.precioM)}` : ` por ${d.meses} meses`}. Sale del plantel.`, si: 'Registrar'});
          if (!ok) return true;
          ctx.carrera = actualizar(x => motor.registrarSalida(x, {tipo: sx.sal.tipo, jugador: {id: jsal.id, nombre: jsal.nombre, sueldoM: sueldoDe(jsal), sueldoEstimado: jsal.sueldoM == null}, clubDestino: destino, ...d, ...(minimo != null ? {precioMinimoM: minimo} : {})}));
          aviso(`${jsal.nombre} ${sx.sal.tipo === 'venta' ? 'vendido' : 'cedido'}. Libera ≈ ${fmtM(ctx.carrera.salidas.at(-1)?.liberaM ?? 0)} de masa salarial.`, {tipo: 'ok'}); sx.otro = false; sx.destino = null;
          sx.aviso = `${jsal.nombre} ${sx.sal.tipo === 'venta' ? `vendido a ${destino} por ${fmtM(d.precioM)}` : `cedido a ${destino} por ${d.meses} meses`}.`; sx.sal.id = null; sx.prop = null;
        }
        else if (b.dataset.vuelve) { ctx.carrera = actualizar(x => motor.volverDeCesion(x, b.dataset.vuelve, {})); sx.aviso = 'Volvió al plantel.'; }
        else if (b.dataset.cjSubir !== undefined) {
          const nombre = el.querySelector('[data-cj-nombre]')?.value.trim(); if (!nombre) { aviso('Cargá el nombre del juvenil.', {tipo: 'alerta'}); return true; }
          ctx.carrera = actualizar(x => motor.registrarJuvenil(x, {nombre, pos: el.querySelector('[data-cj-pos]').value, edad: num('[data-cj-edad]') ?? 17, ovr: num('[data-cj-ovr]') ?? undefined, pot: num('[data-cj-pot]') ?? undefined}, {identidad: club.identidad}));
        }
      } catch (err) { aviso(err.message, {tipo: 'peligro'}); return true; }
      pintar(); return true;
    };
    const onchangeBase = el.onchange;
    el.onchange = e => { if (e.target.matches('[data-of-club]')) { sx.destino = e.target.value; const o = e.target.value === '__otro'; if (o !== sx.otro) { sx.otro = o; pintar(); } return; } if (e.target.matches('[data-sal-jug]')) { sx.sal.id = e.target.value; const j = plProp.jugadores.find(x => x.id === sx.sal.id); sx.sal.precio = j?.valorM ? Math.round(j.valorM) : 5; sx.prop = null; sx.aviso = null; pintar(); } else if (onchangeBase) onchangeBase(e); };
    el.onclick = e => {
      if (e.target.closest(SEL_EXTRA)) { manejarExtra(e); return; }
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
