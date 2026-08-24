#!/usr/bin/env node

/**
 * Put `public/` and `.next/static/` inside the standalone output.
 *
 * `output: 'standalone'` emits a server and the traced node_modules, and
 * deliberately leaves both of those out — Next assumes they sit behind a CDN.
 * Nothing else copies them in, so a standalone deploy that serves its own
 * assets answers every `/_next/static/*` and `/images/*` request with a 404:
 * the pages render, the stylesheets do not load, and the site arrives as
 * unstyled text.
 *
 * This runs as `postbuild` rather than as a step in `nixpacks.toml` on
 * purpose. A build command configured in the platform's dashboard replaces the
 * whole build phase from the config file, and then the copy silently never
 * happens. Hanging it off `npm run build` means it runs whoever starts the
 * build.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.log('postbuild: no standalone output, nothing to copy');
  process.exit(0);
}

/** Copy a tree into a destination directory, creating it if needed. */
function copyInto(from, to) {
  if (!fs.existsSync(from)) {
    console.log(`postbuild: ${path.relative(root, from)} does not exist, skipped`);
    return 0;
  }
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });

  let files = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(dir, entry.name));
      else files += 1;
    }
  };
  walk(to);
  return files;
}

const pub = copyInto(path.join(root, 'public'), path.join(standalone, 'public'));
const stat = copyInto(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));

console.log(`postbuild: standalone got ${pub} files from public/ and ${stat} from .next/static/`);
