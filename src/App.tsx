import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Birds from './pages/Birds';
import BirdForm from './pages/BirdForm';
import BirdDetail from './pages/BirdDetail';
import Pairing from './pages/Pairing';
import Batches from './pages/Batches';
import BatchForm from './pages/BatchForm';
import BatchDetail from './pages/BatchDetail';
import Health from './pages/Health';
import Guides, { GuideDetail } from './pages/Guides';
import Settings from './pages/Settings';
import Costs from './pages/Costs';
import TxForm from './pages/TxForm';
import Nicks from './pages/Nicks';
import ErrorBoundary from './ErrorBoundary';

const NAV = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/birds', label: 'Birds', icon: '🐓' },
  { to: '/hatch', label: 'Hatch', icon: '🥚' },
  { to: '/health', label: 'Health', icon: '✚' },
  { to: '/costs', label: 'Costs', icon: '₱' },
];

export default function App() {
  const { pathname } = useLocation();
  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">Breeder's Assistant</Link>
        <div className="top-actions">
          <Link to="/guides" className="icon-btn" aria-label="Guides">📖</Link>
          <Link to="/settings" className="icon-btn" aria-label="Settings">⚙</Link>
        </div>
      </header>
      <main className="content" key={pathname}>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/birds" element={<Birds />} />
          <Route path="/birds/new" element={<BirdForm />} />
          <Route path="/birds/:id" element={<BirdDetail />} />
          <Route path="/birds/:id/edit" element={<BirdForm />} />
          <Route path="/pair" element={<Pairing />} />
          <Route path="/hatch" element={<Batches />} />
          <Route path="/hatch/new" element={<BatchForm />} />
          <Route path="/hatch/:id" element={<BatchDetail />} />
          <Route path="/hatch/:id/edit" element={<BatchForm />} />
          <Route path="/health" element={<Health />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/:slug" element={<GuideDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/costs" element={<Costs />} />
          <Route path="/costs/new" element={<TxForm />} />
          <Route path="/costs/:id" element={<TxForm />} />
          <Route path="/nicks" element={<Nicks />} />
          <Route path="*" element={<p className="muted">Page not found.</p>} />
        </Routes>
        </ErrorBoundary>
      </main>
      <nav className="tabbar">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'tab active' : 'tab')}>
            <span className="tab-icon" aria-hidden>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
