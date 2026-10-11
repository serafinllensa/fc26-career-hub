// Tests del Motor FC. Correr con: node tests.js
// Los DTs y clubes de acá son DATOS DE PRUEBA inventados para testear la lógica, no van a la app.
const assert = require('node:assert/strict');
let ok = 0, fallos = 0;
async function t(nombre, fn) { try { await fn(); ok++; console.log('  ✔', nombre); } catch (e) { fallos++; console.log('  ✘', nombre, '\n    ', e.message); } }

(async () => {
  const M = await import('./js/motor/index.js');
  const RM = {id: 'real-madrid', nombre: 'Real Madrid', corto: 'Real Madrid', liga: 'LaLiga', nivel: 5, valorPlantillaM: 1500, presidente: {perfil: 'politico'}, estilo: ['posesion', 'transiciones']};
  const ASC = {id: 'ascendido-test', nombre: 'Ascendido Test', liga: 'Serie A', nivel: 1, valorPlantillaM: 80, presidente: {perfil: 'austero'}, estilo: ['bloque-bajo']};
  const ids = c => M.objetivos(c.club ?? c, c.dif).map(o => o.id);

  console.log('Dificultades');
  await t('todas las combinaciones nivel x dificultad dan objetivos', () => {
    for (const nivel of [1, 2, 3, 4, 5]) for (const d of M.DIFICULTADES) {
      const o = M.objetivos({nivel, liga: 'LaLiga'}, d);
      assert.ok(o.length >= 1 && o[0].principal && o[0].tipo === 'liga');
    }
  });
  await t('la exigencia de liga nunca baja al subir la dificultad', () => {
    for (const nivel of [1, 2, 3, 4, 5]) {
      const idx = M.DIFICULTADES.map(d => M.ESCALONES_LIGA.findIndex(e => e.id === M.objetivos({nivel, liga: 'LaLiga'}, d)[0].id));
      for (let i = 1; i < idx.length; i++) assert.ok(idx[i] >= idx[i - 1], `nivel ${nivel}: ${idx}`);
    }
  });
  await t('medio: N5 liga + semis + copa (pedido de Serafin), N1 permanencia', () => {
    assert.deepEqual(ids({club: RM, dif: 'medio'}), ['titulo', 'ucl-semis', 'copa-titulo']);
    assert.deepEqual(ids({club: ASC, dif: 'medio'}), ['permanencia']);
  });
  await t('hardcore Real Madrid: liga, semis y Copa del Rey', () => {
    const o = M.objetivos(RM, 'hardcore');
    assert.deepEqual(o.map(x => x.id), ['titulo', 'ucl-semis', 'copa-titulo']);
    assert.match(o[2].texto, /Copa del Rey/);
  });
  await t('leyenda Real Madrid: triplete', () => assert.deepEqual(ids({club: RM, dif: 'leyenda'}), ['titulo', 'ucl-titulo', 'copa-titulo']));
  await t('hardcore ascendido: salvarse + cuartos de Coppa Italia', () => {
    const o = M.objetivos(ASC, 'hardcore');
    assert.deepEqual(o.map(x => x.id), ['top12', 'copa-cuartos']);
    assert.match(o[1].texto, /Coppa Italia/);
  });
  await t('leyenda N1: solo top 10, sin copa (ajuste Donato)', () => assert.deepEqual(ids({club: ASC, dif: 'leyenda'}), ['top10']));
  await t('fácil baja un escalón', () => assert.deepEqual(ids({club: {nivel: 4, liga: 'Bundesliga'}, dif: 'facil'}), ['europa', 'ucl-fase', 'copa-cuartos']));
  await t('nivel o dificultad inválidos tiran error', () => {
    assert.throws(() => M.objetivos({nivel: 6}, 'medio'));
    assert.throws(() => M.objetivos({nivel: 3}, 'imposible'));
  });

  console.log('Restricciones');
  await t('hardcore: +30 solo bloquea fichajes', () => {
    assert.equal(M.puedeFichar('hardcore', {edad: 31}).ok, false);
    assert.equal(M.puedeFichar('hardcore', {edad: 30}).ok, true);
    assert.match(M.restricciones('hardcore').find(r => r.id === 'edad-fichajes').texto, /plantilla actual no cuenta/);
  });
  await t('fácil no tiene restricciones', () => assert.equal(M.restricciones('facil').length, 0));
  await t('cupo de altas por ventana', () => {
    assert.equal(M.puedeFichar('dificil', {edad: 24, altasEnVentana: 4}).ok, false);
    assert.equal(M.puedeFichar('dificil', {edad: 24, altasEnVentana: 3}).ok, true);
    assert.equal(M.puedeFichar('leyenda', {edad: 24, altasEnVentana: 2}).ok, false);
  });
  await t('tope de sueldo individual', () => {
    assert.equal(M.puedeFichar('hardcore', {edad: 25, sueldoM: 21, sueldoMasAltoM: 20}).ok, false);
    assert.equal(M.puedeFichar('medio', {edad: 25, sueldoM: 29, sueldoMasAltoM: 20}).ok, true);
  });
  await t('leyenda: sub-21, ídolos y solo ventas', () => {
    const r = M.restricciones('leyenda').map(x => x.id);
    for (const id of ['solo-ventas', 'sub21', 'idolos', 'altas', 'edad-fichajes']) assert.ok(r.includes(id), id);
  });
  await t('paciencia baja con la dificultad y leyenda tiene techo 70', () => {
    const v = M.DIFICULTADES.map(d => M.paciencia(d).inicial);
    assert.deepEqual(v, [80, 65, 55, 45, 35]);
    assert.equal(M.paciencia('leyenda').techo, 70);
    assert.equal(M.paciencia('facil').despidoTemp1, false);
  });

  console.log('Estimados');
  await t('siempre rango y etiqueta "estimado"', () => {
    for (const d of M.DIFICULTADES) {
      const f = M.finanzas(RM, d);
      assert.ok(f.presupuesto.estimado && f.topeSalarial.estimado);
      if (d !== 'leyenda') assert.match(f.texto.presupuesto, /^≈ \d+–\d+ M€ \(estimado\)$/);
      assert.match(f.texto.topeSalarial, /estimado/);
    }
  });
  await t('Real Madrid medio ≈ 225 M€ de presupuesto y ≈ 420 de masa', () => {
    const f = M.finanzas(RM, 'medio');
    assert.ok(f.presupuesto.min <= 225 && f.presupuesto.max >= 225);
    assert.ok(f.masaActual.min <= 420 && f.masaActual.max >= 420);
  });
  await t('el presupuesto baja con la dificultad y leyenda es 0', () => {
    const c = M.DIFICULTADES.map(d => M.finanzas(RM, d).presupuesto.central);
    for (let i = 1; i < c.length; i++) assert.ok(c[i] < c[i - 1]);
    assert.equal(c[4], 0);
    assert.equal(M.finanzas(RM, 'leyenda').reinvierteVentas, 0.5);
  });
  await t('piso y perfil del presidente', () => {
    const f = M.finanzas({...ASC, valorPlantillaM: 20}, 'medio');
    assert.equal(f.presupuesto.central, 5 * 0.8); // piso 5 M x austero
    const mec = M.finanzas({...RM, presidente: {perfil: 'mecenas'}}, 'medio').presupuesto.central;
    assert.ok(Math.abs(mec - 270) < 0.01);
    assert.equal(M.finanzas({...RM, presidente: {perfil: 'fondo'}}, 'medio').exigeSaldoVentasPositivo, true);
  });
  await t('sin valor de plantilla no inventa nada', () => {
    const f = M.finanzas({nivel: 3, valorPlantillaM: null}, 'medio');
    assert.equal(f.presupuesto, null);
    assert.match(f.texto.presupuesto, /Sin dato/);
  });
  await t('si hay dato real con fuente, se usa ese', () => assert.equal(M.finanzas({...RM, presupuestoFichajesM: 100}, 'medio').presupuesto.central, 100));

  console.log('DTs');
  const DTS = [ // DATOS DE PRUEBA
    {id: 'dt-a', nombre: 'Prueba Ex Técnico', clubActual: null, clubesDirigidos: ['real-madrid'], clubesJugados: [], filosofia: ['posesion'], nivel: 5},
    {id: 'dt-b', nombre: 'Prueba Ex Jugador', clubActual: 'otro', clubesDirigidos: [], clubesJugados: ['real-madrid'], filosofia: [], nivel: 4},
    {id: 'dt-c', nombre: 'Prueba Actual', clubActual: 'real-madrid', clubesDirigidos: ['real-madrid'], clubesJugados: ['real-madrid'], filosofia: ['posesion'], nivel: 5},
    {id: 'dt-d', nombre: 'Prueba Afín', clubActual: 'x', clubesDirigidos: ['y'], clubesJugados: [], filosofia: ['posesion', 'transiciones'], nivel: 5},
    {id: 'dt-e', nombre: 'Prueba Chico', clubActual: 'z', clubesDirigidos: [], clubesJugados: [], filosofia: ['bloque-bajo'], nivel: 1},
    {id: 'dt-f', nombre: 'Prueba Medio', clubActual: 'w', clubesDirigidos: [], clubesJugados: [], filosofia: [], nivel: 3},
    {id: 'dt-g', nombre: 'Prueba Otro', clubActual: 'v', clubesDirigidos: [], clubesJugados: [], filosofia: [], nivel: 2},
  ];
  await t('devuelve 5 y excluye al DT actual del club', () => {
    const s = M.sugerirDTs(RM, DTS);
    assert.equal(s.length, 5);
    assert.ok(!s.some(x => x.dt.id === 'dt-c'));
  });
  await t('haber dirigido pesa más que haber jugado', () => {
    const s = M.sugerirDTs(RM, DTS).map(x => x.dt.id);
    assert.ok(s.indexOf('dt-a') < s.indexOf('dt-b'));
    assert.equal(s[0], 'dt-a');
  });
  await t('cada sugerencia trae motivos legibles', () => {
    const s = M.sugerirDTs(RM, DTS);
    assert.ok(s[0].motivos.some(m => /dirigió/.test(m)));
    assert.ok(s.every(x => Array.isArray(x.motivos)));
  });
  await t('al ascendido le sugiere el DT de su nivel y estilo antes que uno de élite', () => {
    const s = M.sugerirDTs(ASC, DTS).map(x => x.dt.id);
    assert.equal(s[0], 'dt-e');
    const d = s.indexOf('dt-d'); assert.ok(d === -1 || d > 0);
  });
  await t('menos de 5 DTs disponibles no rompe', () => assert.equal(M.sugerirDTs(RM, DTS.slice(0, 2)).length, 2));
  await t('el sorteo es reproducible con semilla y sale de los afines', () => {
    const a = M.sortearDT(RM, DTS, () => 0), b = M.sortearDT(RM, DTS, () => 0);
    assert.equal(a.id, b.id);
    assert.notEqual(a.id, 'dt-c');
  });

  console.log('Nivel');
  await t('cupos 9/15/22/25/25 sobre 96 y orden por puntaje', () => {
    const cl = Array.from({length: 96}, (_, i) => ({id: 'c' + i, liga: 'L' + (i % 5), valorPlantillaM: i * 10, ingresosM: i * 5, coefUEFA: i}));
    const r = M.calcularNiveles(cl, {ajustes: {}});
    const cuenta = n => r.filter(x => x.nivel === n).length;
    assert.deepEqual([5, 4, 3, 2, 1].map(cuenta), [9, 15, 22, 25, 25]);
    assert.equal(r[0].id, 'c95');
  });
  await t('ingresos y coeficiente UEFA separan a dos clubes con el mismo valor de plantilla', () => {
    const relleno = Array.from({length: 20}, (_, i) => ({id: 'r' + i, liga: i % 2 ? 'Premier League' : 'Serie A', valorPlantillaM: 100 + i * 40, ingresosM: 100 + i * 30, coefUEFA: i * 4}));
    const cl = [...relleno, {id: 'grande', liga: 'Serie A', valorPlantillaM: 500, ingresosM: 380, coefUEFA: 80}, {id: 'chico', liga: 'Premier League', valorPlantillaM: 500, ingresosM: 180, coefUEFA: 0}];
    const p = Object.fromEntries(M.puntajesNivel(cl).map(x => [x.id, x.puntaje]));
    assert.ok(p.grande > p.chico + 0.1);
  });
  await t('si falta un dato, lo informa y no lo inventa', () => {
    const r = M.puntajesNivel([{id: 'a', liga: 'X', valorPlantillaM: 10, ingresosM: null, coefUEFA: null}, {id: 'b', liga: 'X', valorPlantillaM: 20, ingresosM: null, coefUEFA: null}]);
    assert.ok(r[0].estimados.includes('ingresos'));
  });

  console.log('Objetivos en tres plazos');
  const BARCA = {id: 'fc-barcelona', nombre: 'FC Barcelona', liga: 'LaLiga', nivel: 5, identidad: ['cantera', 'club-de-socios', 'ganador-inmediato'], presidente: {perfil: 'politico'}};
  await t('Barça medio: liga, Copa del Rey, semis UCL, La Masia, regla 1:1, Champions en 5', () => {
    const o = M.objetivosPlazos(BARCA, 'medio');
    const txt = x => x.map(y => y.texto).join(' | ');
    assert.deepEqual(o.plazos, {corto: 1, mediano: 3, largo: 5});
    assert.match(txt(o.corto), /Ganar la liga/); assert.match(txt(o.corto), /Copa del Rey/); assert.match(txt(o.corto), /semis de Champions/);
    assert.match(txt(o.corto), /La Masia/); assert.match(txt(o.corto), /1:1/);
    assert.match(txt(o.largo), /Ganar la Champions al menos una vez en 5/);
    assert.ok(o.mediano.some(x => x.categoria === 'economico' && x.tope === 0.7));
  });
  await t('leyenda acorta los plazos y fácil los alarga', () => {
    assert.deepEqual(M.objetivosPlazos(BARCA, 'leyenda').plazos, {corto: 1, mediano: 2, largo: 3});
    assert.deepEqual(M.objetivosPlazos(BARCA, 'facil').plazos, {corto: 1, mediano: 4, largo: 6});
  });
  await t('fácil no pone reglas financieras como objetivo', () => assert.ok(!M.objetivosPlazos(BARCA, 'facil').corto.some(x => x.categoria === 'economico')));
  await t('vendedor: saldo de ventas y revalorizar fuerte', () => {
    const o = M.objetivosPlazos({id: 'x', liga: 'Premier League', nivel: 3, identidad: ['vendedor']}, 'medio');
    assert.ok(o.corto.some(x => x.id === 'saldo-ventas'));
    assert.equal(o.mediano.find(x => x.id === 'revalorizar').pct, 25);
  });

  console.log('Calendario');
  const ids20 = Array.from({length: 20}, (_, i) => 'k' + i);
  await t('fixture provisorio: 38 fechas, cada rival 2 veces, 19 de local', () => {
    const f = M.fixtureLiga(ids20, 'k3');
    assert.equal(f.length, 38);
    assert.equal(f.filter(p => p.local).length, 19);
    for (const r of ids20.filter(x => x !== 'k3')) assert.equal(f.filter(p => p.rivalId === r).length, 2);
    assert.ok(f.every(p => p.provisorio));
    assert.deepEqual([...new Set(f.map(p => p.jornada))].length, 38);
  });
  await t('fixture: local y visitante alternados (nadie más de 2 seguidos afuera o en casa)', () => {
    for (const id of ids20) {
      const f = M.fixtureLiga(ids20, id).sort((a, b) => a.jornada - b.jornada);
      let run = 1, max = 1;
      for (let i = 1; i < f.length; i++) { run = f[i].local === f[i - 1].local ? run + 1 : 1; max = Math.max(max, run); }
      assert.ok(max <= 2, `${id}: ${max} seguidos`);
      assert.equal(f.filter(p => p.local).length, 19);
    }
  });
  await t('si hay fixture oficial, lo usa con su fuente', () => {
    const of = {fuente: 'https://ejemplo-oficial', jornadas: [{n: 1, fecha: '2026-08-15', partidos: [{local: 'a', visitante: 'b'}]}, {n: 2, fecha: '2026-08-22', partidos: [{local: 'c', visitante: 'a'}]}]};
    const f = M.fixtureLiga(['a', 'b', 'c'], 'a', of);
    assert.deepEqual(f.map(p => [p.rivalId, p.local, p.fecha]), [['b', true, '2026-08-15'], ['c', false, '2026-08-22']]);
    assert.equal(f[0].provisorio, false);
  });
  const P = (j, gf, gc, extra = {}) => ({id: 'p' + j, comp: 'liga', jornada: j, rivalId: 'r' + j, local: j % 2 === 0, gf, gc, goleadores: [], ...extra});
  await t('valida el formato de partido de Frontend', () => {
    assert.deepEqual(M.validarPartido(P(1, 2, 1)), []);
    assert.ok(M.validarPartido({...P(1, 1, 0), comp: 'amistoso'}).length);
    assert.ok(M.validarPartido({...P(1, 1, 0), local: 'si'}).length);
    assert.ok(M.validarPartido({...P(1, 1, 0), goleadores: ['a', 'b']}).length);
  });
  await t('resumen, forma, racha y goleadores', () => {
    const ps = [P(1, 2, 0, {goleadores: ['x', 'y']}), P(2, 1, 1, {goleadores: ['x']}), P(3, 0, 1), P(4, 0, 0)];
    assert.deepEqual(M.resumen(ps), {pj: 4, pg: 1, pe: 2, pp: 1, gf: 3, gc: 2, dg: 1, pts: 5});
    assert.deepEqual(M.forma(ps), ['G', 'E', 'P', 'E']);
    assert.equal(M.rachaSinGanar(ps), 3);
    assert.deepEqual(M.goleadores(ps)[0], {jugadorId: 'x', goles: 2});
  });

  await t('fixture oficial: fecha propia del partido y resultado real desde mi lado', () => {
    const of = {fuente: 'x', jornadas: [{n: 1, fecha: '2026-08-15', partidos: [{local: 'b', visitante: 'a', fecha: '2026-08-17', resultadoReal: {gl: 3, gv: 1}}]}]};
    const [p] = M.fixtureLiga(['a', 'b'], 'a', of);
    assert.equal(p.fecha, '2026-08-17');
    assert.deepEqual(p.resultadoReal, {gf: 1, gc: 3});
  });
  await t('análisis de partido: titular, líneas y sensación', () => {
    const a = M.analizarPartido({...P(1, 0, 3), local: true}, {nivelPropio: 5, nivelRival: 1});
    assert.equal(a.sensacion, 'muy-mal'); assert.match(a.titular, /Goleada en contra/);
    const b = M.analizarPartido({...P(2, 3, 0), goleadores: ['j9', 'j9', 'j9']}, {nivelPropio: 2, nivelRival: 5, plantilla: [{id: 'j9', nombre: 'Lewandowski'}]});
    assert.equal(b.sensacion, 'muy-bien'); assert.ok(b.lineas.some(l => /Hat-trick de Lewandowski/.test(l))); assert.ok(b.lineas.includes('Valla invicta.'));
  });

  console.log('Carrera');
  const mem = () => { const m = {}; return {getItem: k => m[k] ?? null, setItem: (k, v) => { m[k] = v; }}; };
  await t('crear, guardar, cargar, exportar e importar', () => {
    const st = mem();
    let c = M.crearCarrera({club: {...BARCA, valorPlantillaM: 1295.8}, dificultad: 'medio', plantilla: [{id: 'j1'}]});
    for (const k of ['version', 'club', 'dt', 'dificultad', 'temporada', 'plantilla', 'partidos', 'finanzas', 'confianza', 'eventos', 'trofeos']) assert.ok(k in c, k);
    c = M.agregarPartido(c, P(1, 3, 0));
    M.guardar(st, c);
    assert.equal(M.cargar(st, c.id).partidos.length, 1);
    const otra = M.importar(M.exportar(c));
    assert.equal(otra.club.id, 'fc-barcelona');
    M.borrar(st, c.id); assert.equal(M.listar(st).length, 0);
  });
  await t('importar rechaza archivos rotos o de versión futura', () => {
    assert.throws(() => M.importar('{no json'), /JSON/);
    assert.throws(() => M.importar('{"version":1}'), /Falta/);
    assert.throws(() => M.importar(JSON.stringify({version: 99, club: {}, dificultad: 'medio', temporada: 'x', partidos: [], confianza: {}})), /más nueva/);
  });
  await t('agregarPartido rechaza un partido inválido', () => {
    const c = M.crearCarrera({club: BARCA, dificultad: 'medio'});
    assert.throws(() => M.agregarPartido(c, {...P(1, 1, 0), comp: 'x'}));
  });

  console.log('Presidente');
  const jugar = (dif, resultados, nivelRival = 3, perfil = null, nivel = 5) => {
    let c = M.crearCarrera({club: {...BARCA, nivel}, dificultad: dif}); const evs = [];
    resultados.forEach(([gf, gc], i) => { const r = M.procesarPartido(c, P(i + 1, gf, gc), {nivelRival, perfil}); c = r.carrera; evs.push(...r.eventos); });
    return {c, evs};
  };
  await t('perder siendo favorito duele más que perder siendo débil', () => {
    const favorito = M.deltaPartido({nivelPropio: 5, nivelRival: 1, dificultad: 'medio'}, P(1, 0, 1));
    const debil = M.deltaPartido({nivelPropio: 1, nivelRival: 5, dificultad: 'medio'}, P(1, 0, 1));
    assert.ok(favorito < debil);
  });
  await t('la misma derrota duele más en leyenda que en fácil, y el ultra es más duro', () => {
    const d = dif => M.deltaPartido({nivelPropio: 3, nivelRival: 3, dificultad: dif}, P(1, 0, 2));
    assert.ok(d('leyenda') < d('medio') && d('medio') < d('facil'));
    assert.ok(M.deltaPartido({nivelPropio: 3, nivelRival: 3, dificultad: 'medio', perfil: 'ultra'}, P(1, 0, 2)) < d('medio'));
  });
  await t('medio: ultimátum tras 6 sin ganar; fácil: nunca', () => {
    const malos = Array(6).fill([0, 1]);
    assert.ok(jugar('medio', malos).evs.some(e => e.tipo === 'ultimatum'));
    assert.equal(jugar('facil', malos).evs.length, 0);
  });
  await t('hardcore: al 2º ultimátum lo echan', () => {
    const {c, evs} = jugar('hardcore', Array(6).fill([0, 1]));
    assert.deepEqual(evs.map(e => e.tipo).filter(x => x !== 'aviso'), ['ultimatum', 'despido']);
    assert.equal(c.estado.despedido, true);
  });
  await t('hardcore: el Madrid que pierde 3 con chicos recibe ultimátum, no despido directo', () => {
    const {c, evs} = jugar('hardcore', Array(3).fill([0, 1]), 1);
    assert.deepEqual(evs.map(e => e.tipo).filter(x => x !== 'aviso'), ['ultimatum']);
    assert.equal(c.estado.despedido, false);
    assert.ok(c.confianza.presidente >= 15);
  });
  await t('Barça en medio: 3 goleadas en contra disparan un llamado de atención (bug de QA)', () => {
    const {evs} = jugar('medio', [[2, 1], [0, 3], [0, 3], [0, 3]], 2);
    assert.ok(evs.some(e => e.tipo === 'aviso'));
    assert.equal(evs.find(e => e.tipo === 'aviso').respuestas.length, 3);
  });
  await t('el aviso no se repite en partidos seguidos y fácil no tiene avisos', () => {
    const {evs} = jugar('medio', [[0, 3], [0, 3], [0, 3], [0, 3]], 2);
    const idx = evs.filter(e => e.tipo === 'aviso').map(e => e.partidoId);
    for (let i = 1; i < idx.length; i++) assert.notEqual(+idx[i].slice(1) - +idx[i - 1].slice(1), 1);
    assert.equal(jugar('facil', [[0, 3], [0, 3], [0, 3], [0, 3]], 2).evs.length, 0);
  });
  await t('5 victorias seguidas: el presidente te felicita', () => assert.equal(jugar('medio', Array(5).fill([2, 0])).evs.at(-1).tipo, 'elogio'));
  await t('leyenda: la confianza nunca pasa de 70', () => assert.ok(jugar('leyenda', Array(10).fill([4, 0]), 5).c.confianza.presidente <= 70));
  await t('cada reunión tiene 3 respuestas y responder cambia la carrera una sola vez', () => {
    const {c, evs} = jugar('medio', Array(6).fill([0, 1]));
    const ult = evs.find(e => e.tipo === 'ultimatum');
    assert.ok(evs.every(e => e.respuestas.length === 3));
    const antes = c.confianza.presidente;
    const c2 = M.responder(c, ult.id, 'refuerzos');
    assert.equal(c2.confianza.presidente, antes - 3);
    assert.equal(c2.banderas.pideRefuerzos, true);
    assert.throws(() => M.responder(c2, ult.id, 'asumir'), /ya se respondió/);
  });
  await t('"pedir paciencia" funciona en medio pero cae mal en hardcore', () => {
    const r = dif => { const {c, evs} = jugar(dif, Array(dif === 'medio' ? 6 : 3).fill([0, 1])); const u = evs.find(e => e.tipo === 'ultimatum'); return M.responder(c, u.id, 'proyecto').confianza.presidente - c.confianza.presidente; };
    assert.ok(r('medio') > 0 && r('hardcore') < 0);
  });

  await t('QA bug 1: sin contestar, el aviso no se repite J3 y J4', () => {
    const {evs} = jugar('medio', [[2, 1], [0, 3], [0, 3], [0, 3]], 2);
    assert.equal(evs.filter(e => e.tipo === 'aviso').length, 1);
  });
  await t('QA bug 2: corregir un resultado viejo recalcula sin sumar doble ni generar eventos', () => {
    let {c} = jugar('medio', [[2, 1], [0, 3], [0, 3], [0, 3]], 2);
    const antes = c.eventos.length;
    const p1 = c.partidos.find(p => p.id === 'p1');
    const conUno = M.procesarPartido({...c, aplicado: {...c.aplicado}}, {...p1}, {nivelRival: 2}).carrera.confianza.presidente;
    assert.equal(conUno, c.confianza.presidente); // reprocesar igual = nada cambia
    const r = M.procesarPartido(c, {...p1, gf: 7, gc: 1}, {nivelRival: 2});
    assert.equal(r.corregido, true); assert.equal(r.eventos.length, 0); assert.equal(r.carrera.eventos.length, antes);
    assert.equal(r.carrera.partidos.find(p => p.id === 'p1').gf, 7);
    const d21 = M.deltaPartido({nivelPropio: 5, nivelRival: 2, dificultad: 'medio'}, P(1, 2, 1)), d71 = M.deltaPartido({nivelPropio: 5, nivelRival: 2, dificultad: 'medio'}, P(1, 7, 1));
    assert.ok(Math.abs(r.carrera.confianza.presidente - (c.confianza.presidente - d21 + d71)) < 0.01);
  });
  await t('QA bug 4: despedido, la carrera se cierra y no acepta más partidos', () => {
    const {c} = jugar('hardcore', Array(6).fill([0, 1]));
    assert.equal(c.estado.finalizada, true);
    assert.throws(() => M.agregarPartido(c, P(7, 1, 0)), /terminó/);
    assert.equal(M.procesarPartido(c, P(7, 1, 0)).cerrada, true);
    const res = M.resumenCarrera(c);
    assert.equal(res.motivo, 'despido'); assert.equal(res.pp, 6); assert.equal(res.efectividad, 0);
  });
  await t('fixture oficial devuelve reprogramado y el real en orden local-visitante', () => {
    const of = {fuente: 'x', jornadas: [{n: 2, fecha: '2026-08-23', partidos: [{local: 'elche', visitante: 'barca', fecha: '2026-08-23', reprogramado: true, resultadoReal: {gl: 0, gv: 5}}]}]};
    const [p] = M.fixtureLiga(['elche', 'barca'], 'barca', of);
    assert.deepEqual(p.resultadoReal, {gf: 5, gc: 0}); assert.deepEqual(p.resultadoRealLV, {local: 0, visitante: 5}); assert.equal(p.reprogramado, true);
  });

  console.log('Vestuario');
  await t('charla: motivar sirve tras derrotas, exigir cae mal tras victorias, repetir pierde efecto', () => {
    const base = jugar('medio', [[0, 1], [0, 2], [1, 3]]).c;
    const m = M.charlaVestuario(base, 'motivar'); assert.ok(m.efecto > 0);
    assert.ok(M.charlaVestuario(m.carrera, 'motivar').efecto <= 0);
    const gan = jugar('medio', [[2, 0], [3, 1], [1, 0]]).c;
    assert.ok(M.charlaVestuario(gan, 'exigir').efecto < 0);
    assert.throws(() => M.charlaVestuario(base, 'gritar'));
  });
  await t('goleador en racha con contrato corto pide renovar; responder aplica efectos', () => {
    let c = M.crearCarrera({club: BARCA, dificultad: 'medio'});
    const pl = [{id: 'j9', nombre: 'Delantero Prueba', contratoHasta: '2027-06', valorM: 50}];
    let ev = [];
    for (let i = 1; i <= 3; i++) { c = M.agregarPartido(c, P(i, 1, 0, {goleadores: ['j9']})); const r = M.procesarVestuario(c, c.partidos.at(-1), {plantilla: pl}); c = r.carrera; ev = r.eventos; }
    assert.equal(ev[0].tipo, 'goleador-renovacion');
    const v0 = c.confianza.vestuario, c2 = M.responder(c, ev[0].id, 'renovar');
    assert.equal(c2.confianza.vestuario, v0 + 3); assert.equal(c2.banderas.renovar, 'j9');
    assert.ok(!Number.isNaN(c2.confianza.hinchas));
  });
  await t('QA bug 1: el reclamo del mismo jugador no se repite si está sin contestar', () => {
    let c = M.crearCarrera({club: BARCA, dificultad: 'medio'});
    const pl = Array.from({length: 12}, (_, i) => ({id: 'j' + i, nombre: 'J' + i, valorM: 100 - i}));
    let tot = 0;
    for (let i = 1; i <= 5; i++) { c = M.agregarPartido(c, P(i, 1, 1, {titulares: ['j1', 'j2']})); const r = M.procesarVestuario(c, c.partidos.at(-1), {plantilla: pl}); c = r.carrera; tot += r.eventos.filter(e => e.tipo === 'reclamo-minutos' && e.jugadorId === 'j0').length; }
    assert.equal(tot, 1);
    const otra = M.procesarVestuario(c, c.partidos[0], {plantilla: pl}); // reprocesar un partido viejo
    assert.equal(otra.eventos.length, 0);
  });
  await t('vestuario por debajo de 40: evento de vestuario dividido', () => {
    let c = M.crearCarrera({club: BARCA, dificultad: 'medio'}); c = {...c, confianza: {...c.confianza, vestuario: 30}};
    c = M.agregarPartido(c, P(1, 0, 1));
    assert.equal(M.procesarVestuario(c, c.partidos[0]).eventos[0].tipo, 'vestuario-dividido');
  });

  console.log('Detalles de QA: corrección y decimales');
  await t('corregir la J1 devuelve solo la diferencia y la etiqueta "Resultado corregido"', () => {
    const c0 = M.crearCarrera({club: {id: 'fc-barcelona', nombre: 'Barcelona', liga: 'LaLiga', nivel: 5, valorPlantillaM: 1100}, dificultad: 'medio'});
    const a = M.procesarPartido(c0, {...P(1, 2, 1), id: 'j1'}, {nivelRival: 3});
    const b = M.procesarPartido(a.carrera, {...P(1, 2, 1), id: 'j1'}, {nivelRival: 3});
    assert.equal(b.delta, 0); assert.equal(b.etiqueta, 'Resultado corregido'); assert.equal(b.deltas.hinchas, 0);
    const cc = M.procesarPartido(a.carrera, {...P(1, 0, 1), id: 'j1'}, {nivelRival: 3});
    assert.ok(cc.delta < 0); assert.equal(a.etiqueta, null);
  });
  await t('la confianza se guarda con un decimal', () => {
    const c0 = M.crearCarrera({club: {id: 'fc-barcelona', nombre: 'Barcelona', liga: 'LaLiga', nivel: 5, valorPlantillaM: 1100}, dificultad: 'medio'});
    const sucia = {...c0, confianza: {...c0.confianza, hinchas: 8.600000000000005}};
    assert.equal(JSON.parse(M.exportar(sucia)).confianza.hinchas, 8.6);
    let c = c0; for (let i = 1; i <= 8; i++) c = M.procesarPartido(c, {...P(i, 0, 3), id: 'x' + i}, {nivelRival: 2}).carrera;
    for (const v of Object.values(c.confianza)) assert.equal(v, Math.round(v * 10) / 10);
  });

  console.log('Trofeos');
  await t('registrarTrofeo suma, no duplica, sube confianza y quitarlo lo revierte', () => {
    const c0 = M.crearCarrera({club: {id: 'fc-barcelona', nombre: 'Barcelona', liga: 'LaLiga', nivel: 5, valorPlantillaM: 1100}, dificultad: 'medio'});
    const a = M.registrarTrofeo(c0, {comp: 'liga', nombre: 'LaLiga'});
    assert.equal(a.nuevo, true); assert.equal(a.carrera.trofeos.length, 1); assert.ok(a.carrera.confianza.hinchas > c0.confianza.hinchas);
    const b = M.registrarTrofeo(a.carrera, {comp: 'liga'}); assert.equal(b.nuevo, false); assert.equal(b.carrera.trofeos.length, 1);
    const c = M.registrarTrofeo(b.carrera, {comp: 'copa', nombre: 'Copa del Rey'}).carrera;
    const r = M.resumenCarrera(c); assert.equal(r.trofeos, 2); assert.deepEqual(r.trofeosPorComp, {liga: 1, copa: 1});
    const q = M.quitarTrofeo(c, {comp: 'copa'}); assert.equal(q.trofeos.length, 1); assert.equal(q.confianza.hinchas, a.carrera.confianza.hinchas);
  });

  console.log('Negociación con el presidente');
  const RMc = {id: 'real-madrid', nombre: 'Real Madrid', liga: 'LaLiga', nivel: 5, valorPlantillaM: 1500, presidente: {perfil: 'politico'}};
  const PREM = {id: 'x-prem', nombre: 'Prem', liga: 'Premier League', nivel: 3, valorPlantillaM: 400, presidente: {perfil: 'mecenas'}};
  const car = (club, dif, conf = null) => { const c = M.crearCarrera({club, dificultad: dif}); return conf == null ? c : {...c, confianza: {...c.confianza, presidente: conf}}; };
  await t('pedido chico con buena confianza: acepta y suma al presupuesto', () => {
    const c = car(RMc, 'medio', 80);
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'presupuesto', montoM: 10});
    assert.equal(n.decision, 'acepta');
    const c2 = M.cerrarNegociacion(c, n, 'aceptar');
    assert.equal(c2.mercado.extraPresupuestoM, 10);
  });
  await t('pedido grande: contraoferta; insistir cuesta confianza y no da el monto', () => {
    const c = car(RMc, 'medio', 65);
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'presupuesto', montoM: 150});
    assert.equal(n.decision, 'contraoferta'); assert.ok(n.aprobadoM > 0 && n.aprobadoM < 150);
    const c2 = M.cerrarNegociacion(c, n, 'insistir');
    assert.equal(c2.confianza.presidente, 59); assert.equal(c2.mercado.extraPresupuestoM, 0);
    assert.equal(M.cerrarNegociacion(c, n, 'aceptar').mercado.extraPresupuestoM, n.aprobadoM);
  });
  await t('la misma plata: el mecenas dice que sí más fácil que el austero', () => {
    const p = {tipo: 'presupuesto', montoM: 20};
    const mec = M.pedirAlPresidente(car(PREM, 'medio', 55), PREM, p).decision;
    const aus = M.pedirAlPresidente(car({...PREM, presidente: {perfil: 'austero'}}, 'medio', 55), {...PREM, presidente: {perfil: 'austero'}}, p).decision;
    const rango = {acepta: 2, contraoferta: 1, rechaza: 0};
    assert.ok(rango[mec] > rango[aus]);
  });
  await t('la dificultad pesa: mismo pedido aceptado en fácil y rechazado en leyenda', () => {
    const p = {tipo: 'presupuesto', montoM: 15};
    assert.equal(M.pedirAlPresidente(car(PREM, 'facil', 60), PREM, p).decision, 'acepta');
    assert.equal(M.pedirAlPresidente(car(PREM, 'leyenda', 35), PREM, p).decision, 'rechaza');
  });
  await t('fichaje: las reglas de la dificultad se respetan (hardcore no deja fichar de +30)', () => {
    const n = M.pedirAlPresidente(car(RMc, 'hardcore', 90), RMc, {tipo: 'fichaje', precioM: 20, jugador: {nombre: 'Veterano', edad: 32}});
    assert.equal(n.decision, 'rechaza'); assert.ok(n.motivos.some(m => /30/.test(m)));
  });
  await t('fair play: en LaLiga pasarse del tope bloquea desde medio; en fácil es solo aviso', () => {
    const big = {tipo: 'masa', montoM: 500};
    assert.equal(M.pedirAlPresidente(car(RMc, 'medio', 90), RMc, big).decision, 'rechaza');
    const f = M.pedirAlPresidente(car(RMc, 'facil', 90), RMc, {tipo: 'masa', montoM: 100});
    assert.ok(f.motivos.some(m => /Aviso de fair play/.test(m)));
  });
  await t('repetir un pedido rechazado enseguida: "ya lo hablamos"', () => {
    let c = car(PREM, 'leyenda', 35);
    const n = M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 15});
    c = M.cerrarNegociacion(c, n, 'aceptar');
    assert.match(M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 15}).texto, /Ya lo hablamos/);
  });
  await t('fichaje aprobado descuenta del disponible y cuenta como alta', () => {
    const c = car(RMc, 'medio', 90);
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'fichaje', precioM: 30, jugador: {nombre: 'Joven', edad: 20, sueldoM: 5}});
    assert.equal(n.decision, 'acepta');
    const c2 = M.cerrarNegociacion(c, n, 'aceptar');
    assert.equal(c2.mercado.altasVentana, 1);
    assert.ok(M.estadoMercado(c2, RMc).disponibleM < M.estadoMercado(c, RMc).disponibleM);
    assert.ok(M.estadoMercado(M.registrarVenta(c2, {precioM: 40}), RMc).disponibleM > M.estadoMercado(c2, RMc).disponibleM);
  });

  console.log('Charla táctica con el DT');
  const DT = {id: 'dt', nombre: 'Hansi Prueba', formaciones: ['4-2-3-1'], filosofia: [], nivel: 4};
  await t('su formación: acepta; misma línea de 4: discute; línea de 3: resiste', () => {
    const c = car(RMc, 'medio');
    assert.equal(M.proponerTactica(c, DT, {formacion: '4-2-3-1'}).reaccion, 'acepta');
    assert.equal(M.proponerTactica(c, DT, {formacion: '4-3-3 Attacking'}).reaccion, 'discute');
    assert.equal(M.proponerTactica(c, DT, {formacion: '3-5-2 flat'}).reaccion, 'resiste');
  });
  await t('sin filosofía con fuente, el estilo no se inventa', () => {
    const r = M.proponerTactica(car(RMc, 'medio'), DT, {formacion: '4-2-3-1', estilo: 'posesion'});
    assert.ok(r.motivos.some(m => /Sin dato de su filosofía/.test(m)));
  });
  await t('insistir contra un DT que resiste cuesta relación; ceder la mejora y vuelve a su formación', () => {
    const c = car(RMc, 'medio'); const ch = M.proponerTactica(c, DT, {formacion: '3-5-2 flat'});
    assert.equal(M.cerrarCharlaTactica(c, ch, 'insistir').relacionDT, 52);
    const cd = M.cerrarCharlaTactica(c, ch, 'ceder'); assert.equal(cd.relacionDT, 64); assert.equal(cd.tactica.formacion, '4-2-3-1');
  });
  await t('prueba de 3 partidos: si suma 5+, el DT la adopta; si no, vuelve a la suya', () => {
    let c = car(RMc, 'medio'); const ch = M.proponerTactica(c, DT, {formacion: '3-5-2 flat'});
    c = M.cerrarCharlaTactica(c, ch, 'probar');
    const bien = [P(1, 2, 0), P(2, 1, 1), P(3, 1, 0)].reduce((x, p) => M.agregarPartido(x, p), c);
    const ok = M.evaluarPrueba(bien); assert.equal(ok.resultado.ok, true); assert.equal(ok.carrera.tactica.formacion, '3-5-2 flat');
    const mal = [P(1, 0, 1), P(2, 1, 1), P(3, 0, 2)].reduce((x, p) => M.agregarPartido(x, p), c);
    const no = M.evaluarPrueba(mal); assert.equal(no.resultado.ok, false); assert.equal(no.carrera.tactica.formacion, '4-2-3-1');
  });

  console.log('Casos borde');
  await t('presidente sin plata: fichaje rechazado hasta que vendés; en fácil sigue negociando', () => {
    const c = {...car(RMc, 'medio', 95), mercado: {gastadoM: 5000, vendidoM: 0, extraPresupuestoM: 0, extraMasaM: 0, masaAltasM: 0, masaBajasM: 0, altasVentana: 0}};
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'fichaje', precioM: 10, jugador: {nombre: 'X', edad: 24}});
    assert.equal(n.decision, 'rechaza'); assert.match(n.texto, /primero vendé/);
    const cf = {...c, dificultad: 'facil'};
    assert.notEqual(M.pedirAlPresidente(cf, RMc, {tipo: 'fichaje', precioM: 10, jugador: {nombre: 'X', edad: 24}}).texto, n.texto);
  });
  await t('dos rechazos seguidos: insistir resta dos veces y a los 2 partidos se puede volver a pedir', () => {
    let c = car(PREM, 'leyenda', 35);
    const n1 = M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 15}); assert.equal(n1.decision, 'rechaza');
    c = M.cerrarNegociacion(c, n1, 'insistir');
    const n2 = M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 15}); assert.match(n2.texto, /Ya lo hablamos/);
    c = M.cerrarNegociacion(c, n2, 'insistir');
    assert.equal(c.confianza.presidente, 25); assert.equal(c.mercado.extraPresupuestoM, 0);
    c = [P(1, 1, 0), P(2, 1, 0)].reduce((x, p) => M.agregarPartido(x, p), c);
    assert.doesNotMatch(M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 15}).texto, /Ya lo hablamos/);
  });
  await t('DT que no acepta: imponerla queda marcada, baja vestuario y con la relación rota sigue resistiendo', () => {
    let c = car(RMc, 'medio'); const ch = M.proponerTactica(c, DT, {formacion: '3-5-2 flat'});
    assert.equal(ch.reaccion, 'resiste');
    c = M.cerrarCharlaTactica(c, ch, 'insistir');
    assert.equal(c.tactica.impuesta, true); assert.ok(c.confianza.vestuario < 65);
    c = {...c, relacionDT: 30};
    assert.equal(M.proponerTactica(c, DT, {formacion: '4-3-3 Attacking'}).reaccion, 'resiste');
  });
  await t('la prueba vence una sola vez: antes de 3 partidos no decide y después no se reevalúa', () => {
    let c = car(RMc, 'medio'); c = M.cerrarCharlaTactica(c, M.proponerTactica(c, DT, {formacion: '3-5-2 flat'}), 'probar');
    c = [P(1, 1, 0), P(2, 1, 0)].reduce((x, p) => M.agregarPartido(x, p), c);
    assert.equal(M.evaluarPrueba(c).resultado, null);
    c = M.agregarPartido(c, P(3, 0, 0));
    const r = M.evaluarPrueba(c); assert.equal(r.resultado.ok, true); assert.equal(r.carrera.tactica.pruebaHasta, null);
    assert.equal(M.evaluarPrueba(M.agregarPartido(r.carrera, P(4, 0, 3))).resultado, null);
  });
  await t('dts.js usa la filosofía solo si tiene fuente', () => {
    const club = {id: 'c', nombre: 'C', nivel: 3, estilo: ['posesion']};
    const con = {id: 'a', nombre: 'A', nivel: 3, clubActual: 'z', filosofia: [{valor: 'posesion', fuente: 'https://ej.com/nota'}]};
    const sin = {id: 'b', nombre: 'B', nivel: 3, clubActual: 'z', filosofia: [{valor: 'posesion'}]};
    assert.ok(M.afinidad(con, club).puntaje > M.afinidad(sin, club).puntaje);
    assert.equal(M.afinidad({...sin, clubActual: 'z', estado: 'libre'}, club).motivos.includes('Está libre'), true);
  });

  console.log('Bugs de QA: mercado');
  await t('contraoferta + insistir cuenta como un no: al repetir, "Ya lo hablamos"', () => {
    let c = car(RMc, 'medio', 65);
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'presupuesto', montoM: 150}); assert.equal(n.decision, 'contraoferta');
    c = M.cerrarNegociacion(c, n, 'insistir');
    assert.match(M.pedirAlPresidente(c, RMc, {tipo: 'presupuesto', montoM: 150}).texto, /Ya lo hablamos/);
  });
  await t('fichaje sin sueldo cargado: se estima, suma a la masa y pasa por el fair play', () => {
    const c = car(RMc, 'medio', 95);
    const n = M.pedirAlPresidente(c, RMc, {tipo: 'fichaje', precioM: 50, jugador: {nombre: 'Y', edad: 25, valorM: 60}});
    assert.ok(n.motivos.some(m => /Sueldo estimado ≈ 6 M€/.test(m)));
    const c2 = M.cerrarNegociacion(c, n, 'aceptar');
    if (n.aprobadoM > 0) assert.equal(M.estadoMercado(c2, RMc).masaM, +(M.estadoMercado(c, RMc).masaM + 6).toFixed(1));
    const caro = M.pedirAlPresidente(c, RMc, {tipo: 'fichaje', precioM: 50, jugador: {nombre: 'Z', edad: 25, valorM: 5000}});
    assert.equal(caro.decision, 'rechaza');
  });
  await t('sugerirDTs puede incluir al DT actual si se pide', () => {
    const dts = [{id: 'x', nombre: 'X', nivel: 5, clubActual: 'c', clubesDirigidos: ['c']}];
    assert.equal(M.sugerirDTs({id: 'c', nombre: 'C', nivel: 5}, dts).length, 0);
    assert.equal(M.sugerirDTs({id: 'c', nombre: 'C', nivel: 5}, dts, 5, {incluirActual: true}).length, 1);
  });

  console.log('Sin perfil ni datos: nada de NaN ni montos inventados');
  await t('los 96 clubes reales y un club sin datos: ninguna negociación da NaN, undefined o Infinity', async () => {
    const fs = require('node:fs'), path = require('node:path');
    let cl = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'clubes.json'), 'utf8')); cl = Array.isArray(cl) ? cl : cl.clubes;
    const vacio = {id: 'vacio', nombre: 'Vacío', liga: 'LaLiga', nivel: 3, presidente: {perfil: null}};
    const malo = [];
    const mira = (o, ruta) => { if (typeof o === 'number' && !Number.isFinite(o)) malo.push(ruta); else if (typeof o === 'string' && /NaN|undefined|Infinity/.test(o)) malo.push(ruta + '=' + o); else if (o && typeof o === 'object') for (const k in o) mira(o[k], ruta + '.' + k); };
    const pedidos = [{tipo: 'presupuesto', montoM: 20}, {tipo: 'masa', montoM: 10}, {tipo: 'fichaje', precioM: 30, jugador: {nombre: 'X', edad: 24}}];
    for (const club of [...cl, vacio]) for (const d of ['facil', 'medio', 'dificil', 'hardcore', 'leyenda']) for (const p of pedidos) {
      const c = M.crearCarrera({club, dificultad: d}); const n = M.pedirAlPresidente(c, club, p);
      mira(n, `${club.id}/${d}/${p.tipo}`);
      for (const r of n.respuestas) { const c2 = M.cerrarNegociacion(c, n, r.id); mira(c2.confianza, 'conf'); mira(M.estadoMercado(c2, club), 'estado'); }
    }
    assert.deepEqual(malo, []);
  });
  await t('club sin datos: el estado queda en null (no en 0) y los motivos lo dicen', () => {
    const vacio = {id: 'vacio', nombre: 'Vacío', liga: 'LaLiga', nivel: 3};
    const c = M.crearCarrera({club: vacio, dificultad: 'medio'});
    const e = M.estadoMercado(c, vacio); assert.equal(e.disponibleM, null); assert.equal(e.topeM, null); assert.equal(e.usoMasa, null);
    assert.ok(M.pedirAlPresidente(c, vacio, {tipo: 'presupuesto', montoM: 20}).motivos.some(m => /Sin estimado de presupuesto/.test(m)));
    assert.ok(M.pedirAlPresidente(c, vacio, {tipo: 'masa', montoM: 5}).motivos.some(m => /Sin estimado de masa/.test(m)));
    const n = M.pedirAlPresidente(c, vacio, {tipo: 'presupuesto', montoM: 20});
    assert.ok(n.aprobadoM <= 20); // nunca aprueba más de lo pedido
  });

  console.log('Bug QA: el bloqueo mira el mismo pedido');
  await t('un no a Mbappé no bloquea a otro jugador; repetir a Mbappé sí (Barça real)', () => {
    const fs = require('node:fs'), path = require('node:path');
    let cl = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'clubes.json'), 'utf8')); cl = Array.isArray(cl) ? cl : cl.clubes;
    const RMc = cl.find(x => x.id === 'fc-barcelona');
    let c = car(RMc, 'medio');
    const mb = {tipo: 'fichaje', precioM: 240, jugador: {id: 'mbappe', nombre: 'Mbappé', edad: 27, valorM: 200}};
    const n = M.pedirAlPresidente(c, RMc, mb); assert.equal(n.decision, 'rechaza');
    c = M.cerrarNegociacion(c, n, 'aceptar');
    assert.match(M.pedirAlPresidente(c, RMc, mb).texto, /Ya lo hablamos/);
    const otro = M.pedirAlPresidente(c, RMc, {tipo: 'fichaje', precioM: 6, jugador: {id: 'diatta', nombre: 'Alassane Diatta', edad: 20, valorM: 6}});
    assert.doesNotMatch(otro.texto, /Ya lo hablamos/); assert.equal(otro.decision, 'acepta');
  });
  await t('presupuesto: tras un no, pedir mucho menos es un pedido nuevo; lo mismo o más sigue bloqueado', () => {
    let c = car(PREM, 'leyenda', 35);
    const n = M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 50}); assert.equal(n.decision, 'rechaza');
    c = M.cerrarNegociacion(c, n, 'aceptar');
    assert.match(M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 60}).texto, /Ya lo hablamos/);
    assert.doesNotMatch(M.pedirAlPresidente(c, PREM, {tipo: 'presupuesto', montoM: 10}).texto, /Ya lo hablamos/);
    assert.doesNotMatch(M.pedirAlPresidente(c, PREM, {tipo: 'masa', montoM: 50}).texto, /Ya lo hablamos/);
  });

  console.log('Nivel por rendimiento reciente');
  await t('ajuste manual: se respeta aunque el cálculo diga otra cosa', () => {
    const cl = Array.from({length: 96}, (_, i) => ({id: i === 95 ? 'borussia-dortmund' : 'c' + i, liga: 'L', valorPlantillaM: i * 10, coefUEFA: i}));
    const d = M.calcularNiveles(cl).find(x => x.id === 'borussia-dortmund');
    assert.equal(d.nivelCalculado, 5); assert.equal(d.nivel, 4); assert.match(d.motivo, /Serafin/);
    assert.equal(M.calcularNiveles(cl).filter(x => x.nivel === 5).length, 8);
  });
  await t('forma por jornada dentro de la liga aunque la fecha real esté reprogramada', () => {
    const ps = [{...P(1, 2, 1), fecha: '2026-08-27'}, {...P(2, 0, 3), fecha: '2026-08-23'}];
    assert.deepEqual(M.forma(ps), ['G', 'P']);
  });
  await t('un ascendido suma poco y la tendencia premia al que viene subiendo', () => {
    const sube = {liga: 'Premier League', historial: [{temporada: '2025/26', division: 1, posicion: 4}, {temporada: '2024/25', division: 1, posicion: 6}, {temporada: '2023/24', division: 1, posicion: 12}, {temporada: '2022/23', division: 1, posicion: 14}]};
    const cae = {liga: 'Premier League', historial: [{temporada: '2025/26', division: 1, posicion: 14}, {temporada: '2024/25', division: 1, posicion: 12}, {temporada: '2023/24', division: 1, posicion: 6}, {temporada: '2022/23', division: 1, posicion: 4}]};
    assert.ok(M.rendimiento(sube).tendencia > 0 && M.rendimiento(cae).tendencia < 0);
    assert.ok(M.puntoTemporada({division: 2, posicion: 1}, 'Serie A') <= 0.15);
  });
  await t('Europa suma y la liga más fuerte pesa más', () => {
    const f = M.fuerzaLigas([{liga: 'Premier League', coef: 100}, {liga: 'Ligue 1', coef: 60}]);
    assert.ok(M.puntoTemporada({division: 1, posicion: 6}, 'Premier League', f) > M.puntoTemporada({division: 1, posicion: 6}, 'Ligue 1', f));
    assert.ok(M.puntoTemporada({division: 1, posicion: 6, europa: 'ucl:semis'}, 'LaLiga') > M.puntoTemporada({division: 1, posicion: 6}, 'LaLiga'));
  });
  await t('cada club trae su motivo en una línea', () => {
    const cl = Array.from({length: 10}, (_, i) => ({id: 'm' + i, liga: 'LaLiga', valorPlantillaM: i * 10, ingresosM: null, coefUEFA: null}));
    assert.ok(M.calcularNiveles(cl).every(x => /\.$/.test(x.motivo)));
  });

  console.log(`\n${ok} ok, ${fallos} fallidos`);
  process.exit(fallos ? 1 : 0);
})();
