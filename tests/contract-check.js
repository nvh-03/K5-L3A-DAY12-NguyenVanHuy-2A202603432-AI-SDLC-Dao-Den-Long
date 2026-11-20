// (1) Bộ kiểm tra tuân thủ Test Contract v1.3 (đầu ra headless giữ nguyên v1.2): đọc JSONL đầu ra và kiểm mọi dòng
// đúng schema/nhịp/kiểu, trên nhiều seed x 3 Đêm x chạy dài; đối chiếu game.contract.json.
// Chạy độc lập: node tests/contract-check.js   (exit !=0 nếu có lỗi)
import fs from 'node:fs';
import { runHeadless } from '../src/core/headlessRun.js';
import { TUNING } from '../src/core/config.js';
import { fileURLToPath } from 'node:url';

const SHADE_STATES = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain']);
const DRIFTER_STATES = new Set(['idle', 'chase', 'flee']); // removed đã bị lọc khỏi snapshot
const MOTE_KINDS = new Set(['random', 'dropped']);
const STATES = new Set(['playing', 'won', 'lost', 'paused']);
const REASONS = new Set(['dawn_survived', 'dawn', 'no_flames']);
const EVENTS = new Set(['night_start', 'mote_picked', 'deposit', 'lantern_lit', 'pulse', 'player_hit', 'shade_spawned', 'dash', 'charm_picked', 'drifter_steal', 'drifter_drop', 'paused', 'resumed', 'game_over', 'refuel', 'lantern_out', 'fuel_drain']);

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isInt = (x) => Number.isInteger(x);
const isBool = (x) => typeof x === 'boolean';
const isStr = (x) => typeof x === 'string';
const isRound3 = (x) => isNum(x) && Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-6;
const isRound1 = (x) => isNum(x) && Math.abs(x * 10 - Math.round(x * 10)) < 1e-6;
const isFuel = (x) => isRound1(x) && x >= 0 && x <= 100;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isRound3);

// Schema data của các event có quy định trong v1.2.
const EVENT_DATA = {
  refuel: (d) => isStr(d.lantern_id) && isInt(d.amount) && d.amount > 0 && isFuel(d.fuel),
  lantern_out: (d) => isStr(d.lantern_id),
  fuel_drain: (d) => isStr(d.lantern_id) && isStr(d.shade_id) && isFuel(d.fuel),
  lantern_lit: (d) => isStr(d.lantern_id) && isBool(d.relight),
  deposit: (d) => isStr(d.lantern_id) && isInt(d.amount) && isInt(d.deposited),
  game_over: (d) => REASONS.has(d.reason) && isNum(d.score),
};

// Trả về mảng chuỗi lỗi (rỗng = đạt).
export function checkLines(lines, { night, snapshotEvery }) {
  const err = [];
  const E = (i, msg) => err.push(`dòng ${i}: ${msg}`);
  if (!lines.length) { err.push('không có dòng nào'); return err; }

  // night_start đúng 1, tick 0
  const ns = lines.filter((l) => l.type === 'event' && l.name === 'night_start');
  if (ns.length !== 1) err.push(`night_start phải xuất hiện đúng 1 lần (thấy ${ns.length})`);
  else if (ns[0].tick !== 0 || ns[0].data.night !== night) err.push('night_start phải ở tick 0 và đúng night');

  // end đúng 1 và là dòng cuối
  const ends = lines.filter((l) => l.type === 'end');
  if (ends.length !== 1) err.push(`phải có đúng 1 dòng end (thấy ${ends.length})`);
  if (lines[lines.length - 1].type !== 'end') err.push('dòng cuối phải là end');

  let lastTick = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.type === 'end') {
      if (!isInt(l.ticks)) E(i, 'end.ticks phải nguyên');
      if (!STATES.has(l.state)) E(i, `end.state không hợp lệ: ${l.state}`);
      if (!isNum(l.score)) E(i, 'end.score phải là số');
      continue;
    }
    if (!isInt(l.tick) || l.tick < 0) E(i, 'tick phải là số nguyên ≥ 0');
    if (l.tick < lastTick) E(i, `tick giảm (${l.tick} < ${lastTick})`);
    lastTick = Math.max(lastTick, l.tick);

    if (l.type === 'event') {
      if (!EVENTS.has(l.name)) E(i, `event.name lạ: ${l.name}`);
      if (typeof l.data !== 'object' || l.data === null) E(i, 'event.data phải là object');
      else if (EVENT_DATA[l.name] && !EVENT_DATA[l.name](l.data)) E(i, `${l.name}.data sai schema: ${JSON.stringify(l.data)}`);
      continue;
    }
    if (l.type === 'snapshot') {
      // nhịp: tick %every==0, hoặc là snapshot ngay trước end (trạng thái kết thúc)
      const nextIsEnd = i + 1 < lines.length && lines[i + 1].type === 'end';
      if (l.tick % snapshotEvery !== 0 && !nextIsEnd) E(i, `snapshot sai nhịp: tick ${l.tick} không chia hết ${snapshotEvery}`);
      if (!isInt(l.sim_tick)) E(i, 'sim_tick phải nguyên');
      if (l.sim_tick > l.tick) E(i, 'sim_tick > tick');
      if (!STATES.has(l.state)) E(i, `state lạ: ${l.state}`);
      if (l.night !== night) E(i, 'night sai');
      if (!isNum(l.time_left_s)) E(i, 'time_left_s phải là số');
      if (!isNum(l.score)) E(i, 'score phải là số');
      if (!l.wind || !isBool(l.wind.active) || !isNum(l.wind.dir_deg)) E(i, 'wind {active,dir_deg} sai');
      const p = l.player;
      if (!p) E(i, 'thiếu player');
      else {
        if (!isVec3(p.pos)) E(i, 'player.pos phải là vec3 làm tròn 3 số');
        if (!isVec3(p.vel)) E(i, 'player.vel phải là vec3 làm tròn 3 số');
        if (!isBool(p.grounded)) E(i, 'player.grounded phải bool');
        if (!isInt(p.flames)) E(i, 'player.flames phải nguyên');
        if (!isInt(p.capacity) || p.capacity < 10 || p.capacity > 20 || p.capacity % 2 !== 0) E(i, `player.capacity sai: ${p.capacity}`);
        if (!isInt(p.carried) || p.carried < 0 || p.carried > p.capacity) E(i, `player.carried ngoài [0,capacity]: ${p.carried}/${p.capacity}`);
        for (const k of ['invuln']) if (!isNum(p[k])) E(i, `player.${k} phải là số`);
        for (const k of ['dash_cd_s', 'pulse_cd_s', 'charm_s']) if (!isNum(p[k])) E(i, `player.${k} phải là số`);
      }
      for (const L of l.lanterns || []) {
        if (!isStr(L.id) || !isVec3(L.pos) || !isBool(L.lit) || !isNum(L.deposited)) E(i, `lantern sai: ${JSON.stringify(L)}`);
        if (!isFuel(L.fuel) || !isBool(L.ever_lit) || !isInt(L.relit_count) || L.relit_count < 0) E(i, `lantern v1.2 sai: ${JSON.stringify(L)}`);
        if (!L.lit && L.fuel !== 0) E(i, `đèn tắt phải có fuel 0: ${JSON.stringify(L)}`);
        if (L.lit && !L.ever_lit) E(i, `đèn sáng phải có ever_lit: ${JSON.stringify(L)}`);
      }
      for (const s of l.shades || []) if (typeof s.id !== 'string' || !isVec3(s.pos) || !SHADE_STATES.has(s.state)) E(i, `shade sai: ${JSON.stringify(s)}`);
      for (const m of l.motes || []) if (typeof m.id !== 'string' || !isVec3(m.pos) || !MOTE_KINDS.has(m.kind) || !(m.ttl_s === null || isNum(m.ttl_s))) E(i, `mote sai: ${JSON.stringify(m)}`);
      for (const d of l.drifters || []) if (typeof d.id !== 'string' || !isVec3(d.pos) || !DRIFTER_STATES.has(d.state) || !isNum(d.stolen)) E(i, `drifter sai: ${JSON.stringify(d)}`);
      for (const c of l.charms || []) if (typeof c.id !== 'string' || !isBool(c.available) || !isNum(c.respawn_s)) E(i, `charm sai: ${JSON.stringify(c)}`);
    }
  }
  return err;
}

export function runContractChecks() {
  const seeds = [1, 2, 7, 42, 123];
  const nights = [1, 2, 3];
  const everies = [1, 10, 25];
  let runs = 0, bad = 0;
  const problems = [];
  for (const night of nights) for (const seed of seeds) for (const every of everies) {
    const ticks = 1800;
    let lines;
    try { lines = runHeadless({ seed, night, ticks, snapshotEvery: every }); }
    catch (e) { bad++; problems.push(`seed ${seed} night ${night}: NÉM LỖI ${e.message || e}`); continue; }
    runs++;
    const errs = checkLines(lines, { night, snapshotEvery: every });
    if (errs.length) { bad++; problems.push(`seed ${seed} night ${night} every ${every}:\n    ` + errs.slice(0, 5).join('\n    ')); }
  }
  // Ca có kịch bản: pause, vòng đời dầu (drain -> lantern_out -> thắp lại), và chạy trọn Đêm tới bình minh.
  const weak = { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [0, 0, 22], carried: 10 },
    lanterns: [{ id: 'L1', lit: true, fuel: 12 }], shades: [{ id: 'S1', pos: [0, 0, 26.5], state: 'wander' }] };
  const extra = [
    { name: 'pause', night: 1, inputs: [{ tick: 0, pause: true }, { tick: 30, pause: false }], ticks: 60, every: 1,
      expect: (ls) => ls.some((l) => l.type === 'snapshot' && l.state === 'paused' && l.sim_tick < l.tick) || 'không thấy snapshot paused với sim_tick<tick' },
    { name: 'fuel-cycle', night: 1, scenario: { ...weak, player: { pos: [0, 0, -30], carried: 10 } }, ticks: 150, every: 1,
      expect: (ls) => ['fuel_drain', 'lantern_out'].every((n) => ls.some((l) => l.name === n)) || 'thiếu fuel_drain/lantern_out' },
    { name: 'relight-refuel', night: 1, scenario: { ...weak, shades: [] }, ticks: 900, every: 5,
      inputs: [{ tick: 0, move: [0, 1] }, { tick: 30, move: [0, 0] }, { tick: 800, interact: true }, { tick: 801, interact: false }, { tick: 803, interact: true }],
      expect: (ls) => ['lantern_out', 'lantern_lit', 'refuel'].every((n) => ls.some((l) => l.name === n)) || 'thiếu lantern_out/lantern_lit/refuel' },
    { name: 'full-night-dawn', night: 1, scenario: { random_shades: false }, ticks: TUNING.night1_duration_s * 60 + 5, every: 600,
      expect: (ls) => ls.some((l) => l.name === 'game_over' && l.data.reason === 'dawn' && l.tick === TUNING.night1_duration_s * 60) || 'không kết thúc bằng dawn đúng tick 14400' },
  ];
  for (const x of extra) {
    const lines = runHeadless({ seed: 1, night: x.night, ticks: x.ticks, scenario: x.scenario || null, inputs: x.inputs || null, snapshotEvery: x.every });
    runs++;
    const errs = checkLines(lines, { night: x.night, snapshotEvery: x.every });
    const ok = x.expect(lines);
    if (errs.length) { bad++; problems.push(`extra ${x.name}: ` + errs.slice(0, 3).join('; ')); }
    if (ok !== true) { bad++; problems.push(`extra ${x.name}: ${ok}`); }
  }

  // game.contract.json phải khai báo v1.2 và đúng số chuẩn Ticket-03.
  runs++;
  const decl = JSON.parse(fs.readFileSync(new URL('../game.contract.json', import.meta.url), 'utf8'));
  const want = { fuel_max: 100, fuel_decay_per_s: 1.0, fuel_per_mote: 10, relight_cost: 5, win_ratio: 0.6, drain_per_s: 5, low_fuel_threshold: 30, capacity_max: 20, night1_duration_s: 240, night2_duration_s: 270, night3_duration_s: 300 };
  const declErr = [];
  if (decl.contract_version !== '1.3') declErr.push(`contract_version = ${decl.contract_version}`);
  for (const k of ['run_cmd', 'headless_cmd', 'bench_cmd', 'soak_cmd']) {
    const script = /^node(?: --\S+)* (\S+)$/.exec(decl[k] || '')?.[1];
    if (!script || !fs.existsSync(new URL('../' + script, import.meta.url))) declErr.push(`${k} không trỏ tới script có thật: ${decl[k]}`);
  }
  for (const [k, v] of Object.entries(want)) {
    if (decl.tuning[k] !== v) declErr.push(`tuning.${k} = ${decl.tuning[k]} (cần ${v})`);
    if (TUNING[k] !== v) declErr.push(`config TUNING.${k} = ${TUNING[k]} (cần ${v})`);
  }
  if (declErr.length) { bad++; problems.push('game.contract.json: ' + declErr.join('; ')); }
  return { runs, bad, problems };
}

function isMain() { try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } }
if (isMain()) {
  console.log('(1) Kiểm tra tuân thủ Contract v1.3');
  const { runs, bad, problems } = runContractChecks();
  for (const p of problems) console.error('  ✗ ' + p);
  console.log(`  ${runs} lần chạy, ${bad} có lỗi`);
  console.log(bad ? '\nContract check: TRƯỢT' : '\nContract check: ĐẠT');
  process.exit(bad ? 1 : 0);
}
