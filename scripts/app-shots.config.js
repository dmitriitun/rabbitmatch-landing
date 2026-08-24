/**
 * Declarative spec for the app screenshots used on the site.
 *
 * Source images are real captures of the app at iPhone 12 Pro resolution
 * (1170 × 2532), taken in a Windows browser — which is why the patches below
 * render in Segoe UI: it is the same font the captures already contain, so a
 * translated label is indistinguishable from the original one.
 *
 * A shot may be:
 *   - a full screen  → no `crop`, shown inside a phone frame on the site;
 *   - a component    → `crop`, shown as a plain card.
 *
 * `patches` cover a region with a flat colour and redraw text on top. They
 * exist for two reasons: to show the interface in the language the visitor
 * chose, and to replace test data ("Test31 Account31") and third-party venue
 * names with neutral, presentable content.
 */

const SRC_DIR = 'C:/Users/Admin/Desktop/RM/Screens_for_landing';

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

/* --- Reusable patch builders ---------------------------------------------- */

const GREY = '#9CA3AF';
const INK = '#111111';
const WHITE = '#FFFFFF';
const BG = '#F5F7FB';

/** The bottom tab bar, identical in every capture. */
function tabBar(active, locale) {
  const labels =
    locale === 'ru'
      ? ['Игры', 'Корты', 'Создать', 'Сообщество', 'Профиль']
      : ['Games', 'Courts', 'Create', 'Community', 'Profile'];
  const xs = [175, 350, 583, 815, 1000];
  return {
    x: 110,
    y: 2418,
    w: 950,
    h: 48,
    bg: WHITE,
    texts: labels.map((label, i) => ({
      x: xs[i],
      y: 34,
      text: label,
      size: 27,
      weight: 500,
      color: i === active ? INK : GREY,
      anchor: 'middle',
    })),
  };
}

/** Screen title in the top app bar. */
function screenTitle(text, { size = 44, weight = 700, bg = WHITE, x = 42, w = 560, y = 40, h = 78 } = {}) {
  return {
    x,
    y,
    w,
    h,
    bg,
    texts: [{ x: x + 2, y: 58, text, size, weight, color: INK, anchor: 'start' }],
  };
}

/** One-line replacement inside a region of flat colour. */
function line({ x, y, w, h, text, size, weight = 400, color = INK, bg = WHITE, anchor = 'start', dy }) {
  return {
    x,
    y,
    w,
    h,
    bg,
    texts: [{ x: anchor === 'middle' ? x + w / 2 : x + 2, y: dy ?? Math.round(h * 0.72), text, size, weight, color, anchor }],
  };
}

module.exports = { SRC_DIR, f, p, d, tabBar, screenTitle, line, GREY, INK, WHITE, BG };
