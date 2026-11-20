// Cảnh benchmark chuẩn (Ticket-04 §1). Không đổi đường chạy gameplay/headless của Simulation.
import { Simulation } from './sim.js';
import { makeRng } from './rng.js';

export const BENCH = { shades: 200, motes: 100, litLanterns: ['L1', 'L2', 'L3'], islandRadius: 40, camRadius: 30, camHeight: 15, camPeriodS: 15 };

// Điểm rải đều theo diện tích trên đảo Đêm 1 (r = R·sqrt(u)), chừa mép 1 m.
function spreadPoint(rng) {
  const a = rng() * 2 * Math.PI, r = Math.sqrt(rng()) * (BENCH.islandRadius - 1);
  return [r * Math.cos(a), 0, r * Math.sin(a)];
}

export function createBenchmark(seed = 42) {
  const rng = makeRng(seed);
  const sim = new Simulation({ seed, night: 1, scenario: {
    random_motes: false, random_shades: false, random_drifters: false,
    player: { pos: [0, 0, 0] },
    motes: Array.from({ length: BENCH.motes }, (_, i) => ({ id: `b${i + 1}`, pos: spreadPoint(rng) })),
    shades: Array.from({ length: BENCH.shades }, (_, i) => ({ id: `S${i + 1}`, pos: spreadPoint(rng), state: 'wander' })),
    lanterns: BENCH.litLanterns.map((id) => ({ id, lit: true, fuel: 100 })),
  } });
  // Tắt: sinh thêm, sát thương, nhặt, hao dầu, kết thúc Đêm, input. Bóng Mực vẫn đi theo luật wander chuẩn
  // của lõi (_wanderStep + vùng an toàn); không xét chase vì Mây đứng yên và cảnh phải giống nhau giữa các bài.
  sim.step = () => {
    sim.tick++; sim.simTick++;
    for (const s of sim.shades) if (!sim._wanderStep(s)) sim._blockSafeZones(s);
    return [];
  };
  return sim;
}

// Camera bay vòng: tâm (0,0,0), R = 30 m, Y = 15 m, bắt đầu ở (30,15,0), ngược chiều kim đồng hồ nhìn từ trên, 15 s/vòng.
export function benchmarkCamera(seconds) {
  const a = (seconds * Math.PI * 2) / BENCH.camPeriodS;
  return [BENCH.camRadius * Math.cos(a), BENCH.camHeight, -BENCH.camRadius * Math.sin(a)];
}
