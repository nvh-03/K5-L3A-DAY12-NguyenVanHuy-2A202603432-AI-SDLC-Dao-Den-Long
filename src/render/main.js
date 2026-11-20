// Render 3D (Three.js) dùng lại chính lõi Simulation — cùng logic với headless.
import * as THREE from 'three';
import { Simulation } from '../core/sim.js';
import { WORLD } from '../core/config.js';

const DT = 1 / WORLD.tick_rate;
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
app.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);
scene.fog = new THREE.FogExp2(0x0a0a18, 0.012);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
scene.add(new THREE.HemisphereLight(0x3a3a66, 0x05040a, 0.5));
const moon = new THREE.DirectionalLight(0x8899cc, 0.35); moon.position.set(20, 40, 10); scene.add(moon);

const island = new THREE.Mesh(new THREE.CylinderGeometry(WORLD.island_radius, WORLD.island_radius, 1, 64), new THREE.MeshStandardMaterial({ color: 0x1d2340, roughness: 0.95 }));
island.position.y = -0.5; scene.add(island);
const rim = new THREE.Mesh(new THREE.RingGeometry(WORLD.island_radius, WORLD.island_radius + 8, 64), new THREE.MeshBasicMaterial({ color: 0x2a1840, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }));
rim.rotation.x = -Math.PI / 2; rim.position.y = 0.02; scene.add(rim);

function makePlayer() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 12), new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0x3a2a10, roughness: 0.6 })); body.position.y = 0.8; g.add(body);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0xc9a24a, roughness: 0.8 })); hat.position.y = 1.55; g.add(hat);
  const light = new THREE.PointLight(0xffb24a, 2.2, 14, 1.6); light.position.set(0, 1.4, 0.5); g.add(light);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffcf6a })); bulb.position.copy(light.position); g.add(bulb);
  return g;
}
const playerMesh = makePlayer(); scene.add(playerMesh);
const lanternMeshes = new Map(), moteMeshes = new Map(), shadeMeshes = new Map();

function makeLantern() {
  const g = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 10), new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 0.9 })); post.position.y = 1.2; g.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0x3a2a40, emissive: 0x120a18, roughness: 0.5 })); globe.position.y = 2.6; g.add(globe);
  const light = new THREE.PointLight(0xffb24a, 0, 16, 1.6); light.position.y = 2.6; g.add(light);
  g.userData = { globe, light }; return g;
}
function makeMote() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xaef0b0 })); m.add(new THREE.PointLight(0x9ff0a0, 0.6, 3, 2)); return m; }
function makeShade() { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a0f2e, emissive: 0x2a1048, roughness: 0.4, transparent: true, opacity: 0.9 })); b.position.y = 0.9; g.add(b); g.userData = { b }; return g; }

const held = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
const keys = {}; let camYaw = 0;
addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'KeyR') restart(); if (['ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
addEventListener('keyup', (e) => { keys[e.code] = false; });
function readInput() {
  if (keys['ArrowLeft']) camYaw += 1.8 * DT; if (keys['ArrowRight']) camYaw -= 1.8 * DT;
  let x = 0, z = 0; if (keys['KeyW']) z += 1; if (keys['KeyS']) z -= 1; if (keys['KeyD']) x += 1; if (keys['KeyA']) x -= 1;
  held.move = [x, z]; held.cam_yaw_deg = (camYaw * 180) / Math.PI;
  held.jump = !!keys['Space']; held.interact = !!keys['KeyE']; held.pulse = !!keys['KeyQ'];
}

let sim, acc = 0, lastT = 0, over = false;
function syncMeshes() {
  for (const L of sim.lanterns) { let g = lanternMeshes.get(L.id); if (!g) { g = makeLantern(); scene.add(g); lanternMeshes.set(L.id, g); } g.position.set(L.pos[0], 0, L.pos[2]); g.userData.light.intensity = L.lit ? 3.2 : 0; g.userData.globe.material.emissive.setHex(L.lit ? 0xffb24a : 0x120a18); g.userData.globe.material.color.setHex(L.lit ? 0xffd98a : 0x3a2a40); }
  const ids = new Set();
  for (const m of sim.motes) { if (!m.active) continue; ids.add(m.id); let mesh = moteMeshes.get(m.id); if (!mesh) { mesh = makeMote(); scene.add(mesh); moteMeshes.set(m.id, mesh); } mesh.position.set(m.pos[0], 0.6, m.pos[2]); }
  for (const [id, mesh] of moteMeshes) if (!ids.has(id)) { scene.remove(mesh); moteMeshes.delete(id); }
  const sid = new Set();
  for (const s of sim.shades) { sid.add(s.id); let g = shadeMeshes.get(s.id); if (!g) { g = makeShade(); scene.add(g); shadeMeshes.set(s.id, g); } g.position.set(s.pos[0], 0, s.pos[2]); g.userData.b.material.opacity = s.state === 'stunned' ? 0.35 : 0.9; }
  for (const [id, g] of shadeMeshes) if (!sid.has(id)) { scene.remove(g); shadeMeshes.delete(id); }
}
function updateCamera() { const p = sim.player.pos; const fx = Math.sin(camYaw), fz = Math.cos(camYaw); camera.position.set(p[0] - fx * 10, p[1] + 6, p[2] - fz * 10); camera.lookAt(p[0], p[1] + 1, p[2]); playerMesh.position.set(p[0], p[1], p[2]); playerMesh.rotation.y = Math.atan2(fx, fz); }
function updateHUD() {
  const el = (i) => document.getElementById(i);
  el('hud-flames').textContent = '🔥 ' + sim.player.flames;
  el('hud-carried').textContent = '✨ ' + sim.player.carried + ' / ' + sim.tuning.carry_capacity;
  el('hud-lanterns').textContent = '🏮 ' + sim.lanterns.filter((l) => l.lit).length + ' / ' + sim.lanterns.length;
  el('hud-score').textContent = 'Điểm ' + sim.scoreValue;
  el('hud-time').textContent = '⏳ ' + Math.max(0, Math.ceil(sim.timeLeft)) + 's';
  el('hud-pulse').textContent = sim.pulseCooldown > 0 ? 'Pulse ' + sim.pulseCooldown.toFixed(1) + 's' : (sim.player.carried >= sim.tuning.pulse_cost ? 'Pulse sẵn sàng' : 'Thiếu ✨ để pulse');
}
function showOverlay() {
  over = true; const won = sim.status === 'won';
  document.getElementById('ov-title').textContent = won ? 'Thắng! 🏮' : 'Thua 🌑';
  document.getElementById('ov-sub').textContent = won ? 'Mây đã thắp sáng cả đảo.' : 'Màn đêm đã nuốt chửng ánh đèn.';
  document.getElementById('ov-score').textContent = 'Điểm: ' + sim.scoreValue;
  document.getElementById('overlay').style.display = 'flex';
}
function restart() {
  document.getElementById('overlay').style.display = 'none'; over = false; acc = 0; camYaw = 0;
  sim = new Simulation({ seed: (Date.now() & 0x7fffffff) || 1 });
  for (const map of [lanternMeshes, moteMeshes, shadeMeshes]) { for (const [, g] of map) scene.remove(g); map.clear(); }
  syncMeshes();
}
function resize() { const w = app.clientWidth, h = app.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize);
document.getElementById('ov-restart').addEventListener('click', restart);
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - lastT) / 1000 || 0); lastT = now;
  if (!over) {
    acc += dt;
    while (acc >= DT) { readInput(); sim.step(held); acc -= DT; if (sim.status !== 'playing') { syncMeshes(); updateHUD(); showOverlay(); break; } }
    syncMeshes(); updateCamera(); updateHUD();
  }
  renderer.render(scene, camera);
}
restart(); resize(); requestAnimationFrame(loop);
