// 3D prohlížeč domu: pohled zvenku, procházka uvnitř, řez bez střechy, rentgen s rozvody.
// Model (GLB z lib/export_web.py) má vrstvy L_dum, L_strecha, L_obal, L_rozvody, L_offgrid, L_tc.
// Souřadnice: Blender (x podél domu, y napříč, z nahoru, metry) → three.js (x, z, −y).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const B = (x, y, z) => new THREE.Vector3(x, z, -y);

// Kresba prken na plátně podle vizualizací (barvy změřené z fotek Domu S): tón prkna, léta, suky, spára s pérem.
// Model má UV v metrech (krabicová projekce), dlaždice = celý počet prken.
// across: 'u' = prkna se střídají podél u (svislý obklad), 'v' = podél v (podlaha, terasa).
function boards(hex, width, across, opt = {}) {
  const n = Math.max(1, Math.round(opt.tile ?? 1 / width)), tile = n * width, S = opt.px ?? 1024;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), base = new THREE.Color(hex);
  let seed = opt.seed ?? 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bw = S / n, hsl = {};
  base.getHSL(hsl);
  const line = (i, x0, y0, x1, y1) => across === 'u' ? [i * bw + x0, y0, x1, y1] : [y0, i * bw + x0, y1, x1];
  for (let i = 0; i < n; i++) {
    // tón prkna: posun jasu a sytosti, jako u skutečného dřeva
    const col = new THREE.Color().setHSL(hsl.h + (rnd() - 0.5) * 0.02, Math.min(1, hsl.s * (1 + (rnd() - 0.5) * (opt.vary ?? 0.25))), hsl.l * (1 + (rnd() - 0.5) * (opt.vary ?? 0.25)));
    g.fillStyle = '#' + col.getHexString();
    g.fillRect(...line(i, 0, 0, bw, S));
    if (opt.grain !== 0) {
      // léta: mnoho tenkých vlnitých čar různé sytosti
      for (let j = 0; j < (opt.lines ?? 26); j++) {
        const off = rnd() * bw, amp = 1 + rnd() * (opt.wave ?? 6), f = 1 + rnd() * 3, ph = rnd() * 6, dark = rnd() < 0.35;
        g.strokeStyle = dark ? `rgba(70,38,12,${(opt.grain ?? 0.16) * (0.6 + rnd())})` : `rgba(255,236,200,${(opt.grain ?? 0.16) * 0.5 * rnd()})`;
        g.lineWidth = 0.6 + rnd() * (dark ? 1.6 : 2.4);
        g.beginPath();
        for (let t = 0; t <= S; t += 12) {
          const a = Math.min(bw - 2, Math.max(2, off + Math.sin(t / S * f * Math.PI * 2 + ph) * amp));
          const [x, y] = across === 'u' ? [i * bw + a, t] : [t, i * bw + a];
          t ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      }
      // suky (smrk, borovice, modřín)
      const knots = opt.knots ?? 1.2;
      for (let k = 0; k < knots * (0.5 + rnd()); k++) {
        const kx = bw * (0.2 + rnd() * 0.6), ky = rnd() * S, r = 3 + rnd() * (opt.knotR ?? 7);
        const [x, y] = across === 'u' ? [i * bw + kx, ky] : [ky, i * bw + kx];
        const grd = g.createRadialGradient(x, y, 0, x, y, r * 3);
        grd.addColorStop(0, 'rgba(60,28,8,.85)'); grd.addColorStop(0.3, 'rgba(95,52,18,.55)'); grd.addColorStop(1, 'rgba(95,52,18,0)');
        g.fillStyle = grd;
        g.beginPath(); across === 'u' ? g.ellipse(x, y, r * 2.2, r * 3, 0, 0, 7) : g.ellipse(x, y, r * 3, r * 2.2, 0, 0, 7); g.fill();
      }
    }
    // spára mezi prkny: tmavá drážka a světlá hrana péra
    if (opt.gap !== 0) {
      g.fillStyle = `rgba(30,18,8,${opt.gap ?? 0.6})`;
      g.fillRect(...line(i, 0, 0, opt.gapPx ?? 3, S));
      g.fillStyle = 'rgba(255,240,215,.18)';
      g.fillRect(...line(i, opt.gapPx ?? 3, 0, 1.5, S));
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = 8;
  return t;
}
function noiseTex(hex, amt, px = 256, rep = 1) {   // jemný šum (tráva, plech, beton)
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'), col = new THREE.Color(hex), img = g.createImageData(px, px);
  for (let i = 0; i < px * px; i++) {
    const k = 1 + (Math.random() - 0.5) * amt;
    img.data[i * 4] = Math.min(255, col.r * 255 * k); img.data[i * 4 + 1] = Math.min(255, col.g * 255 * k); img.data[i * 4 + 2] = Math.min(255, col.b * 255 * k); img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}
// barvy a povrchy podle vizualizací (prirodni-0000, int-smrk-0, obytna)
const LOOK = {
  NH_fasada: () => ({ map: boards('#c27f45', 0.14, 'u', { lines: 30, grain: 0.2, knots: 1.6, vary: 0.3 }), roughness: 0.78 }),
  NH_terasa: () => ({ map: boards('#b8773f', 0.145, 'v', { grain: 0.2, knots: 1 }), roughness: 0.8 }),
  NH_obklad: () => ({ map: boards('#d9b585', 0.12, 'u', { grain: 0.13, knots: 1.5, knotR: 5, gap: 0.45, gapPx: 2 }), roughness: 0.62 }),
  NH_topol: () => ({ map: boards('#d9b585', 0.12, 'u', { grain: 0.13, knots: 1.5, knotR: 5, gap: 0.45, gapPx: 2 }), roughness: 0.62 }),
  NH_obklad_tmavy: () => ({ map: boards('#c9a06c', 0.04, 'v', { grain: 0.15, knots: 0.3, gap: 0.12, gapPx: 1 }), roughness: 0.6 }),
  NH_lepene: () => ({ map: boards('#c9a06c', 0.04, 'v', { grain: 0.15, knots: 0.3, gap: 0.12, gapPx: 1 }), roughness: 0.6 }),
  NH_podlaha: () => ({ map: boards('#dcc09a', 0.19, 'v', { grain: 0.14, knots: 1.2, knotR: 6, gap: 0.4, gapPx: 2 }), roughness: 0.5 }),
  NH_plech: () => ({ map: boards('#505457', 0.5, 'u', { grain: 0, gap: 0.5, gapPx: 7, vary: 0.04 }), roughness: 0.45, metalness: 0.25 }),
  NH_ram: () => ({ color: '#2b2e30', roughness: 0.55, metalness: 0.2 }),
  NH_cerna: () => ({ color: '#232526', roughness: 0.6 }),
  NH_ocel: () => ({ map: noiseTex('#9a9c97', 0.25, 128, 4), roughness: 0.55, metalness: 0.6 }),
  NH_pozink: () => ({ map: noiseTex('#a3a5a1', 0.3, 128, 4), roughness: 0.5, metalness: 0.65 }),
  NH_dvirka: () => ({ color: '#ece6dc', roughness: 0.55 }),
  NH_nabytek: () => ({ color: '#e6ddd0', roughness: 0.6 }),
  NH_deska: () => ({ color: '#55524e', roughness: 0.5 }),
  NH_textil: () => ({ map: noiseTex('#8f8b87', 0.18, 128, 8), roughness: 0.95 }),
  NH_luzkoviny: () => ({ color: '#ddd7cd', roughness: 0.95 }),
  NH_bila: () => ({ color: '#f1eee8', roughness: 0.35 }),
  NH_pneu: () => ({ color: '#1d1e1f', roughness: 0.9 }),
};

export function init(root, cfg) {
  const canvasWrap = root.querySelector('.v3d-canvas');
  const status = root.querySelector('.v3d-status');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // obloha jako na vizualizacích: teplý horizont, modravé nebe
  const sky = document.createElement('canvas'); sky.width = 2; sky.height = 256;
  const sg = sky.getContext('2d'), grd = sg.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, '#9fb8cf'); grd.addColorStop(0.55, '#d9dfe0'); grd.addColorStop(0.8, '#f1dcbc'); grd.addColorStop(1, '#e9d2ae');
  sg.fillStyle = grd; sg.fillRect(0, 0, 2, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0xe2d9c4, 28, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const hemi = new THREE.HemisphereLight(0xdfe6ee, 0x8a8455, 0.75);
  scene.add(hemi);
  // nízké teplé slunce zleva zepředu (zlatá hodinka jako na fotkách)
  const sun = new THREE.DirectionalLight(0xffdcb0, 3.0);
  sun.position.set(-9, 11, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.target.position.set(3, 0, -1.25);
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ map: noiseTex('#a3ad62', 0.4, 256, 60), roughness: 1, envMapIntensity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // vnitřní světlo, aby interiér nebyl tmavý
  const lamp = new THREE.PointLight(0xffe2bd, 1.2, 9, 1.4);
  lamp.position.copy(B(3, 1.25, 2.9));
  scene.add(lamp);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.03, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  let layers = {}, shellMats = new Set(), fitMats = new Set(), raf = 0, frames = 0;
  const render = () => { frames = 40; if (!raf) raf = requestAnimationFrame(loop); };
  function loop() {
    raf = 0;
    controls.update();
    renderer.render(scene, camera);
    if (--frames > 0) raf = requestAnimationFrame(loop);
  }
  controls.addEventListener('change', render);

  function resize() {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(canvasWrap);

  // pohledy
  const views = {
    zvenku: { pos: B(-5.8, -7.6, 3.9), tgt: B(3.2, 1.25, 1.7), inside: false, roof: true },
    zvenku2: { pos: B(11.5, 8.5, 3.4), tgt: B(3.0, 1.25, 1.7), inside: false, roof: true },
    rez: { pos: B(3.0, -4.2, 8.6), tgt: B(3.0, 1.25, 1.0), inside: false, roof: false },
    obyvak: { pos: B(0.5, 1.0, 2.25), tgt: B(4.2, 1.25, 1.62), inside: true, roof: true },
    kuchyn: { pos: B(4.45, 1.25, 2.3), tgt: B(0.2, 1.1, 1.6), inside: true, roof: true },
    koupelna: { pos: B(4.9, 1.6, 2.32), tgt: B(5.7, 0.5, 1.5), inside: true, roof: true },
  };
  let anim = null;
  function go(name) {
    const v0 = views[name];
    setRoof(v0.roof || state.xray);
    // zvenku: na úzkém (mobilním) displeji kamera odstoupí, aby byl vidět celý dům
    const f = v0.inside ? 1 : Math.max(1, Math.pow(1.2 / camera.aspect, 0.55));
    const v = { ...v0, pos: v0.tgt.clone().add(v0.pos.clone().sub(v0.tgt).multiplyScalar(f)) };
    const from = { p: camera.position.clone(), t: controls.target.clone() };
    // uvnitř se rozhlíží z místa: cíl těsně před kamerou
    const tgt = v.inside ? v.pos.clone().add(v.tgt.clone().sub(v.pos).normalize().multiplyScalar(0.05)) : v.tgt.clone();
    controls.minDistance = v.inside ? 0.01 : 2.5;
    controls.maxDistance = v.inside ? 0.06 : 30;
    controls.enablePan = !v.inside;
    controls.rotateSpeed = v.inside ? -0.35 : 0.8;
    controls.maxPolarAngle = v.inside ? Math.PI : Math.PI / 2 - 0.03;
    // uvnitř rozsvítit (jako večer na vizualizacích), venku jen slunce a obloha
    lamp.intensity = v.inside ? 4 : 1.2;
    hemi.intensity = v.inside ? 0.9 : 0.75;
    const t0 = performance.now(), dur = 900;
    cancelAnimationFrame(anim);
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(from.p, v.pos, e);
      controls.target.lerpVectors(from.t, tgt, e);
      camera.fov = v.inside ? 50 + 18 * e : 50 + (camera.fov - 50) * (1 - e);
      camera.updateProjectionMatrix();
      render();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    root.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === name));
  }

  const state = { xray: false };
  function setRoof(on) { if (layers.L_strecha) layers.L_strecha.visible = on; render(); }
  function setXray(on) {
    state.xray = on;
    if (layers.L_rozvody) layers.L_rozvody.visible = on;
    shellMats.forEach(m => { m.transparent = on; m.opacity = on ? 0.12 : 1; m.depthWrite = !on; m.needsUpdate = true; });
    fitMats.forEach(m => { m.transparent = on || m.userData.glass; m.opacity = on ? 0.28 : (m.userData.glass ? 0.22 : 1); m.depthWrite = !on && !m.userData.glass; m.needsUpdate = true; });
    root.querySelector('.v3d-legend').hidden = !on;
    render();
  }

  const draco = new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/');
  new GLTFLoader().setDRACOLoader(draco).load(cfg.src, gltf => {
    const model = gltf.scene, looks = {};
    model.traverse(o => {
      if (o.isMesh) {
        const m = o.material, look = LOOK[m.name] && (looks[m.name] ??= LOOK[m.name]());
        if (look) {
          const { color, ...rest } = look;
          Object.assign(m, rest);
          m.color.set(color ?? 0xffffff);
        }
        m.envMapIntensity = 0.45;   // okolní odraz jen jemně, jinak model vybledne
        m.needsUpdate = true;
      }
      if (/^L_/.test(o.name)) layers[o.name] = o;
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      if (o.material.name === 'NH_sklo') { o.material.transparent = true; o.material.opacity = 0.22; o.material.depthWrite = false; o.castShadow = false; }
    });
    // materiály pláště (fasáda, střecha, vnitřní obklad) se v rentgenu zprůhlední; klonují se, ať se nezprůhlední nábytek se stejným materiálem
    for (const name of ['L_obal', 'L_strecha']) {
      layers[name]?.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); shellMats.add(o.material); } });
    }
    // vybavení a rám domu: v rentgenu poloprůhledné, aby byly vidět trubky a kabely (každý mesh vlastní kopie materiálu)
    layers.L_dum?.traverse(o => {
      if (!o.isMesh) return;
      const glass = o.material.name === 'NH_sklo';
      o.material = o.material.clone();
      o.material.userData.glass = glass;
      fitMats.add(o.material);
    });
    // rozvody v rentgenu výraznější: lehce svítí vlastní barvou
    layers.L_rozvody?.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.emissive = o.material.color.clone().multiplyScalar(0.6); } });
    for (const name of ['L_rozvody', 'L_offgrid', 'L_tc']) if (layers[name]) layers[name].visible = false;
    scene.add(model);
    status.hidden = true;
    root.classList.add('ready');
    go('zvenku');
  }, e => { if (e.total) status.textContent = `Načítám 3D model… ${Math.round(e.loaded / e.total * 100)} %`; },
  () => { status.textContent = 'Model se nepodařilo načíst. Zkuste obnovit stránku.'; });

  root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => go(b.dataset.view)));
  // režim (Zvenku / Uvnitř / Bez střechy) ukáže svá místa a skočí na první z nich
  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-selected', x === b));
    root.querySelectorAll('.v3d-place').forEach(p => { p.hidden = p.dataset.for !== b.dataset.mode; });
    go(b.dataset.first);
  }));
  root.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    if (b.dataset.layer === 'xray') { setXray(on); setRoof(true); }
    else if (layers[b.dataset.layer]) { layers[b.dataset.layer].visible = on; render(); }
  }));
  resize();
}
