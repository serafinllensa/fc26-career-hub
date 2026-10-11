// Motor FC: charla táctica con el DT. Usa lo que tiene fuente: sus formaciones (Transfermarkt) y su nivel.
// La filosofía queda vacía en dts.json (sin fuente citable), así que el estilo nunca se inventa: si no hay dato, el DT es neutral.
import {etiquetasFilosofia} from './dts.js';
const clamp = (x, a, b) => Math.round(Math.max(a, Math.min(b, x)) * 10) / 10; // un decimal, sin arrastre de flotantes
export const ESTILOS = ['posesion', 'presion-alta', 'transiciones', 'contragolpe', 'bloque-bajo', 'juego-directo'];

const defensas = f => parseInt(String(f).trim()[0], 10) || null; // 4-2-3-1 -> 4, 3-5-2 -> 3
const limpia = f => String(f).toLowerCase().replace(/\s+/g, ' ').trim();

/** El DT reacciona a una propuesta {formacion, estilo}. Devuelve {reaccion: 'acepta'|'discute'|'resiste', texto, motivos[], respuestas[]} */
export function proponerTactica(carrera, dt, {formacion, estilo = null}) {
  if (!formacion) throw new Error('Falta la formación');
  if (estilo && !ESTILOS.includes(estilo)) throw new Error(`Estilo inválido: ${estilo}`);
  const motivos = [];
  const suyas = (dt?.formaciones || []).map(limpia);
  const relacion = carrera.relacionDT ?? 60;
  let puntos = 0;
  if (!suyas.length) motivos.push('No hay formación preferida registrada para este DT');
  else if (suyas.includes(limpia(formacion))) { puntos += 3; motivos.push(`Es su formación preferida (${dt.formaciones[0]})`); }
  else if (suyas.some(s => defensas(s) === defensas(formacion))) { puntos += 1; motivos.push(`Misma línea de ${defensas(formacion)} atrás que su ${dt.formaciones[0]}`); }
  else { puntos -= 2; motivos.push(`Él juega con ${defensas(suyas[0])} atrás (${dt.formaciones[0]}) y le proponés ${defensas(formacion)}`); }
  const fil = etiquetasFilosofia(dt);
  if (estilo && fil.length) { if (fil.includes(estilo)) { puntos += 2; motivos.push('El estilo va con su idea'); } else { puntos -= 1; motivos.push('El estilo no es el suyo'); } }
  else if (estilo) motivos.push('Sin dato de su filosofía: no opina sobre el estilo');
  const terco = (dt?.nivel ?? 3) >= 4 ? 1 : 0; // los DTs de élite ceden menos
  puntos += relacion >= 70 ? 1 : relacion < 40 ? -1 : 0;
  puntos -= terco;
  const reaccion = puntos >= 2 ? 'acepta' : puntos >= 0 ? 'discute' : 'resiste';
  const nom = dt?.nombre ?? 'El DT';
  const texto = reaccion === 'acepta' ? `${nom}: "Me gusta. Con eso me siento cómodo."`
    : reaccion === 'discute' ? `${nom}: "Lo puedo probar, pero no me convence del todo."`
    : `${nom}: "No lo veo. Este plantel está armado para otra cosa."`;
  const respuestas = reaccion === 'acepta'
    ? [{id: 'confirmar', texto: 'Perfecto, vamos con eso.', efectos: {relacion: +2, vestuario: +1}}]
    : [
      {id: 'insistir', texto: 'Lo decidí: jugamos así.', efectos: {relacion: reaccion === 'resiste' ? -8 : -3, vestuario: -2}, aplica: 'propuesta'},
      {id: 'probar', texto: 'Probemos 3 partidos y lo evaluamos juntos.', efectos: {relacion: +1, vestuario: 0}, aplica: 'prueba'},
      {id: 'ceder', texto: 'Tenés razón, seguimos con tu idea.', efectos: {relacion: +4, vestuario: +1}, aplica: 'suya'},
    ];
  return {reaccion, texto, motivos, respuestas, propuesta: {formacion, estilo}, formacionDT: dt?.formaciones?.[0] ?? null};
}

export function cerrarCharlaTactica(carrera, charla, respuestaId) {
  const r = charla.respuestas.find(x => x.id === respuestaId);
  if (!r) throw new Error('Respuesta inexistente');
  const tactica = r.aplica === 'suya'
    ? {formacion: charla.formacionDT ?? charla.propuesta.formacion, estilo: charla.propuesta.estilo, acordada: true}
    : r.aplica === 'prueba'
      ? {...charla.propuesta, acordada: false, pruebaHasta: carrera.partidos.length + 3, formacionDT: charla.formacionDT}
      : {...charla.propuesta, acordada: r.id === 'confirmar', impuesta: r.id === 'insistir'};
  return {
    ...carrera, tactica,
    relacionDT: clamp((carrera.relacionDT ?? 60) + (r.efectos.relacion || 0), 0, 100),
    confianza: {...carrera.confianza, vestuario: clamp(carrera.confianza.vestuario + (r.efectos.vestuario || 0), 0, 100)},
  };
}

/** Al terminar la prueba de 3 partidos: si sumó 5+ puntos, el DT la adopta; si no, vuelve a la suya. */
export function evaluarPrueba(carrera) {
  const t = carrera.tactica;
  if (!t?.pruebaHasta || carrera.partidos.length < t.pruebaHasta) return {carrera, resultado: null};
  const ult = carrera.partidos.slice(-3);
  const pts = ult.reduce((s, p) => s + (p.gf > p.gc ? 3 : p.gf === p.gc ? 1 : 0), 0);
  const ok = pts >= 5;
  return {
    carrera: {...carrera, tactica: ok ? {...t, acordada: true, pruebaHasta: null} : {...t, formacion: t.formacionDT ?? t.formacion, acordada: true, pruebaHasta: null}, relacionDT: clamp((carrera.relacionDT ?? 60) + (ok ? 3 : -2), 0, 100)},
    resultado: {ok, puntos: pts, texto: ok ? `La prueba salió bien (${pts} de 9): el DT la adopta.` : `La prueba no convenció (${pts} de 9): volvemos a su idea.`},
  };
}
