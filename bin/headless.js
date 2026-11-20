#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.0.
// Dùng: node bin/headless.js --seed <int> --night 1 [--scenario f.json]
//        [--inputs f.json] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
// Thoát 0 nếu thành công; mã khác 0 + stderr nếu lỗi; mã 2 nếu file input/scenario sai định dạng.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHeadless } from '../src/core/headlessRun.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { snapshotEvery: 10, night: 1 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--seed': a.seed = parseInt(v, 10); i++; break;
      case '--night': a.night = parseInt(v, 10); i++; break;
      case '--scenario': a.scenario = v; i++; break;
      case '--inputs': a.inputs = v; i++; break;
      case '--ticks': a.ticks = parseInt(v, 10); i++; break;
      case '--out': a.out = v; i++; break;
      case '--snapshot-every': a.snapshotEvery = parseInt(v, 10); i++; break;
      default:
        if (k.startsWith('--')) { /* bỏ qua cờ lạ để tương thích tiến */ }
    }
  }
  return a;
}

function readJson(file, label) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const err = new Error(`Không đọc được ${label}: ${file}`);
    err.exitCode = 1;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    const err = new Error(`${label} không phải JSON hợp lệ: ${file}`);
    err.exitCode = 2; // file sai định dạng -> mã 2
    throw err;
  }
}

function main() {
  const a = parseArgs(process.argv.slice(2));

  if (!Number.isInteger(a.seed)) {
    process.stderr.write('Thiếu hoặc sai --seed\n');
    process.exit(1);
  }
  if (![1, 2, 3].includes(a.night)) {
    process.stderr.write('--night phải là 1, 2 hoặc 3\n');
    process.exit(1);
  }
  if (!Number.isInteger(a.ticks) || a.ticks < 0) {
    process.stderr.write('Thiếu hoặc sai --ticks\n');
    process.exit(1);
  }

  let scenario = null;
  let inputs = null;
  try {
    if (a.scenario) scenario = readJson(a.scenario, 'scenario');
    if (a.inputs) inputs = readJson(a.inputs, 'inputs');
  } catch (e) {
    process.stderr.write((e.message || String(e)) + '\n');
    process.exit(e.exitCode || 1);
  }

  let lines;
  try {
    lines = runHeadless({ seed: a.seed, night: a.night, ticks: a.ticks, scenario, inputs, snapshotEvery: a.snapshotEvery });
  } catch (e) {
    process.stderr.write('Lỗi chạy mô phỏng: ' + (e.message || String(e)) + '\n');
    process.exit(e.code || 1);
  }

  const out = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  if (a.out) {
    fs.writeFileSync(a.out, out);
  } else {
    process.stdout.write(out);
  }
  process.exit(0);
}

main();
