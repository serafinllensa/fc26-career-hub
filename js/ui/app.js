// Arranque de la app (Frontend FC): rutas, navegación y cambio de pantalla.
import {mejorarSelects} from './selects.js';
import {ruta, onCambio, resolver} from './router.js';
import {pintarNav} from './nav.js';
import {aplicarClub} from './club.js';
import inicio from './pantallas/inicio.js';
import nueva from './pantallas/nueva.js';
import {dt, dificultad} from './pantallas/eleccion.js';
import panel from './pantallas/panel.js';
import plantilla from './pantallas/plantilla.js';
import * as o from './pantallas/otras.js';
import calendario from './pantallas/calendario.js';
import partido from './pantallas/partido.js';
import dtOficina from './pantallas/dt.js';
import presidente from './pantallas/presidente.js';
import mercado from './pantallas/mercado.js';
import tacticas from './pantallas/tacticas.js';
import trofeos from './pantallas/trofeos.js';

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
onCambio(async (nombre, def, params, viejo) => {
  app.classList.toggle('sin-nav', !!def.sinNav);
  if (def.sinNav) aplicarClub(null); else pintarNav(nav, nombre, params);
  document.title = `${def.titulo} · FC26 Career Hub`;
  const el = document.createElement('div'); // contenedor nuevo por pantalla: sin listeners viejos
  vista.replaceChildren(el);
  scrollTo(0, 0);
  try { await def.render(el, params, viejo); }
  catch (e) {
    console.error(e);
    if (!viejo()) el.innerHTML = `<div class="vacio error" role="alert"><h2 class="h2">Algo falló</h2><p>${String(e.message).replace(/</g, '&lt;')}</p><a class="btn secundario" href="#/inicio">Ir al inicio</a></div>`;
  }
  if (!viejo()) vista.focus({preventScroll: true});
});
resolver();
mejorarSelects(document.body);
