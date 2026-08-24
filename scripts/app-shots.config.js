/**
 * Where the source captures live, and how to name them.
 *
 * The captures sit outside the repository. The originals were later moved into
 * a subfolder and hand-cropped versions put beside them, so a lookup checks
 * the top level first and falls back to the archive.
 */

const fs = require('node:fs');
const path = require('node:path');

const SRC_DIR = 'C:/Users/Admin/Desktop/RM/Screens_for_landing';
const ARCHIVE = path.join(SRC_DIR, 'копии скринов');

/** Absolute path of a capture, wherever it currently sits. */
function resolveSource(file) {
  for (const dir of [SRC_DIR, ARCHIVE]) {
    const full = path.join(dir, file);
    if (fs.existsSync(full)) return full;
  }
  throw new Error(`capture not found in either folder: ${file}`);
}

const f = (n) =>
  n === 0
    ? 'rabbitmatch.app_Home_MatchList(iPhone 12 Pro).png'
    : `rabbitmatch.app_Home_MatchList(iPhone 12 Pro) (${n}).png`;
const p = (n) =>
  n === 0
    ? 'rabbitmatch.app_Profile_ProfileMain(iPhone 12 Pro).png'
    : `rabbitmatch.app_Profile_ProfileMain(iPhone 12 Pro) (${n}).png`;
const d = (n) =>
  n === 0
    ? 'rabbitmatch-development.up.railway.app_Profile_ProfileMain(iPhone 12 Pro).png'
    : `rabbitmatch-development.up.railway.app_Profile_ProfileMain(iPhone 12 Pro) (${n}).png`;

module.exports = { SRC_DIR, resolveSource, f, p, d };
