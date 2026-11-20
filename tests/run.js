// Bộ test cho lõi Ticket-02 / Test Contract v1.1. Chạy: node tests/run.js
import { runHeadless } from '../src/core/headlessRun.js';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
}
const evs = (l, n) => l.filter((x) => x.type === 'event' && x.name === n);
const snaps = (l) => l.filter((x) => x.type === 'snapshot');
const endOf = (l) => l[l.length - 1];
const snapAt = (l, tick) => l.find((x) => x.type === 'snapshot' && x.tick === tick);

// 1) Số chuẩn & contract v1.1
console.log('Số chuẩn & snapshot v1.1');
{
  const l = runHeadless({ seed: 1, night: 1, ticks: 10, snapshotEvery: 5 });
  const s0 = snapAt(l, 0);
  check('night_start ở tick 0', evs(l, 'night_start').length === 1 && evs(l, 'night_start')[0].data.night === 1);
  check('Đêm 1 time_left = 300', s0.time_left_s === 300, s0.time_left_s);
  check('night=1 trong snapshot', s0.night === 1);
  check('5 đèn Đêm 1', s0.lanterns.length === 5);
  check('player có vel/grounded/invuln/dash_cd_s/pulse_cd_s/charm_s', 'vel' in s0.player && 'grounded' in s0.player && 'dash_cd_s' in s0.player && 'charm_s' in s0.player);
  check('có mảng wind/drifters/charms/motes', 'active' in s0.wind && Array.isArray(s0.drifters) && Array.isArray(s0.charms) && Array.isArray(s0.motes));
  check('20 đom đóm lúc đầu', s0.motes.filter((m) => m.kind === 'random').length === 20, s0.motes.length);
  const l2 = runHeadless({ seed: 1, night: 2, ticks: 2, snapshotEvery: 2 });
  check('Đêm 2 time_left = 330, 6 đèn', snapAt(l2, 0).time_left_s === 330 && snapAt(l2, 0).lanterns.length === 6);
  const l3 = runHeadless({ seed: 1, night: 3, ticks: 2, snapshotEvery: 2 });
  check('Đêm 3 time_left = 360, 7 đèn', snapAt(l3, 0).time_left_s === 360 && snapAt(l3, 0).lanterns.length === 7);
}

// 2) Thắng bằng cách nạp đèn (điểm chuẩn)
console.log('Nạp đèn & thắng (điểm chuẩn)');
{
  const scenario = { random_motes: false, random_shades: false, player: { pos: [0, 0, 24], carried: 10, flames: 3 },
    lanterns: [{ id: 'L2', lit: true }, { id: 'L3', lit: true }, { id: 'L4', lit: true }, { id: 'L5', lit: true }] };
  const inputs = [{ tick: 0, interact: true }, { tick: 1, interact: false }];
  const l = runHeadless({ seed: 1, night: 1, ticks: 10, snapshotEvery: 1, scenario, inputs });
  check('deposit amount 10', evs(l, 'deposit')[0].data.amount === 10);
  check('lantern_lit L1', evs(l, 'lantern_lit')[0].data.lantern_id === 'L1');
  check('game_over reason won', evs(l, 'game_over')[0].data.reason === 'won');
  check('end.state won', endOf(l).state === 'won');
  // điểm: 10 nạp*10 + 100 đèn + floor(sec)*2 + 50*3
  const go = evs(l, 'game_over')[0].data;
  check('điểm có thưởng thắng (>400)', go.score > 400, go.score);
}

// 3) Lướt (dash)
console.log('Lướt (dash)');
{
  const scenario = { random_motes: false, random_shades: false, player: { pos: [0, 0, 0] } };
  const inputs = [{ tick: 0, move: [0, 1], dash: true }, { tick: 1, dash: false }];
  const l = runHeadless({ seed: 1, night: 1, ticks: 3, snapshotEvery: 1, scenario, inputs });
  check('có event dash', evs(l, 'dash').length === 1);
  const s1 = snapAt(l, 1);
  check('vel ~ 14 m/s khi lướt', Math.abs(s1.player.vel[2] - 14) < 0.01, s1.player.vel[2]);
  check('dash_cd_s = 1.5 sau khi lướt', s1.player.dash_cd_s === 1.5, s1.player.dash_cd_s);
}

// 4) Tỏa Sáng trúng Bóng Mực
console.log('Tỏa Sáng (pulse)');
{
  const scenario = { random_motes: false, random_shades: false, player: { pos: [0, 0, 0], carried: 3 }, shades: [{ id: 'S1', pos: [0, 0, 3], state: 'wander' }] };
  const inputs = [{ tick: 0, pulse: true }, { tick: 1, pulse: false }];
  const l = runHeadless({ seed: 1, night: 1, ticks: 3, snapshotEvery: 1, scenario, inputs });
  check('có event pulse với hit S1', evs(l, 'pulse')[0].data.hits.includes('S1'));
  const s1 = snapAt(l, 1);
  check('S1 state stunned', s1.shades[0].state === 'stunned', s1.shades[0].state);
  check('carried = 0 sau pulse', s1.player.carried === 0);
  check('pulse_cd_s = 3.0', s1.player.pulse_cd_s === 3.0, s1.player.pulse_cd_s);
}

// 5) Bóng Mực chạm -> mất lửa, recoil
console.log('Bóng Mực gây hit & recoil');
{
  const scenario = { random_motes: false, random_shades: false, player: { pos: [0, 0, 0], carried: 4 }, shades: [{ id: 'S1', pos: [0, 0, 0.5], state: 'chase' }] };
  const l = runHeadless({ seed: 1, night: 1, ticks: 2, snapshotEvery: 1, scenario });
  const h = evs(l, 'player_hit')[0];
  check('player_hit reason shade', h.data.reason === 'shade');
  check('flames 3 -> 2', h.data.flames === 2);
  check('rơi 2 đom đóm', h.data.dropped === 2);
  check('bóng chuyển recoil', snapAt(l, 1).shades[0].state === 'recoil', snapAt(l, 1).shades[0].state);
  check('có đom đóm rơi (kind dropped)', snapAt(l, 1).motes.some((m) => m.kind === 'dropped'));
}

// 6) Rơi khỏi đảo
console.log('Rơi khỏi đảo & hồi sinh');
{
  const scenario = { random_motes: false, random_shades: false, player: { pos: [0, 0, 39.5], carried: 5 } };
  const inputs = [{ tick: 0, move: [0, 1] }];
  const l = runHeadless({ seed: 1, night: 1, ticks: 200, snapshotEvery: 200, scenario, inputs });
  const f = evs(l, 'player_hit').find((e) => e.data.reason === 'fall');
  check('có player_hit reason fall', !!f);
  check('fall: mất toàn bộ đom đóm (lost=5)', f && f.data.lost === 5, f && f.data.lost);
  check('fall: -1 Ngọn Lửa', f && f.data.flames === 2, f && f.data.flames);
}

// 7) Gió Lạc cướp (Đêm 2)
console.log('Gió Lạc cướp');
{
  const scenario = { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [0, 0, 0], carried: 6 }, drifters: [{ id: 'D1', pos: [0, 0, 3], state: 'idle' }] };
  const l = runHeadless({ seed: 1, night: 2, ticks: 60, snapshotEvery: 60, scenario });
  const st = evs(l, 'drifter_steal')[0];
  check('có drifter_steal', !!st);
  check('cướp 3 đom đóm', st && st.data.amount === 3, st && st.data.amount);
  check('carried còn 3', st && st.data.carried === 3, st && st.data.carried);
}

// 8) Gió Lạc bị pulse -> thả đồ
console.log('Gió Lạc trúng pulse thả đồ');
{
  const scenario = { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [0, 0, 0], carried: 3 }, drifters: [{ id: 'D1', pos: [0, 0, 2], state: 'flee', stolen: 3 }] };
  const inputs = [{ tick: 0, pulse: true }];
  const l = runHeadless({ seed: 1, night: 2, ticks: 3, snapshotEvery: 1, scenario, inputs });
  const dr = evs(l, 'drifter_drop')[0];
  check('có drifter_drop', !!dr);
  check('thả lại 3', dr && dr.data.amount === 3, dr && dr.data.amount);
}

// 9) Bùa Gió
console.log('Bùa Gió (charm)');
{
  const scenario = { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [35, 0, 0], carried: 0 } };
  const l = runHeadless({ seed: 1, night: 2, ticks: 2, snapshotEvery: 1, scenario });
  check('có charm_picked C1', evs(l, 'charm_picked')[0] && evs(l, 'charm_picked')[0].data.charm_id === 'C1');
  check('charm_s = 10', snapAt(l, 1).player.charm_s === 10, snapAt(l, 1).player.charm_s);
}

// 10) Tạm dừng
console.log('Tạm dừng (pause)');
{
  const inputs = [{ tick: 0, pause: true }, { tick: 1, pause: false }, { tick: 2, pause: true }, { tick: 3, pause: false }];
  const scenario = { random_motes: false, random_shades: false };
  const l = runHeadless({ seed: 1, night: 1, ticks: 4, snapshotEvery: 1, scenario, inputs });
  const s1 = snapAt(l, 1);
  check('có event paused', evs(l, 'paused').length === 1);
  check('có event resumed', evs(l, 'resumed').length === 1);
  check('snapshot state paused', s1.state === 'paused', s1.state);
  check('sim_tick đứng yên khi pause', s1.sim_tick === 0 && s1.tick === 1, `${s1.sim_tick}/${s1.tick}`);
}

// 11) Bục nhảy (Đêm 2)
console.log('Bục nhảy');
{
  const scenario = { random_motes: false, random_shades: false, random_drifters: false, player: { pos: [20, 0, 18] } };
  const l = runHeadless({ seed: 1, night: 2, ticks: 3, snapshotEvery: 1, scenario });
  const s1 = snapAt(l, 1);
  check('bục bắn lên (vel Y > 13)', s1.player.vel[1] > 13, s1.player.vel[1]);
  check('rời đất sau khi bắn', s1.player.grounded === false);
}

// 12) Gió mạnh (Đêm 3)
console.log('Gió mạnh Đêm 3');
{
  const scenario = { random_shades: false, random_motes: false, random_drifters: false };
  const l = runHeadless({ seed: 1, night: 3, ticks: 1600, snapshotEvery: 50, scenario });
  check('có snapshot wind.active = true', snaps(l).some((s) => s.wind.active === true));
}

// 13) Tất định
console.log('Tất định');
{
  const a = runHeadless({ seed: 777, night: 1, ticks: 3000, snapshotEvery: 20 });
  const b = runHeadless({ seed: 777, night: 1, ticks: 3000, snapshotEvery: 20 });
  check('cùng seed -> JSONL giống hệt', JSON.stringify(a) === JSON.stringify(b));
}

// 14) Hiệu năng: một Đêm đầy đủ <= vài giây
console.log('Hiệu năng');
{
  const t0 = Date.now();
  runHeadless({ seed: 1, night: 1, ticks: 18000, snapshotEvery: 600 });
  const dt = Date.now() - t0;
  check('18000 tick < 10 s (yêu cầu <=30s)', dt < 10000, dt + 'ms');
}

// 15) Contract: inputs sai -> code 2, làm tròn 3 số
console.log('Contract: lỗi & làm tròn');
{
  let code = null;
  try { runHeadless({ seed: 1, night: 1, ticks: 5, inputs: [{ tick: 2 }, { tick: 1 }] }); } catch (e) { code = e.code; }
  check('tick không tăng -> code 2', code === 2);
  const l = runHeadless({ seed: 3, night: 1, ticks: 120, snapshotEvery: 30 });
  let ok = true;
  for (const s of snaps(l)) for (const c of s.player.pos) if (Math.round(c * 1000) !== c * 1000) ok = false;
  check('toạ độ làm tròn 3 số', ok);
}

console.log(`\nKết quả: ${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
