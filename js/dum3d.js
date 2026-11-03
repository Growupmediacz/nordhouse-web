// 3D prohlížeč domu: pohled zvenku, procházka uvnitř, řez bez střechy, rentgen s rozvody.
// Model (GLB z lib/export_web.py) má vrstvy L_dum, L_strecha, L_obal, L_rozvody, L_offgrid, L_tc.
// Souřadnice: Blender (x podél domu, y napříč, z nahoru, metry) → three.js (x, z, −y).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const B = (x, y, z) => new THREE.Vector3(x, z, -y);

// Kresba prken a dřeva na plátně: model má UV v metrech (krabicová projekce), dlaždice = celý počet prken.
// across: 'u' = prkna se střídají podél u (svislý obklad), 'v' = podél v (podlaha, terasa).
function boards(hex, width, across, opt = {}) {
  const n = Math.max(1, Math.round(1 / width)), tile = n * width, S = 1024;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), base = new THREE.Color('#' + hex).multiplyScalar(opt.light ?? 1);
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const bw = S / n;
  for (let i = 0; i < n; i++) {
    const k = 1 + (rnd() - 0.5) * (opt.vary ?? 0.16);
    const col = base.clone().multiplyScalar(k);
    g.fillStyle = '#' + col.getHexString();
    across === 'u' ? g.fillRect(i * bw, 0, bw, S) : g.fillRect(0, i * bw, S, bw);
    if (opt.grain !== 0) {   // léta: jemné vlnité čáry podél prkna
      g.strokeStyle = `rgba(60,35,15,${opt.grain ?? 0.10})`; g.lineWidth = 1.2;
      for (let j = 0; j < 9; j++) {
        const off = rnd() * bw, amp = 2 + rnd() * 5, f = 2 + rnd() * 4, ph = rnd() * 6;
        g.beginPath();
        for (let t = 0; t <= S; t += 16) {
          const a = i * bw + off + Math.sin(t / S * f * Math.PI + ph) * amp;
          across === 'u' ? (t ? g.lineTo(a, t) : g.moveTo(a, t)) : (t ? g.lineTo(t, a) : g.moveTo(t, a));
        }
        g.stroke();
      }
    }
    g.fillStyle = `rgba(20,14,8,${opt.gap ?? 0.55})`;   // spára
    across === 'u' ? g.fillRect(i * bw, 0, opt.gapPx ?? 3, S) : g.fillRect(0, i * bw, S, opt.gapPx ?? 3);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.anisotropy = 8;
  return t;
}
const LOOK = {
  NH_fasada: m => ({ map: boards(m, 0.14, 'u', { light: 1.3 }), roughness: 0.8 }),
  NH_terasa: m => ({ map: boards(m, 0.145, 'v'), roughness: 0.85 }),
  NH_obklad: m => ({ map: boards(m, 0.12, 'u', { grain: 0.06, gap: 0.25, vary: 0.08 }), roughness: 0.6 }),
  NH_obklad_tmavy: m => ({ map: boards(m, 0.12, 'u', { grain: 0.07, gap: 0.3 }), roughness: 0.6 }),
  NH_podlaha: m => ({ map: boards(m, 0.19, 'v', { grain: 0.08, gap: 0.35 }), roughness: 0.5 }),
  NH_dvirka: m => ({ map: boards(m, 0.6, 'u', { grain: 0.05, gap: 0, vary: 0.04 }), roughness: 0.45 }),
  NH_nabytek: m => ({ map: boards(m, 0.6, 'u', { grain: 0.05, gap: 0, vary: 0.04 }), roughness: 0.5 }),
  NH_lepene: m => ({ map: boards(m, 0.04, 'v', { grain: 0.08, gap: 0.12, gapPx: 1 }), roughness: 0.6 }),
  NH_plech: m => ({ map: boards(m, 0.5, 'u', { grain: 0, gap: 0.6, gapPx: 6, vary: 0.02 }), roughness: 0.42, metalness: 0.35 }),
};

export function init(root, cfg) {
  const canvasWrap = root.querySelector('.v3d-canvas');
  const status = root.querySelector('.v3d-status');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasWrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfe5e0);
  scene.fog = new THREE.Fog(0xdfe5e0, 30, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x7d8a6a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff3df, 2.2);
  sun.position.set(-8, 14, 9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  sun.target.position.set(3, 0, -1.25);
  scene.add(sun, sun.target);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x9aa58a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // vnitřní světlo, aby interiér nebyl tmavý
  const lamp = new THREE.PointLight(0xffe9cc, 6, 9, 1.4);
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
    obyvak: { pos: B(0.55, 0.95, 2.3), tgt: B(4.2, 1.2, 1.95), inside: true, roof: true },
    kuchyn: { pos: B(4.35, 1.25, 2.4), tgt: B(0.2, 1.0, 1.9), inside: true, roof: true },
    koupelna: { pos: B(4.9, 1.6, 2.32), tgt: B(5.7, 0.5, 1.5), inside: true, roof: true },
  };
  let anim = null;
  function go(name) {
    const v0 = views[name];
    setRoof(v0.roof || state.xray);
    // zvenku: na úzkém (mobilním) displeji kamera odstoupí, aby byl vidět celý dům
    const f = v0.inside ? 1 : Math.max(1, Math.pow(1.45 / camera.aspect, 0.55));
    const v = { ...v0, pos: v0.tgt.clone().add(v0.pos.clone().sub(v0.tgt).multiplyScalar(f)) };
    const from = { p: camera.position.clone(), t: controls.target.clone() };
    // uvnitř se rozhlíží z místa: cíl těsně před kamerou
    const tgt = v.inside ? v.pos.clone().add(v.tgt.clone().sub(v.pos).normalize().multiplyScalar(0.05)) : v.tgt.clone();
    controls.minDistance = v.inside ? 0.01 : 2.5;
    controls.maxDistance = v.inside ? 0.06 : 30;
    controls.enablePan = !v.inside;
    controls.rotateSpeed = v.inside ? -0.35 : 0.8;
    controls.maxPolarAngle = v.inside ? Math.PI : Math.PI / 2 - 0.03;
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
      if (o.isMesh && LOOK[o.material.name]) {
        const m = o.material, hex = m.color.getHexString();
        Object.assign(m, looks[m.name] ??= LOOK[m.name](hex));
        m.color.set(0xffffff);
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
  root.querySelectorAll('[data-layer]').forEach(b => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    if (b.dataset.layer === 'xray') { setXray(on); setRoof(true); }
    else if (layers[b.dataset.layer]) { layers[b.dataset.layer].visible = on; render(); }
  }));
  resize();
}
