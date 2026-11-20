// Bộ test cơ chế cho lõi Ticket-03 / Test Contract v1.2. Chạy: node tests/run.js
// Test cũ bị Ticket-03 thay luật được đánh dấu [T03]; lý do chi tiết ở docs/proof/phase-3.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHeadless } from '../src/core/headlessRun.js';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
const evs = (l, n) => l.filter((x) => x.type === 'event' && x.name === n);
const snaps = (l) => l.filter((x) => x.type === 'snapshot');
const endOf = (l) => l[l.length - 1];
const snapAt = (l, tick) => l.find((x) => x.type === 'snapshot' && x.tick === tick);

const SC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenarios');
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
function runScenario(name, { night = 1, ticks, snapshotEvery = 1, seed = 1 }) {
  const scenario = readJson(path.join(SC_DIR, `${name}.scenario.json`));
  const inputs = readJson(path.join(SC_DIR, `${name}.inputs.json`));
  return runHeadless({ seed, night, ticks, snapshotEvery, scenario, inputs });
}

// ===================== Phase 1–2 còn hiệu lực =====================

console.log('Số chuẩn & snapshot v1.2');
{
  const l = runHeadless({ seed: 1, night: 1, ticks: 10, snapshotEvery: 5 });
  const s0 = snapAt(l, 0);
  check('night_start ở tick 0', evs(l, 'night_start').length === 1 && evs(l, 'night_start')[0].data.night === 1);
  check('[T03] Đêm 1 time_left = 240', s0.time_left_s === 240, s0.time_left_s);
  check('night=1 trong snapshot', s0.night === 1);
  check('5 đèn Đêm 1', s0.lanterns.length === 5);
  check('player có vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s', ['vel', 'grounded', 'invuln', 'dash_cd_s', 'pulse_cd_s', 'charm_s'].every((k) => k in s0.player));
  check('có wind/drifters/charms/motes', 'active' in s0.wind && Array.isArray(s0.drifters) && Array.isArray(s0.charms) && Array.isArray(s0.motes));
  check('20 đom đóm lúc đầu', s0.motes.filter((m) => m.kind === 'random').length === 20, s0.motes.length);
  check('v1.2: player.capacity = 10 lúc đầu', s0.player.capacity === 10, s0.player.capacity);
  check('v1.2: đèn tắt có fuel 0, ever_lit false, relit_count 0', s0.lanterns.every((L) => L.fuel === 0 && L.ever_lit === false && L.relit_count === 0));
  const l2 = runHeadless({ seed: 1, night: 2, ticks: 2, snapshotEvery: 2 });
  check('[T03] Đêm 2 time_left = 270, 6 đèn', snapAt(l2, 0).time_left_s === 270 && snapAt(l2, 0).lanterns.length === 6);
  const l3 = runHeadless({ seed: 1, night: 3, ticks: 2, snapshotEvery: 2 });
  check('[T03] Đêm 3 time_left = 300, 7 đèn', snapAt(l3, 0).time_left_s === 300 && snapAt(l3, 0).lanterns.length === 7);
}

console.log('Lướt (dash)');
{
  const l = runScenario('dash', { ticks: 3 });
  check('có event dash', evs(l, 'dash').length === 1);
  const s1 = snapAt(l, 1);
  check('vel ~ 14 m/s khi lướt', Math.abs(s1.player.vel[2] - 14) < 0.01, s1.player.vel[2]);
  check('dash_cd_s = 1.5 sau khi lướt', s1.player.dash_cd_s === 1.5, s1.player.dash_cd_s);
}

console.log('Tỏa Sáng (pulse)');
{
  const l = runScenario('pulse', { ticks: 3 });
  check('có event pulse với hit S1', evs(l, 'pulse')[0].data.hits.includes('S1'));
  const s1 = snapAt(l, 1);
  check('S1 state stunned', s1.shades[0].state === 'stunned', s1.shades[0].state);
  check('carried = 0 sau pulse', s1.player.carried === 0);
  check('pulse_cd_s = 3.0', s1.player.pulse_cd_s === 3.0, s1.player.pulse_cd_s);
  check('trúng Bóng không drain: +5', s1.score === 5, s1.score);
}

console.log('Bóng Mực gây hit & recoil');
{
  const l = runScenario('shade-hit', { ticks: 2 });
  const h = evs(l, 'player_hit')[0];
  check('player_hit reason shade', h.data.reason === 'shade');
  check('flames 3 -> 2', h.data.flames === 2);
  check('rơi 2 đom đóm', h.data.dropped === 2);
  check('bóng chuyển recoil', snapAt(l, 1).shades[0].state === 'recoil', snapAt(l, 1).shades[0].state);
  check('có đom đóm rơi (kind dropped)', snapAt(l, 1).motes.some((m) => m.kind === 'dropped'));
}

console.log('Rơi khỏi đảo & hồi sinh');
{
  const l = runScenario('fall', { ticks: 200, snapshotEvery: 200 });
  const f = evs(l, 'player_hit').find((e) => e.data.reason === 'fall');
  check('có player_hit reason fall', !!f);
  check('fall: mất toàn bộ đom đóm (lost=5)', f && f.data.lost === 5, f && f.data.lost);
  check('fall: -1 Ngọn Lửa', f && f.data.flames === 2, f && f.data.flames);
}

console.log('Gió Lạc cướp / thả');
{
  const l = runScenario('drifter-steal', { night: 2, ticks: 60, snapshotEvery: 60 });
  const st = evs(l, 'drifter_steal')[0];
  check('có drifter_steal, cướp 3, còn 3', st && st.data.amount === 3 && st.data.carried === 3, st && st.data);
  const l2 = runScenario('drifter-drop', { night: 2, ticks: 3 });
  const dr = evs(l2, 'drifter_drop')[0];
  check('pulse trúng Gió Lạc đang chạy -> thả lại 3', dr && dr.data.amount === 3, dr && dr.data);
}

console.log('Bùa Gió (charm)');
{
  const l = runScenario('charm', { night: 2, ticks: 2 });
  check('có charm_picked C1', evs(l, 'charm_picked')[0] && evs(l, 'charm_picked')[0].data.charm_id === 'C1');
  check('charm_s = 10', snapAt(l, 1).player.charm_s === 10, snapAt(l, 1).player.charm_s);
}

console.log('Tạm dừng (pause)');
{
  const l = runScenario('pause', { ticks: 4 });
  const s1 = snapAt(l, 1);
  check('có paused & resumed', evs(l, 'paused').length === 1 && evs(l, 'resumed').length === 1);
  check('snapshot state paused', s1.state === 'paused', s1.state);
  check('sim_tick đứng yên khi pause', s1.sim_tick === 0 && s1.tick === 1, `${s1.sim_tick}/${s1.tick}`);
}

console.log('Bục nhảy (Đêm 2)');
{
  const l = runScenario('jump-pad', { night: 2, ticks: 3 });
  const s1 = snapAt(l, 1);
  check('bục bắn lên (vel Y > 13) và rời đất', s1.player.vel[1] > 13 && s1.player.grounded === false, s1.player.vel);
}

console.log('Gió mạnh Đêm 3');
{
  const l = runHeadless({ seed: 1, night: 3, ticks: 1600, snapshotEvery: 50, scenario: { random_shades: false, random_motes: false, random_drifters: false } });
  check('có snapshot wind.active = true', snaps(l).some((s) => s.wind.active === true));
}

console.log('Tất định & hiệu năng');
{
  const a = runHeadless({ seed: 777, night: 1, ticks: 3000, snapshotEvery: 20 });
  const b = runHeadless({ seed: 777, night: 1, ticks: 3000, snapshotEvery: 20 });
  check('cùng seed -> JSONL giống hệt', JSON.stringify(a) === JSON.stringify(b));
  const t0 = Date.now();
  runHeadless({ seed: 1, night: 3, ticks: 300 * 60, snapshotEvery: 600 });
  const dt = Date.now() - t0;
  check('[T03] một Đêm dài nhất (18000 tick) < 10 s', dt < 10000, dt + 'ms');
}

console.log('Contract: lỗi & làm tròn');
{
  let code = null;
  try { runHeadless({ seed: 1, night: 1, ticks: 5, inputs: [{ tick: 2 }, { tick: 1 }] }); } catch (e) { code = e.code; }
  check('tick không tăng -> code 2', code === 2);
  const l = runHeadless({ seed: 3, night: 1, ticks: 120, snapshotEvery: 30 });
  check('toạ độ làm tròn 3 số', snaps(l).every((s) => s.player.pos.every((c) => Math.round(c * 1000) === c * 1000)));
}

// ===================== Ticket-03 =====================

console.log('[T03] Nạp từng phần vẫn giữ');
{
  const l = runScenario('p3-partial-deposit', { ticks: 2 });
  const d = evs(l, 'deposit')[0];
  check('deposit amount 4, deposited 4', d && d.data.amount === 4 && d.data.deposited === 4, d && d.data);
  check('chưa sáng, +5/đom đóm = 20 điểm', !snapAt(l, 1).lanterns[0].lit && snapAt(l, 1).score === 20, snapAt(l, 1).score);
}

console.log('[T03] Thắp lần đầu (thay test "Nạp đèn & thắng")');
{
  const l = runScenario('p3-no-early-win', { ticks: 60, snapshotEvery: 60 });
  const lit = evs(l, 'lantern_lit')[0];
  check('lantern_lit L1 relight=false', lit && lit.data.lantern_id === 'L1' && lit.data.relight === false, lit && lit.data);
  const s = snapAt(l, 60);
  check('5/5 đèn sáng', s.lanterns.every((L) => L.lit));
  check('KHÔNG thắng sớm: không game_over, state playing', evs(l, 'game_over').length === 0 && endOf(l).state === 'playing', endOf(l));
  check('điểm = 10*5 + 100 = 150', s.score === 150, s.score);
  check('đèn vừa thắp fuel = 100 rồi hao 1/s: 59 tick -> 99', s.lanterns[0].fuel === 99, s.lanterns[0].fuel);
}

console.log('[T03] Thắp lại');
{
  const l = runScenario('p3-relight', { ticks: 2 });
  const lit = evs(l, 'lantern_lit')[0];
  check('chỉ cần 5 đom đóm, lantern_lit relight=true', lit && lit.data.relight === true, lit && lit.data);
  const L = snapAt(l, 1).lanterns[0];
  check('relit_count 1, ever_lit, fuel 100', L.relit_count === 1 && L.ever_lit && L.fuel === 100, L);
  check('điểm = 5*5 + 40 = 65', snapAt(l, 1).score === 65, snapAt(l, 1).score);
}

console.log('[T03] Châm dầu');
{
  const l = runScenario('p3-refuel', { ticks: 2 });
  const r = evs(l, 'refuel')[0];
  check('refuel used = 6, fuel 100', r && r.data.amount === 6 && r.data.fuel === 100, r && r.data);
  check('trừ 6 đom đóm, +30 điểm, không có lantern_lit', snapAt(l, 1).player.carried === 14 && snapAt(l, 1).score === 30 && evs(l, 'lantern_lit').length === 0);
}

console.log('[T03] Hết dầu');
{
  const l = runScenario('p3-lantern-out', { ticks: 40, snapshotEvery: 10 });
  const o = evs(l, 'lantern_out')[0];
  check('lantern_out L1 đúng tick 30', o && o.tick === 30 && o.data.lantern_id === 'L1', o);
  const L = snapAt(l, 30).lanterns[0];
  check('tắt: lit false, fuel 0, deposited 0, ever_lit true', !L.lit && L.fuel === 0 && L.deposited === 0 && L.ever_lit, L);
  check('fuel xuất 1 chữ số thập phân', snapAt(l, 10).lanterns[0].fuel === 0.3, snapAt(l, 10).lanterns[0].fuel);
}

console.log('[T03] Bóng Mực hút dầu (drain)');
{
  const l = runScenario('p3-drain', { ticks: 180, snapshotEvery: 60 });
  check('wander -> drain khi cách đèn yếu <= 2 m', snapAt(l, 60).shades[0].state === 'drain', snapAt(l, 60).shades[0].state);
  check('Bóng đứng yên khi drain', JSON.stringify(snapAt(l, 60).shades[0].pos) === JSON.stringify(snapAt(l, 180).shades[0].pos));
  const fd = evs(l, 'fuel_drain');
  check('fuel_drain mỗi 60 tick (tick 61, 121)', fd.length === 2 && fd[0].tick === 61 && fd[1].tick === 121, fd.map((e) => e.tick));
  check('fuel_drain.fuel = fuel còn lại (14)', fd[0] && fd[0].data.fuel === 14 && fd[0].data.shade_id === 'S1', fd[0] && fd[0].data);
  const s = runScenario('p3-drain-stack', { ticks: 60, snapshotEvery: 60 });
  check('2 Bóng cộng dồn: 20 - 60*(10+1)/60 = 9', snapAt(s, 60).lanterns[0].fuel === 9, snapAt(s, 60).lanterns[0].fuel);
}

console.log('[T03] Vùng an toàn theo dầu');
{
  const near = (fuel) => runHeadless({ seed: 1, night: 1, ticks: 1, snapshotEvery: 1,
    scenario: { random_motes: false, random_shades: false, player: { pos: [0, 0, -30] }, lanterns: [{ id: 'L1', lit: true, fuel }], shades: [{ id: 'S1', pos: [0, 0, 22], state: 'stunned', state_ticks_left: 100 }] } });
  check('fuel < 30: không có vùng an toàn (Bóng ở 3 m không bị đẩy)', snapAt(near(29.5), 1).shades[0].pos[2] === 22, snapAt(near(29.5), 1).shades[0].pos);
  check('fuel 30.1 (>= 30): bị chặn ở mép 6 m', snapAt(near(30.1), 1).shades[0].pos[2] === 19, snapAt(near(30.1), 1).shades[0].pos);
}

console.log('[T03] Thoát drain');
{
  const c = runScenario('p3-drain-chase', { ticks: 1 });
  check('Mây trong 6 m -> chase', snapAt(c, 1).shades[0].state === 'chase', snapAt(c, 1).shades[0].state);
  const r = runScenario('p3-drain-refuel', { ticks: 30 });
  check('châm lên >= 30 -> Bóng bị đẩy ra mép 6 m', snapAt(r, 1).shades[0].pos[2] === 31, snapAt(r, 1).shades[0].pos);
  check('không gây sát thương trong lúc bị đẩy', evs(r, 'player_hit').length === 0);
  check('rời drain', snapAt(r, 1).shades[0].state !== 'drain', snapAt(r, 1).shades[0].state);
  const p = runScenario('p3-drain-pulse', { ticks: 1 });
  check('Tỏa Sáng trúng Bóng đang drain: stunned, +15', snapAt(p, 1).shades[0].state === 'stunned' && snapAt(p, 1).score === 15, snapAt(p, 1).score);
}

console.log('[T03] Luật thắng mới');
{
  const w = runScenario('p3-dawn-win', { ticks: 120, snapshotEvery: 120 });
  const go = evs(w, 'game_over')[0];
  check('3/5 sáng ở bình minh -> dawn_survived, won', go && go.data.reason === 'dawn_survived' && endOf(w).state === 'won', go && go.data);
  check('thưởng: (50+99)*2 + (50+49) + 3*50 = 547', go && go.data.score === 547, go && go.data.score);
  const lo = runScenario('p3-dawn-lose', { ticks: 120, snapshotEvery: 120 });
  const g2 = evs(lo, 'game_over')[0];
  check('2/5 sáng -> thua dawn, không thưởng', g2 && g2.data.reason === 'dawn' && g2.data.score === 0 && endOf(lo).state === 'lost', g2 && g2.data);
  const nf = runScenario('p3-no-flames-dawn', { ticks: 5 });
  const g3 = evs(nf, 'game_over')[0];
  check('tick bình minh mà hết Ngọn Lửa -> no_flames trước', g3 && g3.tick === 1 && g3.data.reason === 'no_flames', g3);
  for (const [night, need] of [[1, 3], [2, 4], [3, 5]]) {
    const lights = (k) => runHeadless({ seed: 1, night, ticks: 2, snapshotEvery: 2, scenario: { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, time_left_s: 1 / 60, lanterns: Array.from({ length: k }, (_, i) => ({ id: 'L' + (i + 1), lit: true })) } });
    const ok = evs(lights(need), 'game_over')[0], bad = evs(lights(need - 1), 'game_over')[0];
    check(`Đêm ${night}: cần ${need} đèn`, ok && ok.data.reason === 'dawn_survived' && bad && bad.data.reason === 'dawn', [ok && ok.data.reason, bad && bad.data.reason]);
  }
}

console.log('[T03] Sức chứa tăng dần');
{
  const l = runScenario('p3-capacity', { ticks: 2 });
  check('thắp 1 đèn -> capacity 12', snapAt(l, 1).player.capacity === 12, snapAt(l, 1).player.capacity);
  const m = runHeadless({ seed: 1, night: 1, ticks: 1, snapshotEvery: 1, scenario: { random_motes: false, random_shades: false, player: { pos: [0, 0, 0], carried: 19, successful_lights: 9 }, motes: [{ pos: [0, 0, 0.5] }, { pos: [0, 0, -0.5] }] } });
  check('trần 20: successful_lights 9 -> capacity 20, nhặt tối đa tới 20', snapAt(m, 1).player.capacity === 20 && snapAt(m, 1).player.carried === 20, snapAt(m, 1).player);
  const pre = runHeadless({ seed: 1, night: 1, ticks: 1, snapshotEvery: 1, scenario: { random_motes: false, random_shades: false, lanterns: [{ id: 'L1', lit: true }, { id: 'L2', lit: true }] } });
  check('đèn đặt sẵn bằng scenario không tính vào sức chứa', snapAt(pre, 1).player.capacity === 10, snapAt(pre, 1).player.capacity);
}

console.log(`\nKết quả: ${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
