// (4) Test Ticket-04: bảng xếp hạng, cài đặt/đổi phím, số đo bench, cảnh bench chuẩn, soak, vật cản.
// Chạy độc lập: node tests/platform.js
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateEntry, rankEntries } from '../src/platform/leaderboard.js';
import { rebind, loadSettings, DEFAULT_KEYS } from '../src/platform/settings.js';
import { frameMetrics } from '../src/platform/bench-metrics.js';
import { createBenchmark, benchmarkCamera } from '../src/core/benchmark.js';
import { createWebServer, readLeaderboard, saveEntry } from '../bin/serve.js';
import { runSoak, soakInput } from '../bin/soak.js';
import { Simulation } from '../src/core/sim.js';
import { makeRng } from '../src/core/rng.js';
import { runHeadless } from '../src/core/headlessRun.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name + (extra !== undefined ? '  -> ' + JSON.stringify(extra) : '')); }
}
const throws = (f) => { try { f(); return false; } catch { return true; } };
const entry = (name, score, at, extra = {}) => ({ name, score, nights_won: 1, achieved_at: at, seed: 42, ...extra });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-test-'));

console.log('Bảng xếp hạng: tên & mục');
{
  check('nhận tên ASCII [A-Za-z0-9_] 3–12', ['abc', 'May_2026', 'A1_b2_C3_d4e'].every((n) => !throws(() => validateEntry(entry(n, 1, '2026-11-20T10:00:00+07:00')))));
  check('từ chối tên ngắn/dài/ký tự lạ', ['ab', 'abcdefghijklm', 'a b c', 'abc!', '<b>x</b>', 'ab\u0000c'].every((n) => throws(() => validateEntry(entry(n, 1, '2026-11-20T10:00:00Z')))));
  check('điểm cộng: nhận tiếng Việt có dấu (NFC, đếm theo ký tự)', !throws(() => validateEntry(entry('Mây_Đêm_Ba', 1, '2026-11-20T10:00:00Z'))) && validateEntry(entry('Mây', 1, '2026-11-20T10:00:00Z')).name === 'Mây');
  check('từ chối chữ không phải Latin', throws(() => validateEntry(entry('名前です', 1, '2026-11-20T10:00:00Z'))));
  check('achieved_at phải ISO 8601 có múi giờ', throws(() => validateEntry(entry('abc', 1, '2026-11-20T10:00:00'))) && !throws(() => validateEntry(entry('abc', 1, '2026-11-20T10:00:00.123+07:00'))));
  check('nights_won 0–3, score/seed nguyên', throws(() => validateEntry(entry('abc', 1, '2026-11-20T10:00:00Z', { nights_won: 4 }))) && throws(() => validateEntry(entry('abc', 1.5, '2026-11-20T10:00:00Z'))));
  const mk = Array.from({ length: 12 }, (_, i) => entry('p' + String(i).padStart(2, '0'), (i % 4) * 100, `2026-11-20T10:${String(59 - i).padStart(2, '0')}:00Z`));
  const ranked = rankEntries(mk);
  check('giữ top 10', ranked.length === 10);
  check('điểm giảm dần; bằng điểm thì ai đạt trước đứng trên', ranked.every((e, i) => i === 0 || ranked[i - 1].score > e.score || (ranked[i - 1].score === e.score && Date.parse(ranked[i - 1].achieved_at) <= Date.parse(e.achieved_at))));
  check('so thời điểm theo múi giờ, không theo chuỗi', rankEntries([entry('late', 5, '2026-11-20T10:00:00+07:00'), entry('early', 5, '2026-11-20T09:00:00+07:00')])[0].name === 'early');
}

console.log('Bảng xếp hạng: lưu đĩa, API, lệnh export');
{
  const file = path.join(tmp, 'lb.json');
  check('chưa có file -> rỗng', readLeaderboard(file).entries.length === 0);
  saveEntry(entry('second', 50, '2026-11-20T11:00:00Z'), file);
  saveEntry(entry('first', 90, '2026-11-20T12:00:00Z'), file);
  check('lưu xuống đĩa, đọc lại đúng thứ tự', JSON.stringify(readLeaderboard(file).entries.map((e) => e.name)) === '["first","second"]');
  const out = path.join(tmp, 'export.json');
  execFileSync(process.execPath, [path.join(ROOT, 'bin/serve.js'), '--export-leaderboard', out], { env: { ...process.env, DAO_DATA_FILE: file } });
  const exp = JSON.parse(fs.readFileSync(out, 'utf8'));
  check('--export-leaderboard ra {"entries":[...]} đúng thứ tự', Array.isArray(exp.entries) && exp.entries[0].name === 'first' && Object.keys(exp).length === 1, exp);

  const server = createWebServer({ dataFile: path.join(tmp, 'api.json') });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body) => fetch(base + '/api/leaderboard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  check('POST hợp lệ -> 201', (await post(entry('api_ok', 10, new Date().toISOString()))).status === 201);
  check('POST tên sai -> 400', (await post(entry('x', 10, new Date().toISOString()))).status === 400);
  const got = await (await fetch(base + '/api/leaderboard')).json();
  check('GET trả mục vừa lưu', got.entries.length === 1 && got.entries[0].name === 'api_ok');
  check('trang chính phục vụ được', (await fetch(base + '/')).status === 200);
  check('không lộ file ngoài danh sách (data/, package.json, ../)', (await Promise.all(['/data/leaderboard.json', '/package.json', '/src/../package.json', '/%2e%2e/package.json'].map((p) => fetch(base + p).then((r) => r.status)))).every((s) => s === 404 || s === 403));
  server.closeAllConnections(); server.close();
}

console.log('Cài đặt: đổi phím, trùng phím, khôi phục');
{
  const mem = new Map(); const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = loadSettings(storage);
  check('mặc định khi chưa lưu', JSON.stringify(s.keys) === JSON.stringify(DEFAULT_KEYS) && !s.reducedMotion && !s.largeText);
  const actions = ['forward', 'backward', 'left', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause'];
  check('có đủ hành động: 4 hướng, nhảy, lướt, tương tác, tỏa sáng, tạm dừng', actions.every((a) => a in DEFAULT_KEYS));
  check('đổi phím được', rebind(s.keys, 'jump', 'KeyJ').jump === 'KeyJ');
  let msg = ''; try { rebind(s.keys, 'jump', 'KeyE'); } catch (e) { msg = e.message; }
  check('phát hiện trùng phím và báo tên hành động', /Tương tác/.test(msg), msg);
  storage.setItem('dao-den-long.settings', JSON.stringify({ ...s, keys: rebind(s.keys, 'jump', 'KeyJ'), largeText: true }));
  check('được lưu và đọc lại', loadSettings(storage).keys.jump === 'KeyJ' && loadSettings(storage).largeText === true);
  storage.setItem('dao-den-long.settings', JSON.stringify({ ...s, keys: { ...DEFAULT_KEYS, jump: 'KeyE' } }));
  check('dữ liệu lưu bị trùng phím -> về mặc định', loadSettings(storage).keys.jump === DEFAULT_KEYS.jump);
  storage.setItem('dao-den-long.settings', '{hỏng');
  check('dữ liệu hỏng -> về mặc định', loadSettings(storage).keys.pause === DEFAULT_KEYS.pause);
}

console.log('Số đo bench (công thức Ticket-04 §1)');
{
  const samples = [...Array(99).fill(10), 100]; // N = 100
  const m = frameMetrics(samples);
  check('frames = N', m.frames === 100);
  check('avg_fps = 1000·N/Σdt', Math.abs(m.avg_fps - 100000 / 1090) < 1e-9, m.avg_fps);
  check('p1_low_fps = 1000 / trung bình k=ceil(1%N) dt lớn nhất', m.p1_low_fps === 10, m.p1_low_fps);
  check('frame_ms_p95 = phân vị 95', m.frame_ms_p95 === 10, m.frame_ms_p95);
  const m2 = frameMetrics(Array.from({ length: 250 }, (_, i) => i + 1)); // k = 3 -> (250+249+248)/3
  check('k = ceil(0.01·N) với N=250 -> 3', Math.abs(m2.p1_low_fps - 1000 / 249) < 1e-9, m2.p1_low_fps);
}

console.log('Cảnh benchmark chuẩn');
{
  const a = createBenchmark(42), b = createBenchmark(42);
  check('đúng 200 Bóng Mực wander', a.shades.length === 200 && a.shades.every((s) => s.state === 'wander'));
  check('đúng 100 đom đóm (vượt trần gameplay)', a.motes.filter((m) => m.active).length === 100);
  check('L1–L3 sáng fuel 100, đèn khác tắt', a.lanterns.map((L) => `${L.id}:${L.lit}:${L.fuelU / 60}`).join(',') === 'L1:true:100,L2:true:100,L3:true:100,L4:false:0,L5:false:0');
  check('rải trên đảo Đêm 1 (r < 40)', [...a.shades, ...a.motes].every((x) => Math.hypot(x.pos[0], x.pos[2]) < 40));
  check('Mây đứng tại (0,0,0), không có vật cản sáng tạo', a.player.pos.every((c) => c === 0) && a.obstacles.length === 0);
  const startPos = a.shades.map((s) => [...s.pos]);
  for (let i = 0; i < 1800; i++) { a.step(); b.step(); }
  check('30 s: vẫn 200 wander, 100 đom đóm, không hao dầu, không kết thúc', a.shades.length === 200 && a.shades.every((s) => s.state === 'wander') && a.motes.filter((m) => m.active).length === 100 && a.lanterns.slice(0, 3).every((L) => L.fuelU === 6000) && a.status === 'playing');
  check('Bóng Mực có di chuyển', a.shades.some((s, i) => Math.hypot(s.pos[0] - startPos[i][0], s.pos[2] - startPos[i][2]) > 1));
  check('cùng seed -> cùng cảnh (tất định)', JSON.stringify(a.shades.map((s) => s.pos)) === JSON.stringify(b.shades.map((s) => s.pos)));
  const near = (p, q) => p.every((v, i) => Math.abs(v - q[i]) < 1e-9);
  check('camera bắt đầu (30,15,0)', near(benchmarkCamera(0), [30, 15, 0]));
  check('camera ngược chiều kim đồng hồ nhìn từ trên: 1/4 vòng (3.75 s) ở (0,15,-30)', near(benchmarkCamera(3.75), [0, 15, -30]));
  check('15 s một vòng', near(benchmarkCamera(15), [30, 15, 0]));
}

console.log('Soak');
{
  const r = runSoak({ seed: 7, nights: 3 });
  check('3 Đêm, 0 crash, đủ kết quả', r.nights === 3 && r.crashes === 0 && r.results.length === 3 && r.results.every((x) => x === 'won' || x === 'lost'), r.results);
  check('xoay vòng Đêm 1→2→3, seed 7+i', JSON.stringify(r.nights_detail.map((d) => [d.night, d.seed])) === '[[1,7],[2,8],[3,9]]');
  check('mỗi Đêm dừng khi kết thúc hoặc hết thời lượng', r.nights_detail.every((d) => d.ticks <= new Simulation({ night: d.night }).durationTicks));
  const rng = makeRng(1); let move = [0, 0]; const n = 60000, c = { jump: 0, dash: 0, pulse: 0, interact: 0 }; let dirChanges = 0;
  for (let t = 0; t < n; t++) { const inp = soakInput(rng, t, move); if (inp.move !== move) dirChanges++; move = inp.move; for (const k in c) if (inp[k]) c[k]++; }
  check('đổi hướng đúng mỗi 30 tick', dirChanges === n / 30, dirChanges);
  check('xác suất ~5% nhảy, 3% lướt, 2% tỏa sáng, 10% tương tác', Math.abs(c.jump / n - .05) < .005 && Math.abs(c.dash / n - .03) < .004 && Math.abs(c.pulse / n - .02) < .003 && Math.abs(c.interact / n - .10) < .006, c);
}

console.log('Vật cản (cây, đá): không đi xuyên');
{
  const rock = { type: 'rock', pos: [0, 0, 5], radius: 0.9 };
  const walk = (move, ticks, start = [0, 0, 0]) => {
    const sim = new Simulation({ seed: 1, night: 1, scenario: { random_motes: false, random_shades: false, player: { pos: start }, obstacles: [rock] } });
    let minD = Infinity;
    for (let i = 0; i < ticks; i++) { sim.step({ move }); minD = Math.min(minD, Math.hypot(sim.player.pos[0] - rock.pos[0], sim.player.pos[2] - rock.pos[2])); }
    return { sim, minD };
  };
  const head = walk([0, 1], 120);
  check('đi thẳng vào đá: dừng ở mép (bán kính đá + 0.45)', head.minD >= 0.9 + 0.45 - 1e-9 && head.sim.player.pos[2] < 5, head.minD);
  const slide = walk([0, 1], 180, [0.4, 0, 0]);
  check('đi lệch: trượt qua mép rồi đi tiếp, không xuyên', slide.minD >= 0.9 + 0.45 - 1e-9 && slide.sim.player.pos[2] > 6, slide.sim.player.pos);
  check('dash vào đá cũng không xuyên', (() => { const sim = new Simulation({ seed: 1, night: 1, scenario: { random_motes: false, random_shades: false, obstacles: [rock] } }); let m = Infinity; for (let i = 0; i < 40; i++) { sim.step({ move: [0, 1], dash: i % 2 === 0 }); m = Math.min(m, Math.hypot(sim.player.pos[0], sim.player.pos[2] - 5)); } return m >= 1.35 - 1e-9; })());
  check('bản web (creative) có cây/đá ở cả 3 Đêm', [1, 2, 3].every((n) => new Simulation({ night: n, creative: true }).obstacles.length > 0));
  check('headless chuẩn KHÔNG có vật cản (đầu ra không đổi)', new Simulation({ night: 1 }).obstacles.length === 0 && !JSON.stringify(runHeadless({ seed: 1, night: 1, ticks: 1, snapshotEvery: 1 })).includes('obstacle'));
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\nKết quả: ${pass} đạt, ${fail} trượt`);
process.exit(fail ? 1 : 0);
