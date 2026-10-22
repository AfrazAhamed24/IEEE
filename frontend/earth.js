// earth.js — cinematic intelligence-platform globe
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as satellite from 'satellite.js';

const CONTAINER_ID = 'earth-canvas-container';
const container = document.getElementById(CONTAINER_ID);

if (container) {
  initEarth(container).catch(console.error);
}

export async function initEarth(container, options = {}) {
  const EARTH_KM = 6371;
  const DEG = Math.PI / 180;
  const TEX = 'https://threejs.org/examples/textures/planets/';
  const DEBRIS_COUNT = 1500;
  const RING_SEGMENTS = 180;
  const ARC_SEGMENTS = 64;
  const timeScale = options.timeScale ?? 1;

  const DEFAULT_TLES = [
    { name: 'ISS (ZARYA)', l1: '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927', l2: '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537' },
    { name: 'DEMO-POLAR', l1: '1 90001U 98067B   08264.51782528  .00000000  00000-0  00000-0 0  0009', l2: '2 90001  98.2000  10.0000 0010000  90.0000 200.0000 14.80000000000100' },
    { name: 'DEMO-MEO', l1: '1 90002U 98067C   08264.51782528  .00000000  00000-0  00000-0 0  0001', l2: '2 90002  55.0000 120.0000 0010000  45.0000 100.0000  8.20000000000100' },
  ];
  const tleList = options.tles ?? window.earthTLEs ?? DEFAULT_TLES;

  const dom = { w: container.clientWidth || window.innerWidth, h: container.clientHeight || window.innerHeight };

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(dom.w, dom.h);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000004);

  const camera = new THREE.PerspectiveCamera(40, dom.w / dom.h, 0.01, 300);
  camera.position.set(0, 0.9, 3.3);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.5;
  controls.maxDistance = 10;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(dom.w, dom.h), 0.8, 0.4, 0.85));
  composer.addPass(new OutputPass());

  scene.add(new THREE.AmbientLight(0xffffff, 0.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 3, far: 9 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = (file, srgb) =>
    loader.loadAsync(TEX + file).then((t) => {
      t.anisotropy = aniso;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }).catch((err) => { console.warn('[earth] texture failed:', file, err); return null; });

  const [tAtmos, tNormal, tSpec, tClouds, tLights] = await Promise.all([
    load('earth_atmos_2048.jpg', true), load('earth_normal_2048.jpg', false),
    load('earth_specular_2048.jpg', false), load('earth_clouds_1024.png', true),
    load('earth_lights_2048.png', true),
  ]);

  function buildRoughnessMap(tex) {
    if (!tex?.image) return null;
    try {
      const img = tex.image;
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        const v = (0.28 + 0.62 * (1 - px[i] / 255)) * 255;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      g.putImageData(d, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = aniso;
      return t;
    } catch (e) { return null; }
  }
  const roughMap = buildRoughnessMap(tSpec);

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const earthMat = new THREE.MeshStandardMaterial({
    map: tAtmos, normalMap: tNormal, normalScale: new THREE.Vector2(1.1, 1.1),
    roughnessMap: roughMap, roughness: roughMap ? 1 : 0.7, metalness: 0.0,
    emissiveMap: tLights, emissive: new THREE.Color(0xffffff), emissiveIntensity: 2.2, envMapIntensity: 0,
  });

  const sunViewDir = new THREE.Vector3(1, 0, 0);
  earthMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = { value: sunViewDir };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunDir;')
      .replace('#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance *= 1.0 - smoothstep(-0.25, 0.05, dot(normal, uSunDir));`);
  };

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMat);
  earth.receiveShadow = true;
  earthGroup.add(earth);

  const cloudMat = new THREE.MeshStandardMaterial({
    map: tClouds, transparent: true, alphaTest: 0.1, depthWrite: false, roughness: 1, metalness: 0, opacity: 0.9,
  });
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), cloudMat);
  clouds.castShadow = true;
  earthGroup.add(clouds);

  const atmoMat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(0x3b82f6) } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColor; varying vec3 vN; void main(){ float i = clamp(pow(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 3.0), 0.0, 1.0); gl_FragColor = vec4(uColor * i * 1.3, i); }`,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.09, 64, 64), atmoMat));

  {
    const n = 2500, p = new Float32Array(n * 3), v = new THREE.Vector3();
    for (let i = 0; i < n; i++) v.randomDirection().multiplyScalar(80 + Math.random() * 20).toArray(p, i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8f9bbd, size: 1.1, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false })));
  }

  const eciToScene = (p, out, k = 1 / EARTH_KM) => out.set(p.x * k, p.z * k, -p.y * k);
  const latLonToLocal = (lat, lon, r, out) => {
    const la = lat * DEG, lo = lon * DEG;
    return out.set(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
  };
  const sunDir = new THREE.Vector3();
  function updateSun(date) {
    const d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
    const L = (280.46 + 0.9856474 * d) * DEG;
    const g = (357.528 + 0.9856003 * d) * DEG;
    const lam = L + (1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * DEG;
    const eps = 23.439 * DEG;
    const x = Math.cos(lam), y = Math.cos(eps) * Math.sin(lam), z = Math.sin(eps) * Math.sin(lam);
    sunDir.set(x, z, -y).normalize();
    sun.position.copy(sunDir).multiplyScalar(6);
  }

  const satGeo = { body: new THREE.BoxGeometry(0.5, 0.5, 0.8), panel: new THREE.BoxGeometry(1.5, 0.02, 0.55) };
  const satMat = {
    body: new THREE.MeshStandardMaterial({ color: 0xffc94d, metalness: 0.9, roughness: 0.3, envMap: envTex, envMapIntensity: 0.9, emissive: 0x3a2a00 }),
    panel: new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.35, envMap: envTex, envMapIntensity: 0.8, emissive: 0x0a1f66 }),
  };
  const ringMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.2, depthWrite: false });

  function buildSatelliteModel() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(satGeo.body, satMat.body));
    const l = new THREE.Mesh(satGeo.panel, satMat.panel); l.position.x = -1.05;
    const r = new THREE.Mesh(satGeo.panel, satMat.panel); r.position.x = 1.05;
    g.add(l, r);
    g.scale.setScalar(0.028);
    return g;
  }

  const sats = [];
  const t0 = Date.now();
  for (const t of tleList) {
    let rec;
    try { rec = satellite.twoline2satrec(t.l1, t.l2); } catch { continue; }
    const s = { name: t.name, rec, pos: new THREE.Vector3(), vel: new THREE.Vector3(1, 0, 0), ok: false };
    s.group = buildSatelliteModel();
    scene.add(s.group);

    const periodMin = (2 * Math.PI) / (rec.no ?? rec.no_kozai);
    const pts = [], tmp = new THREE.Vector3();
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const pv = satellite.propagate(rec, new Date(t0 + (i / RING_SEGMENTS) * periodMin * 60000));
      if (!pv || !pv.position || typeof pv.position === 'boolean') continue;
      pts.push(eciToScene(pv.position, tmp).clone());
    }
    if (pts.length > 2) {
      pts.push(pts[0].clone());
      s.ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat);
      s.ring.frustumCulled = false;
      scene.add(s.ring);
    }
    sats.push(s);
  }

  const _m = new THREE.Matrix4(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  function propagateSat(s, date) {
    const pv = satellite.propagate(s.rec, date);
    if (!pv || !pv.position || typeof pv.position === 'boolean' || !pv.velocity) { s.ok = false; s.group.visible = false; return; }
    s.ok = true; s.group.visible = true;
    eciToScene(pv.position, s.pos);
    eciToScene(pv.velocity, s.vel, 1).normalize();
    s.group.position.copy(s.pos);
    _z.copy(s.pos).normalize().negate();
    _x.crossVectors(_z, s.vel).normalize();
    _y.crossVectors(_z, _x);
    s.group.quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));
  }

  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.45, envMap: envTex, envMapIntensity: 0.7, flatShading: true });
  const debris = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), debrisMat, DEBRIS_COUNT);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debris.frustumCulled = false;
  scene.add(debris);

  const dU = new Float32Array(DEBRIS_COUNT * 3), dV = new Float32Array(DEBRIS_COUNT * 3);
  const dR = new Float32Array(DEBRIS_COUNT), dA = new Float32Array(DEBRIS_COUNT), dW = new Float32Array(DEBRIS_COUNT);
  const dRot = new Float32Array(DEBRIS_COUNT * 3), dSpin = new Float32Array(DEBRIS_COUNT * 3), dScale = new Float32Array(DEBRIS_COUNT * 3);
  {
    const n = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), rnd = new THREE.Vector3();
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      n.randomDirection();
      u.crossVectors(n, rnd.randomDirection()).normalize();
      v.crossVectors(n, u);
      u.toArray(dU, i * 3); v.toArray(dV, i * 3);
      dR[i] = 1.08 + Math.pow(Math.random(), 1.4) * 0.42;
      dA[i] = Math.random() * Math.PI * 2;
      dW[i] = (0.12 + Math.random() * 0.1) * Math.pow(dR[i], -1.5) * (Math.random() < 0.5 ? -1 : 1);
      const s = 0.006 + Math.random() * 0.01;
      dScale[i * 3] = s * (0.5 + Math.random()); dScale[i * 3 + 1] = s * (0.4 + Math.random() * 1.6); dScale[i * 3 + 2] = s * (0.4 + Math.random());
      for (let k = 0; k < 3; k++) { dRot[i * 3 + k] = Math.random() * 6.28; dSpin[i * 3 + k] = (Math.random() - 0.5) * 2.5; }
    }
  }
  const dummy = new THREE.Object3D();
  function updateDebris(dt) {
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      const a = (dA[i] += dW[i] * dt), c = Math.cos(a) * dR[i], s = Math.sin(a) * dR[i], i3 = i * 3;
      dummy.position.set(dU[i3] * c + dV[i3] * s, dU[i3 + 1] * c + dV[i3 + 1] * s, dU[i3 + 2] * c + dV[i3 + 2] * s);
      dummy.rotation.set(dRot[i3] += dSpin[i3] * dt, dRot[i3 + 1] += dSpin[i3 + 1] * dt, dRot[i3 + 2] += dSpin[i3 + 2] * dt);
      dummy.scale.set(dScale[i3], dScale[i3 + 1], dScale[i3 + 2]);
      dummy.updateMatrix();
      debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
  }

  const latOf = (o) => Number(o.lat ?? o.latitude ?? o.location?.lat ?? o.location?.latitude ?? o.coords?.lat);
  const lonOf = (o) => Number(o.lon ?? o.lng ?? o.longitude ?? o.location?.lon ?? o.location?.lng ?? o.location?.longitude ?? o.coords?.lon ?? o.coords?.lng);

  const dotGeo = new THREE.SphereGeometry(1, 10, 10);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  let dots = null, obsList = [], dotLocal = [];
  let thermal = false;

  function writeDots() {
    if (!dots) return;
    const scale = thermal ? 0.017 : 0.011;
    const col = new THREE.Color();
    if (thermal) col.setRGB(9, 3.0, 0.35);
    else col.setRGB(3.2, 0.12, 0.08);
    for (let i = 0; i < dotLocal.length; i++) {
      dummy.position.copy(dotLocal[i]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      dots.setMatrixAt(i, dummy.matrix);
      dots.setColorAt(i, col);
    }
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  }

  function setObservations(list) {
    if (dots) { earthGroup.remove(dots); dots.dispose(); dots = null; }
    obsList = []; dotLocal = [];
    for (const o of Array.isArray(list) ? list : []) {
      const lat = latOf(o), lon = lonOf(o);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      obsList.push(o);
      dotLocal.push(latLonToLocal(lat, lon, 1.006, new THREE.Vector3()));
    }
    if (!obsList.length) return;
    dots = new THREE.InstancedMesh(dotGeo, dotMat, obsList.length);
    earthGroup.add(dots);
    writeDots();
  }
  setObservations(options.observations ?? window.earthObservations ?? window.climateObservations ?? []);
  const onObsData = (e) => setObservations(e.detail);
  window.addEventListener('earth-obs-data', onObsData);

  const arcPositions = new Float32Array((ARC_SEGMENTS + 1) * 3);
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPositions, 3));
  arcGeo.setDrawRange(0, 0);
  const arcMat = new THREE.LineBasicMaterial({ color: 0xff2222, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const arc = new THREE.Line(arcGeo, arcMat);
  arc.frustumCulled = false; arc.visible = false;
  scene.add(arc);

  const tipMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  tipMat.color.setRGB(8, 0.5, 0.3);
  const tip = new THREE.Mesh(dotGeo, tipMat);
  tip.visible = false;
  scene.add(tip);

  let threat = null;
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _mid = new THREE.Vector3();

  function fireThreat(idx) {
    _b.copy(dotLocal[idx]); earthGroup.localToWorld(_b);
    let best = -1, bd = Infinity;
    sats.forEach((s, i) => { if (!s.ok) return; const d = s.pos.distanceToSquared(_b); if (d < bd) { bd = d; best = i; } });
    if (best < 0) return;
    threat = { idx, si: best, progress: 0 };
    arc.visible = tip.visible = true;
  }

  function updateThreat(dt, time) {
    if (!threat) return;
    const s = sats[threat.si];
    if (!s?.ok) return;
    _a.copy(s.pos);
    _b.copy(dotLocal[threat.idx]); earthGroup.localToWorld(_b);
    _mid.addVectors(_a, _b).multiplyScalar(0.5);
    _mid.addScaledVector(_mid.clone().normalize(), 0.06 + _a.distanceTo(_b) * 0.15);
    for (let i = 0; i <= ARC_SEGMENTS; i++) {
      const t = i / ARC_SEGMENTS, u = 1 - t;
      arcPositions[i * 3]     = u * u * _a.x + 2 * u * t * _mid.x + t * t * _b.x;
      arcPositions[i * 3 + 1] = u * u * _a.y + 2 * u * t * _mid.y + t * t * _b.y;
      arcPositions[i * 3 + 2] = u * u * _a.z + 2 * u * t * _mid.z + t * t * _b.z;
    }
    arcGeo.attributes.position.needsUpdate = true;
    threat.progress = Math.min(1, threat.progress + dt * 1.8);
    arcGeo.setDrawRange(0, Math.max(2, Math.floor(threat.progress * (ARC_SEGMENTS + 1))));
    const pulse = 0.75 + 0.25 * Math.sin(time * 9);
    arcMat.color.setRGB(7 * pulse, 0.35, 0.25);
    tip.position.copy(_b);
    tip.scale.setScalar(0.014 * (1 + 0.5 * Math.sin(time * 9)));
    tip.visible = threat.progress >= 1;
  }

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const unitSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  const _hit = new THREE.Vector3();
  let downAt = null;

  const onDown = (e) => { downAt = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 5 || !dots) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(dots, false)[0];
    if (!hit || hit.instanceId == null) return;
    if (ray.ray.intersectSphere(unitSphere, _hit) && ray.ray.origin.distanceTo(_hit) < hit.distance - 0.03) return;
    const obs = obsList[hit.instanceId];
    window.dispatchEvent(new CustomEvent('earth-obs-select', { detail: obs }));
    fireThreat(hit.instanceId);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);

  function setThermal(on = !thermal) {
    thermal = !!on;
    earthMat.color.setHex(thermal ? 0x8a1a14 : 0xffffff);
    earthMat.emissive.setHex(thermal ? 0xff4010 : 0xffffff);
    cloudMat.color.setHex(thermal ? 0x661810 : 0xffffff);
    cloudMat.opacity = thermal ? 0.35 : 0.9;
    atmoMat.uniforms.uColor.value.setHex(thermal ? 0xff2a00 : 0x3b82f6);
    writeDots();
    return thermal;
  }

  let following = false, followIdx = 0;
  const camGoal = new THREE.Vector3(), lookGoal = new THREE.Vector3(), look = new THREE.Vector3(), radial = new THREE.Vector3();

  function setFollow(on = !following, index) {
    if (on) {
      const pick = index ?? (threat ? threat.si : sats.findIndex((s) => s.ok));
      if (pick < 0 || !sats[pick]?.ok) return following;
      followIdx = pick;
      following = true;
      controls.enabled = false;
      look.copy(controls.target);
    } else if (following) {
      following = false;
      camera.up.set(0, 1, 0);
      controls.target.set(0, 0, 0);
      camera.position.setLength(Math.max(3, Math.min(camera.position.length(), 8)));
      controls.enabled = true;
      controls.update();
    }
    return following;
  }

  function updateFollow(dt) {
    const s = sats[followIdx];
    if (!s?.ok) return;
    radial.copy(s.pos).normalize();
    camGoal.copy(s.pos).addScaledVector(s.vel, -0.11).addScaledVector(radial, 0.055);
    lookGoal.copy(s.pos).addScaledVector(radial, -0.05).addScaledVector(s.vel, 0.08);
    const k = 1 - Math.exp(-dt * 2.5);
    camera.position.lerp(camGoal, k);
    look.lerp(lookGoal, k);
    camera.up.lerp(radial, k).normalize();
    camera.lookAt(look);
  }

  const onResize = () => {
    const w = container.clientWidth || window.innerWidth, h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(container);

  const clock = new THREE.Clock();
  const _inv = new THREE.Matrix4();
  let simMs = Date.now();

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1);
    const time = clock.elapsedTime;
    simMs += dt * 1000 * timeScale;
    const date = new Date(simMs);

    earthGroup.rotation.y = satellite.gstime(date);
    clouds.rotation.y += dt * 0.004;
    updateSun(date);
    for (const s of sats) propagateSat(s, date);
    updateDebris(dt);
    updateThreat(dt, time);

    if (following) updateFollow(dt); else controls.update();

    camera.updateMatrixWorld();
    _inv.copy(camera.matrixWorld).invert();
    sunViewDir.copy(sunDir).transformDirection(_inv);

    composer.render();
  });

  // --- BIND TO YOUR EXISTING UI BUTTONS ---
  const myThermalBtn = document.getElementById('thermal-btn');
  if (myThermalBtn) {
      myThermalBtn.addEventListener('click', () => {
          const isThermal = setThermal();
          myThermalBtn.textContent = isThermal ? "🔥 THERMAL ACTIVE" : "🔥 THERMAL VIEW";
          myThermalBtn.style.background = isThermal ? "rgba(239, 68, 68, 0.5)" : "rgba(6, 182, 212, 0.1)";
      });
  }

  const myGevBtn = document.getElementById('cinematic-btn');
  if (myGevBtn) {
      myGevBtn.addEventListener('click', () => {
          const isFollowing = setFollow();
          if (isFollowing) {
              document.getElementById('gev-overlay').classList.remove('hidden');
          } else {
              document.getElementById('gev-overlay').classList.add('hidden');
          }
      });
  }

  const api = {
    scene, camera, renderer, controls,
    setThermal, setFollow, setObservations,
    get satellites() { return sats; },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener('earth-obs-data', onObsData);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.dispose();
      composer.dispose?.();
      scene.traverse((o) => { o.geometry?.dispose?.(); });
      renderer.dispose();
      canvas.remove();
    },
  };
  window.earthControls = api;
  return api;
}

export default initEarth;
