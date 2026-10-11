import {ICONO} from './util.js';
import {href} from './router.js';
export {href};
// Celular: 4 secciones + "Más" en barra inferior. Escritorio (≥960): lateral con todo.
const SECCIONES = [
  {id:'panel', txt:'Panel', ic:'panel', celu:true},
  {id:'plantilla', txt:'Plantilla', ic:'plantilla', celu:true},
  {id:'calendario', txt:'Calendario', ic:'calendario', celu:true},
  {id:'presidente', txt:'Oficinas', ic:'oficina', celu:true},
  {id:'tacticas', txt:'Tácticas y FC IQ', ic:'tactica', grupo:'Club'},
  {id:'mercado', txt:'Mercado y finanzas', ic:'mercado'},
  {id:'trofeos', txt:'Trofeos', ic:'trofeo'},
  {id:'inicio', txt:'Mis carreras', ic:'inicio', grupo:'Carrera'},
];
export const seccionesMas = SECCIONES.filter(s => !s.celu);
export function pintarNav(el, actual, params = {}){
  if (actual === 'partido') actual = 'calendario';
  if (actual === 'dt') actual = 'presidente';
  const q = params.club ? {club: params.club} : undefined; // conserva la vista previa ?club=
  const a = s => `<a href="${s.id === 'inicio' ? '#/inicio' : href(s.id, q)}" class="${s.celu ? '' : 'solo-escritorio'}" ${actual === s.id ? 'aria-current="page"' : ''}>${ICONO[s.ic]}<span>${s.txt}</span></a>`;
  const masActivo = seccionesMas.some(s => s.id === actual) || actual === 'mas';
  el.innerHTML = `<div class="marca">FC26 Hub<small>MODO CARRERA · 2026/27</small></div>`
    + SECCIONES.map(s => (s.grupo ? `<div class="grupo solo-escritorio">${s.grupo}</div>` : '') + a(s)).join('')
    + `<a href="${href('mas', q)}" class="solo-celular" ${masActivo ? 'aria-current="page"' : ''}>${ICONO.mas}<span>Más</span></a>`;
}

// Pestañas internas de Oficinas (presidente y DT), estilo .segmento.
export function pestanasOficina(actual, params = {}){
  const q = params.club ? {club: params.club} : undefined;
  const t = (id, txt) => actual === id ? `<span aria-current="page">${txt}</span>` : `<a href="${href(id, q)}">${txt}</a>`;
  return `<nav class="segmento" aria-label="Oficinas">${t('presidente', 'Presidente')}${t('dt', 'Director técnico')}</nav>`;
}
