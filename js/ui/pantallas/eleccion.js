// Nueva carrera · pasos 2 (DT) y 3 (dificultad). Usa el Motor para sugerencias, objetivos y finanzas.
import * as datos from '../datos.js';
import * as motor from '../../motor/index.js';
import {href, ir} from '../router.js';
import {esc, estado, cargando} from '../util.js';
import {aplicarClub, escudo} from '../club.js';
import {empezar} from '../carrera.js';

const cabeza = (paso, titulo, club) => `<header class="cabeza"><div class="etiqueta">Nueva carrera · Paso ${paso} de 3</div>
  <div class="fila-h" style="margin-top:8px;gap:var(--e3)">${escudo(club)}<div><h1 class="h1">${titulo}</h1><p style="margin:2px 0 0">${esc(club.nombre)} · ${esc(club.liga)}</p></div></div>
  <div class="pasos">${[1,2,3].map(i => `<span class="${i <= paso ? 'on' : ''}"></span>`).join('')}</div></header>`;

async function clubDe(params, el){
  try { const c = await datos.club(params.club); aplicarClub(c); return c; }
  catch (e) { el.innerHTML = estado('No encontramos el club', esc(e.message), 'error', `<a class="btn secundario" href="${href('nueva')}">Elegir otro</a>`); return null; }
}

export const dt = {
  titulo: 'Elegí el DT', sinNav: true,
  async render(el, params, viejo){
    el.innerHTML = cargando(5);
    const club = await clubDe(params, el); if (!club || viejo()) return;
    let lista = null, motivo = '';
    try { lista = await datos.dts(); } catch (e) { motivo = e.motivo; }
    if (viejo()) return;
    const sug = lista ? motor.sugerirDTs(club, lista) : [];
    el.innerHTML = cabeza(2, 'Elegí el DT', club) + (lista
      ? `<p class="meta">Los 5 DTs reales que mejor encajan con el club, según historia, vínculo, idea de juego y nivel.</p>
         <div class="grilla">${sug.map(s => `<a class="tarjeta" style="text-decoration:none;color:inherit" href="${href('nueva/dificultad', {club:club.id, dt:s.dt.id})}">
           <header><span class="h3">${esc(s.dt.nombre)}</span><span class="badge neutro num">${s.puntaje} pts</span></header>
           <p class="meta" style="margin:0">${s.motivos.map(esc).join(' · ') || 'Sin vínculos directos con el club'}</p></a>`).join('')}</div>`
      : estado('Faltan los DTs', `Todavía no se puede cargar <code>data/dts.json</code> (${esc(motivo)}). Datos FC lo arma después de las plantillas. Mientras, podés seguir sin DT.`, '',
          `<a class="btn secundario" href="${href('nueva/dificultad', {club:club.id})}">Seguir sin DT</a>`))
      + `<p style="margin-top:var(--e6)"><a class="btn fantasma" href="${href('nueva')}">← Cambiar club</a></p>`;
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
