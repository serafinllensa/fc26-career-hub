// Color del club (regla de GUIA §3 de Diseño FC): contraste mínimo 4.5:1 para texto y 3:1 para acentos.
const PAPEL = '#F4F2ED', TINTA = '#15171C', FONDO_OSC = '#07141B', MENTA = '#2FE0B5', NEUTRO = {principal:'#15171C', secundario:'#C9A227'};
const okHex = h => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
function lum(hex){
  const c = hex.slice(1).match(/../g).map(h => { const v = parseInt(h,16)/255; return v <= .03928 ? v/12.92 : ((v+.055)/1.055) ** 2.4; });
  return .2126*c[0] + .7152*c[1] + .0722*c[2];
}
export function contraste(a, b){ const [x,y] = [lum(a), lum(b)].sort((p,q) => q-p); return (x+.05)/(y+.05); }

export function varsClub(club){
  const col = club?.colores || {};
  // Sin color con fuente: neutro de la app (no inventamos). Sin secundario: blanco o tinta según contraste (regla de Diseño).
  const p = okHex(col.principal) ? col.principal : TINTA;
  const s = okHex(col.secundario) ? col.secundario : (okHex(col.principal) ? (lum(p) > 0.4 ? TINTA : '#FFFFFF') : NEUTRO.secundario);
  const tintaSobre = c => contraste(c, '#FFFFFF') >= contraste(c, TINTA) ? '#FFFFFF' : TINTA;
  const claro = lum(p) > 0.8, e1 = claro ? s : p, e2 = claro ? p : s;
  return {
    '--club': p, '--club-2': s, '--club-tinta': tintaSobre(p),
    '--club-acento': [p, s].find(c => contraste(c, PAPEL) >= 3) || TINTA,
    // Tema FC26 (fondo oscuro), misma regla que diseno/maquetas/comun.js
    '--club-acento-osc': (okHex(col.principal) ? [p, s] : []).find(c => contraste(c, FONDO_OSC) >= 3.5) || MENTA,
    '--club-glow': (okHex(col.principal) ? [p, s] : []).find(c => lum(c) > 0.03 && lum(c) < 0.8) || MENTA,
    '--escudo-1': e1, '--escudo-2': e2, '--escudo-tinta': tintaSobre(e1),
    '--banda-escudo-1': s, '--banda-escudo-2': p, '--banda-escudo-tinta': tintaSobre(s),
  };
}
export const estiloClub = club => Object.entries(varsClub(club)).map(([k,v]) => `${k}:${v}`).join(';');
export function aplicarClub(club, raiz = document.documentElement){
  for (const [k,v] of Object.entries(varsClub(club))) raiz.style.setProperty(k, v);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', club ? varsClub(club)['--club'] : '#07141B');
}
// Monograma: usamos "corto" del club; nunca escudos oficiales (derechos de marca).
// "corto" de Transfermarkt puede ser largo ("Man City", "Mönchengladbach"): se arma una sigla de hasta 3 letras.
const RELLENO = new Set(['fc','cf','ac','as','ss','sc','rc','cd','ud','sd','rcd','afc','bc','vfb','vfl','tsg','sv','fsv','1','04','05','1909','1907','de','del','la','le','hove','and']);
export function monograma(club){
  const s = club?.siglaOficial || club?.sigla; if (s) return String(s).toUpperCase();
  const c = (club?.corto || club?.nombre || '?').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (c.replace(/[^A-Za-z]/g,'').length <= 3) return c.toUpperCase();
  const pal = c.split(/[\s.\-]+/).filter(w => w && !RELLENO.has(w.toLowerCase()));
  if (pal.length >= 2) return pal.slice(0, 3).map(w => w[0]).join('').toUpperCase();
  return (pal[0] || c).replace(/[^A-Za-z]/g,'').slice(0, 3).toUpperCase();
}
// Transfermarkt trae la ciudad con código postal ("M11 3FF Manchester"): para mostrar, se limpia.
export const ciudad = club => (club?.ciudad || '').replace(/\s*\(.*?\)\s*/g, ' ').split(' ').filter(w => !/\d/.test(w)).join(' ').trim() || null;

// Escudo real (data/escudos, fuente en clubes.json → escudo). Si falta o no carga, queda la sigla.
const RAIZ_DATOS = new URL('../../data/', import.meta.url);
const escAttr = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function escudo(club, tam = ''){
  const sig = escAttr(monograma(club)), arch = club?.escudo?.archivo;
  const mono = `<span class="escudo ${tam}" style="${estiloClub(club)}" aria-hidden="true">${sig}</span>`;
  if (!arch || !/^escudos\/[a-z0-9-]+\.png$/.test(arch)) return mono;
  return `<span class="escudo-real ${tam}" style="${estiloClub(club)}" data-sigla="${sig}"><img src="${new URL(arch, RAIZ_DATOS)}" alt="Escudo de ${escAttr(club.nombre)}" width="128" height="128" loading="lazy" decoding="async"></span>`;
}
document.addEventListener('error', e => {
  const img = e.target, caja = img?.parentNode;
  if (img?.tagName !== 'IMG' || !caja?.classList?.contains('escudo-real')) return;
  caja.className = caja.className.replace('escudo-real', 'escudo'); caja.textContent = caja.dataset.sigla; caja.setAttribute('aria-hidden', 'true');
}, true);
