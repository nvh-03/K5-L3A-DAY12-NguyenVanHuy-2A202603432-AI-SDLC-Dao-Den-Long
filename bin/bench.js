#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { createWebServer } from './serve.js';

const started = performance.now();
let server, browser, timeout;
try {
  const args = Object.fromEntries(Array.from({ length: (process.argv.length - 2) / 2 }, (_, i) => [process.argv[2 + 2 * i], process.argv[3 + 2 * i]]));
  const seed = Number(args['--seed'] ?? 42), duration = Number(args['--duration'] ?? 30);
  if (!Number.isInteger(seed) || !Number.isFinite(duration) || duration <= 0 || duration > 3600) throw new Error('--seed / --duration không hợp lệ');
  const candidates = [process.env.BENCH_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const executable = candidates.find(p => fs.existsSync(p));
  if (!executable) throw new Error('Cần Chrome/Edge/Chromium. Đặt BENCH_BROWSER tới file thực thi.');
  const token = randomUUID(); let loadMs;
  let resolveResult, rejectResult;
  const done = new Promise((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  server = createWebServer({ extra: async (req, res, url) => {
    if (!url.pathname.startsWith('/__bench/')) return false;
    if (req.method !== 'POST' || url.searchParams.get('token') !== token) { res.writeHead(403); res.end(); return true; }
    if (url.pathname === '/__bench/first') loadMs = performance.now() - started;
    if (url.pathname === '/__bench/shot' && args['--screenshot']) {
      let body = ''; for await (const chunk of req) body += chunk;
      fs.writeFileSync(args['--screenshot'], Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'));
    }
    if (url.pathname === '/__bench/result') {
      let body = ''; for await (const chunk of req) body += chunk;
      resolveResult({ ...JSON.parse(body), load_ms: loadMs, os: `${os.type()} ${os.release()} ${os.arch()}` });
    }
    res.end('ok'); return true;
  } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'dao-bench-'));
  // --preview <png> [--night n]: chỉ chụp ảnh cảnh chơi có cây/đá cho README, không đo.
  if (args['--preview']) args['--screenshot'] = args['--preview'];
  const page = args['--preview'] ? `preview.html?night=${Number(args['--night'] || 1)}&token=${token}` : `benchmark.html?seed=${seed}&duration=${duration}&token=${token}&vsync=off${args['--screenshot'] ? '&shot=1' : ''}`;
  const url = `http://127.0.0.1:${server.address().port}/${page}`;
  // --disable-gpu-vsync + --disable-frame-rate-limit: bỏ khoá khung hình theo tần số màn hình (Chromium không có công tắc vsync trong trang).
  browser = spawn(executable, [`--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--force-device-scale-factor=1', '--window-size=1280,720', '--window-position=0,0', `--app=${url}`], { stdio: 'ignore', windowsHide: false });
  browser.on('error', rejectResult);
  browser.on('exit', code => rejectResult(new Error(`Cửa sổ benchmark đóng sớm (${code})`)));
  timeout = setTimeout(() => rejectResult(new Error('Benchmark timeout: kiểm tra WebGL/browser')), (duration + 45) * 1000);
  const result = await done;
  if (!args['--preview']) fs.writeFileSync(args['--out'] || 'bench.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally {
  clearTimeout(timeout);
  if (browser) browser.kill();
  if (server) { server.closeAllConnections(); server.close(); }
}
