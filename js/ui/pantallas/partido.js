// Cargar resultado estilo "Classic Match": local contra visitante con escudo, nivel y líneas EA.
import {aviso} from '../avisos.js';
import * as datos from '../datos.js';
import {contextoClub} from '../contexto.js';
import {esc, estado, cargando, lineaDe, fmtFecha} from '../util.js';
import {href, ir} from '../router.js';
import {escudo, estiloClub} from '../club.js';
import {ovr, chipOvr, lineasEA, estrellitas, onceEA} from '../ea.js';
import {partidos, guardarPartido, conCarrera, onceCarrera} from '../carrera.js';
import {nombreComp} from './calendario.js';
import * as motor from '../../motor/index.js';
import {cierreCarrera} from '../cierre.js';

export default {
  titulo: 'Cargar resultado',
  async render(el, params, viejo){
    el.innerHTML = cargando(4);
    const ctx = await contextoClub(params); if (viejo()) return;
    if (!ctx) { el.innerHTML = estado('Sin carrera activa', 'Empezá una carrera para cargar resultados.', '', `<a class="btn primario" href="${href('nueva')}">Nueva carrera</a>`); return; }
    if (ctx.carrera?.estado?.finalizada) { el.innerHTML = cierreCarrera(ctx.carrera); return; }
    const club = ctx.club, todos = await datos.clubes();
    const item = (ctx.carrera?.fixture || []).find(x => x.id === params.partido)
      || (ctx.carrera?.partidos || []).find(x => x.id === params.partido);
    if (!item) { el.innerHTML = estado('Elegí un partido del calendario', 'Agregalo primero: fecha, competición, rival y si jugás de local o de visitante.', '', `<a class="btn primario" href="${href('calendario', params.club ? {club: params.club} : undefined)}">Ir al calendario</a>`); return; }
    const rival = todos.find(c => c.id === item.rivalId) || {id: item.rivalId, nombre: item.rivalId || 'Rival', liga: '', pais: ''};
    const f = {id: item.id, fecha: item.fecha || null, comp: item.comp || 'liga', local: !!item.local, rival};
    const compNom = nombreComp(f.comp, club.liga);
    let [pl, pr] = await Promise.all([datos.plantilla(club.id), rival.id ? datos.plantilla(rival.id).catch(() => ({jugadores: []})) : {jugadores: []}]);
    if (viejo()) return;
    pl = conCarrera(pl, ctx.carrera);
    const previo = ctx.carrera ? partidos().find(p => p.id === f.id || p.fixtureId === f.id) : null;
    const s = {gf: previo?.gf ?? 0, gc: previo?.gc ?? 0, gol: [...(previo?.goleadores || [])],
      tit: new Set(previo?.titulares || onceCarrera(pl.jugadores, ctx.carrera, onceEA).filter(o => o.j).map(o => o.j.id))};
    const nuestro = {c: club, J: pl.jugadores}, suyo = {c: f.rival, J: pr.jugadores};
    const [loc, vis] = f.local ? [nuestro, suyo] : [suyo, nuestro];
    const golesDe = l => l === nuestro ? 'gf' : 'gc';
    const lado = (l, tipo) => { const lin = lineasEA(l.J);
      return `<section class="tarjeta lado ${tipo === 'local' ? 'local' : 'visita'}" style="${estiloClub(l.c)}"><span class="vertical" aria-hidden="true">${tipo === 'local' ? 'LOCAL' : 'VISITANTE'}</span>
        <div class="liga-pais"><span>${esc(l.c.pais)}</span><span>${esc(l.c.liga)}</span></div>
        <div class="nombre-club">${esc(l.c.nombre)}</div><div style="display:flex;justify-content:center">${escudo(l.c, 'lg')}</div>
        <div class="estrellas-hero" style="margin-top:var(--e3)" aria-label="Nivel ${l.c.nivel ?? 'sin dato'}">${estrellitas(l.c.nivel)}</div>
        <div class="lineas3"><div><div class="etiqueta">ATA</div><b class="num">${lin.ata ?? '—'}</b></div><div><div class="etiqueta">MED</div><b class="num">${lin.med ?? '—'}</b></div><div><div class="etiqueta">DEF</div><b class="num">${lin.def ?? '—'}</b></div></div>
        <div class="marcador"><button class="paso" data-g="${golesDe(l)}" data-d="-1" aria-label="Restar gol a ${esc(l.c.nombre)}">−</button><div class="goles num" data-v="${golesDe(l)}" aria-live="polite">${s[golesDe(l)]}</div><button class="paso" data-g="${golesDe(l)}" data-d="1" aria-label="Sumar gol a ${esc(l.c.nombre)}">+</button></div></section>`; };
    const candidatos = [...pl.jugadores].sort((a, b) => ({del:0, med:1, def:2, por:3}[lineaDe(a.pos)] - {del:0, med:1, def:2, por:3}[lineaDe(b.pos)]) || (ovr(b) || 0) - (ovr(a) || 0));
    const ORD = {POR:0, LI:1, CAI:1, DFC:2, LD:3, CAD:3, MCD:4, MC:5, MI:6, MD:6, MCO:7, EI:8, ED:8, SD:9, DC:10};
    const candidatosTit = [...pl.jugadores].sort((a, b) => (ORD[a.pos] ?? 11) - (ORD[b.pos] ?? 11) || (ovr(b) || 0) - (ovr(a) || 0));
    const pintarTit = () => { const c = el.querySelector('[data-cont]'); c.textContent = `(${s.tit.size})`; c.classList.toggle('ok', s.tit.size === 11); };
    const pintarGol = () => {
      el.querySelector('[data-goleadores]').innerHTML = s.gol.map((id, i) => { const j = pl.jugadores.find(x => x.id === id);
        return `<div class="goleador">${chipOvr(j)}<span style="flex:1">${esc(j?.nombre ?? '—')}</span><button class="btn fantasma" data-quitar="${i}" aria-label="Quitar gol" style="min-height:32px;padding:0 8px">✕</button></div>`; }).join('')
        || '<p class="meta" style="margin:6px 0 0">Sin goleadores cargados.</p>';
      el.querySelector('[data-agregar]').disabled = s.gol.length >= s.gf;
    };
    el.innerHTML = `<div class="entre"><div><div class="etiqueta">Calendario · ${esc(compNom)}</div><h1 class="h1">Cargar resultado</h1></div></div>
      <div class="versus">${lado(loc, 'local')}
        <section class="centro">
          <div class="opcion"><div class="etiqueta">${esc(compNom)}</div><b>${f.fecha ? fmtFecha(f.fecha) : 'Sin fecha'}</b><div class="meta" style="margin-top:4px">${f.local ? 'Local' : 'Visitante'} ante ${esc(f.rival.nombre)}</div></div>
          <div class="opcion solo-escritorio"><div class="etiqueta">Estadio</div><b>${esc(loc.c.estadio || 'Sin dato')}</b></div>
          <div class="opcion"><div class="etiqueta">Goles de ${esc(club.nombre)}</div><div data-goleadores></div>
            <label class="campo" style="margin-top:8px;height:40px"><select data-sel aria-label="Elegir goleador">${candidatos.map(j => `<option value="${esc(j.id)}">${esc(j.nombre)}${ovr(j) != null ? ' · ' + ovr(j) : ''}</option>`).join('')}</select></label>
            <button class="btn secundario" data-agregar style="width:100%;margin-top:8px;min-height:38px">+ Agregar goleador</button></div>
          <details class="opcion titulares"><summary><span class="etiqueta">Titulares</span> <b class="contador num" data-cont>(${s.tit.size})</b><small class="meta">Opcional</small></summary>
            <p class="meta" style="margin:6px 0">Viene cargado el once ideal por media EA. Tocá para cambiar.</p>
            <div class="lista-tit">${candidatosTit.map(j => `<button type="button" class="tit" data-tit="${esc(j.id)}" aria-pressed="${s.tit.has(j.id)}"><span class="pos">${esc(j.pos || '')}</span><span class="nom">${esc(j.nombre)}</span>${chipOvr(j)}</button>`).join('')}</div></details>
          <button class="btn primario guardar-fijo" data-guardar style="width:100%" ${ctx.carrera ? '' : 'disabled title="En la vista previa no se guarda"'}>Guardar resultado</button>
          ${ctx.carrera ? '' : '<p class="meta" style="margin:0">Vista previa: empezá una carrera para guardar.</p>'}
        </section>
      ${lado(vis, 'visita')}</div>
      <p class="fuente solo-escritorio" style="margin-top:var(--e4)">ATA, MED y DEF: promedio de la media EA FC 26 de los mejores de cada línea (base oficial de EA). Nivel: Motor.</p>`;
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-g],[data-quitar],[data-agregar],[data-guardar],[data-tit],[data-cerrar]'); if (!b) return;
      if (b.dataset.cerrar !== undefined) { ir('calendario'); return; }
      if (b.dataset.tit) { const id = b.dataset.tit; s.tit.has(id) ? s.tit.delete(id) : s.tit.add(id); b.setAttribute('aria-pressed', s.tit.has(id)); pintarTit(); return; }
      if (b.dataset.g) { const k = b.dataset.g; s[k] = Math.max(0, Math.min(20, s[k] + Number(b.dataset.d))); if (k === 'gf') s.gol = s.gol.slice(0, s.gf); el.querySelectorAll(`[data-v="${k}"]`).forEach(x => x.textContent = s[k]); pintarGol(); }
      else if (b.dataset.quitar !== undefined) { s.gol.splice(Number(b.dataset.quitar), 1); pintarGol(); }
      else if (b.dataset.agregar !== undefined) { if (s.gol.length < s.gf) s.gol.push(el.querySelector('[data-sel]').value); pintarGol(); }
      else if (b.dataset.guardar !== undefined && ctx.carrera) {
        try {
          const r = guardarPartido({id: f.id, fixtureId: f.id, comp: f.comp, rivalId: f.rival.id, local: f.local, gf: s.gf, gc: s.gc, goleadores: s.gol, ...(s.tit.size ? {titulares: [...s.tit]} : {}), fecha: f.fecha || new Date().toISOString().slice(0, 10)}, {nivelRival: f.rival.nivel, perfil: club.presidente?.perfil, plantilla: pl.jugadores});
          const p = partidos().find(x => x.id === f.id);
          const an = motor.analizarPartido({...p, resultadoReal: f.real}, {nivelPropio: club.nivel, nivelRival: f.rival.nivel, partidosPrevios: partidos().filter(x => x.id !== p.id), plantilla: pl.jugadores});
          analisis(an, r);
        } catch (err) { aviso(`No se pudo guardar: ${err.message}`, {tipo: 'peligro'}); }
      }
    });
    // Tarjeta de análisis después de guardar; si el presidente te cita, se pasa desde acá.
    const SENS = {'muy-bien': ['ok', 'Muy bien'], bien: ['ok', 'Bien'], normal: ['parejo', 'Parejo'], mal: ['peligro', 'Mal'], 'muy-mal': ['peligro', 'Muy mal']};
    const icono = l => /hat-trick|doblete|convirti/i.test(l) && !/no convirti/i.test(l) ? '⚽' : /valla invicta/i.test(l) ? '🧤' : /victorias seguidas|racha|sin ganar/i.test(l) ? '🔥' : /forma/i.test(l) ? '📈' : '•';
    const analisis = (an, r) => {
      const [cl, tx] = SENS[an.sensacion] || SENS.normal;
      const ev = (r.eventos || []).find(e => e.oficina !== 'dt'), evDT = (r.eventos || []).find(e => e.oficina === 'dt');
      const lineas = an.lineas.filter(l => !/vida real/i.test(l));
      const d = Math.round((r.delta || 0) * 10) / 10;
      document.querySelector('.hoja-fondo')?.remove();
      document.body.insertAdjacentHTML('beforeend', `<div class="hoja-fondo" data-cerrar><div class="hoja" role="dialog" aria-modal="true" aria-labelledby="an-tit">
        <div class="tirador" aria-hidden="true"></div>
        <div class="etiqueta" style="text-align:center">${esc(compNom)}${f.fecha ? ' · ' + esc(fmtFecha(f.fecha)) : ''}</div>
        <div class="an-marcador">${escudo(loc.c)}<b class="num">${s[golesDe(loc)]}–${s[golesDe(vis)]}</b>${escudo(vis.c)}</div>
        <div class="entre" style="margin:var(--e4) 0 var(--e2)"><h2 id="an-tit" class="h2" style="margin:0;text-transform:uppercase">${esc(an.titular)}</h2><span class="chip-sens ${cl}">${tx}</span></div>
        <ul class="an-lineas">${lineas.map(l => `<li><span aria-hidden="true">${icono(l)}</span>${esc(l)}</li>`).join('')}</ul>
        ${r.corregido ? `<p class="badge neutro" style="margin:var(--e3) 0 0">${esc(r.etiqueta || 'Resultado corregido')} · se aplica solo la diferencia</p>` : ''}
        <div class="an-pie"><span style="display:flex;gap:var(--e3);flex-wrap:wrap">${(r.corregido && r.deltas ? ['presidente', 'vestuario', 'hinchas'] : r.tension ? ['presidente'] : []).map(k => { const v = Math.round(((r.corregido && r.deltas ? r.deltas[k] : d) || 0) * 10) / 10;
            return `<span class="conf ${v > 0 ? 'sube' : v < 0 ? 'baja' : ''}">${v > 0 ? '▲' : v < 0 ? '▼' : '='} ${k[0].toUpperCase() + k.slice(1)} ${v > 0 ? '+' : ''}${String(v).replace('.', ',')}</span>`; }).join('')}</span></div>
        ${evDT ? `<p class="meta" style="margin:var(--e3) 0 0">En el vestuario: ${esc(evDT.titulo)}. <a href="${href('dt')}">Ver en la oficina del DT</a></p>` : ''}
        <div class="an-acciones">${ev ? `<a class="btn menta" href="${href('presidente')}">Ir a la reunión</a>` : ''}<button class="btn ${ev ? 'secundario' : 'primario'}" data-volver>Volver al calendario</button></div>
      </div></div>`);
      const fondo = document.querySelector('.hoja-fondo');
      const cerrar = () => fondo.remove();
      fondo.addEventListener('click', e => { if (e.target === fondo || e.target.closest('[data-volver]')) { cerrar(); ir('calendario'); } else if (e.target.closest('a')) cerrar(); });
      addEventListener('hashchange', cerrar, {once: true});
      fondo.querySelector('[data-volver]').focus();
    };
    pintarGol(); pintarTit();
  }
};
