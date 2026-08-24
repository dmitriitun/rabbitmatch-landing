#!/usr/bin/env node

/**
 * Development helper: draw a coordinate grid over a region of a source capture
 * so patch rectangles can be measured off it.
 *
 *   node scripts/calibrate-shot.js "<file>" <top> <height> [left] [width]
 *
 * Writes `.calibrate.png` next to the repo root; open it, read the numbers,
 * put them in app-shots.js.
 */

const path = require('node:path');
const sharp = require('sharp');
const { SRC_DIR } = require('./app-shots.config');

const [file, topArg, heightArg, leftArg, widthArg] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/calibrate-shot.js "<file>" <top> <height> [left] [width]');
  process.exit(1);
}

const top = Number(topArg) || 0;
const height = Number(heightArg) || 600;
const left = Number(leftArg) || 0;
const width = Number(widthArg) || 1170;

(async () => {
  const src = path.join(SRC_DIR, file);
  const region = await sharp(src).extract({ left, top, width, height }).png().toBuffer();

  // Scale so the grid stays readable regardless of region size.
  const scale = Math.max(1, Math.min(2.4, 1700 / width));
  const W = Math.round(width * scale);
  const H = Math.round(height * scale);

  const stepX = width > 700 ? 50 : 25;
  const stepY = height > 700 ? 50 : 25;

  const lines = [];
  for (let x = 0; x <= width; x += stepX) {
    const px = Math.round(x * scale);
    lines.push(
      `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="red" stroke-width="1" opacity="0.45"/>` +
        `<text x="${px + 2}" y="13" font-size="12" font-family="monospace" fill="red">${left + x}</text>`,
    );
  }
  for (let y = 0; y <= height; y += stepY) {
    const py = Math.round(y * scale);
    lines.push(
      `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="blue" stroke-width="1" opacity="0.45"/>` +
        `<text x="2" y="${py - 2}" font-size="12" font-family="monospace" fill="blue">${top + y}</text>`,
    );
  }

  await sharp(region)
    .resize({ width: W })
    .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines.join('')}</svg>`), top: 0, left: 0 }])
    .png()
    .toFile(path.join(__dirname, '..', '.calibrate.png'));

  console.log(`.calibrate.png  region ${left},${top} ${width}x${height}  scale ${scale.toFixed(2)}`);
})();
