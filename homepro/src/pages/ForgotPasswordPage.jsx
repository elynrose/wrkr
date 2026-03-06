import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faSpinner, faArrowRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { requestPasswordReset } from '../services/api';

export default function ForgotPasswordPage({ onNavigate }) {
  const { darkMode } = useTheme();
  const { siteName } = useSettings();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const bg = darkMode ? '#0a0f1a' : '#f0f4f8';
  const cardBg = darkMode ? '#111827' : '#ffffff';
  const border = darkMode ? '#1f2937' : '#e2e8f0';
  const textPrimary = darkMode ? '#f1f5f9' : '#1e293b';
  const textSecondary = darkMode ? '#94a3b8' : '#64748b';
  const inputBg = darkMode ? '#1e293b' : '#f8fafc';
  const inputBorder = darkMode ? '#334155' : '#e2e8f0';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email?.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

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
          <p style={{ color: textSecondary, fontSize: 14, marginTop: 8 }}>
            {sent ? 'Check your email' : 'Reset your password'}
          </p>
        </div>

        <div style={{
          background: cardBg, borderRadius: 'var(--border-radius)',
          border: `1px solid ${border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '32px 28px',
        }}>
          {sent ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 48, color: '#22c55e', marginBottom: 16 }} />
                <p style={{ color: textPrimary, fontSize: 15, lineHeight: 1.6 }}>
                  If an account exists with that email, you'll receive a password reset link shortly.
                </p>
              </div>
              <button onClick={() => onNavigate('login')} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: 'pointer',
              }}>Back to Sign In</button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: textPrimary, marginBottom: 6 }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: 6, opacity: 0.5, fontSize: 12 }} />
                  Email Address
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email"
                  style={{
                    width: '100%', padding: '10px 14px', fontSize: 14, border: `1px solid ${inputBorder}`,
                    borderRadius: 'var(--border-radius)', background: inputBg, color: textPrimary,
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
              {error && (
                <div style={{
                  background: darkMode ? '#7f1d1d33' : '#fef2f2', color: '#ef4444',
                  padding: '10px 14px', borderRadius: 'var(--border-radius)', fontSize: 13,
                  marginBottom: 16, border: '1px solid #fecaca',
                }}>{error}</div>
              )}
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '12px 0', fontSize: 15, fontWeight: 700,
                background: 'var(--color-primary)', color: '#fff', border: 'none',
                borderRadius: 'var(--border-radius)', cursor: loading ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Sending...</> : <>Send Reset Link <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: 13 }} /></>}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: textSecondary }}>
          <button onClick={() => onNavigate('login')} style={{
            background: 'none', border: 'none', color: textSecondary,
            cursor: 'pointer', textDecoration: 'underline',
          }}>← Back to Sign In</button>
        </p>
      </div>
    </div>
  );
}
