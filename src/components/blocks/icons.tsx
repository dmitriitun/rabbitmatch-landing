import {
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  CreditCard,
  Globe,
  Handshake,
  Languages,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Percent,
  Repeat,
  Shield,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Content in `messages/*.json` names its icon as a string so copy can be
 * edited (and translated) without touching components. This map is the only
 * place that turns those names into components — an unknown name falls back
 * rather than crashing the page.
 */
const ICONS: Record<string, LucideIcon> = {
  badge: BadgeCheck,
  chart: BarChart3,
  bell: Bell,
  calendarCheck: CalendarCheck,
  calendar: CalendarDays,
  card: CreditCard,
  globe: Globe,
  handshake: Handshake,
  languages: Languages,
  grid: LayoutGrid,
  pin: MapPin,
  message: MessageSquare,
  percent: Percent,
  repeat: Repeat,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  timer: Timer,
  trophy: Trophy,
  users: Users,
  wallet: Wallet,
  zap: Zap,
};

export function BlockIcon({ name, size = 22 }: { name?: string; size?: number }) {
  const Icon = (name && ICONS[name]) || Sparkles;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}
