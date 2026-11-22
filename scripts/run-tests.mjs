// Chạy mọi scripts/check-*.ts: bundle bằng esbuild rồi chạy bằng Node.
// Dùng: npm test
import { build } from 'esbuild';
import { readdirSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp', 'tests');
mkdirSync(outDir, { recursive: true });

const files = readdirSync(join(root, 'scripts')).filter((f) => /^check-.*\.ts$/.test(f));
let failed = 0;

for (const f of files) {
  const out = join(outDir, f.replace(/\.ts$/, '.cjs'));
  await build({
    entryPoints: [join(root, 'scripts', f)],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    alias: { '@': join(root, 'src') },
    outfile: out,
    logLevel: 'error',
  });
  console.log(`\n▶ ${f}`);
  // Cố định múi giờ Việt Nam để kết quả ngày giờ ổn định trên mọi máy
  const r = spawnSync(process.execPath, [out], {
    stdio: 'inherit',
    env: { ...process.env, TZ: 'Asia/Ho_Chi_Minh' },
  });
  if (r.status !== 0) failed++;
}

console.log(failed ? `\n✗ ${failed}/${files.length} bộ test lỗi` : `\n✓ ${files.length}/${files.length} bộ test đạt`);
process.exit(failed ? 1 : 0);
