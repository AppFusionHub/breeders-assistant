import { useLiveQuery } from 'dexie-react-hooks';
import {
  BookOpen, CalendarClock, ClipboardList, Egg, Network, Settings as SettingsIcon, Sparkles, Syringe, Wallet, Wheat,
} from 'lucide-react';
import { db } from '../db';
import { PageHeader, Tile } from '../components';
import { useProfile } from '../profile';
import { Store, Truck } from 'lucide-react';
import { useDueHealth } from '../hooks';
import { useTodayList } from '../schedule';
import { incubationDay } from '../lib/incubation';
import { today } from '../lib/dates';
import { peso, periodRange, summarize } from '../lib/money';

export function Breeding() {
  const open = useLiveQuery(() => db.batches.filter((b) => !b.closed).toArray(), []);
  const rated = useLiveQuery(() => db.birds.filter((b) => !!b.rating).count(), []);
  const t = today();
  return (
    <div className="stack">
      <PageHeader title="Breeding" subtitle="Plan matings, find nicks and track every hatch." />
      <div className="tiles">
        <Tile to="/pair" icon={Network} tone="red" title="Plan a mating" meta="Inbreeding check for any cock × hen" />
        <Tile to="/nicks" icon={Sparkles} tone="gold" title="Nick finder" meta={rated ? `${rated} rated birds` : 'Rate birds to find nicks'} />
        <Tile to="/hatch" icon={Egg} tone="green" title="Incubation" badge={open?.length || undefined}
          meta={open?.length ? open.map((b) => `${b.label.split(' · ')[0]}: day ${incubationDay(b.setDate, t)}`).slice(0, 2).join(' · ') : 'No eggs incubating'} />
      </div>
    </div>
  );
}

export function Care() {
  const due = useDueHealth(7);
  const todayList = useTodayList();
  const openTasks = todayList?.filter((o) => !o.done).length ?? 0;
  const plans = useLiveQuery(() => db.feedPlans.count(), []);
  return (
    <div className="stack">
      <PageHeader title="Care" subtitle="Health, daily tasks and feeding." />
      <div className="tiles">
        <Tile to="/reminders" icon={CalendarClock} tone="red" title="Reminders" badge={openTasks || undefined}
          meta={openTasks ? `${openTasks} task${openTasks > 1 ? 's' : ''} open today` : 'Nothing open today'} />
        <Tile to="/health" icon={Syringe} tone="blue" title="Health & vaccines" badge={due?.length || undefined}
          meta={due?.length ? `${due.length} due this week` : 'Schedule, log and treatments'} />
        <Tile to="/programs" icon={ClipboardList} tone="plum" title="Programs & routines" meta="Breeding-season programs, your own routines" />
        <Tile to="/feeding" icon={Wheat} tone="gold" title="Feeding" meta={plans ? `${plans} feeding plan${plans > 1 ? 's' : ''} · guide & calculator` : 'Guide by age, mix calculator, your plans'} />
      </div>
    </div>
  );
}

export function More() {
  const t = today();
  const [from, to] = periodRange({ kind: 'month', year: Number(t.slice(0, 4)), month: Number(t.slice(5, 7)) });
  const month = useLiveQuery(async () => summarize(await db.transactions.where('date').between(from, to, true, true).toArray()), [from, to]);
  const profile = useProfile();
  const sups = useLiveQuery(() => db.suppliers.count(), []);
  return (
    <div className="stack">
      <PageHeader title="More" />
      <div className="tiles">
        <Tile to="/profile" icon={Store} tone="red" title="Farm profile" meta={[profile?.farmName, profile?.pinHash ? 'PIN on' : 'PIN off'].filter(Boolean).join(' · ')} />
        <Tile to="/costs" icon={Wallet} tone="green" title="Costs & income" meta={`This month: ${peso(month?.expense ?? 0, true)} spent`} />
        <Tile to="/suppliers" icon={Truck} tone="gold" title="Suppliers" meta={sups ? `${sups} supplier${sups > 1 ? 's' : ''} · prices & contacts` : 'Where you buy feeds, vitamins, vaccines'} />
        <Tile to="/guides" icon={BookOpen} tone="blue" title="Guides" meta="Incubation, brooding, vaccines, breeding" />
        <Tile to="/settings" icon={SettingsIcon} tone="gray" title="Settings & backup" meta="Export or restore your data, notifications" />
      </div>
    </div>
  );
}
