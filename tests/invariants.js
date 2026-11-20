// (2) Fuzz input + kiểm bất biến + tất định trên cả 3 Đêm.
// Chạy độc lập: node tests/invariants.js   (exit !=0 nếu có lỗi)
import { runHeadless } from '../src/core/headlessRun.js';
import { makeRng } from '../src/core/rng.js';
import { fileURLToPath } from 'node:url';

// Sinh chuỗi input tất định từ seed: đổi trạng thái mỗi vài tick.
function fuzzInputs(seed, ticks) {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const frames = [];
  let t = 0;
  while (t < ticks) {
    frames.push({
      tick: t,
      move: [Math.round((rng() * 2 - 1) * 100) / 100, Math.round((rng() * 2 - 1) * 100) / 100],
      cam_yaw_deg: Math.round(rng() * 360),
      jump: rng() < 0.3,
      interact: rng() < 0.5,
      pulse: rng() < 0.2,
      dash: rng() < 0.3,
      pause: rng() < 0.05,
    });
    t += 1 + Math.floor(rng() * 8); // bước nhảy tick ngẫu nhiên, luôn tăng
  }
  return frames;
}

// Kiểm bất biến trên các snapshot (snapshotEvery=1 -> mỗi tick).
function checkInvariants(lines, { capacity = 10, maxFlames = 3 }) {
  const err = [];
  let prevScore = -Infinity;
  let prevSimTick = -1;
  let belowFall = 0;
  for (const l of lines) {
    if (l.type !== 'snapshot') continue;
    const p = l.player;
    // không kẹt dưới mép đảo (fall_y=-10): phải hồi sinh trong ~fall_wait_ticks
    if (p.pos[1] < -10) belowFall++; else belowFall = 0;
    if (belowFall > 70) err.push(`kẹt dưới fall_y quá lâu (${belowFall} tick) @tick ${l.tick}`);
    // không bay vô cực / vận tốc nổ (dash 14, bục 24, rơi ~20)
    if (p.pos[1] > 60 || p.pos[1] < -15) err.push(`pos.y bất thường: ${p.pos[1]} @tick ${l.tick}`);
    for (const c of p.vel) if (Math.abs(c) > 60) err.push(`vận tốc nổ: ${c} @tick ${l.tick}`);
    if (!Number.isInteger(p.flames) || p.flames < 0 || p.flames > maxFlames) err.push(`flames ngoài [0,${maxFlames}]: ${p.flames} @tick ${l.tick}`);
    if (!Number.isInteger(p.carried) || p.carried < 0 || p.carried > capacity) err.push(`carried ngoài [0,${capacity}]: ${p.carried} @tick ${l.tick}`);
    for (const c of [...p.pos, ...p.vel]) if (!Number.isFinite(c)) err.push(`toạ độ/vận tốc không hữu hạn @tick ${l.tick}`);
    if (!Number.isFinite(l.score) || l.score < prevScore - 1e-9) err.push(`điểm giảm: ${l.score} < ${prevScore} @tick ${l.tick}`);
    prevScore = Math.max(prevScore, l.score);
    if (p.dash_cd_s > 1.5 + 1e-6) err.push(`dash_cd_s > 1.5: ${p.dash_cd_s} @tick ${l.tick}`);
    if (p.pulse_cd_s > 3.0 + 1e-6) err.push(`pulse_cd_s > 3.0: ${p.pulse_cd_s} @tick ${l.tick}`);
    if (p.charm_s > 10.0 + 1e-6) err.push(`charm_s > 10: ${p.charm_s} @tick ${l.tick}`);
    for (const L of l.lanterns) { if (L.deposited < 0 || L.deposited > 10) err.push(`deposited ngoài [0,10]: ${L.deposited} @tick ${l.tick}`); if (L.lit && L.deposited < 10) err.push(`đèn sáng nhưng deposited<10 @tick ${l.tick}`); }
    // sim_tick không lùi
    if (l.sim_tick < prevSimTick) err.push(`sim_tick lùi: ${l.sim_tick} < ${prevSimTick} @tick ${l.tick}`);
    prevSimTick = l.sim_tick;
    if (l.tick === 0 && l.time_left_s <= 0) err.push('time_left_s ban đầu không dương');
    if (err.length > 8) break;
  }
  return err;
}

export function runInvariants() {
  const seeds = [1, 2, 3, 7, 11, 42, 99, 123, 777, 2024];
  const nights = [1, 2, 3];
  let runs = 0, bad = 0;
  const problems = [];
  for (const night of nights) for (const seed of seeds) {
    const ticks = 2500;
    const inputs = fuzzInputs(seed, ticks);
    let a, b;
    try {
      a = runHeadless({ seed, night, ticks, inputs, snapshotEvery: 1 });
      b = runHeadless({ seed, night, ticks, inputs, snapshotEvery: 1 });
    } catch (e) { bad++; problems.push(`seed ${seed} night ${night}: NÉM LỖI ${e.message || e}`); continue; }
    runs++;
    // Tất định
    if (JSON.stringify(a) !== JSON.stringify(b)) { bad++; problems.push(`seed ${seed} night ${night}: KHÔNG tất định`); }
    // Bất biến
    const errs = checkInvariants(a, {});
    if (errs.length) { bad++; problems.push(`seed ${seed} night ${night}:\n    ` + errs.slice(0, 5).join('\n    ')); }
  }
  return { runs, bad, problems };
}

function isMain() { try { return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]; } catch { return false; } }
if (isMain()) {
  console.log('(2) Fuzz input + bất biến + tất định (3 Đêm)');
  const { runs, bad, problems } = runInvariants();
  for (const p of problems) console.error('  ✗ ' + p);
  console.log(`  ${runs} lần chạy, ${bad} có lỗi`);
  console.log(bad ? '\nInvariants: TRƯỢT' : '\nInvariants: ĐẠT');
  process.exit(bad ? 1 : 0);
}
