import * as THREE from 'three';
import { GameView } from './view.js';
import { createBenchmark, benchmarkCamera, BENCH } from '../core/benchmark.js';
import { frameMetrics } from '../platform/bench-metrics.js';

const q = new URLSearchParams(location.search);
const duration = Number(q.get('duration') || 30), token = q.get('token'), WARMUP_S = 3;
const post = (path, body) => fetch(`/__bench/${path}?token=${token}`, { method: 'POST', body });

const sim = createBenchmark(Number(q.get('seed') || 42));
const view = new GameView(document.getElementById('app'));
view.build(1); view.sync(sim, {});

const samples = [];
let first = null, previous = null, measuredStart = null, acc = 0, lastStatus = -Infinity, shot = q.get('shot') !== '1';
async function loop(now) {
  if (first === null) first = now;
  const elapsed = (now - first) / 1000;
  acc += previous === null ? 0 : (now - previous) / 1000;
  while (acc >= 1 / 60) { sim.step(); acc -= 1 / 60; }
  view.sync(sim, {});
  view.camera.position.fromArray(benchmarkCamera(elapsed)); view.camera.lookAt(0, 0, 0);
  view.render();
  if (previous === null) await post('first');
  if (!shot && elapsed >= 1.5) { shot = true; await post('shot', view.renderer.domElement.toDataURL('image/png')); }
  if (elapsed >= WARMUP_S && measuredStart === null) measuredStart = now;
  if (measuredStart !== null && previous >= measuredStart) {
    const dt = Math.min(now, measuredStart + duration * 1000) - previous;
    if (dt > 0) samples.push(dt);
  }
  previous = now;
  // Cập nhật chữ trạng thái 4 lần/giây thôi: ghi DOM mỗi khung hình gây layout chồng lên canvas và làm khựng.
  if (now - lastStatus >= 250) lastStatus = now, document.getElementById('status').textContent =`${sim.shades.length} Bóng Mực · ${sim.motes.filter((m) => m.active).length} đom đóm · ${elapsed < WARMUP_S ? 'Khởi động' : 'Đang đo'} ${Math.min(duration, Math.max(0, elapsed - WARMUP_S)).toFixed(1)} / ${duration}s`;
  if (measuredStart !== null && now >= measuredStart + duration * 1000) {
    const gl = view.renderer.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
    const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown GPU';
    const result = {
      contract_version: '1.3', ...frameMetrics(samples), peak_mem_mb: null,
      vsync_off: q.get('vsync') === 'off',
      renderer: `Three.js r${THREE.REVISION} WebGL${view.renderer.capabilities.isWebGL2 ? '2' : '1'} on ${navigator.userAgent.match(/(Chrome|Edg)\/[\d.]+/)?.[0] || 'browser'} · ${gpu}`,
      viewport: `${view.renderer.domElement.width}x${view.renderer.domElement.height}`,
      scene: { shades: sim.shades.length, motes: sim.motes.filter((m) => m.active).length, lit_lanterns: sim.lanterns.filter((L) => L.lit).map((L) => L.id) },
    };
    document.getElementById('status').textContent = JSON.stringify(result);
    await post('result', JSON.stringify(result));
    return;
  }
  requestAnimationFrame(loop);
}
if (sim.shades.length !== BENCH.shades) throw new Error('Cảnh bench sai số Bóng Mực');
requestAnimationFrame(loop);
