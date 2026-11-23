// Vẽ icon & màn chờ từ assets/*.svg → PNG cho @capacitor/assets và PWA.
// Chạy: npm run assets:app
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const fg = await readFile('assets/icon-foreground.svg');
const bg = await readFile('assets/icon-background.svg');
const png = (svg, size) => sharp(svg, { density: 300 }).resize(size, size).png().toBuffer();

const fg1024 = await png(fg, 1024);
const bg1024 = await png(bg, 1024);
const full = await sharp(bg1024).composite([{ input: fg1024 }]).png().toBuffer();

/** icon bo góc (dùng cho màn chờ / PWA thường) */
async function rounded(size) {
  const r = Math.round(size * 0.23);
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`);
  return sharp(full).resize(size, size).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}

async function splash(color, out) {
  const icon = await rounded(640);
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: color } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(out);
}

await writeFile('assets/icon-foreground.png', fg1024);
await writeFile('assets/icon-background.png', bg1024);
await writeFile('assets/icon-only.png', full);
await splash('#fdf4fb', 'assets/splash.png');
await splash('#160e24', 'assets/splash-dark.png');

// PWA
await sharp(full).resize(512, 512).png().toFile('public/icons/icon-512-maskable.png');
await writeFile('public/icons/icon-512.png', await rounded(512));
await writeFile('public/icons/icon-192.png', await rounded(192));
console.log('Đã vẽ assets/*.png và public/icons/*.png');
