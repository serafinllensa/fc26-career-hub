// Arranque de la app (Frontend FC): rutas, navegación y cambio de pantalla.
import {mejorarSelects} from './selects.js';
import {ruta, onCambio, resolver} from './router.js';
import {pintarNav} from './nav.js';
import {aplicarClub} from './club.js';
import inicio from './pantallas/inicio.js?v=fc26entra';
import nueva from './pantallas/nueva.js?v=fc26entra';
import {dt, dificultad} from './pantallas/eleccion.js?v=fc26entra';
import panel from './pantallas/panel.js?v=fc26entra';
import plantilla from './pantallas/plantilla.js?v=fc26entra';
import * as o from './pantallas/otras.js?v=fc26entra';
import calendario from './pantallas/calendario.js?v=fc26entra';
import partido from './pantallas/partido.js?v=fc26entra';
import dtOficina from './pantallas/dt.js?v=fc26entra';
import presidente from './pantallas/presidente.js?v=fc26entra';
import mercado from './pantallas/mercado.js?v=fc26entra';
import tacticas from './pantallas/tacticas.js?v=fc26entra';
import trofeos from './pantallas/trofeos.js?v=fc26entra';

ruta('inicio', inicio);
ruta('nueva', nueva);
ruta('nueva/dt', dt);
ruta('nueva/dificultad', dificultad);
ruta('panel', panel);
ruta('plantilla', plantilla);
ruta('calendario', calendario);
ruta('partido', partido);
ruta('presidente', presidente);
ruta('dt', dtOficina);
ruta('tacticas', tacticas);
ruta('mercado', mercado);
ruta('trofeos', trofeos);
ruta('mas', o.mas);
ruta('404', o.noEncontrada);

document.getElementById('vista').insertAdjacentHTML('afterend', '<footer class="pie contenido">Los escudos son marcas de sus clubes. Proyecto de fans sin fines comerciales. Datos: Transfermarkt y fuentes oficiales, con fecha en cada pantalla.</footer>');
const app = document.getElementById('app'), nav = document.getElementById('nav'), vista = document.getElementById('vista');
const esperar = ms => new Promise(r => setTimeout(r, ms));
// Adelante: la pantalla sale a la izquierda y la nueva entra desde la derecha.
// Atrás (Volver o el botón del navegador): al revés, como en el menú del juego.
const pila = [];
function sentido(){
  const h = location.hash || '#/inicio';
  if (!pila.length) { pila.push(h); return 'inicio'; }
  if (pila[pila.length - 1] === h) return 'adelante';
  const i = pila.lastIndexOf(h);
  if (i !== -1 && i < pila.length - 1) { pila.length = i + 1; return 'atras'; }
  pila.push(h);
  return 'adelante';
}
onCambio(async (nombre, def, params, viejo) => {
  document.querySelectorAll('.barrido, .pantalla.sale').forEach(n => n.remove());
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dir = reducido ? 'inicio' : sentido();
  const anterior = vista.querySelector('.pantalla');
  if (!reducido && dir !== 'inicio') {
    const barrido = document.createElement('div');
    barrido.className = 'barrido';
    barrido.setAttribute('aria-hidden', 'true');
    document.body.append(barrido);
    const limpiar = () => barrido.remove();
    barrido.addEventListener('animationend', limpiar, {once: true});
    setTimeout(limpiar, 1600);
  }
  if (anterior) {
    if (!reducido && dir !== 'inicio') {
      anterior.classList.remove('entra', 'inicio', 'adelante', 'atras');
      anterior.classList.add('sale', dir);
    } else anterior.remove();
  }
  app.classList.toggle('sin-nav', !!def.sinNav);
  if (def.sinNav) aplicarClub(null); else pintarNav(nav, nombre, params);
  document.title = `${def.titulo} · FC26 Career Hub`;
  const el = document.createElement('div');
  el.className = 'pantalla';
  vista.append(el);
  scrollTo(0, 0);
  const t0 = performance.now();
  try { await def.render(el, params, viejo); }
  catch (e) {
    console.error(e);
    if (!viejo()) el.innerHTML = `<div class="vacio error" role="alert"><h2 class="h2">Algo falló</h2><p>${String(e.message).replace(/</g, '<')}</p><a class="btn secundario" href="#/inicio">Ir al inicio</a></div>`;
  }
  if (viejo()) { el.remove(); return; }
  if (!reducido && dir !== 'inicio') {
    const falta = 560 - (performance.now() - t0);
    if (falta > 0) await esperar(falta);
    if (viejo()) { el.remove(); return; }
  }
  el.classList.add('entra', dir);
  if (anterior?.isConnected) {
    const quitar = () => anterior.remove();
    anterior.addEventListener('animationend', quitar, {once: true});
    setTimeout(quitar, 1300);
  }
  vista.focus({preventScroll: true});
});
resolver();
mejorarSelects(document.body);
