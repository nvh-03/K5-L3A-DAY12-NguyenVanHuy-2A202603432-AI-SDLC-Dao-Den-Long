#!/usr/bin/env node
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { Simulation } from '../src/core/sim.js';
import { makeRng } from '../src/core/rng.js';

export function soakInput(rng, tick, previousMove) {
  const a = tick % 30 === 0 ? rng() * 2 * Math.PI : null;
  // Mỗi 30 tick chọn lại hướng; mỗi tick: 5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác (Ticket-04 §2).
  return { move: a === null ? previousMove : [Math.cos(a), Math.sin(a)], jump: rng() < .05, dash: rng() < .03, pulse: rng() < .02, interact: rng() < .10 };
}
// RSS sau khi dọn rác nếu có --expose-gc, để số đo phản ánh rò rỉ thật chứ không phải rác chưa thu.
function rssMb() { if (typeof globalThis.gc === 'function') globalThis.gc(); return Math.round(process.memoryUsage().rss / 1048576 * 10) / 10; }

// Đêm thứ i (đếm từ 0) dùng seed + i và bản đồ i % 3 + 1 (1 → 2 → 3 xoay vòng).
export function runSoak({ seed = 7, nights = 10 } = {}) {
  const started = performance.now(), results = [], detail = [];
  let crashes = 0;
  let sim = new Simulation({ seed, night: 1 });
  const memStart = rssMb();
  for (let i = 0; i < nights; i++) {
    const night = i % 3 + 1;
    if (i > 0) sim = new Simulation({ seed: seed + i, night });
    const rng = makeRng((seed + i) ^ 0x51a7), limit = sim.durationTicks;
    let move = [0, 0], tick = 0, reason = null;
    try {
      for (; tick < limit && sim.status === 'playing'; tick++) {
        const input = soakInput(rng, tick, move); move = input.move;
        for (const e of sim.step(input)) if (e.name === 'game_over') reason = e.data.reason; // không giữ event giữa các tick
      }
      if (!['won', 'lost'].includes(sim.status)) throw new Error(`Đêm ${i + 1} không kết thúc trong thời lượng chuẩn`);
      results.push(sim.status);
    } catch (e) { crashes++; results.push('crashed'); console.error(e.stack || e.message); }
    detail.push({ night, seed: seed + i, ticks: tick, result: results[i], reason, score: sim.scoreValue });
  }
  // Reset Đêm cuối trong cùng tiến trình rồi mới đo RSS kết thúc.
  sim = new Simulation({ seed: seed + nights - 1, night: (nights - 1) % 3 + 1 });
  const memEnd = rssMb();
  return { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: memEnd, duration_s: Math.round((performance.now() - started) / 10) / 100,
    mem_ratio: Math.round(memEnd / memStart * 1000) / 1000, gc_exposed: typeof globalThis.gc === 'function', nights_detail: detail };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = Object.fromEntries(Array.from({ length: (process.argv.length - 2) / 2 }, (_, i) => [process.argv[2 + i * 2], process.argv[3 + i * 2]]));
    const seed = Number(args['--seed'] ?? 7), nights = Number(args['--nights'] ?? 10);
    if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1 || nights > 10000) throw new Error('--seed / --nights không hợp lệ');
    const result = runSoak({ seed, nights });
    fs.writeFileSync(args['--out'] || 'soak.json', JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
    if (result.crashes) process.exitCode = 1;
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
