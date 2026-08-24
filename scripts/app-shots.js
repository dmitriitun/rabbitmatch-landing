/**
 * The app screenshots shown on the site, and how each one is prepared.
 *
 * See `build-app-shots.js` for the pipeline and `app-shots.config.js` for the
 * shared helpers. Coordinates are in source pixels (1170 × 2532); measure new
 * ones with `node scripts/calibrate-shot.js "<file>" <top> <height>`.
 */

const { f, p, d, tabBar, GREY, INK, WHITE, BG } = require('./app-shots.config');

const LIME = '#B9E901';
const RED = '#EF4444';
const CELL = '#F1F3F7';

/** Centred single-line replacement. */
const mid = (x, y, text, size, weight, color) => ({ x, y, text, size, weight, color, anchor: 'middle' });
/** Left-aligned single-line replacement. */
const left = (x, y, text, size, weight, color) => ({ x, y, text, size, weight, color, anchor: 'start' });

/* ========================================================================== */
/* Venue booking — full screen                                                */
/* ========================================================================== */

const venueBooking = {
  name: 'venue-booking',
  src: f(3),
  width: 760,
  patches: (locale) => {
    const ru = locale === 'ru';
    return [
      // The venue in the capture is a real club; blur the plate and put a
      // neutral name on it rather than implying an endorsement.
      { x: 0, y: 664, w: 1170, h: 140, blur: 26 },
      {
        x: 0,
        y: 664,
        w: 1170,
        h: 140,
        texts: [
          mid(585, 60, ru ? 'Падел-центр в центре' : 'Padel centre, city centre', 52, 700, WHITE),
          mid(585, 116, ru ? '4 корта · крытые · 1,8 км от вас' : '4 courts · indoor · 1.8 km away', 34, 400, '#EDEDED'),
        ],
      },
      {
        x: 500,
        y: 473,
        w: 178,
        h: 178,
        // A letter mark, not a racket: at this size any racket outline reads
        // as a magnifying glass.
        shapes: [{ type: 'circle', x: 589, y: 562, r: 84, fill: LIME }],
        texts: [{ x: 589, y: 122, text: ru ? 'П' : 'P', size: 96, weight: 700, color: '#0B0B0B', anchor: 'middle' }],
      },

      { x: 100, y: 938, w: 460, h: 62, bg: '#000000', texts: [mid(320, 46, ru ? 'Бронирование' : 'Booking', 38, 700, WHITE)] },
      { x: 640, y: 938, w: 470, h: 62, bg: WHITE, texts: [mid(875, 46, ru ? 'О площадке' : 'About the venue', 38, 600, GREY)] },

      { x: 78, y: 1100, w: 108, h: 42, bg: LIME, texts: [mid(132, 30, ru ? 'Сегодня' : 'Today', 25, 400, INK)] },
      ...(ru
        ? [288, 457, 625, 793, 961, 1129].map((cx) => ({
            x: cx - 60,
            y: 1100,
            w: 120,
            h: 42,
            bg: '#F7F8FA',
            texts: [mid(cx, 30, 'авг', 27, 400, GREY)],
          }))
        : []),
      ...(ru
        ? [
            { cx: 121, label: 'Пн', bg: LIME, color: INK },
            { cx: 288, label: 'Вт', bg: '#F7F8FA', color: GREY },
            { cx: 457, label: 'Ср', bg: '#F7F8FA', color: GREY },
            { cx: 625, label: 'Чт', bg: '#F7F8FA', color: GREY },
            { cx: 793, label: 'Пт', bg: '#F7F8FA', color: GREY },
            { cx: 961, label: 'Сб', bg: '#F7F8FA', color: GREY },
            { cx: 1129, label: 'Вс', bg: '#F7F8FA', color: GREY },
          ].map((c) => ({
            x: c.cx - 55,
            y: 1215,
            w: 110,
            h: 44,
            bg: c.bg,
            texts: [mid(c.cx, 32, c.label, 27, 400, c.color)],
          }))
        : []),

      ...(ru
        ? [
            { cx: 232, label: '60 мин', bg: LIME, color: INK, weight: 700 },
            { cx: 590, label: '120 мин', bg: CELL, color: GREY, weight: 600 },
            { cx: 947, label: '180 мин', bg: CELL, color: GREY, weight: 600 },
          ].map((c) => ({
            x: c.cx - 130,
            y: 1352,
            w: 260,
            h: 62,
            bg: c.bg,
            texts: [mid(c.cx, 46, c.label, 38, c.weight, c.color)],
          }))
        : []),

      {
        x: 100,
        y: 1990,
        w: 970,
        h: 74,
        bg: LIME,
        texts: [mid(585, 55, ru ? 'Перейти к бронированию' : 'Go to booking', 44, 700, INK)],
      },
      {
        x: 30,
        y: 2115,
        w: 1120,
        h: 118,
        bg: WHITE,
        texts: [
          left(105, 46, ru ? 'Бронирование оформляется на сайте' : 'The booking is completed on the venue', 33, 400, GREY),
          left(105, 92, ru ? 'площадки' : 'website', 33, 400, GREY),
        ],
      },

      tabBar(1, locale),
    ];
  },
};

/* ========================================================================== */
/* Coach schedule — component                                                 */
/* ========================================================================== */

const coachSchedule = {
  name: 'coach-schedule',
  src: f(12),
  crop: { left: 45, top: 545, width: 1080, height: 1465 },
  width: 860,
  patches: (locale) => {
    if (locale !== 'ru') return [];

    const PILL = '#F5F7FB';

    // Each label is patched on its own so the availability dot beside Mon, Wed
    // and Fri survives.
    const day = (x, w, cx, label, bg = PILL, color = GREY, y = 585, h = 56, baseline = 40) => ({
      x,
      y,
      w,
      h,
      bg,
      texts: [mid(cx, baseline, label, 38, 600, color)],
    });

    return [
      day(100, 100, 150, 'Пн'),
      day(320, 100, 370, 'Вт'),
      day(505, 105, 557, 'Ср'),
      day(730, 100, 780, 'Чт'),
      day(905, 76, 943, 'Пт', '#000000', WHITE),
      day(95, 95, 142, 'Сб', PILL, GREY, 715),
      day(262, 95, 309, 'Вс', PILL, GREY, 715),

      day(80, 190, 175, 'Утро', PILL, INK, 840, 80, 62),
      day(322, 210, 427, 'День', PILL, INK, 840, 80, 62),
      day(585, 178, 674, 'Вечер', PILL, INK, 840, 80, 62),
    ];
  },
};

/* ========================================================================== */
/* Player statistics — components                                             */
/* ========================================================================== */

const STREAK = ['L', 'D', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'];
const STREAK_STYLE = {
  W: { bg: LIME, color: INK },
  L: { bg: RED, color: WHITE },
  D: { bg: '#E5E7EB', color: GREY },
};

const playerStreak = {
  name: 'player-streak',
  src: p(3),
  crop: { left: 55, top: 195, width: 1060, height: 610 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';

    // Outcome letters come out of the capture as unreadable abbreviations, and
    // the sequence disagreed with the "10 in a row" headline above it.
    const letters = STREAK.map((code, i) => {
      const style = STREAK_STYLE[code];
      const label = ru ? { W: 'В', L: 'П', D: 'Н' }[code] : code;
      const x = 90 + i * 79;
      return {
        x,
        y: 704,
        w: 67,
        h: 77,
        bg: style.bg,
        rx: 16,
        texts: [mid(x + 34, 55, label, 34, 700, style.color)],
      };
    });

    return [
      ...(ru
        ? [
            { x: 88, y: 200, w: 760, h: 78, bg: WHITE, texts: [left(95, 53, 'Серия', 46, 700, INK)] },
            {
              x: 88,
              y: 275,
              w: 1010,
              h: 105,
              bg: WHITE,
              texts: [
                left(95, 44, 'Сколько побед или поражений идёт подряд', 36, 400, GREY),
                left(95, 92, 'сейчас и какой была лучшая серия побед.', 36, 400, GREY),
              ],
            },
            { x: 240, y: 550, w: 300, h: 52, bg: WHITE, texts: [mid(390, 40, 'побед подряд', 34, 400, GREY)] },
            { x: 660, y: 550, w: 400, h: 52, bg: WHITE, texts: [mid(860, 40, 'лучшая серия', 34, 400, GREY)] },
            { x: 88, y: 640, w: 620, h: 56, bg: WHITE, texts: [left(95, 42, 'Последние игры', 36, 700, GREY)] },
          ]
        : []),
      ...letters,
    ];
  },
};

const playerStability = {
  name: 'player-stability',
  src: p(3),
  crop: { left: 55, top: 965, width: 1060, height: 800 },
  width: 860,
  patches: (locale) => {
    if (locale !== 'ru') return [];
    return [
      { x: 88, y: 952, w: 760, h: 80, bg: WHITE, texts: [left(95, 54, 'Стабильность', 46, 700, INK)] },
      {
        x: 88,
        y: 1040,
        w: 1010,
        h: 155,
        bg: WHITE,
        texts: [
          left(95, 44, 'Насколько ровно вы играете: показатель выше,', 36, 400, GREY),
          left(95, 92, 'когда результаты идут сериями, и ниже, когда', 36, 400, GREY),
          left(95, 140, 'победы и поражения чередуются.', 36, 400, GREY),
        ],
      },
      { x: 300, y: 1490, w: 580, h: 55, bg: WHITE, texts: [mid(590, 40, 'за последние 20 игр', 34, 400, GREY)] },
      {
        x: 105,
        y: 1592,
        w: 960,
        h: 146,
        bg: LIME,
        texts: [
          left(185, 58, 'Вы играете ровно и чаще выигрываете —', 38, 700, INK),
          left(185, 112, 'можно брать соперника посильнее.', 38, 700, INK),
        ],
      },
    ];
  },
};

const playerTraits = {
  name: 'player-traits',
  src: d(1),
  crop: { left: 45, top: 205, width: 1080, height: 1090 },
  width: 860,
  patches: (locale) => {
    if (locale !== 'ru') return [];

    const axis = (cx, baseline, label, w = 300) => ({
      x: cx - w / 2,
      y: baseline - 40,
      w,
      h: 58,
      bg: WHITE,
      texts: [mid(cx, 36, label, 30, 400, GREY)],
    });

    return [
      { x: 88, y: 200, w: 1030, h: 78, bg: WHITE, texts: [left(95, 53, 'Сильные стороны и зоны роста', 46, 700, INK)] },
      {
        x: 88,
        y: 275,
        w: 1030,
        h: 150,
        bg: WHITE,
        texts: [
          left(95, 42, 'Из оценок вашей игры другими игроками.', 36, 400, GREY),
          left(95, 90, 'Помогает понять, где вы хороши и где есть', 36, 400, GREY),
          left(95, 138, 'куда расти.', 36, 400, GREY),
        ],
      },
      axis(588, 492, 'Стабильность'),
      axis(863, 627, 'Скорость', 240),
      axis(934, 929, 'Тактика', 230),
      axis(741, 1169, 'Атака', 220),
      axis(433, 1169, 'Защита', 230),
      axis(241, 929, 'Реакция', 250),
      axis(310, 627, 'Выносливость', 300),
      axis(588, 1262, 'Нейтрально', 320),
    ];
  },
};

/* ========================================================================== */
/* Organizer statistics — component                                           */
/* ========================================================================== */

const organizerStats = {
  name: 'organizer-stats',
  src: d(2),
  crop: { left: 45, top: 520, width: 1080, height: 620 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';
    return [
      ...(ru
        ? [
            { x: 150, y: 620, w: 340, h: 55, bg: WHITE, texts: [mid(320, 40, 'проведено игр', 34, 400, GREY)] },
            { x: 690, y: 620, w: 340, h: 55, bg: WHITE, texts: [mid(860, 40, 'уникальных игроков', 34, 400, GREY)] },
            { x: 88, y: 782, w: 860, h: 80, bg: WHITE, texts: [left(95, 54, 'Рейтинг организатора', 46, 700, INK)] },
          ]
        : []),

      // The capture caught the "not enough ratings yet" state. A marketing page
      // should show the feature working, so the block is filled in.
      {
        x: 60,
        y: 885,
        w: 1060,
        h: 300,
        bg: WHITE,
        texts: [
          mid(585, 96, '4,8', 96, 700, INK),
          mid(585, 152, ru ? 'из 5 · оценок: 37' : 'out of 5 · 37 ratings', 34, 400, GREY),
          mid(585, 218, ru ? 'Средняя оценка участников ваших игр' : 'The average rating from your participants', 33, 400, GREY),
        ],
      },
    ];
  },
};


/* ========================================================================== */
/* Games list — full screen                                                   */
/* ========================================================================== */

const gamesList = {
  name: 'games-list',
  src: f(0),
  width: 760,
  patches: (locale) => {
    const ru = locale === 'ru';
    const PILL = '#F5F7FB';

    /**
     * One game card. Baselines are measured per card rather than derived from
     * an offset — the two cards in the capture are not evenly spaced.
     * Value patches are cut around the icons so those survive.
     */
    const card = ({ title, sub, date, venue, button }, t) => [
      { x: 222, y: t.title - 54, w: 810, h: 70, bg: WHITE, texts: [left(228, 50, title, 48, 700, INK)] },
      { x: 222, y: t.sub - 44, w: 380, h: 60, bg: WHITE, texts: [left(228, 40, sub, 36, 400, GREY)] },
      {
        x: 172,
        y: t.date - 48,
        w: 874,
        h: 66,
        bg: PILL,
        texts: [left(248, 46, `${date.day} · ${date.time}`, 40, 500, INK)],
      },
      { x: 138, y: t.venue - 44, w: 780, h: 70, bg: WHITE, texts: [left(146, 40, venue, 36, 400, GREY)] },

      {
        x: 130,
        y: t.labels - 34,
        w: 940,
        h: 46,
        bg: WHITE,
        texts: [
          left(134, 32, ru ? 'ОРГАНИЗАТОР' : 'ORGANIZER', 28, 500, GREY),
          left(534, 32, ru ? 'ВЗНОС' : 'CONTRIBUTION', 28, 500, GREY),
          left(797, 32, ru ? 'УРОВЕНЬ' : 'LEVEL', 28, 500, GREY),
          left(945, 32, ru ? 'ДОСТУП' : 'CODE', 28, 500, GREY),
        ],
      },
      { x: 128, y: t.values - 44, w: 348, h: 72, bg: WHITE, texts: [left(134, 42, ru ? 'Вадим Б.' : 'Vadim B.', 40, 500, INK)] },
      { x: 528, y: t.values - 44, w: 214, h: 72, bg: WHITE, texts: [left(534, 42, '25 GEL', 40, 500, INK)] },
      { x: 792, y: t.values - 44, w: 96, h: 72, bg: WHITE, texts: [left(798, 42, '1-7', 40, 500, INK)] },
      { x: 972, y: t.values - 44, w: 128, h: 72, bg: WHITE, texts: [left(976, 42, ru ? 'Закрыт' : 'Private', 26, 500, INK)] },

      {
        x: 128,
        y: button,
        w: 918,
        h: 92,
        bg: LIME,
        texts: [mid(585, 64, ru ? 'Отправить заявку' : 'Send an application', 46, 700, INK)],
      },
    ];

    return [
      { x: 55, y: 48, w: 420, h: 82, bg: WHITE, texts: [left(62, 62, ru ? 'Игры' : 'Games', 62, 700, INK)] },

      { x: 95, y: 182, w: 178, h: 66, bg: LIME, texts: [left(102, 48, ru ? 'Общие' : 'General', 44, 700, INK)] },
      { x: 425, y: 182, w: 112, h: 66, bg: PILL, texts: [mid(472, 48, ru ? 'Мои' : 'My', 44, 500, GREY)] },
      { x: 592, y: 182, w: 180, h: 66, bg: PILL, texts: [mid(679, 48, ru ? 'История' : 'History', 44, 500, GREY)] },

      { x: 176, y: 314, w: 290, h: 68, bg: '#E7DDFF', texts: [left(184, 50, ru ? 'Вход по коду' : 'Join by code', 44, 500, '#4300BD')] },

      { x: 68, y: 512, w: 120, h: 66, bg: '#1A1A2E', texts: [mid(128, 48, ru ? 'Все' : 'All', 40, 700, LIME)] },
      ...(ru
        ? [
            { label: 'Сегодня', lx: 216, lw: 102, ls: 22, day: 'Пн', dx: 246, dw: 78 },
            { label: 'авг', lx: 408, lw: 64, ls: 30, day: 'Вт', dx: 408, dw: 66 },
            { label: 'авг', lx: 563, lw: 66, ls: 30, day: 'Ср', dx: 560, dw: 74 },
            { label: 'авг', lx: 718, lw: 66, ls: 30, day: 'Пт', dx: 724, dw: 56 },
          ].flatMap((c) => [
            { x: c.lx, y: 470, w: c.lw, h: 46, bg: PILL, texts: [mid(c.lx + c.lw / 2, 33, c.label, c.ls, 400, GREY)] },
            { x: c.dx, y: 582, w: c.dw, h: 66, bg: PILL, texts: [mid(c.dx + c.dw / 2, 47, c.day, 30, 400, GREY)] },
          ])
        : []),

      ...card(
        {
          title: ru ? 'Падел в центре' : 'Padel downtown',
          sub: ru ? 'Матч • По сетам' : 'Match • By sets',
          date: { day: ru ? 'Сегодня' : 'Today', time: ru ? '21:00 – 23:00' : '9:00 PM – 11:00 PM' },
          venue: ru ? 'Клуб в центре' : 'Downtown club',
          button: 1252,
        },
        { title: 775, sub: 830, date: 905, venue: 985, labels: 1160, values: 1205 },
      ),

      ...card(
        {
          title: ru ? 'Вечерний Мексикано' : 'Evening Mexicano',
          sub: ru ? 'Турнир • Мексикано' : 'Tournament • Mexicano',
          date: { day: ru ? 'Завтра' : 'Tomorrow', time: ru ? '19:00 – 21:00' : '7:00 PM – 9:00 PM' },
          venue: ru ? 'Клуб на набережной' : 'Riverside club',
          button: 1977,
        },
        { title: 1500, sub: 1555, date: 1630, venue: 1710, labels: 1885, values: 1932 },
      ),

      { x: 222, y: 2196, w: 810, h: 76, bg: WHITE, texts: [left(228, 62, ru ? 'Утренний Американо' : 'Morning Americano', 48, 700, INK)] },
      { x: 222, y: 2262, w: 400, h: 44, bg: WHITE, texts: [left(228, 23, ru ? 'Турнир • Американо' : 'Tournament • Americano', 34, 400, GREY)] },

      tabBar(0, locale),
    ];
  },
};


/* ========================================================================== */
/* Coach profile — full screen                                                */
/* ========================================================================== */

/** Rough Segoe UI advance width; good enough to size a pill around a label. */
const textWidth = (text, size) => Math.round(text.length * size * 0.51);

/** A mortarboard glyph, drawn in patch-local coordinates. */
const capIcon = (cx, cy) => ({
  type: 'path',
  fill: '#4300BD',
  d: `M ${cx - 18},${cy - 2} L ${cx},${cy - 12} L ${cx + 18},${cy - 2} L ${cx},${cy + 8} Z` +
    `M ${cx - 9},${cy + 4} L ${cx - 9},${cy + 11} Q ${cx},${cy + 18} ${cx + 9},${cy + 11} L ${cx + 9},${cy + 4} L ${cx},${cy + 9} Z`,
});

/** A map pin glyph, drawn in patch-local coordinates. */
const pinIcon = (cx, cy) => ({
  type: 'path',
  fill: '#4300BD',
  d: `M ${cx},${cy + 15} C ${cx - 17},${cy - 4} ${cx - 13},${cy - 19} ${cx},${cy - 19} ` +
    `C ${cx + 13},${cy - 19} ${cx + 17},${cy - 4} ${cx},${cy + 15} Z` +
    `M ${cx},${cy - 13} A 6 6 0 1 0 ${cx},${cy - 1} A 6 6 0 1 0 ${cx},${cy - 13} Z`,
});

/**
 * Repaint a block of pill-shaped chips. The pills are redrawn rather than
 * text-patched: a translated label is a different length, so the original
 * pill would be the wrong width around it.
 */
function chipBlock({ x, y, w, rows, icon, size = 40, rowH = 90, gap = 26, pad = 26 }) {
  const py = y - pad;
  const shapes = [];
  const texts = [];
  rows.forEach((row, r) => {
    let cx = x + 7;
    const top = y + r * (rowH + gap);
    for (const label of row) {
      const cw = 74 + textWidth(label, size) + 30;
      shapes.push({ x: cx, y: top, w: cw, h: rowH, rx: rowH / 2, fill: BG });
      if (icon) shapes.push(icon(cx - x + 46, top - py + rowH / 2));
      texts.push({ x: cx + 74, y: top - py + rowH / 2 + 14, text: label, size, weight: 400, color: INK, anchor: 'start' });
      cx += cw + gap;
    }
  });
  return {
    x,
    y: py,
    w,
    h: rows.length * rowH + (rows.length - 1) * gap + pad * 2,
    bg: WHITE,
    shapes,
    texts,
  };
}

const coachProfile = {
  name: 'coach-profile',
  src: f(13),
  width: 760,
  patches: (locale) => {
    const ru = locale === 'ru';
    const t = (a, b) => (ru ? a : b);

    return [
      { x: 195, y: 66, w: 340, h: 74, bg: WHITE, texts: [left(203, 54, t('Тренер', 'Coach'), 56, 700, INK)] },

      { x: 290, y: 548, w: 600, h: 92, bg: BG, texts: [mid(585, 68, t('Михаил Смусев', 'Mikhail Smusev'), 58, 700, INK)] },
      { x: 476, y: 640, w: 310, h: 66, bg: BG, texts: [left(482, 50, t('Тбилиси, Грузия', 'Tbilisi, Georgia'), 36, 400, '#6B7280')] },
      { x: 616, y: 768, w: 84, h: 76, bg: BG, texts: [left(622, 58, '24', 44, 500, '#4300BD')] },

      { x: 60, y: 962, w: 512, h: 116, bg: '#000000', rx: 58, texts: [mid(316, 76, t('О тренере', 'About the coach'), 44, 600, WHITE)] },
      { x: 586, y: 962, w: 500, h: 116, bg: WHITE, rx: 58, texts: [mid(836, 76, t('Занятия', 'Recordings'), 44, 400, '#6B7280')] },

      { x: 88, y: 1162, w: 700, h: 68, bg: WHITE, texts: [left(95, 52, t('Индивидуально — от 60 GEL', 'Individual lessons from 60 GEL'), 42, 400, INK)] },
      { x: 88, y: 1232, w: 700, h: 70, bg: WHITE, texts: [left(95, 52, t('В группе — от 40 GEL', 'Group lessons from 40 GEL'), 42, 400, INK)] },

      chipBlock({
        x: 88,
        y: 1438,
        w: 1000,
        icon: capIcon,
        rows: ru
          ? [
              ['Продвинутые', 'Любители', 'Новички'],
              ['Точность удара', 'Техника удара'],
              ['Тактика игры', 'Игра в паре'],
            ]
          : [
              ['Advanced', 'Amateurs', 'Beginners'],
              ['Shot accuracy', 'Punching technique'],
              ['Game Tactics', 'Teamwork'],
            ],
      }),

      { x: 88, y: 1338, w: 460, h: 74, bg: WHITE, texts: [left(95, 55, t('Специализация', 'Specialization'), 44, 700, INK)] },
      chipBlock({
        x: 88,
        y: 1852,
        w: 1000,
        rowH: 96,
        icon: pinIcon,
        rows: [ru ? ['Клуб в центре', 'Клуб на набережной'] : ['Downtown club', 'Riverside club']],
      }),

      { x: 88, y: 1766, w: 460, h: 76, bg: WHITE, texts: [left(95, 56, t('Где тренирует', 'Training Areas'), 44, 700, INK)] },
      { x: 88, y: 2000, w: 380, h: 78, bg: WHITE, texts: [left(95, 58, t('Контакты', 'Contacts'), 44, 700, INK)] },

      tabBar(3, locale),
    ];
  },
};


/* ========================================================================== */
/* Live tournament round — component crop                                     */
/* ========================================================================== */

const tournamentLive = {
  name: 'tournament-live',
  src: f(7),
  crop: { left: 70, top: 890, width: 1010, height: 800 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';
    const t = (a, b) => (ru ? a : b);

    const players = ru
      ? [
          { name: 'Артём С.', initial: 'А' },
          { name: 'Никита Р.', initial: 'Н' },
          { name: 'Игорь М.', initial: 'И' },
          { name: 'Павел Д.', initial: 'П' },
        ]
      : [
          { name: 'Artem S.', initial: 'A' },
          { name: 'Nikita R.', initial: 'N' },
          { name: 'Igor M.', initial: 'I' },
          { name: 'Pavel D.', initial: 'P' },
        ];
    const cx = [205, 455, 720, 965];
    const fills = ['#4300BD', '#1FA9A0', '#7C5CFF', '#E8892B'];

    return [
      // The lime pill is redrawn rather than text-patched: "Ваш корт" is a
      // different length from "Your court", so the original pill is wrong.
      {
        x: 130,
        y: 948,
        w: 350,
        h: 100,
        bg: WHITE,
        shapes: [{ x: 140, y: 955, w: 330, h: 86, rx: 43, fill: LIME }],
        texts: [mid(305, 66, t('Ваш корт 7', 'Your court 7'), 46, 700, INK)],
      },
      {
        x: 786,
        y: 948,
        w: 262,
        h: 100,
        bg: WHITE,
        shapes: [{ x: 796, y: 955, w: 244, h: 86, rx: 43, fill: '#0B0B0B' }],
        texts: [mid(918, 66, t('Сохранить', 'Save'), 42, 700, LIME)],
      },

      { x: 270, y: 1062, w: 190, h: 58, bg: WHITE, texts: [mid(365, 44, t('Команда 1', 'Team 1'), 36, 700, GREY)] },
      { x: 730, y: 1062, w: 190, h: 58, bg: WHITE, texts: [mid(825, 44, t('Команда 2', 'Team 2'), 36, 700, GREY)] },

      // Three of the four players have no picture in the capture, so all four
      // get the same kind of initial avatar — one filled circle and three
      // empty rings would look worse than the original.
      ...players.map((pl, i) => ({
        x: cx[i] - 70,
        y: 1165,
        w: 140,
        h: 140,
        shapes: [{ type: 'circle', x: cx[i], y: 1235, r: 68, fill: fills[i] }],
        texts: [{ x: cx[i], y: 92, text: pl.initial, size: 62, weight: 700, color: WHITE, anchor: 'middle' }],
      })),

      ...players.map((pl, i) => ({
        x: cx[i] - 130,
        y: 1300,
        w: 260,
        h: 76,
        bg: WHITE,
        texts: [mid(cx[i], 54, pl.name, 42, 500, INK)],
      })),

      { x: 480, y: 1396, w: 210, h: 62, bg: WHITE, texts: [mid(585, 46, t('Раунд 1', 'Round 1'), 40, 700, GREY)] },

      { x: 400, y: 1500, w: 130, h: 96, bg: WHITE, texts: [mid(465, 74, '6', 68, 700, INK)] },
      { x: 645, y: 1500, w: 130, h: 96, bg: WHITE, texts: [mid(710, 74, '4', 68, 700, INK)] },
    ];
  },
};


/* ========================================================================== */
/* One court with free slots — component crop                                 */
/* ========================================================================== */

const courtCard = {
  name: 'court-card',
  src: f(2),
  crop: { left: 45, top: 535, width: 1082, height: 622 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';
    const t = (a, b) => (ru ? a : b);

    return [
      // The club's own logo and name are replaced: a real venue's branding on
      // a marketing page reads as a partnership announcement. The blur runs
      // the full width of the card so its edge falls on the card edge rather
      // than leaving three smudged rectangles in the middle of a photo.
      { x: 45, y: 748, w: 1082, h: 228, blur: 48 },
      {
        x: 45,
        y: 748,
        w: 1082,
        h: 228,
        texts: [
          left(99, 70, t('Клуб в центре', 'Downtown club'), 50, 700, WHITE),
          left(99, 138, t('ул. Центральная, 64', '64 Central St'), 38, 400, '#EFEFEF'),
          left(99, 204, t('от 40 GEL', 'from 40 GEL'), 40, 700, LIME),
        ],
      },
      {
        x: 84,
        y: 574,
        w: 132,
        h: 132,
        blur: 20,
        // A letter mark rather than a racket: at this size any racket outline
        // reads as a magnifying glass.
        shapes: [{ type: 'circle', x: 148, y: 638, r: 58, fill: LIME }],
        texts: [{ x: 148, y: 88, text: ru ? 'К' : 'D', size: 66, weight: 700, color: '#0B0B0B', anchor: 'middle' }],
      },
    ];
  },
};


/* ========================================================================== */
/* Player card — component crop                                               */
/* ========================================================================== */

const playerCard = {
  name: 'player-card',
  src: p(0),
  crop: { left: 210, top: 222, width: 776, height: 1262 },
  width: 460,
  patches: (locale) => {
    const ru = locale === 'ru';
    const t = (a, b) => (ru ? a : b);

    // The plate behind the text is a smooth gradient, so blurring it and
    // drawing on top leaves no visible seam.
    return [
      { x: 288, y: 936, w: 620, h: 74, blur: 22 },
      {
        x: 288,
        y: 936,
        w: 620,
        h: 74,
        texts: [{ x: 596, y: 52, text: t('СМИРНОВ', 'SMIRNOV'), size: 58, weight: 700, color: WHITE, anchor: 'middle', spacing: 12 }],
      },

      { x: 440, y: 1016, w: 312, h: 56, blur: 18 },
      {
        x: 440,
        y: 1016,
        w: 312,
        h: 56,
        texts: [{ x: 596, y: 38, text: t('Артём', 'Artem'), size: 32, weight: 400, color: '#EDEDED', anchor: 'middle', spacing: 8 }],
      },

      { x: 296, y: 1058, w: 230, h: 44, blur: 16 },
      { x: 296, y: 1058, w: 230, h: 44, texts: [left(302, 32, t('Побед', 'Win rate'), 26, 700, '#EDEDED')] },

      { x: 776, y: 1060, w: 150, h: 44, blur: 16 },
      { x: 776, y: 1060, w: 150, h: 44, texts: [mid(848, 33, t('Рейтинг', 'Rating'), 26, 700, '#EDEDED')] },
    ];
  },
};


/* ========================================================================== */
/* Best match — component crop                                                */
/* ========================================================================== */

const bestMatch = {
  name: 'best-match',
  src: f(10),
  crop: { left: 45, top: 622, width: 1100, height: 300 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';

    const lines = ru
      ? [
          'Уровень игры совпадает на 88%, играет слева,',
          'общие интересы: любитель, готова к турнирам,',
          'играет по вечерам + 2',
        ]
      : [
          'Level of play matches 88%, plays on the left side,',
          'shared interests: amateur, ready for tournaments,',
          'plays in the evenings + 2',
        ];

    return [
      // The card belongs to a real person. Name, face and the reasons under
      // them are replaced; the layout and the wording pattern are the app's.
      { x: 190, y: 652, w: 920, h: 192, blur: 34 },
      {
        x: 190,
        y: 652,
        w: 920,
        h: 192,
        texts: [
          left(205, 44, ru ? 'Кристина' : 'Kristina', 45, 700, WHITE),
          left(205, 94, lines[0], 32, 400, '#E4EFE9'),
          left(205, 133, lines[1], 32, 400, '#E4EFE9'),
          left(205, 172, lines[2], 32, 400, '#E4EFE9'),
        ],
      },
      {
        // No blur here: a blurred square would show its corners around the
        // circle. The white ring is the app's own, redrawn.
        x: 71,
        y: 720,
        w: 104,
        h: 104,
        shapes: [
          { type: 'circle', x: 123, y: 772, r: 49, fill: '#FFFFFF' },
          { type: 'circle', x: 123, y: 772, r: 40, fill: '#4300BD' },
        ],
        texts: [{ x: 123, y: 66, text: ru ? 'К' : 'K', size: 42, weight: 700, color: WHITE, anchor: 'middle' }],
      },
    ];
  },
};


/* ========================================================================== */
/* Community — full screen                                                    */
/* ========================================================================== */
/* Community — best-match sorting                                             */
/* ========================================================================== */

/**
 * The capture holds three real players: real names, one real face, one default
 * rabbit avatar and one account of our own. Names, faces and the reason lines
 * are replaced; ratings and level badges are the app's own.
 *
 * Cropped just below the third card rather than shown as a whole screen — the
 * capture has half a screen of white space under the list, and an empty phone
 * sells nothing.
 */
const community = {
  name: 'community',
  src: 'rabbitmatch-sort-best-metches.png',
  crop: { left: 0, top: 0, width: 1170, height: 1562 },
  width: 860,
  patches: (locale) => {
    const ru = locale === 'ru';
    const t = (a2, b2) => (ru ? a2 : b2);

    const tops = [626, 938, 1238];
    const fills = ['#4300BD', '#1FA9A0', '#E8892B'];

    const people = ru
      ? [
          { name: 'Кристина', initial: 'К', lines: ['Уровень игры совпадает на 88%, играет слева,', 'общие интересы: любитель, готова к турнирам,', 'играет по вечерам + 2'] },
          { name: 'Дмитрий Р.', initial: 'Д', lines: ['Уровень игры совпадает на 84%, играет слева,', 'общие интересы: готов к турнирам, играет по', 'вечерам и в выходные'] },
          { name: 'Анна В.', initial: 'А', lines: ['Уровень игры совпадает на 81%, играет справа,', 'общие интересы: любитель, интенсивные', 'тренировки + 2'] },
        ]
      : [
          { name: 'Kristina', initial: 'K', lines: ['Level of play matches 88%, plays on the left side,', 'shared interests: amateur, ready for tournaments,', 'plays in the evenings + 2'] },
          { name: 'Dmitry R.', initial: 'D', lines: ['Level of play matches 84%, plays on the left side,', 'shared interests: ready for tournaments, plays in', 'the evenings and at weekends'] },
          { name: 'Anna V.', initial: 'A', lines: ['Level of play matches 81%, plays on the right side,', 'shared interests: amateur, intense training + 2'] },
        ];

    const tabs = ru
      ? ['Игроки', 'Тренеры', 'Обучение', 'Сообщества']
      : ['Players', 'Coaches', 'Training', 'Communities'];

    let tx = 56;
    const tabTexts = [];
    let underline = null;
    tabs.forEach((label, i) => {
      const w = textWidth(label, 42);
      tabTexts.push({ x: tx, y: 39, text: label, size: 42, weight: i === 0 ? 600 : 400, color: i === 0 ? INK : '#6B7280', anchor: 'start' });
      if (i === 0) underline = { x: tx - 13, y: 335, w: w + 26, h: 6, rx: 3, fill: INK };
      tx += w + 54;
    });

    const card = (i) => {
      const top = tops[i];
      const person = people[i];
      return [
        // The band runs the full width of the card so its vertical edges land
        // on the card's own edges instead of leaving a rectangle inside it.
        { x: 55, y: top + 26, w: 1060, h: 186, blur: 30 },
        {
          x: 55,
          y: top + 26,
          w: 1060,
          h: 186,
          texts: [
            { x: 205, y: 44, text: person.name, size: 45, weight: 700, color: WHITE, anchor: 'start' },
            ...person.lines.map((line, n) => ({ x: 205, y: 94 + n * 39, text: line, size: 32, weight: 400, color: '#F0F0F0', anchor: 'start' })),
          ],
        },
        {
          // Redrawn, not blurred: a blurred square would show its corners
          // around the circle.
          x: 68,
          y: top + 83,
          w: 112,
          h: 112,
          shapes: [
            { type: 'circle', x: 124, y: top + 139, r: 52, fill: '#FFFFFF' },
            { type: 'circle', x: 124, y: top + 139, r: 46, fill: fills[i] },
          ],
          texts: [{ x: 124, y: 71, text: person.initial, size: 46, weight: 700, color: WHITE, anchor: 'middle' }],
        },
      ];
    };

    return [
      { x: 45, y: 62, w: 430, h: 80, bg: WHITE, texts: [left(53, 55, t('Сообщество', 'Community'), 52, 700, INK)] },
      { x: 927, y: 70, w: 148, h: 60, bg: WHITE, texts: [left(933, 43, t('Тбилиси', 'Tbilisi'), 34, 400, INK)] },

      { x: 34, y: 256, w: 936, h: 86, bg: WHITE, shapes: [underline], texts: tabTexts },

      { x: 170, y: 424, w: 138, h: 72, bg: WHITE, texts: [left(177, 46, t('Подбор', 'Match'), 36, 400, INK)] },
      { x: 45, y: 548, w: 320, h: 62, bg: WHITE, texts: [left(53, 43, t('144 игрока', '144 players'), 36, 400, '#6B7280')] },

      ...tops.flatMap((_, i) => card(i)),
    ];
  },
};

module.exports = [venueBooking, gamesList, coachSchedule, playerStreak, playerStability, playerTraits, organizerStats, coachProfile, tournamentLive, courtCard, playerCard, bestMatch, community];
