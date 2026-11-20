#!/usr/bin/env node
// Chế độ headless theo Test Contract v1.0.
// node bin/headless.js --seed <int> --night 1 [--scenario f.json] [--inputs f.json]
//      --ticks <int> --out <file.jsonl> [--snapshot-every <int, mặc định 10>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHeadless } from '../src/core/headlessRun.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const a = { snapshotEvery: 10, night: 1 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    switch (k) {
      case '--seed': a.seed = parseInt(v, 10); i++; break;
      case '--night': a.night = parseInt(v, 10); i++; break;
      case '--scenario': a.scenario = v; i++; break;
      case '--inputs': a.inputs = v; i++; break;
      case '--ticks': a.ticks = parseInt(v, 10); i++; break;
      case '--out': a.out = v; i++; break;
      case '--snapshot-every': a.snapshotEvery = parseInt(v, 10); i++; break;
    }
  }
  return a;
}

function readJson(file, label) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); }
  catch { const e = new Error(`Không đọc được ${label}: ${file}`); e.exitCode = 1; throw e; }
  try { return JSON.parse(text); }
  catch { const e = new Error(`${label} không phải JSON hợp lệ: ${file}`); e.exitCode = 2; throw e; }
}

function loadContract() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'game.contract.json'), 'utf8'));
    const tuning = c.tuning || {};
    const score = tuning.score || {};
    return { tuning, score };
  } catch { return { tuning: {}, score: {} }; }
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!Number.isInteger(a.seed)) { process.stderr.write('Thiếu hoặc sai --seed\n'); process.exit(1); }
  if (!Number.isInteger(a.ticks) || a.ticks < 0) { process.stderr.write('Thiếu hoặc sai --ticks\n'); process.exit(1); }

  let scenario = null, inputs = null;
  try {
    if (a.scenario) scenario = readJson(a.scenario, 'scenario');
    if (a.inputs) inputs = readJson(a.inputs, 'inputs');
  } catch (e) { process.stderr.write((e.message || String(e)) + '\n'); process.exit(e.exitCode || 1); }

  const { tuning, score } = loadContract();
  let lines;
  try { lines = runHeadless({ seed: a.seed, ticks: a.ticks, scenario, inputs, snapshotEvery: a.snapshotEvery, tuning, score }); }
  catch (e) { process.stderr.write('Lỗi: ' + (e.message || String(e)) + '\n'); process.exit(e.code || 1); }

  const out = lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
  if (a.out) fs.writeFileSync(a.out, out); else process.stdout.write(out);
  process.exit(0);
}
main();
