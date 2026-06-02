// surfaces/web/components/Sidebar.tsx
// Navigation sidebar — with health indicator

import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigation } from 'react-router';
import { useAuth } from '../lib/auth';
import type { AuthHealthOutput } from '$contract';
import { healthCheckApi } from '../lib/web_api_barrel';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/inbox', label: 'Inbox', icon: 'inbox' },
  { path: '/settings', label: 'Settings', icon: 'settings' },
];

const ADMIN_NAV_ITEMS = [
  { path: '/users', label: 'Users', icon: 'people' },
];

export default function Sidebar() {
  const { logout, email, role, isOwner } = useAuth();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const isAdmin = role === 'admin' || isOwner;
  const navigation = useNavigation();
  const isPageLoading = navigation.state !== 'idle';

  useEffect(() => {
    const abort = new AbortController();
    healthCheckApi({ signal: abort.signal })
      .then((r: AuthHealthOutput) => {
        setHealthy(r.status === 'healthy');
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setHealthy(false);
        }
      });
    return () => abort.abort();
  }, []);

  return (
    <aside className="app-sidebar glass">
      <Link to="/dashboard" className="logo" style={{ textDecoration: 'none' }}>
        Cloud<span>Mail</span>Flare
      </Link>

      <nav className="sidebar-nav" style={isPageLoading ? { pointerEvents: 'none', opacity: 0.8 } : {}}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-wrapper">
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
        {isAdmin && ADMIN_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <div className="nav-icon-wrapper">
              <span className="material-symbols-outlined">{item.icon}</span>
            </div>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-profile-card">
          <div className="profile-info">
            <div className="user-avatar-sm">
              {email?.full?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="user-details">
              <span className="user-email">{email?.full}</span>
              {healthy !== null && (
                <div className="health-status">
                  <span className={`health-dot ${healthy ? 'healthy' : 'unhealthy'}`} />
                  <span className="health-text">{healthy ? 'System Secure' : 'Offline'}</span>
                </div>
              )}
            </div>
          </div>
          
          <button className="btn btn-ghost btn-full btn-sm btn-logout glass-border-top" style={{ borderRadius: 0, marginTop: 'var(--space-2)' }} onClick={logout}>
            <span className="material-symbols-outlined">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
