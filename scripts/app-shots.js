/**
 * The app screenshots used on the site.
 *
 * Each entry names a capture and, optionally, a rectangle to cut out of it.
 * Nothing else happens to the pixels. An earlier version of this file also
 * painted translated labels and plausible data over the captures; it produced
 * blurred patches and misaligned edges, and a screenshot that has been drawn
 * on stops being evidence. If a capture shows the wrong thing, re-take it in
 * the app rather than repairing it here.
 *
 * No `crop` means the whole screen, shown inside a phone frame on the site.
 * A `crop` is shown as a plain card.
 */

const { f, p, d } = require('./app-shots.config');

module.exports = [
  /* --- Whole screens, shown in a phone ---------------------------------- */

  { name: 'games-list', src: f(0), width: 760 },
  { name: 'courts', src: f(2), width: 760 },
  { name: 'venue-booking', src: f(3), width: 760 },
  { name: 'coach-profile', src: f(13), width: 760 },

  /* --- Cut-outs, shown as cards ----------------------------------------- */

  // Already cut down by hand outside the repo: `card` says so, otherwise the
  // build would take them for whole screens and hang a status bar on top.
  { name: 'best-match', src: 'rabbitmatch-sort-best-metches.png', card: true, width: 860 },
  { name: 'set-match', src: 'set_match.png', card: true, width: 760 },

  { name: 'player-streak', src: p(3), crop: { left: 55, top: 195, width: 1060, height: 610 }, width: 860 },
  { name: 'player-stability', src: p(3), crop: { left: 55, top: 965, width: 1060, height: 800 }, width: 860 },
  { name: 'player-traits', src: d(1), crop: { left: 45, top: 205, width: 1080, height: 1090 }, width: 860 },
  { name: 'player-card', src: p(0), crop: { left: 210, top: 222, width: 776, height: 1262 }, width: 460 },
  { name: 'court-card', src: f(2), crop: { left: 45, top: 535, width: 1082, height: 622 }, width: 860 },
  { name: 'game-formats', src: d(0), crop: { left: 30, top: 200, width: 1110, height: 1000 }, width: 860 },
  { name: 'win-by-format', src: d(0), crop: { left: 30, top: 1230, width: 1110, height: 720 }, width: 860 },
  { name: 'organizer-stats', src: d(2), crop: { left: 45, top: 520, width: 1080, height: 620 }, width: 860 },
  { name: 'coach-schedule', src: f(12), crop: { left: 45, top: 545, width: 1080, height: 1465 }, width: 860 },
];
