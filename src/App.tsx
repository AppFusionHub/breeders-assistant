import { Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft } from 'lucide-react';
import Home from './pages/Home';
import Birds from './pages/Birds';
import BirdForm from './pages/BirdForm';
import BirdDetail from './pages/BirdDetail';
import Pairing from './pages/Pairing';
import Batches from './pages/Batches';
import BatchForm from './pages/BatchForm';
import BatchDetail from './pages/BatchDetail';
import Health, { HealthRecord } from './pages/Health';
import Guides, { GuideDetail } from './pages/Guides';
import Settings from './pages/Settings';
import Costs from './pages/Costs';
import TxForm from './pages/TxForm';
import Nicks from './pages/Nicks';
import ErrorBoundary from './ErrorBoundary';
import Reminders from './pages/Reminders';
import ReminderForm from './pages/ReminderForm';
import Programs, { ProgramDetail, ProgramEditor, RunDetail } from './pages/Programs';
import Feeding from './pages/Feeding';
import { FeedPlanDetail, FeedPlanEditor } from './pages/FeedPlans';
import { Breeding, Care, More } from './pages/Hubs';
import { useInAppNotifications } from './notify';
import { useTodayList } from './schedule';
import { TABS, isRoot, tabFor } from './nav';
import { useEffect } from 'react';
import { useLock, useProfile } from './profile';
import { FarmMark, LockScreen, Onboarding, Profile } from './pages/Account';
import type { FarmProfile } from './db';

function TopBar({ profile }: { profile: FarmProfile }) {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const today = useTodayList();
  const open = today?.filter((o) => !o.done).length ?? 0;
  const root = isRoot(pathname);
  const tab = tabFor(pathname);
  return (
    <header className="topbar">
      {root ? (
        <Link to="/profile" className="brand" aria-label={`${profile.farmName}, open farm profile`}><FarmMark profile={profile} /><span>{profile.farmName}</span></Link>
      ) : (
        <button className="back" onClick={() => (history.length > 1 ? nav(-1) : nav(tab.to))} aria-label="Back">
          <ChevronLeft size={22} strokeWidth={2.25} /><span>{tab.label}</span>
        </button>
      )}
      <Link to="/reminders" className="icon-btn" aria-label={open ? `Reminders, ${open} open today` : 'Reminders'}>
        <Bell size={22} />
        {open > 0 && <span className="dot-badge">{open > 9 ? '9+' : open}</span>}
      </Link>
    </header>
  );
}

export default function App() {
  const profile = useProfile();
  const { unlocked } = useLock();
  useEffect(() => { document.title = profile?.farmName || "Breeder's Assistant"; }, [profile?.farmName]);
  if (profile === undefined) return null; // loading
  if (!profile || !profile.setupDone) return <Onboarding />;
  if (profile.pinHash && !unlocked) return <LockScreen profile={profile} />;
  return <MainApp profile={profile} />;
}

function MainApp({ profile }: { profile: FarmProfile }) {
  const { pathname } = useLocation();
  useInAppNotifications();
  const active = tabFor(pathname);
  return (
    <div className="app">
      <TopBar profile={profile} />
      <main className="content" key={pathname}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/birds" element={<Birds />} />
            <Route path="/birds/new" element={<BirdForm />} />
            <Route path="/birds/:id" element={<BirdDetail />} />
            <Route path="/birds/:id/edit" element={<BirdForm />} />
            <Route path="/breeding" element={<Breeding />} />
            <Route path="/pair" element={<Pairing />} />
            <Route path="/nicks" element={<Nicks />} />
            <Route path="/hatch" element={<Batches />} />
            <Route path="/hatch/new" element={<BatchForm />} />
            <Route path="/hatch/:id" element={<BatchDetail />} />
            <Route path="/hatch/:id/edit" element={<BatchForm />} />
            <Route path="/care" element={<Care />} />
            <Route path="/health" element={<Health />} />
            <Route path="/health/record/:id" element={<HealthRecord />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/reminders/new" element={<ReminderForm />} />
            <Route path="/reminders/:id" element={<ReminderForm />} />
            <Route path="/programs" element={<Programs />} />
            <Route path="/programs/new" element={<ProgramEditor />} />
            <Route path="/programs/:key" element={<ProgramDetail />} />
            <Route path="/programs/:key/edit" element={<ProgramEditor />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route path="/feeding" element={<Feeding />} />
            <Route path="/feedplans/new" element={<FeedPlanEditor />} />
            <Route path="/feedplans/:id" element={<FeedPlanDetail />} />
            <Route path="/feedplans/:id/edit" element={<FeedPlanEditor />} />
            <Route path="/more" element={<More />} />
            <Route path="/costs" element={<Costs />} />
            <Route path="/costs/new" element={<TxForm />} />
            <Route path="/costs/:id" element={<TxForm />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/guides/:slug" element={<GuideDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<p className="muted">Page not found.</p>} />
          </Routes>
        </ErrorBoundary>
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = t === active;
          return (
            <Link key={t.to} to={t.to} className={on ? 'tab active' : 'tab'} aria-current={on ? 'page' : undefined}>
              <span className="tab-pill"><Icon size={22} strokeWidth={on ? 2.25 : 1.9} /></span>
              <span>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
