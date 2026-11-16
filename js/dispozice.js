// Dispozice: scrollytelling sekce „Co je uvnitř“. Dům stojí na pozemku → střecha se zvedne a bližší stěna klesne
// na výšku pracovní desky (řez jako u domečku pro panenky) → kamera projde místnost po místnosti → shrnutí.
// Stejný jazyk a stejné sdílené části jako js/podvozek.js: připnutá scéna přes celou šířku, titulek kapitoly v rohu,
// číslované body s popisky v okrajích (desktop) nebo jedna karta dole (mobil), three.js až u sekce, kreslí se jen když
// je sekce vidět a jen jedna scéna na stránce, daleko od obrazovky se scéna uvolní, bez WebGL statický půdorys.
//
// Použití:
//   import { mountDispozice } from './js/dispozice.js';
//   const d = mountDispozice(el, { variant: 'm' }); d.destroy();
// Volby (vše nepovinné):
//   variant   's' | 'm' | 'l' (výchozí 'm')
//   chapters  výběr kapitol podle klíče, např. ['ext', 'plan', 'obytna', 'loft', 'end'] (úvodní stránka)
//   travel    délka scrollu přes sekci (CSS délka), výchozí 65svh na každý přechod mezi kapitolami (~1 tah prstem)
//   head      { eyebrow, title, lead } přepíše hlavičku, false ji skryje
//   facts     { net, people, sleep, height, len } čísla domu do poslední kapitoly (z index.html, MODELS a REAL)
//   cta       [{ label, href, primary }] tlačítka v poslední kapitole (desktop vlevo, mobil pod čísly v kartě)
//   mode      'auto' | 'webgl' | 'static', lazyMargin, farMargin, reducedMotion jako u mountPodvozek
//
// Rozměry a vybavení: projekt/dum-*-v2/params.py (přepsané sem, web složku projekt/ nenačítá), kontrola proti
// vykresy/pudorys.svg. Souřadnice params: x od vnějšího líce štítu A (prosklený, vstup) ke štítu B (oj), y od vnějšího
// líce levé stěny, z nad čistou podlahou, vše v mm. three.js: X = x − L/2, Y = 0,73 + z, Z = y − 1,25 (levá stěna −Z).
import {
  buildProcedural, dimsOf, annotator, cardCtl, scrollProgress, scrollToProgress, applyEmbed, hasWebGL, lowEnd,
  clamp, ease, pad, first, fmt, contactTex, canvasTex, rng, woodTex, gateKick, gateEntry, gateDrop, lifecycle, stepHyst, stageExtras, finalCard,
} from './podvozek.js';

/* ------------------------------------------------------------------ data */

const f = (id, x0, x1, y0, y1, z0, z1) => ({ id, x: [x0, x1], y: [y0, y1], z: [z0, z1] });
const PLAN = {
  s: {
    inner: [5650, 2150], xPart: 4620, bathDoor: [1250, 1950, 1950],
    kitchen: { run: f('kitchen', 3020, 4620, 1715, 2315, 0, 900), parts: [['dřez', 3020, 3620], ['indukce', 3620, 4020, 2], ['lednice', 4020, 4620]] },
    furn: [
      f('sofa', 400, 2400, 185, 1000, 0, 450), f('desk', 2420, 3420, 185, 735, 710, 750),
      f('wardrobe', 3420, 4020, 185, 785, 0, 2000), f('tech', 4020, 4620, 185, 785, 0, 2000),
      f('shower', 5015, 5815, 185, 985, 0, 50), f('wc', 5265, 5815, 1110, 1490, 250, 650),
      f('basin', 4750, 5250, 1965, 2315, 780, 850), f('radiator', 2000, 2800, 2275, 2315, 150, 550),
    ],
    shelf: [3070, 3970, 1720], lamp: [2920, 520, 1500], plants: [[270, 1150, 1]], rug: [650, 2300, 1080, 1640],
  },
  m: {
    inner: [6850, 2150], xPart: 5600, bathDoor: [1250, 1950, 1840],
    kitchen: { run: f('kitchen', 3500, 5600, 185, 785, 0, 900), parts: [['dřez', 3500, 4050], ['myčka', 4050, 4500], ['indukce', 4500, 5050, 2, 1], ['lednice', 5050, 5600]] },
    furn: [
      f('sofa', 300, 2300, 185, 1035, 0, 450), f('bench', 2350, 3500, 185, 635, 0, 450), f('table', 2400, 3450, 635, 1135, 710, 750),
      f('tech', 4500, 5000, 1715, 2315, 0, 1900), f('wardrobe', 5000, 5600, 1715, 2315, 0, 1900),
      f('ac', 300, 1100, 2095, 2315, 1700, 1990),
      f('shower', 6215, 7015, 185, 985, 0, 50), f('wc', 6465, 7015, 1110, 1490, 250, 650),
      f('basin', 5800, 6300, 1965, 2315, 780, 860), f('ladder', 6450, 6950, 2275, 2315, 300, 1300),
    ],
    lamp: [2925, 885, 1480], plants: [[2250, 2120, 1.15]], rug: [450, 2150, 1120, 1700],
    loft: { x: [4500, 7025], top: 2010, t: 110 }, stairs: { x: [2500, 4500], y: [1715, 2315], n: 9 }, skylight: [5700, 6480, 300, 1050],
  },
  l: {
    inner: [7450, 2150], partitions: [[4100, 4180, 175, 1520, []], [4180, 5550, 1440, 1520, [[4500, 5200]]], [5550, 5630, 175, 2325, [[1560, 2260]]]],
    kitchen: { run: f('kitchen', 1700, 4100, 175, 775, 0, 900), parts: [['dřez', 1700, 2300], ['myčka', 2300, 2750], ['indukce', 2750, 3350, 4, 1], ['deska', 3350, 3550], ['lednice', 3550, 4100]] },
    furn: [
      f('table4', 300, 1500, 850, 1650, 710, 750),
      f('chair', 450, 850, 450, 850, 0, 450), f('chair', 950, 1350, 450, 850, 0, 450), f('chair', 450, 850, 1650, 2050, 0, 450), f('chair', 950, 1350, 1650, 2050, 0, 450),
      f('tech', 3500, 4100, 1725, 2325, 0, 2000), f('ac', 300, 1100, 175, 395, 1700, 1990),
      f('basin', 4250, 4750, 1090, 1440, 850, 930), f('wc', 4250, 4630, 175, 725, 250, 650), f('shower', 4650, 5550, 175, 1075, 0, 50),
      f('ladder', 4900, 5400, 1400, 1440, 300, 1300), f('wardrobe', 5630, 6180, 175, 775, 0, 2100), f('bed', 6225, 7625, 175, 2175, 0, 500),
    ],
    lamp: [900, 1250, 1500], plants: [[480, 2140, 1.1]],
  },
};

// Kapitoly. cam: at = cíl kamery (mm v params), r = poloměr záběru (m), az/el = směr (rad, az 0 = z pravé strany +Z,
// kladný směrem k oji), cut = výška řezu nad podlahou (m) pro stěny zp/zn/a/b a všechno ostatní g, roof p/n 1 = pryč,
// loft 1 = odsunutý, focus = zóna v mm [x0, x1, y0, y1] (ostatní se ztlumí), tags = popisky místností, dims = kóty.
const NONE = 3.6;   // nad hřebenem: bez řezu
const LOW = 0.9, MID = 2.45;
function chaptersFor(v, D, P, o) {
  const L = D.L * 1000, net = o.facts?.net, inner = `${fmt(P.inner[0] / 1000, 2)} × ${fmt(P.inner[1] / 1000, 2)} m`;
  const ext = { key: 'ext', short: 'Zvenku', title: `Dům ${D.key} na pozemku`, text: 'Takhle dům stojí na pozemku. Posouvejte stránkou, střecha se zvedne a uvidíte dovnitř.',
    textStatic: 'Dům stojí na silničním podvozku. Půdorys nahoře ukazuje, co je uvnitř.',
    cam: { at: [L / 2 + 350, 1250, 1050], r: (D.total + 0.6) / 2, az: v === 'l' ? -0.78 : -2.33, el: 0.14, maz: v === 'l' ? -1.15 : -1.95, mel: 0.2 }, cut: {}, roof: { p: 0, n: 0 }, loft: v === 'm' ? 0 : 0 };
  const planBase = { cam: { at: [L / 2, 1250, 300], r: D.L / 2 + 0.55, az: 0.3, el: 0.98, maz: 0.95, mel: 1.1 }, cut: { zp: LOW, g: MID }, roof: { p: 1, n: 1 }, loft: 1, tags: 1, dims: 1 };
  const plan = { key: 'plan', short: 'Půdorys', title: 'Celý dům shora', ...planBase };
  const end = { key: 'end', short: 'Shrnutí', ...planBase, cam: { ...planBase.cam, az: 0.52, el: 0.86, maz: 1.0, mel: 0.95 }, loft: 0, tags: 0, dims: 0, final: 1 };
  const z = (key, short, title, text, cam, extra = {}) => ({ key, short, title, text, cam, cut: { zp: LOW, g: MID }, roof: { p: 1, n: 1 }, loft: 1, ...extra });
  const pt = (n, name, text, at, grp) => ({ n, name, text, at, grp });
  if (v === 's') {
    plan.text = `Vnitřní rozměry ${inner}${net ? `, užitná plocha ${net}` : ''}. U proskleného štítu je obytná část, uprostřed kuchyň, u oje koupelna.`;
    plan.tags = [['Obytná část', [1600, 1150]], ['Kuchyň', [3820, 2015], [3820, 1450]], ['Koupelna', [5250, 1250], [5250, 1700]]];
    end.title = 'Dům S pro dva'; end.text = 'Studio pro dva na víkendy i práci v klidu.';
    return [ext, plan,
      z('obytna', 'Obytná část', 'Obytná část', 'U proskleného štítu je rozkládací pohovka, u okna pracovní deska a vedle ní šatní skříň.',
        { at: [1900, 1150, 450], r: 2.5, az: 0.22, el: 0.8 }, { focus: [0, 3420, 0, 2500], pts: [
          pt(1, 'Rozkládací pohovka', 'Rozložená má 160 × 200 cm.', [1400, 600, 470]),
          pt(2, 'Pracovní deska', 'Deska 100 cm u okna.', [2920, 470, 750]),
          pt(3, 'Šatní skříň', 'Široká 60 cm.', [3720, 785, 1300]),
          pt(4, 'Prosklený štít', 'Vstupní dveře jsou prosklené.', [60, 1770, 1250]),
        ] }),
      z('kuchyn', 'Kuchyň', 'Kuchyň', 'Linka 160 cm s dřezem, dvouplotýnkovou indukcí a lednicí 90 l. Nad ní je okno.',
        { at: [3820, 1700, 700], r: 2.3, az: Math.PI - 0.2, el: 0.95 }, { cut: { zn: LOW, g: MID }, focus: [3020, 4620, 1250, 2500], pts: [
          pt(1, 'Dřez', 'Linka je dlouhá 160 cm.', [3320, 2015, 905]),
          pt(2, 'Indukce', 'Dvě varné zóny.', [3820, 2015, 905]),
          pt(3, 'Lednice 90 l', 'Pod pracovní deskou.', [4320, 1715, 450]),
          pt(4, 'Okno nad linkou', '90 × 60 cm.', [3520, 2315, 1350]),
        ] }),
      z('koupelna', 'Koupelna', 'Koupelna', 'Sprchový kout 80 × 80 cm, závěsné WC a umyvadlo. Do koupelny se vchází posuvnými dveřmi.',
        { at: [5250, 1250, 500], r: 1.85, az: Math.PI - 0.42, el: 1.0 }, { cut: { zn: LOW, b: LOW, g: MID }, focus: [4620, 6000, 0, 2500], pts: [
          pt(1, 'Sprcha 80 × 80 cm', 'V rohu u štítu.', [5415, 585, 1100]),
          pt(2, 'Závěsné WC', 'Na štítové stěně.', [5600, 1300, 500]),
          pt(3, 'Umyvadlo', 'Široké 50 cm.', [5000, 2140, 860]),
          pt(4, 'Posuvné dveře', 'Široké 70 cm.', [4660, 1600, 1000]),
        ] }),
      end];
  }
  if (v === 'm') {
    plan.text = `Vnitřní rozměry ${inner}${net ? `, užitná plocha ${net}` : ''}. Nad kuchyní a koupelnou je ještě spací loft, k němu se dostanete na konci.`;
    plan.tags = [['Obytná část', [1300, 1250]], ['Kuchyň', [4550, 485], [4550, 1150]], ['Schody', [3500, 2015], [3500, 1500]], ['Koupelna', [6350, 1350], [6350, 1650]]];
    end.title = 'Dům M pro 2–4 osoby'; end.text = 'Dům pro páry i malé rodiny, se spacím loftem pod střechou.';
    return [ext, plan,
      z('obytna', 'Obytná část', 'Obytná část', 'U proskleného štítu je rozkládací pohovka, za ní lavice s úložným prostorem a sklopný stůl pro 2–4 osoby.',
        { at: [1850, 1100, 450], r: 2.6, az: 0.2, el: 0.8 }, { focus: [0, 3500, 0, 2500], pts: [
          pt(1, 'Rozkládací pohovka', 'Rozložená má 200 × 160 cm.', [1300, 620, 470]),
          pt(2, 'Lavice s úložným prostorem', 'Dlouhá 115 cm.', [3380, 400, 470]),
          pt(3, 'Sklopný stůl', '110 × 50 cm, pro 2–4 osoby.', [2560, 1020, 760]),
          pt(4, 'Prosklený štít', 'Vstupní dveře jsou prosklené.', [60, 1770, 1300]),
        ] }),
      z('kuchyn', 'Kuchyň', 'Kuchyň', 'Linka 210 cm podél levé stěny: dřez, myčka 45 cm, indukce s troubou a lednice 120 l.',
        { at: [4550, 700, 700], r: 2.5, az: 0.12, el: 0.98 }, { focus: [3500, 5600, 0, 1250], pts: [
          pt(1, 'Dřez', 'Pod ním myčka 45 cm.', [3775, 485, 905]),
          pt(2, 'Indukce s troubou', 'Dvě varné zóny.', [4775, 485, 905]),
          pt(3, 'Lednice 120 l', 'Schovaná pod pracovní deskou.', [5325, 785, 450]),
          pt(4, 'Okno nad linkou', '90 × 60 cm.', [4250, 185, 1350]),
        ] }),
      z('koupelna', 'Koupelna', 'Koupelna', 'Sprchový kout 80 × 80 cm, závěsné WC, umyvadlo a žebřík na ručníky. Okno ve štítu je matné.',
        { at: [6350, 1250, 500], r: 1.9, az: Math.PI - 0.42, el: 1.0 }, { cut: { zn: LOW, b: LOW, g: MID }, focus: [5640, 7200, 0, 2500], pts: [
          pt(1, 'Sprcha 80 × 80 cm', 'V rohu u štítu.', [6615, 585, 1100]),
          pt(2, 'Závěsné WC', 'Na štítové stěně.', [6800, 1300, 500]),
          pt(3, 'Umyvadlo', 'Široké 50 cm.', [6050, 2140, 870]),
          pt(4, 'Žebřík na ručníky', 'Vedle umyvadla.', [6700, 2295, 1150]),
        ] }),
      z('schody', 'Schody', 'Schody a úložný prostor', 'Schody do loftu mají pod stupni úložné boxy. Vedle nich je šatní skříň a skříň s technikou.',
        { at: [3900, 1900, 850], r: 2.2, az: Math.PI + 0.32, el: 0.5 }, { cut: { zn: LOW, g: MID }, loft: 0, focus: [2450, 5600, 1250, 2500], pts: [
          pt(1, 'Schody do loftu', 'Devět stupňů.', [3300, 1900, 1150]),
          pt(2, 'Úložné boxy', 'Pod každým stupněm.', [3950, 1715, 950]),
          pt(3, 'Technika', 'Ohřívač 50 l, rekuperace, rozvaděč.', [4750, 1715, 1250]),
          pt(4, 'Šatní skříň', 'Široká 60 cm.', [5300, 1715, 1500]),
        ] }),
      z('loft', 'Loft', 'Spací loft', 'Matrace 140 × 200 cm pod střechou, jen na spaní. Nad ní je střešní okno, v čele okno ve štítu.',
        { at: [5800, 1100, 2350], r: 2.5, az: 0.36, el: 0.3 }, { cut: { zp: LOW }, roof: { p: 1, n: 0 }, loft: 0, focus: [4500, 7200, 0, 2500], pts: [
          pt(1, 'Matrace 140 × 200 cm', 'Jen na spaní.', [6000, 1250, 2330], 'loft'),
          pt(2, 'Střešní okno', 'Asi 78 × 98 cm.', [6090, 675, 2950]),
          pt(3, 'Okno ve štítu', '60 × 44 cm.', [7025, 1250, 2380]),
        ] }),
      end];
  }
  plan.text = `Vnitřní rozměry ${inner}${net ? `, užitná plocha ${net}` : ''}. Obytná kuchyň, koupelna s chodbou a samostatná ložnice, vše v přízemí.`;
  plan.tags = [['Obytná kuchyň · 8,44 m²', [2150, 1250]], ['Koupelna · 1,73 m²', [4870, 760], [4900, 1270]], ['Chodba · 1,10 m²', [4870, 1950]], ['Ložnice · 4,29 m²', [6900, 1300], [6900, 2280]]];
  end.title = 'Dům L pro dva'; end.text = 'Největší model pro celoroční bydlení nebo pronájem.';
  return [ext, plan,
    z('obytna', 'Obytná kuchyň', 'Obytná kuchyň', 'Má 8,44 m². U proskleného štítu je jídelní stůl pro čtyři, z boku posuvné dveře na terasu.',
      { at: [950, 1450, 450], r: 2.3, az: -Math.PI + 0.42, el: 0.8 }, { cut: { zn: LOW, g: MID }, focus: [0, 2350, 0, 2500], pts: [
        pt(1, 'Jídelní stůl', '120 × 80 cm, čtyři židle.', [900, 1250, 760]),
        pt(2, 'Posuvné dveře na terasu', 'Široké 150 cm.', [1700, 2325, 1150]),
        pt(3, 'Prosklený štít', 'Tři pole, výhled od stolu.', [60, 1250, 1500]),
      ] }),
    z('kuchyn', 'Kuchyň', 'Kuchyň', 'Linka 240 cm podél levé stěny: dřez, myčka 45 cm, indukce s troubou a lednice. Nad dřezem je okno.',
      { at: [2900, 700, 700], r: 2.6, az: 0.12, el: 0.95 }, { focus: [1650, 4100, 0, 1250], pts: [
        pt(1, 'Dřez', 'Vedle něj myčka 45 cm.', [2000, 475, 905]),
        pt(2, 'Indukce s troubou', 'Čtyři varné zóny.', [3050, 475, 905]),
        pt(3, 'Lednice', 'Na konci linky.', [3825, 775, 450]),
        pt(4, 'Okno nad linkou', '140 × 70 cm.', [2500, 175, 1400]),
      ] }),
    z('koupelna', 'Koupelna', 'Koupelna', 'Má 1,73 m²: sprcha 90 × 90 cm, WC, umyvadlo a příprava pro pračku. Vchází se do ní z chodby.',
      { at: [4870, 850, 500], r: 1.9, az: Math.PI - 0.3, el: 1.0 }, { cut: { zn: LOW, g: MID }, focus: [4100, 5600, 0, 1520], pts: [
        pt(1, 'Sprcha 90 × 90 cm', 'V rohu u příčky.', [5100, 625, 1100]),
        pt(2, 'WC', 'U levé stěny.', [4440, 450, 520]),
        pt(3, 'Umyvadlo', 'Široké 50 cm.', [4500, 1265, 940]),
        pt(4, 'Žebřík na ručníky', 'Na příčce chodby.', [5150, 1420, 1100]),
      ] }),
    z('loznice', 'Ložnice', 'Ložnice', 'Má 4,29 m². Postel 140 × 200 cm, šatní skříň a okna do lesa na třech stranách.',
      { at: [6700, 1250, 500], r: 2.5, az: 0.3, el: 0.85 }, { focus: [5590, 7800, 0, 2500], pts: [
        pt(1, 'Postel 140 × 200 cm', 'Čelem k levé stěně.', [6925, 1300, 520]),
        pt(2, 'Šatní skříň', 'Široká 55 cm.', [5905, 775, 1500]),
        pt(3, 'Okna na třech stranách', 'Ve štítu a v obou bočních stěnách.', [7625, 1250, 1450]),
        pt(4, 'Posuvné dveře', 'Široké 70 cm.', [5590, 1910, 1000]),
      ] }),
    end];
}

/* ------------------------------------------------------------------ sauny */
// Sauna na podvozku: projekt/sauna-podvozek-v2/params.py (a vykresy/pudorys.svg), zahradní sauna:
// projekt/sauna-zahradni/params.py. Stejné souřadnice jako u domů (x od čela A se vstupem, y od levé stěny, mm).
const SPLAN = {
  'sauna-podvozek': {
    name: 'Sauna na podvozku', gen: 'sauny na podvozku', L: 3600, W: 2400, TW: 170, F: 0.74, CEIL: 2100, TR: 200, slope: 2, eaveA: 250, eave: 60, trailer: true,
    inner: [3260, 2060], xPart: 1300, part: 95, doorA: [850, 1550, 1950], doorS: [1300, 2000, 1900], doorAGlass: false,
    win: { L: [[2000, 3300, 1250, 1850]], R: [[450, 1050, 1000, 1600]], A: [], B: [] },
    benchUp: [2830, 3430, 1000], benchLow: [2380, 2830, 550], stove: { x: [1430, 1830], y: [225, 625], h: 800 }, guard: 120, flue: [1630, 425, 150, 600],
    benchA: { x: [300, 1200], y: [170, 570], z: 450 }, hooks: [300, 1200, 2230],
  },
  'sauna-zahradni': {
    name: 'Zahradní sauna', gen: 'zahradní sauny', L: 2400, W: 2200, TW: 175, F: 0.45, CEIL: 2100, TR: 200, slope: 3, eaveA: 300, eave: 80, trailer: false,
    inner: [2050, 1850], xPart: null, doorA: [1300, 2000, 1900], doorAGlass: true,
    win: { L: [[700, 1700, 1250, 1850]], R: [], A: [], B: [] },
    benchUp: [1625, 2225, 1000], benchLow: [1175, 1625, 550], stove: { x: [300, 700], y: [260, 660], h: 800 }, guard: 120, flue: [500, 460, 150, 600],
  },
};
function saunaDims(v) {
  const Q = SPLAN[v], L = Q.L / 1000, W = Q.W / 1000, H = L / 2, F = Q.F, tan = Math.tan(Q.slope * Math.PI / 180);
  // horní líc krytiny: u čela A výš, pultová střecha klesá k čelu B (jako ref.js / výkres pohled-levy)
  const roofTop = x => F + Q.CEIL / 1000 + Q.TR / 1000 + 0.165 - (x + H) * tan;
  return { key: v, sauna: true, L, W, H, ffl: F, tan, roofTop, under: x => roofTop(x) - Q.TR / 1000, ridge: roofTop(-H - Q.eaveA / 1000) + Q.flue[3] / 1000,
    total: Q.trailer ? L + 1.5 : L, wallH: Q.CEIL / 1000, tw: Q.TW / 1000, tagName: `${Q.name} · ilustrační model`, gen: Q.gen, name3d: Q.name, base: Q.trailer ? 0.6 : 0.3 };
}
function saunaChapters(v, D, Q) {
  const L = Q.L, CUT = Q.CEIL / 1000, inner = `${fmt(Q.inner[0] / 1000, 2)} × ${fmt(Q.inner[1] / 1000, 2)} m`;
  const pt = (n, name, text, at) => ({ n, name, text, at });
  const ext = { key: 'ext', short: 'Zvenku', title: `${Q.name} na pozemku`, text: Q.trailer ? 'Takhle sauna stojí na podvozku. Posouvejte stránkou, střecha se zvedne a uvidíte dovnitř.' : 'Takhle sauna stojí na zahradě. Posouvejte stránkou, střecha se zvedne a uvidíte dovnitř.',
    textStatic: Q.trailer ? 'Sauna stojí na silničním podvozku. Půdorys nahoře ukazuje, co je uvnitř.' : 'Sauna stojí na zahradě. Půdorys nahoře ukazuje, co je uvnitř.',
    cam: { at: [L / 2 + (Q.trailer ? 450 : 0), Q.W / 2, 1100], r: Math.max((D.total + 0.8) / 2, 2.7), az: -2.3, el: 0.16, maz: -1.95, mel: 0.2 }, cut: {}, roof: { p: 0, n: 0 }, loft: 0 };
  const planBase = { cam: { at: [L / 2, Q.W / 2, 300], r: Math.max(D.L / 2 + 0.75, 2.35), az: 0.3, el: 0.98, maz: 0.8, mel: 1.1 }, cut: { zp: LOW, g: CUT }, roof: { p: 1, n: 1 }, loft: 0, tags: 1, dims: 1 };
  const end = { key: 'end', short: 'Shrnutí', ...planBase, cam: { ...planBase.cam, az: 0.55, el: 0.86, maz: 0.9, mel: 0.95 }, tags: 0, dims: 0, final: 1 };
  const z = (key, short, title, text, cam, extra = {}) => ({ key, short, title, text, cam, cut: { zp: LOW, g: CUT }, roof: { p: 1, n: 1 }, loft: 0, ...extra });
  const [bu0, bu1] = Q.benchUp, [bl0, bl1] = Q.benchLow, st = Q.stove, [fx, fy] = Q.flue;
  if (Q.trailer) {
    const plan = { key: 'plan', short: 'Půdorys', title: 'Celá sauna shora', ...planBase,
      text: `Vnitřní rozměry ${inner}: předsíň 1,13 × 2,06 m a saunovací místnost 2,04 × 2,06 m, světlá výška 2,10 m.`,
      tags: [['Předsíň · 2,33 m²', [750, 1250], [735, 1220]], ['Sauna · 4,19 m²', [2600, 1250], [2050, 1610]]] };
    end.title = 'Sauna pro 4–6 osob'; end.text = 'Sauna s předsíní, kterou převezete na chatu i k jezeru.';
    return [ext, plan,
      z('sauna', 'Sauna', 'Saunovací místnost', 'Lavice ve dvou úrovních pro 4–6 osob, kamna na dřevo v rohu u dveří a okno do krajiny. Objem 8,8 m³.',
        { at: [2500, 1200, 650], r: 1.9, az: 0.05, el: 0.7 }, { focus: [1395, L, 0, Q.W], pts: [
          pt(1, 'Horní lavice', 'Metr nad podlahou, přes celou šířku.', [3130, 1150, 1010]),
          pt(2, 'Spodní lavice', 'Ve výšce 55 cm, slouží i jako schod.', [2605, 1500, 560]),
          pt(3, 'Okno do krajiny', '130 × 60 cm, tvrzené trojsklo.', [2650, 170, 1550]),
          pt(4, 'Skleněné dveře', 'Široké 70 cm.', [1347, 1650, 1050]),
        ] }),
      z('kamna', 'Kamna', 'Kamna na dřevo', 'Kamna 8 kW s prosklenými dvířky a 40 kg kamenů stojí v rohu u dveří, kolem nich je dřevěná ohrádka.',
        { at: [1700, 520, 600], r: 1.45, az: 0.5, el: 0.62 }, { focus: [1395, 2400, 0, 1300], pts: [
          pt(1, 'Kamna 8 kW', 'Prosklená dvířka, přikládá se ze sauny.', [1630, st.y[1], 470]),
          pt(2, 'Kameny', '40 kg na kamnech.', [fx - 80, fy + 80, 760]),
          pt(3, 'Ohrádka', 'Dřevěná, kolem kamen.', [st.x[1] + Q.guard + 10, st.y[1] + Q.guard + 10, 690]),
          pt(4, 'Komín', 'Izolovaný, 60 cm nad střechou.', [fx, fy, 1750]),
        ] }),
      z('predsin', 'Předsíň', 'Předsíň', 'V předsíni se převléknete: lavice, věšáky s policí a okno s izolačním dvojsklem.',
        { at: [750, 1300, 550], r: 1.75, az: -Math.PI + 0.75, el: 0.95 }, { cut: { zn: LOW, a: LOW, g: CUT }, focus: [0, 1300, 0, Q.W], pts: [
          pt(1, 'Lavice', 'Dlouhá 90 cm.', [750, 370, 460]),
          pt(2, 'Věšáky a police', 'Na pravé stěně.', [750, 2230, 1800]),
          pt(3, 'Okno', '60 × 60 cm, izolační dvojsklo.', [750, 2230, 1300]),
          pt(4, 'Vstupní dveře', 'Široké 70 cm.', [60, 1200, 600]),
        ] }),
      end];
  }
  const plan = { key: 'plan', short: 'Půdorys', title: 'Celá sauna shora', ...planBase,
    text: `Saunovací místnost ${inner}, světlá výška 2,10 m. Bez předsíně, vchází se přímo z venku.`,
    tags: [['Sauna · 3,8 m²', [1300, 1300], [1000, 1550]]] };
  end.title = 'Sauna pro 2–3 osoby'; end.text = 'Kompaktní sauna na zahradu, usazená na patkách.';
  return [ext, plan,
    z('sauna', 'Sauna', 'Saunovací místnost', 'Lavice ve dvou úrovních podél zadní stěny pro 2–3 osoby, okno do zahrady a celoskleněné dveře.',
      { at: [1450, 1100, 650], r: 1.6, az: 0.1, el: 0.7 }, { focus: [0, L, 0, Q.W], pts: [
        pt(1, 'Horní lavice', 'Metr nad podlahou, přes celou šířku.', [1925, 1050, 1010]),
        pt(2, 'Spodní lavice', 'Ve výšce 55 cm.', [1400, 1350, 560]),
        pt(3, 'Okno do zahrady', '100 × 60 cm, tvrzené trojsklo.', [1200, 175, 1550]),
        pt(4, 'Celoskleněné dveře', 'Široké 70 cm, otevírají se ven.', [60, 1650, 1050]),
      ] }),
    z('kamna', 'Kamna', 'Kamna', 'Kamna na dřevo 6 kW s kameny stojí v rohu u vstupu, kolem nich je dřevěná ohrádka. Místo nich můžete mít elektrická.',
      { at: [580, 560, 600], r: 1.4, az: 0.5, el: 0.62 }, { focus: [0, 1150, 0, 1250], pts: [
        pt(1, 'Kamna 6 kW', 'Na dřevo, s kameny.', [500, st.y[1], 470]),
        pt(2, 'Ohrádka', 'Dřevěná, kolem kamen.', [st.x[1] + Q.guard + 10, st.y[1] + Q.guard + 10, 690]),
        pt(3, 'Komín', 'Izolovaný, 60 cm nad střechou.', [fx, fy, 1750]),
      ] }),
    end];
}

// Stav scény (čísla), mezi kapitolami se plynule prolíná.
const SK = ['az', 'el', 'r', 'tx', 'ty', 'tz', 'roofP', 'roofN', 'zp', 'zn', 'a', 'b', 'g', 'loft', 'dim', 'fx0', 'fx1', 'fz0', 'fz1', 'tags', 'dims', 'bx0', 'bx1', 'by0', 'by1', 'bz0', 'bz1', 'azm', 'elm'];
function keyOf(c, D) {
  const H = D.H, F = D.ffl, c2 = c.cut || {}, fo = c.focus, W2 = D.W ? D.W / 2 : 1.25, tw = (D.tw ?? 0.175) * 1000;
  const g = c2.g ?? NONE, cut = k => Math.min(c2[k] ?? NONE, g);
  const [x0, x1, y0, y1] = fo || [0, D.L * 1000, 0, W2 * 2000];
  return [c.cam.az, c.cam.el, c.cam.r, c.cam.at[0] / 1000 - H, F + c.cam.at[2] / 1000, c.cam.at[1] / 1000 - W2,
    c.roof?.p ?? 1, c.roof?.n ?? 1, cut('zp'), cut('zn'), cut('a'), cut('b'), g, c.loft ?? 1, fo ? 1 : 0,
    x0 / 1000 - H, x1 / 1000 - H, y0 / 1000 - W2, y1 / 1000 - W2, c.tags ? 1 : 0, c.dims ? 1 : 0,
    // obálka záběru: na úzkých displejích se kamera oddálí tak, aby se do výřezu vešla celá
    ...(c.key === 'ext' ? [-H - 0.2, H + 0.1 + (D.total - D.L), 0, D.ridge, -W2 - 0.05, W2 + 0.05]
      : !fo ? [-H, H + 0.3, 0.6, F + (D.sauna ? D.wallH : MID), -W2 - 0.05, W2 + 0.05]
      : [Math.max(x0, 0) / 1000 - H, Math.min(x1, D.L * 1000) / 1000 - H, F + (c.key === 'loft' ? 1.9 : 0), F + (c.key === 'loft' ? 3.0 : 2.1), Math.max(y0, tw) / 1000 - W2, Math.min(y1, W2 * 2000 - tw) / 1000 - W2]),
    // na výšku (mobil) se celkové záběry natočí víc od štítu, dlouhý dům pak lépe vyplní úzký výřez
    c.cam.maz ?? c.cam.az, c.cam.mel ?? c.cam.el];
}

/* ------------------------------------------------------------------ markup */

function markup(id, D, P, CH, o) {
  const N = CH.length, facts = o.FACTS;
  const pts = CH.flatMap((c, i) => (c.pts || []).map(p => ({ ...p, ch: i, id: `c${i}-${p.n}` })));
  const legend = c => c.pts ? `<ol class="pv-legend">${c.pts.map(p => `<li><span class="pv-num" aria-hidden="true">${p.n}</span><span><b>${p.name}</b> <span class="pv-legend-text">${p.text}</span></span></li>`).join('')}</ol>` : '';
  const cta = (o.cta || []).map(b => `<a class="${b.primary ? 'btn btn-primary' : 'btn btn-secondary'}" href="${b.href}">${b.label}</a>`).join('');
  const chapters = CH.map((c, i) => `
    <article class="pv-ch" data-i="${i}" id="${id}-ch${i + 1}" aria-labelledby="${id}-cht${i + 1}">
      <p class="pv-ch-no"><span>${pad(i + 1)}</span>${c.short}</p>
      <h3 class="pv-ch-title" id="${id}-cht${i + 1}">${c.title}</h3>
      <p class="pv-ch-text">${c.text}</p>
      ${legend(c)}${c.final ? `<dl class="pv-dimlist">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${cta ? `<p class="dz-cta-list">${cta}</p>` : ''}` : ''}
    </article>`).join('');
  const dots = CH.map((c, i) => `<button type="button" class="pv-dot" data-i="${i}" aria-label="Kapitola ${i + 1}: ${c.short}" aria-controls="${id}-ch${i + 1}"><span aria-hidden="true"></span></button>`).join('');
  const hotspots = pts.map(p => `<button type="button" class="pv-hs" data-part="${p.id}" data-ch="${p.ch}" aria-pressed="false" tabindex="-1" aria-hidden="true" aria-label="${p.n}: ${p.name}. ${p.text}"><span>${p.n}</span></button>`).join('');
  const labels = pts.map(p => `<div class="pv-lb" data-part="${p.id}"><span class="pv-num">${p.n}</span><span class="pv-lb-t"><b>${p.name}</b><span>${p.text}</span></span></div>`).join('');
  const tbs = CH.map((c, i) => `<div class="pv-tbi" data-i="${i}"><p class="pv-tb-h">${c.title}</p><p class="pv-tb-p">${first(c.text)}</p></div>`).join('');
  const tags = CH.flatMap(c => (Array.isArray(c.tags) ? c.tags : [])).map(([t]) => `<span class="dz-room">${t}</span>`).join('');
  const h = o.head === false ? '' : `<div class="pv-head"><p class="pv-eyebrow">${o.head?.eyebrow ?? 'Dispozice'}</p><h2 class="pv-h">${o.head?.title ?? `Co je uvnitř ${D.gen}`}</h2>${o.head?.lead ? `<p class="pv-lead">${o.head.lead}</p>` : ''}</div>`;
  return { pts, html: `${h}
<div class="pv-scrolly">
  <div class="pv-pin">
    <div class="pv-stage dz-stage" data-step="0">
      <div class="pv-art">${planSvg(D, P, CH)}</div>
      <div class="pv-gl" aria-hidden="true"></div>
      <div class="pv-overlay">${hotspots}<div class="pv-dimlabels" aria-hidden="true"></div><div class="dz-rooms" aria-hidden="true">${tags}</div></div>
      <svg class="pv-leaders" aria-hidden="true"></svg>
      <div class="pv-labels" aria-hidden="true">${labels}</div>
      <div class="pv-tb">
        <div class="pv-tb-top"><p class="pv-hud" aria-hidden="true"><span class="pv-hud-no">01</span><span class="pv-hud-of">/ ${pad(N)}</span><span class="pv-hud-name">${CH[0].short}</span></p>
          <nav class="pv-dots" aria-label="Kapitoly dispozice">${dots}</nav></div>
        <div class="pv-tb-stack" aria-hidden="true">${tbs}</div>
      </div>
      <p class="pv-tag">${D.tagName}</p>
      <div class="pv-factsbar" aria-hidden="true">${facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      ${cta ? `<div class="dz-cta">${cta}</div>` : ''}
      <div class="pv-card" aria-hidden="true"><div class="pv-card-in"></div></div>
    </div>
  </div>
  <div class="pv-chapters">${chapters}</div>
</div>` };
}

// Statický půdorys (bez WebGL, slabá zařízení, omezený pohyb, plakát před načtením 3D). Štít A vlevo, levá stěna
// nahoře, jako vykresy/pudorys.svg. Jednotky mm.
function planSvg(D, P, CH) {
  if (D.sauna) return saunaPlanSvg(D, P, CH);
  const L = D.L * 1000, T = 175, V = D, r = (x0, x1, y0, y1, cls, extra = '') => `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}" class="${cls}"${extra}/>`;
  const segs = (a, b, holes) => { const out = []; let at = a; for (const [h0, h1] of holes.slice().sort((p, q) => p[0] - q[0])) { if (h0 > at) out.push([at, h0]); at = Math.max(at, h1); } if (b > at) out.push([at, b]); return out; };
  let s = r(0, L, 0, 2500, 'dz-p-floor');
  CH.forEach((c, i) => { if (c.focus && c.pts) s += r(Math.max(0, c.focus[0]), Math.min(L, c.focus[1]), Math.max(0, c.focus[2]), Math.min(2500, c.focus[3]), 'dz-z', ` data-ch="${i}"`); });
  // obvodové stěny s okny, štít A prosklený
  for (const [side, y0, y1] of [['L', 0, T], ['R', 2500 - T, 2500]]) {
    const holes = V.open[side].map(o => [o[0], o[1]]);
    for (const [a, b] of segs(T, L - T, holes)) s += r(a, b, y0, y1, 'dz-p-wall');
    for (const [a, b, lo] of V.open[side]) s += r(a, b, y0 + 60, y1 - 60, lo < 50 ? 'dz-p-door' : 'dz-p-glass');
    s += r(0, T, y0, y1, 'dz-p-wall') + r(L - T, L, y0, y1, 'dz-p-wall');
  }
  for (const [a, b] of segs(T, 2500 - T, V.open.B.map(o => [o[0], o[1]]))) s += r(L - T, L, a, b, 'dz-p-wall');
  for (const [a, b] of V.open.B) s += r(L - T + 60, L - 60, a, b, 'dz-p-glass');
  s += r(30, 90, T, 2500 - T, 'dz-p-glass');
  for (const c of V.gableA.cuts) s += r(0, 120, c - 30, c + 30, 'dz-p-wall');
  if (V.gableA.door) s += r(0, 120, V.gableA.door[0], V.gableA.door[1], 'dz-p-door');
  // příčky
  const parts = P.partitions || [[P.xPart, P.xPart + 80, T, 2500 - T, [[P.bathDoor[0], P.bathDoor[1]]], true]];
  for (const [x0, x1, y0, y1, doors, cross] of parts) {
    const isCross = cross || x1 - x0 < y1 - y0;
    if (isCross) for (const [a, b] of segs(y0, y1, doors)) s += r(x0, x1, a, b, 'dz-p-wall');
    else for (const [a, b] of segs(x0, x1, doors)) s += r(a, b, y0, y1, 'dz-p-wall');
  }
  // vybavení
  const k = P.kitchen.run; s += r(k.x[0], k.x[1], k.y[0], k.y[1], 'dz-p-f');
  for (const [name, a, b, zones] of P.kitchen.parts) {
    s += `<line x1="${a}" y1="${k.y[0]}" x2="${a}" y2="${k.y[1]}" class="dz-p-l"/>`;
    const cx = (a + b) / 2, cy = (k.y[0] + k.y[1]) / 2;
    if (name === 'dřez') s += r(cx - 200, cx + 200, cy - 180, cy + 180, 'dz-p-l');
    if (zones) for (let i = 0; i < zones; i++) s += `<circle cx="${cx + (i % 2 ? 100 : -100)}" cy="${cy + (zones > 2 ? (i < 2 ? -110 : 110) : 0)}" r="75" class="dz-p-l"/>`;
  }
  for (const it of P.furn) {
    const [x0, x1] = it.x, [y0, y1] = it.y;
    if (it.id === 'ac' || it.id === 'ladder' || it.id === 'radiator') continue;
    s += r(x0, x1, y0, y1, 'dz-p-f');
    if (it.id === 'shower') s += `<path d="M${x0} ${y0}L${x1} ${y1}M${x0} ${y1}L${x1} ${y0}" class="dz-p-l"/>`;
    if (it.id === 'bed') s += r(x0 + 60, x1 - 60, y0 + 40, y0 + 440, 'dz-p-l');
    if (it.id === 'wc') s += `<ellipse cx="${(x0 + x1) / 2}" cy="${(y0 + y1) / 2}" rx="${(x1 - x0) / 2 - 30}" ry="${(y1 - y0) / 2 - 30}" class="dz-p-l"/>`;
  }
  if (P.stairs) { const S = P.stairs, run = (S.x[1] - S.x[0]) / S.n; s += r(S.x[0], S.x[1], S.y[0], S.y[1], 'dz-p-f'); for (let i = 1; i < S.n; i++) s += `<line x1="${S.x[0] + i * run}" y1="${S.y[0]}" x2="${S.x[0] + i * run}" y2="${S.y[1]}" class="dz-p-l"/>`; }
  if (P.loft) s += r(P.loft.x[0], P.loft.x[1], T, 2500 - T, 'dz-p-loft');
  // popisky místností a čísla bodů
  const plan = CH.find(c => c.key === 'plan');
  if (plan && Array.isArray(plan.tags)) for (const [t, at, sv] of plan.tags) { const [x, y] = sv || at; s += `<text x="${x}" y="${y}" class="dz-p-t">${t.split(' · ')[0]}</text>`; }
  CH.forEach((c, i) => (c.pts || []).forEach(p => { s += `<g class="pv-s-mk dz-mk" data-ch="${i}"><circle cx="${clamp(p.at[0], 120, L - 120)}" cy="${clamp(p.at[1], 120, 2380)}" r="110"/><text x="${clamp(p.at[0], 120, L - 120)}" y="${clamp(p.at[1], 120, 2380) + 40}">${p.n}</text></g>`; }));
  return `<svg class="pv-svg dz-svg" viewBox="-250 -250 ${L + 500} 3000" role="img" aria-label="Půdorys Domu ${D.key}: štít se vstupem vlevo, oj vpravo">${s}</svg>`;
}

// Statický půdorys sauny (čelo A se vstupem vlevo, levá stěna nahoře, jako vykresy/pudorys.svg).
function saunaPlanSvg(D, Q, CH) {
  const L = Q.L, W = Q.W, T = Q.TW, r = (x0, x1, y0, y1, cls, extra = '') => `<rect x="${Math.min(x0, x1)}" y="${Math.min(y0, y1)}" width="${Math.abs(x1 - x0)}" height="${Math.abs(y1 - y0)}" class="${cls}"${extra}/>`;
  const segs = (a, b, holes) => { const out = []; let at = a; for (const [h0, h1] of holes.slice().sort((p, q) => p[0] - q[0])) { if (h0 > at) out.push([at, h0]); at = Math.max(at, h1); } if (b > at) out.push([at, b]); return out; };
  let s = r(0, L, 0, W, 'dz-p-floor');
  CH.forEach((c, i) => { if (c.focus && c.pts) s += r(Math.max(0, c.focus[0]), Math.min(L, c.focus[1]), Math.max(0, c.focus[2]), Math.min(W, c.focus[3]), 'dz-z', ` data-ch="${i}"`); });
  for (const [side, y0, y1] of [['L', 0, T], ['R', W - T, W]]) {
    for (const [a, b] of segs(0, L, Q.win[side].map(o => [o[0], o[1]]))) s += r(a, b, y0, y1, 'dz-p-wall');
    for (const [a, b] of Q.win[side]) s += r(a, b, y0 + 50, y1 - 50, 'dz-p-glass');
  }
  for (const [a, b] of segs(T, W - T, [[Q.doorA[0], Q.doorA[1]]])) s += r(0, T, a, b, 'dz-p-wall');
  s += r(0, T, Q.doorA[0], Q.doorA[1], 'dz-p-door') + r(L - T, L, T, W - T, 'dz-p-wall');
  if (Q.xPart) { for (const [a, b] of segs(T, W - T, [[Q.doorS[0], Q.doorS[1]]])) s += r(Q.xPart, Q.xPart + Q.part, a, b, 'dz-p-wall'); s += r(Q.xPart, Q.xPart + Q.part, Q.doorS[0], Q.doorS[1], 'dz-p-glass'); }
  s += r(Q.benchLow[0], Q.benchLow[1], T, W - T, 'dz-p-f') + r(Q.benchUp[0], Q.benchUp[1], T, W - T, 'dz-p-f');
  for (let y = T + 100; y < W - T; y += 100) s += `<line x1="${Q.benchUp[0]}" y1="${y}" x2="${Q.benchUp[1]}" y2="${y}" class="dz-p-l"/>`;
  const st = Q.stove, g = Q.guard;
  s += r(st.x[0], st.x[1], st.y[0], st.y[1], 'dz-p-stove') + `<circle cx="${Q.flue[0]}" cy="${Q.flue[1]}" r="${Q.flue[2] / 2}" class="dz-p-l"/>`;
  s += `<path d="M${st.x[0]} ${st.y[1] + g}H${st.x[1] + g}V${st.y[0] - 20}" class="dz-p-guard"/>`;
  if (Q.benchA) s += r(Q.benchA.x[0], Q.benchA.x[1], Q.benchA.y[0], Q.benchA.y[1], 'dz-p-f');
  if (Q.hooks) s += r(Q.hooks[0], Q.hooks[1], W - T - 200, W - T, 'dz-p-l');
  const plan = CH.find(c => c.key === 'plan');
  if (plan) for (const [t, at, sv] of plan.tags) { const [x, y] = sv || at; s += `<text x="${x}" y="${y}" class="dz-p-t">${t.split(' · ')[0]}</text>`; }
  CH.forEach((c, i) => (c.pts || []).forEach(p => { const x = clamp(p.at[0], 120, L - 120), y = clamp(p.at[1], 120, W - 120); s += `<g class="pv-s-mk dz-mk" data-ch="${i}"><circle cx="${x}" cy="${y}" r="90"/><text x="${x}" y="${y + 34}">${p.n}</text></g>`; }));
  return `<svg class="pv-svg dz-svg" viewBox="-250 -250 ${L + 500} ${W + 500}" role="img" aria-label="Půdorys: ${Q.name}, vstup vlevo">${s}</svg>`;
}

/* ------------------------------------------------------------------ mount */

let uid = 0;
export function mountDispozice(root, opts = {}) {
  const o = { mode: 'auto', lazyMargin: '120%', farMargin: '250%', variant: 'm', ...opts };
  const v = String(o.variant || 'm').toLowerCase(), isSauna = !!SPLAN[v];
  const D = isSauna ? saunaDims(v) : Object.assign(dimsOf(v), { tagName: `Dům ${dimsOf(v).key} · ilustrační model`, gen: `Domu ${dimsOf(v).key}`, name3d: `Domu ${dimsOf(v).key}` }), P = isSauna ? SPLAN[v] : PLAN[v] || PLAN.m;
  const fx = o.facts || {};
  o.FACTS = o.factsList || [['Užitná plocha', fx.net || '–'], ['Vnitřní rozměry', `${fmt(P.inner[0] / 1000, 2)} × ${fmt(P.inner[1] / 1000, 2)} m`], ['Světlá výška', fx.height || '–'], ['Osoby', fx.people || '–'], ['Spaní', fx.sleep || '–'], ['Délka domu', fx.len || `${fmt(D.L)} m`]];
  let CH = isSauna ? saunaChapters(v, D, P) : chaptersFor(v, D, P, o);
  if (Array.isArray(o.chapters)) CH = CH.filter(c => o.chapters.includes(c.key));
  const N = CH.length, KEYS = CH.map(c => keyOf(c, D));
  const id = 'dz' + (++uid);
  root.classList.add('pv', 'dz', 'pv--compact');
  const mk = markup(id, D, P, CH, o), PTS = mk.pts;
  root.innerHTML = mk.html;
  applyEmbed(root, { compact: true, towing: false, specs: false });
  root.style.setProperty("--pv-travel", o.travel || `${(N - 1) * 65}svh`);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const scrolly = $('.pv-scrolly'), pin = $('.pv-pin'), stage = $('.pv-stage'), glBox = $('.pv-gl');
  const chapters = $$('.pv-ch'), dots = $$('.pv-dot'), hs = $$('.pv-hs'), tbis = $$('.pv-tbi'), lbs = $$('.pv-lb'), mks = $$('.dz-mk'), zns = $$('.dz-z');
  const hudNo = $('.pv-hud-no'), hudName = $('.pv-hud-name'), factsbar = $('.pv-factsbar'), tag = $('.pv-tag'), tbTop = $('.pv-tb-top'), cta = $('.dz-cta');
  const card = cardCtl($('.pv-card'));
  const reduced = o.reducedMotion ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isStatic = reduced || o.mode === 'static' || (o.mode === 'auto' && (lowEnd() || !hasWebGL()));
  root.classList.toggle('pv--static', isStatic);
  root.classList.toggle('pv--reduced', reduced);
  const extras = stageExtras({ stage, scrolly, pin, reduced });
  const fc = CH.find(c => c.final);
  if (fc) finalCard(stage, `<p class="pv-card-k">${pad(N)} · ${fc.short}</p><p class="pv-card-h">${fc.title}</p><dl class="pv-card-facts">${o.FACTS.map(([a2, b]) => `<div><dt>${a2}</dt><dd>${b}</dd></div>`).join('')}</dl>`);
  // statická verze: texty bez slibu pohybu (animovaná verze je beze změny)
  const staticCopy = () => {
    if (o.head?.leadStatic) { const l = root.querySelector('.pv-lead'); if (l) l.textContent = o.head.leadStatic; }
    chapters.forEach((el, i) => { const t = CH[i].textStatic, q = el.querySelector('.pv-ch-text'); if (t && q) q.textContent = t; });
  };
  if (isStatic) staticCopy();

  let p = 0, active = -1, part = null, auto = null, visible = false, ticking = false, viewer = null, destroyed = false, proj = null;
  const tbBottom = () => { const t = tbis[active]; return (t && t.classList.contains('is-on') ? t : tbTop).getBoundingClientRect().bottom; };
  const ann = annotator(stage, glBox, $('.pv-leaders'), tbBottom, () => tag.getBoundingClientRect().bottom);
  const label = i => `3D model: ${isSauna ? D.name3d : 'Dům ' + D.key} s vybavením. Kapitola ${i + 1}: ${CH[i].title}.`;

  function layout() {
    const cm = ann.cardMode(), items = [];
    PTS.forEach((pd, k) => {
      const on = !cm && !isStatic && !!proj && pd.ch === active && !!proj[k] && proj[k][2] > 0.3;
      lbs[k].classList.toggle('is-on', on);
      if (on) items.push({ id: pd.id, el: lbs[k], x: proj[k][0] + glBox.offsetLeft, y: proj[k][1] + glBox.offsetTop });
    });
    ann.place(items, { reserve: CH[active]?.final ? factsbar.offsetHeight + 16 : 0 });
    if (cm && !isStatic) cardContent();
  }
  function cardContent() {
    const c = CH[active]; if (!c) return;
    const ps = PTS.filter(x => x.ch === active);
    let pd = part ? PTS.find(x => x.id === part) : null;
    if (!pd && ps.length && viewer) { const fr = clamp(p - active + 0.5, 0, 1); if (fr >= 0.3 && fr <= 0.7) pd = ps[clamp(Math.floor((fr - 0.3) / 0.4 * ps.length), 0, ps.length - 1)]; }
    const a = pd ? pd.id : null;
    if (a !== auto) { auto = a; hs.forEach(b => b.classList.toggle('is-cur', b.dataset.part === a)); }
    if (c.final) return;   // poslední kapitola: samostatná karta s čísly a tlačítky (finalCard)
    if (pd) card.set(pd.id, cardPart(active, pd));
    else card.set('c' + active, cardCh(active));
  }
  const cardK = i => `<p class="pv-card-k">${pad(i + 1)} · ${CH[i].short}</p>`;
  const cardCh = i => `${cardK(i)}<p class="pv-card-h">${CH[i].title}</p><p class="pv-card-p">${first(CH[i].text)}</p>`;
  const cardPart = (i, pd) => `${cardK(i)}<p class="pv-card-h"><span class="pv-num">${pd.n}</span>${pd.name}</p><p class="pv-card-p">${pd.text}</p>`;
  card.fit([...CH.map((c, i) => c.final ? null : cardCh(i)).filter(Boolean), ...PTS.filter(x => CH[x.ch] && !CH[x.ch].final).map(x => cardPart(x.ch, x))]);
  function setActive(i) {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => k === i ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current'));
    stage.dataset.step = i;
    stage.classList.toggle('dz-final', !!CH[i].final); stage.classList.toggle('is-final', !!CH[i].final);
    hudNo.textContent = pad(i + 1); hudName.textContent = CH[i].short;
    tbis.forEach((t, k) => t.classList.toggle('is-on', k === i));
    hs.forEach(b => { const on = +b.dataset.ch === i && !isStatic; b.tabIndex = on ? 0 : -1; b.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    mks.forEach(m => m.classList.toggle('is-on', +m.dataset.ch === i));
    zns.forEach(m => m.classList.toggle('is-on', +m.dataset.ch === i));
    factsbar.classList.toggle('is-on', !!CH[i].final);
    cta && cta.classList.toggle('is-on', !!CH[i].final);
    ann.reset();
    if (part && PTS.find(x => x.id === part).ch !== i) setPart(null);
    viewer && viewer.label(label(i));
    layout();
  }
  function setPart(pid) {
    part = pid;
    hs.forEach(b => b.setAttribute('aria-pressed', b.dataset.part === pid ? 'true' : 'false'));
    lbs.forEach(l => l.classList.toggle('is-hl', l.dataset.part === pid));
    if (ann.cardMode()) cardContent();
  }

  let rafU = 0;
  function update() {
    rafU = 0; ticking = false;
    if (destroyed) return;
    if (!isStatic) { const r = scrollProgress(scrolly, pin); p = r * (N - 1); extras.progress(r); }
    setActive(isStatic ? Math.max(active, 1) : stepHyst(p, active, N));
    viewer && viewer.target(p, false);
    if (ann.cardMode() && !isStatic) cardContent();
  }
  const onScroll = () => { gateKick(); if (!ticking && !destroyed) { ticking = true; rafU = requestAnimationFrame(update); } };
  const onResize = () => { ann.reset(); onScroll(); layout(); };
  const gate = gateEntry(pin);
  const ioVis = new IntersectionObserver(([e]) => {
    visible = gate.visible = e.isIntersecting;
    if (destroyed) return;
    if (visible) { addEventListener('scroll', onScroll, { passive: true }); update(); }
    else { removeEventListener('scroll', onScroll); viewer && viewer.gate(false); }
    gateKick();
  });
  ioVis.observe(scrolly);
  addEventListener('resize', onResize, { passive: true });

  let life = null;
  if (!isStatic) {
    life = lifecycle(scrolly, {
      near: o.lazyMargin, far: o.farMargin,
      create: () => createViewer(glBox, D, P, CH, KEYS, PTS, pr => { proj = pr; layout(); }),
      ready: vw => { viewer = gate.viewer = vw; vw.label(label(active)); vw.target(p, true); stage.classList.add('pv-stage--3d'); gateKick(); },
      drop: () => { viewer = gate.viewer = null; proj = null; stage.classList.remove('pv-stage--3d'); layout(); },
      fail: err => { console.warn('[dispozice] 3D se nepodařilo spustit, zůstává půdorys.', err); root.classList.add('pv--static'); staticCopy(); },
    });
  }

  function goTo(i) {
    i = clamp(i, 0, N - 1);
    if (isStatic) { chapters[i].scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
    scrollToProgress(scrolly, pin, i / (N - 1), !reduced);
    if (!visible) { cancelAnimationFrame(rafU); rafU = requestAnimationFrame(update); }
  }
  const onDot = e => { const b = e.target.closest('.pv-dot'); if (b) goTo(+b.dataset.i); };
  const onDotKey = e => {
    const b = e.target.closest('.pv-dot'); if (!b) return;
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    e.preventDefault(); const n = clamp(+b.dataset.i + k, 0, N - 1); dots[n].focus(); goTo(n);
  };
  const onPart = e => { const b = e.target.closest('.pv-hs'); if (b) setPart(part === b.dataset.part ? null : b.dataset.part); };
  const onFocus = e => { const b = e.target.closest('.pv-hs'); if (b && b.matches(':focus-visible')) setPart(b.dataset.part); };
  const onKey = e => { if (e.key === 'Escape' && part) setPart(null); };
  const onOver = e => { if (!isStatic) return; const c = e.target.closest('.pv-ch'); if (c) setActive(+c.dataset.i); };
  root.addEventListener('click', onDot); root.addEventListener('keydown', onDotKey);
  root.addEventListener('click', onPart); root.addEventListener('focusin', onFocus); root.addEventListener('keydown', onKey);
  root.addEventListener('pointerover', onOver);

  setActive(isStatic ? Math.min(1, N - 1) : 0);
  rafU = requestAnimationFrame(update);
  // Ladění (testy rozvržení): root.__dz.go(p) nastaví stav p synchronně, bez scrollu a bez čekání na snímek.
  root.__dz = { go(q) { p = q; setActive(clamp(Math.round(q), 0, N - 1)); glBox.__pv && glBox.__pv.show(q); if (ann.cardMode() && !isStatic) cardContent(); layout(); return CH[active].key; } };

  return {
    goTo,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafU); card.clear(); extras.destroy();
      ioVis.disconnect(); gateDrop(gate); life && life.destroy();
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      root.removeEventListener('click', onDot); root.removeEventListener('keydown', onDotKey);
      root.removeEventListener('click', onPart); root.removeEventListener('focusin', onFocus); root.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerover', onOver);
      delete root.__dz;
      root.innerHTML = ''; root.style.removeProperty('--pv-travel');
      root.classList.remove('pv', 'dz', 'pv--static', 'pv--reduced', 'pv--compact');
    },
  };
}

/* ------------------------------------------------------------------ 3D */

async function createViewer(box, D, P, CH, KEYS, PTS, onProject) {
  const THREE = await import('three');
  const [{ RoomEnvironment }, { RoundedBoxGeometry }] = await Promise.all([
    import('three/addons/environments/RoomEnvironment.js'), import('three/addons/geometries/RoundedBoxGeometry.js')]);
  const N = KEYS.length, H = D.H, F = D.ffl, small = innerWidth < 720;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'pv-canvas'; canvas.setAttribute('role', 'img');
  box.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0x8a8172, 1.0); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff1dc, 1.9);
  key.position.set(3.2, 10, 6.5); key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -H - 2.5, right: H + 2.5, top: 6, bottom: -6, near: 1, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe7ff, 0.45); rim.position.set(-8, 6, -6); scene.add(rim);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex(THREE), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000, opacity: 0.32 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(D.L + 1.2, 3.3), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.set(0.15, 0.003, 0); contact.renderOrder = -1; scene.add(contact);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Ztlumení mimo zónu kapitoly: jeden společný shader na všech materiálech (žádné další draw cally). Barva se míchá
  // do barvy pozadí scény, takže ostatní místnosti ustoupí do pozadí ve světlém i tmavém motivu.
  const DIM = { uFocus: { value: new THREE.Vector4(-99, 99, -99, 99) }, uDim: { value: 0 }, uHaze: { value: new THREE.Vector3(0.94, 0.91, 0.86) } };
  const dimify = m => {
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, DIM);
      sh.vertexShader = 'varying vec3 vDzW;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 dzw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    dzw = instanceMatrix * dzw;
  #endif
    vDzW = (modelMatrix * dzw).xyz; }`);
      sh.fragmentShader = 'varying vec3 vDzW;\nuniform vec4 uFocus;\nuniform float uDim;\nuniform vec3 uHaze;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
  { vec2 dq = max(vec2(uFocus.x - vDzW.x, uFocus.z - vDzW.z), vec2(vDzW.x - uFocus.y, vDzW.z - uFocus.w));
    float dd = length(max(dq, 0.0));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, uDim * smoothstep(0.0, 0.5, dd) * 0.6); }`);
    };
    m.customProgramCacheKey = () => 'dz-dim';
    return m;
  };

  // Řezy: rovina pro každou skupinu (stěna +Z, −Z, štít A, štít B, ostatní). Konstanta = výška řezu nad terénem.
  const planes = { zp: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), zn: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), a: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), b: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99), g: new THREE.Plane(new THREE.Vector3(0, -1, 0), 99) };
  const owned = new Map(), groupMats = {};
  // Vlastní kopie materiálu pro skupinu (řez, průhlednost při odsunu, ztlumení).
  const own = (gk, base) => {
    const k = gk + '|' + base.uuid;
    if (!owned.has(k)) {
      const m = dimify(base.clone());
      if (planes[gk]) m.clippingPlanes = [planes[gk]];
      m.userData = { op: base.opacity ?? 1, tr: !!base.transparent };
      if ('envMapIntensity' in m) m.envMapIntensity = base.transparent ? 1.1 : 0.45;
      owned.set(k, m); (groupMats[gk] ||= []).push(m);
    }
    return owned.get(k);
  };

  /* --- dům: přívěs a plášť z podvozku (stejný model jako sekce Konstrukce), kostra a izolace pryč --- */
  const drop = o => { if (!o) return; o.parent.remove(o); o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); };
  // Sauna: přívěs stejným builderem (jako projekt/v2/ref), plášť a interiér níže. Dům: přívěs a plášť z podvozku.
  const model = D.sauna ? new THREE.Group() : buildProcedural(THREE, D);
  if (!D.sauna) { drop(model.getObjectByName('L_skelet')); ['izolace_predni', 'izolace_zadni', 'izolace_stit_b', 'izolace_stit_a'].forEach(n => drop(model.getObjectByName(n))); }
  scene.add(model);
  const G = {};
  const grp = (k, parent = model) => { const g = new THREE.Group(); g.name = 'dz_' + k; parent.add(g); G[k] = g; return g; };
  ['zp', 'zn', 'a', 'b', 'g', 'loft', 'rp', 'rn', 'tr'].forEach(k => grp(k));
  if (!D.sauna) {
    const shellOf = { stena_predni: 'zp', stena_zadni: 'zn', stit_predni: 'b', stit_zadni: 'a', strecha: 'rp', hreben: 'rp', strecha_2: 'rn' };
    for (const [n, k] of Object.entries(shellOf)) { const o = model.getObjectByName(n); if (o) { o.position.set(0, 0, 0); G[k].add(o); } }
    G.tr.add(model.getObjectByName('L_prives'));
    model.getObjectByName('L_plast')?.removeFromParent();
  } else if (P.trailer) {
    const base = dimsOf('s'), Hs = D.H;
    const tm = buildProcedural(THREE, { ...base, key: 'SAUNA', L: D.L, H: Hs, axleX: -Hs + 1.7, hitch: Hs + 1.5, total: D.L + 1.5, open: { L: [], R: [], B: [] }, gableA: { cuts: [], door: null, transom: 2000 }, loft: null, partition: null, skylight: null });
    G.tr.add(tm.getObjectByName('L_prives'));
    tm.traverse(m => { if (m.geometry && !G.tr.getObjectById(m.id)) m.geometry.dispose(); });
  }
  // přivlastnit materiály pláště a přívěsu skupinám, sklo světlejší (je vidět dovnitř)
  for (const k of Object.keys(G)) G[k].traverse(m => {
    if (!m.isMesh) return;
    const glass = m.material.transparent && m.material.color.getHex() === 0x24302b;
    if (glass) { m.material = m.material.clone(); m.material.color.set(0x8fa3a0); m.material.opacity = 0.32; m.material.roughness = 0.05; }
    if (m.material.bumpMap) m.material.bumpScale = 1.2;
    m.material = own(k === 'tr' ? 'tr' : k, m.material);
    m.castShadow = !glass; m.receiveShadow = true;
  });

  /* --- interiér --- */
  const W2 = D.W ? D.W / 2 : 1.25, X = x => x / 1000 - H, Z = y => y / 1000 - W2, Y = z => F + z / 1000;
  const zin = 1.075, xA = -H + 0.12, xB = H - 0.175, L = D.L * 1000;
  const roofU = z => D.yUnder(Math.abs(z)) - 0.006;
  const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
  const tx = interiorTextures(THREE);
  const mat = {
    spruce: M(0xffffff, { map: tx.spruce, roughness: 0.78, side: THREE.DoubleSide }), floor: M(0xffffff, { map: tx.oak, roughness: 0.62 }),
    oak: M(0xd8b48a, { map: tx.oakFine, roughness: 0.6 }), ply: M(0xe3cfac, { roughness: 0.7 }),
    white: M(0xf3f1ec, { roughness: 0.55 }), top: M(0x2e312d, { roughness: 0.42 }), black: M(0x1d1f1c, { roughness: 0.45, metalness: 0.3 }),
    steel: M(0xc9cccb, { roughness: 0.3, metalness: 0.75 }), glassHob: M(0x121412, { roughness: 0.18, metalness: 0.2 }), zone: M(0x5b5f5a, { roughness: 0.4 }),
    sofa: M(0x8e968a, { roughness: 0.95 }), sofa2: M(0xa3aa9d, { roughness: 0.95 }), terra: M(0xc0714f, { roughness: 0.9 }), mustard: M(0xd9a441, { roughness: 0.9 }),
    linen: M(0xf2efe8, { roughness: 0.95 }), duvet: M(0xe7e1d4, { roughness: 0.95 }), throw: M(0x9aa48f, { roughness: 0.95 }),
    rug: M(0xe0d4bf, { roughness: 1 }), ceramic: M(0xfbfbf9, { roughness: 0.15 }), tile: M(0xffffff, { map: tx.tile, roughness: 0.35 }),
    mirror: M(0xc9d3d4, { roughness: 0.08, metalness: 0.6, emissive: 0x7d898b, emissiveIntensity: 0.55 }), leaf: M(0x5d7d4b, { roughness: 0.75 }), leaf2: M(0x7b9a5c, { roughness: 0.75 }), pot: M(0xb9643e, { roughness: 0.85 }),
    lampIn: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }), sky: new THREE.MeshBasicMaterial({ color: 0xeef3f4 }),
    showerGlass: M(0xcfe0e0, { roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
    poche: M(0x3a3d37, { roughness: 0.9 }),
  };
  const buckets = new Map();
  const put = (gk, base, geo, shadow = true) => {
    const m = own(gk, base), k = gk + '|' + m.uuid + '|' + shadow;
    if (!buckets.has(k)) buckets.set(k, { gk, m, shadow, geos: [] });
    buckets.get(k).geos.push(geo);
  };
  // kvádr z rozsahů params (mm)
  const blk = (gk, m, [x0, x1], [y0, y1], [z0, z1]) => put(gk, m, boxUV(THREE, (x1 - x0) / 1000, (z1 - z0) / 1000, (y1 - y0) / 1000).translate(X((x0 + x1) / 2), Y((z0 + z1) / 2), Z((y0 + y1) / 2)));
  // kvádr v metrech three.js
  const bm = (gk, m, x0, x1, y0, y1, z0, z1) => put(gk, m, boxUV(THREE, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  const soft = (gk, m, [x0, x1], [y0, y1], [z0, z1], rad = 0.04) => {
    const w = (x1 - x0) / 1000, h = (z1 - z0) / 1000, d = (y1 - y0) / 1000;
    put(gk, m, new RoundedBoxGeometry(w, h, d, 2, Math.min(rad, w / 2.1, h / 2.1, d / 2.1)).translate(X((x0 + x1) / 2), Y((z0 + z1) / 2), Z((y0 + y1) / 2)));
  };
  const shape = (pts, holes = []) => {
    const s = new THREE.Shape(pts.map(([u, w]) => new THREE.Vector2(u, w)));
    for (const [a, b, lo, hi] of holes) { const h = new THREE.Path(); h.moveTo(a, lo); h.lineTo(b, lo); h.lineTo(b, hi); h.lineTo(a, hi); h.closePath(); s.holes.push(h); }
    return s;
  };
  const ext = (s, d) => new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  const wallOf = it => (it.y[0] <= 200 ? 'zn' : it.y[1] >= 2300 ? 'zp' : 'g');
  // Sauna (Sauna na podvozku / zahradní): plášť s pultovou střechou, obklad z palubek, předsíň, lavice ve dvou úrovních,
  // kamna na dřevo s kameny, ohrádkou a komínem. Rozměry z params.py (SPLAN).
  function buildSauna() {
    const Q = P, TW = Q.TW / 1000, zi = W2 - TW, base = D.base, ceil = Y(Q.CEIL), xa = -H + TW, xb = H - TW;
    const wt = woodTex(THREE);
    const sm = {
      clad: M(0xffffff, { map: wt.map, bumpMap: wt.bump, bumpScale: 1.2, roughness: 0.8 }), trim: M(0xd9bfa3, { map: wt.map, roughness: 0.78 }),
      frame: M(0x30342f, { metalness: 0.3, roughness: 0.5 }), roof: M(0x3b3f3a, { metalness: 0.5, roughness: 0.48 }),
      glass: M(0x8fa3a0, { roughness: 0.05, metalness: 0.15, transparent: true, opacity: 0.32 }),
      aspen: M(0xfff3e0, { map: tx.oakFine, roughness: 0.7 }), lining: M(0xfff6ea, { map: tx.spruce, roughness: 0.78, side: THREE.DoubleSide }),
      stove: M(0x2a2c2d, { roughness: 0.55, metalness: 0.55 }), fire: new THREE.MeshBasicMaterial({ color: 0xff8c3a }), ember: new THREE.MeshBasicMaterial({ color: 0xffc46b }),
      stone: M(0x6c6e69, { roughness: 0.92 }), stone2: M(0x8d8e88, { roughness: 0.92 }), inox: M(0xc7cacb, { metalness: 0.8, roughness: 0.3 }),
      led: new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), plinth: M(0x3a3d37, { roughness: 0.9 }), duck: M(0xf3e2c3, { map: tx.oakFine, roughness: 0.75 }),
    };
    const under = D.under;
    // plášť: podélné stěny (u = X), čela (u = Z), otvory, rámy oken a dveří, rohové lišty
    const slabX = (gk, zFace, holes) => put(gk, sm.clad, ext(shape([[-H, base], [H, base], [H, under(H)], [-H, under(-H)]], holes), 0.02).translate(0, 0, zFace));
    const frameX = (gk, zo, s, [a, b, lo, hi], door) => {
      const d = 0.07, fw = 0.06, z = zo - s * 0.035;
      bm(gk, sm.frame, a, b, hi - fw, hi, z - d / 2, z + d / 2); bm(gk, sm.frame, a, b, lo, lo + fw, z - d / 2, z + d / 2);
      bm(gk, sm.frame, a, a + fw, lo, hi, z - d / 2, z + d / 2); bm(gk, sm.frame, b - fw, b, lo, hi, z - d / 2, z + d / 2);
      put(gk, sm.glass, boxUV(THREE, b - a - 2 * fw, hi - lo - 2 * fw, 0.012).translate((a + b) / 2, (lo + hi) / 2, z), false);
      if (!door) bm(gk, sm.frame, a - 0.02, b + 0.02, lo - 0.015, lo, zo - s * 0.06, zo + s * 0.04);
    };
    for (const [side, gk, s] of [['L', 'zn', -1], ['R', 'zp', 1]]) {
      const holes = Q.win[side].map(([a, b, lo, hi]) => [X(a), X(b), Y(lo), Y(hi)]);
      slabX(gk, s > 0 ? W2 - 0.02 : -W2, holes);
      holes.forEach(h => frameX(gk, s * W2, s, h));
      for (const sx of [-1, 1]) bm(gk, sm.trim, sx > 0 ? H - 0.095 : -H, sx > 0 ? H : -H + 0.095, base, under(sx * H), s > 0 ? W2 : -W2 - 0.022, s > 0 ? W2 + 0.022 : -W2);
      // obklad interiéru (palubky) s ostěním oken
      put(gk, sm.lining, ext(shape([[xa, F], [xb, F], [xb, ceil], [xa, ceil]], holes), 0.015).translate(0, 0, s > 0 ? zi : -zi - 0.015));
      for (const [a, b, lo, hi] of holes) {
        const z0 = s * zi, z1 = s * (W2 - 0.04);
        bm(gk, sm.lining, a, b, hi, hi + 0.015, z0, z1); bm(gk, sm.lining, a - 0.015, a, lo, hi, z0, z1); bm(gk, sm.lining, b, b + 0.015, lo, hi, z0, z1);
        bm(gk, sm.aspen, a - 0.02, b + 0.02, lo - 0.02, lo, z0 - s * 0.03, z1);
      }
    }
    const door = [Z(Q.doorA[0]), Z(Q.doorA[1]), F, Y(Q.doorA[2])];
    for (const [gk, x0, holes] of [['a', -H, [door]], ['b', H, []]]) {
      const zz = W2 - 0.02, slab = ext(shape([[-zz, base], [zz, base], [zz, under(x0)], [-zz, under(x0)]], holes), 0.02).rotateY(-Math.PI / 2).translate(x0 < 0 ? x0 + 0.02 : x0, 0, 0);
      put(gk, sm.clad, slab);
      put(gk, sm.lining, ext(shape([[-zi, F], [zi, F], [zi, ceil], [-zi, ceil]], holes), 0.015).rotateY(-Math.PI / 2).translate(x0 < 0 ? xa : xb + 0.015, 0, 0));
    }
    // vstupní dveře v čele A: rám, křídlo (dřevo / celé sklo), klika
    {
      const [a, b, lo, hi] = door, x = -H + 0.04, fw = 0.06;
      bm('a', sm.frame, x - 0.035, x + 0.035, hi - fw, hi, a, b); bm('a', sm.frame, x - 0.035, x + 0.035, lo, hi, a, a + fw); bm('a', sm.frame, x - 0.035, x + 0.035, lo, hi, b - fw, b);
      if (Q.doorAGlass) put('a', sm.glass, boxUV(THREE, 0.012, hi - lo - fw - 0.01, b - a - 2 * fw).translate(x, (lo + hi - fw) / 2, (a + b) / 2), false);
      else { bm('a', sm.trim, x - 0.02, x + 0.02, lo + 0.01, hi - fw, a + fw, b - fw); bm('a', sm.frame, x - 0.024, x - 0.02, lo + 1.15, lo + 1.45, a + fw + 0.12, a + fw + 0.14); }
      bm('a', sm.inox, x - 0.08, x - 0.03, lo + 1.0, lo + 1.02, b - fw - 0.2, b - fw - 0.06);
      for (let k = 0; k < 2; k++) bm('a', sm.duck, -H - 0.32 - k * 0.28, -H - 0.04 - k * 0.28, F - 0.03 - (k + 1) * (F / 3), F - (k + 1) * (F / 3), a - 0.12, b + 0.12);   // schůdky
      for (const zz of [a - 0.1, b + 0.07]) put('a', sm.duck, ext(shape([[0, 0], [0.62, 0], [0.62, 0.07], [0.04, F - F / 3 - 0.02], [0, F - F / 3 - 0.02]]), 0.035).rotateY(Math.PI).translate(-H - 0.02, 0, zz + 0.035));
    }
    // rohové lišty čel
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bm(sx < 0 ? 'a' : 'b', sm.trim, sx * H - (sx > 0 ? 0.022 : 0), sx * H + (sx < 0 ? 0.022 : 0), base, under(sx * H), sz * (W2 - 0.095), sz * (W2 - 0.0));
    if (!Q.trailer) bm('g', sm.plinth, -H + 0.12, H - 0.12, 0, base, -W2 + 0.12, W2 - 0.12);   // neutrální sokl (patky a hranoly nejsou vidět)
    // pultová střecha s přesahy, drážky krytiny ve spádu, oplechování; podhled (palubky) jde se střechou
    {
      const x0 = -H - Q.eaveA / 1000, x1 = H + Q.eave / 1000, rw = D.W + 2 * Q.eave / 1000, ang = Math.atan(D.tan), len = (x1 - x0) / Math.cos(ang), xc = (x0 + x1) / 2, yc = D.roofTop(xc) - Q.TR / 2000;
      put('rp', sm.roof, boxUV(THREE, len, Q.TR / 1000, rw).rotateZ(-ang).translate(xc, yc, 0));
      for (let z = -rw / 2 + 0.25; z < rw / 2 - 0.1; z += 0.5) put('rp', sm.roof, new THREE.BoxGeometry(len, 0.028, 0.012).rotateZ(-ang).translate(xc, yc + Q.TR / 2000 + 0.014, z));
      for (const sz of [1, -1]) put('rp', sm.frame, new THREE.BoxGeometry(len, Q.TR / 1000 + 0.04, 0.014).rotateZ(-ang).translate(xc, yc, sz * (rw / 2 + 0.007)));
      for (const xe of [x0, x1]) bm('rp', sm.frame, xe - 0.007, xe + 0.007, D.roofTop(xe) - Q.TR / 1000 - 0.02, D.roofTop(xe) + 0.01, -rw / 2, rw / 2);
      bm('rp', sm.lining, xa, xb, ceil, ceil + 0.015, -zi, zi);
    }
    // podlaha: předsíň dřevo, sauna pochozí rošt z osiky
    const xs = Q.xPart ? X(Q.xPart + Q.part) : xa;
    if (Q.xPart) put('g', mat.floor, boxUV(THREE, X(Q.xPart) - xa + 0.01, 0.02, 2 * zi).translate((xa + X(Q.xPart)) / 2, F - 0.01, 0));
    bm('g', sm.plinth, xs, xb, F - 0.04, F - 0.025, -zi, zi);
    for (let x = xs + 0.01; x < xb - 0.05; x += 0.1) bm('g', sm.duck, x, x + 0.085, F - 0.025, F, -zi + 0.01, zi - 0.01);
    // příčka se skleněnými dveřmi do sauny
    if (Q.xPart) {
      const [d0, d1, dh] = Q.doorS, x0 = X(Q.xPart), x1 = X(Q.xPart + Q.part);
      put('g', sm.lining, ext(shape([[-zi, F], [zi, F], [zi, ceil], [-zi, ceil]], [[Z(d0), Z(d1), F, Y(dh)]]), x1 - x0).rotateY(-Math.PI / 2).translate(x1, 0, 0));
      const xm = (x0 + x1) / 2;
      bm('g', sm.aspen, x0, x1, Y(dh), Y(dh) + 0.04, Z(d0), Z(d1));
      put('g', sm.glass, boxUV(THREE, 0.01, (dh - 20) / 1000, (d1 - d0 - 30) / 1000).translate(xm, Y(dh / 2), (Z(d0) + Z(d1)) / 2), false);
      bm('g', sm.aspen, xm - 0.03, xm + 0.03, Y(950), Y(1250), Z(d1) - 0.1, Z(d1) - 0.07);
    }
    // lavice ve dvou úrovních přes celou šířku: prkna z osiky, čela, nosníky, opěradla na zadní stěně, LED pod horní lavicí
    const bench = (xA0, xA1, zTop, front) => {
      const x0 = X(xA0), x1 = X(xA1), y = Y(zTop);
      for (let x = x0 + 0.005; x < x1 - 0.04; x += 0.1) bm('g', sm.aspen, x, Math.min(x + 0.088, x1), y - 0.028, y, -zi + 0.005, zi - 0.005);
      for (const z of [-zi + 0.05, 0, zi - 0.05]) bm('g', sm.aspen, x0 + 0.02, x1 - 0.02, y - 0.09, y - 0.028, z - 0.022, z + 0.022);
      if (front) for (let z = -zi + 0.01; z < zi - 0.03; z += 0.11) bm('g', sm.aspen, x0, x0 + 0.022, front, y - 0.03, z, Math.min(z + 0.095, zi - 0.01));
      else for (const z of [-zi + 0.05, zi - 0.05]) bm('g', sm.aspen, x0 + 0.03, x0 + 0.08, F, y - 0.09, z - 0.025, z + 0.025);
    };
    bench(Q.benchUp[0], Q.benchUp[1], Q.benchUp[2], Y(Q.benchLow[2]));
    bench(Q.benchLow[0], Q.benchLow[1], Q.benchLow[2], null);
    for (const zz of [1300, 1450]) bm('b', sm.aspen, xb - 0.03, xb, Y(zz), Y(zz) + 0.09, -zi + 0.02, zi - 0.02);
    put('g', sm.led, boxUV(THREE, 0.008, 0.01, 2 * zi - 0.08).translate(X(Q.benchUp[0]) + 0.03, Y(Q.benchUp[2]) - 0.1, 0), false);
    // kamna: korpus, prosklená dvířka s ohněm, koš s kameny, nožičky; ohrádka; komín s izolovaným prostupem
    const st = Q.stove, [fxm, fym, fd, above] = Q.flue, sx0 = X(st.x[0]), sx1 = X(st.x[1]), sz0 = Z(st.y[0]), sz1 = Z(st.y[1]);
    for (const [x, z] of [[sx0 + 0.04, sz0 + 0.04], [sx1 - 0.04, sz0 + 0.04], [sx0 + 0.04, sz1 - 0.04], [sx1 - 0.04, sz1 - 0.04]]) bm('g', sm.stove, x - 0.015, x + 0.015, F, Y(90), z - 0.015, z + 0.015);
    bm('g', sm.stove, sx0, sx1, Y(90), Y(560), sz0, sz1);
    // dvířka do místnosti (strana ke dveřím sauny), za sklem oheň
    const sxm = (sx0 + sx1) / 2;
    bm('g', sm.frame, sx0 + 0.06, sx1 - 0.06, Y(170), Y(470), sz1, sz1 + 0.012);
    put('g', sm.fire, boxUV(THREE, 0.22, 0.22, 0.004).translate(sxm, Y(310), sz1 + 0.013), false);
    put('g', sm.ember, boxUV(THREE, 0.2, 0.05, 0.005).translate(sxm, Y(210), sz1 + 0.014), false);
    bm('g', sm.inox, sx1 - 0.1, sx1 - 0.08, Y(300), Y(340), sz1 + 0.012, sz1 + 0.04);
    for (const [a0, a1, b0, b1] of [[sx0, sx1, sz0, sz0 + 0.012], [sx0, sx1, sz1 - 0.012, sz1], [sx0, sx0 + 0.012, sz0, sz1], [sx1 - 0.012, sx1, sz0, sz1]]) bm('g', sm.stove, a0, a1, Y(560), Y(st.h - 20), b0, b1);
    const srnd = rng(41);
    for (let i = 0; i < 26; i++) {
      const x = sx0 + 0.06 + srnd() * (sx1 - sx0 - 0.12), z = sz0 + 0.06 + srnd() * (sz1 - sz0 - 0.12);
      if (Math.hypot(x - X(fxm), z - Z(fym)) < 0.1) continue;
      put('g', i % 3 ? sm.stone : sm.stone2, new THREE.IcosahedronGeometry(0.045 + srnd() * 0.02, 0).scale(1, 0.7, 1).rotateY(srnd() * 3).translate(x, Y(st.h - 70) + srnd() * 0.06, z));
    }
    // ohrádka (dřevěné laťky) na volných stranách kamen
    const g = Q.guard / 1000, gx = sx1 + g, gz = sz1 + g;
    const gH = 700;   // ohrádka pod úrovní kamenů, ať jsou kamna a dvířka vidět
    for (let z = sz0 - 0.02; z < gz; z += 0.15) bm('g', sm.aspen, gx, gx + 0.022, F + 0.08, Y(gH), z, z + 0.055);
    for (let x = sx0; x < gx; x += 0.15) bm('g', sm.aspen, x, x + 0.055, F + 0.08, Y(gH), gz, gz + 0.022);
    for (const yy of [Y(gH - 25), F + 0.12]) { bm('g', sm.aspen, gx - 0.005, gx + 0.03, yy, yy + 0.025, sz0 - 0.02, gz + 0.03); bm('g', sm.aspen, sx0, gx + 0.03, yy, yy + 0.025, gz - 0.005, gz + 0.03); }
    // komín: z kamen stropem a střechou, 60 cm nad krytinu, s izolovaným prostupem a stříškou
    const cx = X(fxm), cz = Z(fym), r0 = fd / 2000, cTop = D.roofTop(cx) + above / 1000;
    put('g', sm.stove, new THREE.CylinderGeometry(r0, r0, ceil - Y(st.h), 20).translate(cx, (ceil + Y(st.h)) / 2, cz));
    put('g', sm.inox, new THREE.CylinderGeometry(r0 + 0.05, r0 + 0.05, cTop - ceil, 20).translate(cx, (cTop + ceil) / 2, cz));
    put('g', sm.inox, new THREE.ConeGeometry(r0 * 2.3, 0.12, 20).translate(cx, cTop + 0.12, cz));
    put('g', sm.inox, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6).translate(cx, cTop + 0.04, cz));
    // kbelík s naběračkou na spodní lavici, teploměr na stěně (v ceně každé sauny)
    { const bx = X(Q.benchLow[0] + 120), bz = zi - 0.25, by = Y(Q.benchLow[2]);
      put('g', sm.aspen, new THREE.CylinderGeometry(0.12, 0.1, 0.2, 16).translate(bx, by + 0.1, bz));
      put('g', sm.frame, new THREE.TorusGeometry(0.113, 0.006, 4, 20).rotateX(Math.PI / 2).translate(bx, by + 0.16, bz));
      put('g', sm.aspen, new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6).rotateZ(0.9).translate(bx + 0.12, by + 0.24, bz));
      bm('zp', sm.aspen, X(Q.benchUp[0] + 200), X(Q.benchUp[0] + 300), Y(1550), Y(1800), zi - 0.02, zi); }
    // předsíň: lavice z osiky, věšáky s policí, ručníky (Sauna na podvozku)
    if (Q.benchA) {
      const { x: [a0, a1], y: [b0, b1], z: hz } = Q.benchA;
      for (let y = b0 + 5; y < b1 - 30; y += 100) blk('g', sm.aspen, [a0, a1], [y, Math.min(y + 88, b1)], [hz - 28, hz]);
      for (const x of [a0 + 40, a1 - 80]) blk('g', sm.aspen, [x, x + 40], [b0 + 30, b1 - 30], [0, hz - 28]);
      const [h0, h1, hy] = Q.hooks;
      blk('zp', mat.oak, [h0, h1], [hy - 220, hy], [1840, 1865]);
      for (let x = h0 + 80; x < h1; x += 200) blk('zp', mat.black, [x, x + 16], [hy - 70, hy], [1690, 1706]);
      soft('zp', mat.linen, [h0 + 60, h0 + 340], [hy - 60, hy - 20], [1180, 1700], 0.01); soft('zp', mat.throw, [h0 + 470, h0 + 720], [hy - 60, hy - 20], [1250, 1700], 0.01);
    }
    // teplé světlo z kamen a LED
    const glow = new THREE.PointLight(0xff9a50, 1.6, 3, 1.8); glow.position.set((sx0 + sx1) / 2, Y(350), sz1 + 0.3); scene.add(glow);
    // řezové plochy pro čtyři stěny: dolní (s mezerami ve dveřích) a horní pod stropem
    const capM = dimify(mat.poche.clone());
    const capWall = (gk, hh, gaps) => {
      let geo;
      if (gk === 'zp' || gk === 'zn') { const s2 = gk === 'zp' ? 1 : -1; geo = new THREE.BoxGeometry(D.L, 0.012, TW).translate(0, 0, s2 * (zi + TW / 2)); }
      else {
        const xg = gk === 'a' ? -H + TW / 2 : H - TW / 2, gs = []; let at = -zi;
        for (const [a, b] of gaps.filter(([, , lo, hi]) => lo < F + hh && hi > F + hh)) { if (a > at) gs.push([at, a]); at = b; }
        if (zi > at) gs.push([at, zi]);
        geo = mergeGeos(THREE, gs.map(([a, b]) => new THREE.BoxGeometry(TW, 0.012, b - a).translate(xg, 0, (a + b) / 2)));
      }
      const m = new THREE.Mesh(geo, capM); model.add(m); return m;
    };
    for (const gk of ['zp', 'zn', 'a', 'b']) sCaps.push({ gk, low: capWall(gk, LOW, gk === 'a' ? [door] : []), top: capWall(gk, 9, []) });
  }
  const furnCaps = [], sCaps = [];
  const wallH = D.wallH;
  let caps = {}, capB = null, lampLight = null;
  if (D.sauna) buildSauna();
  else {

  // podlaha
  put('g', mat.floor, boxUV(THREE, xB - xA + 0.12, 0.02, 2 * zin + 0.02).translate((xA + xB) / 2 - 0.06, F - 0.01, 0));
  // podélné stěny: obklad s otvory, ostění, horní hrana (zakryje dutinu stěny)
  for (const [side, gk, s] of [['L', 'zn', -1], ['R', 'zp', 1]]) {
    const holes = D.open[side].map(([a, b, lo, hi]) => [X(a), X(b), Y(lo), Y(hi)]);
    put(gk, mat.spruce, ext(shape([[xA, F], [xB, F], [xB, F + wallH], [xA, F + wallH]], holes), 0.012).translate(0, 0, s > 0 ? zin : -zin - 0.012));
    for (const [a, b, lo, hi] of holes) {
      const z0 = s * zin, z1 = s * 1.232;
      bm(gk, mat.spruce, a, b, hi, hi + 0.012, z0, z1); bm(gk, mat.spruce, a - 0.012, a, lo, hi, z0, z1); bm(gk, mat.spruce, b, b + 0.012, lo, hi, z0, z1);
      if (lo > F + 0.05) bm(gk, mat.white, a - 0.02, b + 0.02, lo - 0.02, lo, z0 + s * 0.03, z1);
    }
  }
  // štít B: obklad do sklonu střechy s okny
  {
    const holes = D.open.B.map(([a, b, lo, hi]) => [Z(a), Z(b), Y(lo), Y(hi)]);
    const s = shape([[-zin, F], [zin, F], [zin, roofU(zin)], [0, roofU(0)], [-zin, roofU(zin)]], holes);
    put('b', mat.spruce, ext(s, 0.012).rotateY(-Math.PI / 2).translate(xB + 0.012, 0, 0));
    for (const [a, b, lo, hi] of holes) {
      bm('b', mat.spruce, xB, H - 0.018, hi, hi + 0.012, a, b); bm('b', mat.spruce, xB, H - 0.018, lo, hi, a - 0.012, a); bm('b', mat.spruce, xB, H - 0.018, lo, hi, b, b + 0.012);
      bm('b', mat.white, xB - 0.03, H - 0.018, lo - 0.02, lo, a - 0.02, b + 0.02);
    }
  }
  // příčky
  const crossWall = (x0, x1, y0, y1, top, doors) => {
    const u0 = Z(y0), u1 = Z(y1), pts = [[u0, F], [u1, F]];
    for (let i = 16; i >= 0; i--) { const u = u0 + (u1 - u0) * i / 16; pts.push([u, top(u)]); }
    put('g', mat.spruce, ext(shape(pts, doors.map(([a, b, h]) => [Z(a), Z(b), F, Y(h)])), (x1 - x0) / 1000).rotateY(-Math.PI / 2).translate(X(x1), 0, 0));
  };
  const longWall = (x0, x1, y0, y1, top, doors) => {
    const yT = top(Z((y0 + y1) / 2));
    put('g', mat.spruce, ext(shape([[X(x0), F], [X(x1), F], [X(x1), yT], [X(x0), yT]], doors.map(([a, b]) => [X(a), X(b), F, Y(2050)])), (y1 - y0) / 1000).translate(0, 0, Z(y0)));
  };
  if (P.partitions) for (const [x0, x1, y0, y1, doors] of P.partitions) {
    if (x1 - x0 < y1 - y0) crossWall(x0, x1, y0, y1, roofU, doors.map(([a, b]) => [a, b, 2050]));
    else longWall(x0, x1, y0, y1, roofU, doors);
  } else {
    const top = P.loft ? () => Y(P.loft.top - P.loft.t) : roofU;
    crossWall(P.xPart, P.xPart + 80, 175, 2325, top, [P.bathDoor]);
  }
  // podhledy pod střechou (jdou se střechou), střešní okno zevnitř
  for (const [gk, s] of [['rp', 1], ['rn', -1]]) {
    const sl = zin / D.c + 0.02, geo = boxUV(THREE, xB - xA, 0.012, sl).rotateX(s * D.p).translate((xA + xB) / 2, (roofU(0) + roofU(zin)) / 2 - 0.006, s * zin / 2);
    put(gk, mat.spruce, geo);
  }
  if (P.skylight) {
    const [x0, x1, y0, y1] = P.skylight, zc = Z((y0 + y1) / 2), s = Math.sign(zc), gk = s > 0 ? 'rp' : 'rn', w = (y1 - y0) / 1000 / D.c;
    put(gk, mat.black, new THREE.BoxGeometry((x1 - x0) / 1000 + 0.08, 0.01, w + 0.08).rotateX(s * D.p).translate(X((x0 + x1) / 2), roofU(zc) - 0.016, zc));
    put(gk, mat.sky, new THREE.BoxGeometry((x1 - x0) / 1000, 0.01, w).rotateX(s * D.p).translate(X((x0 + x1) / 2), roofU(zc) - 0.021, zc), false);
  }

  /* --- vybavení --- */
  // kuchyň: korpus bez úchytek, zapuštěný sokl, tmavá deska, dřez s baterií, varná deska, spáry dvířek
  {
    const k = P.kitchen.run, [y0, y1] = k.y, atL = y0 < 1250, front = atL ? y1 : y0, dir = atL ? 1 : -1, gk = 'g';
    blk(gk, mat.white, k.x, [y0, y1], [100, 870]);
    blk(gk, mat.black, k.x, atL ? [y0, y1 - 60] : [y0 + 60, y1], [0, 100]);
    blk(gk, mat.top, [k.x[0] - 5, k.x[1] + 5], atL ? [y0, y1 + 20] : [y0 - 20, y1], [870, 900]);
    const seam = x => blk(gk, mat.black, [x - 2, x + 2], [front, front + dir * 3], [110, 860]);
    for (const [name, a, b, zones, oven] of P.kitchen.parts) {
      if (a > k.x[0]) seam(a);
      if (b - a > 560) seam((a + b) / 2);
      blk(gk, mat.black, [a + 10, b - 10], [front, front + dir * 3], [800, 803]);           // stínová spára pod deskou
      const cx = (a + b) / 2, cy = (y0 + y1) / 2;
      if (name === 'dřez') {
        blk(gk, mat.steel, [cx - 210, cx + 210], [cy - 170, cy + 170], [880, 902]);
        blk(gk, mat.black, [cx - 15, cx + 15], atL ? [y0 + 45, y0 + 75] : [y1 - 75, y1 - 45], [900, 1150]);
        blk(gk, mat.black, [cx - 12, cx + 12], atL ? [y0 + 60, y0 + 230] : [y1 - 230, y1 - 60], [1125, 1150]);
      }
      if (zones) {
        blk(gk, mat.glassHob, [cx - (zones > 2 ? 290 : 190), cx + (zones > 2 ? 290 : 190)], [cy - 250, cy + 250], [900, 906]);
        for (let i = 0; i < zones; i++) put(gk, mat.zone, new THREE.CylinderGeometry(0.085, 0.085, 0.003, 24).translate(X(cx + (zones > 2 ? (i % 2 ? 140 : -140) : (i ? 95 : -95))), Y(907), Z(cy + (zones > 2 ? (i < 2 ? -110 : 110) : 0))));
        if (oven) blk(gk, mat.glassHob, [a + 25, b - 25], [front, front + dir * 4], [200, 760]);
      }
    }
    if (P.shelf) { const [a, b, z] = P.shelf; blk('zp', mat.oak, [a, b], [2085, 2315], [z, z + 25]); for (const [x, h] of [[a + 140, 120], [a + 260, 160], [b - 220, 90]]) put('zp', mat.white, new THREE.CylinderGeometry(0.045, 0.045, h / 1000, 14).translate(X(x), Y(z + 25 + h / 2), Z(2220))); }
  }
  for (const it of P.furn) {
    const { id } = it, [x0, x1] = it.x, [y0, y1] = it.y, [z0, z1] = it.z, xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
    if (id === 'sofa') {
      blk('g', mat.sofa, [x0, x1], [y0, y1], [0, 330]);
      soft('g', mat.sofa2, [x0 + 15, xc - 5], [y0 + 170, y1 - 10], [320, 455], 0.05); soft('g', mat.sofa2, [xc + 5, x1 - 15], [y0 + 170, y1 - 10], [320, 455], 0.05);
      soft('g', mat.sofa2, [x0 + 15, xc - 5], [y0 + 5, y0 + 175], [440, 850], 0.06); soft('g', mat.sofa2, [xc + 5, x1 - 15], [y0 + 5, y0 + 175], [440, 850], 0.06);
      soft('g', mat.terra, [x0 + 120, x0 + 520], [y0 + 170, y0 + 300], [450, 820], 0.06); soft('g', mat.mustard, [x1 - 540, x1 - 160], [y0 + 170, y0 + 300], [450, 800], 0.06);
      soft('g', mat.throw, [x1 - 700, x1 - 20], [y0 + 300, y1 + 15], [440, 470], 0.012);
      if (P.rug) { const [a, b, c, d] = P.rug; blk('g', mat.rug, [a, b], [c, d], [0, 8]); }
      continue;
    }
    if (id === 'bench') { blk('g', mat.white, [x0, x1], [y0, y1], [0, 420]); blk('g', mat.oak, [x0, x1], [y0, y1], [420, 450]); soft('g', mat.sofa2, [x0 + 20, x1 - 20], [y0 + 10, y0 + 160], [450, 820], 0.06); continue; }
    if (id === 'table' || id === 'desk' || id === 'table4') {
      blk('g', mat.oak, [x0, x1], [y0, y1], [z0, z1]);
      const legs = id === 'table' ? [[x0 + 40, y1 - 60], [x1 - 60, y1 - 60]] : [[x0 + 40, y0 + 40], [x1 - 60, y0 + 40], [x0 + 40, y1 - 60], [x1 - 60, y1 - 60]];
      for (const [x, y] of legs) blk('g', mat.black, [x, x + 22], [y, y + 22], [0, z0]);
      if (id === 'table') blk('g', mat.black, [x0 + 60, x1 - 60], [y0, y0 + 20], [z0 - 40, z0]);
      if (id !== 'desk') { put('g', mat.white, new THREE.CylinderGeometry(0.11, 0.07, 0.07, 20).translate(X(xc + 180), Y(z1 + 35), Z(yc))); for (const [dx, dz, m2] of [[150, -20, mat.mustard], [205, 25, mat.terra], [195, -40, mat.leaf2]]) put('g', m2, new THREE.SphereGeometry(0.035, 10, 8).translate(X(xc + dx), Y(z1 + 75), Z(yc + dz))); }
      else { blk('g', mat.black, [xc - 160, xc + 160], [y0 + 60, y0 + 280], [z1, z1 + 12]); blk('g', mat.black, [xc - 160, xc + 160], [y0 + 40, y0 + 52], [z1, z1 + 220]); }
      continue;
    }
    if (id === 'chair') {
      blk('g', mat.oak, [x0 + 30, x1 - 30], [y0 + 30, y1 - 30], [430, 455]);
      for (const [x, y] of [[x0 + 40, y0 + 40], [x1 - 60, y0 + 40], [x0 + 40, y1 - 60], [x1 - 60, y1 - 60]]) blk('g', mat.black, [x, x + 20], [y, y + 20], [0, 430]);
      const away = yc < 1250 ? [y0 + 30, y0 + 50] : [y1 - 50, y1 - 30];
      blk('g', mat.black, [x0 + 40, x0 + 60], away, [455, 800]); blk('g', mat.black, [x1 - 60, x1 - 40], away, [455, 800]);
      blk('g', mat.oak, [x0 + 30, x1 - 30], away, [640, 800]);
      continue;
    }
    if (id === 'tech' || id === 'wardrobe') {
      // vysoké skříně u stěny patří ke stěně: když se stěna sníží, řez projde i skříní (tmavé víko jako na výkresu)
      const atL = yc < 1250, fr = atL ? y1 : y0, d = atL ? 1 : -1, gk = wallOf(it);
      blk(gk, mat.white, [x0 + 5, x1 - 5], [y0, y1], [0, z1]);
      blk(gk, mat.black, [xc - 2, xc + 2], [fr, fr + d * 3], [40, z1 - 40]);
      blk(gk, mat.black, [x0 + 10, x1 - 10], [fr, fr + d * 3], [z1 - 45, z1 - 42]);
      if (gk !== 'g') furnCaps.push({ gk, top: z1 / 1000, geo: new THREE.BoxGeometry((x1 - x0 - 10) / 1000, 0.012, (y1 - y0) / 1000).translate(X(xc), 0, Z(yc)) });
      continue;
    }
    if (id === 'ac') { soft(wallOf(it), mat.white, [x0, x1], [y0, y1], [z0, z1], 0.03); blk(wallOf(it), mat.black, [x0 + 40, x1 - 40], yc < 1250 ? [y1, y1 + 2] : [y0 - 2, y0], [z0 + 30, z0 + 45]); continue; }
    if (id === 'radiator') { blk('zp', mat.white, [x0, x1], [y0, y1], [z0, z1]); continue; }
    if (id === 'shower') {
      const nearL = y0 < 400;
      blk('g', mat.ceramic, [x0, x1], [y0, y1], [0, 50]);
      blk('g', mat.black, [xc - 40, xc + 40], [yc - 40, yc + 40], [50, 52]);
      blk(nearL ? 'zn' : 'zp', mat.tile, [x0, x1 + 3], nearL ? [y0, y0 + 6] : [y1 - 6, y1], [0, 2000]);
      blk(x1 > L - 300 ? 'b' : 'g', mat.tile, [x1 - 6, x1], [y0, y1], [0, 2000]);
      const gy = nearL ? y1 : y0;
      put('g', mat.showerGlass, boxUV(THREE, (x1 - x0) / 1000, 1.95, 0.008).translate(X(xc), Y(1025), Z(gy)), false);
      put('g', mat.showerGlass, boxUV(THREE, 0.008, 1.95, (y1 - y0) / 1000).translate(X(x0), Y(1025), Z(yc)), false);
      blk('g', mat.black, [x0 - 8, x0 + 12], [gy - 10, gy + 10], [50, 2000]);
      blk('g', mat.black, [x0, x1], [gy - 8, gy + 8], [1990, 2010]); blk('g', mat.black, [x0 - 6, x0 + 10], [y0, y1], [1990, 2010]);
      const hy = nearL ? y0 + 45 : y1 - 45;
      blk('g', mat.black, [x1 - 160, x1 - 140], [hy - 10, hy + 10], [900, 2060]);
      put('g', mat.steel, new THREE.CylinderGeometry(0.075, 0.075, 0.01, 20).translate(X(x1 - 260), Y(2060), Z(nearL ? y0 + 260 : y1 - 260)));
      blk('g', mat.black, [x1 - 260, x1 - 150], [hy - 8, hy + 8], [2052, 2066]);
      continue;
    }
    if (id === 'wc') {
      const againstB = x1 > L - 200;
      soft('g', mat.ceramic, [x0 + 20, x1 - 10], [y0 + 20, y1 - 20], [z0 + 50, z1 - 230], 0.06);
      soft('g', mat.ceramic, [x0 + 15, x1 - 5], [y0 + 15, y1 - 15], [z1 - 240, z1 - 215], 0.01);
      if (againstB) blk('b', mat.white, [x1 - 4, x1], [yc - 110, yc + 110], [1000, 1150]);
      else blk(wallOf(it) === 'g' ? 'zn' : wallOf(it), mat.white, [x0 + 80, x1 - 80], [y0, y0 + 4], [1000, 1150]);
      continue;
    }
    if (id === 'basin') {
      const atR = y1 >= 2300, onPart = !atR && y1 >= 1400, wall = atR ? 'zp' : 'g', back = atR ? y1 : y1, d = -1;
      blk('g', mat.oak, [x0, x1], [y0 + 10, y1], [z0 - 300, z0 - 10]);
      soft('g', mat.ceramic, [x0 + 30, x1 - 30], [y0, y1 - 30], [z0 - 10, z1], 0.03);
      blk('g', mat.steel, [xc - 120, xc + 120], [y0 + 70, y1 - 110], [z1 - 2, z1 + 1]);
      blk('g', mat.black, [xc - 12, xc + 12], [back - 70, back - 40], [z1, z1 + 170]); blk('g', mat.black, [xc - 10, xc + 10], [back - 160, back - 50], [z1 + 150, z1 + 170]);
      blk(onPart ? 'g' : wall, mat.mirror, [x0 + 30, x1 - 30], [back + d * 8, back], [z1 + 260, z1 + 900]);
      continue;
    }
    if (id === 'ladder') {
      for (const x of [x0 + 20, x1 - 40]) blk('g', mat.black, [x, x + 20], [y0, y1 - 10], [z0, z1]);
      for (let zz = z0 + 80; zz < z1; zz += 180) blk('g', mat.black, [x0 + 20, x1 - 20], [y0 + 5, y1 - 15], [zz, zz + 14]);
      soft('g', mat.linen, [x0 + 60, x1 - 60], [y0 - 30, y1 - 5], [z1 - 520, z1 - 60], 0.01);
      continue;
    }
    if (id === 'bed') {
      blk('g', mat.oak, [x0, x1], [y0 + 40, y1], [0, 280]);
      blk('g', mat.oak, [x0, x1], [y0, y0 + 40], [0, 950]);
      soft('g', mat.linen, [x0 + 15, x1 - 15], [y0 + 45, y1 - 10], [280, 480], 0.05);
      soft('g', mat.duvet, [x0 + 5, x1 - 5], [y0 + 560, y1 + 15], [440, 530], 0.04);
      soft('g', mat.linen, [x0 + 70, xc - 25], [y0 + 70, y0 + 470], [480, 610], 0.07); soft('g', mat.linen, [xc + 25, x1 - 70], [y0 + 70, y0 + 470], [480, 610], 0.07);
      soft('g', mat.throw, [x0 + 5, x1 - 5], [y1 - 520, y1 + 20], [525, 545], 0.01);
      continue;
    }
  }
  // závěsné svítidlo, rostliny
  if (P.lamp) {
    const [lx, ly, lz] = P.lamp, top = MID * 1000 + 40;
    put('g', mat.black, new THREE.CylinderGeometry(0.004, 0.004, (top - lz) / 1000, 6).translate(X(lx), Y((top + lz) / 2), Z(ly)), false);
    put('g', mat.black, new THREE.CylinderGeometry(0.06, 0.19, 0.17, 28, 1, true).translate(X(lx), Y(lz - 80), Z(ly)));
    put('g', mat.lampIn, new THREE.CircleGeometry(0.16, 24).rotateX(Math.PI / 2).translate(X(lx), Y(lz - 150), Z(ly)), false);
  }
  lampLight = new THREE.PointLight(0xffd9a8, 0, 5, 1.6);
  if (P.lamp) { lampLight.position.set(X(P.lamp[0]), Y(P.lamp[2] - 220), Z(P.lamp[1])); scene.add(lampLight); }
  const leafRnd = rng(31);
  for (const [x, y, s] of P.plants || []) {
    put('g', mat.pot, new THREE.CylinderGeometry(0.12 * s, 0.095 * s, 0.26 * s, 18).translate(X(x), Y(130 * s), Z(y)));
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39, rr = 0.09 * s * (0.5 + leafRnd() * 0.6), h = 0.36 + leafRnd() * 0.5;
      put('g', i % 2 ? mat.leaf : mat.leaf2, new THREE.IcosahedronGeometry(0.1 * s, 1).scale(1, 1.5, 0.6).rotateY(a).translate(X(x) + Math.cos(a) * rr, F + h * s, Z(y) + Math.sin(a) * rr));
    }
  }

  /* --- loft a schody (Dům M) --- */
  if (P.loft) {
    const Lf = P.loft, yTop = Y(Lf.top), x0 = X(Lf.x[0]), x1 = X(Lf.x[1]);
    bm('loft', mat.oak, x0, x1, yTop - 0.03, yTop, -zin, zin);
    bm('loft', mat.white, x0, x1, yTop - Lf.t / 1000, yTop - 0.03, -zin, zin);
    const mx1 = x1 - 0.05, mx0 = mx1 - 2.0, mm = (a, b, c, d, e, g2, m, r2 = 0.05) => put('loft', m, new RoundedBoxGeometry(b - a, d - c, g2 - e, 2, r2).translate((a + b) / 2, (c + d) / 2, (e + g2) / 2));
    mm(mx0, mx1, yTop, yTop + 0.18, -0.7, 0.7, mat.linen);
    mm(mx0 + 0.02, mx1 - 0.5, yTop + 0.15, yTop + 0.24, -0.71, 0.71, mat.duvet, 0.04);
    mm(mx1 - 0.45, mx1 - 0.08, yTop + 0.18, yTop + 0.3, -0.62, -0.06, mat.linen, 0.06); mm(mx1 - 0.45, mx1 - 0.08, yTop + 0.18, yTop + 0.3, 0.06, 0.62, mat.linen, 0.06);
    mm(mx0 + 0.25, mx0 + 0.75, yTop + 0.235, yTop + 0.255, -0.72, 0.72, mat.throw, 0.008);
    const zs = P.stairs ? Z(P.stairs.y[0]) : zin, railTop = yTop + 0.42;
    bm('loft', mat.black, x0 - 0.02, x0 + 0.02, railTop - 0.03, railTop, -zin, zs);
    for (let z = -zin + 0.06; z <= zs + 1e-6; z += 0.11) bm('loft', mat.black, x0 - 0.008, x0 + 0.008, yTop, railTop - 0.03, z - 0.008, z + 0.008);
  }
  if (P.stairs) {
    const S = P.stairs, n = S.n, run = (S.x[1] - S.x[0]) / n, rise = P.loft.top / (n + 1);
    for (let i = 0; i < n; i++) {
      const xa = S.x[0] + i * run, xb = xa + run, h = (i + 1) * rise;
      blk('g', mat.white, [xa, xb], S.y, [0, h - 25]);
      blk('g', mat.ply, [xa + 12, xb - 12], [S.y[0] - 8, S.y[0]], [h - 25 - Math.min(rise, h - 25) + 12, h - 37]);   // čelo úložného boxu
      blk('g', mat.black, [xa + run / 2 - 50, xa + run / 2 + 50], [S.y[0] - 9, S.y[0] - 7], [h - 80, h - 60]);
      blk('g', mat.oak, [xa - 15, xb], S.y, [h - 25, h]);
    }
    const zr = Z(S.y[0]) - 0.03, pA = new THREE.Vector3(X(S.x[0]), Y(rise + 900), zr), pB = new THREE.Vector3(X(S.x[1]), Y(n * rise + 900), zr);
    const len = pA.distanceTo(pB), ang = Math.atan2(pB.y - pA.y, pB.x - pA.x);
    put('g', mat.black, new THREE.CylinderGeometry(0.017, 0.017, len, 10).rotateZ(ang - Math.PI / 2).translate((pA.x + pB.x) / 2, (pA.y + pB.y) / 2, zr));
    for (let i = 0; i < n; i += 2) { const xa = S.x[0] + (i + 0.5) * run, h = (i + 1) * rise; blk('g', mat.black, [xa - 10, xa + 10], [S.y[0] - 40, S.y[0] - 20], [h, h + 900]); }
  }

  // Řezové plochy (poché): tmavý pás v tloušťce stěny tam, kde řez prochází stěnou. Dolní řez podélné stěny jede
  // s výškou řezu, horní hrana je pevná.
  const capMat = mat.poche;
  const capGeo = (side, hh) => {
    const s = side === 'R' ? 1 : -1, holes = D.open[side].filter(([, , lo, hi]) => lo / 1000 < hh && hi / 1000 > hh).map(([a, b]) => [X(a), X(b)]);
    const gs = []; let at = -H;
    for (const [a, b] of holes.sort((p2, q) => p2[0] - q[0])) { if (a > at) gs.push([at, a]); at = b; }
    if (H > at) gs.push([at, H]);
    return mergeGeos(THREE, gs.map(([a, b]) => new THREE.BoxGeometry(b - a, 0.012, 1.25 - zin).translate((a + b) / 2, 0, s * (zin + 1.25) / 2)));
  };
  for (const [side, gk] of [['L', 'zn'], ['R', 'zp']]) {
    const low = new THREE.Mesh(capGeo(side, LOW), dimify(capMat.clone())), top = new THREE.Mesh(capGeo(side, wallH + 0.001), low.material);
    low.position.y = F + LOW + 0.006; top.position.y = F + wallH + 0.006;
    model.add(low, top); caps[gk] = { low, top };
  }
  capB = new THREE.Mesh(new THREE.BoxGeometry(H - xB, 0.012, 1), caps.zp.low.material); capB.position.x = (xB + H) / 2; model.add(capB);
  for (const fc of furnCaps) { fc.mesh = new THREE.Mesh(fc.geo, caps.zp.low.material); model.add(fc.mesh); }
  }   // konec domu

  // sloučit kbelíky do sítí (málo draw callů)
  for (const b of buckets.values()) {
    const m = new THREE.Mesh(mergeGeos(THREE, b.geos), b.m);
    m.castShadow = b.shadow && !b.m.transparent; m.receiveShadow = true;
    G[b.gk].add(m);
  }
  buckets.clear();
  G.tr.traverse(m => { if (m.isMesh) m.castShadow = true; });

  // kóty (vnitřní délka a šířka) a popisky místností
  const dimMat = new THREE.LineBasicMaterial({ color: 0x1e211d, transparent: true, opacity: 0 });
  const seg = [], ln = (a, b) => seg.push(...a, ...b);
  const TWm = (D.tw ?? 0.175), zinD = W2 - TWm, g0 = 0.006, zD = W2 + 0.5, xW = -H - 0.62, xi0 = -H + TWm, xi1 = H - TWm;
  ln([xi0, g0, W2 + 0.1], [xi0, g0, zD + 0.12]); ln([xi1, g0, W2 + 0.1], [xi1, g0, zD + 0.12]); ln([xi0 - 0.08, g0, zD], [xi1 + 0.08, g0, zD]);
  for (const x of [xi0, xi1]) ln([x - 0.07, g0, zD + 0.07], [x + 0.07, g0, zD - 0.07]);
  ln([-H - 0.15, g0, -zinD], [xW - 0.12, g0, -zinD]); ln([-H - 0.15, g0, zinD], [xW - 0.12, g0, zinD]); ln([xW, g0, -zinD - 0.08], [xW, g0, zinD + 0.08]);
  for (const z of [-zinD, zinD]) ln([xW - 0.07, g0, z + 0.07], [xW + 0.07, g0, z - 0.07]);
  const dimGeo = new THREE.BufferGeometry(); dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  scene.add(new THREE.LineSegments(dimGeo, dimMat));
  const stageEl = box.closest('.pv-stage');
  const dimLabels = [{ t: `vnitřní délka ${fmt(P.inner[0] / 1000, 2)} m`, at: new THREE.Vector3(0, g0, zD) }, { t: `šířka ${fmt(P.inner[1] / 1000, 2)} m`, at: new THREE.Vector3(xW, g0, 0) }];
  const dlBox = stageEl.querySelector('.pv-dimlabels'); dlBox.innerHTML = dimLabels.map(d => `<span class="pv-dl">${d.t}</span>`).join('');
  const dlEls = [...dlBox.children];
  const plan = CH.find(c => Array.isArray(c.tags)), tagEls = [...stageEl.querySelectorAll('.dz-room')];
  const tagPos = (plan ? plan.tags : []).map(([, [x, y]]) => new THREE.Vector3(X(x), F + 0.95, Z(y)));

  // kotvy bodů
  const hsEls = [...stageEl.querySelectorAll('.pv-hs')];
  const anchors = PTS.map(pd => { const a = new THREE.Object3D(); a.position.set(X(pd.at[0]), Y(pd.at[2]), Z(pd.at[1])); (pd.grp === 'loft' ? G.loft : model).add(a); return a; });

  // motiv
  let dark = false, dirty = true;
  function readTheme() {
    const cs = getComputedStyle(stageEl);
    dimMat.color.set(cs.getPropertyValue('--ink').trim() || '#1E211D');
    const bg = cs.backgroundColor.match(/[\d.]+/g) || [239, 232, 220];
    DIM.uHaze.value.set(bg[0] / 255, bg[1] / 255, bg[2] / 255);
    dark = (+bg[0] + +bg[1] + +bg[2]) / 3 < 110;
    groundMat.opacity = dark ? 0.42 : 0.2; contactMat.opacity = dark ? 0.55 : 0.32;
    renderer.toneMappingExposure = dark ? 0.9 : 1.0;
    dirty = true;
  }
  const mqDark = matchMedia('(prefers-color-scheme: dark)'), mo = new MutationObserver(readTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  mqDark.addEventListener('change', readTheme);
  readTheme();

  const stAt = q => { const i = clamp(Math.floor(q), 0, N - 1), j = Math.min(N - 1, i + 1), t = ease(q - i); return KEYS[i].map((v0, k) => v0 + (KEYS[j][k] - v0) * t); };
  let tgt = stAt(0), cur = tgt.slice(), curP = 0, tgtP = 0, raf = 0, last = 0, running = false, held = false;
  const S = Object.fromEntries(SK.map((k, i) => [k, i]));
  const tmp = new THREE.Vector3();
  const setOp = (gk, op) => {
    const g = G[gk]; g.visible = op > 0.01;
    for (const m of groupMats[gk] || []) {
      const a = m.userData.op * op, tr = a < 0.999 || m.userData.tr;
      if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
      m.opacity = a; m.depthWrite = !tr || a > 0.6;
    }
    g.traverse(m => { if (m.isMesh && !m.material.transparent) m.castShadow = op > 0.5; });
  };
  function apply() {
    const c = cur, bw = box.clientWidth || 1, bh = box.clientHeight || 1, wm = clamp((1.05 - bw / bh) / 0.3, 0, 1);
    const az = c[S.az] + (c[S.azm] - c[S.az]) * wm, el = c[S.el] + (c[S.elm] - c[S.el]) * wm;
    // řezy (výška nad podlahou → rovina v souřadnicích scény)
    for (const k of ['zp', 'zn', 'a', 'b', 'g']) planes[k].constant = F + c[S[k]];
    if (!D.sauna) {
      for (const gk of ['zn', 'zp']) {
        const h = c[S[gk]], cp = caps[gk];
        cp.low.visible = h < wallH - 0.03; cp.low.position.y = F + h + 0.006;
        cp.top.visible = !cp.low.visible && c[S.roofP] > 0.5;
      }
      const hb = c[S.b], ridgeIn = D.yUnder(0) - F;
      capB.visible = hb < ridgeIn - 0.05 && c[S.roofP] > 0.5;
      if (capB.visible) { const half = hb <= wallH ? 1.25 : Math.min(1.25, (D.yUnder(0) - (F + hb)) / D.t); capB.scale.z = 2 * Math.max(0.01, half); capB.position.y = F + hb + 0.006; }
    } else for (const sc of sCaps) {   // sauna: řez stěnou jede s výškou řezu, nahoře (pod stropem) pevná hrana
      const h = c[S[sc.gk]], low = h < wallH - 0.02;
      sc.low.visible = low; sc.low.position.y = F + h + 0.006;
      sc.top.visible = !low && c[S.roofP] > 0.5; sc.top.position.y = F + wallH + 0.006;
    }
    for (const fc of furnCaps) { const h = c[S[fc.gk]]; fc.mesh.visible = h < fc.top - 0.01; fc.mesh.position.y = F + h + 0.006; }
    // střecha (zvedne se a zmizí), loft (zvedne se a zmizí)
    for (const [gk, si, s] of [['rp', S.roofP, 1], ['rn', S.roofN, -1]]) { const k = c[si]; G[gk].position.set(0, 1.5 * k, s * 0.35 * k); setOp(gk, 1 - clamp(k * 1.6, 0, 1)); }
    const lf = c[S.loft]; G.loft.position.y = 1.4 * lf; setOp('loft', 1 - clamp(lf * 1.5, 0, 1));
    // ztlumení
    DIM.uDim.value = c[S.dim]; DIM.uFocus.value.set(c[S.fx0], c[S.fx1], c[S.fz0], c[S.fz1]);
    if (lampLight) lampLight.intensity = c[S.g] < 3 ? 2.5 : 1;
    dimMat.opacity = c[S.dims] * 0.85 * (1 - clamp(wm * 4, 0, 1));   // na mobilu bez kót (popisky kót se tam neukazují, rozměry jsou v kartě)
    // kamera: celý záběr (koule o poloměru r) se vejde do užšího zorného úhlu
    const w = box.clientWidth || 1, h = box.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const vh = THREE.MathUtils.degToRad(camera.fov / 2), hh = Math.atan(Math.tan(vh) * aspect);
    let d = c[S.r] / Math.sin(Math.min(vh, hh)) * 0.92;
    const place = () => {
      camera.position.set(c[S.tx] + d * Math.cos(el) * Math.sin(az), c[S.ty] + d * Math.sin(el), c[S.tz] + d * Math.cos(el) * Math.cos(az));
      camera.lookAt(c[S.tx], c[S.ty], c[S.tz]); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    };
    place();
    if (aspect < 1.05) for (let it = 0; it < 5; it++) {   // úzký výřez (mobil): celá obálka záběru se musí vejít
      let m = 0;
      for (const bx of [c[S.bx0], c[S.bx1]]) for (const by of [c[S.by0], c[S.by1]]) for (const bz of [c[S.bz0], c[S.bz1]]) { tmp.set(bx, by, bz).project(camera); m = Math.max(m, Math.abs(tmp.x) / 0.9, Math.abs(tmp.y) / 0.9); }
      if (m <= 1.01) break;
      d *= 1 + (m - 1) * 0.85; place();
    }
    scene.updateMatrixWorld(true);
    const P2 = vv => { tmp.copy(vv).project(camera); return [(tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * h, tmp.z]; };
    const proj = [];
    hsEls.forEach((b, k) => {
      const vis = Math.max(0, 1 - Math.abs(curP - PTS[k].ch) * 2.6);
      anchors[k].getWorldPosition(tmp);
      const [x, y] = P2(tmp), inside = x > 6 && x < w - 6 && y > 6 && y < h - 6, vv = inside ? vis : 0;
      proj.push([x, y, vv]);
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      b.style.opacity = vv.toFixed(3); b.style.visibility = vv > 0.02 ? 'visible' : 'hidden';
    });
    dimLabels.forEach((dl, k) => { const [x, y] = P2(dl.at); const e = dlEls[k]; e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`; e.style.opacity = c[S.dims].toFixed(3); });
    // popisky místností: bez překryvu (posun dolů), jen v kapitole půdorysu
    const placed = [], tv = c[S.tags];
    tagPos.forEach((pp, k) => {
      const e = tagEls[k]; if (!e) return;
      let [x, y] = P2(pp); const tw = e.offsetWidth, th = e.offsetHeight;
      x = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
      for (let n = 0; n < 6; n++) { const hit = placed.find(q => Math.abs(q[0] - x) < (q[2] + tw) / 2 + 6 && Math.abs(q[1] - y) < (q[3] + th) / 2 + 4); if (!hit) break; y = hit[1] + (hit[3] + th) / 2 + 6; }
      placed.push([x, y, tw, th]);
      e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      e.style.opacity = tv.toFixed(3); e.style.visibility = tv > 0.02 ? 'visible' : 'hidden';
    });
    onProject(proj);
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (box.__pv && box.__pv.hold) return;
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016); last = t;
    const k = 1 - Math.exp(-dt * 5);
    let moving = false;
    for (let i = 0; i < cur.length; i++) { const dv = tgt[i] - cur[i]; if (Math.abs(dv) > 1e-4) { cur[i] += dv * k; moving = true; } else cur[i] = tgt[i]; }
    if (Math.abs(tgtP - curP) > 1e-4) { curP += (tgtP - curP) * k; moving = true; } else curP = tgtP;
    if (moving || dirty) { apply(); renderer.render(scene, camera); dirty = false; }
  }
  const draw = () => { apply(); renderer.render(scene, camera); };
  const ro = new ResizeObserver(() => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); dirty = true; if (!running && !held) draw(); });
  ro.observe(box);

  // Ladění: box.__pv.show(p) vykreslí stav p bez scrollu, info() vrátí počty z renderer.info (vč. stínového průchodu).
  box.__pv = {
    renderer, scene, camera, keys: KEYS,
    show(q) { tgt = stAt(q); cur = tgt.slice(); tgtP = curP = q; draw(); return this.info(); },
    info() { const r = renderer.info.render; return { calls: r.calls, triangles: r.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
  };

  return {
    target(q, instant) { tgt = stAt(q); tgtP = q; if (instant) { cur = tgt.slice(); curP = q; } dirty = true; if (!running && !held) draw(); },
    label(t) { canvas.setAttribute('aria-label', t); },
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    gate(on) { held = !on; on ? this.start() : this.stop(); },
    dispose() {
      this.stop(); ro.disconnect(); mo.disconnect(); mqDark.removeEventListener('change', readTheme); delete box.__pv;
      scene.traverse(m => { if (m.geometry) m.geometry.dispose(); [].concat(m.material || []).forEach(x => { for (const q in x) if (x[q] && x[q].isTexture) x[q].dispose(); x.dispose(); }); });
      Object.values(tx).forEach(t => t.dispose());
      pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}

// Kvádr s UV v metrech (textury dřeva a dlažby mají stejné měřítko na všech dílech).
function boxUV(THREE, w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let fi = 0; fi < 6; fi++) for (let i = 0; i < 4; i++) { const k = fi * 4 + i; uv.setXY(k, uv.getX(k) * sc[fi][0], uv.getY(k) * sc[fi][1]); }
  return g;
}
// Sloučí geometrie (pozice, normály, UV) do jedné neindexované.
function mergeGeos(THREE, geos) {
  const list = geos.map(g => { const n = g.index ? g.toNonIndexed() : g; if (n !== g) g.dispose(); return n; });
  let count = 0; for (const g of list) count += g.attributes.position.count;
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  let at = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, at * 3);
    if (!g.attributes.normal) g.computeVertexNormals();
    nor.set(g.attributes.normal.array, at * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2);
    at += g.attributes.position.count; g.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}
// Textury interiéru: smrkový obklad (svislá prkna 10 cm), dubová podlaha (prkna 18 cm, posunuté spáry), dlažba 10 cm.
function interiorTextures(THREE) {
  const rnd = rng(7);
  const boards = (g, S, n, hue, sat, light, vertical) => {
    const bw = S / n;
    for (let i = 0; i < n; i++) {
      const l = light + (rnd() - 0.5) * 5;
      g.fillStyle = `hsl(${hue} ${sat}% ${l}%)`; vertical ? g.fillRect(i * bw, 0, bw, S) : g.fillRect(0, i * bw, S, bw);
      for (let j = 0; j < 14; j++) {
        const off = rnd() * bw, amp = 1 + rnd() * 4, ph = rnd() * 6;
        g.strokeStyle = rnd() < 0.5 ? `rgba(120,80,40,${0.05 + rnd() * 0.07})` : `rgba(255,245,225,${0.06 + rnd() * 0.08})`;
        g.lineWidth = 0.6 + rnd() * 1.4; g.beginPath();
        for (let t = 0; t <= S; t += 16) { const a = i * bw + Math.min(bw - 2, Math.max(2, off + Math.sin(t / S * 6.28 + ph) * amp)); vertical ? (t ? g.lineTo(a, t) : g.moveTo(a, t)) : (t ? g.lineTo(t, a) : g.moveTo(t, a)); }
        g.stroke();
      }
      g.fillStyle = 'rgba(90,60,30,.22)'; vertical ? g.fillRect(i * bw, 0, 1.5, S) : g.fillRect(0, i * bw, S, 1.5);
    }
  };
  const spruce = canvasTex(THREE, 256, (g, S) => boards(g, S, 4, 38, 48, 80, true), 1 / 0.4, 1 / 0.4);
  const oak = canvasTex(THREE, 512, (g, S) => {
    boards(g, S, 4, 30, 34, 60, false);
    g.fillStyle = 'rgba(70,45,20,.35)'; for (let i = 0; i < 4; i++) { const x = (i % 2 ? 0.3 : 0.75) * S; g.fillRect(x, i * S / 4, 1.5, S / 4); }
  }, 1 / 0.72, 1 / 0.72);
  const oakFine = canvasTex(THREE, 256, (g, S) => boards(g, S, 2, 32, 30, 74, false), 1 / 0.5, 1 / 0.5);
  const tile = canvasTex(THREE, 128, (g, S) => { g.fillStyle = '#e4e3de'; g.fillRect(0, 0, S, S); g.fillStyle = '#c9c7c0'; for (let i = 0; i < 4; i++) { g.fillRect(i * S / 4, 0, 2, S); g.fillRect(0, i * S / 4, S, 2); } }, 1 / 0.4, 1 / 0.4);
  return { spruce, oak, oakFine, tile };
}
