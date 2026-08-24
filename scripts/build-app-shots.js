#!/usr/bin/env node

/**
 * Build the app screenshots used on the site.
 *
 * Reads the real captures, applies per-locale text patches, crops, and writes
 * optimised WebP into `public/app/`. Run after changing `app-shots.js`:
 *
 *   npm run build:shots
 *
 * The generated files are committed — the source captures live outside the
 * repo and a build must not depend on them being present.
 */

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const { SRC_DIR } = require('./app-shots.config');
const SHOTS = require('./app-shots');

const OUT_DIR = path.join(__dirname, '..', 'public', 'app');
const LOCALES = ['en', 'ru'];

/** Render one patch to a PNG buffer sized exactly to its rectangle. */
async function renderPatch(patch) {
  const texts = (patch.texts || [])
    .map((t) => {
      const x = t.anchor === 'middle' ? t.x - patch.x : t.x - patch.x;
      const escaped = String(t.text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<text x="${x}" y="${t.y}" text-anchor="${t.anchor || 'start'}" font-family="Segoe UI" font-size="${t.size}" font-weight="${t.weight ?? 400}" fill="${t.color || '#111111'}" letter-spacing="${t.spacing ?? 0}">${escaped}</text>`;
    })
    .join('');

  const shapes = (patch.shapes || [])
    .map((s) => {
      if (s.type === 'circle') {
        return `<circle cx="${s.x - patch.x}" cy="${s.y - patch.y}" r="${s.r}" fill="${s.fill}"/>`;
      }
      if (s.type === 'path') {
        // `d` is authored in patch-local coordinates.
        return `<path d="${s.d}" fill="${s.fill ?? 'none'}" stroke="${s.stroke ?? 'none'}" stroke-width="${s.width ?? 1}" stroke-linecap="round"/>`;
      }
      if (s.type === 'ellipse') {
        return `<ellipse cx="${s.x - patch.x}" cy="${s.y - patch.y}" rx="${s.rx}" ry="${s.ry}" fill="${s.fill ?? 'none'}" stroke="${s.stroke ?? 'none'}" stroke-width="${s.width ?? 1}"${s.rotate ? ` transform="rotate(${s.rotate} ${s.x - patch.x} ${s.y - patch.y})"` : ''}/>`;
      }
      return `<rect x="${s.x - patch.x}" y="${s.y - patch.y}" width="${s.w}" height="${s.h}" rx="${s.rx ?? 0}" fill="${s.fill}"/>`;
    })
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${patch.w}" height="${patch.h}" viewBox="0 0 ${patch.w} ${patch.h}">${
    patch.bg ? `<rect width="${patch.w}" height="${patch.h}" rx="${patch.rx ?? 0}" fill="${patch.bg}"/>` : ''
  }${shapes}${texts}</svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * iPhone status bar, baked into full-screen shots.
 *
 * The captures come from a browser and have no status bar, so the app's own
 * header starts at pixel zero. Rather than float a Dynamic Island over that
 * header on the site, the content is scaled down by the height of a real
 * status bar and the bar is drawn into the image — which keeps the phone
 * frame at a true 19.5:9 and stops the island covering anything.
 */
const BAND = 160;

function statusBarSvg(w, bg, ink) {
  const islandW = Math.round(w * 0.318);
  const islandH = Math.round(w * 0.092);
  const islandX = Math.round((w - islandW) / 2);
  const islandY = 30;

  const bars = [0, 1, 2, 3]
    .map((i) => `<rect x="${w - 300 + i * 22} " y="${74 - i * 7}" width="14" height="${20 + i * 7}" rx="4" fill="${ink}"/>`)
    .join('');

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${BAND}">` +
      `<rect width="${w}" height="${BAND}" fill="${bg}"/>` +
      `<text x="120" y="107" font-family="Segoe UI" font-size="44" font-weight="600" fill="${ink}">9:41</text>` +
      bars +
      `<path d="M ${w - 196} 62 A 46 46 0 0 1 ${w - 128} 62" stroke="${ink}" stroke-width="11" fill="none" stroke-linecap="round"/>` +
      `<path d="M ${w - 180} 80 A 26 26 0 0 1 ${w - 144} 80" stroke="${ink}" stroke-width="11" fill="none" stroke-linecap="round"/>` +
      `<circle cx="${w - 162}" cy="94" r="7" fill="${ink}"/>` +
      `<rect x="${w - 108}" y="60" width="66" height="34" rx="11" stroke="${ink}" stroke-width="6" fill="none" opacity="0.5"/>` +
      `<rect x="${w - 102}" y="66" width="48" height="22" rx="6" fill="${ink}"/>` +
      `<rect x="${w - 38}" y="70" width="6" height="14" rx="3" fill="${ink}" opacity="0.5"/>` +
      `<rect x="${islandX}" y="${islandY}" width="${islandW}" height="${islandH}" rx="${islandH / 2}" fill="#0B0B0B"/>` +
      `</svg>`,
  );
}

/**
 * Make room for the status bar and draw it in.
 *
 * The screen keeps its full width and loses the bar's height — a 6% vertical
 * squash, which is invisible at the size the shot is shown and keeps the frame
 * at a true 19.5:9. Letterboxing instead would leave bars down both sides.
 */
async function addStatusBar(buf) {
  const { width: w, height: h } = await sharp(buf).metadata();

  const body = await sharp(buf).resize({ width: w, height: h - BAND, fit: 'fill' }).png().toBuffer();

  return sharp({ create: { width: w, height: h, channels: 3, background: '#FFFFFF' } })
    .composite([
      { input: body, left: 0, top: BAND },
      { input: statusBarSvg(w, '#FFFFFF', '#111111'), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();
}

async function buildShot(shot, locale) {
  const src = path.join(SRC_DIR, shot.src);
  if (!fs.existsSync(src)) throw new Error(`missing source: ${shot.src}`);

  const patches = typeof shot.patches === 'function' ? shot.patches(locale) : shot.patches || [];

  // Patches that sit on top of a photo blur the region first instead of
  // filling it, so replacement text still reads as text over a photograph.
  let base = await sharp(src).png().toBuffer();
  for (const patch of patches.filter((p) => p && p.blur)) {
    const region = await sharp(base)
      .extract({ left: patch.x, top: patch.y, width: patch.w, height: patch.h })
      .blur(patch.blur)
      .png()
      .toBuffer();
    base = await sharp(base).composite([{ input: region, left: patch.x, top: patch.y }]).png().toBuffer();
  }

  const composites = [];
  for (const patch of patches.filter(Boolean)) {
    composites.push({ input: await renderPatch(patch), left: Math.round(patch.x), top: Math.round(patch.y) });
  }

  // Composite first, then crop in a second pipeline: chaining `extract` after
  // `composite` makes sharp reorder the operations.
  let buf = await sharp(base).composite(composites).png().toBuffer();

  if (shot.crop) {
    buf = await sharp(buf).extract(shot.crop).png().toBuffer();
  } else {
    buf = await addStatusBar(buf);
  }

  const targetWidth = shot.width ?? (shot.crop ? Math.min(shot.crop.width, 900) : 780);

  const file = path.join(OUT_DIR, `${shot.name}.${locale}.webp`);
  await sharp(buf)
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(file);

  const { size } = fs.statSync(file);
  const meta = await sharp(file).metadata();
  return { file: path.basename(file), size, w: meta.width, h: meta.height };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const only = process.argv[2];
  const shots = only ? SHOTS.filter((s) => s.name === only) : SHOTS;
  if (!shots.length) {
    console.error(only ? `no shot named "${only}"` : 'no shots defined');
    process.exit(1);
  }

  const manifestPath = path.join(__dirname, '..', 'src', 'components', 'appshot', 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

  let total = 0;
  for (const shot of shots) {
    for (const locale of LOCALES) {
      const r = await buildShot(shot, locale);
      manifest[shot.name] = { w: r.w, h: r.h, frame: !shot.crop };
      total += r.size;
      console.log(`${r.file.padEnd(34)} ${String(r.w).padStart(4)}x${String(r.h).padEnd(5)} ${(r.size / 1024).toFixed(0).padStart(4)} KB`);
    }
  }

  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
  fs.writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);

  console.log(`\n${shots.length * LOCALES.length} files, ${(total / 1024).toFixed(0)} KB total`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
