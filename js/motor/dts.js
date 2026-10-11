// Motor FC: sugerencia de los 5 DTs más afines a un club. Formato de dts.json del BRIEF.
// La filosofía puede venir como texto ('posesion') o como ficha con fuente ({valor|tag|id, fuente}). Sin fuente no cuenta.
export function etiquetasFilosofia(dt) {
  return (dt?.filosofia || []).map(f => (typeof f === 'string' ? f : f && (f.fuente || f.url) ? (f.valor ?? f.tag ?? f.id) : null)).filter(Boolean);
}
export const esLibre = dt => dt.estado === 'libre' || !dt.clubActual;
export const PESOS = {dirigio: 40, jugo: 25, nivel: 15, filosofia: 12, liga: 5, libre: 3};

function nivelAfinidad(dtNivel, clubNivel) {
  if (dtNivel == null || clubNivel == null) return 0;
  const d = dtNivel - clubNivel;
  if (d === 0) return 1;
  if (d === 1) return 0.8;       // un DT un poco "grande" para el club suma
  if (d === -1) return 0.6;
  if (d === 2) return 0.3;       // muy grande: difícil que acepte
  return 0;
}

/** Puntaje 0–100 y motivos legibles de por qué el DT encaja. */
export function afinidad(dt, club) {
  const motivos = [];
  let p = 0;
  if ((dt.clubesDirigidos || []).includes(club.id)) { p += PESOS.dirigio; motivos.push(`Ya dirigió al ${club.corto || club.nombre}`); }
  if ((dt.clubesJugados || []).includes(club.id)) { p += PESOS.jugo; motivos.push(`Jugó en el ${club.corto || club.nombre}`); }
  const n = nivelAfinidad(dt.nivel, club.nivel);
  if (n > 0) { p += PESOS.nivel * n; if (n >= 0.8) motivos.push('Su nivel va con el del club'); }
  const fil = etiquetasFilosofia(dt), est = club.estilo || [];
  const comunes = fil.filter(t => est.includes(t));
  if (est.length && comunes.length) { p += PESOS.filosofia * Math.min(1, comunes.length / Math.min(est.length, 2)); motivos.push(`Comparte la idea de juego: ${comunes.join(', ')}`); }
  else if (!est.length && fil.length && club.identidad?.length) {
    // Sin estilo cargado para el club, se cruza con su identidad (ej. cantera -> DT que promueve juveniles).
    const PUENTE = {cantera: 'juveniles', 'juego-de-posicion': 'posesion', 'presion-alta': 'presion-alta'};
    const c2 = club.identidad.map(t => PUENTE[t]).filter(t => t && fil.includes(t));
    if (c2.length) { p += PESOS.filosofia * 0.5; motivos.push(`Va con la identidad del club: ${c2.join(', ')}`); }
  }
  if (club.ligaClubes && (dt.clubesDirigidos || []).some(id => club.ligaClubes.includes(id) && id !== club.id)) { p += PESOS.liga; motivos.push('Conoce la liga'); }
  if (esLibre(dt)) { p += PESOS.libre; motivos.push('Está libre'); }
  return {puntaje: Math.round(p * 10) / 10, motivos};
}

/** Top N (por defecto 5). Empates: más nivel, después nombre. No incluye al DT actual del club. */
export function sugerirDTs(club, dts, n = 5, {incluirActual = false} = {}) {
  return dts
    .filter(dt => incluirActual || dt.clubActual !== club.id)
    .map(dt => ({dt, ...afinidad(dt, club)}))
    .sort((a, b) => b.puntaje - a.puntaje || (b.dt.nivel || 0) - (a.dt.nivel || 0) || a.dt.nombre.localeCompare(b.dt.nombre))
    .slice(0, n);
}

/** Sorteo de DT entre los afines (con semilla opcional para reproducir). */
export function sortearDT(club, dts, rnd = Math.random) {
  const top = sugerirDTs(club, dts, 10);
  if (!top.length) return null;
  return top[Math.floor(rnd() * top.length)].dt;
}
