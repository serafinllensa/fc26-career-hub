// Router por hash (#/ruta?param=valor): funciona en GitHub Pages sin configurar el servidor.
const rutas = new Map();
let alCambiar = () => {};
export const ruta = (nombre, def) => rutas.set(nombre, def);
export const onCambio = fn => { alCambiar = fn; };

export function actual(){
  const [camino, q = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return {nombre: camino || 'inicio', params: Object.fromEntries(new URLSearchParams(q))};
}
export const href = (nombre, params) => '#/' + nombre + (params && Object.keys(params).length ? '?' + new URLSearchParams(params) : '');
export const ir = (nombre, params) => { location.hash = href(nombre, params); };

let turno = 0;
export async function resolver(){
  document.querySelector(".hoja-fondo")?.remove(); // cierra hojas o modales abiertos al cambiar de pantalla
  const yo = ++turno, {nombre, params} = actual();
  const def = rutas.get(nombre) || rutas.get('404');
  await alCambiar(nombre, def, params, () => yo !== turno); // el último callback indica si la navegación quedó vieja
}
window.addEventListener('hashchange', resolver);
