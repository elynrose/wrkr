import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { verifyEmail } from '../services/api';

export default function VerifyEmailPage({ token, onNavigate }) {
  const { darkMode } = useTheme();
  const { siteName } = useSettings();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  const bg = darkMode ? '#0a0f1a' : '#f0f4f8';
  const cardBg = darkMode ? '#111827' : '#ffffff';
  const border = darkMode ? '#1f2937' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link');
      return;
    }
    verifyEmail(token)
      .then(() => { setStatus('success'); setMessage('Email verified successfully.'); })
      .catch((err) => { setStatus('error'); setMessage(err.message || 'Invalid or expired link.'); });
  }, [token]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: bg, padding: '24px 16px', fontFamily: 'var(--font-family)',
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button onClick={() => onNavigate('home')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 'var(--border-radius)', margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'var(--color-primary)', color: '#fff',
              fontWeight: 800, fontSize: 22, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>{(siteName || 'H')[0]}</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: textPrimary }}>{siteName || 'HomePro'}</span>
          </button>
        </div>

        <div style={{
          background: cardBg, borderRadius: 'var(--border-radius)',
          border: `1px solid ${border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '32px 28px', textAlign: 'center',
        }}>
          {status === 'loading' && (
            <>
              <FontAwesomeIcon icon={faSpinner} spin style={{ fontSize: 40, color: 'var(--color-primary)', marginBottom: 16 }} />
              <p style={{ color: textPrimary, fontSize: 15 }}>Verifying your email...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <FontAwesomeIcon icon={faCheck} style={{ fontSize: 48, color: '#22c55e', marginBottom: 16 }} />
              <p style={{ color: textPrimary, fontSize: 15, marginBottom: 24 }}>{message}</p>
              <button onClick={() => onNavigate('login')} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: 'pointer',
              }}>Sign In</button>
            </>
          )}
          {status === 'error' && (
            <>
              <FontAwesomeIcon icon={faExclamationTriangle} style={{ fontSize: 48, color: '#f59e0b', marginBottom: 16 }} />
              <p style={{ color: textPrimary, fontSize: 15, marginBottom: 24 }}>{message}</p>
              <button onClick={() => onNavigate('login')} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: 'pointer',
              }}>Back to Sign In</button>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSecondary }}>
          <button onClick={() => onNavigate('home')} style={{
            background: 'none', border: 'none', color: textSecondary,
            cursor: 'pointer', textDecoration: 'underline',
          }}>← Back to {siteName}</button>
        </p>
      </div>
    </div>
  );
}
