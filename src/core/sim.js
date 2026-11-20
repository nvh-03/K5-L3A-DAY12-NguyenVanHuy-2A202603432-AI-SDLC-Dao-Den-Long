// Lõi mô phỏng Đảo Đèn Lồng - Ticket-03 / Test Contract v1.2.
// Thuần logic, tất định, 60 tick/giây. Thứ tự xử lý trong tick theo đúng Phần 1 của ticket.
import { makeRng } from './rng.js';
import { TUNING, SCORE, TICK_RATE, buildNight } from './config.js';
import { candidateSurfaces, landingSurface } from './geometry.js';

const DT = 1 / TICK_RATE;
const TOL = 0.3;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r3v = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export const DEFAULT_INPUT = {
  move: [0, 0], cam_yaw_deg: 0,
  jump: false, interact: false, pulse: false, dash: false, pause: false,
};

export class Simulation {
  constructor({ seed = 1, night = 1, scenario = null } = {}) {
    this.tuning = TUNING;
    this.score = SCORE;
    this.seed = seed >>> 0;
    this.rng = makeRng(seed);
    this.night = night;
    this.map = buildNight(night);

    this.tick = 0;        // luôn tăng mỗi step
    this.simTick = 0;     // đứng yên khi tạm dừng
    this.status = 'playing';
    this.paused = false;
    this.scoreValue = 0;
    this.gameOverEmitted = false;

    this.durationTicks = this.map.duration_ticks;
    this.shadeSpeed = this.map.shade_speed;

    this.shadeCounter = 0;
    this.drifterCounter = 0;
    this.moteDropCounter = 0;

    this.windActive = false;
    this.windDirDeg = 0;
    this.windTimer = 0;   // đếm trong chu kỳ gió
    this.windDir = [0, 0];

    this.player = {
      pos: [...this.map.spawnPos],
      vel: [0, 0, 0],
      facing: [0, 1],
      grounded: true,
      flames: this.tuning.flames,
      carried: 0,
      invuln: 0,
      dashCd: 0,
      dashTimer: 0,
      dashDir: [0, 1],
      pulseCd: 0,
      charm: 0,
      launched: false,
      launchVel: [0, 0],
      fallDone: false,
      fallWait: 0,
      successful_lights: 0,  // Phase 3: thắp thành công
    };
    this.prevHeld = { jump: false, interact: false, pulse: false, dash: false, pause: false };

    this._buildWorld(scenario);
  }

  _buildWorld(sc) {
    const t = this.tuning;
    // Đèn (Phase 3: thêm fuel, ever_lit, relit_count)
    this.lanterns = this.map.lanterns.map((L) => ({
      id: L.id,
      pos: [...L.pos],
      deposited: 0,
      lit: false,
      litTick: -1,
      fuel: 0,
      ever_lit: false,
      relit_count: 0,
    }));
    // Đom đóm theo slot cố định
    this.motePoints = this.map.motePoints;
    this.motes = [];
    const startN = Math.min(t.firefly_start, this.motePoints.length);
    for (let i = 0; i < startN; i++) {
      this.motes.push({ id: `m${i + 1}`, pos: [...this.motePoints[i]], kind: 'random', ttl: null, slot: i, active: true });
    }
    // Bùa
    this.charms = this.map.charms.map((c) => ({ id: c.id, pos: [...c.pos], available: true, respawn: 0 }));
    // Bóng Mực / Gió Lạc
    this.shades = [];
    this.drifters = [];
    this.randomMotes = true;
    this.randomShades = true;
    this.randomDrifters = !!this.map.drifters;
    this.windEnabled = !!this.map.wind;

    // Phase 3: đếm thắp thành công trong Đêm
    this.successfulLights = 0;

    if (!sc) return;
    const p = sc.player;
    if (p) {
      if (p.pos) this.player.pos = [p.pos[0], p.pos[1] || 0, p.pos[2]];
      if (typeof p.carried === 'number') this.player.carried = p.carried;
      if (typeof p.flames === 'number') this.player.flames = p.flames;
      if (typeof p.invuln_ticks === 'number') this.player.invuln = p.invuln_ticks;
      if (typeof p.dash_cd_ticks === 'number') this.player.dashCd = p.dash_cd_ticks;
      if (typeof p.pulse_cd_ticks === 'number') this.player.pulseCd = p.pulse_cd_ticks;
      if (typeof p.charm_ticks === 'number') this.player.charm = p.charm_ticks;
      if (typeof p.successful_lights === 'number') this.player.successful_lights = p.successful_lights;
    }
    if (typeof sc.random_motes === 'boolean') this.randomMotes = sc.random_motes;
    if (typeof sc.random_shades === 'boolean') this.randomShades = sc.random_shades;
    if (typeof sc.random_drifters === 'boolean') this.randomDrifters = sc.random_drifters;
    if (typeof sc.wind_enabled === 'boolean') this.windEnabled = sc.wind_enabled;
    if (typeof sc.time_left_s === 'number') this.durationTicks = this.simTick + Math.round(sc.time_left_s * TICK_RATE);

    if (Array.isArray(sc.lanterns)) {
      for (const u of sc.lanterns) {
        const L = this.lanterns.find((x) => x.id === u.id);
        if (!L) continue;
        if (u.pos) L.pos = [u.pos[0], u.pos[1] || 0, u.pos[2]];
        if (typeof u.deposited === 'number') L.deposited = u.deposited;
        if (typeof u.fuel === 'number') L.fuel = u.fuel;
        if (typeof u.ever_lit === 'boolean') L.ever_lit = u.ever_lit;
        if (typeof u.relit_count === 'number') L.relit_count = u.relit_count;
        if (u.lit === true) {
          L.lit = true;
          L.ever_lit = true;
          L.fuel = u.fuel != null ? u.fuel : t.fuel_max;
          L.litTick = 0;
        }
      }
    }
    if (Array.isArray(sc.motes)) {
      this.motes = sc.motes.map((m, i) => ({ id: m.id || `m${i + 1}`, pos: [m.pos[0], m.pos[1] || 0, m.pos[2]], kind: m.kind || 'random', ttl: m.ttl != null ? Math.round(m.ttl * TICK_RATE) : null, slot: null, active: true }));
    }
    if (Array.isArray(sc.shades)) {
      this.shades = sc.shades.map((s) => {
        this.shadeCounter++;
        const shade = this._mkShade(s.id || `S${this.shadeCounter}`, [s.pos[0], s.pos[1] || 0, s.pos[2]], s.state || 'wander', s.state_ticks_left || 0);
        if (s.target_lantern_id) shade.target_lantern_id = s.target_lantern_id;
        return shade;
      });
    } else {
      this.shades = [];
    }
    if (Array.isArray(sc.drifters)) {
      this.drifters = sc.drifters.map((d) => {
        this.drifterCounter++;
        return { id: d.id || `D${this.drifterCounter}`, pos: [d.pos[0], d.pos[1] || 0, d.pos[2]], state: d.state || 'idle', stolen: d.stolen || 0, stolenDone: !!d.stolen, flee: 0, drop: 0, dir: this._seedDir() };
      });
    }
    if (Array.isArray(sc.charms)) {
      this.charms = sc.charms.map((c) => ({ id: c.id, pos: [c.pos[0], c.pos[1] || 0, c.pos[2]], available: c.available !== false, respawn: c.respawn_s != null ? Math.round(c.respawn_s * TICK_RATE) : 0 }));
    }
  }
  _seedDir() { const a = this.rng() * Math.PI * 2; return [Math.cos(a), Math.sin(a)]; }
  _mkShade(id, pos, state, stateTicks) {
    return {
      id, pos, state, stateTicks,
      stun: state === 'stunned' ? (stateTicks || this.tuning.pulse_stun_ticks) : 0,
      recoil: state === 'recoil' ? (stateTicks || this.tuning.shade_recoil_ticks) : 0,
      recoilDir: [1, 0],
      pushTicks: 0,
      pushDir: [1, 0],
      safePush: 0,
      wanderDir: this._seedDir(),
      drainTicks: 0,  // Phase 3: đếm ngũn khi hút (ghi event 60/60)
    };
  }

  get timeLeft() { return (this.durationTicks - this.simTick) / TICK_RATE; }
  _mapRadius() { return this.night === 1 ? 40 : this.night === 2 ? 28 : 45; }

  // ================= MỘT BƯỚC =================
  step(rawInput) {
    const events = [];
    this.tick += 1;
    const input = { ...DEFAULT_INPUT, ...(rawInput || {}) };
    const edge = {
      jump: input.jump && !this.prevHeld.jump,
      interact: input.interact && !this.prevHeld.interact,
      pulse: input.pulse && !this.prevHeld.pulse,
      dash: input.dash && !this.prevHeld.dash,
      pause: input.pause && !this.prevHeld.pause,
    };
    this.prevHeld = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse, dash: !!input.dash, pause: !!input.pause };

    // (1) Pause trước
    if (edge.pause) {
      this.paused = !this.paused;
      this._emit(events, this.paused ? 'paused' : 'resumed', {});
      if (this.paused) { this._tagTicks(events); return events; } // vừa tạm dừng -> dừng bước
    }
    if (this.paused) { this._tagTicks(events); return events; }
    if (this.status !== 'playing') { this._tagTicks(events); return events; }

    this.simTick += 1;
    const p = this.player;

    // (2) Giảm bộ đếm + hao/hút dầu (Phase 3)
    if (p.invuln > 0) p.invuln--;
    if (p.dashCd > 0) p.dashCd--;
    if (p.pulseCd > 0) p.pulseCd--;
    if (p.charm > 0) p.charm--;
    if (p.fallWait > 0) p.fallWait--;

    // Phase 3: hao dầu tự nhiên + hút bởi Bóng Mực
    const t = this.tuning;
    for (const L of this.lanterns) {
      if (L.lit && L.fuel > 0) {
        L.fuel -= t.fuel_decay_per_s / TICK_RATE;
        // Bóng Mực ở trạng thái drain hút dầu
        const drainingShades = this.shades.filter((s) => s.state === 'drain' && s.target_lantern_id === L.id);
        if (drainingShades.length > 0) {
          const totalDrain = drainingShades.length * t.drain_per_s / TICK_RATE;
          L.fuel -= totalDrain;
          // Ghi chỉ 60/60 tick (tương ứng 1 lần/giây)
          for (const s of drainingShades) {
            s.drainTicks++;
            if (s.drainTicks >= TICK_RATE) {
              this._emit(events, 'fuel_drain', { lantern_id: L.id, shade_id: s.id, fuel: Math.max(0, Math.round(totalDrain * 1000) / 1000) });
              s.drainTicks = 0;
            }
          }
        }
      }
    }

    for (const s of this.shades) {
      if (s.stun > 0) { s.stun--; if (s.stun === 0 && s.state === 'stunned') s.state = 'wander'; }
      if (s.recoil > 0) { s.recoil--; if (s.recoil === 0 && s.state === 'recoil') s.state = 'wander'; }
      if (s.pushTicks > 0) s.pushTicks--;
      if (s.safePush > 0) s.safePush--;
    }
    for (const m of this.motes) if (m.ttl != null && m.active) { m.ttl--; if (m.ttl <= 0) m.active = false; }
    for (const c of this.charms) if (!c.available && c.respawn > 0) { c.respawn--; if (c.respawn <= 0) c.available = true; }
    for (const d of this.drifters) {
      if (d.flee > 0) { d.flee--; if (d.flee <= 0 && d.state === 'flee') d.state = 'removed'; }
      if (d.drop > 0) { d.drop--; if (d.drop <= 0) d.state = 'removed'; }
    }

    // (2a) Đèn hết dầu (fuel <= 0) chuyển sang tắt
    for (const L of this.lanterns) {
      if (L.lit && L.fuel <= 0) {
        L.lit = false;
        L.fuel = 0;
        L.deposited = 0;
        this._emit(events, 'lantern_out', { lantern_id: L.id });
        // Những Bóng Mực đang hút dầu chuyển sang wander
        for (const s of this.shades) {
          if (s.state === 'drain' && s.target_lantern_id === L.id) {
            s.state = 'wander';
            delete s.target_lantern_id;
          }
        }
      }
    }

    this._updateWind(events);

    // (3) Di chuyển Mây rồi kiểm tra rơi
    this._movePlayer(input, edge, events);
    this._checkFall(events);

    // (4) Nhặt đom đóm và bùa
    if (p.fallWait <= 0) { this._pickup(events); this._pickupCharms(events); }

    // (5) Tương tác đèn
    if (edge.interact) this._interact(events);

    // (6) Cập nhật vùng an toàn
    this._updateSafeZones();

    // (7) Tỏa Sáng
    if (edge.pulse) this._pulse(events);

    // (8) Di chuyển Bóng Mực & Gió Lạc
    this._moveShades();
    this._moveDrifters();

    // (9) Chạm: Gió Lạc cướp trước, rồi Bóng Mực
    if (p.fallWait <= 0) { this._drifterSteal(events); this._shadeHit(events); }

    // (10) Sinh theo lịch
    this._spawnFireflies();
    this._spawnShades();
    this._spawnDrifters();

    // (11) Thắng/thua
    this._checkWinLose(events);

    this._tagTicks(events);
    return events;
  }

  _emit(events, name, data) { events.push({ name, data }); }
  _tagTicks(events) { for (const e of events) if (e.tick === undefined) e.tick = this.tick; }

  // ---------- Gió (Đêm 3) ----------
  _updateWind(events) {
    if (!this.windEnabled) { this.windActive = false; return; }
    const t = this.tuning;
    const period = t.wind_period_s * TICK_RATE;
    const phase = this.simTick % period;
    const active = phase >= period - t.wind_duration_s * TICK_RATE;
    if (active && !this.windActive) {
      // bắt đầu cơn gió: chốt hướng theo seed
      const a = this.rng() * Math.PI * 2;
      this.windDir = [Math.cos(a), Math.sin(a)];
      this.windDirDeg = r3((a * 180) / Math.PI);
    }
    this.windActive = active;
  }

  // ---------- Di chuyển người chơi ----------
  _movePlayer(input, edge, events) {
    const t = this.tuning, p = this.player;
    const speed = p.charm > 0 ? t.charm_speed : t.player_speed;

    // hướng input theo cam_yaw
    let mx = input.move[0] || 0, mz = input.move[1] || 0;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
    const cos = Math.cos(th), sin = Math.sin(th);
    const wx = mx * cos + mz * sin, wz = -mx * sin + mz * cos;
    if (ml > 1e-6) p.facing = [wx / Math.max(ml, 1e-6), wz / Math.max(ml, 1e-6)];

    // Bắt đầu lướt
    if (edge.dash && p.dashTimer <= 0 && (p.dashCd <= 0 || p.charm > 0)) {
      p.dashTimer = Math.round(t.dash_duration_s * TICK_RATE);
      p.dashDir = ml > 1e-6 ? [wx, wz] : [p.facing[0], p.facing[1]];
      const dl = Math.hypot(p.dashDir[0], p.dashDir[1]) || 1;
      p.dashDir = [p.dashDir[0] / dl, p.dashDir[1] / dl];
      if (p.charm <= 0) p.dashCd = Math.round(t.dash_cooldown_s * TICK_RATE);
      this._emit(events, 'dash', {});
    }

    // vận tốc ngang
    let vx, vz;
    if (p.dashTimer > 0) { vx = p.dashDir[0] * t.dash_speed; vz = p.dashDir[1] * t.dash_speed; }
    else if (p.launched) { vx = p.launchVel[0]; vz = p.launchVel[1]; }
    else { vx = wx * speed; vz = wz * speed; }
    // gió đẩy thêm
    if (this.windActive) { vx += this.windDir[0] * t.wind_push; vz += this.windDir[1] * t.wind_push; }

    // Bục nhảy (khi đang đứng)
    if (p.grounded && this.map.pads) {
      for (const pad of this.map.pads) {
        if (Math.hypot(p.pos[0] - pad.pos[0], p.pos[2] - pad.pos[2]) <= 1.0 && Math.abs(p.pos[1] - pad.pos[1]) <= 0.5) {
          let dir;
          if (pad.target) { const dx = pad.target[0] - pad.pos[0], dz = pad.target[2] - pad.pos[2]; const d = Math.hypot(dx, dz) || 1; dir = [dx / d, dz / d]; }
          else dir = [pad.dir[0], pad.dir[2]];
          p.launched = true; p.grounded = false; p.vel[1] = pad.vy;
          p.launchVel = [dir[0] * pad.vh, dir[1] * pad.vh];
          vx = p.launchVel[0]; vz = p.launchVel[1];
          break;
        }
      }
    }

    // áp vận tốc ngang (chặn nếu đụng trụ tháp hoặc đi ra biển -> vẫn cho ra để rơi)
    const nx = p.pos[0] + vx * DT, nz = p.pos[2] + vz * DT;
    const cs = candidateSurfaces(this.night, nx, nz);
    if (cs === 'tower') { vx = 0; vz = 0; } // đụng trụ tháp: chặn
    else { p.pos[0] = nx; p.pos[2] = nz; }
    p.vel[0] = vx; p.vel[2] = vz;

    // vận tốc dọc
    if (p.dashTimer > 0) {
      p.vel[1] = 0; // lướt giữ nguyên độ cao
      p.dashTimer--;
    } else {
      if (edge.jump && p.grounded) { p.vel[1] = t.jump_speed; p.grounded = false; p.launched = false; }
      p.vel[1] -= t.gravity * DT;
      p.pos[1] += p.vel[1] * DT;
      const cs2 = candidateSurfaces(this.night, p.pos[0], p.pos[2]);
      if (cs2 === 'tower' || cs2.length === 0) { p.grounded = false; }
      else {
        const ls = landingSurface(cs2, p.pos[1], TOL);
        if (ls !== null && p.vel[1] <= 0 && p.pos[1] <= ls + TOL) {
          p.pos[1] = ls; p.vel[1] = 0; p.grounded = true; p.launched = false;
        } else p.grounded = false;
      }
    }
  }

  _checkFall(events) {
    const t = this.tuning, p = this.player;
    if (p.fallWait > 0) {
      if (p.fallWait === 1) { // tick cuối chờ -> hồi sinh
        p.pos = [...this.map.spawnPos]; p.vel = [0, 0, 0]; p.grounded = true;
        p.invuln = t.invuln_ticks; p.launched = false; p.fallDone = false;
      }
      return;
    }
    if (p.pos[1] < t.fall_y) {
      p.flames -= 1;
      const lost = p.carried; p.carried = 0;
      this._emit(events, 'player_hit', { reason: 'fall', lost, flames: p.flames });
      if (p.flames <= 0) { p.pos[1] = 0; return; } // thua ngay, xử ở checkWinLose
      p.fallWait = t.fall_wait_ticks; p.pos = [...this.map.spawnPos, ]; p.pos[1] = 0; p.vel = [0, 0, 0];
    }
  }

  // ---------- Nhặt (Phase 3: sức chứa tăng dần) ----------
  _pickup(events) {
    const t = this.tuning, p = this.player;
    // Phase 3: sức chứa = 10 + 2 * successful_lights, max 20
    const capacity = Math.min(10 + 2 * p.successful_lights, t.capacity_max);

    for (const m of this.motes) {
      if (!m.active) continue;
      if (p.carried >= capacity) break;
      if (distXZ(m.pos, p.pos) <= t.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= t.pickup_height) {
        m.active = false; p.carried++;
        this._emit(events, 'mote_picked', { id: m.id, pos: r3v(m.pos), carried: p.carried });
      }
    }
  }
  _pickupCharms(events) {
    const t = this.tuning, p = this.player;
    for (const c of this.charms) {
      if (!c.available) continue;
      if (distXZ(c.pos, p.pos) <= t.pickup_radius && Math.abs(p.pos[1] - c.pos[1]) <= t.pickup_height) {
        c.available = false; c.respawn = t.charm_respawn_ticks; p.charm = t.charm_ticks;
        this._emit(events, 'charm_picked', { charm_id: c.id, charm_ticks: t.charm_ticks });
      }
    }
  }

  // ---------- Tương tác đèn (Phase 3: thắp + châm dầu) ----------
  _interact(events) {
    const t = this.tuning, p = this.player;
    if (p.carried <= 0) return;

    let best = null, bestD = Infinity;
    // Chọn đèn: unlit hoặc lit nhưng fuel < fuel_max, gần nhất, nếu hòa thì id nhỏ hơn
    for (const L of this.lanterns) {
      const isUnlit = !L.lit;
      const isNotFull = L.lit && L.fuel < t.fuel_max;
      if (!isUnlit && !isNotFull) continue;

      const d = dist3(L.pos, p.pos);
      if (d <= t.interact_radius && (d < bestD - 1e-9 || (Math.abs(d - bestD) <= 1e-9 && best && L.id < best.id))) {
        bestD = d;
        best = L;
      }
    }

    if (!best) return;

    // Thắp lần đầu (unlit)
    if (!best.lit) {
      const cost = t.lantern_cost;
      if (p.carried < cost) return;
      p.carried -= cost;
      best.lit = true;
      best.fuel = t.fuel_max;
      best.ever_lit = true;
      best.litTick = this.simTick;
      p.successful_lights++;

      this.scoreValue += this.score.per_mote_deposited * cost + this.score.per_lantern_first_light;
      this._emit(events, 'lantern_lit', { lantern_id: best.id, relight: false });

      // bóng đang trong vùng bị đẩy ra, miễn sát thương
      for (const s of this.shades) if (distXZ(s.pos, best.pos) < t.safe_radius) s.safePush = t.safe_push_ticks;
    }
    // Châm dầu (lit + fuel < max)
    else {
      const fuelNeeded = Math.max(0, t.fuel_max - best.fuel);
      const motesNeeded = Math.ceil(fuelNeeded / t.fuel_per_mote);
      const motesUsed = Math.min(p.carried, motesNeeded);

      if (motesUsed <= 0) return; // đèn đầy dầu

      p.carried -= motesUsed;
      best.fuel = Math.min(t.fuel_max, best.fuel + motesUsed * t.fuel_per_mote);

      // Nếu fuel vừa được châm lên >= low_fuel_threshold và có Bóng Mực drain trong vùng 6m: đẩy ra
      if (best.fuel >= t.low_fuel_threshold) {
        for (const s of this.shades) {
          if (s.state === 'drain' && s.target_lantern_id === best.id && distXZ(s.pos, best.pos) <= 6.0) {
            s.safePush = t.safe_push_ticks;
          }
        }
      }

      this.scoreValue += this.score.per_mote_deposited * motesUsed;
      this._emit(events, 'refuel', { lantern_id: best.id, amount: motesUsed, fuel: r3(best.fuel) });
    }
  }

  _updateSafeZones() {
    const t = this.tuning;
    for (const s of this.shades) {
      for (const L of this.lanterns) {
        if (!L.lit || L.fuel < t.low_fuel_threshold) continue; // Phase 3: fuel < 30 mất vùng an toàn
        const d = distXZ(s.pos, L.pos);
        if (d < t.safe_radius) {
          const dx = s.pos[0] - L.pos[0], dz = s.pos[2] - L.pos[2];
          const dd = Math.hypot(dx, dz) || 1;
          s.pos[0] = L.pos[0] + (dx / dd) * t.safe_radius;
          s.pos[2] = L.pos[2] + (dz / dd) * t.safe_radius;
        }
      }
    }
  }

  // ---------- Tỏa Sáng (Phase 3: thêm điểm cho drain) ----------
  _pulse(events) {
    const t = this.tuning, p = this.player;
    if (p.pulseCd > 0 || p.carried < t.pulse_cost) return;
    p.carried -= t.pulse_cost; p.pulseCd = Math.round(t.pulse_cooldown_s * TICK_RATE);
    const center = [p.pos[0], p.pos[1] + t.pulse_center_offset, p.pos[2]];
    const hits = [];
    for (const s of this.shades) {
      if (dist3(center, s.pos) <= t.pulse_radius) {
        hits.push(s.id);
        // Phase 3: +15 nếu drain, +5 nếu không
        const wasDrain = s.state === 'drain';
        this.scoreValue += wasDrain ? this.score.per_pulse_hit_drain : this.score.per_pulse_hit;

        s.state = 'stunned'; s.stun = t.pulse_stun_ticks;
        let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2];
        let dd = Math.hypot(dx, dz);
        if (dd < 1e-6) { dx = 1; dz = 0; dd = 1; }
        s.pushDir = [dx / dd, dz / dd]; s.pushTicks = t.pulse_push_ticks;

        // Clear drain state
        if (wasDrain) delete s.target_lantern_id;
      }
    }
    // Gió Lạc trúng pulse
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      if (dist3(center, d.pos) <= t.pulse_radius) {
        if (d.state === 'chase' || d.state === 'idle') { d.state = 'flee'; d.flee = t.drifter_flee_ticks; }
        else if (d.state === 'flee' && d.stolen > 0) {
          this._dropMotes(d.pos, d.stolen, events);
          this._emit(events, 'drifter_drop', { drifter_id: d.id, amount: d.stolen });
          d.stolen = 0; d.drop = t.drifter_drop_ticks;
        }
      }
    }
    this._emit(events, 'pulse', { pos: r3v(center), radius: t.pulse_radius, hits });
  }

  _dropMotes(origin, count, events) {
    const t = this.tuning;
    for (let i = 0; i < count; i++) {
      const a = this.rng() * Math.PI * 2;
      const r = t.drop_ring_min + this.rng() * (t.drop_ring_max - t.drop_ring_min);
      this.moteDropCounter++;
      this.motes.push({ id: `d${this.moteDropCounter}`, pos: [origin[0] + Math.cos(a) * r, origin[1], origin[2] + Math.sin(a) * r], kind: 'dropped', ttl: t.drop_ttl_ticks, slot: null, active: true });
    }
  }

  // ---------- Bóng Mực (Phase 3: thêm drain state) ----------
  _moveShades() {
    const t = this.tuning, p = this.player;
    for (const s of this.shades) {
      if (s.state === 'spawning') { s.state = 'wander'; }
      if (s.stun > 0 || s.state === 'stunned') {
        if (s.pushTicks > 0) { const step = t.pulse_push_m / t.pulse_push_ticks; this._moveShadePos(s, s.pushDir[0] * step, s.pushDir[1] * step); }
        continue;
      }
      if (s.state === 'recoil') {
        const step = t.shade_recoil_m / t.shade_recoil_ticks;
        this._moveShadePos(s, s.recoilDir[0] * step, s.recoilDir[1] * step);
        continue;
      }

      // Phase 3: drain state logic
      if (s.state === 'drain') {
        const target = this.lanterns.find((L) => L.id === s.target_lantern_id);
        // Chuyển sang wander nếu: đèn tắt, fuel >= 30, hoặc cách > 2m
        if (!target || !target.lit || target.fuel >= t.low_fuel_threshold || distXZ(s.pos, target.pos) > 2) {
          s.state = 'wander';
          delete s.target_lantern_id;
        }
        // Chuyển sang chase nếu Mây trong 6m
        else if (distXZ(s.pos, p.pos) <= 6) {
          s.state = 'chase';
        }
        // Nếu vẫn drain: đứng yên (không di chuyển)
        continue;
      }

      // wander: tìm đèn yếu (fuel < 30) để hút
      if (s.state === 'wander') {
        // Chọn đèn yếu gần nhất (fuel < 30, lit)
        let weakLantern = null, weakD = Infinity;
        for (const L of this.lanterns) {
          if (!L.lit || L.fuel >= t.low_fuel_threshold) continue;
          const d = distXZ(s.pos, L.pos);
          if (d < weakD || (Math.abs(d - weakD) <= 1e-9 && weakLantern && L.id < weakLantern.id)) {
            weakD = d;
            weakLantern = L;
          }
        }
        if (weakLantern) {
          s.target_lantern_id = weakLantern.id;
        }
      }

      // Chuyển trạng thái tiêu chuẩn: chase / wander / hay hướng đến đèn yếu
      const d = distXZ(s.pos, p.pos);
      if (s.state === 'chase' && d > t.shade_giveup) s.state = 'wander';
      else if (s.state === 'wander' && d <= t.shade_detect) s.state = 'chase';

      // Di chuyển
      if (s.state === 'chase') {
        const dx = p.pos[0] - s.pos[0], dz = p.pos[2] - s.pos[2]; const dd = Math.hypot(dx, dz) || 1;
        this._moveShadePos(s, (dx / dd) * this.shadeSpeed * DT, (dz / dd) * this.shadeSpeed * DT);
      } else if (s.state === 'wander' && s.target_lantern_id) {
        // Đi tới đèn yếu, nếu cách <= 2m thì chuyển drain
        const target = this.lanterns.find((L) => L.id === s.target_lantern_id);
        if (target) {
          const dist = distXZ(s.pos, target.pos);
          if (dist <= 2) {
            s.state = 'drain';
          } else {
            const dx = target.pos[0] - s.pos[0], dz = target.pos[2] - s.pos[2]; const dd = Math.hypot(dx, dz) || 1;
            this._moveShadePos(s, (dx / dd) * this.shadeSpeed * DT, (dz / dd) * this.shadeSpeed * DT);
          }
        }
      } else { // wander thường: trôi chậm
        this._moveShadePos(s, s.wanderDir[0] * 1.5 * DT, s.wanderDir[1] * 1.5 * DT);
      }

      // chặn khỏi vùng an toàn đèn đã thắp (nếu fuel >= low_fuel_threshold)
      for (const L of this.lanterns) {
        if (!L.lit || L.fuel < t.low_fuel_threshold) continue;
        const dd = distXZ(s.pos, L.pos);
        if (dd < t.safe_radius) { const ax = s.pos[0] - L.pos[0], az = s.pos[2] - L.pos[2]; const an = Math.hypot(ax, az) || 1; s.pos[0] = L.pos[0] + (ax / an) * t.safe_radius; s.pos[2] = L.pos[2] + (az / an) * t.safe_radius; }
      }
    }
  }
  _moveShadePos(s, dx, dz) {
    const nx = s.pos[0] + dx, nz = s.pos[2] + dz;
    const cs = candidateSurfaces(this.night, nx, nz);
    if (cs === 'tower' || cs.length === 0) { s.wanderDir = [-s.wanderDir[0], -s.wanderDir[1]]; return; }
    s.pos[0] = nx; s.pos[2] = nz;
  }

  // ---------- Gió Lạc ----------
  _moveDrifters() {
    const t = this.tuning, p = this.player;
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      const dist = distXZ(d.pos, p.pos);
      if (d.state === 'idle') {
        if (!d.stolenDone && p.carried >= t.drifter_carry_trigger && dist <= t.drifter_detect) d.state = 'chase';
        else { d.pos[0] += d.dir[0] * t.drifter_idle_speed * DT; d.pos[2] += d.dir[1] * t.drifter_idle_speed * DT; }
      }
      if (d.state === 'chase') {
        if (p.carried < t.drifter_carry_trigger || dist > t.drifter_detect) { d.state = 'idle'; }
        else { const dx = p.pos[0] - d.pos[0], dz = p.pos[2] - d.pos[2]; const dd = Math.hypot(dx, dz) || 1; d.pos[0] += (dx / dd) * t.drifter_speed * DT; d.pos[2] += (dz / dd) * t.drifter_speed * DT; }
      } else if (d.state === 'flee') {
        const dx = d.pos[0] - p.pos[0], dz = d.pos[2] - p.pos[2]; const dd = Math.hypot(dx, dz) || 1;
        d.pos[0] += (dx / dd) * t.drifter_speed * DT; d.pos[2] += (dz / dd) * t.drifter_speed * DT;
      }
    }
  }
  _drifterSteal(events) {
    const t = this.tuning, p = this.player;
    for (const d of this.drifters) {
      if (d.state !== 'chase' || d.stolenDone) continue;
      if (distXZ(d.pos, p.pos) <= t.drifter_steal_radius) {
        const amt = Math.min(t.drifter_steal_amount, p.carried);
        p.carried -= amt; d.stolen = amt; d.stolenDone = true; d.state = 'flee'; d.flee = t.drifter_flee_ticks;
        this._emit(events, 'drifter_steal', { drifter_id: d.id, amount: amt, carried: p.carried });
      }
    }
  }

  // ---------- Chạm Bóng Mực ----------
  _shadeHit(events) {
    const t = this.tuning, p = this.player;
    if (p.invuln > 0) return;
    const ordered = [...this.shades].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    for (const s of ordered) {
      if (s.state === 'stunned' || s.stun > 0 || s.safePush > 0 || s.state === 'spawning') continue;
      if (distXZ(s.pos, p.pos) <= t.shade_hit_radius && Math.abs(p.pos[1] - s.pos[1]) <= t.shade_hit_height) {
        p.flames -= 1;
        const dropped = Math.floor(p.carried * t.hit_drop_ratio);
        if (dropped > 0) { this._dropMotes(p.pos, dropped, events); p.carried -= dropped; }
        p.invuln = t.invuln_ticks;
        // bóng recoil
        let dx = s.pos[0] - p.pos[0], dz = s.pos[2] - p.pos[2]; let dd = Math.hypot(dx, dz); if (dd < 1e-6) { dx = 1; dz = 0; dd = 1; }
        s.recoilDir = [dx / dd, dz / dd]; s.recoil = t.shade_recoil_ticks; s.state = 'recoil';
        this._emit(events, 'player_hit', { reason: 'shade', shade_id: s.id, flames: p.flames, dropped, carried: p.carried });
        break;
      }
    }
  }

  // ---------- Sinh theo lịch ----------
  _spawnFireflies() {
    const t = this.tuning;
    if (this.motePoints.length === 0) return;
    if (this.simTick > 0 && this.simTick % t.firefly_spawn_period === 0) {
      const activeRandom = this.motes.filter((m) => m.active && m.kind === 'random').length;
      if (activeRandom < t.firefly_cap) {
        const occupied = new Set(this.motes.filter((m) => m.active && m.slot != null).map((m) => m.slot));
        for (let i = 0; i < this.motePoints.length; i++) {
          if (!occupied.has(i)) { this.moteDropCounter; this.motes.push({ id: `m${i + 1}`, pos: [...this.motePoints[i]], kind: 'random', ttl: null, slot: i, active: true }); break; }
        }
      }
    }
  }
  _spawnShades() {
    if (this.randomShades === false) return;
    const sc = this.map.shade;
    let spawnCount = 0;
    if (this.simTick === sc.first_tick) spawnCount = sc.first_count;
    else if (this.simTick > sc.first_tick && (this.simTick - sc.first_tick) % sc.period === 0) spawnCount = 1;
    for (let i = 0; i < spawnCount; i++) {
      if (this.shades.length >= sc.max) break;
      const valid = this.map.shadePoints.filter((pt) => distXZ(pt, this.player.pos) >= sc.min_dist_from_player);
      if (!valid.length) break;
      const pt = valid[Math.floor(this.rng() * valid.length)];
      this.shadeCounter++;
      this.shades.push(this._mkShade(`S${this.shadeCounter}`, [...pt], 'spawning', 0));
    }
  }
  _spawnDrifters() {
    if (!this.randomDrifters) return;
    const t = this.tuning;
    if (this.simTick > 0 && this.simTick % 1200 === 0 && this.drifters.filter((d) => d.state !== 'removed').length < t.drifter_max) {
      const R = this._mapRadius() * 0.6; const a = this.rng() * Math.PI * 2;
      this.drifterCounter++;
      this.drifters.push({ id: `D${this.drifterCounter}`, pos: [Math.cos(a) * R, 0, Math.sin(a) * R], state: 'idle', stolen: 0, stolenDone: false, flee: 0, drop: 0, dir: this._seedDir() });
    }
  }

  // ---------- Thắng/thua (Phase 3) ----------
  _checkWinLose(events) {
    if (this.gameOverEmitted) return;
    const p = this.player;
    const t = this.tuning;

    // Phase 3: check flames luôn được ưu tiên
    if (p.flames <= 0) {
      this.gameOverEmitted = true;
      this.status = 'lost';
      this._emit(events, 'game_over', { reason: 'no_flames', state: this.status, score: this.scoreValue });
      return;
    }

    // Kiểm tra nếu hết giờ (bình minh)
    if (this.simTick >= this.durationTicks) {
      const litCount = this.lanterns.filter((L) => L.lit).length;
      const needCount = Math.ceil(this.lanterns.length * t.win_ratio);
      const won = litCount >= needCount;

      this.gameOverEmitted = true;
      if (won) {
        this.status = 'won';
        // Thưởng bình minh: mỗi đèn sáng +50 + floor(fuel), mỗi ngọn lửa +50
        for (const L of this.lanterns) {
          if (L.lit) {
            this.scoreValue += this.score.per_lantern_at_dawn + Math.floor(L.fuel) * this.score.per_fuel_at_dawn;
          }
        }
        this.scoreValue += p.flames * this.score.per_flame_at_dawn;
      } else {
        this.status = 'lost';
      }
      const reason = won ? 'dawn_survived' : 'dawn';
      this._emit(events, 'game_over', { reason, state: this.status, score: this.scoreValue });
      return;
    }
  }

  // ================= SNAPSHOT (Phase 3) =================
  snapshot() {
    const p = this.player, t = this.tuning;
    // Phase 3: sức chứa = 10 + 2 * successful_lights, max 20
    const capacity = Math.min(10 + 2 * p.successful_lights, t.capacity_max);

    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.simTick,
      state: this.paused ? 'paused' : this.status,
      night: this.night,
      time_left_s: r3(this.timeLeft),
      score: this.scoreValue,
      wind: { active: this.windActive, dir_deg: this.windActive ? this.windDirDeg : 0 },
      player: {
        pos: r3v(p.pos),
        vel: r3v(p.vel),
        grounded: p.grounded,
        flames: p.flames,
        carried: p.carried,
        capacity: capacity,  // Phase 3: thêm capacity
        invuln: p.invuln,
        dash_cd_s: r3(p.dashCd / TICK_RATE),
        pulse_cd_s: r3(p.pulseCd / TICK_RATE),
        charm_s: r3(p.charm / TICK_RATE),
      },
      lanterns: this.lanterns.map((L) => ({
        id: L.id,
        pos: r3v(L.pos),
        lit: L.lit,
        deposited: L.deposited,
        fuel: r3(L.fuel),  // Phase 3: thêm fuel (1 chữ số thập phân)
        ever_lit: L.ever_lit,  // Phase 3
        relit_count: L.relit_count,  // Phase 3
      })),
      shades: this.shades.map((s) => ({
        id: s.id,
        pos: r3v(s.pos),
        state: s.state,  // Phase 3: thêm drain state
      })),
      motes: this.motes.filter((m) => m.active).map((m) => ({ id: m.id, pos: r3v(m.pos), kind: m.kind, ttl_s: m.ttl != null ? r3(m.ttl / TICK_RATE) : null })),
      motes_active: this.motes.filter((m) => m.active).length,
      drifters: this.drifters.filter((d) => d.state !== 'removed').map((d) => ({ id: d.id, pos: r3v(d.pos), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, available: c.available, respawn_s: r3(c.respawn / TICK_RATE) })),
    };
  }
}
