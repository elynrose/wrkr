import { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faXmark, faHome, faShieldHalved, faChartLine,
  faRightFromBracket, faUser, faChevronDown, faGear,
  faRightToBracket, faUserPlus, faBriefcase,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Header({ onConsumerSignup, onProSignup, onShowView, currentView }) {
  const { darkMode } = useTheme();
  const { user, logout } = useAuth();
  const { siteName } = useSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isStaff = user && (user.role === 'pro' || user.role === 'admin' || user.role === 'superadmin');
  const navLinks = isStaff
    ? [
        { key: 'home', label: 'Home', icon: faHome },
        ...(user.role === 'pro' ? [{ key: 'pro-dashboard', label: 'Pro Dashboard', icon: faChartLine }] : []),
        ...(user.role === 'admin' || user.role === 'superadmin' ? [{ key: 'admin', label: 'Admin', icon: faGear }] : []),
      ]
    : [
        { key: 'home',          label: 'Find a Pro',    icon: faHome },
        { key: 'how',           label: 'How It Works',  icon: faShieldHalved },
        { key: 'for-pros',      label: 'For Pros',      icon: faBriefcase },
      ];

  const initials = user
    ? ((user.firstName || '')[0] || '') + ((user.lastName || '')[0] || '') || user.email?.[0]?.toUpperCase()
    : '';

  const roleColors = { admin: '#ef4444', superadmin: '#7c3aed', pro: 'var(--color-primary)', consumer: '#22c55e' };

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: darkMode ? '#111827' : '#ffffff',
      borderBottom: darkMode ? '1px solid #1f2937' : '1px solid #e5e7eb',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div className="max-w-5xl lg:max-w-7xl mx-auto px-4 sm:px-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>

          {/* Logo */}
          <button onClick={() => onShowView('home')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--border-radius)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontWeight: 800, fontSize: 18, boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}>{(siteName || 'H')[0]}</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: darkMode ? '#f3f4f6' : '#1f2937' }}>
              {siteName === 'HomePro' ? <>Home<span style={{ color: 'var(--color-primary)' }}>Pro</span></> : siteName}
            </span>
          </button>

          {/* Desktop Nav — hidden on mobile/tablet; hamburger used below lg (1024px) */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="hidden lg:flex">
            {navLinks.map(l => (
              <button key={l.key} onClick={() => onShowView(l.key)} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500,
                background: 'none', border: 'none', cursor: 'pointer',
                color: currentView === l.key ? 'var(--color-primary)' : (darkMode ? '#9ca3af' : '#6b7280'),
              }}>
                <FontAwesomeIcon icon={l.icon} style={{ width: 12 }} />
                {l.label}
              </button>
            ))}
          </nav>

          {/* Desktop Right — hidden on mobile/tablet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hidden lg:flex">
            {user ? (
              /* Logged-in dropdown */
              <div ref={dropRef} style={{ position: 'relative' }}>
                <button onClick={() => setDropOpen(!dropOpen)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
                  borderRadius: 'var(--border-radius)', cursor: 'pointer',
                  border: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                  background: darkMode ? '#1f2937' : '#f9fafb', color: darkMode ? '#f3f4f6' : '#374151',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#fff',
                    fontWeight: 700, fontSize: 12, flexShrink: 0,
                    background: roleColors[user.role] || 'var(--color-primary)',
                  }}>{initials}</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>
                      {user.firstName || user.email?.split('@')[0]}
                    </div>
                    <div style={{ fontSize: 10, color: darkMode ? '#9ca3af' : '#9ca3af', textTransform: 'capitalize' }}>
                      {user.role}
                    </div>
                  </div>
                  <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: 10, opacity: 0.5 }} />
                </button>

                {dropOpen && (
                  <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 200,
                    background: darkMode ? '#1f2937' : '#fff',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: 'var(--border-radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    overflow: 'hidden', zIndex: 60,
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${darkMode ? '#374151' : '#f3f4f6'}` }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? '#f3f4f6' : '#1f2937' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{user.email}</div>
                    </div>

                    {(user.role === 'admin' || user.role === 'superadmin') && (
                      <DropItem icon={faGear} label="Admin Dashboard"
                        onClick={() => { onShowView('admin'); setDropOpen(false); }}
                        darkMode={darkMode} />
                    )}
                    {user.role === 'pro' && (
                      <DropItem icon={faChartLine} label="Pro Dashboard"
                        onClick={() => { onShowView('pro-dashboard'); setDropOpen(false); }}
                        darkMode={darkMode} />
                    )}
                    <DropItem icon={faUser} label="My Profile"
                      onClick={() => { onShowView('profile'); setDropOpen(false); }}
                      darkMode={darkMode} />

                    <div style={{ borderTop: `1px solid ${darkMode ? '#374151' : '#f3f4f6'}` }}>
                      <DropItem icon={faRightFromBracket} label="Sign Out"
                        onClick={() => { logout(); onShowView('home'); setDropOpen(false); }}
                        darkMode={darkMode} danger />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Not logged in */
              <>
                <button onClick={() => onShowView('login')} style={{
                  fontSize: 14, fontWeight: 600, padding: '8px 16px',
                  borderRadius: 'var(--border-radius)', cursor: 'pointer',
                  border: darkMode ? '1px solid #4b5563' : '1px solid #d1d5db',
                  backgroundColor: 'transparent', color: darkMode ? '#e5e7eb' : '#374151',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <FontAwesomeIcon icon={faRightToBracket} style={{ fontSize: 13 }} />
                  Sign In
                </button>
                <button onClick={onProSignup} style={{
                  fontSize: 14, fontWeight: 600, padding: '8px 16px',
                  borderRadius: 'var(--border-radius)', cursor: 'pointer',
                  border: 'none', color: '#fff', backgroundColor: 'var(--color-primary)',
                  boxShadow: '0 2px 8px rgba(26,111,219,0.25)',
                }}>Join as a Pro</button>
              </>
            )}
          </div>

          {/* Mobile/tablet hamburger — shown below lg (1024px) */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: 8, background: 'none', border: 'none', cursor: 'pointer', color: darkMode ? '#f3f4f6' : '#1f2937' }}
            className="lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} style={{ width: 20, height: 20 }} />
          </button>
        </div>
      </div>

      {/* Mobile/tablet menu — shown when hamburger open, below lg */}
      {menuOpen && (
        <div style={{ padding: 16, borderTop: darkMode ? '1px solid #1f2937' : '1px solid #f3f4f6', backgroundColor: darkMode ? '#111827' : '#fff' }} className="lg:hidden">
          {navLinks.map(l => (
            <button key={l.key} onClick={() => { onShowView(l.key); setMenuOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500,
                padding: '8px 0', width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', color: darkMode ? '#f3f4f6' : '#1f2937',
              }}>
              <FontAwesomeIcon icon={l.icon} style={{ width: 14 }} />
              {l.label}
            </button>
          ))}
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`, marginTop: 8 }}>
            {user ? (
              <>
                <button onClick={() => { onShowView('profile'); setMenuOpen(false); }}
                  style={{
                    flex: 1, fontSize: 14, fontWeight: 600, padding: '8px 0',
                    borderRadius: 'var(--border-radius)', cursor: 'pointer',
                    border: '1px solid #d1d5db', backgroundColor: 'transparent',
                    color: darkMode ? '#e5e7eb' : '#374151',
                  }}>My Profile</button>
                <button onClick={() => { logout(); onShowView('home'); setMenuOpen(false); }}
                  style={{
                    flex: 1, fontSize: 14, fontWeight: 600, padding: '8px 0',
                    borderRadius: 'var(--border-radius)', cursor: 'pointer',
                    border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444',
                  }}>Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => { onShowView('login'); setMenuOpen(false); }}
                  style={{
                    flex: 1, fontSize: 14, fontWeight: 600, padding: '8px 0',
                    borderRadius: 'var(--border-radius)', cursor: 'pointer',
                    border: '1px solid #d1d5db', backgroundColor: 'transparent',
                    color: darkMode ? '#e5e7eb' : '#374151',
                  }}>Sign In</button>
                <button onClick={() => { onProSignup(); setMenuOpen(false); }}
                  style={{
                    flex: 1, fontSize: 14, fontWeight: 600, padding: '8px 0',
                    borderRadius: 'var(--border-radius)', cursor: 'pointer',
                    border: 'none', color: '#fff', backgroundColor: 'var(--color-primary)',
                  }}>Join as Pro</button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function DropItem({ icon, label, onClick, darkMode, danger }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
      color: danger ? '#ef4444' : (darkMode ? '#e5e7eb' : '#374151'), textAlign: 'left',
      transition: 'background 0.1s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#374151' : '#f9fafb'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <FontAwesomeIcon icon={icon} style={{ width: 14, opacity: 0.7 }} />
      {label}
    </button>
  );
}
