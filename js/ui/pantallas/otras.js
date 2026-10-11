// Secciones que dependen de entregas pendientes (Diseño + Motor). Muestran qué falta, nunca una pantalla en blanco.
import {contextoClub, banda} from '../contexto.js';
import {estado, cargando, ICONO} from '../util.js';
import {href} from '../router.js';
import {seccionesMas} from '../nav.js';

const pendiente = (titulo, texto) => ({
  titulo,
  async render(el, params, viejo){
    el.innerHTML = cargando(2);
    const ctx = await contextoClub(params); if (viejo()) return;
    el.innerHTML = (ctx ? banda(ctx) : '') + `<h2 class="h1" style="margin-bottom:var(--e4)">${titulo}</h2>` + estado('En construcción', texto);
  }
});
export const calendario = pendiente('Calendario', 'Fixture de la temporada, carga de resultados y análisis de cada partido. Llega con el calendario del Motor y la maqueta de Diseño.');
export const presidente = pendiente('Oficina del presidente', 'Exigencias, límites de sueldos y fichajes, y las charlas con consecuencias. La maqueta ya está; falta el motor de eventos.');
export const dtOficina = pendiente('Oficina del DT', 'Charlas con el DT sobre el plantel, la táctica y el vestuario. Llega con el motor de eventos.');
export const tacticas = pendiente('Tácticas y FC IQ', 'Formaciones, estilo de juego y roles y enfoques de FC IQ de FC 26. Espera data/fciq.json de Datos FC.');
export const mercado = pendiente('Mercado y finanzas', 'Altas, bajas, masa salarial y fair play financiero por liga. Espera el modelo de FFP del Motor.');
export const trofeos = pendiente('Trofeos', 'Vitrina e historial de la carrera, temporada por temporada.');

export const mas = {
  titulo: 'Más',
  async render(el, params){
    const q = params.club ? {club: params.club} : undefined;
    el.innerHTML = `<h2 class="h1" style="margin-bottom:var(--e4)">Más</h2><ul class="menu">${seccionesMas.map(s => `<li><a href="${s.id === 'inicio' ? '#/inicio' : href(s.id, q)}">${ICONO[s.ic]}<span>${s.txt}</span></a></li>`).join('')}</ul>`;
  }
};
export const noEncontrada = {
  titulo: 'No encontrada', sinNav: true,
  async render(el){ el.innerHTML = estado('Esta pantalla no existe', 'Puede ser un link viejo.', '', `<a class="btn primario" href="#/inicio">Ir al inicio</a>`); }
};
