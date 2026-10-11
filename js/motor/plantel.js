// Plantel de la carrera: altas, bajas y ficha (media, contrato, sueldo).
// La base de Transfermarkt no se toca: todo queda guardado en la carrera.

export function sacarDelPlantel(carrera, id) {
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  if (!carrera.plantilla?.includes(id)) throw new Error('Ese jugador no está en el plantel');
  if (carrera.plantilla.length <= 1) throw new Error('Tiene que quedar al menos un jugador');
  return {
    ...carrera,
    plantilla: carrera.plantilla.filter(x => x !== id),
    incorporados: (carrera.incorporados || []).filter(j => j.id !== id),
  };
}

function fichaMinima(j) {
  if (!j?.id || !j?.nombre) throw new Error('Falta el jugador');
  const crudo = j.ovr ?? j.ea?.ovr ?? null;
  const ovr = crudo === '' || crudo == null || Number.isNaN(Number(crudo)) ? null : Number(crudo);
  const sueldo = j.sueldoM === '' || j.sueldoM == null || Number.isNaN(Number(j.sueldoM)) ? null : Number(j.sueldoM);
  return {
    id: j.id, nombre: j.nombre, pos: j.pos || 'MC', posSec: j.posSec || [],
    edad: j.edad ?? null, nac: j.nac ?? null, nacCodigo: j.nacCodigo ?? null,
    valorM: j.valorM ?? null, dorsal: j.dorsal ?? null, contratoHasta: j.contratoHasta || null,
    sueldoM: sueldo, verificado: false, manual: !!j.manual,
    clubOrigen: j.clubOrigen || null,
    ea: ovr != null ? {...(j.ea || {}), ovr: Number(ovr)} : (j.ea || null),
  };
}

/** copia=false cuando el jugador ya está en el JSON del club y solo hay que devolverlo al plantel. */
export function sumarAlPlantel(carrera, jugador, {copia = true} = {}) {
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  if (!jugador?.id) throw new Error('Falta el jugador');
  if (carrera.plantilla?.includes(jugador.id)) throw new Error('Ya está en el plantel');
  const plantilla = [...(carrera.plantilla || []), jugador.id];
  if (!copia) return {...carrera, plantilla};
  const j = fichaMinima(jugador);
  return {...carrera, plantilla, incorporados: [...(carrera.incorporados || []).filter(x => x.id !== j.id), j]};
}

function entero(v, min, max, etiqueta) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${etiqueta} tiene que ser un entero entre ${min} y ${max}`);
  return n;
}
function decimal(v, min, max, etiqueta) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${etiqueta} tiene que estar entre ${min} y ${max}`);
  return Math.round(n * 10) / 10;
}

export function editarFicha(carrera, id, cambios = {}) {
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  if (!carrera.plantilla?.includes(id)) throw new Error('Ese jugador no está en el plantel');
  const prev = {...(carrera.ajustes?.[id] || {})};
  if ('ovr' in cambios) {
    const n = entero(cambios.ovr, 40, 99, 'La media');
    if (n == null) delete prev.ovr; else prev.ovr = n;
  }
  if ('contratoHasta' in cambios) {
    const c = cambios.contratoHasta;
    if (!c) delete prev.contratoHasta;
    else if (!/^\d{4}-\d{2}$/.test(c)) throw new Error('El contrato se carga como año y mes, por ejemplo 2028-06');
    else prev.contratoHasta = c;
  }
  if ('sueldoM' in cambios) {
    const n = decimal(cambios.sueldoM, 0, 80, 'El sueldo');
    if (n == null) delete prev.sueldoM; else prev.sueldoM = n;
  }
  const ajustes = {...(carrera.ajustes || {}), [id]: prev};
  const incorporados = (carrera.incorporados || []).map(j => j.id !== id ? j : {
    ...j,
    ...(prev.contratoHasta ? {contratoHasta: prev.contratoHasta} : {}),
    ...(prev.sueldoM != null ? {sueldoM: prev.sueldoM} : {}),
    ...(prev.ovr != null ? {ea: {...(j.ea || {}), ovr: prev.ovr}} : {}),
  });
  return {...carrera, ajustes, incorporados};
}

export function temporadaPrevia(temporada) {
  const m = String(temporada || '').match(/^(\d{4})\/(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  return `${y - 1}/${String(y % 100).padStart(2, '0')}`;
}

/** Reemplaza el rendimiento de una temporada. Cada fila: {goles, asistencias, vallas, nota}. */
export function cargarRendimiento(carrera, temporada, filas) {
  if (carrera.estado?.finalizada) throw new Error('La carrera terminó');
  if (!/^\d{4}\/\d{2}$/.test(temporada || '')) throw new Error('Temporada inválida');
  const out = {};
  for (const [id, s] of Object.entries(filas || {})) {
    if (!s) continue;
    const goles = entero(s.goles, 0, 80, 'Los goles');
    const asistencias = entero(s.asistencias, 0, 60, 'Las asistencias');
    const vallas = entero(s.vallas, 0, 50, 'Las vallas invictas');
    const nota = s.nota === '' || s.nota == null ? null : decimal(s.nota, 0, 10, 'La valoración');
    if (goles == null && asistencias == null && vallas == null && nota == null) continue;
    out[id] = {goles: goles ?? 0, asistencias: asistencias ?? 0, vallas: vallas ?? 0, nota};
  }
  return {...carrera, rendimiento: {...(carrera.rendimiento || {}), [temporada]: out}};
}
