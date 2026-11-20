// Vòng chạy headless thuần (Test Contract v1.1). Không I/O ở đây.
import { Simulation, DEFAULT_INPUT } from './sim.js';

function buildInputMap(inputs) {
  const map = new Map();
  if (inputs == null) return map;
  if (!Array.isArray(inputs)) throw { code: 2, message: 'inputs phải là mảng frame' };
  let last = -1;
  for (const f of inputs) {
    if (typeof f !== 'object' || f === null || typeof f.tick !== 'number' || !Number.isInteger(f.tick)) throw { code: 2, message: 'mỗi frame cần trường tick nguyên' };
    if (f.tick <= last) throw { code: 2, message: `tick phải tăng nghiêm ngặt (gặp ${f.tick} sau ${last})` };
    last = f.tick;
    if (f.move !== undefined && (!Array.isArray(f.move) || f.move.length !== 2)) throw { code: 2, message: 'move phải là [x, z]' };
    map.set(f.tick, f);
  }
  return map;
}

function applyFrame(held, frame) {
  if (!frame) return;
  if (frame.move !== undefined) held.move = [frame.move[0], frame.move[1]];
  if (frame.cam_yaw_deg !== undefined) held.cam_yaw_deg = frame.cam_yaw_deg;
  for (const b of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (frame[b] !== undefined) held[b] = !!frame[b];
}

export function runHeadless({ seed = 1, night = 1, ticks = 0, scenario = null, inputs = null, snapshotEvery = 10 }) {
  const sim = new Simulation({ seed, night, scenario });
  const inputMap = buildInputMap(inputs);
  const lines = [];

  // night_start ở tick 0
  lines.push({ type: 'event', tick: 0, name: 'night_start', data: { night } });
  if (0 % snapshotEvery === 0) lines.push(sim.snapshot());

  const held = { ...DEFAULT_INPUT, move: [0, 0] };
  for (let k = 0; k < ticks; k++) {
    applyFrame(held, inputMap.get(k));
    const events = sim.step(held);
    for (const e of events) lines.push({ type: 'event', tick: e.tick, name: e.name, data: e.data });
    const curTick = k + 1;
    if (curTick % snapshotEvery === 0) lines.push(sim.snapshot());
    if (sim.status !== 'playing') {
      if (curTick % snapshotEvery !== 0) lines.push(sim.snapshot());
      lines.push({ type: 'end', ticks: curTick, state: sim.status, score: sim.scoreValue });
      return lines;
    }
  }
  lines.push({ type: 'end', ticks: ticks, state: sim.status, score: sim.scoreValue });
  return lines;
}
