import { Bird, HeartPulse, House, LayoutGrid, Network, type LucideIcon } from 'lucide-react';

export interface Tab { to: string; label: string; icon: LucideIcon; match: RegExp }

export const TABS: Tab[] = [
  { to: '/', label: 'Home', icon: House, match: /^\/$/ },
  { to: '/birds', label: 'Flock', icon: Bird, match: /^\/birds/ },
  { to: '/breeding', label: 'Breeding', icon: Network, match: /^\/(breeding|pair|nicks|hatch)/ },
  { to: '/care', label: 'Care', icon: HeartPulse, match: /^\/(care|health|reminders|programs|runs|feeding|feedplans)/ },
  { to: '/more', label: 'More', icon: LayoutGrid, match: /^\/(more|costs|guides|settings)/ },
];

export const tabFor = (path: string) => TABS.find((t) => t.match.test(path)) ?? TABS[0];
export const isRoot = (path: string) => TABS.some((t) => t.to === path);
