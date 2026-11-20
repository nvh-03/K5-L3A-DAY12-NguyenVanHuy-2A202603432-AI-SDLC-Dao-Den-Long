// (1) Bộ kiểm tra tuân thủ Test Contract v1.1: đọc JSONL đầu ra và kiểm mọi dòng
// đúng schema/nhịp/kiểu, trên nhiều seed x 3 Đêm x chạy dài.
// Chạy độc lập: node tests/contract-check.js   (exit !=0 nếu có lỗi)
import { runHeadless } from '../src/core/headlessRun.js';
import { fileURLToPath } from 'node:url';

const SHADE_STATES = new Set(['spawning', 'wander', 'chase', 'recoil', 'stunned']);
const DRIFTER_STATES = new Set(['idle', 'chase', 'flee']); // removed đã bị lọc khỏi snapshot
const MOTE_KINDS = new Set(['random', 'dropped']);
const STATES = new Set(['playing', 'won', 'lost', 'paused']);
const EVENTS = new Set(['night_start', 'mote_picked', 'deposit', 'lantern_lit', 'pulse', 'player_hit', 'shade_spawned', 'dash', 'charm_picked', 'drifter_steal', 'drifter_drop', 'paused', 'resumed', 'game_over']);

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const isInt = (x) => Number.isInteger(x);
const isBool = (x) => typeof x === 'boolean';
const isRound3 = (x) => isNum(x) && Math.abs(x * 1000 - Math.round(x * 1000)) < 1e-6;
const isVec3 = (v) => Array.isArray(v) && v.length === 3 && v.every(isRound3);

// Trả về mảng chuỗi lỗi (rỗng = đạt).
export function checkLines(lines, { night, snapshotEvery, capacity = 10 }) {
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
        if (!isInt(p.carried) || p.carried < 0 || p.carried > capacity) E(i, `player.carried ngoài [0,${capacity}]: ${p.carried}`);
        for (const k of ['invuln']) if (!isNum(p[k])) E(i, `player.${k} phải là số`);
        for (const k of ['dash_cd_s', 'pulse_cd_s', 'charm_s']) if (!isNum(p[k])) E(i, `player.${k} phải là số`);
      }
      for (const L of l.lanterns || []) if (typeof L.id !== 'string' || !isVec3(L.pos) || !isBool(L.lit) || !isNum(L.deposited)) E(i, `lantern sai: ${JSON.stringify(L)}`);
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
  // Thêm vài ca có kịch bản/pause để kiểm trạng thái paused & kết thúc sớm
  const extra = [
    { name: 'pause', night: 1, inputs: [{ tick: 0, pause: true }, { tick: 30, pause: false }], ticks: 60, every: 1 },
  ];
  for (const x of extra) {
    const lines = runHeadless({ seed: 1, night: x.night, ticks: x.ticks, inputs: x.inputs, snapshotEvery: x.every });
    runs++;
    const errs = checkLines(lines, { night: x.night, snapshotEvery: x.every });
    const hasPaused = lines.some((l) => l.type === 'snapshot' && l.state === 'paused' && l.sim_tick < l.tick);
    if (errs.length) { bad++; problems.push(`extra ${x.name}: ` + errs.slice(0, 3).join('; ')); }
    if (!hasPaused) { bad++; problems.push(`extra ${x.name}: không thấy snapshot paused với sim_tick<tick`); }
  }
  return { runs, bad, problems };
}

function isMain() { try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } }
if (isMain()) {
  console.log('(1) Kiểm tra tuân thủ Contract v1.1');
  const { runs, bad, problems } = runContractChecks();
  for (const p of problems) console.error('  ✗ ' + p);
  console.log(`  ${runs} lần chạy, ${bad} có lỗi`);
  console.log(bad ? '\nContract check: TRƯỢT' : '\nContract check: ĐẠT');
  process.exit(bad ? 1 : 0);
}
