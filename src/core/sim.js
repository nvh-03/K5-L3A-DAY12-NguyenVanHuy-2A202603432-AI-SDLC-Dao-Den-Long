// Lõi mô phỏng Đảo Đèn Lồng - Đêm 1 (PRD-0 / Test Contract v1.0).
// Thuần logic, tất định, 60 tick/giây. Chạy được cả Node (headless) lẫn trình duyệt.
import { makeRng } from './rng.js';
import { resolveTuning, resolveScore, WORLD } from './config.js';

const DT = 1 / WORLD.tick_rate;
const r3 = (x) => Math.round(x * 1000) / 1000;
const r3v = (v) => [r3(v[0]), r3(v[1]), r3(v[2])];
const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

export const DEFAULT_INPUT = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };

export class Simulation {
  constructor({ seed = 1, tuning = {}, score = {}, scenario = null } = {}) {
    this.tuning = resolveTuning(tuning);
    this.score = resolveScore(score);
    this.rng = makeRng(seed);
    this.seed = seed >>> 0;

    this.tick = 0;
    this.steps = 0;
    this.status = 'playing';
    this.scoreValue = 0;
    this.gameOverEmitted = false;

    this.nightDuration = this.tuning.night1_duration_s;
    this.initialTimeLeft = this.nightDuration;
    this.moteCounter = 0;
    this.shadeCounter = 0;

    this.player = { pos: [0, 0, 0], vy: 0, flames: this.tuning.flames, carried: 0, invuln: 0 };
    this.prevHeld = { jump: false, interact: false, pulse: false };
    this.pulseCooldown = 0;

    this.randomMotes = true;
    this.randomShades = true;
    this.shadeSpawnTimer = WORLD.shade_first_spawn_s;

    this._buildLanterns();
    this._buildScenario(scenario);
  }

  _buildLanterns() {
    const n = this.tuning.lantern_count_night1;
    const R = WORLD.lantern_ring_radius;
    this.lanterns = [];
    for (let i = 0; i < n; i++) {
      const ang = (Math.PI * 2 * i) / n + Math.PI / 2;
      this.lanterns.push({ id: `L${i + 1}`, pos: [r3(Math.cos(ang) * R), 0, r3(Math.sin(ang) * R)], deposited: 0, lit: false });
    }
  }
  _randomInDisk(maxR) { const r = Math.sqrt(this.rng()) * maxR; const a = this.rng() * Math.PI * 2; return [Math.cos(a) * r, 0, Math.sin(a) * r]; }
  _spawnInitialMotes() {
    const maxR = WORLD.island_radius * WORLD.mote_disk_ratio;
    this.motes = [];
    for (let i = 0; i < WORLD.motes_initial; i++) { this.moteCounter++; this.motes.push({ id: `m${this.moteCounter}`, pos: this._randomInDisk(maxR), active: true }); }
  }

  _buildScenario(sc) {
    const t = this.tuning;
    this.motes = [];
    this.shades = [];
    if (sc && sc.player) {
      const p = sc.player;
      if (p.pos) this.player.pos = [p.pos[0], p.pos[1] || 0, p.pos[2]];
      if (typeof p.carried === 'number') this.player.carried = p.carried;
      if (typeof p.flames === 'number') this.player.flames = p.flames;
    }
    if (sc && typeof sc.random_motes === 'boolean') this.randomMotes = sc.random_motes;
    if (sc && typeof sc.random_shades === 'boolean') this.randomShades = sc.random_shades;
    if (sc && typeof sc.time_left_s === 'number') this.initialTimeLeft = sc.time_left_s;

    if (sc && Array.isArray(sc.lanterns)) {
      for (const u of sc.lanterns) {
        const L = this.lanterns.find((x) => x.id === u.id);
        if (!L) continue;
        if (u.pos) L.pos = [u.pos[0], 0, u.pos[2]];
        if (typeof u.deposited === 'number') L.deposited = u.deposited;
        if (u.lit === true) { L.lit = true; L.deposited = Math.max(L.deposited, t.lantern_cost); }
      }
    }
    // motes: mảng toạ độ [[x,y,z], ...]
    if (sc && Array.isArray(sc.motes)) {
      this.motes = sc.motes.map((pos) => { this.moteCounter++; return { id: `m${this.moteCounter}`, pos: [pos[0], pos[1] || 0, pos[2]], active: true }; });
    } else if (this.randomMotes) {
      this._spawnInitialMotes();
    }
    // shades: [{pos, id?}]
    if (sc && Array.isArray(sc.shades)) {
      this.shades = sc.shades.map((s) => { this.shadeCounter++; return { id: s.id || `S${this.shadeCounter}`, pos: [s.pos[0], 0, s.pos[2]], state: 'chase', stun: 0 }; });
    }
  }

  get timeLeft() { return this.initialTimeLeft - this.steps / WORLD.tick_rate; }

  step(rawInput) {
    const events = [];
    if (this.status !== 'playing') return events;
    const t = this.tuning;
    const input = { ...DEFAULT_INPUT, ...(rawInput || {}) };
    const nextTick = this.tick + 1;

    const edge = {
      jump: !!input.jump && !this.prevHeld.jump,
      interact: !!input.interact && !this.prevHeld.interact,
      pulse: !!input.pulse && !this.prevHeld.pulse,
    };
    this.prevHeld = { jump: !!input.jump, interact: !!input.interact, pulse: !!input.pulse };

    if (this.player.invuln > 0) this.player.invuln = Math.max(0, this.player.invuln - DT);
    if (this.pulseCooldown > 0) this.pulseCooldown = Math.max(0, this.pulseCooldown - DT);
    for (const s of this.shades) if (s.stun > 0) { s.stun = Math.max(0, s.stun - DT); if (s.stun === 0 && s.state === 'stunned') s.state = 'chase'; }

    // Di chuyển Mây
    let mx = input.move[0] || 0, mz = input.move[1] || 0;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const th = ((input.cam_yaw_deg || 0) * Math.PI) / 180;
    const cos = Math.cos(th), sin = Math.sin(th);
    const wx = mx * cos + mz * sin, wz = -mx * sin + mz * cos;
    this.player.pos[0] += wx * t.player_speed * DT;
    this.player.pos[2] += wz * t.player_speed * DT;
    const pr = distXZ(this.player.pos, [0, 0, 0]);
    if (pr > WORLD.island_radius) { const k = WORLD.island_radius / pr; this.player.pos[0] *= k; this.player.pos[2] *= k; }
    if (edge.jump && this.player.pos[1] <= 1e-6) this.player.vy = WORLD.jump_speed;
    this.player.vy -= WORLD.gravity * DT;
    this.player.pos[1] += this.player.vy * DT;
    if (this.player.pos[1] < 0) { this.player.pos[1] = 0; this.player.vy = 0; }

    // Tỏa Sáng
    if (edge.pulse && this.pulseCooldown <= 0 && this.player.carried >= t.pulse_cost) {
      this.player.carried -= t.pulse_cost;
      this.pulseCooldown = t.pulse_cooldown_s;
      const stunned_ids = [];
      for (const s of this.shades) {
        if (distXZ(s.pos, this.player.pos) <= t.pulse_radius) {
          s.state = 'stunned'; s.stun = t.pulse_stun_s;
          let dx = s.pos[0] - this.player.pos[0], dz = s.pos[2] - this.player.pos[2];
          const d = Math.hypot(dx, dz) || 1;
          s.pos[0] += (dx / d) * t.pulse_push_m; s.pos[2] += (dz / d) * t.pulse_push_m;
          this._clamp(s.pos);
          stunned_ids.push(s.id);
          this.scoreValue += this.score.per_stun;
        }
      }
      events.push({ name: 'pulse', data: { stunned_ids } });
    }

    // Nạp đèn (interact)
    if (edge.interact && this.player.carried > 0) {
      let best = null, bestD = Infinity;
      for (const L of this.lanterns) { if (L.lit) continue; const d = distXZ(L.pos, this.player.pos); if (d <= t.interact_radius && d < bestD) { bestD = d; best = L; } }
      if (best) {
        const amount = Math.min(this.player.carried, t.lantern_cost - best.deposited);
        if (amount > 0) {
          this.player.carried -= amount; best.deposited += amount;
          events.push({ name: 'deposit', data: { lantern_id: best.id, amount, deposited: best.deposited } });
          if (best.deposited >= t.lantern_cost && !best.lit) {
            best.lit = true; this.scoreValue += this.score.per_lantern;
            events.push({ name: 'lantern_lit', data: { lantern_id: best.id } });
          }
        }
      }
    }

    // Sinh Bóng Mực
    if (this.randomShades && this.shades.length < WORLD.shade_max) {
      this.shadeSpawnTimer -= DT;
      if (this.shadeSpawnTimer <= 0) {
        this.shadeSpawnTimer = WORLD.shade_spawn_interval_s;
        const ang = this.rng() * Math.PI * 2; const R = WORLD.island_radius - 2;
        this.shadeCounter++;
        const sh = { id: `S${this.shadeCounter}`, pos: [Math.cos(ang) * R, 0, Math.sin(ang) * R], state: 'chase', stun: 0 };
        this.shades.push(sh);
        events.push({ name: 'shade_spawned', data: { id: sh.id } });
      }
    }

    // Di chuyển Bóng Mực (đuổi), tránh vùng an toàn
    for (const s of this.shades) {
      if (s.state === 'stunned') continue;
      let dx = this.player.pos[0] - s.pos[0], dz = this.player.pos[2] - s.pos[2];
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        const step = t.shade_speed * DT;
        let nx = s.pos[0] + (dx / d) * step, nz = s.pos[2] + (dz / d) * step;
        for (const L of this.lanterns) {
          if (!L.lit) continue;
          const dd = distXZ([nx, 0, nz], L.pos);
          if (dd < t.safe_radius) { const aw = Math.hypot(nx - L.pos[0], nz - L.pos[2]) || 1; nx = L.pos[0] + ((nx - L.pos[0]) / aw) * t.safe_radius; nz = L.pos[2] + ((nz - L.pos[2]) / aw) * t.safe_radius; }
        }
        s.pos[0] = nx; s.pos[2] = nz; this._clamp(s.pos);
      }
    }

    // Nhặt đom đóm
    for (const m of this.motes) {
      if (!m.active) continue;
      if (this.player.carried >= t.carry_capacity) break;
      if (distXZ(m.pos, this.player.pos) <= t.pickup_radius) {
        m.active = false; this.player.carried += 1; this.scoreValue += this.score.per_mote;
        events.push({ name: 'mote_picked', data: { carried: this.player.carried } });
      }
    }

    // Va chạm
    if (this.player.invuln <= 0) {
      for (const s of this.shades) {
        if (s.state === 'stunned') continue;
        if (distXZ(s.pos, this.player.pos) <= t.shade_hit_radius) {
          this.player.flames -= 1;
          const dropped = Math.floor(this.player.carried * t.hit_drop_ratio);
          this.player.carried -= dropped;
          this.player.invuln = t.invuln_s;
          events.push({ name: 'player_hit', data: { by: 'shade', flames: this.player.flames, dropped } });
          break;
        }
      }
    }

    this.steps += 1;
    this.tick = nextTick;

    // Thắng/thua
    let ended = null;
    if (this.player.flames <= 0) ended = 'no_flames';
    else if (this.lanterns.every((L) => L.lit)) ended = 'all_lit';
    else if (this.timeLeft <= 0) ended = 'dawn';
    if (ended && !this.gameOverEmitted) {
      this.gameOverEmitted = true;
      const result = ended === 'all_lit' ? 'won' : 'lost';
      this.status = result;
      if (result === 'won') this.scoreValue += Math.max(0, Math.floor(this.timeLeft)) * this.score.per_second_left;
      this.scoreValue += Math.max(0, this.player.flames) * this.score.per_flame_left;
      events.push({ name: 'game_over', data: { result, reason: ended } });
    }

    for (const e of events) e.tick = nextTick;
    return events;
  }

  _clamp(pos) { const r = distXZ(pos, [0, 0, 0]); if (r > WORLD.island_radius) { const k = WORLD.island_radius / r; pos[0] *= k; pos[2] *= k; } }

  snapshot() {
    return {
      type: 'snapshot',
      tick: this.tick,
      sim_tick: this.tick,
      state: this.status,
      time_left_s: r3(this.timeLeft),
      score: this.scoreValue,
      player: { pos: r3v(this.player.pos), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map((L) => ({ id: L.id, pos: r3v(L.pos), lit: L.lit, deposited: L.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: r3v(s.pos), state: s.state })),
      motes_active: this.motes.filter((m) => m.active).length,
      motes: this.motes.filter((m) => m.active).map((m) => ({ id: m.id, pos: r3v(m.pos) })),
    };
  }
}
