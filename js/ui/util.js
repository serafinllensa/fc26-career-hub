// Utilidades de interfaz (Frontend FC). Sin dependencias.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const html = (partes, ...vals) => partes.reduce((a, p, i) => a + p + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : (vals[i] ?? '')) : ''), '');
export const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const LIGAS = [
  {id:'Premier League', pais:'Inglaterra', clubes:20},
  {id:'LaLiga', pais:'España', clubes:20},
  {id:'Serie A', pais:'Italia', clubes:20},
  {id:'Bundesliga', pais:'Alemania', clubes:18},
  {id:'Ligue 1', pais:'Francia', clubes:18},
];

const LINEA = {POR:'por',DFC:'def',LD:'def',LI:'def',CAD:'def',CAI:'def',MCD:'med',MC:'med',MCO:'med',MD:'med',MI:'med',ED:'del',EI:'del',DC:'del',SD:'del'};
export const lineaDe = p => LINEA[p] || 'med';
export const ORDEN = {POR:0,DFC:1,LD:2,LI:3,CAD:2,CAI:3,MCD:4,MC:5,MD:6,MI:7,MCO:8,EI:9,ED:10,SD:11,DC:12};
export const NOMBRE_LINEA = {por:'Arqueros', def:'Defensores', med:'Mediocampistas', del:'Delanteros'};

export const fmtM = v => v == null ? '—' : (v >= 1000 ? (v/1000).toLocaleString('es-AR',{maximumFractionDigits:2}) + ' mil M€' : v.toLocaleString('es-AR',{maximumFractionDigits:1}) + ' M€');
export const fmtNum = v => v == null ? '—' : v.toLocaleString('es-AR',{maximumFractionDigits:1});
export const fmtFecha = iso => iso ? new Date(iso + 'T12:00').toLocaleDateString('es-AR',{day:'numeric',month:'short',year:'numeric'}) : '—';
export const fmtContrato = c => c ? c.split('-').reverse().join('/') : null;

export const ICONO = {
 panel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
 plantilla:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
 calendario:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 oficina:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M4 21h16"/></svg>',
 dt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/><path d="M15 3.5 19 2"/></svg>',
 tactica:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>',
 mercado:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 7h18l-2 12H5L3 7z"/><path d="M8 7a4 4 0 0 1 8 0"/></svg>',
 trofeo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
 inicio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
 mas:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
 buscar:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};

export const estado = (titulo, texto, tipo = '', accion = '') =>
  `<div class="vacio ${tipo}" role="${tipo === 'error' ? 'alert' : 'status'}"><h2 class="h2">${esc(titulo)}</h2><p>${texto}</p>${accion}</div>`;
export const cargando = (n = 4) => `<div class="grilla" aria-busy="true" aria-label="Cargando">${'<div class="cargando"></div>'.repeat(n)}</div>`;
// Monto estimado del Motor: si viene null (club sin datos), nunca se muestra un número.
export const est = v => v == null || !Number.isFinite(+v) ? 'Sin estimado' : `≈ ${fmtM(v)}`;
