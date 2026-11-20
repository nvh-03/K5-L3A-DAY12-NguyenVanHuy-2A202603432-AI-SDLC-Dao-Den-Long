// Chạy toàn bộ test: đơn vị/cơ chế + tuân thủ Contract + fuzz/bất biến.
// npm test -> node tests/all.js
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const files = ['run.js', 'contract-check.js', 'invariants.js'];
let failed = false;
for (const f of files) {
  console.log(`\n===== ${f} =====`);
  try { execFileSync(process.execPath, [path.join(dir, f)], { stdio: 'inherit' }); }
  catch { failed = true; }
}
console.log(failed ? '\n>>> CÓ BỘ TEST TRƯỢT' : '\n>>> TẤT CẢ ĐẠT');
process.exit(failed ? 1 : 0);
