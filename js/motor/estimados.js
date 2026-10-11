// Motor FC: estimados de presupuesto y masa salarial. Nunca son datos reales: siempre rango + etiqueta "estimado".
import {REGLAS} from './dificultades.js';

export const FACTOR_PRESUPUESTO = {5: 0.15, 4: 0.12, 3: 0.10, 2: 0.08, 1: 0.06};
export const FACTOR_MASA = {5: 0.28, 4: 0.30, 3: 0.32, 2: 0.35, 1: 0.38};
export const PISO_PRESUPUESTO_M = 5;
export const PISO_MASA_M = 15;
export const MARGEN = 0.12; // ±12% alrededor del valor central
const AJUSTE_PRESIDENTE = {mecenas: 1.2, austero: 0.8};

function redondear(x) {
  if (x >= 100) return Math.round(x / 10) * 10;
  if (x >= 20) return Math.round(x / 5) * 5;
  return Math.max(0, Math.round(x));
}
export function rango(central) {
  if (central == null || Number.isNaN(central)) return null;
  const min = redondear(central * (1 - MARGEN)), max = redondear(central * (1 + MARGEN));
  return {min, max: Math.max(min, max), central: +central.toFixed(1), estimado: true};
}
export function textoRango(r) {
  if (!r) return 'Sin dato (estimado no disponible)';
  if (r.max === 0) return "0 M€ fijos (solo ventas)";
  return r.min === r.max ? `≈ ${r.min} M€ (estimado)` : `≈ ${r.min}–${r.max} M€ (estimado)`;
}

/** club: {nivel, valorPlantillaM, presidente:{perfil}, presupuestoFichajesM?, masaSalarialM?} */
export function finanzas(club, dificultad) {
  const r = REGLAS[dificultad];
  if (!r) throw new Error(`Dificultad inválida: ${dificultad}`);
  const v = club.valorPlantillaM;
  const perfil = club.presidente?.perfil;
  // Si Datos FC algún día trae el dato real con fuente, se usa ese y no se estima.
  const baseP = club.presupuestoFichajesM ?? (v == null ? null : Math.max(PISO_PRESUPUESTO_M, v * FACTOR_PRESUPUESTO[club.nivel]) * (AJUSTE_PRESIDENTE[perfil] || 1));
  const baseM = club.masaSalarialM ?? (v == null ? null : Math.max(PISO_MASA_M, v * FACTOR_MASA[club.nivel]));
  const presupuesto = baseP == null ? null : (r.presupuesto === 0 ? {min: 0, max: 0, central: 0, estimado: true} : rango(baseP * r.presupuesto));
  const tope = baseM == null ? null : rango(baseM * r.tope);
  return {
    presupuesto, topeSalarial: tope, masaActual: baseM == null ? null : rango(baseM),
    reinvierteVentas: r.reinvierteVentas, exigeSaldoVentasPositivo: perfil === 'fondo',
    texto: {presupuesto: textoRango(presupuesto), topeSalarial: textoRango(tope)},
  };
}
