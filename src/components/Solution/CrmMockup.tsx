import { useTranslations } from 'next-intl';
import { BarChart3, Calendar, ClipboardList, Cog, LayoutDashboard, MapPin, Users, Wallet } from 'lucide-react';
import styles from './CrmMockup.module.css';

type NavEntry = { key: string; Icon: React.ComponentType<{ size?: number }> };

const NAV_ENTRIES: NavEntry[] = [
  { key: 'Bookings', Icon: LayoutDashboard },
  { key: 'Courts', Icon: MapPin },
  { key: 'Schedule', Icon: Calendar },
  { key: 'Finance', Icon: Wallet },
  { key: 'Clients', Icon: Users },
  { key: 'Analytics', Icon: BarChart3 },
  { key: 'Settings', Icon: Cog },
];

type ScheduleBlock = {
  type: 'busy' | 'free';
  span: number;
  player?: string;
  amount?: string;
};

type Court = {
  name: string;
  tag: string;
  blocks: ScheduleBlock[];
};

const COURTS: Court[] = [
  {
    name: 'Court 1',
    tag: 'INDOOR PRO',
    blocks: [
      { type: 'busy', span: 2, player: 'M. Agan', amount: '20 000 AMD' },
      { type: 'free', span: 2 },
      { type: 'busy', span: 4, player: 'M. Sarkisian', amount: '10 000 AMD' },
      { type: 'busy', span: 4, player: 'H. Arakelyan', amount: '20 000 AMD' },
    ],
  },
  {
    name: 'Court 2',
    tag: 'MAIN CENTER',
    blocks: [
      { type: 'free', span: 2 },
      { type: 'busy', span: 4, player: 'A. Movsesian', amount: '30 000 AMD' },
      { type: 'free', span: 2 },
      { type: 'busy', span: 4, player: 'L. Melikyan', amount: '30 000 AMD' },
    ],
  },
  {
    name: 'Court 3',
    tag: 'TRAINING POD',
    blocks: [
      { type: 'free', span: 2 },
      { type: 'busy', span: 4, player: 'D. Vardanyan', amount: '50 000 AMD' },
      { type: 'busy', span: 4, player: 'R. Karapetyan', amount: '30 000 AMD' },
      { type: 'busy', span: 2, player: 'E. Petrosyan', amount: '10 000 AMD' },
    ],
  },
];

type RecentBooking = {
  initials: string;
  name: string;
  court: string;
  time: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled';
};

const RECENT: RecentBooking[] = [
  { initials: 'DV', name: 'David Vardanyan', court: 'Court 3', time: 'Oct 24, 10:00–14:00', amount: '50 000 AMD', status: 'confirmed' },
  { initials: 'SS', name: 'Sarah Simanyan', court: 'Court 1', time: 'Oct 24, 13:30–16:30', amount: '30 000 AMD', status: 'pending' },
  { initials: 'MS', name: 'Marie Sarkisian', court: 'Court 1', time: 'Oct 24, 12:00–13:00', amount: '10 000 AMD', status: 'cancelled' },
];

export function CrmMockup({ ariaLabel }: { ariaLabel: string }) {
  const t = useTranslations('solution.crm');

  return (
    <div className={styles.frame} role="img" aria-label={ariaLabel}>
      <div className={styles.glowA} aria-hidden="true" />
      <div className={styles.glowB} aria-hidden="true" />

      <div className={styles.window}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.brandName}>{t('title')}</span>
            <span className={styles.brandSub}>{t('subtitle')}</span>
          </div>
          <nav className={styles.nav} aria-hidden="true">
            {NAV_ENTRIES.map(({ key, Icon }, idx) => (
              <span key={key} className={`${styles.navItem} ${idx === 0 ? styles.navActive : ''}`}>
                <Icon size={14} />
                <span>{key}</span>
              </span>
            ))}
          </nav>
        </aside>

        <div className={styles.main}>
          <div className={styles.topbar}>
            <div className={styles.search}>
              <span className={styles.searchDot} />
              <span className={styles.searchText}>{t('search')}</span>
            </div>
            <button type="button" className={styles.newBooking} tabIndex={-1}>
              {t('newBooking')}
            </button>
          </div>

          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('kpiRevenue')}</div>
              <div className={styles.kpiValue}>AMD 270,000</div>
              <div className={styles.kpiTrendUp}>↑ 32.5%</div>
              <div className={styles.kpiBars} aria-hidden="true">
                <span style={{ height: '40%' }} />
                <span style={{ height: '55%' }} />
                <span style={{ height: '70%' }} />
                <span style={{ height: '90%' }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('kpiBookings')}</div>
              <div className={styles.kpiValue}>11</div>
              <div className={styles.kpiTrendUp}>↑ 28.2%</div>
              <div className={`${styles.kpiBars} ${styles.kpiBarsPurple}`} aria-hidden="true">
                <span style={{ height: '30%' }} />
                <span style={{ height: '50%' }} />
                <span style={{ height: '65%' }} />
                <span style={{ height: '85%' }} />
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('kpiOccupancy')}</div>
              <div className={styles.kpiValue}>82%</div>
              <div className={styles.kpiBarWrap} aria-hidden="true">
                <span className={styles.kpiBarFill} style={{ width: '82%' }} />
              </div>
              <div className={styles.kpiTrendWarn}>+21% vs yest.</div>
            </div>
          </div>

          <section className={styles.schedule}>
            <header className={styles.scheduleHead}>
              <div>
                <h4 className={styles.scheduleTitle}>{t('scheduleTitle')}</h4>
                <p className={styles.scheduleSub}>{t('scheduleSubtitle')}</p>
              </div>
              <div className={styles.scheduleTabs} aria-hidden="true">
                <span className={styles.tabActive}>{t('today')}</span>
                <span className={styles.tab}>{t('weekly')}</span>
              </div>
            </header>

            <div className={styles.timeRow} aria-hidden="true">
              <span />
              {['08', '10', '12', '14', '16', '18', '20'].map((h) => (
                <span key={h} className={styles.timeLabel}>{h}:00</span>
              ))}
            </div>

            <ul className={styles.courts}>
              {COURTS.map((court) => (
                <li key={court.name} className={styles.courtRow}>
                  <div className={styles.courtMeta}>
                    <div className={styles.courtName}>{court.name}</div>
                    <div className={styles.courtTag}>{court.tag}</div>
                  </div>
                  <div className={styles.track} aria-hidden="true">
                    {court.blocks.map((block, i) => (
                      <div
                        key={i}
                        className={`${styles.block} ${block.type === 'busy' ? styles.blockBusy : styles.blockFree}`}
                        style={{ flexGrow: block.span }}
                      >
                        {block.type === 'busy' && block.player ? (
                          <>
                            <span className={styles.blockPlayer}>{block.player}</span>
                            <span className={styles.blockAmount}>{block.amount}</span>
                          </>
                        ) : (
                          <span className={styles.blockFreeLabel}>Available</span>
                        )}
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.recent} aria-hidden="true">
            <h4 className={styles.recentTitle}>Recent Bookings</h4>
            <ul>
              {RECENT.map((row) => (
                <li key={row.name} className={styles.recentRow}>
                  <span className={styles.avatar}>{row.initials}</span>
                  <span className={styles.recentName}>{row.name}</span>
                  <span className={styles.recentCourt}>{row.court}</span>
                  <span className={styles.recentTime}>{row.time}</span>
                  <span className={styles.recentAmount}>{row.amount}</span>
                  <span className={`${styles.status} ${styles[`status_${row.status}`]}`}>
                    <ClipboardList size={10} />
                    {row.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
