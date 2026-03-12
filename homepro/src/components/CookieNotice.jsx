import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '../context/SettingsContext';

const STORAGE_KEY = 'hp_cookies_accepted';
const DEFAULT_MESSAGE = 'We use cookies to improve your experience, remember your preferences, and analyze site traffic. By continuing you agree to our use of cookies.';

export default function CookieNotice() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);

  const enabled = settings?.cookie_notice_enabled !== false && settings?.cookie_notice_enabled !== 'false' && settings?.cookie_notice_enabled !== '0';
  const message = (settings?.cookie_notice_message || '').trim() || DEFAULT_MESSAGE;

  useEffect(() => {
    if (!enabled) return;
    try {
      const accepted = localStorage.getItem(STORAGE_KEY);
      if (!accepted) setVisible(true);
    } catch (_) {
      setVisible(true);
    }
  }, [enabled]);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (_) {}
    setVisible(false);
  };

  if (!visible || !enabled) return null;

  return (
    <div
      role="banner"
      aria-label="Cookie notice"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: 'linear-gradient(180deg, rgba(17,24,39,0.98) 0%, #111827 100%)',
        color: '#e5e7eb',
        padding: '14px 20px 16px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.2)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, maxWidth: 560 }}>
        {message}{' '}
        <a href="#page/terms" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms</a>
        {' · '}
        <a href="#page/copyright" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Copyright</a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        style={{
          flexShrink: 0,
          padding: '8px 18px',
          fontSize: 13,
          fontWeight: 600,
          borderRadius: 'var(--border-radius)',
          border: 'none',
          background: 'var(--color-primary)',
          color: '#fff',
          cursor: 'pointer',
        }}
      >
        Accept
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'none',
          border: 'none',
          color: '#9ca3af',
          cursor: 'pointer',
          padding: 4,
        }}
      >
        <FontAwesomeIcon icon={faXmark} style={{ fontSize: 18 }} />
      </button>
    </div>
  );
}
