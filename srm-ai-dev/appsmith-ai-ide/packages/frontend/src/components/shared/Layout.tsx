import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { StatusBar } from './StatusBar';

interface LayoutProps {
  children: React.ReactNode;
}

interface NavEntry {
  icon: string;
  tip: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavEntry[] = [
  { icon: '\u{1F4CB}', tip: 'Page \u7B7E\u51FA', path: '/pages' },
  { icon: '\u2328', tip: 'IDE \u5DE5\u4F5C\u533A', path: '/ide' },
  { icon: '\u{1F4E6}', tip: '\u4F9D\u8D56\u5E93\u7BA1\u7406', path: '/deps', adminOnly: true },
  { icon: '\u26A1', tip: 'Skill \u7BA1\u7406', path: '/skills', adminOnly: true },
];

const ADMIN_EXTRA: NavEntry[] = [
  { icon: '\u2699\uFE0F', tip: '\u7CFB\u7EDF\u914D\u7F6E', path: '/system-config', adminOnly: true },
  { icon: '\u{1F433}', tip: '\u5BB9\u5668\u8FD0\u7EF4', path: '/container-ops', adminOnly: true },
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo, activeCheckout, logout } = useAuthStore();
  const isAdmin = userInfo?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNav = (entry: NavEntry) => {
    if (entry.path === '/ide') {
      if (activeCheckout) {
        navigate(`/ide/${activeCheckout.pageId}`);
      } else {
        navigate('/pages');
      }
    } else {
      navigate(entry.path);
    }
  };

  const isActive = (entry: NavEntry): boolean => {
    if (entry.path === '/ide') {
      return location.pathname.startsWith('/ide/');
    }
    return location.pathname === entry.path;
  };

  const allItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_EXTRA] : NAV_ITEMS.filter((n) => !n.adminOnly);

  const initials = (userInfo?.displayName ?? userInfo?.username ?? '??')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* ═══ LEFT NAV ═══ */}
      <div className="left-nav">
        <div className="nav-logo">{'\u2B21'}</div>

        {allItems.map((entry, i) => (
          <React.Fragment key={entry.path}>
            {/* Insert divider between core nav and admin-only items */}
            {i === NAV_ITEMS.filter((n) => !n.adminOnly || isAdmin).length && (
              <div className="nav-divider" />
            )}
            <div
              className={`nav-item${isActive(entry) ? ' on' : ''}`}
              onClick={() => handleNav(entry)}
              title={!entry.path ? entry.tip : undefined}
            >
              {entry.icon}
              <div className="nav-tip">{entry.tip}</div>
            </div>
          </React.Fragment>
        ))}

        <div className="nav-bottom">
          <div className="nav-ava" onClick={handleLogout}>
            {initials}
            <div className="nav-tip">
              {userInfo?.displayName ?? userInfo?.username ?? ''} &middot; Logout
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══ */}
      <div className="main-area">
        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <StatusBar />
      </div>
    </>
  );
};
