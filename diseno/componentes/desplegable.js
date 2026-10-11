/* Desplegable con estilo FC (reemplazo de <select>). Diseño FC.
 * Uso: const d = desplegable({etiqueta:'Ordenar', opciones:[{valor:'pos',texto:'Por posición'},...], valor:'pos', alCambiar:v=>{...}});
 *      contenedor.append(d.el);   d.valor  /  d.setValor('ovr')
 * Teclado (patrón ARIA listbox): Enter/Espacio/↓ abre · ↑↓ mueve · Home/End · letra salta · Enter elige · Esc cierra · Tab sale.
 * Celular: la lista abre como hoja de abajo (CSS). Se cierra tocando afuera.
 */
let n = 0;
export function desplegable({etiqueta = '', opciones, valor, alCambiar = () => {}, buscar = false, placeholder = 'Buscar…'}) {
  const todas = opciones;
  const id = 'desp' + (++n);
  const el = document.createElement('div'); el.className = 'desp';
  el.innerHTML = `<button type="button" class="desp-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}">${etiqueta ? `<small>${etiqueta}</small>` : ''}<span></span></button><div class="desp-pop" hidden>${buscar ? `<input class="desp-buscar" type="search" placeholder="${placeholder}" aria-controls="${id}" autocomplete="off">` : ''}<ul class="desp-lista" role="listbox" id="${id}" tabindex="-1" ${etiqueta ? `aria-label="${etiqueta}"` : ''}></ul></div>`;
  const btn = el.querySelector('button'), txt = btn.querySelector('span'), lista = el.querySelector('ul'), pop = el.querySelector('.desp-pop'), inp = el.querySelector('.desp-buscar');
  let actual = valor ?? todas[0].valor, activo = 0;
  const pintar = () => {
    lista.innerHTML = opciones.length ? opciones.map((o, i) => `${o.grupo && (i === 0 || opciones[i - 1].grupo !== o.grupo) ? `<li class="desp-grupo" role="presentation">${o.grupo}</li>` : ''}<li role="option" id="${id}-${i}" aria-selected="${o.valor === actual}" data-i="${i}">${o.texto}${o.extra ? `<small>${o.extra}</small>` : ''}</li>`).join('') : '<li class="desp-vacio" role="presentation">Sin resultados</li>';
    txt.textContent = (todas.find(o => o.valor === actual) || todas[0]).texto;
  };
  const marcar = i => { activo = (i + opciones.length) % opciones.length; lista.querySelectorAll('li[role=option]').forEach((li, k) => li.classList.toggle('activo', k === activo)); lista.setAttribute('aria-activedescendant', `${id}-${activo}`); document.getElementById(`${id}-${activo}`)?.scrollIntoView({block: 'nearest'}); };
  const abrir = () => { pop.hidden = false; if (inp) { inp.value = ''; opciones = todas; pintar(); } el.dataset.abierto = ''; btn.setAttribute('aria-expanded', 'true'); marcar(Math.max(0, opciones.findIndex(o => o.valor === actual))); (inp || lista).focus(); };
  const cerrar = (foco = true) => { pop.hidden = true; delete el.dataset.abierto; btn.setAttribute('aria-expanded', 'false'); if (foco) btn.focus(); };
  const elegir = i => { const o = opciones[i]; if (!o) return; if (o.valor !== actual) { actual = o.valor; pintar(); alCambiar(actual); } cerrar(); };
  btn.addEventListener('click', () => pop.hidden ? abrir() : cerrar());
  btn.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); } });
  lista.addEventListener('click', e => { const li = e.target.closest('li'); if (li) elegir(+li.dataset.i); });
  lista.addEventListener('mousemove', e => { const li = e.target.closest('li'); if (li) marcar(+li.dataset.i); });
  const teclas = e => {
    const k = e.key;
    if (k === 'ArrowDown') marcar(activo + 1); else if (k === 'ArrowUp') marcar(activo - 1);
    else if (k === 'Home') marcar(0); else if (k === 'End') marcar(opciones.length - 1);
    else if (k === 'Enter' || k === ' ') elegir(activo);
    else if (k === 'Escape') cerrar(); else if (k === 'Tab') { cerrar(false); return; }
    else if (k.length === 1) { const i = opciones.findIndex((o, j) => j > activo && o.texto.toLowerCase().includes(k.toLowerCase())); const j = i >= 0 ? i : opciones.findIndex(o => o.texto.toLowerCase().includes(k.toLowerCase())); if (j >= 0) marcar(j); return; }
    else return;
    e.preventDefault();
  };
  lista.addEventListener('keydown', teclas);
  if (inp) {
    inp.addEventListener('input', () => { const q = inp.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); opciones = todas.filter(o => (o.texto + ' ' + (o.grupo || '') + ' ' + (o.extra || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q)); pintar(); marcar(0); });
    inp.addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Home', 'End', 'Tab'].includes(e.key)) teclas(e); });
  }
  document.addEventListener('pointerdown', e => { if (!el.contains(e.target) && !pop.hidden) cerrar(false); });
  pintar();
  return {el, get valor() { return actual; }, setValor(v) { actual = v; pintar(); }};
}
