import * as THREE from 'three';

import { TUNING } from '../core/config.js';

const C = { sky: 0x0e1430, grass: 0x2f5d50, wood: 0x6b4a2f, warm: 0xffb347, paper: 0xffe9b0 };
const LOW_FUEL = TUNING.low_fuel_threshold;
function disposeTree(root) {
  const resources = new Set();
  root.traverse(o => { if (o.geometry) resources.add(o.geometry); if (o.material) for (const m of [o.material].flat()) resources.add(m); });
  for (const r of resources) r.dispose();
  root.clear();
}
export class GameView {
  constructor(app) {
    this.app = app;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    // Same render quality for gameplay and benchmark, at native CSS resolution.
    this.renderer.setPixelRatio(1);
    app.append(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(C.sky);
    this.scene.fog = new THREE.FogExp2(C.sky, .008);
    this.camera = new THREE.PerspectiveCamera(60, 1, .1, 600);
    this.scene.add(new THREE.HemisphereLight(0x3a3a66, 0x05040a, .5));
    this.ambient = new THREE.AmbientLight(0xffffff, .15); this.scene.add(this.ambient);
    const moon = new THREE.DirectionalLight(0x8899cc, .3); moon.position.set(30, 60, 20); this.scene.add(moon);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.player = this.makePlayer(); this.scene.add(this.player);
    this.matrix = new THREE.Object3D(); this.color = new THREE.Color();
    this.motes = new THREE.InstancedMesh(new THREE.SphereGeometry(.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff6c2 }), 512);
    this.shades = new THREE.InstancedMesh(new THREE.SphereGeometry(.7, 16, 12), new THREE.MeshStandardMaterial({ color: 0x120a1a, emissive: 0x7a3cff, emissiveIntensity: .4, roughness: .4 }), 512);
    this.eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 6, 6), new THREE.MeshBasicMaterial({ color: 0x7a3cff }), 1024);
    this.drifters = new THREE.InstancedMesh(new THREE.BoxGeometry(.3, .3, 1.6), new THREE.MeshStandardMaterial({ color: 0x8fa3b8, emissive: 0x223344 }), 16);
    for (const mesh of [this.motes, this.shades, this.eyes, this.drifters]) { mesh.count = 0; mesh.frustumCulled = false; this.scene.add(mesh); }
    this.resize = () => { const w = app.clientWidth, h = app.clientHeight; this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); };
    addEventListener('resize', this.resize); this.resize();
    this.camera.position.set(0, 22, -40); this.camera.lookAt(0, 0, 0);
  }
  material(color) { return new THREE.MeshStandardMaterial({ color, roughness: .85 }); }
  makePlayer() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.4, .8, 4, 12), this.material(0xe8e2d0)); body.position.y = .8; g.add(body);
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(.42, .1, 8, 16), this.material(0xc8102e)); scarf.position.y = 1; scarf.rotation.x = Math.PI / 2; g.add(scarf);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(.7, .5, 16), this.material(0xc9b48a)); hat.position.y = 1.55; g.add(hat);
    const light = new THREE.PointLight(C.warm, 2.2, 14, 1.6); light.position.set(0, 1.4, .5); g.add(light);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 12), new THREE.MeshBasicMaterial({ color: C.paper })); bulb.position.copy(light.position); g.add(bulb);
    return g;
  }
  disc(r, y, color = C.grass, h = 1) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), this.material(color)); m.position.y = y - h / 2; return m; }
  build(night, obstacles = []) {
    disposeTree(this.world); this.lanterns = new Map(); this.charms = new Map();
    if (night === 1) this.world.add(this.disc(40, 0));
    else if (night === 2) {
      this.world.add(this.disc(28, 0)); const b = this.disc(28, 0); b.position.x = 70; this.world.add(b);
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, .4, 4), this.material(C.wood)); bridge.position.set(35, -.2, 0); this.world.add(bridge);
    } else {
      this.world.add(this.disc(45, 0), this.disc(8, 6, 0x2a4a3f, .3));
      this.buildTier1();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 8, 16), this.material(C.wood)); tower.position.y = 10; this.world.add(tower);
    }
    for (const obs of obstacles) {
      if (obs.type === 'tree') this.world.add(this.makeTree(obs));
      else if (obs.type === 'rock') this.world.add(this.makeRock(obs));
    }
  }
  // Tầng 1 Đêm 3 khớp geometry.js: vành khăn r 12–24 ở nửa z > 0, cao 3 m; hai dốc ở 30° và 150° từ r 30 (Y0) lên r 24 (Y3).
  buildTier1() {
    const deck = new THREE.Mesh(new THREE.RingGeometry(12, 24, 64, 1, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x27503f, side: THREE.DoubleSide }));
    deck.rotation.x = Math.PI / 2; deck.position.y = 3; this.world.add(deck); // quay +90°: nửa +Y của ring -> nửa +Z
    for (const r of [12, 24]) { // mép sàn dày 0.4 m (cylinder hở, thetaStart -90° phủ nửa z > 0)
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .4, 64, 1, true, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: C.wood, side: THREE.DoubleSide, roughness: .9 }));
      rim.position.y = 2.8; this.world.add(rim);
    }
    for (let i = 0; i < 7; i++) for (const r of [12.6, 23.4]) { // cột đỡ
      const a = Math.PI * (i + .5) / 7, post = new THREE.Mesh(new THREE.CylinderGeometry(.18, .22, 3, 6), this.material(C.wood));
      post.position.set(r * Math.cos(a), 1.5, r * Math.sin(a)); this.world.add(post);
    }
    for (const deg of [30, 150]) {
      const a = deg * Math.PI / 180, g = new THREE.Group();
      g.position.set(27 * Math.cos(a), 1.5, 27 * Math.sin(a)); g.rotation.y = -a;
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(6, 3), .3, 3), this.material(0x7a5a3a));
      ramp.rotation.z = -Math.atan2(3, 6); g.add(ramp); this.world.add(g);
    }
  }
  makeTree(obs) {
    const g = new THREE.Group(); g.position.set(obs.pos[0], obs.pos[1], obs.pos[2]);
    const r = obs.radius || 0.8, trunkH = 1.6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.38, trunkH, 8), new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.9 }));
    trunk.position.y = trunkH / 2; g.add(trunk);
    const m1 = new THREE.MeshStandardMaterial({ color: 0x1f4a38, roughness: 0.8, flatShading: true });
    const m2 = new THREE.MeshStandardMaterial({ color: 0x295f48, roughness: 0.8, flatShading: true });
    const m3 = new THREE.MeshStandardMaterial({ color: 0x36755a, roughness: 0.8, flatShading: true });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(r * 1.5, 1.4, 7), m1); c1.position.y = trunkH * 0.7 + 0.6; g.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(r * 1.15, 1.2, 7), m2); c2.position.y = trunkH * 0.7 + 1.4; g.add(c2);
    const c3 = new THREE.Mesh(new THREE.ConeGeometry(r * 0.75, 1.0, 7), m3); c3.position.y = trunkH * 0.7 + 2.1; g.add(c3);
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
    fruit.position.set(r * 0.55, trunkH * 0.7 + 0.35, r * 0.4); g.add(fruit);
    return g;
  }
  makeRock(obs) {
    const g = new THREE.Group(); g.position.set(obs.pos[0], obs.pos[1], obs.pos[2]);
    const r = obs.radius || 0.8;
    // Đá sáng vừa đủ để thấy trong đêm (vật cản phải nhìn được trước khi va vào).
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a94a3, emissive: 0x1c2029, roughness: 0.9, flatShading: true });
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.95, 0), rockMat);
    main.position.y = r * 0.55; main.scale.set(1.2, 0.7, 0.9);
    main.rotation.set(0.3, (obs.pos[0] * 17) % Math.PI, 0.2); g.add(main);
    const small = new THREE.Mesh(new THREE.DodecahedronGeometry(r * 0.4, 0), rockMat);
    small.position.set(r * 0.8, r * 0.2, -r * 0.3); small.scale.set(1.0, 0.6, 1.1); g.add(small);
    return g;
  }
  makeLantern(L) {
    const g = new THREE.Group(); g.position.fromArray(L.pos);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 2.4, 10), this.material(C.wood)); pole.position.y = 1.2; g.add(pole);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 16), new THREE.MeshStandardMaterial({ color: 0x5b5f6e, roughness: .5 })); globe.position.y = 2.6; g.add(globe);
    const tear = new THREE.Mesh(new THREE.BoxGeometry(.08, .6, .98), this.material(C.sky)); tear.position.y = 2.6; tear.rotation.z = .3; g.add(tear);
    const light = new THREE.PointLight(C.warm, 0, 18, 1.6); light.position.y = 2.6; g.add(light);
    // Thanh dầu nổi trên đèn đang sáng, luôn quay về camera.
    const bar = new THREE.Group(); bar.position.y = 3.5;
    bar.add(new THREE.Mesh(new THREE.PlaneGeometry(1.4, .18), new THREE.MeshBasicMaterial({ color: 0x1a1f36, transparent: true, opacity: .85, depthWrite: false })));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .1), new THREE.MeshBasicMaterial({ color: C.warm, transparent: true, depthWrite: false })); fill.position.z = .01; bar.add(fill); g.add(bar);
    g.userData = { globe, tear, light, bar, fill }; this.world.add(g); this.lanterns.set(L.id, g); return g;
  }
  instance(mesh, index, pos, y = 0, scale = 1) {
    this.matrix.position.set(pos[0], pos[1] + y, pos[2]); this.matrix.scale.setScalar(scale); this.matrix.updateMatrix(); mesh.setMatrixAt(index, this.matrix.matrix);
  }
  sync(sim, settings = {}) {
    // Đèn dầu < 30 nhấp nháy chậm 1 Hz theo sim_tick (dừng khi pause): 30 tick sáng, 30 tick mờ.
    const blinkOn = Math.floor(sim.simTick / 30) % 2 === 0;
    for (const L of sim.lanterns) {
      const g = this.lanterns.get(L.id) || this.makeLantern(L), u = g.userData;
      const fuel = L.fuelU / 60, low = L.lit && fuel < LOW_FUEL, dim = low && !blinkOn;
      u.light.intensity = L.lit ? (dim ? .7 : 3.2) : 0;
      u.globe.material.color.setHex(L.lit ? C.paper : 0x5b5f6e);
      u.globe.material.emissive.setHex(L.lit ? C.warm : 0x120a18);
      u.globe.material.emissiveIntensity = dim ? .25 : 1;
      u.globe.scale.setScalar(L.lit ? 1 : .8); u.tear.visible = !L.lit; // đèn tắt xẹp 20% + vết rách
      u.bar.visible = L.lit;
      if (L.lit) {
        const f = Math.max(0, Math.min(1, fuel / 100));
        u.fill.scale.x = Math.max(.001, f); u.fill.position.x = -.65 * (1 - f);
        u.fill.material.color.setHex(low ? (settings.colorblind ? 0xffffff : 0xff5a5f) : C.warm);
        u.fill.material.opacity = dim ? .25 : 1;
        u.bar.quaternion.copy(this.camera.quaternion);
      }
    }
    const motes = sim.motes.filter(m => m.active); this.motes.count = motes.length;
    motes.forEach((m, i) => this.instance(this.motes, i, m.pos, .5));
    this.shades.count = sim.shades.length; this.eyes.count = sim.shades.length * 2;
    sim.shades.forEach((s, i) => {
      this.instance(this.shades, i, s.pos, .9, s.state === 'stunned' ? .8 : 1);
      this.instance(this.eyes, i * 2, [s.pos[0] - .22, s.pos[1], s.pos[2] - .6], 1.05);
      this.instance(this.eyes, i * 2 + 1, [s.pos[0] + .22, s.pos[1], s.pos[2] - .6], 1.05);
    });
    const edge = settings.colorblind ? 0x00b3ff : 0x7a3cff;
    this.shades.material.emissive.setHex(edge); this.eyes.material.color.setHex(edge);
    const drifters = sim.drifters.filter(d => d.state !== 'removed'); this.drifters.count = drifters.length;
    drifters.forEach((d, i) => this.instance(this.drifters, i, d.pos, 1.2));
    for (const mesh of [this.motes, this.shades, this.eyes, this.drifters]) mesh.instanceMatrix.needsUpdate = true;
    for (const c of sim.charms) {
      let mesh = this.charms.get(c.id);
      if (!mesh) { mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(.4), this.material(0xc8102e)); mesh.position.fromArray(c.pos); mesh.position.y += .6; this.world.add(mesh); this.charms.set(c.id, mesh); }
      mesh.visible = c.available;
    }
    this.ambient.intensity = .15 + .55 * sim.lanterns.filter(L => L.lit).length / sim.lanterns.length;
    this.player.position.fromArray(sim.player.pos);
  }
  follow(sim, yaw, shake = 0) {
    const p = sim.player.pos, fx = Math.sin(yaw), fz = Math.cos(yaw);
    const jx = shake ? (Math.random() - .5) * shake : 0, jy = shake ? (Math.random() - .5) * shake : 0; // chỉ hình ảnh, không vào lõi
    this.camera.position.set(p[0] - fx * 11 + jx, p[1] + 7 + jy, p[2] - fz * 11); this.camera.lookAt(p[0], p[1] + 1, p[2]); this.player.rotation.y = yaw;
  }
  render() { this.renderer.render(this.scene, this.camera); }
  dispose() { removeEventListener('resize', this.resize); disposeTree(this.scene); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
