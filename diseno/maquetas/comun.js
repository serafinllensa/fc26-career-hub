/* Helpers de las maquetas. Frontend puede reutilizar aplicarClub(), lineaDe(), fmtM() tal cual. */
// Clubes reales: data/clubes.json (colores oficiales de Transfermarkt, escudos en data/escudos/).
let CLUBES=[];
async function cargarClubes(){CLUBES=await (await fetch('../../data/clubes.json')).json();return CLUBES}
const LIGA_ORDEN=['Premier League','LaLiga','Serie A','Bundesliga','Ligue 1'];
/* Escudo real con respaldo: si la imagen falta o falla, queda el monograma con la sigla y los colores del club. */
function escudo(club,tam=''){
  const sig=club.sigla||club.corto.slice(0,3).toUpperCase();
  const mono=`<span class="escudo ${tam}" style="${vars(club)}">${sig}</span>`;
  if(!(club.escudo&&club.escudo.archivo)) return mono;
  return `<span class="escudo-real ${tam}" style="${vars(club)}"><img src="../../data/${club.escudo.archivo}" alt="Escudo de ${club.nombre}" width="128" height="128" loading="lazy" decoding="async" onerror="const p=this.parentNode;p.className='escudo ${tam}';p.textContent='${sig}'"></span>`;
}
const PIE='<footer class="pie">Los escudos son marcas de sus clubes. Proyecto de fans sin fines comerciales. Datos: Transfermarkt y fuentes oficiales, con fecha en cada pantalla.</footer>';

function lum(hex){const c=hex.replace('#','').match(/../g).map(h=>{let v=parseInt(h,16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contraste(a,b){const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)}
/* Regla de color de club (GUIA §3):
   - --club = principal; si es casi blanco (lum>0.8), la banda usa principal y el detalle usa secundario.
   - --club-tinta = blanco o tinta según qué contraste sea mayor (mín. 4.5:1).
   - --club-acento = el color del club que tenga ≥3:1 contra el papel; si ninguno, tinta. */
function aplicarClub(club, raiz=document.documentElement){
  const papel="#F4F2ED", tinta="#15171C", col=club.colores||{};
  // Sin color con fuente: neutro de la app (no inventamos colores). Sin secundario: blanco o tinta según contraste.
  const p=col.principal||tinta, s=col.secundario||(lum(p)>0.4?tinta:"#FFFFFF");
  raiz.style.setProperty('--club',p);
  raiz.style.setProperty('--club-2',s);
  raiz.style.setProperty('--club-tinta',contraste(p,"#FFFFFF")>=contraste(p,tinta)?"#FFFFFF":tinta);
  const acento=[p,s].find(c=>contraste(c,papel)>=3)||tinta;
  raiz.style.setProperty('--club-acento',acento);
  // Tema FC26 (fondo oscuro): acento legible sobre el fondo y color del brillo del fondo.
  const fondo="#07141B";
  raiz.style.setProperty('--club-acento-osc',[p,s].find(c=>contraste(c,fondo)>=3.5)||"#2FE0B5");
  raiz.style.setProperty('--club-glow',[p,s].find(c=>lum(c)>0.03&&lum(c)<0.8)||"#2FE0B5");
  // Escudo: si el principal es casi blanco, se invierte (fondo secundario) para que no desaparezca sobre papel o banda clara.
  const claro=lum(p)>0.8, e1=claro?s:p, e2=claro?p:s;
  raiz.style.setProperty('--escudo-1',e1); raiz.style.setProperty('--escudo-2',e2);
  raiz.style.setProperty('--escudo-tinta',contraste(e1,"#FFFFFF")>=contraste(e1,tinta)?"#FFFFFF":tinta);
  // En la banda (fondo = principal) el escudo va siempre sobre el secundario, para que se despegue.
  raiz.style.setProperty('--banda-escudo-1',s); raiz.style.setProperty('--banda-escudo-2',p);
  raiz.style.setProperty('--banda-escudo-tinta',contraste(s,"#FFFFFF")>=contraste(s,tinta)?"#FFFFFF":tinta);
}
function vars(club){const d=document.createElement('div');aplicarClub(club,d);return d.style.cssText}

const LINEA={POR:'por',DFC:'def',LD:'def',LI:'def',CAD:'def',CAI:'def',MCD:'med',MC:'med',MCO:'med',MD:'med',MI:'med',ED:'del',EI:'del',DC:'del',SD:'del'};
const lineaDe=p=>LINEA[p]||'med';
const ORDEN={POR:0,DFC:1,LD:2,LI:3,MCD:4,MC:5,MD:6,MI:7,MCO:8,EI:9,ED:10,SD:11,DC:12};
const fmtM=v=>v==null?'—':(v>=1000?(v/1000).toLocaleString('es-AR',{maximumFractionDigits:2})+' mil M€':v.toLocaleString('es-AR',{maximumFractionDigits:1})+' M€');
const fmtVal=v=>v==null?'—':v.toLocaleString('es-AR',{maximumFractionDigits:1});
// Sugerencia a Datos FC: sumar "nacISO" (ISO-3166 alfa-3) a cada jugador. Mientras, mapa mínimo para la maqueta.
const PAIS={Belgium:'BEL',Ukraine:'UKR',Spain:'ESP',France:'FRA',Brazil:'BRA',Germany:'DEU',England:'ENG',Netherlands:'NLD',Uruguay:'URY','Türkiye':'TUR',Portugal:'PRT',"Cote d'Ivoire":'CIV',Morocco:'MAR',Argentina:'ARG',Italy:'ITA',Norway:'NOR',Croatia:'HRV',Switzerland:'CHE',Scotland:'SCO',Poland:'POL',Austria:'AUT',Denmark:'DNK',Sweden:'SWE',Albania:'ALB',Armenia:'ARM',Japan:'JPN',Canada:'CAN',Chile:'CHL',Ecuador:'ECU',Colombia:'COL',Algeria:'DZA',Ghana:'GHA',Egypt:'EGY',Slovakia:'SVK',Georgia:'GEO',Mexico:'MEX',Serbia:'SRB',Wales:'WAL',Uzbekistan:'UZB'};
const pais=n=>PAIS[n]||n;

const ICONO={
 panel:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
 plantilla:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2"/></svg>',
 calendario:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 oficina:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6M4 21h16"/></svg>',
 tactica:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><circle cx="12" cy="12" r="3"/></svg>',
 trofeo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
 mas:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
 buscar:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};
function nav(actual){
  const it=(id,txt,ic,extra='')=>`<a href="${id}.html" ${actual===id?'aria-current="page"':''} class="${extra}">${ICONO[ic]}<span>${txt}</span></a>`;
  return `<nav class="nav" aria-label="Principal"><div class="marca">FC26 Hub<small>MODO CARRERA · 2026/27</small></div>
  ${it('panel','Panel','panel')}${it('plantilla','Plantilla','plantilla')}${it('calendario','Calendario','calendario')}${it('presidente','Oficinas','oficina')}
  <div class="grupo solo-escritorio">Club</div>${it('tacticas','Tácticas y FC IQ','tactica','solo-escritorio')}${it('mercado','Mercado y finanzas','panel','solo-escritorio')}${it('trofeos','Trofeos','trofeo','solo-escritorio')}${it('clubes','Mis carreras','plantilla','solo-escritorio')}
  ${it('mas','Más','mas','solo-celular')}</nav>
  <div class="atajos" aria-hidden="true"><span><kbd>Esc</kbd>Volver</span><span><kbd>/</kbd>Buscar</span><span><kbd>G</kbd>Guardar carrera</span></div>`;
}
function banda(club,dificultad='Hardcore',nivelDif=4,extra=''){
  const barras=[1,2,3,4,5].map(i=>`<b class="${i<=nivelDif?'on':''}"></b>`).join('');
  return `<header class="banda"><div class="fila">${escudo(club,'lg')}<div style="flex:1;min-width:0">
  <div class="etiqueta" style="color:inherit;opacity:.75">${club.liga} · Temporada 2026/27</div><h1 class="nombre">${club.nombre}</h1>
  <div class="fila" style="margin-top:10px;gap:8px;flex-wrap:wrap"><span class="dif">${dificultad} <i>${barras}</i></span><span class="estrellas-hero" aria-label="Nivel ${club.nivel} de 5">${'★'.repeat(club.nivel)}<span style="opacity:.25">${'★'.repeat(5-club.nivel)}</span></span>${extra}</div></div></div></header>`;
}
async function plantilla(id){return (await fetch(`../../data/plantillas/${id}.json`)).json()}
async function clubPorQuery(){if(!CLUBES.length)await cargarClubes();const id=new URLSearchParams(location.search).get('club')||'real-madrid';return CLUBES.find(c=>c.id===id)||CLUBES.find(c=>c.id==='real-madrid')}

/* ---- EA FC 26 (dato del juego, separado de Transfermarkt) ---- */
const ovr=j=>j.ea&&j.ea.ovr!=null?j.ea.ovr:null;
// Promedios de línea estilo "Classic Match": media EA de los mejores de cada línea (ATA 3, MED 3, DEF 4 + arquero).
function lineasEA(J){
  const top=(l,n)=>{const v=J.filter(j=>lineaDe(j.pos)===l&&ovr(j)!=null).map(ovr).sort((a,b)=>b-a).slice(0,n);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null};
  const por=top('por',1),def=top('def',4);
  return {ata:top('del',3),med:top('med',3),def:por!=null&&def!=null?Math.round((def*4+por)/5):def};
}
// Once ideal 4-3-3 por media EA (para maquetas de tácticas).
function onceEA(J){
  const usados=new Set();
  const elegir=(poss)=>{const c=J.filter(j=>!usados.has(j)&&(poss.includes(j.pos)||(j.posSec||[]).some(p=>poss.includes(p)))).sort((a,b)=>(ovr(b)||0)-(ovr(a)||0)||(b.valorM||0)-(a.valorM||0))[0];if(c)usados.add(c);return c};
  return [['POR',['POR']],['LI',['LI','CAI']],['DFC',['DFC']],['DFC',['DFC']],['LD',['LD','CAD']],['MC',['MC','MCD']],['MCD',['MCD','MC']],['MC',['MC','MCO']],['EI',['EI','MI']],['DC',['DC','SD']],['ED',['ED','MD']]].map(([r,p])=>({rol:r,j:elegir(p)}));
}
const estrellitas=(n,max=5)=>`${'★'.repeat(n||0)}<span style="opacity:.25">${'★'.repeat(max-(n||0))}</span>`;
const corto=n=>{const p=n.split(' ');const u=p[p.length-1];return p.length>1&&/^(Junior|Júnior|Jr\.?)$/i.test(u)?p[0]:u};
