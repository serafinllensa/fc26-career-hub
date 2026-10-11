/* Avisos con estilo FC (reemplazo de alert y confirm). Diseño FC.
 * aviso('Venta registrada', {tipo:'ok'|'alerta'|'peligro'|'info', ms:3500})  -> toast abajo, no bloquea, lo lee el lector de pantalla
 * await confirmar({titulo, texto, si:'Registrar igual', no:'Cancelar', peligro:true}) -> true/false. Esc o tocar afuera = false
 */
let zona;
export function aviso(texto, {tipo = 'info', ms = 3500} = {}) {
  if (!zona) { zona = document.createElement('div'); zona.className = 'avisos'; zona.setAttribute('role', 'status'); zona.setAttribute('aria-live', 'polite'); document.body.append(zona); }
  const t = document.createElement('div'); t.className = `aviso-toast ${tipo}`; t.textContent = texto;
  zona.append(t); setTimeout(() => { t.classList.add('sale'); setTimeout(() => t.remove(), 200); }, ms);
}
let abierto = false;
export function confirmar({titulo = '¿Seguro?', texto = '', si = 'Confirmar', no = 'Cancelar', peligro = false} = {}) {
  // Un segundo llamado mientras hay un diálogo abierto no apila otro.
  // Si no, cada clic de más en "Borrar" dejaba un diálogo nuevo y había que confirmarlos todos.
  if (abierto) return Promise.resolve(false);
  abierto = true;
  return new Promise(res => {
    const prev = document.activeElement;
    const f = document.createElement('div'); f.className = 'dialogo-fondo';
    f.innerHTML = `<div class="dialogo tarjeta brillo" role="alertdialog" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-x"><h2 class="h2" id="dlg-t"></h2><p class="meta" id="dlg-x"></p><div class="dialogo-acc"><button type="button" class="btn secundario" data-no></button><button type="button" class="btn ${peligro ? 'peligro-txt' : 'primario'}" data-si></button></div></div>`;
    f.querySelector('#dlg-t').textContent = titulo; f.querySelector('#dlg-x').textContent = texto;
    f.querySelector('[data-no]').textContent = no; f.querySelector('[data-si]').textContent = si;
    const fin = v => { if (!abierto) return; abierto = false; f.remove(); document.removeEventListener('keydown', k); prev?.focus?.(); res(v); };
    const k = e => { if (e.key === 'Escape') fin(false); if (e.key === 'Tab') { const b = [...f.querySelectorAll('button')]; const i = b.indexOf(document.activeElement); e.preventDefault(); b[(i + (e.shiftKey ? -1 : 1) + b.length) % b.length].focus(); } };
    f.addEventListener('pointerdown', e => { if (e.target === f) fin(false); });
    f.querySelector('[data-no]').onclick = e => { e.stopPropagation(); fin(false); };
    f.querySelector('[data-si]').onclick = e => { e.stopPropagation(); fin(true); };
    document.addEventListener('keydown', k); document.body.append(f); f.querySelector('[data-no]').focus();
  });
}

/** Cartel al centro: lo que dice el presidente o el DT. No es un toast escondido. */
const TONOS = new Set(['ok', 'alerta', 'peligro', 'info', 'no', 'renovar']);
export function cartel({quien = '', cargo = '', texto = '', tono = 'info'} = {}) {
  return new Promise(res => {
    const f = document.createElement('div');
    const tonoClase = TONOS.has(tono) ? tono : 'info';
    f.className = 'dialogo-fondo cartel-fondo';
    f.innerHTML = `<div class="cartel tarjeta brillo ${tonoClase}" role="dialog" aria-modal="true" aria-labelledby="cartel-q"><div class="cartel-avatar" aria-hidden="true"></div><div class="etiqueta" id="cartel-q"></div><h2 class="h2 cartel-quien"></h2><p class="cita"></p><button type="button" class="btn primario">Entendido</button></div>`;
    const ini = String(quien || cargo || '?').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
    f.querySelector('.cartel-avatar').textContent = ini || '·';
    f.querySelector('.etiqueta').textContent = cargo || 'Mensaje';
    f.querySelector('.cartel-quien').textContent = quien || cargo || '';
    f.querySelector('.cita').textContent = texto ? `“${texto}”` : '';
    const fin = () => { f.classList.add('sale'); setTimeout(() => { f.remove(); document.removeEventListener('keydown', k); res(); }, 220); };
    const k = e => { if (e.key === 'Escape' || e.key === 'Enter') fin(); };
    f.addEventListener('pointerdown', e => { if (e.target === f) fin(); });
    f.querySelector('button').onclick = e => { e.stopPropagation(); fin(); };
    document.addEventListener('keydown', k);
    document.body.append(f);
    f.querySelector('button').focus();
  });
}
const vistos = new Set();
export function cartelSiNuevo(id, datos) {
  if (!id || vistos.has(id)) return Promise.resolve();
  vistos.add(id);
  return cartel(datos);
}
