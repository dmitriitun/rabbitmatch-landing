#!/usr/bin/env node

/**
 * Build the site icons from the logo.
 *
 * `public/images/logo.png` is the source of truth — 864px square with a wide
 * transparent margin, which is right for a page and wrong for a 16px browser
 * tab, where that margin eats most of the glyph. So the margin is trimmed
 * first and the mark is re-padded by a few per cent.
 *
 * `sharp` cannot write ICO, so the container is assembled here: an ICO is a
 * short header plus one directory entry per size, and each entry may hold a
 * PNG verbatim. Three sizes, because Windows still asks for 48.
 *
 * Run with `npm run build:favicon` after changing the logo.
 */

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const SOURCE = path.join(root, 'public', 'images', 'logo.png');
const ICO_SIZES = [16, 32, 48];

/** The mark, trimmed of its transparent margin and re-padded evenly. */
async function mark(size) {
  const padding = Math.round(size * 0.06);
  const inner = size - padding * 2;

  return sharp(SOURCE)
    .trim()
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function icoFrom(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const directory = Buffer.alloc(16 * entries.length);
  let offset = header.length + directory.length;

  entries.forEach(({ size, png }, i) => {
    const at = i * 16;
    // 256 is written as 0; nothing here is that large, but be correct anyway.
    directory.writeUInt8(size >= 256 ? 0 : size, at);
    directory.writeUInt8(size >= 256 ? 0 : size, at + 1);
    directory.writeUInt8(0, at + 2); // palette size
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel
    directory.writeUInt32LE(png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });

  return Buffer.concat([header, directory, ...entries.map((e) => e.png)]);
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`build-favicon: ${path.relative(root, SOURCE)} is missing`);
    process.exit(1);
  }

  const entries = [];
  for (const size of ICO_SIZES) {
    entries.push({ size, png: await mark(size) });
  }

  const ico = path.join(root, 'src', 'app', 'favicon.ico');
  fs.writeFileSync(ico, icoFrom(entries));

  const icons = path.join(root, 'public', 'icons');
  fs.mkdirSync(icons, { recursive: true });
  fs.writeFileSync(path.join(icons, 'icon-512.png'), await mark(512));
  fs.writeFileSync(path.join(icons, 'apple-touch-icon.png'), await mark(180));

  console.log(
    `build-favicon: favicon.ico (${ICO_SIZES.join('/')}), icon-512.png and apple-touch-icon.png written from logo.png`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
