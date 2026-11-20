#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { rankEntries, validateEntry } from '../src/platform/leaderboard.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_FILE = process.env.DAO_DATA_FILE || path.join(ROOT, 'data', 'leaderboard.json');
export function readLeaderboard(file = DATA_FILE) {
  try { return { entries: rankEntries(JSON.parse(fs.readFileSync(file, 'utf8')).entries) }; }
  catch (e) { if (e.code === 'ENOENT') return { entries: [] }; throw e; }
}
export function saveEntry(entry, file = DATA_FILE) {
  const entries = rankEntries([...readLeaderboard(file).entries, validateEntry(entry)]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + '.tmp', JSON.stringify({ entries }, null, 2) + '\n');
  fs.renameSync(file + '.tmp', file);
  return { entries };
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.mp4': 'video/mp4', '.svg': 'image/svg+xml' };
export function createWebServer({ root = ROOT, dataFile = DATA_FILE, extra = null } = {}) {
  return http.createServer(async (req, res) => {
    const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://localhost');
      if (extra && await extra(req, res, url)) return;
      if (url.pathname === '/api/leaderboard') {
        if (req.method === 'GET') return json(200, readLeaderboard(dataFile));
        if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
        if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return json(403, { error: 'Origin không hợp lệ' });
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 4096) return json(413, { error: 'Dữ liệu quá lớn' }); }
        let entry;
        try { entry = validateEntry(JSON.parse(body)); } catch (e) { return json(400, { error: e.message }); }
        return json(201, saveEntry(entry, dataFile));
      }
      if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: 'Method not allowed' });
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      if (!/^(index\.html|benchmark\.html|preview\.html|src\/|vendor\/|docs\/demo\/)/.test(relative)) return json(404, { error: 'Not found' });
      const file = path.resolve(root, relative);
      if (!file.startsWith(path.resolve(root) + path.sep)) return json(403, { error: 'Forbidden' });
      const data = await fs.promises.readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (e) { json(e.code === 'ENOENT' ? 404 : 500, { error: e.code === 'ENOENT' ? 'Not found' : 'Không đọc/ghi được dữ liệu cục bộ.' }); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const index = process.argv.indexOf('--export-leaderboard');
    if (index !== -1) {
      if (!process.argv[index + 1]) throw new Error('Thiếu đường dẫn export');
      fs.writeFileSync(process.argv[index + 1], JSON.stringify(readLeaderboard(), null, 2) + '\n');
    } else {
      const port = Number(process.argv[2] || 8080);
      const server = createWebServer();
      server.on('error', e => { console.error(e.message); process.exitCode = 1; });
      server.listen(port, '127.0.0.1', () => console.log(`Đảo Đèn Lồng: http://localhost:${port}`));
    }
  } catch (e) { console.error(e.message); process.exitCode = 1; }
}
