// surfaces/web/components/Layout.tsx
// App shell — sidebar + main content area + global nav progress indicator

import type { ReactNode } from 'react';
import { useNavigation, useNavigate } from 'react-router';
import { useAuth } from '../lib/auth';
import Sidebar from './Sidebar';

export default function Layout({ title, children }: { title: string; children: ReactNode }) {
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const isNavigating = navigation.state !== 'idle';

  return (
    <div className="app-shell">
      {/* Global navigation progress bar */}
      {isNavigating && (
        <div className="nav-progress-bar" />
      )}
      <Sidebar />
      <main className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="mobile-logo">CMF</div>
            <h1 className="page-title" style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>{title}</h1>
          </div>
          <div className="topbar-right">
            <div className="topbar-actions">
              {isNavigating && (
                <div className="topbar-loading-indicator">
                  <span className="loading-spinner-sm" />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>LOADING</span>
                </div>
              )}
            </div>
            <div className="mobile-actions">
              <button className="btn btn-ghost btn-sm btn-logout-mobile" onClick={() => {
                logout().then(() => {
                  navigate('/');
                });
              }}>
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          </div>
        </header>
        <div className={`content-container ${isNavigating ? 'content-loading' : ''}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
