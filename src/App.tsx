import { useEffect, type ReactNode } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DialogProvider } from './components/Dialog';
import { BottomNav } from './components/Layout';
import { StoreProvider, useStore } from './data/store';
import AddClub from './pages/AddClub';
import ActiveSession from './pages/ActiveSession';
import Bag from './pages/Bag';
import ClubEdit from './pages/ClubEdit';
import History from './pages/History';
import Home from './pages/Home';
import Login, { SetNewPassword } from './pages/Login';
import NewSession from './pages/NewSession';
import SessionReport from './pages/SessionReport';
import Settings from './pages/Settings';
import Stats from './pages/Stats';

// HashRouter so the app works on any static host without rewrite rules.
export default function App() {
  return (
    <StoreProvider>
      <DialogProvider>
        <AuthGate>
          <HashRouter>
            <Shell />
          </HashRouter>
        </AuthGate>
      </DialogProvider>
    </StoreProvider>
  );
}

/** With Supabase configured, require sign-in; otherwise the app runs local-only. */
function AuthGate({ children }: { children: ReactNode }) {
  const { sync } = useStore();
  if (!sync.enabled) return <>{children}</>;
  if (!sync.authReady) return <div className="splash muted">Loading…</div>;
  if (sync.recovering) return <SetNewPassword onDone={sync.finishRecovery} />;
  if (!sync.user) return <Login />;
  return <>{children}</>;
}

function Shell() {
  const { pathname } = useLocation();
  const inSession = pathname === '/session';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={`app${inSession ? ' app-session' : ''}${pathname === '/stats' ? ' app-wide' : ''}`}>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/session/new" element={<NewSession />} />
          <Route path="/session" element={<ActiveSession />} />
          <Route path="/sessions/:id" element={<SessionReport />} />
          <Route path="/history" element={<History />} />
          <Route path="/bag" element={<Bag />} />
          <Route path="/bag/add" element={<AddClub />} />
          <Route path="/bag/:id" element={<ClubEdit />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      {!inSession && <BottomNav />}
    </div>
  );
}
