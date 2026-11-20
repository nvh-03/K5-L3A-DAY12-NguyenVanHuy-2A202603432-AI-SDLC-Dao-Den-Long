// Render 3D (Three.js) dùng lại lõi Simulation — cùng logic với headless.
// Hỗ trợ chuỗi 3 Đêm, dash, pause, Gió Lạc, Bùa Gió, HUD đầy đủ. Bảng màu chuẩn.
import * as THREE from 'three';
import { Simulation } from '../core/sim.js';
import { TUNING, buildNight, TICK_RATE } from '../core/config.js';

const DT = 1 / TICK_RATE;
const C = { sky: 0x0E1430, grass: 0x2F5D50, wood: 0x6B4A2F, lanternOn: 0xFFB347, lanternCore: 0xFFE9B0, lanternOff: 0x5B5F6E,
  moteCore: 0xFFF6C2, shade: 0x120A1A, shadeEdge: 0x7A3CFF, shadeStun: 0x3A3450, maya: 0xE8E2D0, scarf: 0xC8102E,
  drifter: 0x8FA3B8, charm: 0xC8102E, sea: 0x12384A };

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.sky);
scene.fog = new THREE.FogExp2(C.sky, 0.008);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
const hemi = new THREE.HemisphereLight(0x3a3a66, 0x05040a, 0.5);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambient);
const moon = new THREE.DirectionalLight(0x8899cc, 0.3); moon.position.set(30, 60, 20); scene.add(moon);

let worldGroup = new THREE.Group(); scene.add(worldGroup);
const playerMesh = makePlayer(); scene.add(playerMesh);
const lanternMeshes = new Map(), moteMeshes = new Map(), shadeMeshes = new Map(), drifterMeshes = new Map(), charmMeshes = new Map();

function disc(r, y, color, h = 1) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), new THREE.MeshStandardMaterial({ color, roughness: 0.95 })); m.position.y = y - h / 2; return m; }
function makePlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 12), new THREE.MeshStandardMaterial({ color: C.maya, emissive: 0x3a2a10, roughness: 0.6 }));
  body.position.y = 0.8; g.add(body);
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 16), new THREE.MeshStandardMaterial({ color: C.scarf })); scarf.position.y = 1.0; scarf.rotation.x = Math.PI / 2; g.add(scarf);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xC9B48A, roughness: 0.8 })); hat.position.y = 1.55; g.add(hat);
  const light = new THREE.PointLight(C.lanternOn, 2.2, 14, 1.6); light.position.set(0, 1.4, 0.5); g.add(light);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: C.lanternCore })); bulb.position.copy(light.position); g.add(bulb);
  return g;
}
function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 10), new THREE.MeshStandardMaterial({ color: C.wood })); post.position.y = 1.2; g.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: C.lanternOff, emissive: 0x120a18, roughness: 0.5 })); globe.position.y = 2.6; g.add(globe);
  const light = new THREE.PointLight(C.lanternOn, 0, 18, 1.6); light.position.y = 2.6; g.add(light);
  g.userData = { globe, light }; return g;
}
function makeMote(kind) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: kind === 'dropped' ? 0xFFE58A : C.moteCore })); m.add(new THREE.PointLight(0xFFE58A, 0.5, 3, 2)); return m; }
function makeShade() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: C.shade, emissive: C.shadeEdge, emissiveIntensity: 0.4, roughness: 0.4, transparent: true, opacity: 0.9 })); b.position.y = 0.9; g.add(b); g.userData = { b }; return g; }
function makeDrifter() { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 1.6), new THREE.MeshStandardMaterial({ color: C.drifter, emissive: 0x223344 })); m.position.y = 1.2; return m; }
function makeCharm() { const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: C.charm, emissive: 0x550000 })); m.add(new THREE.PointLight(0xF2C14E, 0.8, 4, 2)); m.position.y = 0.6; return m; }

function buildWorldMeshes(night) {
  worldGroup.clear();
  const add = (m) => worldGroup.add(m);
  if (night === 1) { add(disc(40, 0, C.grass)); }
  else if (night === 2) {
    const a = disc(28, 0, C.grass); const b = disc(28, 0, C.grass); b.position.x = 70; add(a); add(b);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 4), new THREE.MeshStandardMaterial({ color: C.wood })); bridge.position.set(35, -0.2, 0); add(bridge);
  } else {
    add(disc(45, 0, C.grass));
    const ring = new THREE.Mesh(new THREE.RingGeometry(12, 24, 48, 1, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x27503f, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = 3; add(ring);
    add(disc(8, 6, 0x2a4a3f, 0.3));
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), new THREE.MeshStandardMaterial({ color: C.wood })); tower.position.y = 10; add(tower);
  }
}

// ---------- Input ----------
const held = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false };
const keys = {}; let camYaw = 0;
addEventListener('keydown', (e) => { keys[e.code] = true; if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => { keys[e.code] = false; });
function readInput() {
  if (keys['ArrowLeft']) camYaw += 1.8 * DT; if (keys['ArrowRight']) camYaw -= 1.8 * DT;
  let x = 0, z = 0; if (keys['KeyW']) z += 1; if (keys['KeyS']) z -= 1; if (keys['KeyD']) x += 1; if (keys['KeyA']) x -= 1;
  held.move = [x, z]; held.cam_yaw_deg = (camYaw * 180) / Math.PI;
  held.jump = !!keys['Space']; held.interact = !!keys['KeyE']; held.pulse = !!keys['KeyQ'];
  held.dash = !!(keys['ShiftLeft'] || keys['ShiftRight']); held.pause = !!(keys['Escape'] || keys['KeyP']);
}

// ---------- State máy chuỗi Đêm ----------
let sim, night = 1, totalScore = 0, mode = 'intro', acc = 0, lastT = 0;
const NIGHT_NAMES = { 1: 'Đảo Bến', 2: 'Đảo Cau', 3: 'Đảo Chuông' };
const ONGDANG = { 1: '“Thắp lại ánh đèn đầu tiên, Mây nhé.”', 2: '“Hai đảo nối cầu — cẩn thận Gió Lạc cướp đèn.”', 3: '“Đêm cuối. Gió lớn trên Đảo Chuông, giữ vững ngọn lửa.”' };

function startNight(n) {
  night = n; buildWorldMeshes(n);
  sim = new Simulation({ seed: (Date.now() & 0x7fffffff) || 1, night: n });
  for (const map of [lanternMeshes, moteMeshes, shadeMeshes, drifterMeshes, charmMeshes]) { for (const [, g] of map) scene.remove(g); map.clear(); }
  camYaw = 0; acc = 0; mode = 'play'; document.getElementById('overlay').style.display = 'none'; sync();
}
function showIntro(n) {
  mode = 'intro';
  document.getElementById('ov-title').textContent = 'Đêm ' + n + ' — ' + NIGHT_NAMES[n];
  document.getElementById('ov-sub').textContent = ONGDANG[n];
  document.getElementById('ov-score').textContent = '';
  const btn = document.getElementById('ov-btn'); btn.textContent = 'Vào Đêm ' + n;
  document.getElementById('overlay').style.display = 'flex';
}
function endNight() {
  const won = sim.status === 'won';
  if (won) { totalScore += sim.scoreValue; }
  if (won && night === 3) {
    mode = 'dawn';
    document.getElementById('ov-title').textContent = 'Bình Minh ☀️';
    document.getElementById('ov-sub').textContent = 'Mây đã thắp sáng cả ba hòn đảo.';
    document.getElementById('ov-score').textContent = 'Tổng điểm: ' + totalScore;
    document.getElementById('ov-btn').textContent = 'Chơi lại từ Đêm 1';
  } else if (won) {
    showIntro(night + 1); document.getElementById('ov-score').textContent = 'Điểm Đêm ' + night + ': ' + sim.scoreValue;
    mode = 'intro-next';
  } else {
    mode = 'lost';
    document.getElementById('ov-title').textContent = 'Thua 🌑 — Đêm ' + night;
    document.getElementById('ov-sub').textContent = sim.player.flames <= 0 ? 'Hết ngọn lửa.' : 'Trời sáng mà đèn chưa đủ.';
    document.getElementById('ov-score').textContent = '';
    document.getElementById('ov-btn').textContent = 'Chơi lại Đêm ' + night;
  }
  document.getElementById('overlay').style.display = 'flex';
}
document.getElementById('ov-btn').addEventListener('click', () => {
  if (mode === 'intro') startNight(night);
  else if (mode === 'intro-next') startNight(night + 1);
  else if (mode === 'dawn') { totalScore = 0; night = 1; showIntro(1); }
  else if (mode === 'lost') startNight(night);
});

// ---------- Sync ----------
function sync() {
  for (const L of sim.lanterns) { let g = lanternMeshes.get(L.id); if (!g) { g = makeLantern(); scene.add(g); lanternMeshes.set(L.id, g); } g.position.set(L.pos[0], L.pos[1], L.pos[2]); g.userData.light.intensity = L.lit ? 3.2 : 0; g.userData.globe.material.emissive.setHex(L.lit ? C.lanternOn : 0x120a18); g.userData.globe.material.color.setHex(L.lit ? C.lanternCore : C.lanternOff); }
  const ids = new Set();
  for (const m of sim.motes) { if (!m.active) continue; ids.add(m.id); let mesh = moteMeshes.get(m.id); if (!mesh) { mesh = makeMote(m.kind); scene.add(mesh); moteMeshes.set(m.id, mesh); } mesh.position.set(m.pos[0], m.pos[1] + 0.5, m.pos[2]); }
  for (const [id, mesh] of moteMeshes) if (!ids.has(id)) { scene.remove(mesh); moteMeshes.delete(id); }
  const sid = new Set();
  for (const s of sim.shades) { sid.add(s.id); let g = shadeMeshes.get(s.id); if (!g) { g = makeShade(); scene.add(g); shadeMeshes.set(s.id, g); } g.position.set(s.pos[0], s.pos[1], s.pos[2]); g.userData.b.material.opacity = (s.state === 'stunned') ? 0.4 : 0.9; g.userData.b.material.color.setHex(s.state === 'stunned' ? C.shadeStun : C.shade); }
  for (const [id, g] of shadeMeshes) if (!sid.has(id)) { scene.remove(g); shadeMeshes.delete(id); }
  const did = new Set();
  for (const d of sim.drifters) { if (d.state === 'removed') continue; did.add(d.id); let g = drifterMeshes.get(d.id); if (!g) { g = makeDrifter(); scene.add(g); drifterMeshes.set(d.id, g); } g.position.set(d.pos[0], d.pos[1] + 1.2, d.pos[2]); }
  for (const [id, g] of drifterMeshes) if (!did.has(id)) { scene.remove(g); drifterMeshes.delete(id); }
  for (const c of sim.charms) { let g = charmMeshes.get(c.id); if (!g) { g = makeCharm(); scene.add(g); charmMeshes.set(c.id, g); } g.position.set(c.pos[0], c.pos[1] + 0.6, c.pos[2]); g.visible = c.available; }
  const total = sim.lanterns.length, lit = sim.lanterns.filter((l) => l.lit).length;
  ambient.intensity = 0.15 + 0.55 * (lit / total);
}
function updateCamera() { const p = sim.player.pos; const fx = Math.sin(camYaw), fz = Math.cos(camYaw); camera.position.set(p[0] - fx * 11, p[1] + 7, p[2] - fz * 11); camera.lookAt(p[0], p[1] + 1, p[2]); playerMesh.position.set(p[0], p[1], p[2]); playerMesh.rotation.y = Math.atan2(fx, fz); }
function updateHUD() {
  const el = (i) => document.getElementById(i); const p = sim.player;
  el('hud-flames').textContent = '🔥 ' + p.flames;
  const total = sim.lanterns.length, lit = sim.lanterns.filter((l) => l.lit).length;
  el('hud-night').textContent = 'Đêm ' + sim.night; el('hud-lanterns').textContent = '🏮 ' + lit + '/' + total; el('hud-score').textContent = sim.scoreValue + ' điểm';
  const tl = Math.max(0, sim.timeLeft); const mm = String(Math.floor(tl / 60)).padStart(2, '0'); const ss = String(Math.floor(tl % 60)).padStart(2, '0');
  const clock = el('clock'); clock.textContent = mm + ':' + ss; clock.classList.toggle('danger', tl <= 30);
  const bar = el('motebar'); if (bar.children.length !== TUNING.carry_capacity) { bar.innerHTML = ''; for (let i = 0; i < TUNING.carry_capacity; i++) bar.appendChild(document.createElement('i')); }
  [...bar.children].forEach((c, i) => c.className = i < p.carried ? 'on' : '');
  el('hud-dash').textContent = p.dash_cd_s > 0 ? 'Lướt ' + p.dash_cd_s.toFixed(1) + 's' : 'Lướt ✔';
  el('hud-pulse').textContent = p.pulse_cd_s > 0 ? 'Tỏa ' + p.pulse_cd_s.toFixed(1) + 's' : 'Tỏa ✔';
  const charm = el('hud-charm'); charm.style.display = p.charm_s > 0 ? 'inline-block' : 'none'; charm.textContent = '🍃 Bùa ' + p.charm_s.toFixed(0) + 's';
}
function resize() { const w = app.clientWidth, h = app.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);

let pausedPrev = false;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now;
  if (mode === 'play') {
    acc += dt;
    while (acc >= DT) { readInput(); sim.step(held); acc -= DT; if (sim.status !== 'playing') { mode = 'ending'; break; } }
    sync(); updateCamera(); updateHUD();
    if (mode === 'ending') endNight();
  }
  renderer.render(scene, camera);
}
showIntro(1); resize(); requestAnimationFrame(loop);
