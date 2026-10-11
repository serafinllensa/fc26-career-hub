// Negociación con el presidente, en un solo lugar (Oficina del presidente). Mercado solo arma el pedido de fichaje y manda acá.
// Lógica: Motor (pedirAlPresidente / cerrarNegociacion / estadoMercado). Acá: estado de la charla y su HTML en globos.
import * as motor from '../motor/index.js';
import {esc, fmtM} from './util.js';
import {actualizar} from './carrera.js';

const CLAVE = 'fc26.negociacion';
const TIPOS = {fichaje: 'Aprobar fichaje', presupuesto: 'Más presupuesto', masa: 'Más masa salarial'};
const coma = t => String(t ?? '').replace(/(\d)\.(\d)/g, '$1,$2');
const DEC = {acepta: 'Acepta', contraoferta: 'Contraoferta', rechaza: 'Rechaza'};
export const iniciales = n => String(n || 'P').split(/\s+/).filter(w => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map(w => w[0]).join('') || 'P';

const leer = id => { try { const s = JSON.parse(sessionStorage.getItem(CLAVE) || 'null'); return s && s.carrera === id ? s : null; } catch { return null; } };
const escribir = s => sessionStorage.setItem(CLAVE, JSON.stringify(s));
const nuevo = id => ({carrera: id, tipo: 'presupuesto', monto: 30, jugador: null, hilo: [], neg: null, auto: false});

/** Desde Mercado: deja armado el pedido de fichaje para que la oficina lo plantee al entrar. */
export function pedidoDesdeMercado(carreraId, jugador, precioM){
  escribir({...nuevo(carreraId), tipo: 'fichaje', monto: precioM, jugador, auto: true});
}

export function negociacion(carreraId){
  let s = leer(carreraId) || nuevo(carreraId);
  const guardar = () => escribir(s);
  const textoPedido = () => s.tipo === 'fichaje' ? `Quiero fichar a ${s.jugador?.nombre} por ${fmtM(s.monto)}.${s.jugador?.respaldoDT ? ' Lo pidió el DT.' : ''}` : s.tipo === 'presupuesto' ? `Necesito ${fmtM(s.monto)} más de presupuesto para fichajes.` : `Necesito subir ${fmtM(s.monto)} la masa salarial.`;
  return {
    get estado(){ return s; },
    pedir(carrera, club){
      const ped = s.tipo === 'fichaje' ? {tipo: 'fichaje', precioM: s.monto, jugador: s.jugador, ...(s.jugador?.respaldoDT ? {respaldoDT: true} : {})} : {tipo: s.tipo, montoM: s.monto};
      const n = motor.pedirAlPresidente(carrera, club, ped);
      s.hilo.push({yo: true, t: textoPedido()}, {t: n.texto, dec: n.decision, mot: n.motivos});
      s.neg = n; s.auto = false; guardar();
    },
    responder(respuestaId){
      const n = s.neg, r = n.respuestas.find(x => x.id === respuestaId), antes = {};
      let c = null;
      c = actualizar(car => { antes.conf = car.confianza.presidente; return motor.cerrarNegociacion(car, n, respuestaId); });
      const d = Math.round((c.confianza.presidente - antes.conf) * 10) / 10, ok = c.ultimaNegociacion === 'aprobado';
      s.hilo.push({yo: true, t: r.texto}, {fin: `${ok ? `Aprobado: ${fmtM(c.negociaciones.at(-1).aprobadoM)}` : n.decision === 'acepta' ? 'Cerrado' : 'Sigue en no'} · confianza ${d >= 0 ? '+' : '−'}${String(Math.abs(d)).replace('.', ',')}`});
      s.neg = null; if (s.tipo === 'fichaje' && ok) s.jugador = null; guardar();
      return c;
    },
    tipo(t){ s.tipo = t; s.neg = null; s.monto = t === 'fichaje' && s.jugador ? s.monto : t === 'fichaje' ? s.monto : 30; guardar(); },
    monto(d){ s.monto = Math.max(5, s.monto + d); guardar(); },
    limpiar(){ s = {...nuevo(carreraId), tipo: s.tipo}; guardar(); },
    // HTML: formulario "Nuevo pedido" y la charla en globos.
    formulario(previa, hrefMercado){
      return `<div class="tarjeta" style="margin-top:var(--e4)"><div class="etiqueta">Nuevo pedido</div>
        <div class="neg-tipos" style="margin-top:var(--e3)">${Object.entries(TIPOS).map(([k, t]) => `<button class="chip" data-tipo="${k}" aria-pressed="${k === s.tipo}">${t}</button>`).join('')}</div>
        ${s.tipo === 'fichaje' ? (s.jugador ? `<div class="fila-dato" style="margin-top:var(--e3)"><span>Jugador</span><span>${esc(s.jugador.nombre)} <small class="meta">${fmtM(s.jugador.valorM)} TM</small></span></div>` : `<p class="meta" style="margin:var(--e3) 0 0">Elegí el jugador en <a href="${hrefMercado}">Mercado</a> y volvé con el pedido armado.</p>`) : ''}
        ${s.tipo !== 'fichaje' || s.jugador ? `<div class="monto"><button data-m="-5" aria-label="Menos 5 M€">−</button><b class="num">${fmtM(s.monto)}</b><button data-m="5" aria-label="Más 5 M€">+</button></div>
        <button class="btn primario" data-pedir style="width:100%;margin-top:var(--e3)" ${s.neg || previa ? 'disabled' : ''}>Pedírselo al presidente</button>` : ''}
        ${previa ? '<p class="meta" style="margin:var(--e2) 0 0">Empezá una carrera para negociar.</p>' : ''}</div>`;
    },
    charla(pres){
      return `<div class="hilo" aria-live="polite">${s.hilo.length ? s.hilo.map(h => h.fin ? `<div class="cierre">${esc(h.fin)}</div>` : `<div class="globo ${h.yo ? 'yo' : 'el'}"><div class="quien">${h.yo ? 'Vos' : esc(pres)}${h.dec ? `<span class="dec ${h.dec}">${DEC[h.dec]}</span>` : ''}</div>${esc(coma(h.t))}${h.mot?.length ? `<div class="motivos">${h.mot.map(m => `<div>${esc(coma(m))}</div>`).join('')}</div>` : ''}</div>`).join('')
          : '<p class="meta" style="text-align:center">Elegí qué pedir y el monto. El presidente responde según su confianza, su perfil, la dificultad y el fair play.</p>'}</div>
        ${s.neg ? `<div class="opc">${s.neg.respuestas.map(r => { const e = r.efectos.presidente || 0; return `<button data-neg-r="${esc(r.id)}"><span>${esc(r.texto)}</span><span class="ef" style="color:${e > 0 ? 'var(--ok)' : e < 0 ? 'var(--peligro)' : 'var(--tinta-3)'}">${e > 0 ? '+' : ''}${e} conf.</span></button>`; }).join('')}</div>` : ''}
        ${s.hilo.length && !s.neg ? '<button class="btn fantasma" data-limpiar style="align-self:center">Limpiar charla</button>' : ''}`;
    },
  };
}
