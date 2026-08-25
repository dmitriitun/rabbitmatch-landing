#!/usr/bin/env node

/**
 * Put `public/` and `.next/static/` inside the standalone output, then prove
 * the result is actually serveable.
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
 *
 * The verification at the end exists because that failure is invisible: the
 * build is green, the deploy is healthy, the health check passes, and the site
 * is broken for everyone with a cold cache. One missing chunk is enough — a
 * single absent CSS file takes every CSS module with it, which reads to a
 * visitor as "the login button does nothing" rather than as a broken asset.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const standalone = path.join(root, '.next', 'standalone');

if (!fs.existsSync(standalone)) {
  console.log('postbuild: no standalone output, nothing to copy');
  process.exit(0);
}

/** Copy a tree into a destination directory, replacing whatever was there. */
function copyInto(from, to) {
  if (!fs.existsSync(from)) {
    console.log(`postbuild: ${path.relative(root, from)} does not exist, skipped`);
    return 0;
  }
  // Replaced rather than merged: a leftover tree from an earlier build would
  // otherwise sit alongside the current one, and a stale asset that happens to
  // answer a request is harder to diagnose than a missing one.
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return countFiles(to);
}

function countFiles(dir) {
  let files = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(current, entry.name));
      else files += 1;
    }
  };
  walk(dir);
  return files;
}

const pub = copyInto(path.join(root, 'public'), path.join(standalone, 'public'));
const stat = copyInto(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'));

console.log(`postbuild: standalone got ${pub} files from public/ and ${stat} from .next/static/`);

/* --- Verification -------------------------------------------------------- */

/** Every asset URL the prerendered pages ask the browser to fetch. */
function referencedAssets() {
  const appDir = path.join(root, '.next', 'server', 'app');
  if (!fs.existsSync(appDir)) return new Set();

  const refs = new Set();
  const pattern = /\/_next\/static\/[^"'`\\ )>]+/g;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.html') || entry.name.endsWith('.rsc')) {
        const text = fs.readFileSync(full, 'utf8');
        for (const match of text.matchAll(pattern)) refs.add(match[0]);
      }
    }
  };

  walk(appDir);
  return refs;
}

const missing = [];
for (const ref of referencedAssets()) {
  // `/_next/static/chunks/x.css` is served from `<standalone>/.next/static/chunks/x.css`.
  const relative = ref.replace('/_next/static/', '');
  if (!fs.existsSync(path.join(standalone, '.next', 'static', relative))) {
    missing.push(ref);
  }
}

if (missing.length > 0) {
  console.error(
    `\npostbuild: ${missing.length} asset(s) referenced by the prerendered HTML are not in the standalone output:\n`,
  );
  for (const ref of missing.slice(0, 20)) console.error(`  ${ref}`);
  if (missing.length > 20) console.error(`  … and ${missing.length - 20} more`);
  console.error(
    '\nDeploying this would serve pages whose stylesheets and scripts 404.\n' +
      'The usual cause is a stale `.next`: prerendered HTML kept from an earlier\n' +
      'build while the chunk hashes were regenerated. Delete `.next` (and the\n' +
      "platform's build cache) and build again.\n",
  );
  process.exit(1);
}

console.log('postbuild: every asset referenced by the prerendered HTML is present');
