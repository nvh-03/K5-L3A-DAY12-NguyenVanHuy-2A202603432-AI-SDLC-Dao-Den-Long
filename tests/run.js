// Test cho lõi Phase 1 (PRD-0 / Test Contract v1.0). Chạy: node tests/run.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHeadless } from '../src/core/headlessRun.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, 'scenarios', f), 'utf8'));
let pass = 0, fail = 0;
function check(n, c, e) { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.error('  ✗ ' + n + (e !== undefined ? '  -> ' + e : '')); } }
const evs = (l, n) => l.filter((x) => x.type === 'event' && x.name === n);
const end = (l) => l[l.length - 1];
const snapAt = (l, t) => l.find((x) => x.type === 'snapshot' && x.tick === t);

console.log('Contract: hình dạng output');
{
  const l = runHeadless({ seed: 1, ticks: 30, snapshotEvery: 10 });
  const s0 = l[0];
  check('dòng đầu là snapshot tick 0', s0.type === 'snapshot' && s0.tick === 0);
  check('sim_tick = tick', s0.sim_tick === s0.tick);
  check('time_left_s ban đầu = 180', s0.time_left_s === 180);
  check('có đúng 5 đèn', s0.lanterns.length === 5);
  check('player có pos/flames/carried', 'pos' in s0.player && 'flames' in s0.player && 'carried' in s0.player);
  check('dòng cuối là end', end(l).type === 'end');
  check('end.state hợp lệ', ['playing', 'won', 'lost'].includes(end(l).state));
  check('end.ticks = 30', end(l).ticks === 30);
  const st = l.filter((x) => x.type === 'snapshot').map((x) => x.tick);
  check('snapshot tại 0,10,20,30', JSON.stringify(st) === JSON.stringify([0, 10, 20, 30]), JSON.stringify(st));
}

console.log('Tất định');
{
  const cfg = { seed: 12345, ticks: 600, snapshotEvery: 10 };
  check('hai lần chạy giống hệt', JSON.stringify(runHeadless(cfg)) === JSON.stringify(runHeadless(cfg)));
  check('seed khác -> khác', JSON.stringify(runHeadless(cfg)) !== JSON.stringify(runHeadless({ ...cfg, seed: 999 })));
}

console.log('Cơ chế: nạp đèn & thắng (schema v1.0)');
{
  const l = runHeadless({ seed: 1, ticks: 20, snapshotEvery: 5, scenario: load('win-last-lantern.scenario.json'), inputs: load('win-last-lantern.inputs.json') });
  const dep = evs(l, 'deposit')[0];
  check('deposit có lantern_id/amount/deposited', dep && dep.data.lantern_id === 'L1' && dep.data.amount === 3 && dep.data.deposited === 3);
  check('lantern_lit L1', evs(l, 'lantern_lit')[0] && evs(l, 'lantern_lit')[0].data.lantern_id === 'L1');
  const go = evs(l, 'game_over')[0];
  check('game_over {result:won, reason:all_lit}', go && go.data.result === 'won' && go.data.reason === 'all_lit', go && JSON.stringify(go.data));
  check('end.state won', end(l).state === 'won');
  check('deposit ở tick 1', dep && dep.tick === 1);
}

console.log('Cơ chế: pulse (stunned_ids)');
{
  const l = runHeadless({ seed: 1, ticks: 5, snapshotEvery: 1, scenario: load('pulse.scenario.json'), inputs: load('pulse.inputs.json') });
  const p = evs(l, 'pulse')[0];
  check('pulse.data.stunned_ids chứa S1', p && p.data.stunned_ids.includes('S1'));
  check('S1 stunned ở snapshot tick 1', snapAt(l, 1).shades[0].state === 'stunned', snapAt(l, 1).shades[0].state);
  check('mất 2 đom đóm sau pulse', snapAt(l, 1).player.carried === 0, snapAt(l, 1).player.carried);
}

console.log('Cơ chế: trúng đòn (player_hit by/flames/dropped)');
{
  const l = runHeadless({ seed: 1, ticks: 3, snapshotEvery: 1, scenario: load('chase.scenario.json') });
  const h = evs(l, 'player_hit')[0];
  check('player_hit.data.by = shade', h && h.data.by === 'shade');
  check('flames còn 2', h && h.data.flames === 2, h && h.data.flames);
  check('rơi 2 đom đóm', h && h.data.dropped === 2, h && h.data.dropped);
}

console.log('Contract: inputs {frames} sai -> code 2');
{
  let c = null;
  try { runHeadless({ seed: 1, ticks: 5, inputs: { frames: [{ tick: 2 }, { tick: 1 }] } }); } catch (e) { c = e.code; }
  check('tick không tăng -> code 2', c === 2, c);
  c = null;
  try { runHeadless({ seed: 1, ticks: 5, inputs: { frames: 'x' } }); } catch (e) { c = e.code; }
  check('thiếu mảng frames -> code 2', c === 2, c);
  // inputs hợp lệ dạng frames: di chuyển +Z
  const l = runHeadless({ seed: 1, ticks: 60, snapshotEvery: 60, inputs: { frames: [{ tick: 0, move: [0, 1] }] } });
  check('frames hợp lệ chạy được', snapAt(l, 60).player.pos[2] > 1);
}

console.log('Contract: làm tròn 3 số');
{
  const l = runHeadless({ seed: 7, ticks: 120, snapshotEvery: 30 });
  let ok = true;
  for (const s of l) if (s.type === 'snapshot') for (const c of s.player.pos) if (Math.round(c * 1000) !== c * 1000) ok = false;
  check('player.pos làm tròn 3 số', ok);
}

console.log(`\nKết quả: ${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
