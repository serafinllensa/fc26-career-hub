// Reemplaza cada <select> de la app por el desplegable con estilo FC, sin tocar la lógica de cada pantalla:
// el <select> queda oculto como fuente de verdad, y al elegir se le cambia el valor y se dispara 'change'.
import {desplegable} from './desplegable.js';

const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
function mejorar(sel){
  if (sel.dataset.desp) return; sel.dataset.desp = '1';
  const opciones = [];
  for (const n of sel.children) {
    const op = (o, grupo) => ({valor: o.value, texto: esc(o.textContent), extra: o.dataset.extra ? esc(o.dataset.extra) : '', grupo});
    if (n.tagName === 'OPTGROUP') { for (const o of n.children) opciones.push(op(o, esc(n.label))); }
    else opciones.push(op(n));
  }
  if (!opciones.length) return;
  const buscar = sel.dataset.buscar !== undefined || opciones.length > 15;
  const d = desplegable({etiqueta: sel.dataset.etiqueta || '', opciones, valor: sel.value, buscar, placeholder: sel.dataset.buscar || 'Buscar…', alCambiar: v => { sel.value = v; sel.dispatchEvent(new Event('change', {bubbles: true})); sel.dispatchEvent(new Event('input', {bubbles: true})); }});
  const caja = sel.closest('label.campo') || sel;
  d.el.style.cssText = caja.getAttribute('style') || '';
  if (caja.style.flexGrow !== '0') d.el.style.width = d.el.style.width || '100%';
  d.el.querySelector('.desp-btn').setAttribute('aria-label', sel.getAttribute('aria-label') || '');
  caja.after(d.el); caja.hidden = true; caja.style.display = 'none';
}
export function mejorarSelects(raiz = document.body){
  raiz.querySelectorAll('select:not([data-desp])').forEach(mejorar);
  new MutationObserver(() => raiz.querySelectorAll('select:not([data-desp])').forEach(mejorar)).observe(raiz, {childList: true, subtree: true});
}
