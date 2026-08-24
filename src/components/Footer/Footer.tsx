import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { EditableText } from '@/components/EditableText/EditableText';
import { FacebookIcon } from '@/components/icons/FacebookIcon';
import { InstagramIcon } from '@/components/icons/InstagramIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { Link } from '@/i18n/navigation';
import { legalSlugs, links } from '@/lib/site';
import styles from './Footer.module.css';

const AUDIENCES = [
  { id: 'players', href: '/players' },
  { id: 'organizers', href: '/organizers' },
  { id: 'coaches', href: '/coaches' },
  { id: 'venues', href: '/venues' },
] as const;

const RESOURCES = [
  { id: 'padel', href: '/padel' },
  { id: 'pricing', href: '/pricing' },
  { id: 'faq', href: '/faq' },
] as const;

/**
 * The footer is a server component — it renders the site's full internal link
 * graph, which is what lets crawlers reach every audience page from any page
 * on the site. None of it needs interactivity, so none of it ships JS.
 */
export async function Footer() {
  const tFooter = await getTranslations('footer');
  const tNav = await getTranslations('nav');

  const socials = [
    { key: 'instagram' as const, href: links.instagram, Icon: InstagramIcon },
    { key: 'tiktok' as const, href: links.tiktok, Icon: TikTokIcon },
    { key: 'facebook' as const, href: links.facebook, Icon: FacebookIcon },
    { key: 'telegram' as const, href: links.telegramChannel, Icon: TelegramIcon },
  ].filter((s) => Boolean(s.href));

  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brand} aria-label={tNav('logoAlt')}>
              <Image src="/images/logo.webp" alt="" width={36} height={36} className={styles.logo} />
              <span className={styles.brandText}>RabbitMatch</span>
            </Link>

            <EditableText tKey="footer.tagline" as="p" multiline className={styles.tagline} />

            {socials.length ? (
              <ul className={styles.socials} aria-label={tFooter('socialTitle')}>
                {socials.map(({ key, href, Icon }) => (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.social}
                      aria-label={tFooter(key)}
                    >
                      <Icon size={18} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <nav className={styles.linksCol} aria-labelledby="footer-audiences">
            <h3 id="footer-audiences" className={styles.colTitle}>
              {tFooter('audiencesTitle')}
            </h3>
            <ul className={styles.linkList}>
              {AUDIENCES.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className={styles.link}>
                    {tNav(link.id)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className={styles.linksCol} aria-labelledby="footer-resources">
            <h3 id="footer-resources" className={styles.colTitle}>
              {tFooter('resourcesTitle')}
            </h3>
            <ul className={styles.linkList}>
              {RESOURCES.map((link) => (
                <li key={link.id}>
                  <Link href={link.href} className={styles.link}>
                    {tNav(link.id)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/#contact" className={styles.link}>
                  {tFooter('contact')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.linksCol} aria-labelledby="footer-legal">
            <h3 id="footer-legal" className={styles.colTitle}>
              {tFooter('legalTitle')}
            </h3>
            <ul className={styles.linkList}>
              {legalSlugs.map((slug) => (
                <li key={slug}>
                  <Link href={`/legal/${slug}`} className={styles.link}>
                    {tFooter(slug)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>
            © {year} RabbitMatch. {tFooter('rights')}
          </p>
          {links.contactEmail ? (
            <a href={`mailto:${links.contactEmail}`} className={styles.contactLink}>
              {links.contactEmail}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
