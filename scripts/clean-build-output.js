#!/usr/bin/env node

/**
 * Drop the previous build's output before a new build, keeping `.next/cache`.
 *
 * The failure this prevents shipped once: prerendered HTML survived from an
 * earlier build while the chunk hashes were regenerated, so the pages asked
 * the browser for `/_next/static/chunks/<old-hash>.css` and got a 404. One
 * missing CSS chunk takes every CSS module with it, and the site arrives with
 * markup and handlers intact but no layout — which reads to a visitor as
 * "the login button does nothing", not as a broken asset.
 *
 * Only the two directories that can go stale are cleared:
 *
 * - `server/` holds the prerendered HTML, which names the chunks;
 * - `static/` holds the chunks themselves.
 *
 * `cache/` is the compiler's incremental state, not output — keeping it is the
 * difference between a 15-second rebuild and a cold one. `standalone/` is left
 * alone too: `next build` rewrites it, `postbuild` replaces the static tree
 * inside it, and on Windows a running `node .next/standalone/server.js` holds a
 * lock on it that would fail the delete for no gain.
 */

const fs = require('node:fs');
const path = require('node:path');

const next = path.join(__dirname, '..', '.next');
const STALE = ['server', 'static'];

if (!fs.existsSync(next)) {
  process.exit(0);
}

const removed = [];
for (const name of STALE) {
  const target = path.join(next, name);
  if (!fs.existsSync(target)) continue;
  try {
    fs.rmSync(target, { recursive: true, force: true });
    removed.push(name);
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      console.error(
        `\nprebuild: cannot clear .next/${name} — a process is still holding it.\n` +
          'Stop the running dev or standalone server and build again.\n',
      );
      process.exit(1);
    }
    throw err;
  }
}

console.log(
  removed.length
    ? `prebuild: cleared .next/${removed.join(', .next/')} (kept cache/)`
    : 'prebuild: nothing stale in .next',
);
