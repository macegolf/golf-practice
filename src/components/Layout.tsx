import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="page-header">
      {back && (
        <button className="icon-btn" onClick={() => navigate(back)} aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <h1>{title}</h1>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}

const icons: Record<string, ReactNode> = {
  practice: <circle cx="12" cy="13" r="6" />,
  bag: <path d="M8 3v5M12 3v5M16 3v5M6 8h12l-1 13H7z" />,
  history: <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v3.5h3.5M12 8v4l3 2" />,
  stats: <path d="M5 20V11M12 20V5M19 20v-7" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
};

const tabs = [
  { to: '/', label: 'Practice', icon: 'practice' },
  { to: '/bag', label: 'My Bag', icon: 'bag' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/stats', label: 'Stats', icon: 'stats' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {icons[t.icon]}
          </svg>
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
