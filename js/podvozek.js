// Podvozek: scrollytelling sekce „Na čem dům stojí“. Tři vrstvy: přívěs (L_prives) → ocelová kostra (L_skelet) → dřevěný plášť (L_plast).
//
// Použití:
//   import { mountPodvozek } from './js/podvozek.js';
//   const pv = mountPodvozek(document.getElementById('pv-root'), { glb: null, variant: 'm' });
//   pv.destroy();   // při odchodu z route
//
// Volby (vše nepovinné):
//   variant      's' | 'm' | 'l' (výchozí 'm'): rozměry procedurálního modelu, kót a textů (Dům S 6,0 m, M 7,2 m, L 7,8 m).
//   glb          URL modelu .glb s uzly L_prives, L_skelet, L_plast (three.js souřadnice: Y nahoru, metry,
//                počátek na zemi uprostřed domu, +X směrem k oji). null = procedurální model níže.
//   frames       vzor URL předrenderovaných snímků pro statickou verzi, např. 'img/podvozek/pv-{n}.webp'.
//                S frameCount 5 = jeden snímek na kapitolu, víc = obrazová sekvence řízená scrollem.
//   frameCount   počet snímků (výchozí 5), {n} se doplní nulami na 3 místa (001, 002 …).
//   mode         'auto' | 'webgl' | 'static'. auto = static na slabých zařízeních a bez WebGL.
//   lazyMargin   jak daleko před sekcí se má začít načítat three.js (výchozí '120%').
//   farMargin    jak daleko od obrazovky se scéna uvolní (dispose, výchozí '250%'); při návratu se postaví znovu.
//                Na stránce kreslí vždy jen jedna 3D scéna (ta, která zabírá nejvíc obrazovky).
//   reducedMotion true/false přebije prefers-reduced-motion (pro testování), výchozí podle systému.
//   compact      true = vložení do jiné stránky (detail domu, úvod): kratší odsazení a kapitoly,
//                bez karet „Kdo ho utáhne“ a bez pruhu parametrů. Výchozí false (stránka #podvozek).
//   towing, specs  true/false přebije, zda zobrazit karty „Kdo ho utáhne“ / pruh parametrů (výchozí !compact).
//   head         { eyebrow, title, lead, cta: { label, href, className } } přepíše hlavičku sekce, false ji skryje.
//   facts        [[popisek, hodnota], …] nahradí výchozí rozměry v poslední kapitole (např. skutečná čísla domu),
//   factsNote    poznámka pod nimi (např. „* předběžný výpočet …“).
//
// Bez knihoven kromě three.js (načítá se dynamicky až u sekce, slabá zařízení ho nestahují vůbec).

const CH_HOUSE = [
  { short: 'Celek', title: 'Dům, který má kola', text: 'Každý Nordhouse stojí na silničním přívěsu s celkovou hmotností do 3 500 kg. Na pozemek přijede vcelku a kdykoli se může přestěhovat znovu.' },
  { short: 'Vrstvy', title: 'Tři vrstvy, každá s jedním úkolem', text: 'Přívěs nese, ocelový skelet drží tvar, dřevěný plášť chrání před počasím a izoluje. Každou vrstvu navrhujeme zvlášť, aby dělala jen to, co umí nejlépe.' },
  { short: 'Skelet', title: 'Lehká ocel místo těžkých trámů', text: 'Skelet je z tenkostěnných profilů z pozinkované oceli. Nekroutí se a nesesychá, takže dům drží tvar i po převozu a po letech venku.' },
  { short: 'Přívěs', title: 'Přívěs Vlemmix z Nizozemska', text: 'Podvozek dodává mooh.cz. Rám je žárově zinkovaný, nápravy jsou schované pod plošinou a oj má nájezdovou brzdu jako každý brzděný přívěs.' },
  { short: 'Na cestu', title: 'Složeno, zapřaženo, připraveno', text: 'Opěrné nohy nahoru a dům je přívěs jako každý jiný. Rozměry drží v mezích běžného silničního provozu.' },
];
// Sauna na podvozku (variant: 'sauna'): stejný příběh, fakta z projekt/sauna-podvozek-v2/params.py (BUILDUPS, TRAILER_INFO,
// CHASSIS_PARTS, ASSUMPTIONS).
const CH_SAUNA = [
  { short: 'Celek', title: 'Sauna, která má kola', text: 'Sauna stojí na silničním přívěsu Vlemmix TH360. Přijede hotová a kdykoli ji můžete převézt jinam.' },
  { short: 'Vrstvy', title: 'Tři vrstvy jako u domu', text: 'Přívěs nese, ocelový skelet drží tvar, dřevěný plášť chrání před počasím. Za palubkami je navíc hliníková parozábrana s přelepenými spoji.' },
  { short: 'Skelet', title: 'Ocelový skelet s pultovou střechou', text: 'Sloupky stěn jsou C profily 89 mm po 60 cm, krokve C profily 120 mm, podlahové trámky C profily 75 mm po 40 cm. Mezi nimi je minerální vata.' },
  { short: 'Přívěs', title: 'Přívěs Vlemmix TH360', text: 'Plošina 3,6 × 2,44 m, dvě brzděné nápravy Knott, oj s nájezdovou brzdou a opěrné kolečko.' },
  { short: 'Na cestu', title: 'Zapřaženo i s komínem', text: 'Komín se na převoz nezkracuje. Šířka i výška se vejdou do limitů silničního provozu.' },
];
const CH = CH_HOUSE;

// Schválené rozměry (projekt/dum-*-v2/params.py). Otvory v mm jako v params: stěna L/R [x0, x1, parapet, nadpraží] od štítu A,
// štít B [y0, y1, parapet, nadpraží] od levé stěny. Výšky otvorů nad čistou podlahou.
const VARIANTS = {
  s: { key: 'S', L: 6.0, wallH: 2.06, pitch: 35, axleFront: 2.95, loft: null, partition: null, skylight: null,
    open: { L: [[900, 1900, 950, 1750], [2470, 3370, 900, 1750]], R: [[1300, 1900, 1000, 1600], [3070, 3970, 1050, 1650]], B: [[1050, 1550, 1400, 1900]] },
    gableA: { cuts: [750], door: [1320, 2220, 2000], transom: 2000 } },
  m: { key: 'M', L: 7.2, wallH: 2.23, pitch: 30, axleFront: 3.58, loft: [4500, 7025, 2010, 110], partition: null, skylight: [5700, 6480, 300, 1050],
    open: { L: [[700, 1900, 950, 2000], [2450, 3350, 950, 2000], [3800, 4700, 1050, 1650]], R: [[1450, 2000, 1000, 1900]], B: [[1300, 1800, 1400, 1800], [950, 1550, 2160, 2600]] },
    gableA: { cuts: [750], door: [1320, 2220, 2100], transom: 2100 } },
  l: { key: 'L', L: 7.8, wallH: 2.23, pitch: 30, axleFront: 4.07, loft: null, partition: [5590, [1560, 2260, 2100]], skylight: null,
    open: { L: [[1800, 3200, 1050, 1750], [4200, 4600, 1450, 1850], [6400, 7400, 1000, 1900]], R: [[800, 2300, 0, 2050], [4350, 4950, 1000, 1800], [6500, 7400, 1000, 1900]], B: [[700, 1800, 1000, 1900]] },
    gableA: { cuts: [850, 1650], door: null, transom: 2100 } },
};
// Společné: šířka 2,5 m (2,55 m přes střechu), plošina 0,62 m, čistá podlaha 0,73 m, hřeben 3,99 m, rozvor 0,8 m, kola 195/50 R13, oj 1,5 m.
function dimsOf(v) {
  if (String(v).toLowerCase() === 'sauna') return saunaDimsPv();
  const V = VARIANTS[String(v || 'm').toLowerCase()] || VARIANTS.m;
  const p = V.pitch * Math.PI / 180, t = Math.tan(p), c = Math.cos(p);
  const D = { ...V, W: 2.5, RW: 2.55, deck: 0.62, ffl: 0.73, ridge: 3.99, p, t, c, roofT: 0.24 / c };
  D.H = V.L / 2;
  D.eave = D.ffl + V.wallH;
  D.yTop = z => D.ridge - 0.03 - Math.abs(z) * t;      // horní líc krytiny
  D.yUnder = z => D.yTop(z) - D.roofT;                // spodní líc střešní skladby
  D.axleX = D.H - V.axleFront;                        // střed tandemu (od přední hrany plošiny)
  D.hitch = D.H + 1.5;
  D.total = V.L + 1.5;
  return D;
}
// Sauna na podvozku v2 (params.py): 3 600 × 2 400, stěna 170, podlaha 120 na plošině 620, strop 2 100, střecha 200 se sklonem 2°
// (pultová, výš u čela A se vstupem), přesah 250 u čela A a 60 jinde, nápravy 1 300 / 2 100 od čela A, spojka 5 100, komín
// d 150 v [1 630, 425] 600 nad krytinou. Okna R [450–1050, 1000–1600], L [2000–3300, 1250–1850], dveře v čele A [850–1550, h 1950].
function saunaDimsPv() {
  const base = dimsOf('s');
  const L = 3.6, W = 2.4, H = L / 2, F = 0.74, tan = Math.tan(2 * Math.PI / 180);
  const roofTop = x => F + 2.1 + 0.2 + 0.165 - (x + H) * tan;      // horní líc krytiny (jako ref.js / pohled-levy)
  const D = { ...base, key: 'SAUNA', sauna: true, L, W, H, RW: W + 0.12, ffl: F, pitch: 2, tan, roofTop, under: x => roofTop(x) - 0.2,
    eaveA: 0.25, eaveB: 0.06, tw: 0.17, ceil: F + 2.1, flue: [1.63 - H, 0.425 - W / 2, 0.075, 0.6],
    open: { L: [[2000, 3300, 1250, 1850]], R: [[450, 1050, 1000, 1600]], B: [] }, gableA: { cuts: [], door: [850, 1550, 1950], transom: 2000 },
    loft: null, partition: null, skylight: null, axleX: -H + 1.7, hitch: H + 1.5, total: L + 1.5,
    tagName: 'Sauna na podvozku · ilustrační model', name3d: 'Sauny na podvozku' };
  D.ridge = roofTop(D.flue[0]) + D.flue[3];                          // nejvyšší bod: komín
  D.eave = roofTop(H);
  return D;
}
const fmt = (n, d = 1) => n.toFixed(d).replace('.', ',');
const dimText = D => D.sauna
  ? { length: `${fmt(D.L)} m`, total: `${fmt(D.total)} m`, width: `${fmt(D.RW, 2)} m`, height: '3,74 m', weight: 'cca 2 360 kg' }
  : { length: `${fmt(D.L)} m`, total: `${fmt(D.total)} m`, width: '2,55 m', height: '3,99 m', weight: 'do 3 500 kg' };

// Díly s čísly jako na výkresu. ch = index kapitoly, at(D) = kotva v souřadnicích vrstvy (m).
function partsFor(D) {
  const H = D.H;
  if (D.sauna) {
    const [fx, fz] = D.flue, zi = D.W / 2 - D.tw;
    return [
      { id: 'v-prives', ch: 1, n: 1, layer: 'L_prives', at: [-H + 0.5, 0.5, 1.22], name: 'Přívěs', text: 'Vlemmix TH360, nese celou saunu.' },
      { id: 'v-skelet', ch: 1, n: 2, layer: 'L_skelet', at: [H - 0.35, 1.45, 1.11], name: 'Ocelový skelet', text: 'Drží tvar. Nekroutí se ani nesesychá.' },
      { id: 'v-plast', ch: 1, n: 3, layer: 'L_plast', at: [-H + 0.35, D.roofTop(-H) - 0.45, 1.22], name: 'Dřevěný plášť', text: 'Modřínový obklad zvenku, palubky uvnitř.' },
      { id: 'v-folie', ch: 1, n: 4, layer: 'L_plast', at: [0.55, 1.75, zi + 0.01], name: 'Hliníková parozábrana', text: 'Jen u sauny, spoje jsou přelepené.' },
      { id: 'podlaha', ch: 2, n: 1, layer: 'L_skelet', at: [H - 0.45, 0.66, 1.12], name: 'Podlahový rám', text: 'C profily 75 mm po 40 cm, zespodu hliníkový plech.' },
      { id: 'sloupky', ch: 2, n: 2, layer: 'L_skelet', at: [-H + 1.42, 1.55, 1.11], name: 'Sloupky stěn', text: 'C profily 89 mm po 60 cm, mezi nimi minerální vata.' },
      { id: 'krokve', ch: 2, n: 3, layer: 'L_skelet', at: [H - 0.3, D.roofTop(H - 0.3) - 0.12, 0.555], name: 'Krokve', text: 'C profily 120 mm, střecha se sklonem 2°.' },
      { id: 'prostup', ch: 2, n: 4, layer: 'L_skelet', at: [fx, D.roofTop(fx) - 0.12, fz], name: 'Prostup komína', text: 'Izolovaný komín prochází střechou.' },
      { id: 'ram', ch: 3, n: 1, layer: 'L_prives', at: [H - 0.6, 0.58, 1.22], name: 'Rám přívěsu', text: 'Plošina 3,6 × 2,44 m.' },
      { id: 'napravy', ch: 3, n: 2, layer: 'L_prives', at: [D.axleX + 0.4, 0.26, 1.1], name: 'Nápravy Knott', text: 'Dvě brzděné nápravy pod plošinou.' },
      { id: 'oj', ch: 3, n: 3, layer: 'L_prives', at: [H + 1.32, 0.6, 0], name: 'Oj s nájezdovou brzdou', text: 'Spojka na běžnou kouli.' },
      { id: 'kolecko', ch: 3, n: 4, layer: 'L_prives', at: [H + 0.95, 0.12, 0.22], name: 'Opěrné kolečko', text: 'Na ruční posun a připojení k autu.' },
      { id: 'nohy', ch: 3, n: 5, layer: 'L_prives', at: [-H + 0.3, 0.2, 0.75], name: 'Opěrné nohy', text: 'Čtyři kličkové nohy na přání.' },
    ];
  }
  return [
    { id: 'v-prives', ch: 1, n: 1, layer: 'L_prives', at: [-H + 1.1, 0.5, 1.22], name: 'Přívěs', text: 'Nese celý dům. Nápravy jsou schované pod plošinou.' },
    { id: 'v-skelet', ch: 1, n: 2, layer: 'L_skelet', at: [H - 0.5, 1.15, 1.2], name: 'Ocelový skelet', text: 'Drží tvar domu. Nekroutí se ani nesesychá.' },
    { id: 'v-plast', ch: 1, n: 3, layer: 'L_plast', at: [-H + 0.6, D.eave + 0.2, 1.3], name: 'Dřevěný plášť', text: 'Chrání před počasím a izoluje.' },
    { id: 'podlaha', ch: 2, n: 1, layer: 'L_skelet', at: [H - 0.9, 0.68, 1.2], name: 'Podlahový rám', text: 'C profily po 40 cm leží na příčnících přívěsu, zespodu je chrání plech.' },
    { id: 'sloupky', ch: 2, n: 2, layer: 'L_skelet', at: [-H + 2.2, 1.75, 1.15], name: 'Sloupky stěn', text: 'Svislé profily v rozteči 60 cm, u oken zdvojené s překladem. Mezi nimi je místo pro izolaci a rozvody.' },
    { id: 'krokve', ch: 2, n: 3, layer: 'L_skelet', at: [0.3, D.ridge - 0.62, 0.62], name: 'Krokve a hřeben', text: `Sedlová střecha se sklonem ${D.pitch}°, sníh i voda z ní rychle sjedou.` },
    { id: 'ram', ch: 3, n: 1, layer: 'L_prives', at: [H - 1.6, 0.58, 1.22], name: 'Žebřinový rám', text: 'Podélníky a příčníky ze žárově zinkované oceli. Nese celý dům.' },
    { id: 'napravy', ch: 3, n: 2, layer: 'L_prives', at: [D.axleX + 0.4, 0.26, 1.1], name: 'Tandemové nápravy Knott', text: 'Dvě brzděné nápravy pod plošinou, čtyři kola. Dům proto sedí nízko.' },
    { id: 'oj', ch: 3, n: 3, layer: 'L_prives', at: [H + 1.32, 0.6, 0], name: 'Oj s nájezdovou brzdou', text: 'Když auto brzdí, přívěs přibrzdí sám. Spojovací hlava na běžnou kouli.' },
    { id: 'kolecko', ch: 3, n: 4, layer: 'L_prives', at: [H + 0.95, 0.12, 0.22], name: 'Opěrné kolo', text: 'Na ruční posun a připojení k autu, za jízdy se vytáhne nahoru.' },
    { id: 'nohy', ch: 3, n: 5, layer: 'L_prives', at: [-H + 0.3, 0.2, 0.75], name: 'Opěrné nohy', text: 'Čtyři výsuvné nohy v rozích. Na pozemku odlehčí nápravy a dům se nehoupe.' },
  ];
}

// Stav scény po kapitolách: [explode, op přívěs, op kostra, op plášť, záře přívěs, záře kostra, záře plášť, kóty, nohy nahoru, az, el, dist, tx, ty, tz]
// dist a tx platí pro Dům M, pro S a L se škálují délkou.
const KEYS = [
  [0, 1, 1, 1, 0, 0, 0, 0, 0, 0.62, 0.20, 14.6, 0.8, 1.75, 0],
  [1, 1, 1, 1, 0, 0, 0, 0, 0, 0.78, 0.26, 17.0, 0.3, 2.9, 0],
  [0.7, 0.12, 1, 0.03, 0, 0.18, 0, 0, 0, 0.42, 0.22, 15.0, 0, 2.62, 0],
  [1, 1, 0, 0, 0.06, 0, 0, 0, 0, 1.02, 0.3, 9.7, 1.5, 0.35, 0],
  [0, 1, 1, 1, 0, 0, 0, 1, 1, 0.5, 0.27, 16.6, 0.55, 1.95, 0.35],
];
const N = CH.length;
const LAYERS = ['L_prives', 'L_skelet', 'L_plast'];

const pad = (n, w = 2) => String(n).padStart(w, '0');
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = t => { t = clamp((t - 0.12) / 0.76, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

function stateAt(p) {
  const i = clamp(Math.floor(p), 0, N - 1), j = Math.min(N - 1, i + 1), t = ease(p - i);
  return KEYS[i].map((v, k) => v + (KEYS[j][k] - v) * t);
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}
function lowEnd() {
  const c = navigator.hardwareConcurrency || 8, m = navigator.deviceMemory || 8, sd = navigator.connection && navigator.connection.saveData;
  return c < 4 || m < 3 || !!sd;
}

/* ------------------------------------------------------------------ markup */

const ICONS = {
  zinek: '<path d="M4 17V7l8-4 8 4v10l-8 4-8-4Z"/><path d="M4 7l8 4 8-4M12 11v10"/>',
  napravy: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M2 9h20M7 9v2.5M17 9v2.5"/>',
  plosina: '<path d="M3 10h18M3 7v6M21 7v6"/><path d="M6 17h12" stroke-dasharray="2 2"/>',
  nohy: '<path d="M3 8h18M5 8v10M19 8v10M3.5 18h3M17.5 18h3M9 8v6M15 8v6"/>',
  eu: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.8-5"/>',
};
const icon = k => `<svg class="pv-ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;

const first = t => t.split(/(?<=\.)\s/)[0];
const factsOf = (D, o) => { const T = dimText(D); return o.facts || [['Délka domu', T.length], ['Celkem s ojí', T.total], ['Šířka přes střechu', T.width], ['Výška', T.height], ['Podlaha nad terénem', '73 cm'], ['Celková hmotnost', T.weight]]; };

// Celostránková scéna: připnutá plocha přes celou šířku, v ní model, číslované body s popisky na odkazových čarách
// (desktop) nebo jedna karta dole (mobil), titulek kapitoly v rohu. Texty kapitol jsou i jako běžné HTML pod scénou
// (vizuálně skryté, při statické verzi viditelné jako seznam).
function markup(id, D, PARTS, o) {
  const CH = D.sauna ? CH_SAUNA : CH_HOUSE;
  const facts = factsOf(D, o);
  const legend = ch => { const ps = PARTS.filter(p => p.ch === ch); return ps.length ? `<ol class="pv-legend">${ps.map(p => `<li><span class="pv-num" aria-hidden="true">${p.n}</span><span><b>${p.name}</b> <span class="pv-legend-text">${p.text}</span></span></li>`).join('')}</ol>` : ''; };
  const chapters = CH.map((c, i) => `
    <article class="pv-ch" data-i="${i}" id="${id}-ch${i + 1}" aria-labelledby="${id}-cht${i + 1}">
      <p class="pv-ch-no"><span>${pad(i + 1)}</span>${c.short}</p>
      <h3 class="pv-ch-title" id="${id}-cht${i + 1}">${c.title}</h3>
      <p class="pv-ch-text">${c.text}</p>
      ${legend(i)}${i === N - 1 ? `<dl class="pv-dimlist">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>${o.factsNote ? `<p class="pv-facts-note">${o.factsNote}</p>` : ''}` : ''}
    </article>`).join('');
  const dots = CH.map((c, i) => `<button type="button" class="pv-dot" data-i="${i}" aria-label="Kapitola ${i + 1}: ${c.short}" aria-controls="${id}-ch${i + 1}"><span aria-hidden="true"></span></button>`).join('');
  const hotspots = PARTS.map(p => `<button type="button" class="pv-hs" data-part="${p.id}" data-ch="${p.ch}" aria-pressed="false" tabindex="-1" aria-hidden="true" aria-label="${p.n}: ${p.name}. ${p.text}"><span>${p.n}</span></button>`).join('');
  const labels = PARTS.map(p => `<div class="pv-lb" data-part="${p.id}"><span class="pv-num">${p.n}</span><span class="pv-lb-t"><b>${p.name}</b><span>${first(p.text)}</span></span></div>`).join('');
  const tbs = CH.map((c, i) => `<div class="pv-tbi" data-i="${i}"><p class="pv-tb-h">${c.title}</p><p class="pv-tb-p">${first(c.text)}</p></div>`).join('');
  const variants = [['S', 6.0], ['M', 7.2], ['L', 7.8]];
  return `
<div class="pv-head">
  <p class="pv-eyebrow">Podvozek</p>
  <h2 class="pv-h">Dům na kolech, vrstvu po vrstvě</h2>
  <p class="pv-lead">Pod každým Nordhousem je silniční přívěs, na něm lehký ocelový skelet a teprve navrch dřevo. Projděte si dům od kol až po hřeben střechy.</p>
</div>
<div class="pv-scrolly">
  <div class="pv-pin">
    <div class="pv-stage" data-step="0">
      <div class="pv-art">${D.sauna ? saunaDrawing(D, PARTS) : drawing(D, PARTS)}</div>
      <div class="pv-gl" aria-hidden="true"></div>
      <div class="pv-overlay">${hotspots}<div class="pv-dimlabels" aria-hidden="true"></div></div>
      <svg class="pv-leaders" aria-hidden="true"></svg>
      <div class="pv-labels" aria-hidden="true">${labels}</div>
      <div class="pv-tb">
        <div class="pv-tb-top"><p class="pv-hud" aria-hidden="true"><span class="pv-hud-no">01</span><span class="pv-hud-of">/ ${pad(N)}</span><span class="pv-hud-name">${CH[0].short}</span></p>
          <nav class="pv-dots" aria-label="Kapitoly podvozku">${dots}</nav></div>
        <div class="pv-tb-stack" aria-hidden="true">${tbs}</div>
      </div>
      <p class="pv-tag">${D.tagName || `Dům ${D.key} · ilustrační model`}</p>
      <div class="pv-factsbar" aria-hidden="true">${facts.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}${o.factsNote ? `<p>${o.factsNote}</p>` : ''}</div>
      <div class="pv-card" aria-hidden="true"><div class="pv-card-in"></div></div>
    </div>
  </div>
  <div class="pv-chapters">${chapters}</div>
</div>
<div class="pv-tow">
  <div class="pv-tow-head">
    <p class="pv-eyebrow">Kdo ho utáhne</p>
    <h3 class="pv-h2">Stačí auto s tažným zařízením na 3 500 kg</h3>
    <p class="pv-prov"><span class="pv-prov-dot" aria-hidden="true"></span>Předběžné údaje. Přesné hodnoty potvrdíme po vážení prvních kusů.</p>
  </div>
  <ul class="pv-variants" role="list">
    ${variants.map(([k, l]) => `<li class="pv-var"><p class="pv-var-name">Dům ${k}</p><p class="pv-var-len"><span class="pv-x">${fmt(l)}</span> m</p><p class="pv-var-sub">délka domu<span class="pv-ast" title="Předběžný údaj">*</span></p>
      <div class="pv-var-bar" aria-hidden="true"><i style="width:${(l / 7.8 * 100).toFixed(1)}%"></i></div>
      <dl class="pv-var-dl"><div><dt>Celková hmotnost</dt><dd>do 3 500 kg<span class="pv-ast" title="Předběžný údaj">*</span></dd></div><div><dt>Řidičské oprávnění</dt><dd>B+E</dd></div></dl></li>`).join('')}
  </ul>
  <p class="pv-tow-car"><b>Tažné vozidlo</b> s povolenou hmotností brzděného přívěsu 3 500 kg, platí pro všechny velikosti. <span class="pv-muted">* předběžné údaje</span></p>
</div>
<ul class="pv-specs" role="list" aria-label="Parametry přívěsu">
  <li>${icon('zinek')}<b>Žárově zinkovaný rám</b><span>Zinek chrání ocel i tam, kam se nedá natřít.</span></li>
  <li>${icon('napravy')}<b>Nápravy Knott</b><span>Dvě brzděné nápravy pod plošinou.</span></li>
  <li>${icon('plosina')}<b>Plošina 244 cm</b><span>Šířka rámu, na kterém stojí skelet.</span></li>
  <li>${icon('nohy')}<b>4 opěrné nohy</b><span>Stabilní stání na pozemku.</span></li>
  <li>${icon('eu')}<b>EU homologace</b><span>Schválený silniční přívěs.</span></li>
</ul>`;
}

/* ---------------------------------------------- statická kresba (SVG bokorys) */
// Pohled na pravou stěnu (+Z), oj vpravo, jako výkres „pohled – pravá boční stěna“. Měřítko 78 px/m, zem y=505.
function drawing(D, PARTS) {
  const S = 78, H = D.H, X = m => +(64 + (m + H + 0.75) * S).toFixed(1), Y = m => +(505 - m * S).toFixed(1);
  const T = dimText(D);
  const r = (x0, y0, x1, y1, cls = '', part = '') => `<rect x="${X(x0)}" y="${Y(y1)}" width="${(X(x1) - X(x0)).toFixed(1)}" height="${(Y(y0) - Y(y1)).toFixed(1)}"${cls ? ` class="${cls}"` : ''}${part ? ` data-part="${part}"` : ''}/>`;
  const l = (x0, y0, x1, y1, cls = '') => `<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x1)}" y2="${Y(y1)}"${cls ? ` class="${cls}"` : ''}/>`;
  const eave = D.yUnder(1.25), ridgeU = D.yUnder(0), wallTop = D.yUnder(1.171), f = D.ffl;
  const holes = D.open.R.map(([a, b, lo, hi]) => [a / 1000 - H, b / 1000 - H, f + lo / 1000, f + hi / 1000]);
  const studsX = []; for (let x = 0; x <= H - 0.1; x += 0.6) { studsX.push(x); if (x) studsX.push(-x); } studsX.push(-H + 0.12, H - 0.12);
  const stud = x => {
    let segs = [[0.71, wallTop]];
    for (const [a, b, lo, hi] of holes) if (x > a - 0.06 && x < b + 0.06) segs = [[0.71, lo], [hi + 0.08, wallTop]];
    return segs.filter(s => s[1] - s[0] > 0.05).map(s => l(x, s[0], x, s[1])).join('');
  };
  const jambs = holes.map(([a, b, lo, hi]) => l(a - 0.03, 0.71, a - 0.03, wallTop) + l(b + 0.03, 0.71, b + 0.03, wallTop) + l(a - 0.05, hi + 0.04, b + 0.05, hi + 0.04) + (lo > 0.9 ? l(a, lo - 0.02, b, lo - 0.02) : '')).join('');
  const nb = Math.round(D.L / 0.14);
  const boards = Array.from({ length: nb - 1 }, (_, i) => l(-H + (i + 1) * 0.14, 0.6, -H + (i + 1) * 0.14, eave, 'pv-s-board')).join('');
  const seams = Array.from({ length: Math.floor((D.L + 0.3) / 0.5) }, (_, i) => l(-H - 0.15 + 0.25 + i * 0.5, D.yTop(1.275) - 0.05, -H - 0.15 + 0.25 + i * 0.5, D.ridge - 0.03, 'pv-s-seam')).join('');
  const P = Object.fromEntries(PARTS.map(p => [p.id, p]));
  const mk = (id, y) => { const p = P[id]; return `<g class="pv-s-mk" data-ch="${p.ch}"><circle cx="${X(p.at[0])}" cy="${Y(y ?? p.at[1])}" r="11"/><text x="${X(p.at[0])}" y="${Y(y ?? p.at[1]) + 4}">${p.n}</text></g>`; };
  const wheel = x => `<circle cx="${X(x)}" cy="${Y(0.2625)}" r="${0.2625 * S}" class="pv-s-tyre"/><circle cx="${X(x)}" cy="${Y(0.2625)}" r="${0.165 * S}" class="pv-s-rim"/><circle cx="${X(x)}" cy="${Y(0.2625)}" r="${0.1 * S}" class="pv-s-rim"/>`;
  const leg = x => `<g class="pv-s-stow">${r(x - 0.03, 0.03, x + 0.03, 0.39, 'pv-s-steel')}${r(x - 0.08, 0, x + 0.08, 0.02, 'pv-s-steel')}</g>`;
  const crossX = []; for (let x = -H + 0.3; x < H; x += 0.6) crossX.push(x);
  const hy = D.hitch;
  return `<svg class="pv-svg" viewBox="0 0 960 600" role="img" aria-label="Bokorys Domu ${D.key} na podvozku">
  <g class="pv-s-ground">${l(-H - 0.7, 0, hy + 0.3, 0)}${Array.from({ length: Math.floor((D.total + 0.9) / 0.48) }, (_, i) => `<line x1="${X(-H - 0.6 + i * 0.48)}" y1="${Y(0)}" x2="${X(-H - 0.6 + i * 0.48) - 8}" y2="${Y(0) + 8}"/>`).join('')}</g>
  <g class="pv-s-tr">
    <g data-part="ram">${r(-H, 0.54, H, 0.62, 'pv-s-steel')}${r(-H + 0.02, 0.39, H, 0.54, 'pv-s-steel')}${crossX.map(x => l(x, 0.54, x, 0.62)).join('')}</g>
    <g data-part="napravy">${wheel(D.axleX - 0.4)}${wheel(D.axleX + 0.4)}</g>
    <g data-part="oj"><path class="pv-s-steel" d="M${X(H - 0.6)} ${Y(0.52)}L${X(H + 1.15)} ${Y(0.52)}L${X(H + 1.15)} ${Y(0.42)}L${X(H - 0.6)} ${Y(0.42)}Z"/>${r(H + 1.12, 0.42, H + 1.42, 0.56, 'pv-s-steel')}<path class="pv-s-steel" d="M${X(H + 1.42)} ${Y(0.53)}L${X(hy + 0.06)} ${Y(0.53)}a${0.06 * S} ${0.06 * S} 0 0 1 0 ${0.12 * S}L${X(H + 1.42)} ${Y(0.43)}Z"/>${l(H + 1.22, 0.56, H + 0.98, 0.78)}</g>
    <g data-part="kolecko" class="pv-s-stow">${r(H + 0.93, 0.18, H + 0.97, 0.78, 'pv-s-steel')}<circle cx="${X(H + 0.95)}" cy="${Y(0.1)}" r="${0.1 * S}" class="pv-s-tyre"/></g>
    <g data-part="nohy">${leg(-H + 0.3)}${leg(H - 0.3)}</g>
  </g>
  <g class="pv-s-sk"><g class="pv-s-skin">
    <g data-part="podlaha">${r(-H + 0.08, 0.62, H - 0.08, 0.71, 'pv-s-frame')}</g>
    <g data-part="sloupky" class="pv-s-studs">${studsX.map(stud).join('')}${jambs}${l(-H + 0.08, wallTop, H - 0.08, wallTop)}${l(-H + 0.08, f + 1.2, H - 0.08, f + 1.2, 'pv-s-nog')}</g>
    <g data-part="krokve" class="pv-s-studs">${studsX.map(x => l(x, wallTop + 0.03, x, ridgeU)).join('')}${l(-H + 0.1, ridgeU, H - 0.1, ridgeU)}</g>
  </g></g>
  <g class="pv-s-sh">
    <g class="pv-s-wall">${r(-H, 0.6, H, eave, 'pv-s-wood')}${boards}${holes.map(([a, b, lo, hi]) => r(a, lo, b, hi, lo < f + 0.1 ? 'pv-s-door' : 'pv-s-glass')).join('')}</g>
    <g class="pv-s-roof"><path class="pv-s-roofp" d="M${X(-H - 0.15)} ${Y(D.yTop(1.275) - 0.24)}L${X(-H - 0.15)} ${Y(D.ridge)}L${X(H + 0.15)} ${Y(D.ridge)}L${X(H + 0.15)} ${Y(D.yTop(1.275) - 0.24)}Z"/>${seams}</g>
  </g>
  <g class="pv-s-dims">
    ${l(-H, -0.08, -H, -0.36)}${l(H, -0.08, H, -0.36)}${l(-H, -0.26, H, -0.26)}
    <text x="${X(0)}" y="${Y(-0.26) + 16}">délka domu ${T.length}</text>
    ${l(hy, -0.08, hy, -0.72)}${l(-H, -0.36, -H, -0.72)}${l(-H, -0.62, hy, -0.62)}
    <text x="${X((hy - H) / 2)}" y="${Y(-0.62) + 16}">celkem s ojí ${T.total}</text>
    ${l(-H - 0.2, 0, -H - 0.5, 0)}${l(-H - 0.2, D.ridge, -H - 0.5, D.ridge)}${l(-H - 0.4, 0, -H - 0.4, D.ridge)}
    <text x="${X(-H - 0.4) - 8}" y="${Y(2)}" transform="rotate(-90 ${X(-H - 0.4) - 8} ${Y(2)})">výška ${T.height}</text>
    <text x="${X(H + 0.35)}" y="${Y(3.5)}" class="pv-s-note">šířka ${T.width}</text>
    <text x="${X(H + 0.35)}" y="${Y(3.5) + 22}" class="pv-s-note">celkem ${T.weight}</text>
  </g>
  ${mk('podlaha')}${mk('sloupky')}${mk('krokve', ridgeU - 0.35)}
  ${mk('ram', 0.5)}${mk('napravy')}${mk('oj', 0.8)}${mk('kolecko', 0.45)}${mk('nohy', 0.7)}
</svg>`;
}

/* --------------------------------------------- kompaktní vložení (detail, úvod) */

// Upraví vykreslený markup podle voleb compact / towing / specs / head. Texty jdou přes textContent.
function applyEmbed(root, o) {
  const compact = !!o.compact;
  root.classList.toggle('pv--compact', compact);
  if (!(o.towing ?? !compact)) root.querySelector('.pv-tow')?.remove();
  if (!(o.specs ?? !compact)) root.querySelector('.pv-specs')?.remove();
  const head = root.querySelector('.pv-head');
  if (o.head === false) head?.remove();
  else if (o.head && head) {
    const set = (sel, v) => { const el = head.querySelector(sel); if (el && v != null) el.textContent = v; };
    set('.pv-eyebrow', o.head.eyebrow); set('.pv-h', o.head.title); set('.pv-lead', o.head.lead);
    if (o.head.cta) {
      const a = document.createElement('a');
      a.className = o.head.cta.className || 'pv-cta'; a.href = o.head.cta.href; a.textContent = o.head.cta.label;
      const w = document.createElement('p'); w.className = 'pv-head-cta'; w.append(a); head.append(w);
    }
  }
}

/* ------------------------------------------------- popisky na odkazových čarách (společné pro dům i stěnu) */

// Postup každý snímek: body (promítnuté kotvy) se rozdělí na levý a pravý okraj scény podle polohy (jednou, když se
// objeví), na každé straně se seřadí podle výšky, popisky se posunou tak, aby se nepřekrývaly a zůstaly v bezpečných
// okrajích (pod titulkem vlevo, pod štítkem vpravo, nad rezervou dole). Odkazová čára vede od bodu k hraně popisku.
// Šířka okraje a popisku se čte z CSS (--pv-m, --pv-lw); --pv-lw 0 = režim karty (mobil), popisky se nekreslí.
function annotator(stage, gl, svg, topLeft, topRight) {
  const NS = 'http://www.w3.org/2000/svg';
  const side = new Map(), paths = new Map(), heights = new Map();
  const cfg = () => { const cs = getComputedStyle(stage); return { m: parseFloat(cs.getPropertyValue('--pv-m')) || 16, lw: parseFloat(cs.getPropertyValue('--pv-lw')) || 0 }; };
  const path = id => {
    if (!paths.has(id)) { const p = document.createElementNS(NS, 'path'); p.setAttribute('pathLength', '1'); p.setAttribute('class', 'pv-ln'); svg.appendChild(p); paths.set(id, p); }
    return paths.get(id);
  };
  return {
    cardMode: () => cfg().lw <= 0,
    reset() { side.clear(); heights.clear(); },
    place(items, opt = {}) {
      const { m, lw } = cfg(), w = stage.clientWidth, h = stage.clientHeight;
      const live = new Set(items.map(i => i.id));
      for (const [id, p] of paths) p.classList.toggle('is-on', live.has(id) && lw > 0);
      if (lw <= 0 || !items.length) return;
      const fresh = items.filter(i => !side.has(i.id));
      if (fresh.length) {
        const cx = gl.offsetLeft + gl.clientWidth / 2;
        if (fresh.length === items.length && opt.balance !== false) {
          const L = items.filter(i => i.x < cx), R = items.filter(i => i.x >= cx);
          while (L.length - R.length > 1) { L.sort((a, b) => b.x - a.x); R.push(L.shift()); }
          while (R.length - L.length > 1) { R.sort((a, b) => a.x - b.x); L.push(R.shift()); }
          L.forEach(i => side.set(i.id, 0)); R.forEach(i => side.set(i.id, 1));
        } else fresh.forEach(i => side.set(i.id, i.side ?? (i.x < cx ? 0 : 1)));
        items.forEach(i => heights.set(i.id, i.el.offsetHeight));
      }
      const sb = stage.getBoundingClientRect();
      const tops = [topLeft() - sb.top + 20, topRight() - sb.top + 16];
      const bot = h - m - (opt.reserve || 0);
      for (const s of [0, 1]) {
        // pořadí shora dolů: podle výšky, při podobné výšce blíž k okraji = výš (odkazové čáry se pak nekříží)
        const key = i => i.y + (s ? -0.5 : 0.5) * i.x;
        const arr = items.filter(i => side.get(i.id) === s).sort((a, b) => key(a) - key(b));
        const hs = arr.map(i => heights.get(i.id) || i.el.offsetHeight), gap = 14, ys = arr.map(i => i.y - 11);
        for (let k = 0; k < ys.length; k++) ys[k] = Math.max(ys[k], tops[s], k ? ys[k - 1] + hs[k - 1] + gap : -1e9);
        for (let k = ys.length - 1; k >= 0; k--) ys[k] = Math.min(ys[k], (k < ys.length - 1 ? ys[k + 1] - gap : bot) - hs[k]);
        for (let k = 0; k < ys.length; k++) ys[k] = Math.max(ys[k], tops[s], k ? ys[k - 1] + hs[k - 1] + gap : -1e9);
        arr.forEach((it, k) => {
          const x = s ? w - m - lw : m, y = ys[k];
          it.el.dataset.side = s ? 'R' : 'L';
          it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
          const ly = y + 11, ex = s ? x - 8 : x + lw + 8, kx = s ? ex - 26 : ex + 26;
          path(it.id).setAttribute('d', `M${it.x.toFixed(1)} ${it.y.toFixed(1)}L${kx.toFixed(1)} ${ly.toFixed(1)}L${ex.toFixed(1)} ${ly.toFixed(1)}`);
        });
      }
    },
  };
}
// Karta dole (mobil): obsah se mění s krátkým prolnutím. Dokud 3D scéna neběží (plakát s kresbou, skrytá karta prohlížeče),
// mění se hned, bez časovače: text karty pak vždy odpovídá kapitole, i když se animace nebo časovače zastaví.
function cardCtl(el) {
  const inner = el && el.querySelector('.pv-card-in'), stage = el && el.closest('.pv-stage'); let key = null, t = 0;
  return {
    set(k, html) {
      if (!inner || k === key) return;
      const instant = key === null || document.hidden || !(stage && stage.classList.contains('pv-stage--3d'));
      key = k; clearTimeout(t);
      if (instant) { inner.innerHTML = html; inner.classList.remove('is-out'); return; }
      inner.classList.add('is-out'); t = setTimeout(() => { inner.innerHTML = html; inner.classList.remove('is-out'); }, 180);
    },
    clear() { clearTimeout(t); },
  };
}
function scrollProgress(scrolly, pin) {
  const travel = scrolly.offsetHeight - pin.offsetHeight; if (travel <= 0) return 0;
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  return clamp((top - scrolly.getBoundingClientRect().top) / travel, 0, 1);
}
function scrollToProgress(scrolly, pin, r, smooth) {
  const travel = scrolly.offsetHeight - pin.offsetHeight, top = parseFloat(getComputedStyle(pin).top) || 0;
  scrollTo({ top: scrollY + scrolly.getBoundingClientRect().top - top + travel * r + 2, behavior: smooth ? 'smooth' : 'auto' });
}

/* ---------------------------------- společné pro všechny 3D sekce: jedna scéna najednou, uvolnění daleko od obrazovky */

// Kreslí vždy jen ta 3D scéna, jejíž připnutá plocha zabírá na obrazovce nejvíc místa (na stránce jich může být víc:
// dispozice, konstrukce, stěna). Ostatní stojí a na scroll nereagují vykreslením (viewer.gate(false)).
const GATE = new Set(); let gateRaf = 0;
function gateRun() {
  gateRaf = 0; let best = null, bv = 0;
  for (const g of GATE) {
    if (!g.viewer || !g.visible) continue;
    const r = g.box.getBoundingClientRect(), v = Math.min(innerHeight, r.bottom) - Math.max(0, r.top);
    if (v > bv) { bv = v; best = g; }
  }
  for (const g of GATE) if (g.viewer) g.viewer.gate(g === best);
}
function gateKick() { if (!gateRaf) gateRaf = requestAnimationFrame(gateRun); }
function gateEntry(box) { const g = { box, viewer: null, visible: false }; GATE.add(g); return g; }
function gateDrop(g) { GATE.delete(g); gateKick(); }

// Životní cyklus scény: vytvoří se, když se sekce přiblíží (near), a zahodí (dispose, uvolní WebGL kontext a paměť),
// když je daleko (far). Při návratu se postaví znovu.
function lifecycle(el, { near, far, create, ready, drop, fail }) {
  let viewer = null, busy = false, dead = false, inNear = false;
  const make = () => {
    if (viewer || busy || dead) return;
    busy = true;
    create().then(v => {
      busy = false;
      if (dead) { v.dispose(); return; }
      viewer = v; ready(v);
    }).catch(err => { busy = false; fail(err); });
  };
  const ioNear = new IntersectionObserver(([e]) => { inNear = e.isIntersecting; if (inNear) make(); }, { rootMargin: `${near} 0px` });
  const ioFar = new IntersectionObserver(([e]) => {
    if (e.isIntersecting || !viewer) return;
    const v = viewer; viewer = null; drop(v); v.dispose();
  }, { rootMargin: `${far} 0px` });
  ioNear.observe(el); ioFar.observe(el);
  return { destroy() { dead = true; ioNear.disconnect(); ioFar.disconnect(); if (viewer) { const v = viewer; viewer = null; drop(v); v.dispose(); } } };
}

/* ----------------------------- společné ovládání scény: přeskočení, nápověda „Posouvejte“, hystereze kapitol */

// Hystereze: aktuální kapitola zůstává, dokud se poloha nevzdálí o víc než půl kapitoly + h. Když se scroll zastaví
// přesně na hranici, karta a popisky tak nepřeblikávají mezi dvěma kapitolami.
function stepHyst(p, cur, N, h = 0.08) {
  const r = clamp(Math.round(p), 0, N - 1);
  return cur >= 0 && cur < N && Math.abs(p - cur) < 0.5 + h ? cur : r;
}
const SVG_DOWN = '<svg class="pv-skip-i" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v10M3.5 8.5 8 13l4.5-4.5"/></svg>';
// Tlačítko „Přeskočit prohlídku“ (první prvek scény pro klávesnici) skočí těsně za připnutou část: na úvod další sekce,
// fokus jde na první obsah za scénou. Nápověda „Posouvejte“ je vidět jen v první kapitole a po prvním posunu uvnitř
// sekce natrvalo zmizí. Ve statické verzi (bez WebGL, slabé zařízení, omezený pohyb) se nezobrazuje ani jedno.
function stageExtras({ stage, scrolly, pin, reduced }) {
  stage.insertAdjacentHTML('afterbegin', `<button type="button" class="pv-skip" aria-label="Přeskočit prohlídku"><span class="pv-skip-l">Přeskočit prohlídku</span><span class="pv-skip-s" aria-hidden="true">Přeskočit</span>${SVG_DOWN}</button>`);
  stage.insertAdjacentHTML('beforeend', '<p class="pv-hint" aria-hidden="true"><svg class="pv-hint-i" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4"/></svg>Posouvejte</p>');
  const skip = stage.querySelector('.pv-skip'), hint = stage.querySelector('.pv-hint');
  let gone = false;
  const onSkip = () => {
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    scrollTo({ top: Math.round(scrollY + scrolly.getBoundingClientRect().bottom - top), behavior: reduced ? 'instant' : 'smooth' });
    let el = scrolly; while (el && !el.nextElementSibling) el = el.parentElement;
    const next = el && el.nextElementSibling;
    if (next) { if (!next.hasAttribute('tabindex')) next.setAttribute('tabindex', '-1'); next.classList.add('pv-skip-target'); next.focus({ preventScroll: true }); }
  };
  skip.addEventListener('click', onSkip);
  return {
    progress(r) { if (!gone && r > 0.02) { gone = true; hint.classList.add('is-gone'); } },
    destroy() { skip.removeEventListener('click', onSkip); },
  };
}

// Karta poslední kapitoly (mobil): čísla, u dispozice i tlačítka pod nimi. Je to samostatný prvek, který je pořád
// rozvržený a jen se zviditelní, takže vyšší karta v poslední kapitole nezpůsobí posun rozvržení (CLS).
function finalCard(stage, html) {
  stage.insertAdjacentHTML('beforeend', `<div class="pv-card pv-card--final" aria-hidden="true"><div class="pv-card-in">${html}</div></div>`);
}

/* ------------------------------------------------------------------ mount */

let uid = 0;
export function mountPodvozek(root, opts = {}) {
  const o = { glb: null, frames: null, frameCount: 5, mode: 'auto', lazyMargin: '120%', variant: 'm', ...opts };
  const D = dimsOf(o.variant), PARTS = partsFor(D), FACTS = factsOf(D, o), CH = D.sauna ? CH_SAUNA : CH_HOUSE;
  const what = D.sauna ? 'Sauna na podvozku' : `Dům ${D.key} na podvozku`;
  const id = 'pv' + (++uid);
  root.classList.add('pv');
  root.innerHTML = markup(id, D, PARTS, o);
  applyEmbed(root, o);

  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const scrolly = $('.pv-scrolly'), pin = $('.pv-pin'), stage = $('.pv-stage'), glBox = $('.pv-gl');
  const chapters = $$('.pv-ch'), dots = $$('.pv-dot'), hs = $$('.pv-hs'), tbis = $$('.pv-tbi'), lbs = $$('.pv-lb');
  const hudNo = $('.pv-hud-no'), hudName = $('.pv-hud-name'), factsbar = $('.pv-factsbar'), tag = $('.pv-tag'), tbTop = $('.pv-tb-top');
  const card = cardCtl($('.pv-card'));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = o.reducedMotion ?? mqReduce.matches;
  // Omezený pohyb a slabá zařízení: statická kresba a kapitoly jako běžný seznam pod ní.
  const isStatic = reduced || o.mode === 'static' || (o.mode === 'auto' && (lowEnd() || !hasWebGL()));
  root.classList.toggle('pv--static', isStatic);
  root.classList.toggle('pv--reduced', reduced);
  const extras = stageExtras({ stage, scrolly, pin, reduced });
  finalCard(stage, `<p class="pv-card-k">${pad(N)} · ${CH[N - 1].short}</p><p class="pv-card-h">${CH[N - 1].title}</p><dl class="pv-card-facts">${FACTS.map(([a2, b]) => `<div><dt>${a2}</dt><dd>${b}</dd></div>`).join('')}</dl>`);
  if (isStatic && o.head?.leadStatic) { const l = root.querySelector('.pv-lead'); if (l) l.textContent = o.head.leadStatic; }   // bez pohybu pravdivý text

  let frameImg = null;
  if (o.frames) { $('.pv-art').innerHTML = `<img class="pv-frame" alt="" decoding="async">`; frameImg = $('.pv-frame'); }
  const frameSrc = k => o.frames.replace('{n}', pad(k + 1, 3));

  let p = 0, active = -1, part = null, auto = null, visible = false, ticking = false, viewer = null, destroyed = false, proj = null;
  const tbBottom = () => { const t = tbis[active]; return (t && t.classList.contains('is-on') ? t : tbTop).getBoundingClientRect().bottom; };
  const ann = annotator(stage, glBox, $('.pv-leaders'), tbBottom, () => tag.getBoundingClientRect().bottom);

  function layout() {
    const cm = ann.cardMode(), items = [];
    PARTS.forEach((pd, k) => {
      const on = !cm && !isStatic && !!proj && pd.ch === active;
      lbs[k].classList.toggle('is-on', on);
      if (on && proj[k]) items.push({ id: pd.id, el: lbs[k], x: proj[k][0] + glBox.offsetLeft, y: proj[k][1] + glBox.offsetTop });
    });
    ann.place(items, { reserve: active === N - 1 ? factsbar.offsetHeight + 16 : 0 });
    if (cm && !isStatic) cardContent();
  }
  // Karta: titulek kapitoly, pak postupně díly kapitoly podle scrollu (nebo díl vybraný klepnutím), v poslední kapitole čísla.
  function cardContent() {
    const c = CH[active]; if (!c) return;
    const ps = PARTS.filter(x => x.ch === active);
    let pd = part ? PARTS.find(x => x.id === part) : null;
    if (!pd && ps.length && viewer) { const f = clamp(p - active + 0.5, 0, 1); if (f >= 0.3 && f <= 0.68) pd = ps[clamp(Math.floor((f - 0.3) / 0.38 * ps.length), 0, ps.length - 1)]; }   // díly jen dokud jsou jejich body vidět
    const a = pd ? pd.id : null;
    if (a !== auto) { auto = a; hs.forEach(b => b.classList.toggle('is-cur', b.dataset.part === a)); if (!part && viewer) viewer.part(a); }
    const k = `<p class="pv-card-k">${pad(active + 1)} · ${c.short}</p>`;
    if (active === N - 1) return;   // poslední kapitola: samostatná karta s čísly (finalCard), tahle se jen skryje
    if (pd) card.set(pd.id, `${k}<p class="pv-card-h"><span class="pv-num">${pd.n}</span>${pd.name}</p><p class="pv-card-p">${first(pd.text)}</p>`);
    else card.set('c' + active, `${k}<p class="pv-card-h">${c.title}</p><p class="pv-card-p">${first(c.text)}</p>`);
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    chapters.forEach((c, k) => c.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => k === i ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current'));
    stage.dataset.step = i; stage.classList.toggle('is-final', i === N - 1);
    hudNo.textContent = pad(i + 1); hudName.textContent = CH[i].short;
    tbis.forEach((t, k) => t.classList.toggle('is-on', k === i));
    hs.forEach(b => { const on = +b.dataset.ch === i && !isStatic; b.tabIndex = on ? 0 : -1; b.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    factsbar.classList.toggle('is-on', i === N - 1);
    ann.reset();
    if (part && PARTS.find(x => x.id === part).ch !== i) setPart(null);
    if (viewer) viewer.label(`3D model: ${what}. Kapitola ${i + 1}: ${CH[i].title}.`);
    if (frameImg && o.frameCount <= N) frameImg.src = frameSrc(i);
    layout();
  }
  function setPart(pid) {
    part = pid;
    hs.forEach(b => b.setAttribute('aria-pressed', b.dataset.part === pid ? 'true' : 'false'));
    lbs.forEach(l => l.classList.toggle('is-hl', l.dataset.part === pid));
    $$('.pv-svg [data-part]').forEach(g => g.classList.toggle('is-hl', g.dataset.part === pid));
    viewer && viewer.part(pid || auto);
    if (ann.cardMode()) cardContent();
  }

  let rafU = 0;
  function update() {
    rafU = 0; ticking = false;
    if (destroyed) return;
    if (!isStatic) { const r = scrollProgress(scrolly, pin); p = r * (N - 1); extras.progress(r); }
    setActive(isStatic ? Math.max(active, 1) : stepHyst(p, active, N));
    if (viewer) viewer.target(p, false);
    if (frameImg && o.frameCount > N) { const k = Math.round(p / (N - 1) * (o.frameCount - 1)), src = frameSrc(k); if (!frameImg.src.endsWith(src)) frameImg.src = src; }
    if (ann.cardMode() && !isStatic) cardContent();
  }
  const onScroll = () => { gateKick(); if (!ticking && !destroyed) { ticking = true; rafU = requestAnimationFrame(update); } };
  const onResize = () => { ann.reset(); onScroll(); layout(); };

  // Viditelnost: posluchač scrollu běží jen když je sekce na obrazovce, kreslí jen jedna scéna na stránce (gate).
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

  // Líné spuštění WebGL kousek před sekcí, uvolnění daleko za ní.
  let life = null;
  if (!isStatic) {
    o.onProject = pr => { proj = pr; layout(); };
    life = lifecycle(scrolly, {
      near: o.lazyMargin, far: o.farMargin || '250%',
      create: () => createViewer(glBox, o, D, PARTS),
      ready: v => {
        viewer = gate.viewer = v;
        v.label(`3D model: ${what}. Kapitola ${active + 1}: ${CH[active].title}.`);
        v.target(p, true);
        (part || auto) && v.part(part || auto);
        stage.classList.add('pv-stage--3d');
        gateKick();
      },
      drop: () => { viewer = gate.viewer = null; proj = null; stage.classList.remove('pv-stage--3d'); layout(); },
      fail: err => { console.warn('[podvozek] 3D se nepodařilo spustit, zůstává statická kresba.', err); root.classList.add('pv--static'); },
    });
  }

  // Tečky kapitol: posunou stránku na danou kapitolu (model se srovná sám).
  function goTo(i) {
    i = clamp(i, 0, N - 1);
    if (isStatic) { chapters[i].scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
    scrollToProgress(scrolly, pin, i / (N - 1), !reduced);
    if (!visible) { cancelAnimationFrame(rafU); rafU = requestAnimationFrame(update); }
  }
  const onDot = e => { const b = e.target.closest('.pv-dot'); if (b) goTo(+b.dataset.i); };
  const onDotKey = e => {
    const b = e.target.closest('.pv-dot'); if (!b) return;
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!k) return;
    e.preventDefault();
    const n = clamp(+b.dataset.i + k, 0, N - 1); dots[n].focus(); goTo(n);
  };
  const onPart = e => { const b = e.target.closest('.pv-hs'); if (b) setPart(part === b.dataset.part ? null : b.dataset.part); };
  const onFocus = e => { const b = e.target.closest('.pv-hs'); if (b && b.matches(':focus-visible')) setPart(b.dataset.part); };
  const onKey = e => { if (e.key === 'Escape' && part) setPart(null); };
  // Statická verze: najetí na kapitolu přepne kresbu.
  const onOver = e => { if (!isStatic) return; const c = e.target.closest('.pv-ch'); if (c) setActive(+c.dataset.i); };
  root.addEventListener('click', onDot); root.addEventListener('keydown', onDotKey);
  root.addEventListener('click', onPart); root.addEventListener('focusin', onFocus); root.addEventListener('keydown', onKey);
  root.addEventListener('pointerover', onOver);

  setActive(isStatic ? 1 : 0);
  rafU = requestAnimationFrame(update);
  // Ladění (testy rozvržení): root.__dz.go(p) nastaví kapitolu p synchronně, bez scrollu a bez čekání na snímek.
  root.__dz = { go(q) { p = q; setActive(clamp(Math.round(q), 0, N - 1)); glBox.__pv && glBox.__pv.show(q); if (ann.cardMode() && !isStatic) cardContent(); layout(); return active; } };

  return {
    goTo,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(rafU); rafU = 0; card.clear(); extras.destroy();
      ioVis.disconnect(); gateDrop(gate); life && life.destroy();
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      root.removeEventListener('click', onDot); root.removeEventListener('keydown', onDotKey);
      root.removeEventListener('click', onPart); root.removeEventListener('focusin', onFocus); root.removeEventListener('keydown', onKey);
      root.removeEventListener('pointerover', onOver);
      delete root.__dz;
      root.innerHTML = ''; root.classList.remove('pv', 'pv--static', 'pv--reduced', 'pv--compact');
    },
  };
}

/* ------------------------------------------------------------------ 3D */

async function createViewer(box, o, D, PARTS) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');

  const small = innerWidth < 720;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'pv-canvas';
  canvas.setAttribute('role', 'img');
  box.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  // Měkké ateliérové světlo: rozptýlené z oblohy, jedno klíčové se stínem, slabé protisvětlo.
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a8172, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.0);
  key.position.set(5, 11, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe7ff, 0.6); rim.position.set(-8, 6, -6); scene.add(rim);

  const groundMat = new THREE.ShadowMaterial({ opacity: 0.2 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // Kontaktní stín: měkká tmavá skvrna přímo pod přívěsem (ukotví model k zemi i tam, kam stín ze světla nedosáhne).
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex(THREE), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000, opacity: 0.32 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(D.L + 1.2, 3.3), contactMat);
  contact.rotation.x = -Math.PI / 2; contact.position.set(0.15, 0.003, 0); contact.renderOrder = -1; scene.add(contact);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // Model: GLB se stejnými jmény uzlů, jinak procedurální.
  let model = null;
  if (o.glb) {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js');   // GLB z Blenderu je komprimovaný Dracem (jako v dum3d.js)
      const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(o.glb);
      draco.dispose();
      // glTF extras jsou pole a díl (part) nese uzel nad sítí: převést na Vector3 a díl předat dolů na sítě.
      gltf.scene.traverse(c => {
        for (const k of ['pvExplode', 'pvStow']) if (Array.isArray(c.userData[k])) c.userData[k] = new THREE.Vector3(...c.userData[k]);
        if (!c.userData.part && c.parent && c.parent.userData.part) c.userData.part = c.parent.userData.part;
      });
      if (LAYERS.every(n => gltf.scene.getObjectByName(n))) model = gltf.scene;
      else console.warn('[podvozek] GLB nemá uzly', LAYERS.join(', '), '– použije se procedurální model.');
    } catch (e) { console.warn('[podvozek] GLB se nenačetl, použije se procedurální model.', e); }
  }
  if (!model) model = D.sauna ? buildSaunaPv(THREE, D) : buildProcedural(THREE, D);
  scene.add(model);
  const layers = LAYERS.map(n => model.getObjectByName(n));

  // Rozklad: každý přímý potomek vrstvy má userData.pvExplode (m při explode=1). GLB bez něj dopočítáme z obálky.
  const LIFT = [0, 1.0, 1.7];
  layers.forEach((L, li) => {
    L.userData.pvBase = L.position.clone();
    L.children.forEach(c => {
      c.userData.pvBase = c.position.clone();
      if (!c.userData.pvExplode) {
        if (li !== 2) { c.userData.pvExplode = new THREE.Vector3(); return; }
        const b = new THREE.Box3().setFromObject(c), ctr = b.getCenter(new THREE.Vector3());
        c.userData.pvExplode = ctr.y > 3.2 ? new THREE.Vector3(0, 0.9, 0)
          : Math.abs(ctr.x) / D.H > Math.abs(ctr.z) / 1.25 ? new THREE.Vector3(Math.sign(ctr.x) * 0.9, 0, 0) : new THREE.Vector3(0, 0, Math.sign(ctr.z) * 0.9);
      }
    });
  });
  const stowables = []; model.traverse(c => { if (c.userData.pvStow) { c.userData.pvStowBase = c.position.clone(); stowables.push(c); } });

  // Materiály: kopie pro každou vrstvu a díl, aby šly zprůhlednit a zvýraznit nezávisle.
  const mats = [[], [], []];
  const AMBER = new THREE.Color(0xe8b04b);
  layers.forEach((L, li) => {
    const cache = new Map();
    L.traverse(m => {
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const pid = m.userData.part || '';
      const k = m.material.uuid + '|' + pid;
      if (!cache.has(k)) {
        const c = m.material.clone();
        c.userData = { op: m.material.opacity ?? 1, tr: !!m.material.transparent, em: c.emissive ? c.emissive.clone() : null, part: pid, noShadow: !!m.material.userData.noShadow };
        cache.set(k, c); mats[li].push(c);
      }
      m.material = cache.get(k);
    });
  });

  // Kóty (kapitola 5): tenké čáry s šikmými značkami jako na výkresu.
  const H = D.H, T = dimText(D);
  const dimGroup = new THREE.Group(); scene.add(dimGroup);
  const dimMat = new THREE.LineBasicMaterial({ color: 0x1e211d, transparent: true, opacity: 0 });
  const seg = [];
  const V = (x, y, z) => seg.push(x, y, z);
  const line = (a, b) => { V(...a); V(...b); };
  const tick = (p, d) => { const s = 0.09; line([p[0] - s * d[0], p[1] - s * d[1], p[2] - s * d[2]], [p[0] + s * d[0], p[1] + s * d[1], p[2] + s * d[2]]); };
  const g0 = 0.005, zL = 1.85, zT = 2.45, xW = -H - 0.75;
  // délka domu a celková délka s ojí podél pravého boku (+Z, strana kamery)
  line([-H, g0, 1.33], [-H, g0, zT + 0.12]); line([H, g0, 1.33], [H, g0, zL + 0.12]); line([D.hitch, g0, 0.1], [D.hitch, g0, zT + 0.12]);
  line([-H, g0, zL], [H, g0, zL]); tick([-H, g0, zL], [0.7, 0, 0.7]); tick([H, g0, zL], [0.7, 0, 0.7]);
  line([-H, g0, zT], [D.hitch, g0, zT]); tick([-H, g0, zT], [0.7, 0, 0.7]); tick([D.hitch, g0, zT], [0.7, 0, 0.7]);
  // šířka přes střechu u zádi (2,55 m)
  const rw = D.RW / 2;
  line([-H - 0.15, g0, rw], [xW - 0.12, g0, rw]); line([-H - 0.15, g0, -rw], [xW - 0.12, g0, -rw]);
  line([xW, g0, -rw], [xW, g0, rw]); tick([xW, g0, rw], [0.7, 0, 0.7]); tick([xW, g0, -rw], [0.7, 0, 0.7]);
  // výška u zádi
  line([-H - 0.2, D.ridge, 0], [xW - 0.12, D.ridge, 0]); line([-H - 0.05, g0, 0], [xW - 0.12, g0, 0]);
  line([xW, 0, 0], [xW, D.ridge, 0]); tick([xW, D.ridge, 0], [0.7, 0.7, 0]); tick([xW, 0, 0], [0.7, 0.7, 0]);
  const dimGeo = new THREE.BufferGeometry(); dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
  dimGroup.add(new THREE.LineSegments(dimGeo, dimMat));
  const dimLabels = [
    { t: `${D.sauna ? 'délka' : 'délka domu'} ${T.length}`, at: new THREE.Vector3(-H * 0.45, g0, zL) },
    { t: `celkem s ojí ${T.total}`, at: new THREE.Vector3(H * 0.62, g0, zT) },
    { t: `šířka ${T.width}`, at: new THREE.Vector3(xW, g0, -0.55) },
    { t: `${D.sauna ? 'výška s komínem' : 'výška'} ${T.height}`, at: new THREE.Vector3(xW, 2.0, 0) },
    { t: `celkem ${T.weight}`, at: new THREE.Vector3(0.6, D.ridge + 0.55, 0), cls: 'pv-dl--tag' },
  ];
  const stageEl = box.closest('.pv-stage');
  const labelBox = stageEl.querySelector('.pv-dimlabels');
  labelBox.innerHTML = dimLabels.map(d => `<span class="pv-dl ${d.cls || ''}">${d.t}</span>`).join('');
  const labelEls = [...labelBox.children];
  const calloutEl = stageEl.querySelector('.pv-callout');

  // Kotvy hotspotů.
  const hsEls = [...stageEl.querySelectorAll('.pv-hs')];
  // GLB může kotvu přepsat prázdným uzlem hs_<díl> přímo ve vrstvě (např. opěrné kolečko je v modelu jinde než ve výchozí poloze).
  const anchors = PARTS.map(pd => { const a = new THREE.Object3D(), hn = model.getObjectByName('hs_' + pd.id); hn ? a.position.copy(hn.position) : a.position.set(...pd.at); model.getObjectByName(pd.layer).add(a); return a; });

  // Barvy z tokenů (světlý/tmavý motiv).
  let dark = false;
  function readTheme() {
    const cs = getComputedStyle(stageEl);
    const ink = cs.getPropertyValue('--ink').trim() || '#1E211D';
    dimMat.color.set(ink);
    dark = new THREE.Color(cs.getPropertyValue('--surface').trim() || '#F7F3EC').getHSL({}).l < 0.4;
    groundMat.opacity = dark ? 0.42 : 0.2;
    contactMat.opacity = dark ? 0.55 : 0.32;
    renderer.toneMappingExposure = dark ? 0.92 : 1.0;
    dirty = true;
  }
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  const mo = new MutationObserver(readTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  mqDark.addEventListener('change', readTheme);

  // Stav: cur se tlumeně blíží tgt (klidný, plynulý pohyb i při trhaném scrollu).
  let tgt = stateAt(0), cur = tgt.slice(), dirty = true, activePart = null, raf = 0, last = 0, running = false, held = false;
  readTheme();

  const sDist = D.total / 8.7, sX = D.L / 7.2;
  const tmp = new THREE.Vector3();
  function applyState() {
    const [ex, , , , , , , dims, stow, az, el, dist, tx0, ty, tz] = cur;
    const tx = tx0 * sX;
    layers.forEach((L, li) => {
      L.position.y = L.userData.pvBase.y + LIFT[li] * ex;
      L.children.forEach(c => { const u = c.userData; if (u.pvBase && u.pvExplode) c.position.copy(u.pvBase).addScaledVector(u.pvExplode, ex); });
      const op = cur[1 + li], glow = cur[4 + li];
      L.visible = op > 0.01;
      L.traverse(m => { if (m.isMesh) m.castShadow = op > 0.5 && !m.material.userData.noShadow; });
      for (const m of mats[li]) {
        const a = m.userData.op * op, tr = a < 0.999 || m.userData.tr;
        if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; }
        m.opacity = a; m.depthWrite = a > 0.5;
        if (m.emissive) {
          const g = glow + (m.userData.part && m.userData.part === activePart ? 0.32 : 0);
          m.emissive.copy(m.userData.em).lerp(AMBER, Math.min(1, g)); m.emissiveIntensity = g > 0 ? 0.55 : 1;
        }
      }
    });
    for (const s of stowables) s.position.copy(s.userData.pvStowBase).addScaledVector(s.userData.pvStow, stow);
    dimMat.opacity = dims * 0.85; dimGroup.visible = dims > 0.01;

    const w = box.clientWidth || 1, h = box.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const fit = Math.pow(Math.max(1, 1.45 / aspect), 0.9);
    const d = dist * fit * sDist;
    camera.position.set(tx + d * Math.cos(el) * Math.sin(az), ty + d * Math.sin(el), tz + d * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, ty, tz);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    model.updateMatrixWorld(true);

    // Hotspoty a popisky kót v HTML nad plátnem.
    const pts = [], proj = [];
    hsEls.forEach((b, k) => {
      const pd = PARTS[k];
      const vis = Math.max(0, 1 - Math.abs(curP - pd.ch) * 2.6);
      anchors[k].getWorldPosition(tmp).project(camera);
      const x = (tmp.x + 1) / 2 * w, y = (1 - tmp.y) / 2 * h;
      proj.push([x, y, vis]);
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      b.style.opacity = vis.toFixed(3);
      b.style.visibility = vis > 0.02 ? 'visible' : 'hidden';
      if (vis > 0.3) pts.push([x, y]);
    });
    // Popis dílu nesmí zakrýt číslo dílu: když by dole překážel, přesune se nahoru.
    if (calloutEl && calloutEl.classList.contains('is-on')) {
      const cw = calloutEl.offsetWidth, ch = calloutEl.offsetHeight, cl = calloutEl.offsetLeft, m = w >= 600 ? 20 : 12;
      const top = h - m - ch, hit = pts.some(([x, y]) => x > cl - 18 && x < cl + cw + 18 && y > top - 18 && y < top + ch + 18);
      calloutEl.classList.toggle('pv-callout--top', hit);
    }
    dimLabels.forEach((dl, k) => {
      tmp.copy(dl.at).project(camera);
      const e = labelEls[k];
      e.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
      e.style.opacity = dims.toFixed(3);
    });
    o.onProject && o.onProject(proj);   // popisky na odkazových čarách (mountPodvozek)
  }

  let curP = 0, tgtP = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    if (box.__pv && box.__pv.hold) return;
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016); last = t;
    const k = 1 - Math.exp(-dt * 5.5);
    let moving = false;
    for (let i = 0; i < cur.length; i++) {
      const dv = tgt[i] - cur[i];
      if (Math.abs(dv) > 1e-4) { cur[i] += dv * k; moving = true; } else cur[i] = tgt[i];
    }
    if (Math.abs(tgtP - curP) > 1e-4) { curP += (tgtP - curP) * k; moving = true; } else curP = tgtP;
    if (moving || dirty) { applyState(); renderer.render(scene, camera); dirty = false; }
  }

  const ro = new ResizeObserver(() => {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    dirty = true;
    if (!running && !held) { applyState(); renderer.render(scene, camera); }
  });
  ro.observe(box);

  // Ladění (náhled, testy): box.__pv.show(p) vykreslí stav kapitoly p bez scrollu, info() vrátí počty z renderer.info.
  box.__pv = {
    renderer, scene, camera,
    hold: false,
    look(pos, at) { this.hold = true; camera.position.set(...pos); camera.lookAt(...at); renderer.render(scene, camera); return this.info(); },
    show(p) { tgt = stateAt(p); tgtP = p; cur = tgt.slice(); curP = p; applyState(); renderer.render(scene, camera); return this.info(); },
    info() { const r = renderer.info.render; return { calls: r.calls, triangles: r.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
  };

  return {
    target(p, instant) {
      tgt = stateAt(p); tgtP = p;
      if (instant) { cur = tgt.slice(); curP = p; }
      dirty = true;
      if (!running && !held) { applyState(); renderer.render(scene, camera); }
    },
    part(pid) { activePart = pid; dirty = true; if (!running && !held) { applyState(); renderer.render(scene, camera); } },
    label(t) { canvas.setAttribute('aria-label', t); },
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    gate(on) { held = !on; on ? this.start() : this.stop(); },
    dispose() {
      this.stop(); ro.disconnect(); mo.disconnect(); mqDark.removeEventListener('change', readTheme);
      delete box.__pv;
      scene.traverse(m => { if (m.geometry) m.geometry.dispose(); const ms = m.material ? [].concat(m.material) : []; ms.forEach(x => { for (const k in x) if (x[k] && x[k].isTexture) x[k].dispose(); x.dispose(); }); });
      pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}

/* ---------------------------------------------- procedurální model */
// Přívěs Vlemmix plateau + kostra z C profilů + dřevěný plášť, rozměry podle D (dimsOf). Nahradí ho GLB se stejnými uzly.
// Opakované díly kostry jsou InstancedMesh, ostatní se slučují do jedné geometrie na skupinu × materiál × díl (málo draw callů).
function buildProcedural(THREE, D) {
  const V3 = THREE.Vector3, M4 = THREE.Matrix4;
  const v = a => (a.isVector3 ? a.clone() : new V3(...a));
  const UP = new V3(0, 1, 0);
  const root = new THREE.Group(); root.name = 'podvozek_proc';
  const L = LAYERS.map(n => { const g = new THREE.Group(); g.name = n; root.add(g); return g; });
  const [TR, SK, SH] = L;
  const H = D.H, F = D.ffl;

  /* --- povrchy --- */
  const zn = zincTex(THREE);
  const zinc = new THREE.MeshStandardMaterial({ color: 0xe2e3df, metalness: 0.4, roughness: 0.6, map: zn.map, roughnessMap: zn.rough });
  const steel = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.4, map: zn.fine });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xd2d4cf, metalness: 0.65, roughness: 0.32, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2c302b, metalness: 0.35, roughness: 0.55 });
  const drum = new THREE.MeshStandardMaterial({ color: 0x4a4d48, metalness: 0.5, roughness: 0.6 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1c1e1b, metalness: 0, roughness: 0.85 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x1d1f1c, metalness: 0, roughness: 0.9, bumpMap: treadTex(THREE), bumpScale: 3, side: THREE.DoubleSide });
  const red = new THREE.MeshStandardMaterial({ color: 0xb23a28, roughness: 0.3, emissive: 0x4a0d06 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xe0901e, roughness: 0.3, emissive: 0x3a2202 });
  const lens = new THREE.MeshStandardMaterial({ color: 0xe8ebe6, roughness: 0.2 });
  const plate = new THREE.MeshStandardMaterial({ color: 0xf2f1ea, roughness: 0.5 });
  const wt = woodTex(THREE);
  const wood = new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: 2.2, roughness: 0.8, metalness: 0 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd9bfa3, map: wt.map, roughness: 0.78 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x30342f, metalness: 0.3, roughness: 0.5 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3f3a, metalness: 0.5, roughness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x24302b, metalness: 0.15, roughness: 0.04, envMapIntensity: 1.8, transparent: true, opacity: 0.8 });
  glass.userData.noShadow = true;
  const insul = new THREE.MeshStandardMaterial({ color: 0xd8cfae, metalness: 0.55, roughness: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  insul.userData.noShadow = true;

  /* --- stavebnice geometrie --- */
  const buckets = new Map();
  const add = (parent, mat, geo, part = '') => {
    const k = parent.uuid + '|' + mat.uuid + '|' + part;
    if (!buckets.has(k)) buckets.set(k, { parent, mat, part, geos: [] });
    buckets.get(k).geos.push(geo.index ? geo.toNonIndexed() : geo);
    if (geo.index) geo.dispose();
  };
  const flush = () => {
    for (const b of buckets.values()) {
      let n = 0; for (const g of b.geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let at = 0;
      for (const g of b.geos) {
        pos.set(g.attributes.position.array, at * 3); nor.set(g.attributes.normal.array, at * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2);
        at += g.attributes.position.count; g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, b.mat); if (b.part) m.userData.part = b.part;
      b.parent.add(m);
    }
  };
  // UV kvádru v metrech (textury zinku a dřeva mají stejné měřítko na všech dílech).
  const boxGeo = (w, h, d) => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0], uv.getY(k) * sc[f][1]); }
    return g;
  };
  const box = (w, h, d, x, y, z) => boxGeo(w, h, d).translate(x, y, z);
  // Báze z bodů A→B: lokální z podél členu, lokální x podle xHint (např. směr hloubky profilu).
  const basis = (A, B, xHint) => {
    const z = B.clone().sub(A), len = z.length(); z.divideScalar(len);
    const x = (xHint ? v(xHint) : UP.clone()); x.addScaledVector(z, -x.dot(z));
    if (x.lengthSq() < 1e-6) { x.set(1, 0, 0).addScaledVector(z, -z.x); if (x.lengthSq() < 1e-6) x.set(0, 0, 1); }
    x.normalize();
    return { x, y: new V3().crossVectors(z, x), z, len };
  };
  const place = (geo, A, B, xHint) => { const b = basis(A, B, xHint); geo.applyMatrix4(new M4().makeBasis(b.x, b.y, b.z).setPosition(A.clone().add(B).multiplyScalar(0.5))); return geo; };
  const beam = (a, b, w, h, xHint) => { const A = v(a), B = v(b); return place(boxGeo(w, h, A.distanceTo(B)), A, B, xHint); };
  const rod = (a, b, r, s = 12) => { const A = v(a), B = v(b); return place(new THREE.CylinderGeometry(r, r, A.distanceTo(B), s).rotateX(Math.PI / 2), A, B); };
  const cGeo = (d, b, lip, t, len) => new THREE.ExtrudeGeometry(cShape(THREE, d, b, lip, t), { depth: len, bevelEnabled: false }).translate(0, 0, -len / 2);
  const chan = (a, b, d, bw, lip, t, xHint) => { const A = v(a), B = v(b); return place(cGeo(d, bw, lip, t, A.distanceTo(B)), A, B, xHint); };
  const grp = (parent, name, ex) => { const g = new THREE.Group(); g.name = name; if (ex) g.userData.pvExplode = new V3(...ex); parent.add(g); return g; };
  const lathe = (pts, segs) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);

  /* ================================================================ L_prives: přívěs Vlemmix plateau */
  const ram = grp(TR, 'ram');
  const zB = 0.72;                                  // osy podélníků (params: y 500 / 1935)
  // podélníky C 150×65, otevřené dovnitř
  for (const s of [1, -1]) add(ram, zinc, chan([-H + 0.02, 0.465, s * zB], [H, 0.465, s * zB], 0.15, 0.065, 0, 0.006, [0, -s, 0]), 'ram');
  // příčníky C 80×40 à 600, obvodový úhelník L 40×40, výložníky (trojúhelníkové plechy) nesoucí okraj plošiny
  const cross = []; for (let x = -H + 0.3; x < H - 0.1; x += 0.6) cross.push(x);
  for (const x of [...cross, -H + 0.04, H - 0.04]) add(ram, zinc, chan([x, 0.58, -1.2], [x, 0.58, 1.2], 0.08, 0.04, 0, 0.004, [0, 1, 0]), 'ram');
  for (const s of [1, -1]) {
    add(ram, zinc, box(D.L, 0.04, 0.004, 0, 0.6, s * 1.218), 'ram');
    add(ram, zinc, box(D.L, 0.004, 0.04, 0, 0.618, s * 1.2), 'ram');
  }
  for (const s of [1, -1]) { add(ram, zinc, box(0.004, 0.04, 2.44, s * H, 0.6, 0), 'ram'); add(ram, zinc, box(0.04, 0.004, 2.44, s * (H - 0.02), 0.618, 0), 'ram'); }
  const gusset = s => new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(s * 0.45, 0), new THREE.Vector2(0, -0.12)]), { depth: 0.006, bevelEnabled: false }).rotateY(-Math.PI / 2);
  for (const x of cross) {
    if (Math.abs(x - D.axleX) < 0.78) continue;     // nad koly výložníky nejsou
    for (const s of [1, -1]) add(ram, zinc, gusset(s).translate(x + 0.003, 0.54, s * (zB + 0.0325)), 'ram');
  }
  // zadní světelná rampa: nosník, sdružené svítilny, držák SPZ, odrazky; boční oranžové odrazky
  add(ram, zinc, box(0.03, 0.05, 2.3, -H - 0.03, 0.5, 0));
  for (const s of [1, -1]) {
    add(ram, zinc, box(0.06, 0.03, 0.03, -H, 0.535, s * 0.75));
    add(ram, dark, box(0.05, 0.1, 0.24, -H - 0.065, 0.5, s * 0.96));
    add(ram, red, box(0.012, 0.075, 0.09, -H - 0.094, 0.5, s * 0.9));
    add(ram, amber, box(0.012, 0.075, 0.06, -H - 0.094, 0.5, s * 0.995));
    add(ram, lens, box(0.012, 0.075, 0.045, -H - 0.094, 0.5, s * 1.05));
    add(ram, red, new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0, 0.12)]), { depth: 0.008, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(-H - 0.05, 0.43, s * 0.62));
    for (const x of [-H + 0.35, D.axleX + 1.3, H - 0.35]) add(ram, amber, box(0.07, 0.03, 0.012, x, 0.56, s * 1.226));
    add(ram, lens, box(0.012, 0.06, 0.06, H + 0.005, 0.56, s * 1.0));
  }
  add(ram, zinc, box(0.02, 0.15, 0.56, -H - 0.055, 0.42, 0.25));
  add(ram, plate, box(0.008, 0.11, 0.52, -H - 0.07, 0.42, 0.25));
  add(ram, dark, box(0.006, 0.12, 0.53, -H - 0.067, 0.42, 0.25));

  // tandem s torzními nápravami Knott: čtyřhranná trubka, kliky, bubnové brzdy, kola 195/50 R13
  const nap = grp(TR, 'napravy');
  const tread = [[0.166, 0.086], [0.19, 0.095], [0.215, 0.0985], [0.24, 0.095], [0.254, 0.087], [0.261, 0.074], [0.2625, 0.055], [0.2625, 0.036], [0.257, 0.034], [0.257, 0.016], [0.2625, 0.014], [0.2625, -0.014], [0.257, -0.016], [0.257, -0.034], [0.2625, -0.036], [0.2625, -0.055], [0.261, -0.074], [0.254, -0.087], [0.24, -0.095], [0.215, -0.0985], [0.19, -0.095], [0.166, -0.086]];
  const rimP = [[0.001, 0.05], [0.032, 0.05], [0.036, 0.042], [0.075, 0.04], [0.09, 0.03], [0.128, 0.026], [0.142, 0.04], [0.156, 0.07], [0.172, 0.08], [0.175, 0.09], [0.165, 0.09], [0.158, 0.06], [0.158, -0.06], [0.165, -0.09], [0.175, -0.09], [0.172, -0.08], [0.16, -0.075]];
  for (const ax of [D.axleX - 0.4, D.axleX + 0.4]) {
    const tx = ax + 0.15, ty = 0.335;
    add(nap, zinc, box(0.09, 0.09, 1.72, tx, ty, 0), 'napravy');
    for (const s of [1, -1]) {
      add(nap, zinc, box(0.16, 0.012, 0.12, tx, 0.384, s * zB), 'napravy');
      add(nap, zinc, box(0.012, 0.06, 0.1, tx - 0.07, 0.355, s * zB), 'napravy');
      add(nap, zinc, box(0.012, 0.06, 0.1, tx + 0.07, 0.355, s * zB), 'napravy');
      add(nap, zinc, beam([tx, ty, s * 0.86], [ax, 0.2625, s * 0.86], 0.05, 0.065, [0, 0, 1]), 'napravy');
      add(nap, zinc, rod([ax, 0.2625, s * 0.83], [ax, 0.2625, s * 0.9], 0.032, 14), 'napravy');
      add(nap, drum, rod([ax, 0.2625, s * 0.885], [ax, 0.2625, s * 0.9], 0.118, 28), 'napravy');
      add(nap, drum, rod([ax, 0.2625, s * 0.9], [ax, 0.2625, s * 0.97], 0.102, 28), 'napravy');
      const turn = g => g.rotateX(s * Math.PI / 2).translate(ax, 0.2625, s * 1.0);
      add(nap, tyre, turn(lathe(tread, 40)), 'napravy');
      add(nap, rimMat, turn(lathe(rimP, 32)), 'napravy');
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4, b = k * Math.PI / 2;
        add(nap, rubber, rod([ax + Math.cos(a) * 0.1, 0.2625 + Math.sin(a) * 0.1, s * 1.031], [ax + Math.cos(a) * 0.1, 0.2625 + Math.sin(a) * 0.1, s * 1.036], 0.022, 14), 'napravy');
        add(nap, steel, rod([ax + Math.cos(b) * 0.05, 0.2625 + Math.sin(b) * 0.05, s * 1.045], [ax + Math.cos(b) * 0.05, 0.2625 + Math.sin(b) * 0.05, s * 1.065], 0.011, 6), 'napravy');
      }
      add(nap, steel, rod([ax, 0.2625, s * 1.045], [ax, 0.2625, s * 1.075], 0.026, 16), 'napravy');
    }
  }
  // táhlo brzdy od nájezdového zařízení k přední nápravě
  add(nap, steel, rod([H + 1.12, 0.45, 0], [D.axleX + 0.55, 0.36, 0], 0.008, 6), 'napravy');

  // A-oj ze dvou jäklů 100×60, nájezdová brzda Knott, kulová spojka, ruční brzda, odtrhové lanko, kabel 13 pin
  const oj = grp(TR, 'oj');
  const ojZ = x => 0.05 + (0.62 - 0.05) * (H + 1.15 - x) / 1.75;
  for (const s of [1, -1]) add(oj, zinc, beam([H - 0.6, 0.47, s * 0.62], [H + 1.15, 0.47, s * 0.05], 0.06, 0.1, [0, 0, 1]), 'oj');
  add(oj, zinc, beam([H + 0.25, 0.47, ojZ(H + 0.25)], [H + 0.25, 0.47, -ojZ(H + 0.25)], 0.05, 0.08, [1, 0, 0]), 'oj');
  for (const s of [1, -1]) add(oj, zinc, box(0.2, 0.012, 0.12, H + 0.05, 0.525, s * ojZ(H + 0.05)), 'oj');
  const hx = H + 1.15;
  add(oj, zinc, box(0.06, 0.14, 0.18, hx - 0.03, 0.47, 0), 'oj');                         // čelní deska oje
  add(oj, zinc, box(0.3, 0.12, 0.13, hx + 0.15, 0.48, 0), 'oj');                          // skříň nájezdové brzdy
  add(oj, zinc, beam([hx + 0.02, 0.545, 0], [hx + 0.27, 0.565, 0], 0.11, 0.04, [0, 0, 1]), 'oj');
  add(oj, rubber, lathe([[0.03, 0], [0.045, 0.012], [0.032, 0.024], [0.047, 0.036], [0.033, 0.048], [0.048, 0.06], [0.034, 0.072], [0.045, 0.084], [0.03, 0.096]], 18).rotateZ(-Math.PI / 2).translate(hx + 0.3, 0.465, 0), 'oj');
  add(oj, steel, rod([hx + 0.38, 0.465, 0], [D.hitch - 0.05, 0.465, 0], 0.026, 16), 'oj');
  add(oj, dark, box(0.13, 0.065, 0.085, D.hitch - 0.02, 0.47, 0), 'oj');                 // spojovací hlava
  add(oj, dark, new THREE.SphereGeometry(0.058, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(D.hitch + 0.02, 0.47, 0), 'oj');
  add(oj, dark, beam([D.hitch - 0.06, 0.51, 0], [D.hitch + 0.06, 0.54, 0], 0.04, 0.02, [0, 0, 1]), 'oj');
  add(oj, red, beam([D.hitch + 0.05, 0.545, 0], [D.hitch + 0.09, 0.55, 0], 0.035, 0.022, [0, 0, 1]), 'oj');
  // ruční brzda
  add(oj, dark, rod([hx + 0.1, 0.52, 0.075], [hx + 0.1, 0.52, 0.1], 0.025, 14), 'oj');
  add(oj, dark, beam([hx + 0.1, 0.53, 0.092], [hx - 0.16, 0.8, 0.092], 0.025, 0.035, [0, 0, 1]), 'oj');
  add(oj, rubber, rod([hx - 0.14, 0.78, 0.092], [hx - 0.2, 0.84, 0.092], 0.02, 12), 'oj');
  // odtrhové lanko (červené) a kabel 13 pin se zástrčkou
  const tube = (pts, r, mat) => add(oj, mat, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(...p))), 24, r, 6), 'oj');
  tube([[hx + 0.1, 0.5, 0.1], [hx + 0.22, 0.4, 0.11], [D.hitch - 0.04, 0.42, 0.08], [D.hitch - 0.01, 0.46, 0.05]], 0.004, red);
  tube([[H - 0.1, 0.5, -0.35], [H + 0.5, 0.53, -ojZ(H + 0.5) - 0.02], [hx - 0.05, 0.55, -0.11], [hx + 0.25, 0.4, -0.13], [D.hitch - 0.06, 0.35, -0.12]], 0.007, rubber);
  add(oj, rubber, rod([D.hitch - 0.06, 0.35, -0.12], [D.hitch - 0.06, 0.27, -0.12], 0.024, 14), 'oj');
  add(oj, dark, box(0.05, 0.04, 0.012, hx + 0.2, 0.41, -0.072), 'oj');

  // opěrné kolečko na objímce: pevná trubka s klikou, výsuvná část s kolečkem (za jízdy nahoru)
  const jk = grp(TR, 'kolecko'), jx = H + 0.95, jz = ojZ(jx) + 0.09;
  add(jk, zinc, box(0.09, 0.12, 0.1, jx, 0.47, jz - 0.03), 'kolecko');
  add(jk, zinc, rod([jx, 0.34, jz], [jx, 0.78, jz], 0.03, 14), 'kolecko');
  add(jk, dark, rod([jx, 0.78, jz], [jx, 0.82, jz], 0.035, 14), 'kolecko');
  add(jk, dark, beam([jx, 0.83, jz], [jx + 0.12, 0.83, jz], 0.015, 0.015, [0, 1, 0]), 'kolecko');
  add(jk, rubber, rod([jx + 0.12, 0.83, jz], [jx + 0.12, 0.89, jz], 0.012, 8), 'kolecko');
  const jkMove = grp(jk, 'kolecko_vysuv'); jkMove.userData.pvStow = new V3(0, 0.3, 0);
  add(jkMove, steel, rod([jx, 0.16, jz], [jx, 0.42, jz], 0.023, 12), 'kolecko');
  for (const s of [1, -1]) add(jkMove, zinc, box(0.05, 0.1, 0.006, jx, 0.14, jz + s * 0.04), 'kolecko');
  add(jkMove, rubber, rod([jx, 0.1, jz - 0.03], [jx, 0.1, jz + 0.03], 0.1, 24), 'kolecko');
  add(jkMove, rimMat, rod([jx, 0.1, jz - 0.032], [jx, 0.1, jz + 0.032], 0.055, 16), 'kolecko');

  // čtyři kličkové opěrné nohy v rozích (pod podélníky), výsuvná část s patkou
  const nohy = grp(TR, 'nohy');
  const legMove = grp(nohy, 'noha_vysuv'); legMove.userData.pvStow = new V3(0, 0.3, 0);
  for (const x of [-H + 0.3, H - 0.3]) for (const s of [1, -1]) {
    const z = s * zB;
    add(nohy, zinc, box(0.14, 0.012, 0.12, x, 0.384, z), 'nohy');
    add(nohy, zinc, box(0.07, 0.25, 0.07, x, 0.255, z), 'nohy');
    add(nohy, zinc, box(0.09, 0.07, 0.09, x, 0.33, z), 'nohy');
    add(nohy, zinc, rod([x, 0.34, z + s * 0.045], [x, 0.34, z + s * 0.2], 0.009, 8), 'nohy');
    add(nohy, zinc, beam([x, 0.34, z + s * 0.2], [x, 0.25, z + s * 0.2], 0.015, 0.012, [0, 0, 1]), 'nohy');
    add(legMove, zinc, box(0.052, 0.3, 0.052, x, 0.165, z), 'nohy');
    add(legMove, zinc, box(0.15, 0.012, 0.15, x, 0.006, z), 'nohy');
    add(legMove, zinc, box(0.02, 0.05, 0.02, x, 0.035, z), 'nohy');
  }

  /* ================================================================ L_skelet: kostra z C profilů (pozink) */
  const C89 = { d: 0.089, b: 0.041, lip: 0.012, t: 0.0028 }, C120 = { d: 0.12, b: 0.041, lip: 0.012, t: 0.0028 };
  const lists = new Map();   // klíč profil|díl → matice
  const mem = (prof, part, a, b, depth) => {
    const A = v(a), B = v(b), bs = basis(A, B, depth);
    const k = prof + '|' + part;
    if (!lists.has(k)) lists.set(k, []);
    lists.get(k).push(new M4().makeBasis(bs.x, bs.y, bs.z.clone().multiplyScalar(bs.len)).setPosition(A));
  };
  const strap = (part, a, b, n) => {
    const A = v(a), B = v(b), bs = basis(A, B, n);
    const k = 'strap|' + part;
    if (!lists.has(k)) lists.set(k, []);
    lists.get(k).push(new M4().makeBasis(bs.x.multiplyScalar(0.0025), bs.y.multiplyScalar(0.04), bs.z.clone().multiplyScalar(bs.len)).setPosition(A));
  };
  const zSt = 1.25 - 0.079 - 0.0445, xSt = H - 0.079 - 0.0445, uIn = 1.25 - 0.079 - 0.089;
  const vb = 0.71, wallTop = D.yUnder(1.171);
  const grid = (u0, u1) => { const g = [u0 + 0.0205, u1 - 0.0205]; for (let u = 0; u < u1 - 0.12; u += 0.6) { g.push(u); if (u) g.push(-u); } return g.filter(u => u > u0 + 0.1 || u === u0 + 0.0205).sort((a, b) => a - b); };
  // Stěna: P(u, v) = n·off + a·u, v je absolutní výška. top(u) = horní hrana kostry. holes [ua, ub, vlo, vhi].
  const frameWall = (w) => {
    const P = (u, y, k = 0) => new V3().addScaledVector(w.n, w.off + k).addScaledVector(w.a, u).setY(y);
    const part = w.part || 'sloupky', h2 = 0.0205;
    mem('c89', part, P(w.u0, vb + h2), P(w.u1, vb + h2), w.n);
    if (w.raked) { mem('c89', part, P(w.u0, w.top(w.u0) - h2), P(0, w.top(0) - h2), w.n); mem('c89', part, P(0, w.top(0) - h2), P(w.u1, w.top(w.u1) - h2), w.n); }
    else mem('c89', part, P(w.u0, w.top(0) - h2), P(w.u1, w.top(0) - h2), w.n);
    const holes = w.holes || [];
    for (const u of w.posts || grid(w.u0, w.u1)) {
      const hTop = w.top(u) - 0.041;
      let segs = [[vb + 0.041, hTop]];
      for (const [ua, ub, lo, hi] of holes) {
        if (u < ua - 0.14 || u > ub + 0.14) continue;
        segs = Math.abs(u - ua) < 0.14 || Math.abs(u - ub) < 0.14 ? [] : [[vb + 0.041, lo - 0.041], [hi + 0.082, hTop]];
      }
      for (const [y0, y1] of segs) if (y1 - y0 > 0.06) mem('c89', part, P(u, y0), P(u, y1), w.n);
    }
    for (const [ua, ub, lo, hi] of holes) {
      for (const [uk, uj] of [[ua - 0.0615, ua - 0.0205], [ub + 0.0615, ub + 0.0205]]) {
        mem('c89', part, P(uk, vb + 0.041), P(uk, w.top(uk) - 0.041), w.n);    // průběžný sloupek
        mem('c89', part, P(uj, vb + 0.041), P(uj, hi), w.n);                     // zdvojení pod překladem
      }
      mem('c89', part, P(ua - 0.082, hi + 0.0205), P(ub + 0.082, hi + 0.0205), w.n);   // překlad ze dvou profilů
      mem('c89', part, P(ua - 0.082, hi + 0.0615), P(ub + 0.082, hi + 0.0615), w.n);
      if (lo > vb + 0.15) mem('c89', part, P(ua, lo - 0.0205), P(ub, lo - 0.0205), w.n);   // parapet
    }
    // průběžné ztužení (nogginy) v polovině výšky, přerušené otvory
    const vn = w.nog ?? F + 1.2;
    let spans = [[w.u0 + 0.041, w.u1 - 0.041]];
    for (const [ua, ub, lo, hi] of holes) if (vn > lo - 0.06 && vn < hi + 0.12) spans = spans.flatMap(([a, b]) => [[a, Math.min(b, ua - 0.082)], [Math.max(a, ub + 0.082), b]]);
    for (const [a, b] of spans) if (b - a > 0.2) mem('c89', part, P(a, vn), P(b, vn), w.n);
    // diagonální ocelové pásky v krajních polích bez otvorů
    if (w.straps) for (const [a, b] of [[w.u0 + 0.03, w.u0 + 1.2], [w.u1 - 1.2, w.u1 - 0.03]]) {
      if (holes.some(([ua, ub]) => ub > a && ua < b)) continue;
      const k = 0.0465, t0 = vb + 0.03, t1 = w.top(0) - 0.03;
      strap(part, P(a, t0, k), P(b, t1, k), w.n); strap(part, P(b, t0, k), P(a, t1, k), w.n);
    }
  };
  const mmL = ([x0, x1, lo, hi]) => [x0 / 1000 - H, x1 / 1000 - H, F + lo / 1000, F + hi / 1000];
  // Štíty mají souřadnici u = −Z, proto u = 1,25 − y (levá stěna params y = 0 leží na −Z).
  const mmG = ([y0, y1, lo, hi]) => [1.25 - y1 / 1000, 1.25 - y0 / 1000, F + lo / 1000, F + hi / 1000];
  const flat = () => wallTop;
  const raked = u => D.yUnder(Math.abs(u) + 0.0445) + 0.005;
  frameWall({ n: new V3(0, 0, 1), a: new V3(1, 0, 0), off: zSt, u0: -H + 0.079, u1: H - 0.079, top: flat, holes: D.open.R.map(mmL), straps: true });
  frameWall({ n: new V3(0, 0, -1), a: new V3(1, 0, 0), off: zSt, u0: -H + 0.079, u1: H - 0.079, top: flat, holes: D.open.L.map(mmL), straps: true });
  frameWall({ n: new V3(1, 0, 0), a: new V3(0, 0, -1), off: xSt, u0: -uIn, u1: uIn, top: raked, raked: true, holes: D.open.B.map(mmG) });
  // štít A: prosklená stěna = sloupky v místě příček zasklení, paždík, dveřní otvor
  {
    const g = D.gableA, vT = F + g.transom / 1000, cuts = g.cuts.map(c => 1.25 - c / 1000);
    const n = new V3(-1, 0, 0), a = new V3(0, 0, -1), P = (u, y) => new V3().addScaledVector(n, xSt).addScaledVector(a, u).setY(y);
    mem('c89', 'sloupky', P(-uIn, vb + 0.0205), P(uIn, vb + 0.0205), n);
    mem('c89', 'sloupky', P(-uIn, raked(uIn) - 0.0205), P(0, raked(0) - 0.0205), n); mem('c89', 'sloupky', P(0, raked(0) - 0.0205), P(uIn, raked(uIn) - 0.0205), n);
    for (const u of [-uIn + 0.0205, uIn - 0.0205]) mem('c89', 'sloupky', P(u, vb + 0.041), P(u, raked(u) - 0.041), n);
    const posts = [...cuts]; if (g.door) posts.push(1.25 - g.door[1] / 1000 - 0.02, 1.25 - g.door[0] / 1000 + 0.02);
    for (const u of posts) mem('c89', 'sloupky', P(u, vb + 0.041), P(u, vT - 0.041), n);
    mem('c89', 'sloupky', P(-uIn + 0.041, vT - 0.0205), P(uIn - 0.041, vT - 0.0205), n);
    mem('c89', 'sloupky', P(-uIn + 0.041, vT + 0.0205), P(uIn - 0.041, vT + 0.0205), n);
    mem('c89', 'sloupky', P(0, vT + 0.041), P(0, raked(0) - 0.041), n);
  }
  // podlahový rám: trámky C 89 à 400 napříč, obvodové U, pod ním plech
  const flr = grp(SK, 'podlahovy_ram');
  for (let x = -H + 0.1; x <= H - 0.09; x += 0.4) mem('c89', 'podlaha', [x, 0.6655, -1.171], [x, 0.6655, 1.171], [0, 1, 0]);
  mem('c89', 'podlaha', [H - 0.1, 0.6655, -1.171], [H - 0.1, 0.6655, 1.171], [0, 1, 0]);
  for (const s of [1, -1]) mem('c89', 'podlaha', [-H + 0.079, 0.6655, s * 1.15], [H - 0.079, 0.6655, s * 1.15], [0, 1, 0]);
  add(flr, zinc, box(D.L - 0.158, 0.003, 2.342, 0, 0.6215, 0), 'podlaha');
  // krov: krokve C 120 à 600, hřebenový profil, kleštiny
  const rY = z => D.yTop(z) - 0.171 / D.c;
  const xs = grid(-xSt - 0.02, xSt + 0.02);
  const loftX = D.loft ? D.loft[0] / 1000 - H : 99;
  for (const x of xs) {
    for (const s of [1, -1]) mem('c120', 'krokve', [x, rY(1.22), s * 1.22], [x, rY(0.03), s * 0.03], [0, D.c, s * Math.sin(D.p)]);
    if (x < loftX - 0.1) {
      const yc = D.eave + 0.6, zc = (rY(0) - yc) / D.t;
      mem('c89', 'krokve', [x + 0.045, yc, -zc], [x + 0.045, yc, zc], [0, 1, 0]);
    }
  }
  mem('c120', 'krokve', [-xSt - 0.02, rY(0) - 0.02, 0], [xSt + 0.02, rY(0) - 0.02, 0], [0, 1, 0]);
  // loft (jen Dům M): rošt C 89 à 400 nad koupelnou
  if (D.loft) {
    const x0 = loftX, x1 = D.loft[1] / 1000 - H, yl = F + D.loft[2] / 1000 - D.loft[3] / 1000 + 0.0445 + 0.018 / 2;
    for (let x = x0; x <= x1 + 0.01; x += 0.4) mem('c89', 'podlaha', [x, yl, -uIn], [x, yl, uIn], [0, 1, 0]);
    for (const s of [1, -1]) mem('c89', 'podlaha', [x0, yl, s * (uIn - 0.02)], [x1, yl, s * (uIn - 0.02)], [0, 1, 0]);
    mem('c120', 'podlaha', [x0 - 0.045, yl - 0.015, -uIn], [x0 - 0.045, yl - 0.015, uIn], [0, 1, 0]);
  }
  // příčka ložnice (jen Dům L)
  if (D.partition) {
    const [px, [d0, d1, dh]] = D.partition;
    frameWall({ n: new V3(1, 0, 0), a: new V3(0, 0, -1), off: px / 1000 - H, u0: -uIn, u1: uIn, top: raked, raked: true, holes: [[1.25 - d1 / 1000, 1.25 - d0 / 1000, F, F + dh / 1000]] });
  }
  // instancování
  const cBase = { c89: new THREE.ExtrudeGeometry(cShape(THREE, C89.d, C89.b, C89.lip, C89.t), { depth: 1, bevelEnabled: false }), c120: new THREE.ExtrudeGeometry(cShape(THREE, C120.d, C120.b, C120.lip, C120.t), { depth: 1, bevelEnabled: false }), strap: new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5) };
  const skGroups = { podlaha: flr, sloupky: grp(SK, 'steny'), krokve: grp(SK, 'krov') };
  for (const [k, ms] of lists) {
    const [prof, part] = k.split('|');
    const im = new THREE.InstancedMesh(cBase[prof], steel, ms.length);
    ms.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.userData.part = part; im.name = 'C_' + prof + '_' + part;
    skGroups[part].add(im);
  }

  /* ================================================================ L_plast: dřevěný plášť */
  const E = 1.25, ER = 0.9;
  const front = grp(SH, 'stena_predni', [0, 0, E]), back = grp(SH, 'stena_zadni', [0, 0, -E]);
  const gB = grp(SH, 'stit_predni', [E, 0, 0]), gA = grp(SH, 'stit_zadni', [-E, 0, 0]);
  const roofL = grp(SH, 'strecha', [0, ER, 0.32]), roofR = grp(SH, 'strecha_2', [0, ER, -0.32]), ridgeG = grp(SH, 'hreben', [0, ER + 0.2, 0]);
  const iz = [grp(SH, 'izolace_predni', [0, 0, 0.6]), grp(SH, 'izolace_zadni', [0, 0, -0.6]), grp(SH, 'izolace_stit_b', [0.6, 0, 0]), grp(SH, 'izolace_stit_a', [-0.6, 0, 0])];
  const eave = D.eave;
  // Plocha stěny: u podél stěny, y výška, w ven od líce obkladu. axis 'x' = podélná stěna.
  // ZP = podélná stěna na +Z (pravá stěna, params y = 2500), ZN = na −Z (levá stěna, params y = 0), jako výkresy.
  const faces = {
    ZP: { axis: 'x', P: (u, y, w) => new V3(u, y, 1.25 + w) },
    ZN: { axis: 'x', P: (u, y, w) => new V3(u, y, -1.25 - w) },
    B: { axis: 'z', P: (u, y, w) => new V3(H + w, y, -u) },
    A: { axis: 'z', P: (u, y, w) => new V3(-H - w, y, -u) },
  };
  const wb = (g, mat, f, u0, u1, y0, y1, w0, w1) => {
    const c = f.P((u0 + u1) / 2, (y0 + y1) / 2, (w0 + w1) / 2), du = Math.abs(u1 - u0), dy = y1 - y0, dw = Math.abs(w1 - w0);
    add(g, mat, f.axis === 'x' ? box(du, dy, dw, c.x, c.y, c.z) : box(dw, dy, du, c.x, c.y, c.z));
  };
  const outline = (u0, u1, y0, top, gable) => {
    const s = new THREE.Shape(); s.moveTo(u0, y0); s.lineTo(u1, y0); s.lineTo(u1, top(u1)); if (gable) s.lineTo(0, top(0)); s.lineTo(u0, top(u0)); s.closePath(); return s;
  };
  const withHoles = (s, holes) => { for (const [a, b, lo, hi] of holes) { const h = new THREE.Path(); h.moveTo(a, lo); h.lineTo(a, hi); h.lineTo(b, hi); h.lineTo(b, lo); h.closePath(); s.holes.push(h); } return s; };
  const slab = (s, depth) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  const gableTop = u => D.yUnder(Math.abs(u));
  // okno nebo dveře v líci: rám, sklo, oplechování parapetu
  const opening = (g, f, [a, b, lo, hi], door) => {
    const fw = 0.06;
    wb(g, frameMat, f, a, b, hi - fw, hi, -0.06, 0.012); wb(g, frameMat, f, a, b, lo, lo + fw, -0.06, 0.012);
    wb(g, frameMat, f, a, a + fw, lo + fw, hi - fw, -0.06, 0.012); wb(g, frameMat, f, b - fw, b, lo + fw, hi - fw, -0.06, 0.012);
    const split = door ? [(a + b) / 2] : b - a > 1.05 ? [(a + b) / 2] : [];
    for (const m of split) wb(g, frameMat, f, m - 0.035, m + 0.035, lo + fw, hi - fw, door ? -0.04 : -0.05, door ? 0.0 : 0.006);
    wb(g, glass, f, a + fw, b - fw, lo + fw, hi - fw, -0.036, -0.026);
    if (!door) wb(g, frameMat, f, a - 0.025, b + 0.025, lo - 0.014, lo, -0.02, 0.045);
    wb(g, frameMat, f, a - 0.02, b + 0.02, hi, hi + 0.012, -0.02, 0.025);
    if (door) wb(g, steel, f, (a + b) / 2 - 0.09, (a + b) / 2 - 0.075, F + 0.85, F + 1.25, 0.01, 0.03);
  };
  // podélné stěny: obklad s otvory, okna, rohové lišty, izolace pod obkladem
  for (const [side, g, ig, sgn] of [['R', front, iz[0], 1], ['L', back, iz[1], -1]]) {
    const f = faces[sgn > 0 ? 'ZP' : 'ZN'], holes = D.open[side].map(mmL);
    const geo = slab(withHoles(outline(-H, H, 0.6, () => eave), holes), 0.018);
    add(g, wood, sgn > 0 ? geo.translate(0, 0, 1.232) : geo.translate(0, 0, -1.25));
    holes.forEach(h => opening(g, f, h, h[2] < F + 0.05));
    for (const sx of [1, -1]) {
      wb(g, trim, f, sx > 0 ? H - 0.095 : -H - 0.022, sx > 0 ? H + 0.022 : -H + 0.095, 0.6, eave, 0, 0.022);
      const fg = faces[sx > 0 ? 'B' : 'A'], u = sgn > 0 ? -1.25 : 1.25;
      wb(g, trim, fg, Math.min(u, u + sgn * 0.095), Math.max(u, u + sgn * 0.095), 0.6, eave, 0, 0.022);
    }
    const ins = slab(withHoles(outline(-H + 0.08, H - 0.08, 0.72, () => wallTop - 0.01), holes), 0.03);
    add(ig, insul, sgn > 0 ? ins.translate(0, 0, 1.171) : ins.translate(0, 0, -1.201));
  }
  // štít B (k oji): obklad s okny
  {
    const holes = D.open.B.map(mmG);
    add(gB, wood, slab(withHoles(outline(-1.232, 1.232, 0.6, gableTop, true), holes), 0.018).rotateY(Math.PI / 2).translate(H - 0.018, 0, 0));
    holes.forEach(h => opening(gB, faces.B, h, false));
    add(iz[2], insul, slab(withHoles(outline(-1.17, 1.17, 0.72, u => gableTop(u) - 0.02, true), holes), 0.03).rotateY(Math.PI / 2).translate(H - 0.109, 0, 0));
  }
  // štít A: prosklená stěna s rámem, příčkami, paždíkem a dveřmi
  {
    const f = faces.A, g = D.gableA, vT = F + g.transom / 1000, e = 1.232, fw = 0.1;
    wb(gA, wood, f, -e, e, 0.6, F + 0.02, -0.018, 0);
    wb(gA, frameMat, f, -e, e, F + 0.02, F + 0.09, -0.08, 0.01);
    for (const s of [1, -1]) wb(gA, frameMat, f, s > 0 ? e - fw : -e, s > 0 ? e : -e + fw, F + 0.02, eave, -0.08, 0.01);
    for (const s of [1, -1]) add(gA, frameMat, beam(f.P(s * e, gableTop(e) - fw / 2, -0.035), f.P(0, gableTop(0) - fw / 2, -0.035), 0.09, fw, [1, 0, 0]));
    wb(gA, frameMat, f, -e, e, vT - 0.04, vT + 0.04, -0.08, 0.01);
    wb(gA, frameMat, f, -0.03, 0.03, vT, gableTop(0) - fw, -0.07, 0.0);
    const cuts = g.cuts.map(c => 1.25 - c / 1000), door = g.door ? [1.25 - g.door[1] / 1000, 1.25 - g.door[0] / 1000] : null;
    const divs = [-e + fw, ...cuts, ...(door || []), e - fw].sort((a, b) => a - b);
    for (const c of cuts) wb(gA, frameMat, f, c - 0.03, c + 0.03, F + 0.09, vT, -0.07, 0.0);
    for (let i = 0; i < divs.length - 1; i++) {
      const a = divs[i], b = divs[i + 1];
      if (door && Math.abs(a - door[0]) < 1e-6) {
        for (const u of [a, b]) wb(gA, frameMat, f, u - 0.03, u + 0.03, F + 0.09, vT, -0.075, 0.005);
        wb(gA, frameMat, f, a + 0.03, b - 0.03, vT - 0.11, vT - 0.04, -0.06, -0.01);
        wb(gA, frameMat, f, a + 0.03, b - 0.03, F + 0.09, F + 0.2, -0.06, -0.01);
        wb(gA, frameMat, f, a + 0.03, a + 0.1, F + 0.2, vT - 0.11, -0.06, -0.01); wb(gA, frameMat, f, b - 0.1, b - 0.03, F + 0.2, vT - 0.11, -0.06, -0.01);
        wb(gA, glass, f, a + 0.1, b - 0.1, F + 0.2, vT - 0.11, -0.04, -0.03);
        wb(gA, steel, f, a + 0.15, a + 0.17, F + 0.8, F + 1.3, -0.01, 0.025);
        continue;
      }
      wb(gA, glass, f, a + (i ? 0.03 : 0), b - (i < divs.length - 2 ? 0.03 : 0), F + 0.09, vT - 0.04, -0.045, -0.035);
    }
    for (const s of [1, -1]) {
      const u0 = 0.03, u1 = e - fw, sh = new THREE.Shape([new THREE.Vector2(s * u0, vT + 0.04), new THREE.Vector2(s * u1, vT + 0.04), new THREE.Vector2(s * u1, gableTop(u1) - fw * 0.95), new THREE.Vector2(s * u0, gableTop(u0) - fw * 0.95)]);
      add(gA, glass, slab(sh, 0.01).rotateY(Math.PI / 2).translate(-H + 0.035, 0, 0));
    }
  }
  // střecha: dvě plochy falcované krytiny s přesahem, drážky po 50 cm, hřebenáč, okapy, svod, oplechování štítů
  const sl = 1.275 / D.c, RL = D.L + 0.3;
  for (const [s, g] of [[1, roofL], [-1, roofR]]) {
    const n = new V3(0, D.c, s * Math.sin(D.p)), mid = s * 0.6375, topC = new V3(0, D.yTop(mid), mid);
    const orient = (geo, off) => geo.applyMatrix4(new M4().makeRotationX(s * D.p).setPosition(topC.clone().addScaledVector(n, off)));
    add(g, roofMat, orient(boxGeo(RL, 0.24, sl), -0.12));
    for (let x = -RL / 2 + 0.25; x < RL / 2 - 0.1; x += 0.5) add(g, roofMat, orient(boxGeo(0.012, 0.028, sl - 0.01).translate(x, 0, 0), 0.014));
    for (const sx of [1, -1]) add(g, frameMat, orient(boxGeo(0.014, 0.28, sl + 0.02).translate(sx * (RL / 2 + 0.007), 0, 0), -0.12));
    // okap: půlkruhový žlab pod hranou
    const gs = new THREE.Shape(); gs.absarc(0, 0, 0.065, Math.PI, Math.PI * 2, false); gs.lineTo(0.058, 0); gs.absarc(0, 0, 0.058, Math.PI * 2, Math.PI, true); gs.closePath();
    const gy = D.yTop(1.275) - 0.16;
    add(g, frameMat, slab(gs, RL).rotateY(Math.PI / 2).translate(-RL / 2, gy, s * 1.34));
    add(g, frameMat, beam([-RL / 2, D.yTop(1.275) - 0.13, s * 1.285], [RL / 2, D.yTop(1.275) - 0.13, s * 1.285], 0.008, 0.06, [0, 0, 1]));
    const sky = D.skylight, skz = sky ? (sky[2] + sky[3]) / 2000 - 1.25 : 0;   // střešní okno na straně své stěny (params y)
    if (sky && Math.sign(skz) === s) {
      const [x0, x1, y0, y1] = sky, sx = (x0 + x1) / 2000 - H, c = new V3(sx, D.yTop(Math.abs(skz)), skz);
      const o2 = (geo, off) => geo.applyMatrix4(new M4().makeRotationX(s * D.p).setPosition(c.clone().addScaledVector(n, off)));
      add(g, frameMat, o2(boxGeo((x1 - x0) / 1000, 0.07, (y1 - y0) / 1000 / D.c), 0.03));
      add(g, glass, o2(boxGeo((x1 - x0) / 1000 - 0.1, 0.072, (y1 - y0) / 1000 / D.c - 0.1), 0.035));
    }
  }
  for (const s of [1, -1]) add(ridgeG, frameMat, beam([-RL / 2, D.yTop(0.08) + 0.018, s * 0.08], [RL / 2, D.yTop(0.08) + 0.018, s * 0.08], 0.17, 0.012, [0, D.c, s * Math.sin(D.p)]));
  add(ridgeG, frameMat, rod([-RL / 2, D.yTop(0) + 0.03, 0], [RL / 2, D.yTop(0) + 0.03, 0], 0.022, 12));
  // svod na zadním rohu levé stěny (−Z)
  {
    const x = -H + 0.22, gy = D.yTop(1.275) - 0.16;
    add(back, frameMat, rod([x, gy - 0.02, -1.34], [x, gy - 0.16, -1.34], 0.035, 12));
    add(back, frameMat, rod([x, gy - 0.16, -1.34], [x, gy - 0.32, -1.305], 0.035, 12));
    add(back, frameMat, rod([x, gy - 0.32, -1.305], [x, 0.78, -1.305], 0.035, 12));
    add(back, frameMat, rod([x, 0.78, -1.305], [x, 0.68, -1.36], 0.035, 12));
    for (const y of [1.3, 2.3]) if (y < gy - 0.4) add(back, frameMat, box(0.03, 0.03, 0.06, x, y, -1.275));
  }

  flush();
  return root;
}

/* ---------------------------------------------- sauna na podvozku (variant: 'sauna') */
// Přívěs stejným builderem jako domy (nápravy 1 300 / 2 100 od čela A, spojka 5 100), skelet z C profilů podle skladeb
// v params (stěny C 89 à 600, krokve C 120, podlaha C 75 à 400), pultová střecha, plášť s okny, dveřmi a komínem.
function buildSaunaPv(THREE, D) {
  const V3 = THREE.Vector3, M4 = THREE.Matrix4, H = D.H, W2 = D.W / 2, F = D.ffl;
  const tm = buildProcedural(THREE, D);
  const root = new THREE.Group(); root.name = 'sauna_proc';
  const TR = tm.getObjectByName('L_prives'); root.add(TR);
  tm.traverse(m => { if (m.geometry) m.geometry.dispose(); });
  const SK = new THREE.Group(); SK.name = 'L_skelet'; const SH = new THREE.Group(); SH.name = 'L_plast'; root.add(SK, SH);
  /* materiály jako u domu */
  const zn = zincTex(THREE), wt = woodTex(THREE);
  const steel = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.4, map: zn.fine });
  const wood = new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: 2.2, roughness: 0.8, metalness: 0 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd9bfa3, map: wt.map, roughness: 0.78 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x30342f, metalness: 0.3, roughness: 0.5 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3f3a, metalness: 0.5, roughness: 0.48 });
  const inox = new THREE.MeshStandardMaterial({ color: 0xc7cacb, metalness: 0.8, roughness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x24302b, metalness: 0.15, roughness: 0.04, envMapIntensity: 1.8, transparent: true, opacity: 0.8 });
  glass.userData.noShadow = true;
  const foil = new THREE.MeshStandardMaterial({ color: 0xdfe3e3, metalness: 0.85, roughness: 0.32, transparent: true, opacity: 0.78, side: THREE.DoubleSide });
  foil.userData.noShadow = true;
  /* sloučení geometrií po skupině × materiálu × dílu */
  const buckets = new Map();
  const add = (parent, mat, geo, part = '') => { const k = parent.uuid + '|' + mat.uuid + '|' + part; if (!buckets.has(k)) buckets.set(k, { parent, mat, part, geos: [] }); buckets.get(k).geos.push(geo.index ? geo.toNonIndexed() : geo); };
  const flush = () => {
    for (const b of buckets.values()) {
      let n = 0; for (const g of b.geos) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2); let at = 0;
      for (const g of b.geos) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, at * 3); nor.set(g.attributes.normal.array, at * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, at * 2); at += g.attributes.position.count; g.dispose(); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, b.mat); if (b.part) m.userData.part = b.part; b.parent.add(m);
    }
  };
  const boxGeo = (w, h, d) => { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]]; for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0], uv.getY(k) * sc[f][1]); } return g; };
  const bm = (g, mat, x0, x1, y0, y1, z0, z1, part) => add(g, mat, boxGeo(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), part);
  const shape = (pts, holes = []) => { const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v))); for (const [a, b, lo, hi] of holes) { const h = new THREE.Path(); h.moveTo(a, lo); h.lineTo(b, lo); h.lineTo(b, hi); h.lineTo(a, hi); h.closePath(); sh.holes.push(h); } return sh; };
  const ext = (sh, d) => new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false });
  const grp = (name, ex) => { const g = new THREE.Group(); g.name = name; g.userData.pvExplode = new V3(...ex); SH.add(g); return g; };
  const X = x => x / 1000 - H, Zy = y => y / 1000 - W2, Yz = z => F + z / 1000;

  /* ---- L_skelet: C profily, instancované ---- */
  const PROF = { c75: [0.075, 0.041], c89: [0.089, 0.041], c120: [0.12, 0.041] };
  const lists = new Map();
  const mem = (prof, part, a, b, hint) => {
    const A = new V3(...a), B = new V3(...b), z = B.clone().sub(A), len = z.length(); z.divideScalar(len);
    const x = new V3(...hint); x.addScaledVector(z, -x.dot(z)); if (x.lengthSq() < 1e-6) x.set(1, 0, 0).addScaledVector(z, -z.x); x.normalize();
    const k = prof + '|' + part; if (!lists.has(k)) lists.set(k, []);
    lists.get(k).push(new M4().makeBasis(x, new V3().crossVectors(z, x), z.multiplyScalar(len)).setPosition(A));
  };
  const deckTop = 0.62, yf = deckTop + 0.0375, fTop = deckTop + 0.075, h2 = 0.0205;
  const wTop = x => D.roofTop(x) - 0.06 - 0.12 - 0.041;          // pod krokvemi (krytina + bednění + kontralatě ≈ 6 cm)
  // podlaha: trámky C 75 à 400 napříč, obvodové profily
  for (let x = -H + 0.04; x <= H - 0.03; x += 0.4) mem('c75', 'podlaha', [x, yf, -W2 + 0.04], [x, yf, W2 - 0.04], [0, 1, 0]);
  mem('c75', 'podlaha', [H - 0.04, yf, -W2 + 0.04], [H - 0.04, yf, W2 - 0.04], [0, 1, 0]);
  for (const sz of [1, -1]) mem('c75', 'podlaha', [-H + 0.02, yf, sz * (W2 - 0.06)], [H - 0.02, yf, sz * (W2 - 0.06)], [0, 1, 0]);
  // stěny: sloupky à 600, práh, horní pás ve sklonu střechy, zdvojení a překlady u otvorů
  const zSt = W2 - 0.045 - 0.0445, xSt = H - 0.045 - 0.0445;
  const wall = (P, u0, u1, n, holes, topAt) => {
    mem('c89', 'sloupky', P(u0, fTop + h2), P(u1, fTop + h2), n);
    mem('c89', 'sloupky', P(u0, topAt(u0) - h2), P(u1, topAt(u1) - h2), n);
    const posts = [u0 + h2, u1 - h2]; for (let u = u0 + 0.6; u < u1 - 0.1; u += 0.6) posts.push(u);
    for (const u of posts) {
      let segs = [[fTop + 0.041, topAt(u) - 0.041]];
      for (const [a, b, lo, hi] of holes) if (u > a - 0.08 && u < b + 0.08) segs = [[fTop + 0.041, lo - 0.041], [hi + 0.082, topAt(u) - 0.041]];
      for (const [y0, y1] of segs) if (y1 - y0 > 0.06) mem('c89', 'sloupky', P(u, y0), P(u, y1), n);
    }
    for (const [a, b, lo, hi] of holes) {
      for (const u of [a - h2, b + h2]) mem('c89', 'sloupky', P(u, fTop + 0.041), P(u, topAt(u) - 0.041), n);
      mem('c89', 'sloupky', P(a - 0.041, hi + h2), P(b + 0.041, hi + h2), n); mem('c89', 'sloupky', P(a - 0.041, hi + 0.0615), P(b + 0.041, hi + 0.0615), n);
      if (lo > F + 0.1) mem('c89', 'sloupky', P(a, lo - h2), P(b, lo - h2), n);
    }
  };
  for (const [side, sz] of [['R', 1], ['L', -1]]) {
    const holes = D.open[side].map(([a, b, lo, hi]) => [X(a), X(b), Yz(lo), Yz(hi)]);
    wall((u, y) => [u, y, sz * zSt], -H + 0.02, H - 0.02, [0, 0, sz], holes, wTop);
  }
  const door = [Zy(D.gableA.door[0]), Zy(D.gableA.door[1]), F, Yz(D.gableA.door[2])];
  for (const [sx, holes] of [[-1, [door]], [1, []]]) {
    const xg = sx * xSt;
    wall((u, y) => [xg, y, u], -zSt + 0.045, zSt - 0.045, [sx, 0, 0], holes, () => wTop(xg));
  }
  // krokve C 120 ve spádu střechy (podél x), výměna kolem prostupu komína
  const [fx, fz] = D.flue, rY = x => D.roofTop(x) - 0.06 - 0.06;
  const rafterZ = [-zSt, -zSt / 2, 0, zSt / 2, zSt];
  const x0r = -H - D.eaveA + 0.03, x1r = H + D.eaveB - 0.02;
  for (const z of rafterZ) mem('c120', 'krokve', [x0r, rY(x0r), z], [x1r, rY(x1r), z], [0, 1, 0]);
  for (const x of [-H + 0.04, H - 0.04]) mem('c120', 'krokve', [x, rY(x), -zSt - 0.02], [x, rY(x), zSt + 0.02], [0, 1, 0]);
  for (const x of [fx - 0.17, fx + 0.17]) mem('c120', 'prostup', [x, rY(x), -zSt], [x, rY(x), -zSt / 2], [0, 1, 0]);
  const cBase = Object.fromEntries(Object.entries(PROF).map(([k, [d, b]]) => [k, new THREE.ExtrudeGeometry(cShape(THREE, d, b, 0.012, 0.0028), { depth: 1, bevelEnabled: false })]));
  const skGroups = { podlaha: new THREE.Group(), sloupky: new THREE.Group(), krokve: new THREE.Group(), prostup: null };
  skGroups.podlaha.name = 'podlahovy_ram'; skGroups.sloupky.name = 'steny'; skGroups.krokve.name = 'krov'; skGroups.prostup = skGroups.krokve;
  SK.add(skGroups.podlaha, skGroups.sloupky, skGroups.krokve);
  bm(skGroups.podlaha, inox, -H + 0.02, H - 0.02, deckTop - 0.002, deckTop + 0.001, -W2 + 0.04, W2 - 0.04, 'podlaha');   // hliníkový plech pod podlahou
  for (const [k, ms] of lists) {
    const [prof, part] = k.split('|');
    const im = new THREE.InstancedMesh(cBase[prof], steel, ms.length);
    ms.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.frustumCulled = false; im.userData.part = part; im.name = 'C_' + k;
    skGroups[part].add(im);
  }

  /* ---- L_plast: obklad, okna, dveře se schůdky, střecha, komín, parozábrana ---- */
  const E = 0.9, base = 0.6;
  const gR = grp('stena_predni', [0, 0, E]), gL = grp('stena_zadni', [0, 0, -E]), gB = grp('stit_predni', [E, 0, 0]), gA = grp('stit_zadni', [-E, 0, 0]);
  const gRoof = grp('strecha', [0, 0.9, 0]), gChim = grp('komin', [0, 1.35, 0]), gFoil = grp('parozabrana', [0, 0, 0]);
  const frameX = (g, s, [a, b, lo, hi]) => {
    const z = s * (W2 - 0.03), d = 0.07, fw = 0.06;
    bm(g, frameMat, a, b, hi - fw, hi, z - d / 2, z + d / 2); bm(g, frameMat, a, b, lo, lo + fw, z - d / 2, z + d / 2);
    bm(g, frameMat, a, a + fw, lo, hi, z - d / 2, z + d / 2); bm(g, frameMat, b - fw, b, lo, hi, z - d / 2, z + d / 2);
    bm(g, glass, a + fw, b - fw, lo + fw, hi - fw, z - 0.006, z + 0.006);
    bm(g, frameMat, a - 0.02, b + 0.02, lo - 0.015, lo, s * (W2 - 0.03), s * (W2 + 0.04));
  };
  for (const [side, s, g] of [['R', 1, gR], ['L', -1, gL]]) {
    const holes = D.open[side].map(([a, b, lo, hi]) => [X(a), X(b), Yz(lo), Yz(hi)]);
    add(g, wood, ext(shape([[-H, base], [H, base], [H, D.under(H)], [-H, D.under(-H)]], holes), 0.02).translate(0, 0, s > 0 ? W2 - 0.02 : -W2));
    holes.forEach(h => frameX(g, s, h));
    for (const sx of [-1, 1]) bm(g, trim, sx > 0 ? H - 0.095 : -H, sx > 0 ? H : -H + 0.095, base, D.under(sx * H), s > 0 ? W2 : -W2 - 0.022, s > 0 ? W2 + 0.022 : -W2);
    // parozábrana za palubkami (fólie na vnitřní straně skeletu)
    add(gFoil, foil, ext(shape([[-H + 0.14, F], [H - 0.14, F], [H - 0.14, D.ceil], [-H + 0.14, D.ceil]], holes), 0.002).translate(0, 0, s * (zSt - 0.046) - (s > 0 ? 0.002 : 0)), 'v-folie');
  }
  for (const [g, x0, holes] of [[gA, -H, [door]], [gB, H, []]]) {
    add(g, wood, ext(shape([[-W2, base], [W2, base], [W2, D.under(x0)], [-W2, D.under(x0)]], holes), 0.02).rotateY(-Math.PI / 2).translate(x0 < 0 ? x0 + 0.02 : x0, 0, 0));
    add(gFoil, foil, ext(shape([[-zSt + 0.05, F], [zSt - 0.05, F], [zSt - 0.05, D.ceil], [-zSt + 0.05, D.ceil]], holes), 0.002).rotateY(-Math.PI / 2).translate(x0 < 0 ? -xSt + 0.046 : xSt - 0.044, 0, 0), 'v-folie');
    for (const sz of [-1, 1]) bm(g, trim, x0 < 0 ? x0 - 0.022 : x0, x0 < 0 ? x0 : x0 + 0.022, base, D.under(x0), sz > 0 ? W2 - 0.095 : -W2, sz > 0 ? W2 : -W2 + 0.095);
  }
  add(gFoil, foil, boxGeo(2 * xSt - 0.1, 0.002, 2 * zSt - 0.1).translate(0, D.ceil + 0.01, 0), 'v-folie');
  // vstupní dveře v čele A s rámem a klikou, dva schůdky na bočnicích
  {
    const [a, b, lo, hi] = door, x = -H - 0.01, fw = 0.06;
    bm(gA, frameMat, x - 0.035, x + 0.035, hi - fw, hi, a, b); bm(gA, frameMat, x - 0.035, x + 0.035, lo, hi, a, a + fw); bm(gA, frameMat, x - 0.035, x + 0.035, lo, hi, b - fw, b);
    bm(gA, trim, x - 0.02, x + 0.02, lo + 0.01, hi - fw, a + fw, b - fw);
    bm(gA, inox, x - 0.08, x - 0.03, lo + 1.0, lo + 1.02, b - fw - 0.2, b - fw - 0.06);
    for (let k = 0; k < 2; k++) bm(gA, trim, -H - 0.32 - k * 0.28, -H - 0.04 - k * 0.28, F - 0.03 - (k + 1) * (F / 3), F - (k + 1) * (F / 3), a - 0.12, b + 0.12);
    for (const zz of [a - 0.1, b + 0.07]) add(gA, trim, ext(shape([[0, 0], [0.62, 0], [0.62, 0.07], [0.04, F - F / 3 - 0.02], [0, F - F / 3 - 0.02]]), 0.035).rotateY(Math.PI).translate(-H - 0.02, 0, zz + 0.035));
  }
  // pultová střecha s přesahy, drážky krytiny ve spádu, oplechování; prostup komína s manžetou
  {
    const x0 = -H - D.eaveA, x1 = H + D.eaveB, rw = D.RW, ang = Math.atan(D.tan), len = (x1 - x0) / Math.cos(ang), xc = (x0 + x1) / 2, yc = D.roofTop(xc) - 0.1;
    add(gRoof, roofMat, boxGeo(len, 0.2, rw).rotateZ(-ang).translate(xc, yc, 0));
    for (let z = -rw / 2 + 0.25; z < rw / 2 - 0.1; z += 0.5) add(gRoof, roofMat, new THREE.BoxGeometry(len, 0.028, 0.012).rotateZ(-ang).translate(xc, yc + 0.114, z));
    for (const sz of [1, -1]) add(gRoof, frameMat, new THREE.BoxGeometry(len, 0.24, 0.014).rotateZ(-ang).translate(xc, yc, sz * (rw / 2 + 0.007)));
    for (const xe of [x0, x1]) bm(gRoof, frameMat, xe - 0.007, xe + 0.007, D.roofTop(xe) - 0.22, D.roofTop(xe) + 0.01, -rw / 2, rw / 2);
    const ty = D.roofTop(fx);
    add(gRoof, inox, new THREE.CylinderGeometry(D.flue[2] + 0.06, D.flue[2] + 0.13, 0.12, 24).translate(fx, ty + 0.04, fz), 'prostup');
    add(gChim, inox, new THREE.CylinderGeometry(D.flue[2] + 0.05, D.flue[2] + 0.05, D.flue[3] + 0.32, 24).translate(fx, ty + (D.flue[3] - 0.32) / 2, fz));
    add(gChim, inox, new THREE.ConeGeometry(D.flue[2] * 2.3, 0.12, 24).translate(fx, ty + D.flue[3] + 0.12, fz));
    add(gChim, inox, new THREE.CylinderGeometry(0.006, 0.006, 0.1, 6).translate(fx, ty + D.flue[3] + 0.04, fz));
  }
  flush();
  return root;
}

// Statická kresba sauny: pohled na pravou stěnu (+Z), oj vpravo, pultová střecha výš u čela A (vlevo), komín.
function saunaDrawing(D, PARTS) {
  const S = 112, H = D.H, X = m => +(150 + (m + H + 0.45) * S).toFixed(1), Y = m => +(530 - m * S).toFixed(1);
  const T = dimText(D);
  const r = (x0, y0, x1, y1, cls = '') => `<rect x="${X(x0)}" y="${Y(y1)}" width="${(X(x1) - X(x0)).toFixed(1)}" height="${(Y(y0) - Y(y1)).toFixed(1)}"${cls ? ` class="${cls}"` : ''}/>`;
  const l = (x0, y0, x1, y1, cls = '') => `<line x1="${X(x0)}" y1="${Y(y0)}" x2="${X(x1)}" y2="${Y(y1)}"${cls ? ` class="${cls}"` : ''}/>`;
  const poly = (pts, cls) => `<path class="${cls}" d="M${pts.map(([x, y]) => `${X(x)} ${Y(y)}`).join('L')}Z"/>`;
  const F = D.ffl, holes = D.open.R.map(([a, b, lo, hi]) => [a / 1000 - H, b / 1000 - H, F + lo / 1000, F + hi / 1000]);
  const wt = x => D.under(x) - 0.04;
  const studs = []; for (let x = -H + 0.05; x <= H - 0.04; x += 0.6) studs.push(x); studs.push(H - 0.05);
  const stud = x => { let segs = [[0.7, wt(x)]]; for (const [a, b, lo, hi] of holes) if (x > a - 0.06 && x < b + 0.06) segs = [[0.7, lo], [hi + 0.08, wt(x)]]; return segs.map(s2 => l(x, s2[0], x, s2[1])).join(''); };
  const nb = Math.round(D.L / 0.14), boards = Array.from({ length: nb - 1 }, (_, i) => { const x = -H + (i + 1) * 0.14; return l(x, 0.6, x, D.under(x), 'pv-s-board'); }).join('');
  const P = Object.fromEntries(PARTS.map(p => [p.id, p]));
  const mk = (id, y) => { const p = P[id]; return `<g class="pv-s-mk" data-ch="${p.ch}"><circle cx="${X(p.at[0])}" cy="${Y(y ?? p.at[1])}" r="11"/><text x="${X(p.at[0])}" y="${Y(y ?? p.at[1]) + 4}">${p.n}</text></g>`; };
  const wheel = x => `<circle cx="${X(x)}" cy="${Y(0.2625)}" r="${0.2625 * S}" class="pv-s-tyre"/><circle cx="${X(x)}" cy="${Y(0.2625)}" r="${0.165 * S}" class="pv-s-rim"/>`;
  const [fx] = D.flue, x0 = -H - D.eaveA, x1 = H + D.eaveB, hy = D.hitch;
  return `<svg class="pv-svg" viewBox="0 0 960 600" role="img" aria-label="Bokorys sauny na podvozku">
  <g class="pv-s-ground">${l(-H - 0.5, 0, hy + 0.3, 0)}</g>
  <g class="pv-s-tr">
    <g data-part="ram">${r(-H, 0.54, H, 0.62, 'pv-s-steel')}${r(-H + 0.02, 0.39, H, 0.54, 'pv-s-steel')}</g>
    <g data-part="napravy">${wheel(D.axleX - 0.4)}${wheel(D.axleX + 0.4)}</g>
    <g data-part="oj"><path class="pv-s-steel" d="M${X(H - 0.6)} ${Y(0.52)}L${X(hy - 0.3)} ${Y(0.52)}L${X(hy)} ${Y(0.47)}L${X(hy - 0.3)} ${Y(0.42)}L${X(H - 0.6)} ${Y(0.42)}Z"/></g>
    <g data-part="kolecko" class="pv-s-stow">${r(H + 0.93, 0.18, H + 0.97, 0.78, 'pv-s-steel')}<circle cx="${X(H + 0.95)}" cy="${Y(0.1)}" r="${0.1 * S}" class="pv-s-tyre"/></g>
    <g data-part="nohy">${[-H + 0.3, H - 0.3].map(x => `<g class="pv-s-stow">${r(x - 0.03, 0.03, x + 0.03, 0.39, 'pv-s-steel')}</g>`).join('')}</g>
  </g>
  <g class="pv-s-sk"><g class="pv-s-skin">
    <g data-part="podlaha">${r(-H + 0.04, 0.62, H - 0.04, 0.7, 'pv-s-frame')}</g>
    <g data-part="sloupky" class="pv-s-studs">${studs.map(stud).join('')}${l(-H + 0.04, wt(-H), H - 0.04, wt(H))}</g>
    <g data-part="krokve" class="pv-s-studs">${l(x0, D.under(x0) + 0.08, x1, D.under(x1) + 0.08)}</g>
  </g></g>
  <g class="pv-s-sh">
    <g class="pv-s-wall">${poly([[-H, 0.6], [H, 0.6], [H, D.under(H)], [-H, D.under(-H)]], 'pv-s-wood')}${boards}${holes.map(([a, b, lo, hi]) => r(a, lo, b, hi, 'pv-s-glass')).join('')}</g>
    <g class="pv-s-roof">${poly([[x0, D.roofTop(x0) - 0.22], [x0, D.roofTop(x0)], [x1, D.roofTop(x1)], [x1, D.roofTop(x1) - 0.22]], 'pv-s-roofp')}${r(fx - 0.075, D.roofTop(fx), fx + 0.075, D.ridge, 'pv-s-steel')}</g>
  </g>
  <g class="pv-s-dims">
    ${l(-H, -0.08, -H, -0.36)}${l(H, -0.08, H, -0.36)}${l(-H, -0.26, H, -0.26)}
    <text x="${X(0)}" y="${Y(-0.26) + 16}">délka ${T.length}</text>
    ${l(hy, -0.08, hy, -0.72)}${l(-H, -0.36, -H, -0.72)}${l(-H, -0.62, hy, -0.62)}
    <text x="${X((hy - H) / 2)}" y="${Y(-0.62) + 16}">celkem s ojí ${T.total}</text>
    ${l(-H - 0.3, 0, -H - 0.55, 0)}${l(fx - 0.1, D.ridge, -H - 0.55, D.ridge)}${l(-H - 0.45, 0, -H - 0.45, D.ridge)}
    <text x="${X(-H - 0.45) - 8}" y="${Y(1.9)}" transform="rotate(-90 ${X(-H - 0.45) - 8} ${Y(1.9)})">výška s komínem ${T.height}</text>
    <text x="${X(H + 0.35)}" y="${Y(3.2)}" class="pv-s-note">šířka ${T.width}</text>
    <text x="${X(H + 0.35)}" y="${Y(3.2) + 22}" class="pv-s-note">celkem ${T.weight}</text>
  </g>
  ${mk('podlaha')}${mk('sloupky')}${mk('krokve', D.under(0.75))}
  ${mk('ram', 0.5)}${mk('napravy')}${mk('oj', 0.8)}${mk('kolecko', 0.45)}${mk('nohy', 0.7)}
</svg>`;
}

// C profil s olemováním (lipped channel): hloubka d podél lokálního x, pásnice b podél y, otevřený směrem +y.
function cShape(THREE, d, b, lip, t) {
  const D = d / 2, B = b / 2;
  const pts = lip > 0
    ? [[-D, -B], [D, -B], [D, B], [D - lip, B], [D - lip, B - t], [D - t, B - t], [D - t, -B + t], [-D + t, -B + t], [-D + t, B - t], [-D + lip, B - t], [-D + lip, B], [-D, B]]
    : [[-D, -B], [D, -B], [D, B], [D - t, B], [D - t, -B + t], [-D + t, -B + t], [-D + t, B], [-D, B]];
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
}

function canvasTex(THREE, S, draw, rx = 1, ry = 1, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  return t;
}
const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// Žárový zinek: skvrnitý, s jemnými „květy“ zinku. map = barva (1 dlaždice = 0,8 m), rough = drsnost, fine = jemný šum pro kostru.
function zincTex(THREE) {
  const rnd = rng(5), S = 256;
  const draw = (g, light) => {
    g.fillStyle = light ? '#c9ccc6' : '#8c8c8c'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 260; i++) {
      const x = rnd() * S, y = rnd() * S, r = 6 + rnd() * 34, a = 0.04 + rnd() * 0.08, l = rnd() < 0.5;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, l ? `rgba(255,255,255,${a})` : `rgba(60,64,60,${a})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); }
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '40,44,40'},${0.04 + rnd() * 0.06})`; g.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 5, 2 + rnd() * 5); }
  };
  return {
    map: canvasTex(THREE, S, g => draw(g, true), 1 / 0.8, 1 / 0.8),
    rough: canvasTex(THREE, S, g => draw(g, false), 1 / 0.8, 1 / 0.8, false),
    fine: canvasTex(THREE, 64, (g) => { g.fillStyle = '#e4e6e1'; g.fillRect(0, 0, 64, 64); for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '70,74,70'},${0.05 + rnd() * 0.07})`; g.fillRect(rnd() * 64, rnd() * 64, 1 + rnd() * 3, 1 + rnd() * 3); } }, 4, 4),
  };
}
// Běhoun pneumatiky: příčné drážky v pásu běhounu (LatheGeometry: u kolem dokola, v podél profilu).
function treadTex(THREE) {
  return canvasTex(THREE, 512, (g, S) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
    const v0 = S * (6 / 21), v1 = S * (15 / 21);
    for (let i = 0; i < 56; i++) {
      const x = i / 56 * S;
      g.fillStyle = '#2a2a2a'; g.fillRect(x, v0, 3, v1 - v0);
      g.fillRect(x + 4, (v0 + v1) / 2 - 2, S / 56 - 6, 4);
    }
    g.fillStyle = '#9a9a9a';
    for (let i = 0; i < 8; i++) g.fillRect(i / 8 * S, S * 0.08, S / 16, 6), g.fillRect(i / 8 * S + 20, S * 0.88, S / 16, 6);
  }, 1, 1, false);
}
// Svislý obklad (termo smrk, prkna 14 cm, dlaždice 4 prkna = 0,56 m): barva + reliéf spár.
function woodTex(THREE) {
  let rnd = rng(11);
  const tones = [];
  const map = canvasTex(THREE, 512, (g, S) => {
    const bw = S / 4;
    for (let i = 0; i < 4; i++) {
      const l = 50 + (rnd() - 0.5) * 9, s = 40 + (rnd() - 0.5) * 10; tones.push(l);
      g.fillStyle = `hsl(28 ${s}% ${l}%)`; g.fillRect(i * bw, 0, bw, S);
      for (let j = 0; j < 24; j++) {
        const off = rnd() * bw, amp = 1 + rnd() * 5, ph = rnd() * 6;
        g.strokeStyle = rnd() < 0.4 ? `rgba(80,42,14,${0.08 + rnd() * 0.12})` : `rgba(255,230,190,${0.05 + rnd() * 0.08})`;
        g.lineWidth = 0.6 + rnd() * 1.8; g.beginPath();
        for (let y = 0; y <= S; y += 16) { const x = i * bw + Math.min(bw - 3, Math.max(3, off + Math.sin(y / S * 6.28 + ph) * amp)); y ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      if (rnd() < 0.5) {
        const x = i * bw + bw * (0.3 + rnd() * 0.4), y = rnd() * S, r = 4 + rnd() * 4;
        const grd = g.createRadialGradient(x, y, 0, x, y, r * 3); grd.addColorStop(0, 'rgba(90,48,16,.42)'); grd.addColorStop(1, 'rgba(90,48,16,0)');
        g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, r * 2, r * 3, 0, 0, 7); g.fill();
      }
      g.fillStyle = 'rgba(40,22,8,.6)'; g.fillRect(i * bw, 0, 4, S);
      g.fillStyle = 'rgba(255,240,215,.16)'; g.fillRect(i * bw + 4, 0, 1.5, S);
    }
  }, 1 / 0.56, 1 / 0.56);
  const bump = canvasTex(THREE, 256, (g, S) => {
    const bw = S / 4;
    g.fillStyle = '#b4b4b4'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 4; i++) {
      const grd = g.createLinearGradient(i * bw, 0, (i + 1) * bw, 0);
      grd.addColorStop(0, '#9a9a9a'); grd.addColorStop(0.08, '#c4c4c4'); grd.addColorStop(0.92, '#c4c4c4'); grd.addColorStop(1, '#a8a8a8');
      g.fillStyle = grd; g.fillRect(i * bw, 0, bw, S);
      g.fillStyle = '#202020'; g.fillRect(i * bw, 0, 3, S);
    }
  }, 1 / 0.56, 1 / 0.56, false);
  return { map, bump };
}
// Kontaktní stín: zaoblený obdélník s měkkým okrajem (vrstvené průhledné tahy, funguje i bez ctx.filter).
function contactTex(THREE) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  for (let i = 0; i < 28; i++) { const k = i * 1.6; g.fillStyle = 'rgba(0,0,0,0.045)'; rr(6 + k * 2.4, 6 + k, 500 - k * 4.8, 116 - k * 2, 40); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ===================================================================== Stěna */
// mountStena(root, opts) → { goTo, destroy }: skladba stěny rozkládaná scrollem. Vzorek stěny 1,25 × 1,0 m, vrstvy se
// postupně oddělují podél tloušťky stěny a kamera se pomalu stáčí na bok. Stejná pravidla jako mountPodvozek:
// three.js se načte až u sekce, kreslí se jen když je sekce vidět, statická SVG kresba bez WebGL, na slabých
// zařízeních a při omezeném pohybu. Volby: head { eyebrow, title, lead } | false, note, mode, lazyMargin, reducedMotion.
// Skladba podle projekt/dum-m-v2/params.py (BUILDUPS „Stěna“), názvy fasády a interiéru podle webu.
const WALL = [
  { key: 'fasada', name: 'Modřín', t: '18 mm', d: 0.018, text: 'Svislý obklad, který vidíte zvenku.' },
  { key: 'late', name: 'Odvětraná mezera s latěmi', t: '31 mm', d: 0.031, text: 'Za obkladem proudí vzduch a odvádí vlhkost.' },
  { key: 'pir', name: 'PIR deska s hliníkovou fólií', t: '30 mm', d: 0.03, text: 'Přeruší tepelné mosty přes ocelové sloupky.' },
  { key: 'skelet', name: 'Ocelové C-profily a minerální vlna', t: '89 mm', d: 0.089, text: 'Pozinkované sloupky po 60 cm nesou dům, mezi nimi je izolace.' },
  { key: 'parobrzda', name: 'Parobrzda', t: 'fólie', d: 0.002, text: 'Nepustí vlhkost z interiéru do stěny.' },
  { key: 'interier', name: 'Interiér smrk', t: '6,5 mm', d: 0.0065, text: 'Dřevo tam, kde se ho dotknete.' },
];
const WN = WALL.length, WW = 1.25, WH = 1.0, WX = 0.95;            // šířka a výška vzorku; posun do strany na metr posunu do hloubky
// Mezery mezi vrstvami po rozkladu (m): kolem ocelového skeletu víc místa, aby byl dobře vidět.
const WGAP = [0.17, 0.17, 0.36, 0.3, 0.13];
const WOFF = WALL.map((_, k) => WGAP.slice(k).reduce((a, v) => a + v, 0));
const STUDS = [-0.62, -0.02, 0.58];                                 // líc pásnice sloupků (x), osová vzdálenost 600 mm
// Poloha vrstev v tloušťce: interiér vzadu (z = 0), fasáda vpředu.
const WZ = (() => { const z = []; let at = 0; for (let k = WN - 1; k >= 0; k--) { z[k] = at; at += WALL[k].d; } return z; })();
// Krok mezi vrstvami (podíl délky scrollu): 0,14, poslední vrstva se oddělí právě na konci sekce (dřív 0,12 a 10 % prázdného konce).
const WSTEP = 0.14;
const wallSep = (p, k) => ease(clamp((p - 0.04 - k * WSTEP) / 0.26, 0, 1) * 0.76 + 0.12);   // 0 → 1 oddělení vrstvy k

function wallMarkup(id, o) {
  const h = o.head === false ? '' : `<div class="pv-head"><p class="pv-eyebrow">${o.head?.eyebrow ?? 'Plášť'}</p><h2 class="pv-h">${o.head?.title ?? 'Z čeho je stěna'}</h2><p class="pv-lead">${o.head?.lead ?? ''}</p></div>`;
  const note = o.note ?? 'Tloušťky jsou ilustrační, doplníme z technických listů výroby.';
  const rows = WALL.map((L, k) => `<li><span class="pv-num" aria-hidden="true">${k + 1}</span><span class="st-row-main"><b>${L.name}</b> <span class="st-row-text">${L.text}</span></span> <em>${L.t}</em></li>`).join('');
  const mks = WALL.map((L, k) => `<button type="button" class="pv-hs st-mk" data-l="${k}" tabindex="-1" aria-hidden="true" aria-label="${k + 1}: ${L.name}, ${L.t}. ${L.text}"><span>${k + 1}</span></button>`).join('');
  const lbs = WALL.map((L, k) => `<div class="pv-lb st-lb" data-l="${k}"><span class="pv-num">${k + 1}</span><span class="pv-lb-t"><b>${L.name}</b><span>${L.t}</span></span></div>`).join('');
  const tbs = [`<div class="pv-tbi" data-i="-1"><p class="pv-tb-h">Stěna v celku</p><p class="pv-tb-p">Posouvejte stránkou a vrstvy se oddělí jedna po druhé, zvenku dovnitř.</p></div>`,
    ...WALL.map((L, k) => `<div class="pv-tbi" data-i="${k}"><p class="pv-tb-h">${L.name}</p><p class="pv-tb-p">${L.text} <span class="st-t">${L.t}</span></p></div>`)].join('');
  return `${h}
<div class="pv-scrolly st-scrolly">
  <div class="pv-pin">
    <div class="pv-stage st-stage">
      <div class="pv-art">${wallDrawing()}</div>
      <div class="pv-gl" aria-hidden="true"></div>
      <div class="pv-overlay">${mks}</div>
      <svg class="pv-leaders" aria-hidden="true"></svg>
      <div class="pv-labels" aria-hidden="true">${lbs}</div>
      <div class="pv-tb"><div class="pv-tb-top"><p class="pv-hud" aria-hidden="true"><span class="pv-hud-no">00</span><span class="pv-hud-of">/ ${pad(WN)}</span><span class="pv-hud-name">Zvenku dovnitř</span></p></div>
        <div class="pv-tb-stack" aria-hidden="true">${tbs}</div></div>
      <p class="pv-tag">Vzorek stěny 1,25 × 1 m</p>
      <p class="st-note-in" aria-hidden="true">${note}</p>
      <div class="pv-card" aria-hidden="true"><div class="pv-card-in"></div></div>
    </div>
  </div>
  <div class="pv-chapters st-list-wrap"><ol class="st-list" id="${id}-list" aria-label="Vrstvy stěny zvenku dovnitř">${rows}</ol>
    <p class="st-note">${note}</p></div>
</div>`;
}

// Statická kresba: vrstvy rozložené v izometrii (bez WebGL, slabá zařízení, omezený pohyb).
function wallDrawing() {
  const K = 0.866, S = 330, Wd = WW * S * 0.62, Hd = WH * S * 0.7, gap = 46;
  const T = [12, 15, 15, 34, 3, 6];                     // tloušťky pro čitelnost (px), pořadí jako WALL
  const xs = []; let at = 0; for (let k = WN - 1; k >= 0; k--) { xs[k] = at + (WN - 1 - k) * gap; at += T[k]; }
  const P = (x, y, z) => `${((x - y) * K).toFixed(1)},${((x + y) * 0.5 - z).toFixed(1)}`;
  const q = (pts, c) => `<polygon class="${c}" points="${pts.map(p => P(...p)).join(' ')}"/>`;
  const slab = (x0, x1, y0, y1, z0, z1, c) => q([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], c + ' st-fx') + q([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], c + ' st-fy') + q([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c + ' st-fz');
  const ln = (a, b, c = '') => { const [x1, y1] = P(...a).split(','), [x2, y2] = P(...b).split(','); return `<line${c ? ` class="${c}"` : ''} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; };
  const studY = [Wd * 0.04, Wd * 0.5, Wd * 0.96 - 13];
  const g = WALL.map((L, k) => {
    const x0 = xs[k], x1 = x0 + T[k];
    let s = '';
    if (L.key === 'late') s = studY.map(y => slab(x0, x1, y + 3, y + 10, 0, Hd, 'st-s-batten')).join('');
    else if (L.key === 'skelet') {
      s = slab(x0 + 1, x1 - 1, 0, Wd, 0, Hd, 'st-s-wool');
      s += studY.map(y => q([[x1, y, 0], [x1, y + 13, 0], [x1, y + 13, Hd], [x1, y, Hd]], 'st-s-zinc st-fx')).join('');
      s += studY.map(y => `<polyline class="st-s-c" points="${[[x1 - 4, y, Hd], [x1, y, Hd], [x1, y + 13, Hd], [x0, y + 13, Hd], [x0, y, Hd], [x0 + 4, y, Hd]].map(p => P(...p)).join(' ')}"/>`).join('');
      const e = studY[2] + 13;
      s += q([[x0, e, 0], [x1, e, 0], [x1, e, Hd], [x0, e, Hd]], 'st-s-zinc st-fy');
      for (const zc of [Hd * 0.22, Hd * 0.52, Hd * 0.82]) {
        const pts = []; for (let a = 0; a <= 360; a += 30) { const r = a * Math.PI / 180; pts.push([x0 + T[k] / 2 + Math.cos(r) * 6, e, zc + Math.sin(r) * 13 * (Math.abs(Math.sin(r)) > 0.5 ? 1 : 0.85)]); }
        s += q(pts, 'st-s-hole');
      }
    } else s = slab(x0, x1, 0, Wd, 0, Hd, 'st-s-' + L.key);
    if (L.key === 'fasada') for (let y = 14; y < Wd; y += 14) s += ln([x1, y, 0], [x1, y, Hd], 'st-s-seam');
    const a = P((x0 + x1) / 2, 6, Hd).split(',').map(Number);
    s += `<g class="st-s-mk"><line x1="${a[0]}" y1="${a[1]}" x2="${a[0]}" y2="${a[1] - 34}"/><circle cx="${a[0]}" cy="${a[1] - 46}" r="11"/><text x="${a[0]}" y="${a[1] - 42}">${k + 1}</text></g>`;
    return `<g class="st-s-l" data-l="${k}">${s}</g>`;
  });
  return `<svg class="pv-svg st-svg" viewBox="-236 -298 520 596" role="img" aria-label="Skladba stěny rozložená na šest vrstev">${g.reverse().join('')}</svg>`;
}

let wuid = 0;
export function mountStena(root, opts = {}) {
  const o = { mode: 'auto', lazyMargin: '100%', ...opts };
  const id = 'st' + (++wuid);
  root.classList.add('pv', 'st');
  root.innerHTML = wallMarkup(id, o);
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const scrolly = $('.st-scrolly'), pin = $('.pv-pin'), stage = $('.st-stage'), glBox = $('.pv-gl'), mks = $$('.st-mk'), lbs = $$('.st-lb'), tbis = $$('.pv-tbi');
  const hudNo = $('.pv-hud-no'), tbTop = $('.pv-tb-top'), tag = $('.pv-tag'), card = cardCtl($('.pv-card'));
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = o.reducedMotion ?? mqReduce.matches;
  const isStatic = reduced || o.mode === 'static' || (o.mode === 'auto' && (lowEnd() || !hasWebGL()));
  root.classList.toggle('pv--static', isStatic);
  const extras = stageExtras({ stage, scrolly, pin, reduced });
  let p = isStatic ? 1 : 0, act = -2, viewer = null, visible = false, ticking = false, rafU = 0, destroyed = false, hl = -1, proj = null;
  const tbBottom = () => { const t = tbis[act + 1]; return (t && t.classList.contains('is-on') ? t : tbTop).getBoundingClientRect().bottom; };
  const ann = annotator(stage, glBox, $('.pv-leaders'), tbBottom, () => tag.getBoundingClientRect().bottom);

  function layout() {
    const cm = ann.cardMode(), items = [];
    WALL.forEach((_, k) => {
      const on = !cm && !isStatic && !!proj && !!proj[k] && proj[k][2] > 0.5;
      lbs[k].classList.toggle('is-on', on);
      if (on) items.push({ id: 'l' + k, el: lbs[k], x: proj[k][0] + glBox.offsetLeft, y: proj[k][1] + glBox.offsetTop, side: k < 3 ? 0 : 1 });   // vnější vrstvy vlevo, vnitřní vpravo
    });
    ann.place(items, { balance: false, reserve: 28 });
  }
  function paint() {
    // vrstva k je „aktuální“ od poloviny svého oddělení (p = 0,17 + k · WSTEP); hystereze ±0,08 kroku proti přeblikávání
    const x = (p - 0.17) / WSTEP;
    let a = clamp(Math.floor(x), -1, WN - 1);
    if (act > -2 && a !== act && x > act - 0.08 && x < act + 1.08) a = act;
    if (a === act) return;
    act = a;
    hudNo.textContent = pad(a + 1);
    tbis.forEach((t, i) => t.classList.toggle('is-on', i === a + 1));
    $$('.st-list li').forEach((li, k) => li.classList.toggle('is-on', k <= a));
    mks.forEach((b, i) => b.classList.toggle('is-cur', i === a));
    $$('.st-s-l').forEach(g => g.classList.toggle('is-cur', +g.dataset.l === a));   // statická kresba: aktuální vrstva
    const L = WALL[a];
    card.set('l' + a, L ? `<p class="pv-card-k">${pad(a + 1)} / ${pad(WN)} · ${L.t}</p><p class="pv-card-h"><span class="pv-num">${a + 1}</span>${L.name}</p><p class="pv-card-p">${L.text}</p>`
      : `<p class="pv-card-k">Zvenku dovnitř</p><p class="pv-card-h">Stěna v celku</p><p class="pv-card-p">Posouvejte stránkou a vrstvy se oddělí jedna po druhé.</p>`);
  }
  function setHl(k) {
    hl = k;
    $$('.st-s-l').forEach(g => g.classList.toggle('is-hl', +g.dataset.l === k));
    root.classList.toggle('st--hl', k >= 0);
    mks.forEach((b, i) => b.classList.toggle('is-hl', i === k));
    lbs.forEach((b, i) => b.classList.toggle('is-hl', i === k));
    viewer && viewer.highlight(k);
  }
  function update() {
    rafU = 0; ticking = false; if (destroyed) return;
    if (!isStatic) { p = scrollProgress(scrolly, pin); extras.progress(p); }
    paint(); viewer && viewer.target(p);
  }
  const onScroll = () => { gateKick(); if (!ticking && !destroyed) { ticking = true; rafU = requestAnimationFrame(update); } };
  const onResize = () => { ann.reset(); onScroll(); layout(); };
  const gate = gateEntry(pin);
  const ioVis = new IntersectionObserver(([e]) => {
    visible = gate.visible = e.isIntersecting; if (destroyed) return;
    if (visible) { addEventListener('scroll', onScroll, { passive: true }); update(); }
    else { removeEventListener('scroll', onScroll); viewer && viewer.gate(false); }
    gateKick();
  });
  ioVis.observe(scrolly);
  addEventListener('resize', onResize, { passive: true });
  let life = null;
  if (!isStatic) {
    life = lifecycle(scrolly, {
      near: o.lazyMargin, far: o.farMargin || '250%',
      create: () => createWallViewer(glBox, mks, pr => { proj = pr; layout(); }),
      ready: v => { viewer = gate.viewer = v; v.target(p, true); v.highlight(hl); stage.classList.add('pv-stage--3d'); gateKick(); },
      drop: () => { viewer = gate.viewer = null; proj = null; stage.classList.remove('pv-stage--3d'); layout(); },
      fail: err => { console.warn('[stena] 3D se nepodařilo spustit, zůstává statická kresba.', err); root.classList.add('pv--static'); },
    });
  }
  function goTo(k) { if (isStatic) return setHl(k); scrollToProgress(scrolly, pin, Math.min(1, 0.04 + k * WSTEP + 0.2), !reduced); }
  const onClick = e => { const b = e.target.closest('.st-mk'); if (b) setHl(hl === +b.dataset.l ? -1 : +b.dataset.l); };
  const onOver = e => { const b = e.target.closest('.st-mk, .st-s-l'); if (b) setHl(+b.dataset.l); };
  const onOut = e => { if (e.target.closest('.st-mk, .st-s-l')) setHl(-1); };
  const onFocus = e => { const b = e.target.closest('.st-mk'); if (b) setHl(+b.dataset.l); };
  root.addEventListener('click', onClick); root.addEventListener('pointerover', onOver); root.addEventListener('pointerout', onOut);
  root.addEventListener('focusin', onFocus); root.addEventListener('focusout', onOut);
  paint(); rafU = requestAnimationFrame(update);
  return {
    goTo,
    destroy() {
      destroyed = true; cancelAnimationFrame(rafU); card.clear(); extras.destroy();
      ioVis.disconnect(); gateDrop(gate); life && life.destroy();
      removeEventListener('scroll', onScroll); removeEventListener('resize', onResize);
      root.removeEventListener('click', onClick); root.removeEventListener('pointerover', onOver); root.removeEventListener('pointerout', onOut);
      root.removeEventListener('focusin', onFocus); root.removeEventListener('focusout', onOut);
      root.innerHTML = ''; root.classList.remove('pv', 'st', 'pv--static');
    },
  };
}

async function createWallViewer(box, mks, onProject) {
  const THREE = await import('three');
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const small = innerWidth < 720;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement; canvas.className = 'pv-canvas'; canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '3D model skladby stěny: modřínový obklad, odvětraná mezera s latěmi, PIR deska, ocelové C-profily s minerální vlnou, parobrzda a smrkový interiér.');
  box.appendChild(canvas);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8;
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a8172, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.0); key.position.set(2.5, 4, 3.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01; key.shadow.radius = 4; scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe7ff, 0.6); rim.position.set(-3, 2, -3); scene.add(rim);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.18 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), groundMat); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const contactMat = new THREE.MeshBasicMaterial({ map: contactTex(THREE), transparent: true, depthWrite: false, toneMapped: false, color: 0x000000, opacity: 0.3 });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(WW + 0.5, 1.6), contactMat); contact.rotation.x = -Math.PI / 2; contact.position.set(0, 0.002, 0.5); scene.add(contact);
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);

  // Geometrie: UV v metrech jako u domu.
  const boxGeo = (w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0], uv.getY(k) * sc[f][1]); }
    return g.translate(x, y, z);
  };
  const zn = zincTex(THREE), wt = woodTex(THREE);
  const mat = {
    wood: new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: 2.2, roughness: 0.8 }),
    batten: new THREE.MeshStandardMaterial({ color: 0xc9a27a, roughness: 0.85 }),
    pir: new THREE.MeshStandardMaterial({ color: 0xe9ebe7, metalness: 0.6, roughness: 0.3 }),
    pirCore: new THREE.MeshStandardMaterial({ color: 0xe9dcb4, roughness: 0.9 }),
    zinc: new THREE.MeshStandardMaterial({ color: 0xc9cdc7, metalness: 0.55, roughness: 0.5, map: zn.map, roughnessMap: zn.rough, side: THREE.DoubleSide }),
    wool: new THREE.MeshStandardMaterial({ color: 0xe6d394, roughness: 1, map: woolTex(THREE) }),
    foil: new THREE.MeshStandardMaterial({ color: 0xb8cbd9, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    ply: new THREE.MeshStandardMaterial({ color: 0xefdfc0, roughness: 0.7 }),
  };
  const groups = WALL.map(() => new THREE.Group());
  const mesh = (k, geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = x.receiveShadow = true; groups[k].add(x); return x; };
  const zc = k => WZ[k] + WALL[k].d / 2;
  // 1 fasáda: svislý modřínový obklad
  mesh(0, boxGeo(WW, WH, 0.018, 0, WH / 2, zc(0)), mat.wood);
  // 2 latě v ose sloupků
  STUDS.forEach(x => mesh(1, boxGeo(0.05, WH, 0.03, x + 0.0205, WH / 2, zc(1)), mat.batten));
  // 3 PIR deska: fólie navrch, jádro na hranách
  mesh(2, boxGeo(WW, WH, 0.03, 0, WH / 2, zc(2)), [mat.pirCore, mat.pirCore, mat.pirCore, mat.pirCore, mat.pir, mat.pir]);
  // 4 ocelový skelet: C 89 × 41 × 1,2 s olemováním, otvory pro rozvody ve stojině; minerální vlna mezi sloupky
  const d = 0.089, b = 0.041, lip = 0.012, t = 0.0015, z0 = WZ[3];
  const web = new THREE.Shape([[0, 0], [d, 0], [d, WH], [0, WH]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (const yc of [0.2, 0.5, 0.8]) {
    const hole = new THREE.Path(), rw = 0.019, rh = 0.032, cx = d / 2;
    hole.moveTo(cx - rw, yc - rh + rw); hole.absarc(cx, yc - rh + rw, rw, Math.PI, 0, false); hole.lineTo(cx + rw, yc + rh - rw); hole.absarc(cx, yc + rh - rw, rw, 0, Math.PI, false); hole.closePath();
    web.holes.push(hole);
  }
  const webGeo = new THREE.ExtrudeGeometry(web, { depth: t, bevelEnabled: false, curveSegments: 10 });
  webGeo.rotateY(-Math.PI / 2);   // tvar v rovině z–y, tloušťka podél x
  STUDS.forEach(x => {
    mesh(3, webGeo.clone().translate(x + t, 0, z0), mat.zinc);
    for (const zf of [z0 + t / 2, z0 + d - t / 2]) mesh(3, boxGeo(b, WH, t, x + b / 2, WH / 2, zf), mat.zinc);
    for (const zl of [z0 + lip / 2, z0 + d - lip / 2]) mesh(3, boxGeo(t, WH, lip, x + b - t / 2, WH / 2, zl), mat.zinc);
  });
  webGeo.dispose();
  const batt = (xa, xb, h) => mesh(3, boxGeo(xb - xa - 0.004, h, d - 0.006, (xa + xb) / 2, h / 2, z0 + d / 2), mat.wool);
  batt(STUDS[0] + 0.0015, STUDS[1], WH); batt(STUDS[1] + 0.0015, STUDS[2], 0.56);   // pravé pole jen zčásti, ať jsou vidět sloupky
  // 5 parobrzda, 6 interiér (topolová překližka se smrkovou dýhou)
  mesh(4, boxGeo(WW, WH, 0.0015, 0, WH / 2, zc(4)), mat.foil).castShadow = false;
  mesh(5, boxGeo(WW, WH, 0.0065, 0, WH / 2, zc(5)), mat.ply);
  const wall = new THREE.Group(); groups.forEach(g => wall.add(g)); wall.position.z = -0.09; scene.add(wall);
  const base = groups.map(g => g.position.clone());
  // Kotvy čísel: pravý horní roh vrstvy (směrem ke kameře).
  const anchors = groups.map((g, k) => { const a = new THREE.Object3D(); a.position.set(WW / 2 - 0.02, WH + 0.035, zc(k)); g.add(a); return a; });
  // Zvýraznění: jantarová záře na materiálech vybrané vrstvy (vlastní kopie materiálů pro každou vrstvu).
  const AMBER = new THREE.Color(0xe8b04b), lmats = groups.map(() => []);
  groups.forEach((g, k) => { const cache = new Map(); g.traverse(m => { if (!m.isMesh) return; const arr = [].concat(m.material).map(x => { if (!cache.has(x.uuid)) { const c = x.clone(); c.userData.em = c.emissive.clone(); cache.set(x.uuid, c); lmats[k].push(c); } return cache.get(x.uuid); }); m.material = Array.isArray(m.material) ? arr : arr[0]; }); });

  function readTheme() {
    const cs = getComputedStyle(box.closest('.pv-stage'));
    const dark = new THREE.Color(cs.getPropertyValue('--surface').trim() || '#F7F3EC').getHSL({}).l < 0.4;
    groundMat.opacity = dark ? 0.4 : 0.18; contactMat.opacity = dark ? 0.5 : 0.3; renderer.toneMappingExposure = dark ? 0.92 : 1.0; dirty = true;
  }
  const mqDark = matchMedia('(prefers-color-scheme: dark)'), mo = new MutationObserver(readTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] }); mqDark.addEventListener('change', readTheme);

  // Kamera: azimut a výška se s rozkladem pomalu stáčejí na bok, vzdálenost roste s roztažením vrstev.
  const CAM = { az0: 0.5, az1: 0.45, el0: 0.3, el1: 0.2, d0: 3.0, dk: 1.35, tx: 0.05, ty: 0.47 };
  let tgt = 0, cur = 0, hl = -1, hlCur = groups.map(() => 0), dirty = true, raf = 0, last = 0, running = false, held = false;
  readTheme();
  const tmp = new THREE.Vector3();
  function apply() {
    const s = WALL.map((_, k) => wallSep(cur, k));
    groups.forEach((g, k) => { g.position.z = base[k].z + WOFF[k] * s[k]; g.position.x = base[k].x - WOFF[k] * WX * s[k]; });
    const spread = WOFF[0] * s[0];   // skutečné roztažení (fasáda se oddělí první), kamera ho drží celé v záběru
    const az = CAM.az0 + CAM.az1 * ease(clamp(cur, 0, 1) * 0.76 + 0.12), el = CAM.el0 + CAM.el1 * cur;
    const w = box.clientWidth || 1, h = box.clientHeight || 1, aspect = w / h;
    camera.aspect = aspect;
    const dist = (CAM.d0 + spread * CAM.dk) * Math.max(1, 1.3 / aspect);
    const tx = CAM.tx - spread * WX * 0.5, ty = CAM.ty, tz = spread * 0.5;
    camera.position.set(tx + dist * Math.cos(el) * Math.sin(az), ty + dist * Math.sin(el), tz + dist * Math.cos(el) * Math.cos(az));
    camera.lookAt(tx, ty, tz); camera.updateProjectionMatrix(); camera.updateMatrixWorld(); wall.updateMatrixWorld(true);
    groups.forEach((g, k) => { for (const m of lmats[k]) { m.emissive.copy(m.userData.em).lerp(AMBER, hlCur[k] * 0.6); m.emissiveIntensity = hlCur[k] > 0.01 ? 0.5 : 1; } });
    const proj = [];
    mks.forEach((b, k) => {
      anchors[k].getWorldPosition(tmp).project(camera);
      const sx = (tmp.x + 1) / 2 * w, sy = (1 - tmp.y) / 2 * h, inside = sx > 16 && sx < w - 16 && sy > 16 && sy < h - 16;
      const vis = inside ? clamp((s[k] - 0.35) / 0.4, 0, 1) : 0;
      proj.push([(tmp.x + 1) / 2 * w, (1 - tmp.y) / 2 * h, vis]);
      b.style.transform = `translate(${((tmp.x + 1) / 2 * w).toFixed(1)}px, ${((1 - tmp.y) / 2 * h).toFixed(1)}px) translate(-50%, -50%)`;
      b.style.opacity = vis.toFixed(3); b.style.visibility = vis > 0.02 ? 'visible' : 'hidden';
      b.tabIndex = vis > 0.5 ? 0 : -1; b.setAttribute('aria-hidden', vis > 0.5 ? 'false' : 'true');
    });
    onProject && onProject(proj);
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, last ? (t - last) / 1000 : 0.016); last = t;
    const k = 1 - Math.exp(-dt * 5);
    let moving = false;
    if (Math.abs(tgt - cur) > 1e-4) { cur += (tgt - cur) * k; moving = true; } else cur = tgt;
    hlCur = hlCur.map((v, i) => { const g = i === hl ? 1 : 0; if (Math.abs(g - v) > 1e-3) { moving = true; return v + (g - v) * k * 1.6; } return g; });
    if (moving || dirty) { apply(); renderer.render(scene, camera); dirty = false; }
  }
  const draw = () => { apply(); renderer.render(scene, camera); };
  const ro = new ResizeObserver(() => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); dirty = true; if (!running && !held) draw(); });
  ro.observe(box);
  box.__pv = {
    renderer, scene, camera, cam: CAM,
    show(p) { tgt = cur = p; draw(); return this.info(); },
    info() { const r = renderer.info.render; return { calls: r.calls, triangles: r.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }; },
  };
  return {
    target(p, instant) { tgt = p; if (instant) cur = p; dirty = true; if (!running && !held) draw(); },
    highlight(k) { hl = k; dirty = true; if (!running && !held) { hlCur = hlCur.map((_, i) => (i === k ? 1 : 0)); draw(); } },
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    gate(on) { held = !on; on ? this.start() : this.stop(); },
    dispose() {
      this.stop(); ro.disconnect(); mo.disconnect(); mqDark.removeEventListener('change', readTheme); delete box.__pv;
      scene.traverse(m => { if (m.geometry) m.geometry.dispose(); [].concat(m.material || []).forEach(x => { for (const q in x) if (x[q] && x[q].isTexture) x[q].dispose(); x.dispose(); }); });
      pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
    },
  };
}
// Sdílené části pro js/dispozice.js a referenční snímky (projekt/v2/ref). three.js se načítá jen uvnitř viewerů.
export {
  buildProcedural, dimsOf, VARIANTS, annotator, cardCtl, scrollProgress, scrollToProgress, applyEmbed, hasWebGL, lowEnd,
  clamp, ease, pad, first, fmt, contactTex, canvasTex, rng, woodTex, gateKick, gateEntry, gateDrop, lifecycle,
  stepHyst, stageExtras, finalCard,
};

// Minerální vlna: jemná vláknitá struktura.
function woolTex(THREE) {
  const rnd = rng(23);
  return canvasTex(THREE, 256, (g, S) => {
    g.fillStyle = '#efe2b8'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) { const x = rnd() * S, y = rnd() * S, l = 6 + rnd() * 18, a = rnd() * Math.PI; g.strokeStyle = `rgba(${rnd() < 0.5 ? '160,128,60' : '255,250,230'},${0.12 + rnd() * 0.18})`; g.lineWidth = 0.6 + rnd(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.4); g.stroke(); }
  }, 1 / 0.3, 1 / 0.3);
}
